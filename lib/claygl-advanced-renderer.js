(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('claygl')) :
	typeof define === 'function' && define.amd ? define(['claygl'], factory) :
	(global.ClayAdvancedRenderer = factory(global.clay));
}(this, (function (claygl) { 'use strict';

// Generate halton sequence
// https://en.wikipedia.org/wiki/Halton_sequence
function halton(index, base) {

    var result = 0;
    var f = 1 / base;
    var i = index;
    while (i > 0) {
        result = result + f * (i % base);
        i = Math.floor(i / base);
        f = f / base;
    }
    return result;
}

var SSAOGLSLCode = "@export car.ssao.estimate\n#define SHADER_NAME SSAO\nuniform sampler2D depthTex;\nuniform sampler2D normalTex;\nuniform sampler2D noiseTex;\nuniform vec2 depthTexSize;\nuniform vec2 noiseTexSize;\nuniform mat4 projection;\nuniform mat4 projectionInv;\nuniform mat4 viewInverseTranspose;\nuniform vec3 kernel[KERNEL_SIZE];\nuniform float radius : 1;\nuniform float power : 1;\nuniform float bias: 0.01;\nuniform float intensity: 1.0;\nvarying vec2 v_Texcoord;\nfloat ssaoEstimator(in vec3 originPos, in vec3 N, in mat3 kernelBasis) {\n float occlusion = 0.0;\n for (int i = 0; i < KERNEL_SIZE; i++) {\n vec3 samplePos = kernel[i];\n#ifdef NORMALTEX_ENABLED\n samplePos = kernelBasis * samplePos;\n#endif\n samplePos = samplePos * radius + originPos;\n vec4 texCoord = projection * vec4(samplePos, 1.0);\n texCoord.xy /= texCoord.w;\n texCoord.xy = texCoord.xy * 0.5 + 0.5;\n vec4 depthTexel = texture2D(depthTex, texCoord.xy);\n float z = depthTexel.r * 2.0 - 1.0;\n#ifdef ALCHEMY\n vec4 projectedPos = vec4(texCoord.xy * 2.0 - 1.0, z, 1.0);\n vec4 p4 = projectionInv * projectedPos;\n p4.xyz /= p4.w;\n vec3 cDir = p4.xyz - originPos;\n float vv = dot(cDir, cDir);\n float vn = dot(cDir, N);\n float radius2 = radius * radius;\n vn = max(vn + p4.z * bias, 0.0);\n float f = max(radius2 - vv, 0.0) / radius2;\n occlusion += f * f * f * max(vn / (0.01 + vv), 0.0);\n#else\n if (projection[3][3] == 0.0) {\n z = projection[3][2] / (z * projection[2][3] - projection[2][2]);\n }\n else {\n z = (z - projection[3][2]) / projection[2][2];\n }\n float factor = step(samplePos.z, z - bias);\n float rangeCheck = smoothstep(0.0, 1.0, radius / abs(originPos.z - z));\n occlusion += rangeCheck * factor;\n#endif\n }\n#ifdef NORMALTEX_ENABLED\n occlusion = 1.0 - occlusion / float(KERNEL_SIZE);\n#else\n occlusion = 1.0 - clamp((occlusion / float(KERNEL_SIZE) - 0.6) * 2.5, 0.0, 1.0);\n#endif\n return pow(occlusion, power);\n}\nvoid main()\n{\n vec2 uv = v_Texcoord;\n vec4 depthTexel = texture2D(depthTex, uv);\n#ifdef NORMALTEX_ENABLED\n vec2 texelSize = 1.0 / depthTexSize;\n vec4 tex = texture2D(normalTex, uv);\n vec3 r = texture2D(normalTex, uv + vec2(texelSize.x, 0.0)).rgb;\n vec3 l = texture2D(normalTex, uv + vec2(-texelSize.x, 0.0)).rgb;\n vec3 t = texture2D(normalTex, uv + vec2(0.0, -texelSize.y)).rgb;\n vec3 b = texture2D(normalTex, uv + vec2(0.0, texelSize.y)).rgb;\n if (dot(tex.rgb, tex.rgb) == 0.0\n || dot(r, r) == 0.0 || dot(l, l) == 0.0\n || dot(t, t) == 0.0 || dot(b, b) == 0.0\n ) {\n gl_FragColor = vec4(1.0);\n return;\n }\n vec3 N = tex.rgb * 2.0 - 1.0;\n N = (viewInverseTranspose * vec4(N, 0.0)).xyz;\n vec2 noiseTexCoord = depthTexSize / vec2(noiseTexSize) * uv;\n vec3 rvec = texture2D(noiseTex, noiseTexCoord).rgb * 2.0 - 1.0;\n vec3 T = normalize(rvec - N * dot(rvec, N));\n vec3 BT = normalize(cross(N, T));\n mat3 kernelBasis = mat3(T, BT, N);\n#else\n if (depthTexel.r > 0.99999) {\n gl_FragColor = vec4(1.0);\n return;\n }\n mat3 kernelBasis;\n#endif\n float z = depthTexel.r * 2.0 - 1.0;\n vec4 projectedPos = vec4(uv * 2.0 - 1.0, z, 1.0);\n vec4 p4 = projectionInv * projectedPos;\n vec3 position = p4.xyz / p4.w;\n float ao = ssaoEstimator(position, N, kernelBasis);\n ao = clamp(1.0 - (1.0 - ao) * intensity, 0.0, 1.0);\n gl_FragColor = vec4(vec3(ao), 1.0);\n}\n@end\n@export car.ssao.blur\n#define SHADER_NAME SSAO_BLUR\nuniform sampler2D ssaoTexture;\n#ifdef NORMALTEX_ENABLED\nuniform sampler2D normalTex;\n#endif\nvarying vec2 v_Texcoord;\nuniform vec2 textureSize;\nuniform float blurSize : 1.0;\nuniform int direction: 0.0;\n#ifdef DEPTHTEX_ENABLED\nuniform sampler2D depthTex;\nuniform mat4 projection;\nuniform float depthRange : 0.05;\nfloat getLinearDepth(vec2 coord)\n{\n float depth = texture2D(depthTex, coord).r * 2.0 - 1.0;\n return projection[3][2] / (depth * projection[2][3] - projection[2][2]);\n}\n#endif\nvoid main()\n{\n float kernel[5];\n kernel[0] = 0.122581;\n kernel[1] = 0.233062;\n kernel[2] = 0.288713;\n kernel[3] = 0.233062;\n kernel[4] = 0.122581;\n vec2 off = vec2(0.0);\n if (direction == 0) {\n off[0] = blurSize / textureSize.x;\n }\n else {\n off[1] = blurSize / textureSize.y;\n }\n vec2 coord = v_Texcoord;\n float sum = 0.0;\n float weightAll = 0.0;\n#ifdef NORMALTEX_ENABLED\n vec3 centerNormal = texture2D(normalTex, v_Texcoord).rgb * 2.0 - 1.0;\n#endif\n#if defined(DEPTHTEX_ENABLED)\n float centerDepth = getLinearDepth(v_Texcoord);\n#endif\n for (int i = 0; i < 5; i++) {\n vec2 coord = clamp(v_Texcoord + vec2(float(i) - 2.0) * off, vec2(0.0), vec2(1.0));\n float w = kernel[i];\n#ifdef NORMALTEX_ENABLED\n vec3 normal = texture2D(normalTex, coord).rgb * 2.0 - 1.0;\n w *= clamp(dot(normal, centerNormal), 0.0, 1.0);\n#endif\n#ifdef DEPTHTEX_ENABLED\n float d = getLinearDepth(coord);\n w *= (1.0 - smoothstep(abs(centerDepth - d) / depthRange, 0.0, 1.0));\n#endif\n weightAll += w;\n sum += texture2D(ssaoTexture, coord).r * w;\n }\n gl_FragColor = vec4(vec3(sum / weightAll), 1.0);\n}\n@end\n";

var Pass = claygl.compositor.Pass;
claygl.Shader.import(SSAOGLSLCode);

function generateNoiseData(size) {
    var data = new Uint8Array(size * size * 4);
    var n = 0;
    var v3 = new claygl.Vector3();

    for (var i = 0; i < size; i++) {
        for (var j = 0; j < size; j++) {
            v3.set(Math.random() * 2 - 1, Math.random() * 2 - 1, 0).normalize();
            data[n++] = (v3.x * 0.5 + 0.5) * 255;
            data[n++] = (v3.y * 0.5 + 0.5) * 255;
            data[n++] = 0;
            data[n++] = 255;
        }
    }
    return data;
}

function generateNoiseTexture(size) {
    return new claygl.Texture2D({
        pixels: generateNoiseData(size),
        wrapS: claygl.Texture.REPEAT,
        wrapT: claygl.Texture.REPEAT,
        width: size,
        height: size
    });
}

function generateKernel(size, offset, hemisphere) {
    var kernel = new Float32Array(size * 3);
    offset = offset || 0;
    for (var i = 0; i < size; i++) {
        var phi = halton(i + offset, 2) * (hemisphere ? 1 : 2) * Math.PI;
        var theta = halton(i + offset, 3) * Math.PI;
        var r = Math.random();
        var x = Math.cos(phi) * Math.sin(theta) * r;
        var y = Math.cos(theta) * r;
        var z = Math.sin(phi) * Math.sin(theta) * r;

        kernel[i * 3] = x;
        kernel[i * 3 + 1] = y;
        kernel[i * 3 + 2] = z;
    }
    return kernel;
}

function SSAOPass(opt) {
    opt = opt || {};

    this._ssaoPass = new Pass({
        fragment: claygl.Shader.source('car.ssao.estimate')
    });
    this._blendPass = new Pass({
        fragment: claygl.Shader.source('car.temporalBlend')
    });
    this._blurPass = new Pass({
        fragment: claygl.Shader.source('car.ssao.blur')
    });
    this._framebuffer = new claygl.FrameBuffer();

    this._ssaoTexture = new claygl.Texture2D();

    this._prevTexture = new claygl.Texture2D();
    this._currTexture = new claygl.Texture2D();

    this._blurTexture = new claygl.Texture2D();

    this._depthTex = opt.depthTexture;
    this._normalTex = opt.normalTexture;
    this._velocityTex = opt.velocityTexture;

    this.setNoiseSize(4);
    this.setKernelSize(opt.kernelSize || 12);
    if (opt.radius != null) {
        this.setParameter('radius', opt.radius);
    }
    if (opt.power != null) {
        this.setParameter('power', opt.power);
    }

    if (!this._normalTex) {
        this._ssaoPass.material.disableTexture('normalTex');
        this._blurPass.material.disableTexture('normalTex');
    }
    if (!this._depthTex) {
        this._blurPass.material.disableTexture('depthTex');
    }

    this._blurPass.material.setUniform('normalTex', this._normalTex);
    this._blurPass.material.setUniform('depthTex', this._depthTex);


    this._temporalFilter = true;

    this._frame = 0;
}

SSAOPass.prototype.setDepthTexture = function (depthTex) {
    this._depthTex = depthTex;
};

SSAOPass.prototype.setNormalTexture = function (normalTex) {
    this._normalTex = normalTex;
    this._ssaoPass.material[normalTex ? 'enableTexture' : 'disableTexture']('normalTex');
    // Switch between hemisphere and shere kernel.
    this.setKernelSize(this._kernelSize);
};

SSAOPass.prototype.update = function (renderer, camera, frame) {

    var width = renderer.getWidth();
    var height = renderer.getHeight();

    var ssaoPass = this._ssaoPass;
    var blurPass = this._blurPass;
    var blendPass = this._blendPass;

    this._frame++;

    ssaoPass.setUniform('kernel', this._kernels[
        this._temporalFilter ? (this._frame % this._kernels.length) : 0
    ]);
    ssaoPass.setUniform('depthTex', this._depthTex);
    if (this._normalTex != null) {
        ssaoPass.setUniform('normalTex', this._normalTex);
    }
    ssaoPass.setUniform('depthTexSize', [this._depthTex.width, this._depthTex.height]);

    var viewInverseTranspose = new claygl.Matrix4();
    claygl.Matrix4.transpose(viewInverseTranspose, camera.worldTransform);

    ssaoPass.setUniform('projection', camera.projectionMatrix.array);
    ssaoPass.setUniform('projectionInv', camera.invProjectionMatrix.array);
    ssaoPass.setUniform('viewInverseTranspose', viewInverseTranspose.array);

    var ssaoTexture = this._ssaoTexture;
    var blurTexture = this._blurTexture;

    var prevTexture = this._prevTexture;
    var currTexture = this._currTexture;

    ssaoTexture.width = width;
    ssaoTexture.height = height;
    blurTexture.width = width;
    blurTexture.height = height;
    prevTexture.width = width;
    prevTexture.height = height;
    currTexture.width = width;
    currTexture.height = height;

    this._framebuffer.attach(ssaoTexture);
    this._framebuffer.bind(renderer);
    renderer.gl.clearColor(1, 1, 1, 1);
    renderer.gl.clear(renderer.gl.COLOR_BUFFER_BIT);
    ssaoPass.render(renderer);

    if (this._temporalFilter) {
        this._framebuffer.attach(currTexture);
        blendPass.setUniform('prevTex', prevTexture);
        blendPass.setUniform('currTex', ssaoTexture);
        blendPass.setUniform('velocityTex', this._velocityTex);
        blendPass.render(renderer);
    }

    blurPass.setUniform('textureSize', [width, height]);
    blurPass.setUniform('projection', camera.projectionMatrix.array);
    this._framebuffer.attach(blurTexture);
    blurPass.setUniform('direction', 0);
    blurPass.setUniform('ssaoTexture', this._temporalFilter ? currTexture : ssaoTexture);
    blurPass.render(renderer);

    this._framebuffer.attach(ssaoTexture);
    blurPass.setUniform('direction', 1);
    blurPass.setUniform('ssaoTexture', blurTexture);
    blurPass.render(renderer);

    this._framebuffer.unbind(renderer);

    // Restore clear
    var clearColor = renderer.clearColor;
    renderer.gl.clearColor(clearColor[0], clearColor[1], clearColor[2], clearColor[3]);

    // Swap texture
    var tmp = this._prevTexture;
    this._prevTexture = this._currTexture;
    this._currTexture = tmp;
};

SSAOPass.prototype.getTargetTexture = function () {
    return this._ssaoTexture;
};

SSAOPass.prototype.setParameter = function (name, val) {
    if (name === 'noiseTexSize') {
        this.setNoiseSize(val);
    }
    else if (name === 'kernelSize') {
        this.setKernelSize(val);
    }
    else if (name === 'intensity') {
        this._ssaoPass.material.set('intensity', val);
    }
    else if (name === 'temporalFilter') {
        this._temporalFilter = val;
    }
    else {
        this._ssaoPass.setUniform(name, val);
    }
};

SSAOPass.prototype.setKernelSize = function (size) {
    this._kernelSize = size;
    this._ssaoPass.material.define('fragment', 'KERNEL_SIZE', size);
    this._kernels = this._kernels || [];
    for (var i = 0; i < 30; i++) {
        this._kernels[i] = generateKernel(size, i * size, !!this._normalTex);
    }
};

SSAOPass.prototype.setNoiseSize = function (size) {
    var texture = this._ssaoPass.getUniform('noiseTex');
    if (!texture) {
        texture = generateNoiseTexture(size);
        this._ssaoPass.setUniform('noiseTex', generateNoiseTexture(size));
    }
    else {
        texture.data = generateNoiseData(size);
        texture.width = texture.height = size;
        texture.dirty();
    }

    this._ssaoPass.setUniform('noiseTexSize', [size, size]);
};

SSAOPass.prototype.dispose = function (renderer) {
    this._blurTexture.dispose(renderer);
    this._ssaoTexture.dispose(renderer);
    this._prevTexture.dispose(renderer);
    this._currTexture.dispose(renderer);
};

SSAOPass.prototype.isFinished = function (frame) {
    return frame > 30;
};

var SSRGLSLCode = "@export car.ssr.main\n#define SHADER_NAME SSR\n#define MAX_ITERATION 20;\n#define SAMPLE_PER_FRAME 5;\n#define TOTAL_SAMPLES 128;\nuniform sampler2D sourceTexture;\nuniform sampler2D gBufferTexture1;\nuniform sampler2D gBufferTexture2;\nuniform sampler2D gBufferTexture3;\nuniform samplerCube specularCubemap;\nuniform sampler2D brdfLookup;\nuniform float specularIntensity: 1;\nuniform mat4 projection;\nuniform mat4 projectionInv;\nuniform mat4 toViewSpace;\nuniform mat4 toWorldSpace;\nuniform float maxRayDistance: 200;\nuniform float pixelStride: 16;\nuniform float pixelStrideZCutoff: 50;\nuniform float screenEdgeFadeStart: 0.9;\nuniform float eyeFadeStart : 0.2;uniform float eyeFadeEnd: 0.8;\nuniform float minGlossiness: 0.2;uniform float zThicknessThreshold: 1;\nuniform float nearZ;\nuniform vec2 viewportSize : VIEWPORT_SIZE;\nuniform float jitterOffset: 0;\nvarying vec2 v_Texcoord;\n#ifdef DEPTH_DECODE\n@import clay.util.decode_float\n#endif\n#ifdef PHYSICALLY_CORRECT\nuniform sampler2D normalDistribution;\nuniform float sampleOffset: 0;\nuniform vec2 normalDistributionSize;\nvec3 transformNormal(vec3 H, vec3 N) {\n vec3 upVector = N.y > 0.999 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);\n vec3 tangentX = normalize(cross(N, upVector));\n vec3 tangentZ = cross(N, tangentX);\n return normalize(tangentX * H.x + N * H.y + tangentZ * H.z);\n}\nvec3 importanceSampleNormalGGX(float i, float roughness, vec3 N) {\n float p = fract((i + sampleOffset) / float(TOTAL_SAMPLES));\n vec3 H = texture2D(normalDistribution,vec2(roughness, p)).rgb;\n return transformNormal(H, N);\n}\nfloat G_Smith(float g, float ndv, float ndl) {\n float roughness = 1.0 - g;\n float k = roughness * roughness / 2.0;\n float G1V = ndv / (ndv * (1.0 - k) + k);\n float G1L = ndl / (ndl * (1.0 - k) + k);\n return G1L * G1V;\n}\nvec3 F_Schlick(float ndv, vec3 spec) {\n return spec + (1.0 - spec) * pow(1.0 - ndv, 5.0);\n}\n#endif\nfloat fetchDepth(sampler2D depthTexture, vec2 uv)\n{\n vec4 depthTexel = texture2D(depthTexture, uv);\n return depthTexel.r * 2.0 - 1.0;\n}\nfloat linearDepth(float depth)\n{\n if (projection[3][3] == 0.0) {\n return projection[3][2] / (depth * projection[2][3] - projection[2][2]);\n }\n else {\n return (depth - projection[3][2]) / projection[2][2];\n }\n}\nbool rayIntersectDepth(float rayZNear, float rayZFar, vec2 hitPixel)\n{\n if (rayZFar > rayZNear)\n {\n float t = rayZFar; rayZFar = rayZNear; rayZNear = t;\n }\n float cameraZ = linearDepth(fetchDepth(gBufferTexture2, hitPixel));\n return rayZFar <= cameraZ && rayZNear >= cameraZ - zThicknessThreshold;\n}\nbool traceScreenSpaceRay(\n vec3 rayOrigin, vec3 rayDir, float jitter,\n out vec2 hitPixel, out vec3 hitPoint, out float iterationCount\n)\n{\n float rayLength = ((rayOrigin.z + rayDir.z * maxRayDistance) > -nearZ)\n ? (-nearZ - rayOrigin.z) / rayDir.z : maxRayDistance;\n vec3 rayEnd = rayOrigin + rayDir * rayLength;\n vec4 H0 = projection * vec4(rayOrigin, 1.0);\n vec4 H1 = projection * vec4(rayEnd, 1.0);\n float k0 = 1.0 / H0.w, k1 = 1.0 / H1.w;\n vec3 Q0 = rayOrigin * k0, Q1 = rayEnd * k1;\n vec2 P0 = (H0.xy * k0 * 0.5 + 0.5) * viewportSize;\n vec2 P1 = (H1.xy * k1 * 0.5 + 0.5) * viewportSize;\n P1 += dot(P1 - P0, P1 - P0) < 0.0001 ? 0.01 : 0.0;\n vec2 delta = P1 - P0;\n bool permute = false;\n if (abs(delta.x) < abs(delta.y)) {\n permute = true;\n delta = delta.yx;\n P0 = P0.yx;\n P1 = P1.yx;\n }\n float stepDir = sign(delta.x);\n float invdx = stepDir / delta.x;\n vec3 dQ = (Q1 - Q0) * invdx;\n float dk = (k1 - k0) * invdx;\n vec2 dP = vec2(stepDir, delta.y * invdx);\n float strideScaler = 1.0 - min(1.0, -rayOrigin.z / pixelStrideZCutoff);\n float pixStride = 1.0 + strideScaler * pixelStride;\n dP *= pixStride; dQ *= pixStride; dk *= pixStride;\n vec4 pqk = vec4(P0, Q0.z, k0);\n vec4 dPQK = vec4(dP, dQ.z, dk);\n pqk += dPQK * jitter;\n float rayZFar = (dPQK.z * 0.5 + pqk.z) / (dPQK.w * 0.5 + pqk.w);\n float rayZNear;\n bool intersect = false;\n vec2 texelSize = 1.0 / viewportSize;\n iterationCount = 0.0;\n for (int i = 0; i < MAX_ITERATION; i++)\n {\n pqk += dPQK;\n rayZNear = rayZFar;\n rayZFar = (dPQK.z * 0.5 + pqk.z) / (dPQK.w * 0.5 + pqk.w);\n hitPixel = permute ? pqk.yx : pqk.xy;\n hitPixel *= texelSize;\n intersect = rayIntersectDepth(rayZNear, rayZFar, hitPixel);\n iterationCount += 1.0;\n dPQK *= 1.2;\n if (intersect) {\n break;\n }\n }\n Q0.xy += dQ.xy * iterationCount;\n Q0.z = pqk.z;\n hitPoint = Q0 / pqk.w;\n return intersect;\n}\nfloat calculateAlpha(\n float iterationCount, float reflectivity,\n vec2 hitPixel, vec3 hitPoint, float dist, vec3 rayDir\n)\n{\n float alpha = clamp(reflectivity, 0.0, 1.0);\n alpha *= 1.0 - (iterationCount / float(MAX_ITERATION));\n vec2 hitPixelNDC = hitPixel * 2.0 - 1.0;\n float maxDimension = min(1.0, max(abs(hitPixelNDC.x), abs(hitPixelNDC.y)));\n alpha *= 1.0 - max(0.0, maxDimension - screenEdgeFadeStart) / (1.0 - screenEdgeFadeStart);\n float _eyeFadeStart = eyeFadeStart;\n float _eyeFadeEnd = eyeFadeEnd;\n if (_eyeFadeStart > _eyeFadeEnd) {\n float tmp = _eyeFadeEnd;\n _eyeFadeEnd = _eyeFadeStart;\n _eyeFadeStart = tmp;\n }\n float eyeDir = clamp(rayDir.z, _eyeFadeStart, _eyeFadeEnd);\n alpha *= 1.0 - (eyeDir - _eyeFadeStart) / (_eyeFadeEnd - _eyeFadeStart);\n alpha *= 1.0 - clamp(dist / maxRayDistance, 0.0, 1.0);\n return alpha;\n}\n@import clay.util.rand\n@import clay.util.rgbm\nvoid main()\n{\n vec4 normalAndGloss = texture2D(gBufferTexture1, v_Texcoord);\n if (dot(normalAndGloss.rgb, vec3(1.0)) == 0.0) {\n discard;\n }\n float g = normalAndGloss.a;\n#if !defined(PHYSICALLY_CORRECT)\n if (g <= minGlossiness) {\n discard;\n }\n#endif\n float reflectivity = (g - minGlossiness) / (1.0 - minGlossiness);\n vec3 N = normalize(normalAndGloss.rgb * 2.0 - 1.0);\n N = normalize((toViewSpace * vec4(N, 0.0)).xyz);\n vec4 projectedPos = vec4(v_Texcoord * 2.0 - 1.0, fetchDepth(gBufferTexture2, v_Texcoord), 1.0);\n vec4 pos = projectionInv * projectedPos;\n vec3 rayOrigin = pos.xyz / pos.w;\n vec3 V = -normalize(rayOrigin);\n float ndv = clamp(dot(N, V), 0.0, 1.0);\n float iterationCount;\n float jitter = rand(fract(v_Texcoord + jitterOffset));\n vec4 albedoMetalness = texture2D(gBufferTexture3, v_Texcoord);\n vec3 albedo = albedoMetalness.rgb;\n float m = albedoMetalness.a;\n vec3 diffuseColor = albedo * (1.0 - m);\n vec3 spec = mix(vec3(0.04), albedo, m);\n#ifdef PHYSICALLY_CORRECT\n vec4 color = vec4(vec3(0.0), 1.0);\n float jitter2 = rand(fract(v_Texcoord)) * float(TOTAL_SAMPLES);\n for (int i = 0; i < SAMPLE_PER_FRAME; i++) {\n vec3 H = importanceSampleNormalGGX(float(i) + jitter2, 1.0 - g, N);\n vec3 rayDir = normalize(reflect(-V, H));\n#else\n vec3 rayDir = normalize(reflect(-V, N));\n#endif\n vec2 hitPixel;\n vec3 hitPoint;\n bool intersect = traceScreenSpaceRay(rayOrigin, rayDir, jitter, hitPixel, hitPoint, iterationCount);\n float dist = distance(rayOrigin, hitPoint);\n vec3 hitNormal = texture2D(gBufferTexture1, hitPixel).rgb * 2.0 - 1.0;\n hitNormal = normalize((toViewSpace * vec4(hitNormal, 0.0)).xyz);\n#ifdef PHYSICALLY_CORRECT\n float ndl = clamp(dot(N, rayDir), 0.0, 1.0);\n float vdh = clamp(dot(V, H), 0.0, 1.0);\n float ndh = clamp(dot(N, H), 0.0, 1.0);\n vec3 litTexel = vec3(0.0);\n if (dot(hitNormal, rayDir) < 0.0 && intersect) {\n litTexel = texture2D(sourceTexture, hitPixel).rgb;\n litTexel *= pow(clamp(1.0 - dist / 200.0, 0.0, 1.0), 3.0);\n }\n else {\n#ifdef SPECULARCUBEMAP_ENABLED\n vec3 rayDirW = normalize(toWorldSpace * vec4(rayDir, 0.0)).rgb;\n litTexel = RGBMDecode(textureCubeLodEXT(specularCubemap, rayDirW, 0.0), 8.12).rgb * specularIntensity;\n#endif\n }\n color.rgb += ndl * litTexel * (\n F_Schlick(ndl, spec) * G_Smith(g, ndv, ndl) * vdh / (ndh * ndv + 0.001)\n );\n }\n color.rgb /= float(SAMPLE_PER_FRAME);\n#else\n#if !defined(SPECULARCUBEMAP_ENABLED)\n if (dot(hitNormal, rayDir) >= 0.0) {\n discard;\n }\n if (!intersect) {\n discard;\n }\n#endif\n float alpha = clamp(calculateAlpha(iterationCount, reflectivity, hitPixel, hitPoint, dist, rayDir), 0.0, 1.0);\n vec4 color = texture2D(sourceTexture, hitPixel);\n color.rgb *= alpha;\n#ifdef SPECULARCUBEMAP_ENABLED\n vec3 rayDirW = normalize(toWorldSpace * vec4(rayDir, 0.0)).rgb;\n alpha = alpha * (intersect ? 1.0 : 0.0);\n float bias = (1.0 - g) * 5.0;\n vec2 brdfParam2 = texture2D(brdfLookup, vec2(1.0 - g, ndv)).xy;\n color.rgb += (1.0 - alpha)\n * RGBMDecode(textureCubeLodEXT(specularCubemap, rayDirW, bias), 8.12).rgb\n * (spec * brdfParam2.x + brdfParam2.y)\n * specularIntensity;\n#endif\n#endif\n gl_FragColor = encodeHDR(color);\n}\n@end\n@export car.ssr.blur\nuniform sampler2D texture;\nuniform sampler2D gBufferTexture1;\nuniform sampler2D gBufferTexture2;\nuniform mat4 projection;\nuniform float depthRange : 0.05;\nvarying vec2 v_Texcoord;\nuniform vec2 textureSize;\nuniform float blurSize : 1.0;\n#ifdef BLEND\n #ifdef SSAOTEX_ENABLED\nuniform sampler2D ssaoTex;\n #endif\nuniform sampler2D sourceTexture;\n#endif\nfloat getLinearDepth(vec2 coord)\n{\n float depth = texture2D(gBufferTexture2, coord).r * 2.0 - 1.0;\n return projection[3][2] / (depth * projection[2][3] - projection[2][2]);\n}\n@import clay.util.rgbm\nvoid main()\n{\n @import clay.compositor.kernel.gaussian_9\n vec4 centerNTexel = texture2D(gBufferTexture1, v_Texcoord);\n float g = centerNTexel.a;\n float maxBlurSize = clamp(1.0 - g, 0.0, 1.0) * blurSize;\n#ifdef VERTICAL\n vec2 off = vec2(0.0, maxBlurSize / textureSize.y);\n#else\n vec2 off = vec2(maxBlurSize / textureSize.x, 0.0);\n#endif\n vec2 coord = v_Texcoord;\n vec4 sum = vec4(0.0);\n float weightAll = 0.0;\n vec3 cN = centerNTexel.rgb * 2.0 - 1.0;\n float cD = getLinearDepth(v_Texcoord);\n for (int i = 0; i < 9; i++) {\n vec2 coord = clamp((float(i) - 4.0) * off + v_Texcoord, vec2(0.0), vec2(1.0));\n float w = gaussianKernel[i]\n * clamp(dot(cN, texture2D(gBufferTexture1, coord).rgb * 2.0 - 1.0), 0.0, 1.0);\n float d = getLinearDepth(coord);\n w *= (1.0 - smoothstep(abs(cD - d) / depthRange, 0.0, 1.0));\n weightAll += w;\n sum += decodeHDR(texture2D(texture, coord)) * w;\n }\n#ifdef BLEND\n float aoFactor = 1.0;\n #ifdef SSAOTEX_ENABLED\n aoFactor = texture2D(ssaoTex, v_Texcoord).r;\n #endif\n gl_FragColor = encodeHDR(\n sum / weightAll * aoFactor + decodeHDR(texture2D(sourceTexture, v_Texcoord))\n );\n#else\n gl_FragColor = encodeHDR(sum / weightAll);\n#endif\n}\n@end";

var Pass$1 = claygl.compositor.Pass;
var cubemapUtil = claygl.util.cubemap;

// import halton from './halton';

claygl.Shader.import(SSRGLSLCode);

// function generateNormals(size, offset, hemisphere) {
//     var kernel = new Float32Array(size * 3);
//     offset = offset || 0;
//     for (var i = 0; i < size; i++) {
//         var phi = halton(i + offset, 2) * (hemisphere ? 1 : 2) * Math.PI / 2;
//         var theta = halton(i + offset, 3) * 2 * Math.PI;
//         var x = Math.cos(theta) * Math.sin(phi);
//         var y = Math.sin(theta) * Math.sin(phi);
//         var z = Math.cos(phi);
//         kernel[i * 3] = x;
//         kernel[i * 3 + 1] = y;
//         kernel[i * 3 + 2] = z;
//     }
//     return kernel;
// }

function SSRPass(opt) {
    opt = opt || {};

    this._ssrPass = new Pass$1({
        fragment: claygl.Shader.source('car.ssr.main'),
        clearColor: [0, 0, 0, 0]
    });
    this._blurPass1 = new Pass$1({
        fragment: claygl.Shader.source('car.ssr.blur'),
        clearColor: [0, 0, 0, 0]
    });
    this._blurPass2 = new Pass$1({
        fragment: claygl.Shader.source('car.ssr.blur'),
        clearColor: [0, 0, 0, 0]
    });
    this._blendPass = new Pass$1({
        fragment: claygl.Shader.source('clay.compositor.blend')
    });
    this._blendPass.material.disableTexturesAll();
    this._blendPass.material.enableTexture(['texture1', 'texture2']);

    this._ssrPass.setUniform('gBufferTexture1', opt.normalTexture);
    this._ssrPass.setUniform('gBufferTexture2', opt.depthTexture);
    this._ssrPass.setUniform('gBufferTexture3', opt.albedoTexture);

    this._blurPass1.setUniform('gBufferTexture1', opt.normalTexture);
    this._blurPass1.setUniform('gBufferTexture2', opt.depthTexture);

    this._blurPass2.setUniform('gBufferTexture1', opt.normalTexture);
    this._blurPass2.setUniform('gBufferTexture2', opt.depthTexture);

    this._blurPass2.material.define('fragment', 'VERTICAL');
    this._blurPass2.material.define('fragment', 'BLEND');

    this._ssrTexture = new claygl.Texture2D({
        type: claygl.Texture.HALF_FLOAT
    });
    this._texture2 = new claygl.Texture2D({
        type: claygl.Texture.HALF_FLOAT
    });
    this._texture3 = new claygl.Texture2D({
        type: claygl.Texture.HALF_FLOAT
    });
    this._prevTexture = new claygl.Texture2D({
        type: claygl.Texture.HALF_FLOAT
    });
    this._currentTexture = new claygl.Texture2D({
        type: claygl.Texture.HALF_FLOAT
    });

    this._frameBuffer = new claygl.FrameBuffer({
        depthBuffer: false
    });

    this._normalDistribution = null;

    this._totalSamples = 256;
    this._samplePerFrame = 4;

    this._ssrPass.material.define('fragment', 'SAMPLE_PER_FRAME', this._samplePerFrame);
    this._ssrPass.material.define('fragment', 'TOTAL_SAMPLES', this._totalSamples);

    this._downScale = 1;
}

SSRPass.prototype.setAmbientCubemap = function (specularCubemap, brdfLookup, specularIntensity) {
    this._ssrPass.material.set('specularCubemap', specularCubemap);
    this._ssrPass.material.set('brdfLookup', brdfLookup);
    this._ssrPass.material.set('specularIntensity', specularIntensity);

    var enableSpecularMap = specularCubemap && specularIntensity;
    this._ssrPass.material[enableSpecularMap ? 'enableTexture' : 'disableTexture']('specularCubemap');
};

SSRPass.prototype.update = function (renderer, camera, sourceTexture, frame) {
    var width = renderer.getWidth();
    var height = renderer.getHeight();
    var ssrTexture = this._ssrTexture;
    var texture2 = this._texture2;
    var texture3 = this._texture3;
    ssrTexture.width = this._prevTexture.width = this._currentTexture.width = width / this._downScale;
    ssrTexture.height = this._prevTexture.height = this._currentTexture.height = height / this._downScale;

    texture2.width = texture3.width = width;
    texture2.height = texture3.height = height;

    var frameBuffer = this._frameBuffer;

    var ssrPass = this._ssrPass;
    var blurPass1 = this._blurPass1;
    var blurPass2 = this._blurPass2;
    var blendPass = this._blendPass;

    var toViewSpace = new claygl.Matrix4();
    var toWorldSpace = new claygl.Matrix4();
    claygl.Matrix4.transpose(toViewSpace, camera.worldTransform);
    claygl.Matrix4.transpose(toWorldSpace, camera.viewMatrix);

    ssrPass.setUniform('sourceTexture', sourceTexture);
    ssrPass.setUniform('projection', camera.projectionMatrix.array);
    ssrPass.setUniform('projectionInv', camera.invProjectionMatrix.array);
    ssrPass.setUniform('toViewSpace', toViewSpace.array);
    ssrPass.setUniform('toWorldSpace', toWorldSpace.array);
    ssrPass.setUniform('nearZ', camera.near);

    var percent = frame / this._totalSamples * this._samplePerFrame;
    ssrPass.setUniform('jitterOffset', percent);
    ssrPass.setUniform('sampleOffset', frame * this._samplePerFrame);
    // ssrPass.setUniform('lambertNormals', this._diffuseSampleNormals[frame % this._totalSamples]);

    blurPass1.setUniform('textureSize', [ssrTexture.width, ssrTexture.height]);
    blurPass2.setUniform('textureSize', [width, height]);
    blurPass2.setUniform('sourceTexture', sourceTexture);

    blurPass1.setUniform('projection', camera.projectionMatrix.array);
    blurPass2.setUniform('projection', camera.projectionMatrix.array);

    frameBuffer.attach(ssrTexture);
    frameBuffer.bind(renderer);
    ssrPass.render(renderer);

    if (this._physicallyCorrect) {
        frameBuffer.attach(this._currentTexture);
        blendPass.setUniform('texture1', this._prevTexture);
        blendPass.setUniform('texture2', ssrTexture);
        blendPass.material.set({
            'weight1': frame >= 1 ? 0.95 : 0,
            'weight2': frame >= 1 ? 0.05 : 1
            // weight1: frame >= 1 ? 1 : 0,
            // weight2: 1
        });
        blendPass.render(renderer);
    }

    frameBuffer.attach(texture2);
    blurPass1.setUniform('texture', this._physicallyCorrect ? this._currentTexture : ssrTexture);
    blurPass1.render(renderer);

    frameBuffer.attach(texture3);
    blurPass2.setUniform('texture', texture2);
    blurPass2.render(renderer);
    frameBuffer.unbind(renderer);

    if (this._physicallyCorrect) {
        var tmp = this._prevTexture;
        this._prevTexture = this._currentTexture;
        this._currentTexture = tmp;
    }
};

SSRPass.prototype.getTargetTexture = function () {
    return this._texture3;
};

SSRPass.prototype.setParameter = function (name, val) {
    if (name === 'maxIteration') {
        this._ssrPass.material.define('fragment', 'MAX_ITERATION', val);
    }
    else {
        this._ssrPass.setUniform(name, val);
    }
};

SSRPass.prototype.setPhysicallyCorrect = function (isPhysicallyCorrect) {
    if (isPhysicallyCorrect) {
        if (!this._normalDistribution) {
            this._normalDistribution = cubemapUtil.generateNormalDistribution(64, this._totalSamples);
        }
        this._ssrPass.material.define('fragment', 'PHYSICALLY_CORRECT');
        this._ssrPass.material.set('normalDistribution', this._normalDistribution);
        this._ssrPass.material.set('normalDistributionSize', [64, this._totalSamples]);
    }
    else {
        this._ssrPass.material.undefine('fragment', 'PHYSICALLY_CORRECT');
    }

    this._physicallyCorrect = isPhysicallyCorrect;
};

SSRPass.prototype.setSSAOTexture = function (texture) {
    var blendPass = this._blurPass2;
    if (texture) {
        blendPass.material.enableTexture('ssaoTex');
        blendPass.material.set('ssaoTex', texture);
    }
    else {
        blendPass.material.disableTexture('ssaoTex');
    }
};

SSRPass.prototype.isFinished = function (frame) {
    if (this._physicallyCorrect) {
        return frame > (this._totalSamples / this._samplePerFrame);
    }
    else {
        return true;
    }
};

SSRPass.prototype.dispose = function (renderer) {
    this._ssrTexture.dispose(renderer);
    this._texture2.dispose(renderer);
    this._texture3.dispose(renderer);
    this._prevTexture.dispose(renderer);
    this._currentTexture.dispose(renderer);
    this._frameBuffer.dispose(renderer);
};

var poissonKernel = {
    low: [
        0.0, 0.0,
        -0.832744853478275, 0.5513598594879403,
        0.7823221873210292, -0.6223542656233795,
        0.8370108928795909, 0.5362064710500438,
        -0.7727098963434359, -0.6132938819623763,
        0.04092262276508467, 0.9760003016507413,
        0.10476092933524708, -0.7142601248985337,
        -0.9520183077428039, -0.0525489639609502,
        0.9578473762145684, -0.06388835359538704,
        -0.30975423218617676, 0.46845558434031703,
        0.4658866243688297, 0.10825612839627967,
        0.23829063216044952, 0.539923670788023,
        0.398220546936308, -0.34800788476185535,
        -0.3308072507202097, -0.36918058735032744,
        -0.42250275612688554, 0.8896724994301312,
        -0.5346893092993575, 0.08377672180854882
    ],
    medium: [
        0.0, 0.0,
-0.9641115009972859, 0.2614302579157864,
0.7969632664670181, -0.5976911411774417,
0.5975664919276547, 0.769420798691014,
-0.08250779007716247, -0.9761084248177531,
-0.3914685938939057, 0.9153044611372912,
-0.6291713962819453, -0.4603614618705648,
0.8632099948272587, 0.08869362827804673,
0.08609771661538555, 0.7118525914763242,
-0.44434167077600856, 0.41562360097903656,
0.10576927206454265, -0.5025919321840302,
0.46386876907308683, -0.1046231198253734,
0.4060011457984311, -0.8844909164521416,
-0.555248590129936, 0.005927278022713717,
-0.9547889073225827, -0.23217608721128916,
0.3856743550311813, 0.31473452490932863,
-0.4649672188739382, -0.863920614146996,
0.7386198547374397, 0.41222746841567687,
-0.7481954910701971, 0.6529265781187632,
0.8693199044616305, -0.2524812386627343,
-0.239894797314951, -0.5598475182180388,
-0.030898092309625317, 0.34651014943236336,
    ],
    high: [
        0.0, 0.0,
0.305395901616213, -0.9520870410478366,
0.5502899001934672, 0.8332601452242868,
-0.8384814284463922, 0.5321545970763688,
-0.7000131515204344, -0.6948635015794131,
0.9323999265626489, -0.15660192155020186,
-0.24311060717680397, 0.8852856111431727,
-0.8626439303311869, -0.07251518573230534,
-0.11699714070687343, -0.5592333884709532,
0.4957881999126324, 0.2398611133621689,
0.42851204234278606, -0.3651043375018268,
-0.4029418497120613, 0.20606784905039552,
0.9299172920628507, 0.3269613913823475,
0.09541130806672582, 0.5910536558006768,
0.7637491122725867, -0.6152472145624571,
-0.17854115399846976, -0.9629904303758096,
0.18842681617744017, 0.9805736171791702,
-0.34982330549534546, -0.20856598389278297,
-0.2294696760633105, 0.48788628991719607,
-0.6624897635928761, -0.34382016868477216,
-0.7266168249907922, 0.23247146336370833,
-0.6127457000787582, 0.7363392968334574,
0.5827032613929002, -0.06869754235113948,
-0.4516491038648972, -0.8613552258627312,
0.1826432432185673, -0.5559691611637668,
0.2023539287080291, -0.19829791324177037,
0.7598398652135032, 0.6436578195515956,
0.40086104292882313, 0.5624964548288611,
-0.39660465500233877, -0.4963071615587146,
0.17685303273088746, 0.2194539549718755,
0.4598495606207799, -0.6746617410192481,
-0.5480757940168093, -0.02658740344414483,
0.7122363686131756, -0.34179843540797716,
-0.06475341641685853, -0.26356632975555006,
0.8073443289511433, 0.10150541341906767,
0.6523057930547401, 0.42404225520916927,
-0.5231973953677393, 0.5142517459350573,
0.33573305315825214, 0.023153705577288967,
-0.8824721383991224, -0.4316056308908296,
-0.103172963636783, 0.2952179148872315,
-0.9612507402932948, 0.18563675696259987,
-0.008008711519600878, 0.853571647916143,
0.06785015402786122, -0.9391589758512398
    ],
    ultra: [
        0.0, 0.0,
0.5973672909801989, -0.791147638459572,
0.5141931120122011, 0.8454769620988799,
-0.9778851734848082, -0.007442338504691638,
-0.5174127150748541, 0.8450455458158286,
-0.43475473932720554, -0.896598217115248,
0.8734759801599126, -0.015723817943875163,
0.05197932481807477, -0.5578292744802488,
-0.47123778958536794, -0.31538762061724135,
0.0356435076151139, 0.5519770432674267,
-0.4937261767813588, 0.30586856782238636,
0.5111602224405882, 0.32454981642432057,
0.47330601955180596, -0.31397514267502713,
0.1391992606005735, -0.9642252320034781,
-0.11104249617633125, 0.9732215355067219,
-0.760142106291379, -0.631921368206219,
0.8669937272830961, 0.3878023781804571,
-0.8991194243385449, 0.4211854789249589,
0.8581248987650184, -0.47058612265093297,
-0.8478966152735354, -0.3244596519558314,
-0.34351212313320856, 0.024980770405030103,
-0.13076046972163813, -0.29787957556316674,
-0.1547800004774002, 0.3289880284905106,
-0.27322128027393366, 0.6447201837796767,
0.3231979299850129, 0.07190678290727541,
0.18811687215659745, 0.8794202601017802,
-0.15945958343000347, -0.9556096794835021,
-0.6467634094431145, -0.017088746369533652,
0.3384194116185602, 0.5726838439084547,
-0.3419438182481055, -0.5985270278515467,
0.6058310022721, 0.5694382969942399,
0.35997801007105285, -0.6665675847087762,
0.7184527470677768, 0.17305595508558114,
0.2057329716806362, -0.1864742059893873,
-0.7262825291276983, 0.6507062495757975,
0.7679253384600006, -0.23718807794727403,
0.2588883116091426, 0.3333735365672385,
0.24933313900344126, -0.43058433674952273,
0.5902021142096565, -0.11410740349261393,
0.6465067383513384, -0.5442016687703175,
-0.8178693054794509, 0.15634733576174292,
-0.1053022630186697, -0.7248086276764819,
-0.29960458884326174, 0.8596541012844674,
-0.5477094561657296, -0.6757204350923193,
-0.5088291964742983, 0.5547404569288956,
-0.09264115434405544, 0.7484095955672013,
-0.6178343870864839, -0.45387121872198655,
0.06638300034421171, -0.3616522418795404,
0.4105924169280681, -0.8958719470360209,
-0.6904392914752461, 0.4341123725774793,
-0.2123353942502187, 0.15442826265785137,
0.06567164083837816, 0.26884351583217664,
-0.1663928263645511, -0.5597682945333083,
0.5285640450416145, 0.0815657965770232,
-0.3450614425262143, 0.44671377694072567,
-0.30275550556727876, -0.4216986848583408,
0.23410259261578809, -0.8078976161669522,
-0.638884792101604, -0.21724734570331042,
0.062493469010627696, -0.7811137258662765,
-0.3029970654545173, -0.19558059144291381,
0.7978621214540924, 0.5694996343456287,
0.9370189660792508, 0.17878668757399258,
0.36799712160720743, 0.7401552626115327,
0.15352117443116708, 0.10104557137462995,
-0.49415637892646824, 0.1244013500279608,
0.9665135263443085, -0.23129062375284173,
-0.17124533401981096, -0.07252897420638116,
0.3794477308720785, -0.11391290749926629,
-0.4840451838760978, -0.08817415271949763,
-0.2700138714518794, -0.8107049459626195,
-0.9747870543572046, 0.21800457203103504

    ]
};

var effectJson = {
    'type' : 'compositor',
    'nodes' : [
        {
            'name': 'source',
            'type': 'texture',
            'outputs': {
                'color': {}
            }
        },
        {
            'name': 'source_half',
            'shader': '#source(clay.compositor.downsample)',
            'inputs': {
                'texture': 'source'
            },
            'outputs': {
                'color': {
                    'parameters': {
                        'width': 'expr(width * 1.0 / 2)',
                        'height': 'expr(height * 1.0 / 2)',
                        'type': 'HALF_FLOAT'
                    }
                }
            },
            'parameters' : {
                'textureSize': 'expr( [width * 1.0, height * 1.0] )'
            }
        },


        {
            'name' : 'bright',
            'shader' : '#source(clay.compositor.bright)',
            'inputs' : {
                'texture' : 'source_half'
            },
            'outputs' : {
                'color' : {
                    'parameters' : {
                        'width' : 'expr(width * 1.0 / 2)',
                        'height' : 'expr(height * 1.0 / 2)',
                        'type': 'HALF_FLOAT'
                    }
                }
            },
            'parameters' : {
                'threshold' : 2,
                'scale': 4,
                'textureSize': 'expr([width * 1.0 / 2, height / 2])'
            }
        },

        {
            'name': 'bright_downsample_4',
            'shader' : '#source(clay.compositor.downsample)',
            'inputs' : {
                'texture' : 'bright'
            },
            'outputs' : {
                'color' : {
                    'parameters' : {
                        'width' : 'expr(width * 1.0 / 4)',
                        'height' : 'expr(height * 1.0 / 4)',
                        'type': 'HALF_FLOAT'
                    }
                }
            },
            'parameters' : {
                'textureSize': 'expr( [width * 1.0 / 2, height / 2] )'
            }
        },
        {
            'name': 'bright_downsample_8',
            'shader' : '#source(clay.compositor.downsample)',
            'inputs' : {
                'texture' : 'bright_downsample_4'
            },
            'outputs' : {
                'color' : {
                    'parameters' : {
                        'width' : 'expr(width * 1.0 / 8)',
                        'height' : 'expr(height * 1.0 / 8)',
                        'type': 'HALF_FLOAT'
                    }
                }
            },
            'parameters' : {
                'textureSize': 'expr( [width * 1.0 / 4, height / 4] )'
            }
        },
        {
            'name': 'bright_downsample_16',
            'shader' : '#source(clay.compositor.downsample)',
            'inputs' : {
                'texture' : 'bright_downsample_8'
            },
            'outputs' : {
                'color' : {
                    'parameters' : {
                        'width' : 'expr(width * 1.0 / 16)',
                        'height' : 'expr(height * 1.0 / 16)',
                        'type': 'HALF_FLOAT'
                    }
                }
            },
            'parameters' : {
                'textureSize': 'expr( [width * 1.0 / 8, height / 8] )'
            }
        },
        {
            'name': 'bright_downsample_32',
            'shader' : '#source(clay.compositor.downsample)',
            'inputs' : {
                'texture' : 'bright_downsample_16'
            },
            'outputs' : {
                'color' : {
                    'parameters' : {
                        'width' : 'expr(width * 1.0 / 32)',
                        'height' : 'expr(height * 1.0 / 32)',
                        'type': 'HALF_FLOAT'
                    }
                }
            },
            'parameters' : {
                'textureSize': 'expr( [width * 1.0 / 16, height / 16] )'
            }
        },


        {
            'name' : 'bright_upsample_16_blur_h',
            'shader' : '#source(clay.compositor.gaussian_blur)',
            'inputs' : {
                'texture' : 'bright_downsample_32'
            },
            'outputs' : {
                'color' : {
                    'parameters' : {
                        'width' : 'expr(width * 1.0 / 16)',
                        'height' : 'expr(height * 1.0 / 16)',
                        'type': 'HALF_FLOAT'
                    }
                }
            },
            'parameters' : {
                'blurSize' : 1,
                'blurDir': 0.0,
                'textureSize': 'expr( [width * 1.0 / 32, height / 32] )'
            }
        },
        {
            'name' : 'bright_upsample_16_blur_v',
            'shader' : '#source(clay.compositor.gaussian_blur)',
            'inputs' : {
                'texture' : 'bright_upsample_16_blur_h'
            },
            'outputs' : {
                'color' : {
                    'parameters' : {
                        'width' : 'expr(width * 1.0 / 16)',
                        'height' : 'expr(height * 1.0 / 16)',
                        'type': 'HALF_FLOAT'
                    }
                }
            },
            'parameters' : {
                'blurSize' : 1,
                'blurDir': 1.0,
                'textureSize': 'expr( [width * 1.0 / 32, height * 1.0 / 32] )'
            }
        },



        {
            'name' : 'bright_upsample_8_blur_h',
            'shader' : '#source(clay.compositor.gaussian_blur)',
            'inputs' : {
                'texture' : 'bright_downsample_16'
            },
            'outputs' : {
                'color' : {
                    'parameters' : {
                        'width' : 'expr(width * 1.0 / 8)',
                        'height' : 'expr(height * 1.0 / 8)',
                        'type': 'HALF_FLOAT'
                    }
                }
            },
            'parameters' : {
                'blurSize' : 1,
                'blurDir': 0.0,
                'textureSize': 'expr( [width * 1.0 / 16, height * 1.0 / 16] )'
            }
        },
        {
            'name' : 'bright_upsample_8_blur_v',
            'shader' : '#source(clay.compositor.gaussian_blur)',
            'inputs' : {
                'texture' : 'bright_upsample_8_blur_h'
            },
            'outputs' : {
                'color' : {
                    'parameters' : {
                        'width' : 'expr(width * 1.0 / 8)',
                        'height' : 'expr(height * 1.0 / 8)',
                        'type': 'HALF_FLOAT'
                    }
                }
            },
            'parameters' : {
                'blurSize' : 1,
                'blurDir': 1.0,
                'textureSize': 'expr( [width * 1.0 / 16, height * 1.0 / 16] )'
            }
        },
        {
            'name' : 'bright_upsample_8_blend',
            'shader' : '#source(clay.compositor.blend)',
            'inputs' : {
                'texture1' : 'bright_upsample_8_blur_v',
                'texture2' : 'bright_upsample_16_blur_v'
            },
            'outputs' : {
                'color' : {
                    'parameters' : {
                        'width' : 'expr(width * 1.0 / 8)',
                        'height' : 'expr(height * 1.0 / 8)',
                        'type': 'HALF_FLOAT'
                    }
                }
            },
            'parameters' : {
                'weight1' : 0.3,
                'weight2' : 0.7
            }
        },


        {
            'name' : 'bright_upsample_4_blur_h',
            'shader' : '#source(clay.compositor.gaussian_blur)',
            'inputs' : {
                'texture' : 'bright_downsample_8'
            },
            'outputs' : {
                'color' : {
                    'parameters' : {
                        'width' : 'expr(width * 1.0 / 4)',
                        'height' : 'expr(height * 1.0 / 4)',
                        'type': 'HALF_FLOAT'
                    }
                }
            },
            'parameters' : {
                'blurSize' : 1,
                'blurDir': 0.0,
                'textureSize': 'expr( [width * 1.0 / 8, height * 1.0 / 8] )'
            }
        },
        {
            'name' : 'bright_upsample_4_blur_v',
            'shader' : '#source(clay.compositor.gaussian_blur)',
            'inputs' : {
                'texture' : 'bright_upsample_4_blur_h'
            },
            'outputs' : {
                'color' : {
                    'parameters' : {
                        'width' : 'expr(width * 1.0 / 4)',
                        'height' : 'expr(height * 1.0 / 4)',
                        'type': 'HALF_FLOAT'
                    }
                }
            },
            'parameters' : {
                'blurSize' : 1,
                'blurDir': 1.0,
                'textureSize': 'expr( [width * 1.0 / 8, height * 1.0 / 8] )'
            }
        },
        {
            'name' : 'bright_upsample_4_blend',
            'shader' : '#source(clay.compositor.blend)',
            'inputs' : {
                'texture1' : 'bright_upsample_4_blur_v',
                'texture2' : 'bright_upsample_8_blend'
            },
            'outputs' : {
                'color' : {
                    'parameters' : {
                        'width' : 'expr(width * 1.0 / 4)',
                        'height' : 'expr(height * 1.0 / 4)',
                        'type': 'HALF_FLOAT'
                    }
                }
            },
            'parameters' : {
                'weight1' : 0.3,
                'weight2' : 0.7
            }
        },





        {
            'name' : 'bright_upsample_2_blur_h',
            'shader' : '#source(clay.compositor.gaussian_blur)',
            'inputs' : {
                'texture' : 'bright_downsample_4'
            },
            'outputs' : {
                'color' : {
                    'parameters' : {
                        'width' : 'expr(width * 1.0 / 2)',
                        'height' : 'expr(height * 1.0 / 2)',
                        'type': 'HALF_FLOAT'
                    }
                }
            },
            'parameters' : {
                'blurSize' : 1,
                'blurDir': 0.0,
                'textureSize': 'expr( [width * 1.0 / 4, height * 1.0 / 4] )'
            }
        },
        {
            'name' : 'bright_upsample_2_blur_v',
            'shader' : '#source(clay.compositor.gaussian_blur)',
            'inputs' : {
                'texture' : 'bright_upsample_2_blur_h'
            },
            'outputs' : {
                'color' : {
                    'parameters' : {
                        'width' : 'expr(width * 1.0 / 2)',
                        'height' : 'expr(height * 1.0 / 2)',
                        'type': 'HALF_FLOAT'
                    }
                }
            },
            'parameters' : {
                'blurSize' : 1,
                'blurDir': 1.0,
                'textureSize': 'expr( [width * 1.0 / 4, height * 1.0 / 4] )'
            }
        },
        {
            'name' : 'bright_upsample_2_blend',
            'shader' : '#source(clay.compositor.blend)',
            'inputs' : {
                'texture1' : 'bright_upsample_2_blur_v',
                'texture2' : 'bright_upsample_4_blend'
            },
            'outputs' : {
                'color' : {
                    'parameters' : {
                        'width' : 'expr(width * 1.0 / 2)',
                        'height' : 'expr(height * 1.0 / 2)',
                        'type': 'HALF_FLOAT'
                    }
                }
            },
            'parameters' : {
                'weight1' : 0.3,
                'weight2' : 0.7
            }
        },



        {
            'name' : 'bright_upsample_full_blur_h',
            'shader' : '#source(clay.compositor.gaussian_blur)',
            'inputs' : {
                'texture' : 'bright'
            },
            'outputs' : {
                'color' : {
                    'parameters' : {
                        'width' : 'expr(width * 1.0)',
                        'height' : 'expr(height * 1.0)',
                        'type': 'HALF_FLOAT'
                    }
                }
            },
            'parameters' : {
                'blurSize' : 1,
                'blurDir': 0.0,
                'textureSize': 'expr( [width * 1.0 / 2, height * 1.0 / 2] )'
            }
        },
        {
            'name' : 'bright_upsample_full_blur_v',
            'shader' : '#source(clay.compositor.gaussian_blur)',
            'inputs' : {
                'texture' : 'bright_upsample_full_blur_h'
            },
            'outputs' : {
                'color' : {
                    'parameters' : {
                        'width' : 'expr(width * 1.0)',
                        'height' : 'expr(height * 1.0)',
                        'type': 'HALF_FLOAT'
                    }
                }
            },
            'parameters' : {
                'blurSize' : 1,
                'blurDir': 1.0,
                'textureSize': 'expr( [width * 1.0 / 2, height * 1.0 / 2] )'
            }
        },
        {
            'name' : 'bloom_composite',
            'shader' : '#source(clay.compositor.blend)',
            'inputs' : {
                'texture1' : 'bright_upsample_full_blur_v',
                'texture2' : 'bright_upsample_2_blend'
            },
            'outputs' : {
                'color' : {
                    'parameters' : {
                        'width' : 'expr(width * 1.0)',
                        'height' : 'expr(height * 1.0)',
                        'type': 'HALF_FLOAT'
                    }
                }
            },
            'parameters' : {
                'weight1' : 0.3,
                'weight2' : 0.7
            }
        },


        {
            'name': 'coc',
            'shader': '#source(car.dof.coc)',
            'outputs': {
                'color': {
                    'parameters': {
                        'width': 'expr(width * 1.0)',
                        'height': 'expr(height * 1.0)',
                        'type': 'HALF_FLOAT'
                    }
                }
            }
        },

        {
            'name': 'coc_max_tile_2',
            'shader': '#source(car.dof.maxCoc)',
            'inputs': {
                'cocTex': 'coc'
            },
            'outputs': {
                'color': {
                    'parameters': {
                        'width': 'expr(width / 2.0 * 1.0)',
                        'height': 'expr(height / 2.0 * 1.0)',
                        'minFilter': 'NEAREST',
                        'magFilter': 'NEAREST'
                    }
                }
            },
            'parameters': {
                'textureSize': 'expr( [width * 1.0, height * 1.0] )'
            }
        },

        {
            'name': 'coc_max_tile_4',
            'shader': '#source(car.dof.maxCoc)',
            'inputs': {
                'cocTex': 'coc_max_tile_2'
            },
            'outputs': {
                'color': {
                    'parameters': {
                        'width': 'expr(width / 4.0 * 1.0)',
                        'height': 'expr(height / 4.0 * 1.0)',
                        'minFilter': 'NEAREST',
                        'magFilter': 'NEAREST'
                    }
                }
            },
            'parameters': {
                'textureSize': 'expr( [width / 2.0 * 1.0, height / 2.0 * 1.0] )'
            }
        },

        {
            'name': 'coc_max_tile_8',
            'shader': '#source(car.dof.maxCoc)',
            'inputs': {
                'cocTex': 'coc_max_tile_4'
            },
            'outputs': {
                'color': {
                    'parameters': {
                        'width': 'expr(width / 8.0 * 1.0)',
                        'height': 'expr(height / 8.0 * 1.0)',
                        'minFilter': 'NEAREST',
                        'magFilter': 'NEAREST'
                    }
                }
            },
            'parameters': {
                'textureSize': 'expr( [width / 4.0 * 1.0, height / 4.0 * 1.0] )'
            }
        },

        {
            'name': 'coc_max_tile_16',
            'shader': '#source(car.dof.maxCoc)',
            'inputs': {
                'cocTex': 'coc_max_tile_8'
            },
            'outputs': {
                'color': {
                    'parameters': {
                        'width': 'expr(width / 16.0 * 1.0)',
                        'height': 'expr(height / 16.0 * 1.0)',
                        'minFilter': 'NEAREST',
                        'magFilter': 'NEAREST'
                    }
                }
            },
            'parameters': {
                'textureSize': 'expr( [width / 8.0 * 1.0, height / 8.0 * 1.0] )'
            }
        },


        {
            'name': 'coc_max_tile_32',
            'shader': '#source(car.dof.maxCoc)',
            'inputs': {
                'cocTex': 'coc_max_tile_16'
            },
            'outputs': {
                'color': {
                    'parameters': {
                        'width': 'expr(width / 32.0 * 1.0)',
                        'height': 'expr(height / 32.0 * 1.0)',
                        'minFilter': 'NEAREST',
                        'magFilter': 'NEAREST'
                    }
                }
            },
            'parameters': {
                'textureSize': 'expr( [width / 16.0 * 1.0, height / 16 * 1.0] )'
            }
        },

        {
            'name': 'coc_max_tile_64',
            'shader': '#source(car.dof.maxCoc)',
            'inputs': {
                'cocTex': 'coc_max_tile_32'
            },
            'outputs': {
                'color': {
                    'parameters': {
                        'width': 'expr(width / 64.0 * 1.0)',
                        'height': 'expr(height / 64.0 * 1.0)',
                        'minFilter': 'NEAREST',
                        'magFilter': 'NEAREST'
                    }
                }
            },
            'parameters': {
                'textureSize': 'expr( [width / 32.0 * 1.0, height / 32.0 * 1.0] )'
            }
        },

        {
            'name': 'dof_blur',
            'shader': '#source(car.dof.diskBlur)',
            'inputs': {
                // TODO
                'mainTex': 'source_half',
                'maxCocTex': 'coc_max_tile_64',
                'cocTex': 'coc'
            },
            'outputs': {
                'color': {
                    'parameters': {
                        'width': 'expr(width / 2.0 * 1.0)',
                        'height': 'expr(height / 2.0 * 1.0)',
                        'type': 'HALF_FLOAT'
                    }
                }
            },
            'parameters': {
                'textureSize': 'expr( [width / 2.0 * 1.0, height / 2.0 * 1.0] )'
            }
        },

        {
            'name': 'dof_blur_upsample',
            'shader': '#source(car.dof.extraBlur)',
            'inputs': {
                'blur': 'dof_blur',
                'cocTex': 'coc'
            },
            'outputs': {
                'color': {
                    'parameters': {
                        'width': 'expr(width * 1.0)',
                        'height': 'expr(height * 1.0)',
                        'type': 'HALF_FLOAT'
                    }
                }
            },
            'parameters': {
                'textureSize': 'expr( [width / 2.0 * 1.0, height / 2.0 * 1.0] )'
            }
        },

        {
            'name': 'dof_composite',
            'shader': '#source(car.dof.composite)',
            'inputs': {
                'sharp': 'source',
                'blur': 'dof_blur_upsample',
                'cocTex': 'coc'
            },
            'outputs': {
                'color': {
                    'parameters': {
                        'width': 'expr(width * 1.0)',
                        'height': 'expr(height * 1.0)',
                        'type': 'HALF_FLOAT'
                    }
                }
            },
            'defines': {
                // DEBUG: 4
            }
        },
        {
            'name' : 'composite',
            'shader' : '#source(clay.compositor.hdr.composite)',
            'inputs' : {
                'texture': 'source',
                'bloom' : 'bloom_composite'
            },
            'defines': {
                // Images are all premultiplied alpha before composite because of blending.
                // 'PREMULTIPLY_ALPHA': null,
                // 'DEBUG': 1
            }
        },
        {
            'name' : 'FXAA',
            'shader' : '#source(clay.compositor.fxaa)',
            'inputs' : {
                'texture' : 'composite'
            }
        }
    ]
};

var dofCode = "@export car.dof.coc\nuniform sampler2D depth;\nuniform float zNear = 0.1;\nuniform float zFar = 2000;\nuniform float focalDistance = 10;\nuniform float focalLength = 50;\nuniform float aperture = 5.6;\nuniform float maxCoc;\nuniform float _filmHeight = 0.024;\nvarying vec2 v_Texcoord;\n@import clay.util.encode_float\nvoid main()\n{\n float z = texture2D(depth, v_Texcoord).r * 2.0 - 1.0;\n float dist = 2.0 * zNear * zFar / (zFar + zNear - z * (zFar - zNear));\n float f = focalLength / 1000.0;\n float s1 = max(f, focalDistance);\n float coeff = f * f / (aperture * (s1 - f) * _filmHeight * 2.0);\n float coc = (dist - focalDistance) * coeff / max(dist, 1e-5);\n coc /= maxCoc;\n gl_FragColor = vec4(clamp(coc * 0.5 + 0.5, 0.0, 1.0), 0.0, 0.0, 1.0);\n}\n@end\n@export car.dof.composite\n#define DEBUG 0\nuniform sampler2D sharp;\nuniform sampler2D blur;\nuniform sampler2D cocTex;\nuniform float maxCoc;\nvarying vec2 v_Texcoord;\n@import clay.util.rgbm\n@import clay.util.float\nvoid main()\n{\n float coc = texture2D(cocTex, v_Texcoord).r * 2.0 - 1.0;\n vec4 blurTexel = decodeHDR(texture2D(blur, v_Texcoord));\n vec4 sharpTexel = decodeHDR(texture2D(sharp, v_Texcoord));\n float nfa = blurTexel.a;\n blurTexel.a = 1.0;\n float ffa = smoothstep(0.0, 0.2, coc);\n gl_FragColor = mix(sharpTexel, blurTexel, ffa + nfa - ffa * nfa);\n}\n@end\n@export car.dof.extraBlur\nuniform sampler2D cocTex;\nuniform sampler2D blur;\nuniform vec2 textureSize;\nvarying vec2 v_Texcoord;\nvoid main()\n{\n vec2 kernel[9];\n kernel[0] = vec2(0.0, 0.0);\n kernel[1] = vec2(-0.9745327951958312, 0.21867486523537);\n kernel[2] = vec2(0.3777025447567271, 0.9202783758545757);\n kernel[3] = vec2(0.902187310588039, -0.3483859389475743);\n kernel[4] = vec2(-0.30698572999585466, -0.9297615216865224);\n kernel[5] = vec2(-0.5044353449794678, 0.799706031619336);\n kernel[6] = vec2(0.42218664766829966, -0.8913520930728434);\n kernel[7] = vec2(0.9206341562564012, 0.3586614465551363);\n kernel[8] = vec2(-0.7527561502723913, -0.4015851235140097);\n vec4 color = vec4(0.0);\n float w = 0.0;\n float coc0 = abs(texture2D(cocTex, v_Texcoord).r * 2.0 - 1.0);\n for (int i = 0; i < 9; i++) {\n vec2 uv = v_Texcoord + kernel[i] / textureSize * coc0 * 2.0;\n float coc = abs(texture2D(cocTex, uv).r * 2.0 - 1.0);\n vec4 texel = texture2D(blur, uv);\n color += texel * coc;\n w += coc;\n }\n gl_FragColor = color / max(w, 0.0001);\n}\n@end\n@export car.dof.maxCoc\nuniform sampler2D cocTex;\nuniform vec2 textureSize;\nvarying vec2 v_Texcoord;\nfloat tap(vec2 off) {\n return texture2D(cocTex, v_Texcoord + off).r * 2.0 - 1.0;\n}\nvoid main()\n{\n vec2 texelSize = 1.0 / textureSize;\n vec4 d = vec4(-1.0, -1.0, +1.0, +1.0) * texelSize.xyxy;\n float coc = tap(vec2(0.0));\n float lt = tap(d.xy);\n float rt = tap(d.zy);\n float lb = tap(d.xw);\n float rb = tap(d.zw);\n coc = abs(lt) > abs(coc) ? lt : coc;\n coc = abs(rt) > abs(coc) ? rt : coc;\n coc = abs(lb) > abs(coc) ? lb : coc;\n coc = abs(rb) > abs(coc) ? rb : coc;\n gl_FragColor = vec4(coc * 0.5 + 0.5, 0.0,0.0,1.0);\n}\n@end\n@export car.dof.diskBlur\n#define POISSON_KERNEL_SIZE 16;\nuniform sampler2D mainTex;\nuniform sampler2D cocTex;\nuniform sampler2D maxCocTex;\nuniform float maxCoc;\nuniform vec2 textureSize;\nuniform vec2 poissonKernel[POISSON_KERNEL_SIZE];\nuniform float jitter;\nvarying vec2 v_Texcoord;\nfloat nrand(const in vec2 n) {\n return fract(sin(dot(n.xy ,vec2(12.9898,78.233))) * 43758.5453);\n}\n@import clay.util.rgbm\n@import clay.util.float\nvoid main()\n{\n vec2 texelSize = 1.0 / textureSize;\n float maxCocInTile = abs(texture2D(maxCocTex, v_Texcoord).r * 2.0 - 1.0);\n vec2 offset = vec2(maxCoc * texelSize.x / texelSize.y, maxCoc) * maxCocInTile;\n float rnd = 6.28318 * nrand(v_Texcoord + 0.07 * jitter);\n float cosa = cos(rnd);\n float sina = sin(rnd);\n vec4 basis = vec4(cosa, -sina, sina, cosa);\n vec4 fgColor = vec4(0.0);\n vec4 bgColor = vec4(0.0);\n float weightFg = 0.0;\n float weightBg = 0.0;\n float coc0 = texture2D(cocTex, v_Texcoord).r * 2.0 - 1.0;\n coc0 *= maxCoc;\n float margin = texelSize.y * 2.0;\n for (int i = 0; i < POISSON_KERNEL_SIZE; i++) {\n vec2 duv = poissonKernel[i];\n duv = vec2(dot(duv, basis.xy), dot(duv, basis.zw));\n duv = offset * duv;\n float dist = length(duv);\n vec2 uv = clamp(v_Texcoord + duv, vec2(0.0), vec2(1.0));\n vec4 texel = decodeHDR(texture2D(mainTex, uv));\n float coc = texture2D(cocTex, uv).r * 2.0 - 1.0;\n coc *= maxCoc;\n float bgCoc = max(min(coc0, coc), 0.0);\n float bgw = clamp((bgCoc - dist + margin) / margin, 0.0, 1.0);\n float fgw = clamp((-coc - dist + margin) / margin, 0.0, 1.0);\n fgw *= step(texelSize.y, -coc);\n bgColor += bgw * texel;\n fgColor += fgw * texel;\n weightFg += fgw;\n weightBg += bgw;\n }\n fgColor /= max(weightFg, 0.0001);\n bgColor /= max(weightBg, 0.0001);\n weightFg = clamp(weightFg * 3.1415 / float(POISSON_KERNEL_SIZE), 0.0, 1.0);\n gl_FragColor = encodeHDR(mix(bgColor, fgColor, weightFg));\n float alpha = clamp(gl_FragColor.a, 0.0, 1.0);\n alpha = floor(alpha * 255.0);\n gl_FragColor.a = weightFg;\n}\n@end";

var temporalBlendCode = "@export car.temporalBlend\nuniform sampler2D prevTex;\nuniform sampler2D currTex;\nuniform sampler2D velocityTex;\nuniform float stillBlending = 0.95;\nuniform float motionBlending = 0.5;\nvarying vec2 v_Texcoord;\nvoid main() {\n vec4 vel = texture2D(velocityTex, v_Texcoord);\n vec2 motion = vel.rg - 0.5;\n vec4 curr = texture2D(currTex, v_Texcoord);\n vec4 prev = texture2D(prevTex, v_Texcoord - motion);\n if (vel.a < 0.01) {\n gl_FragColor = curr;\n }\n else {\n float motionLength = length(motion);\n float weight = clamp(\n mix(stillBlending, motionBlending, motionLength * 1000.0),\n motionBlending, stillBlending\n );\n gl_FragColor = mix(curr, prev, weight);\n }\n}\n@end";

var GBuffer = claygl.deferred.GBuffer;

claygl.Shader.import(dofCode);

claygl.Shader.import(temporalBlendCode);

var commonOutputs = {
    color: {
        parameters: {
            width: function (renderer) {
                return renderer.getWidth();
            },
            height: function (renderer) {
                return renderer.getHeight();
            }
        }
    }
};

var FINAL_NODES_CHAIN = ['composite', 'FXAA'];

function EffectCompositor() {
    this._sourceTexture = new claygl.Texture2D({
        type: claygl.Texture.HALF_FLOAT
    });
    this._depthTexture = new claygl.Texture2D({
        format: claygl.Texture.DEPTH_COMPONENT,
        type: claygl.Texture.UNSIGNED_INT
    });

    this._framebuffer = new claygl.FrameBuffer();
    this._framebuffer.attach(this._sourceTexture);
    this._framebuffer.attach(this._depthTexture, claygl.FrameBuffer.DEPTH_ATTACHMENT);

    this._gBufferPass = new GBuffer({
        renderTransparent: true,
        enableTargetTexture3: false,
        enableTargetTexture4: true
    });

    this._compositor = claygl.createCompositor(effectJson);

    var sourceNode = this._compositor.getNodeByName('source');
    sourceNode.texture = this._sourceTexture;
    var cocNode = this._compositor.getNodeByName('coc');

    this._sourceNode = sourceNode;
    this._cocNode = cocNode;
    this._compositeNode = this._compositor.getNodeByName('composite');
    this._fxaaNode = this._compositor.getNodeByName('FXAA');

    this._dofBlurNodes = ['dof_blur'].map(function (name) {
        return this._compositor.getNodeByName(name);
    }, this);
    this._dofCompositeNode = this._compositor.getNodeByName('dof_composite');

    this._dofBlurKernel = null;
    this._dofBlurKernelSize = new Float32Array(0);

    this._finalNodesChain = FINAL_NODES_CHAIN.map(function (name) {
        return this._compositor.getNodeByName(name);
    }, this);

    var gBufferObj = {
        normalTexture: this._gBufferPass.getTargetTexture1(),
        depthTexture: this._gBufferPass.getTargetTexture2(),
        albedoTexture: this._gBufferPass.getTargetTexture3(),
        velocityTexture: this._gBufferPass.getTargetTexture4()
    };
    this._ssaoPass = new SSAOPass(gBufferObj);
    this._ssrPass = new SSRPass(gBufferObj);
}

EffectCompositor.prototype.resize = function (width, height, dpr) {
    dpr = dpr || 1;
    width = width * dpr;
    height = height * dpr;
    var sourceTexture = this._sourceTexture;
    var depthTexture = this._depthTexture;

    sourceTexture.width = width;
    sourceTexture.height = height;
    depthTexture.width = width;
    depthTexture.height = height;

    this._gBufferPass.resize(width, height);
};

EffectCompositor.prototype._ifRenderNormalPass = function () {
    // return this._enableSSAO || this._enableEdge || this._enableSSR;
    return true;
};

EffectCompositor.prototype._getPrevNode = function (node) {
    var idx = FINAL_NODES_CHAIN.indexOf(node.name) - 1;
    var prevNode = this._finalNodesChain[idx];
    while (prevNode && !this._compositor.getNodeByName(prevNode.name)) {
        idx -= 1;
        prevNode = this._finalNodesChain[idx];
    }
    return prevNode;
};
EffectCompositor.prototype._getNextNode = function (node) {
    var idx = FINAL_NODES_CHAIN.indexOf(node.name) + 1;
    var nextNode = this._finalNodesChain[idx];
    while (nextNode && !this._compositor.getNodeByName(nextNode.name)) {
        idx += 1;
        nextNode = this._finalNodesChain[idx];
    }
    return nextNode;
};
EffectCompositor.prototype._addChainNode = function (node) {
    var prevNode = this._getPrevNode(node);
    var nextNode = this._getNextNode(node);
    if (!prevNode) {
        return;
    }

    prevNode.outputs = commonOutputs;
    node.inputs.texture = prevNode.name;
    if (nextNode) {
        node.outputs = commonOutputs;
        nextNode.inputs.texture = node.name;
    }
    else {
        node.outputs = null;
    }
    this._compositor.addNode(node);
};
EffectCompositor.prototype._removeChainNode = function (node) {
    var prevNode = this._getPrevNode(node);
    var nextNode = this._getNextNode(node);
    if (!prevNode) {
        return;
    }

    if (nextNode) {
        prevNode.outputs = commonOutputs;
        nextNode.inputs.texture = prevNode.name;
    }
    else {
        prevNode.outputs = null;
    }
    this._compositor.removeNode(node);
};
/**
 * Update normal
 */
EffectCompositor.prototype.updateGBuffer = function (renderer, scene, camera, frame) {
    if (this._ifRenderNormalPass()) {
        this._gBufferPass.update(renderer, scene, camera);
    }
};

/**
 * Render SSAO after render the scene, before compositing
 */
EffectCompositor.prototype.updateSSAO = function (renderer, scene, camera, frame) {
    this._ssaoPass.update(renderer, camera, frame);
};

/**
 * Enable SSAO effect
 */
EffectCompositor.prototype.enableSSAO = function () {
    this._enableSSAO = true;
};

/**
 * Disable SSAO effect
 */
EffectCompositor.prototype.disableSSAO = function () {
    this._enableSSAO = false;
};

EffectCompositor.prototype.enableVelocityBuffer = function () {
    this._gBufferPass.enableTargetTexture4 = true;
};
EffectCompositor.prototype.disableVelocityBuffer = function () {
    this._gBufferPass.enableTargetTexture4 = false;
};

/**
 * Enable SSR effect
 */
EffectCompositor.prototype.enableSSR = function () {
    this._enableSSR = true;
    this._gBufferPass.enableTargetTexture3 = true;
};
/**
 * Disable SSR effect
 */
EffectCompositor.prototype.disableSSR = function () {
    this._enableSSR = false;
    this._gBufferPass.enableTargetTexture3 = false;
};

/**
 * Render SSAO after render the scene, before compositing
 */
EffectCompositor.prototype.getSSAOTexture = function () {
    return this._ssaoPass.getTargetTexture();
};

/**
 * @return {clay.FrameBuffer}
 */
EffectCompositor.prototype.getSourceFrameBuffer = function () {
    return this._framebuffer;
};

/**
 * @return {clay.Texture2D}
 */
EffectCompositor.prototype.getSourceTexture = function () {
    return this._sourceTexture;
};

EffectCompositor.prototype.getVelocityTexture = function () {
    return this._gBufferPass.getTargetTexture4();
};
EffectCompositor.prototype.getDepthTexture = function () {
    return this._gBufferPass.getTargetTexture2();
};

/**
 * Disable fxaa effect
 */
EffectCompositor.prototype.disableFXAA = function () {
    this._removeChainNode(this._fxaaNode);
};

/**
 * Enable fxaa effect
 */
EffectCompositor.prototype.enableFXAA = function () {
    this._addChainNode(this._fxaaNode);
};

/**
 * Enable bloom effect
 */
EffectCompositor.prototype.enableBloom = function () {
    this._compositeNode.inputs.bloom = 'bloom_composite';
    this._compositor.dirty();
};

/**
 * Disable bloom effect
 */
EffectCompositor.prototype.disableBloom = function () {
    this._compositeNode.inputs.bloom = null;
    this._compositor.dirty();
};

/**
 * Enable depth of field effect
 */
EffectCompositor.prototype.enableDOF = function () {
    this._compositeNode.inputs.texture = 'dof_composite';
    this._compositor.dirty();
};
/**
 * Disable depth of field effect
 */
EffectCompositor.prototype.disableDOF = function () {
    this._compositeNode.inputs.texture = 'source';
    this._compositor.dirty();
};

/**
 * Enable color correction
 */
EffectCompositor.prototype.enableColorCorrection = function () {
    this._compositeNode.define('COLOR_CORRECTION');
    this._enableColorCorrection = true;
};
/**
 * Disable color correction
 */
EffectCompositor.prototype.disableColorCorrection = function () {
    this._compositeNode.undefine('COLOR_CORRECTION');
    this._enableColorCorrection = false;
};

/**
 * Enable edge detection
 */
EffectCompositor.prototype.enableEdge = function () {
    this._enableEdge = true;
};

/**
 * Disable edge detection
 */
EffectCompositor.prototype.disableEdge = function () {
    this._enableEdge = false;
};

/**
 * Set bloom intensity
 * @param {number} value
 */
EffectCompositor.prototype.setBloomIntensity = function (value) {
    if (value == null) {
        return;
    }
    this._compositeNode.setParameter('bloomIntensity', value);
};

EffectCompositor.prototype.setSSAOParameter = function (name, value) {
    if (value == null) {
        return;
    }
    switch (name) {
        case 'quality':
            // PENDING
            var kernelSize = ({
                low: 6,
                medium: 12,
                high: 32,
                ultra: 62
            })[value] || 12;
            this._ssaoPass.setParameter('kernelSize', kernelSize);
            break;
        case 'radius':
            this._ssaoPass.setParameter(name, value);
            this._ssaoPass.setParameter('bias', value / 50);
            break;
        case 'intensity':
        case 'temporalFilter':
            this._ssaoPass.setParameter(name, value);
            break;
    }
};

EffectCompositor.prototype.setDOFParameter = function (name, value) {
    if (value == null) {
        return;
    }
    switch (name) {
        case 'focalDistance':
        case 'focalRange':
        case 'aperture':
            this._cocNode.setParameter(name, value);
            break;
        case 'blurRadius':
            this._dofBlurRadius = value;
            break;
        case 'quality':
            this._dofBlurKernel = poissonKernel[value] || poissonKernel.medium;
            var kernelSize = this._dofBlurKernel.length / 2;
            for (var i = 0; i < this._dofBlurNodes.length; i++) {
                this._dofBlurNodes[i].define('POISSON_KERNEL_SIZE', kernelSize);
            }
            break;
    }
};

EffectCompositor.prototype.setSSRParameter = function (name, value) {
    if (value == null) {
        return;
    }
    switch (name) {
        case 'quality':
            // PENDING
            var maxIteration = ({
                low: 10,
                medium: 15,
                high: 30,
                ultra: 80
            })[value] || 20;
            var pixelStride = ({
                low: 32,
                medium: 16,
                high: 8,
                ultra: 4
            })[value] || 16;
            this._ssrPass.setParameter('maxIteration', maxIteration);
            this._ssrPass.setParameter('pixelStride', pixelStride);
            break;
        case 'maxRoughness':
            this._ssrPass.setParameter('minGlossiness', Math.max(Math.min(1.0 - value, 1.0), 0.0));
            break;
        case 'physical':
            this.setPhysicallyCorrectSSR(value);
            break;
        default:
            console.warn('Unkown SSR parameter ' + name);
    }
};

EffectCompositor.prototype.setPhysicallyCorrectSSR = function (physical) {
    this._ssrPass.setPhysicallyCorrect(physical);
};
/**
 * Set color of edge
 */
EffectCompositor.prototype.setEdgeColor = function (value) {
    // if (value == null) {
    //     return;
    // }
    // this._edgePass.setParameter('edgeColor', value);
};

EffectCompositor.prototype.setExposure = function (value) {
    if (value == null) {
        return;
    }
    this._compositeNode.setParameter('exposure', Math.pow(2, value));
};

EffectCompositor.prototype.setColorLookupTexture = function (image, api) {
    // this._compositeNode.pass.material.setTextureImage('lut', this._enableColorCorrection ? image : 'none', api, {
    //     minFilter: Texture.NEAREST,
    //     magFilter: Texture.NEAREST,
    //     flipY: false
    // });
};
EffectCompositor.prototype.setColorCorrection = function (type, value) {
    this._compositeNode.setParameter(type, value);
};

EffectCompositor.prototype.composite = function (renderer, scene, camera, framebuffer, frame, accumulating) {

    var sourceTexture = this._sourceTexture;
    var targetTexture = sourceTexture;

    if (this._enableSSR) {
        this._ssrPass.update(renderer, camera, sourceTexture, frame);
        targetTexture = this._ssrPass.getTargetTexture();

        this._ssrPass.setSSAOTexture(
            this._enableSSAO ? this._ssaoPass.getTargetTexture() : null
        );
        var lights = scene.getLights();
        for (var i = 0; i < lights.length; i++) {
            if (lights[i].cubemap) {
                this._ssrPass.setAmbientCubemap(
                    lights[i].cubemap,
                    // lights[i].getBRDFLookup(),
                    lights[i]._brdfLookup,
                    lights[i].intensity
                );
            }
        }
    }
    this._sourceNode.texture = targetTexture;

    this._cocNode.setParameter('depth', this._depthTexture);

    var blurKernel = this._dofBlurKernel;

    var maxCoc = this._dofBlurRadius || 10;
    maxCoc /= renderer.getHeight();
    // var jitter = Math.random();
    for (var i = 0; i < this._dofBlurNodes.length; i++) {
        this._dofBlurNodes[i].setParameter('jitter', accumulating ? frame / 30 : 0);
        this._dofBlurNodes[i].setParameter('poissonKernel', blurKernel);
        this._dofBlurNodes[i].setParameter('maxCoc', maxCoc);
    }
    this._cocNode.setParameter('maxCoc', maxCoc);
    this._dofCompositeNode.setParameter('maxCoc', maxCoc);

    this._cocNode.setParameter('zNear', camera.near);
    this._cocNode.setParameter('zFar', camera.far);

    this._compositor.render(renderer, framebuffer);
};

EffectCompositor.prototype.isSSRFinished = function (frame) {
    return this._ssrPass ? this._ssrPass.isFinished(frame) : true;
};

EffectCompositor.prototype.isSSAOFinished = function (frame) {
    return this._ssaoPass ? this._ssaoPass.isFinished(frame) : true;
};

EffectCompositor.prototype.isSSREnabled = function () {
    return this._enableSSR;
};

EffectCompositor.prototype.dispose = function (renderer) {
    this._sourceTexture.dispose(renderer);
    this._depthTexture.dispose(renderer);
    this._framebuffer.dispose(renderer);
    this._compositor.dispose(renderer);

    this._gBufferPass.dispose(renderer);
    this._ssaoPass.dispose(renderer);
};

var TAAGLSLCode = "@export car.taa\n#define SHADER_NAME TAA3\nuniform sampler2D prevTex;\nuniform sampler2D currTex;\nuniform sampler2D velocityTex;\nuniform sampler2D depthTex;\nuniform vec2 texelSize;\nuniform vec2 velocityTexelSize;\nuniform vec2 jitterOffset;\nuniform bool still;\nuniform float stillBlending = 0.95;\nuniform float motionBlending = 0.85;\nuniform float sharpness = 0.25;\nuniform float motionAmplification = 6000;\nvarying vec2 v_Texcoord;\nfloat Luminance(vec4 color)\n{\n return dot(color.rgb, vec3(0.2125, 0.7154, 0.0721));\n}\nfloat compareDepth(float a, float b)\n{\n return step(a, b);\n}\nvec2 GetClosestFragment(vec2 uv)\n{\n vec2 k = velocityTexelSize.xy;\n vec4 neighborhood = vec4(\n texture2D(depthTex, uv - k).r,\n texture2D(depthTex, uv + vec2(k.x, -k.y)).r,\n texture2D(depthTex, uv + vec2(-k.x, k.y)).r,\n texture2D(depthTex, uv + k).r\n );\n vec3 result = vec3(0.0, 0.0, texture2D(depthTex, uv));\n result = mix(result, vec3(-1.0, -1.0, neighborhood.x), compareDepth(neighborhood.x, result.z));\n result = mix(result, vec3( 1.0, -1.0, neighborhood.y), compareDepth(neighborhood.y, result.z));\n result = mix(result, vec3(-1.0, 1.0, neighborhood.z), compareDepth(neighborhood.z, result.z));\n result = mix(result, vec3( 1.0, 1.0, neighborhood.w), compareDepth(neighborhood.w, result.z));\n return (uv + result.xy * k);\n}\nvec4 ClipToAABB(vec4 color, vec3 minimum, vec3 maximum)\n{\n vec3 center = 0.5 * (maximum + minimum);\n vec3 extents = 0.5 * (maximum - minimum);\n vec3 offset = color.rgb - center;\n vec3 ts = abs(extents / (offset + 0.0001));\n float t = clamp(min(min(ts.x, ts.y), ts.z), 0.0, 1.0);\n color.rgb = center + offset * t;\n return color;\n}\nvoid main()\n{\n vec2 closest = GetClosestFragment(v_Texcoord);\n vec4 motionTexel = texture2D(velocityTex, closest);\n if (still) {\n gl_FragColor = mix(texture2D(currTex, v_Texcoord), texture2D(prevTex, v_Texcoord), 0.9);\n return;\n }\n if (motionTexel.a < 0.1) {\n gl_FragColor = texture2D(currTex, v_Texcoord);\n return;\n }\n vec2 motion = motionTexel.rg - 0.5;\n vec2 k = texelSize.xy;\n vec2 uv = v_Texcoord;\n vec4 color = texture2D(currTex, uv);\n vec4 topLeft = texture2D(currTex, uv - k * 0.5);\n vec4 bottomRight = texture2D(currTex, uv + k * 0.5);\n vec4 corners = 4.0 * (topLeft + bottomRight) - 2.0 * color;\n color += (color - (corners * 0.166667)) * 2.718282 * sharpness;\n color = clamp(color, 0.0, 10000.0);\n vec4 average = (corners + color) * 0.142857;\n vec4 history = texture2D(prevTex, v_Texcoord - motion);\n float motionLength = length(motion);\n vec2 luma = vec2(Luminance(average), Luminance(color));\n float nudge = mix(4.0, 0.25, clamp(motionLength * 100.0, 0.0, 1.0)) * abs(luma.x - luma.y);\n vec4 minimum = min(bottomRight, topLeft) - nudge;\n vec4 maximum = max(topLeft, bottomRight) + nudge;\n history = ClipToAABB(history, minimum.xyz, maximum.xyz);\n float weight = clamp(\n mix(stillBlending, motionBlending, motionLength * motionAmplification),\n motionBlending, stillBlending\n );\n color = mix(color, history, weight);\n color = clamp(color, 0.0, 10000.0);\n gl_FragColor = color;\n}\n@end";

// Temporal Super Sample for static Scene
var Pass$2 = claygl.compositor.Pass;

claygl.Shader.import(TAAGLSLCode);

function TemporalSuperSampling (opt) {
    opt = opt || {};
    var haltonSequence = [];

    for (var i = 0; i < 30; i++) {
        haltonSequence.push([
            halton(i, 2), halton(i, 3)
        ]);
    }

    this._haltonSequence = haltonSequence;

    this._frame = 0;

    this._sourceTex = new claygl.Texture2D();
    this._sourceFb = new claygl.FrameBuffer();
    this._sourceFb.attach(this._sourceTex);

    // Frame texture before temporal supersampling
    this._prevFrameTex = new claygl.Texture2D();
    this._outputTex = new claygl.Texture2D();

    var taaPass = this._taaPass = new Pass$2({
        fragment: claygl.Shader.source('car.taa')
    });
    // taaPass.setUniform('depthTex', opt.depthTexture);

    this._velocityTex = opt.velocityTexture;

    this._depthTex = opt.depthTexture;

    this._taaFb = new claygl.FrameBuffer({
        depthBuffer: false
    });

    this._outputPass = new Pass$2({
        fragment: claygl.Shader.source('clay.compositor.output'),
        // TODO, alpha is premultiplied?
        blendWithPrevious: true
    });
    this._outputPass.material.define('fragment', 'OUTPUT_ALPHA');
    this._outputPass.material.blend = function (_gl) {
        // FIXME.
        // Output is premultiplied alpha when BLEND is enabled ?
        // http://stackoverflow.com/questions/2171085/opengl-blending-with-previous-contents-of-framebuffer
        _gl.blendEquationSeparate(_gl.FUNC_ADD, _gl.FUNC_ADD);
        _gl.blendFuncSeparate(_gl.ONE, _gl.ONE_MINUS_SRC_ALPHA, _gl.ONE, _gl.ONE_MINUS_SRC_ALPHA);
    };
}

TemporalSuperSampling.prototype = {

    constructor: TemporalSuperSampling,

    /**
     * Jitter camera projectionMatrix
     * @parma {clay.Renderer} renderer
     * @param {clay.Camera} camera
     */
    jitterProjection: function (renderer, camera) {
        var offset = this._haltonSequence[this._frame % this._haltonSequence.length];
        var viewport = renderer.viewport;
        var dpr = viewport.devicePixelRatio || renderer.getDevicePixelRatio();
        var width = viewport.width * dpr;
        var height = viewport.height * dpr;

        var translationMat = new claygl.Matrix4();
        translationMat.array[12] = (offset[0] * 2.0 - 1.0) / width;
        translationMat.array[13] = (offset[1] * 2.0 - 1.0) / height;

        claygl.Matrix4.mul(camera.projectionMatrix, translationMat, camera.projectionMatrix);

        claygl.Matrix4.invert(camera.invProjectionMatrix, camera.projectionMatrix);
    },

    getJitterOffset: function (renderer) {
        var offset = this._haltonSequence[this._frame % this._haltonSequence.length];
        var viewport = renderer.viewport;
        var dpr = viewport.devicePixelRatio || renderer.getDevicePixelRatio();
        var width = viewport.width * dpr;
        var height = viewport.height * dpr;

        return [
            offset[0] / width,
            offset[1] / height
        ];
    },

    /**
     * Reset accumulating frame
     */
    resetFrame: function () {
        this._frame = 0;
    },

    /**
     * Return current frame
     */
    getFrame: function () {
        return this._frame;
    },

    /**
     * Get source framebuffer for usage
     */
    getSourceFrameBuffer: function () {
        return this._sourceFb;
    },

    resize: function (width, height) {
        if (this._sourceTex.width !== width || this._sourceTex.height !== height) {

            this._prevFrameTex.width = width;
            this._prevFrameTex.height = height;

            this._outputTex.width = width;
            this._outputTex.height = height;

            this._sourceTex.width = width;
            this._sourceTex.height = height;

            this._prevFrameTex.dirty();
            this._outputTex.dirty();
            this._sourceTex.dirty();
        }
    },

    isFinished: function () {
        return this._frame >= this._haltonSequence.length;
    },

    render: function (renderer, camera, still) {
        var taaPass = this._taaPass;
        // if (this._frame === 0) {
        //     // Direct output
        //     taaPass.setUniform('weight1', 0);
        //     taaPass.setUniform('weight2', 1);
        // }
        // else {
        // taaPass.setUniform('weight1', 0.9);
        // taaPass.setUniform('weight2', 0.1);
        // }
        taaPass.setUniform('jitterOffset', this.getJitterOffset(renderer));
        taaPass.setUniform('velocityTex', this._velocityTex);
        taaPass.setUniform('prevTex', this._prevFrameTex);
        taaPass.setUniform('currTex', this._sourceTex);
        taaPass.setUniform('texelSize', [1 / this._sourceTex.width, 1 / this._sourceTex.height]);
        taaPass.setUniform('velocityTexelSize', [1 / this._depthTex.width, 1 / this._depthTex.height]);
        // taaPass.setUniform('sinTime', Math.sin(+(new Date()) / 8));
        // taaPass.setUniform('projection', camera.projectionMatrix.array);

        taaPass.setUniform('still', !!still);

        this._taaFb.attach(this._outputTex);
        this._taaFb.bind(renderer);
        taaPass.render(renderer);
        this._taaFb.unbind(renderer);

        this._outputPass.setUniform('texture', this._outputTex);
        this._outputPass.render(renderer);

        // Swap texture
        var tmp = this._prevFrameTex;
        this._prevFrameTex = this._outputTex;
        this._outputTex = tmp;

        this._frame++;
    },

    dispose: function (renderer) {
        this._sourceFb.dispose(renderer);
        this._taaFb.dispose(renderer);
        this._prevFrameTex.dispose(renderer);
        this._outputTex.dispose(renderer);
        this._sourceTex.dispose(renderer);
        this._outputPass.dispose(renderer);
        this._taaPass.dispose(renderer);
    }
};

var ShadowMapPass = claygl.prePass.ShadowMap;

function RenderMain(renderer, scene, enableShadow) {

    this.renderer = renderer;
    this.scene = scene;

    this.preZ = false;

    this._compositor = new EffectCompositor();

    this._temporalSS = new TemporalSuperSampling({
        velocityTexture: this._compositor.getVelocityTexture(),
        depthTexture: this._compositor.getDepthTexture()
    });

    if (enableShadow) {
        this._shadowMapPass = new ShadowMapPass({
            lightFrustumBias: 20
        });
    }

    this._enableTemporalSS = 'auto';

    scene.on('beforerender', function (renderer, scene, camera) {
        if (this.needsTemporalSS()) {
            this._temporalSS.jitterProjection(renderer, camera);
        }
    }, this);
}

/**
 * Cast a ray
 * @param {number} x offsetX
 * @param {number} y offsetY
 * @param {clay.math.Ray} out
 * @return {clay.math.Ray}
 */
var ndc = new claygl.Vector2();
RenderMain.prototype.castRay = function (x, y, out) {
    var renderer = this.layer.renderer;

    var oldViewport = renderer.viewport;
    renderer.viewport = this.viewport;
    renderer.screenToNDC(x, y, ndc);
    this.camera.castRay(ndc, out);
    renderer.viewport = oldViewport;

    return out;
};

/**
 * Prepare and update scene before render
 */
RenderMain.prototype.prepareRender = function () {
    var scene = this.scene;
    var camera = scene.getMainCamera();
    var renderer = this.renderer;

    camera.aspect = renderer.getViewportAspect();

    scene.update();
    scene.updateLights();
    var renderList = scene.updateRenderList(camera);

    this._updateSRGBOfList(renderList.opaque);
    this._updateSRGBOfList(renderList.transparent);

    this._frame = 0;
    if (!this._temporalSupportDynamic) {
        this._temporalSS.resetFrame();
    }

    var lights = scene.getLights();
    for (var i = 0; i < lights.length; i++) {
        if (lights[i].cubemap) {
            if (this._compositor && this._compositor.isSSREnabled()) {
                lights[i].invisible = true;
            }
            else {
                lights[i].invisible = false;
            }
        }
    }

    if (this._enablePostEffect) {
        this._compositor.resize(renderer.getWidth(), renderer.getHeight(), renderer.getDevicePixelRatio());
        this._temporalSS.resize(renderer.getWidth(), renderer.getHeight());
    }
};

RenderMain.prototype.render = function (accumulating) {
    var scene = this.scene;
    var camera = scene.getMainCamera();
    this._doRender(scene, camera, accumulating, this._frame);
    this._frame++;
};

RenderMain.prototype.needsAccumulate = function () {
    return this.needsTemporalSS();
};

RenderMain.prototype.needsTemporalSS = function () {
    var enableTemporalSS = this._enableTemporalSS;
    if (enableTemporalSS === 'auto') {
        enableTemporalSS = this._enablePostEffect;
    }
    return enableTemporalSS;
};

RenderMain.prototype.hasDOF = function () {
    return this._enableDOF;
};

RenderMain.prototype.isAccumulateFinished = function () {
    var frame = this._frame;
    return !(this.needsTemporalSS() && !this._temporalSS.isFinished(frame))
        && !(this._compositor && !this._compositor.isSSAOFinished(frame))
        && !(this._compositor && !this._compositor.isSSRFinished(frame))
        && !(this._compositor && frame < 30);
};

RenderMain.prototype._doRender = function (scene, camera, accumulating, accumFrame) {

    var renderer = this.renderer;

    accumFrame = accumFrame || 0;

    if (!accumulating && this._shadowMapPass) {
        this._shadowMapPass.kernelPCF = this._pcfKernels[0];
        // Not render shadowmap pass in accumulating frame.
        this._shadowMapPass.render(renderer, scene, camera, true);
    }

    this._updateShadowPCFKernel(scene, camera, accumFrame);

    // Shadowmap will set clearColor.
    renderer.gl.clearColor(0.0, 0.0, 0.0, 0.0);

    if (this._enablePostEffect) {
        // normal render also needs to be jittered when have edge pass.
        if (this.needsTemporalSS()) {
            this._temporalSS.jitterProjection(renderer, camera);
        }
        this._compositor.updateGBuffer(renderer, scene, camera, this._temporalSS.getFrame());
    }

    // Always update SSAO to make sure have correct ssaoMap status
    // TODO TRANSPARENT OBJECTS.
    this._updateSSAO(renderer, scene, camera, this._temporalSS.getFrame());

    var frameBuffer;
    if (this._enablePostEffect) {

        frameBuffer = this._compositor.getSourceFrameBuffer();
        frameBuffer.bind(renderer);
        renderer.gl.clear(renderer.gl.DEPTH_BUFFER_BIT | renderer.gl.COLOR_BUFFER_BIT);
        // FIXME Enable pre z will make alpha test failed
        renderer.render(scene, camera, true, this.preZ);
        this.afterRenderScene(renderer, scene, camera);
        frameBuffer.unbind(renderer);

        if (this.needsTemporalSS() && (this._temporalSupportDynamic || accumulating)) {
            this._compositor.composite(renderer, scene, camera, this._temporalSS.getSourceFrameBuffer(), this._temporalSS.getFrame(), accumulating);
            this._temporalSS.render(renderer, camera, accumulating);
        }
        else {
            this._compositor.composite(renderer, scene, camera, null, 0);
        }
    }
    else {
        if (this.needsTemporalSS() && (this._temporalSupportDynamic || accumulating)) {
            frameBuffer = this._temporalSS.getSourceFrameBuffer();
            frameBuffer.bind(renderer);
            renderer.saveClear();
            renderer.clearBit = renderer.gl.DEPTH_BUFFER_BIT | renderer.gl.COLOR_BUFFER_BIT;
            renderer.render(scene, camera, true, this.preZ);
            this.afterRenderScene(renderer, scene, camera);
            renderer.restoreClear();
            frameBuffer.unbind(renderer);
            this._temporalSS.render(renderer, camera, accumulating);
        }
        else {
            renderer.render(scene, camera, true, this.preZ);
            this.afterRenderScene(renderer, scene, camera);
        }
    }

    this.afterRenderAll(renderer, scene, camera);
};

RenderMain.prototype._updateSRGBOfList = function (list) {
    var isLinearSpace = this.isLinearSpace();
    for (var i = 0; i < list.length; i++) {
        list[i].material[isLinearSpace ? 'define' : 'undefine']('fragment', 'SRGB_DECODE');
    }
};

RenderMain.prototype.afterRenderScene = function (renderer, scene, camera) {};
RenderMain.prototype.afterRenderAll = function (renderer, scene, camera) {};

RenderMain.prototype._updateSSAO = function (renderer, scene, camera, frame) {
    var ifEnableSSAO = this._enableSSAO && this._enablePostEffect;
    var compositor$$1 = this._compositor;
    if (ifEnableSSAO) {
        this._compositor.updateSSAO(renderer, scene, camera, this._temporalSS.getFrame());
    }

    function updateQueue(queue) {
        for (var i = 0; i < queue.length; i++) {
            var renderable = queue[i];
            renderable.material[ifEnableSSAO ? 'enableTexture' : 'disableTexture']('ssaoMap');
            if (ifEnableSSAO) {
                renderable.material.set('ssaoMap', compositor$$1.getSSAOTexture());
            }
        }
    }
    updateQueue(scene.getRenderList(camera).opaque);
    updateQueue(scene.getRenderList(camera).transparent);
};

RenderMain.prototype._updateShadowPCFKernel = function (scene, camera, frame) {
    var pcfKernel = this._pcfKernels[frame % this._pcfKernels.length];
    function updateQueue(queue) {
        for (var i = 0; i < queue.length; i++) {
            if (queue[i].receiveShadow) {
                queue[i].material.set('pcfKernel', pcfKernel);
                if (queue[i].material) {
                    queue[i].material.define('fragment', 'PCF_KERNEL_SIZE', pcfKernel.length / 2);
                }
            }
        }
    }
    updateQueue(scene.getRenderList(camera).opaque);
    updateQueue(scene.getRenderList(camera).transparent);
};

RenderMain.prototype.dispose = function () {
    var renderer = this.renderer;
    this._compositor.dispose(renderer);
    this._temporalSS.dispose(renderer);
    if (this._shadowMapPass) {
        this._shadowMapPass.dispose(renderer);
    }
    renderer.dispose();
};

RenderMain.prototype.setPostEffect = function (opts, api) {
    var compositor$$1 = this._compositor;
    opts = opts || {};
    this._enablePostEffect = !!opts.enable;
    var bloomOpts = opts.bloom || {};
    var edgeOpts = opts.edge || {};
    var dofOpts = opts.depthOfField || {};
    var ssaoOpts = opts.screenSpaceAmbientOcclusion || {};
    var ssrOpts = opts.screenSpaceReflection || {};
    var fxaaOpts = opts.FXAA || {};
    var colorCorrOpts = opts.colorCorrection || {};
    bloomOpts.enable ? compositor$$1.enableBloom() : compositor$$1.disableBloom();
    dofOpts.enable ? compositor$$1.enableDOF() : compositor$$1.disableDOF();
    ssrOpts.enable ? compositor$$1.enableSSR() : compositor$$1.disableSSR();
    colorCorrOpts.enable ? compositor$$1.enableColorCorrection() : compositor$$1.disableColorCorrection();
    edgeOpts.enable ? compositor$$1.enableEdge() : compositor$$1.disableEdge();
    fxaaOpts.enable ? compositor$$1.enableFXAA() : compositor$$1.disableFXAA();

    this._enableDOF = dofOpts.enable;
    this._enableSSAO = ssaoOpts.enable;

    this._enableSSAO ? compositor$$1.enableSSAO() : compositor$$1.disableSSAO();

    compositor$$1.setBloomIntensity(bloomOpts.intensity);
    compositor$$1.setEdgeColor(edgeOpts.color);
    compositor$$1.setColorLookupTexture(colorCorrOpts.lookupTexture, api);
    compositor$$1.setExposure(colorCorrOpts.exposure);

    ['radius', 'quality', 'intensity', 'temporalFilter'].forEach(function (name) {
        compositor$$1.setSSAOParameter(name, ssaoOpts[name]);
    });
    ['quality', 'maxRoughness', 'physical'].forEach(function (name) {
        compositor$$1.setSSRParameter(name, ssrOpts[name]);
    });
    ['quality', 'focalDistance', 'focalRange', 'blurRadius', 'aperture'].forEach(function (name) {
        compositor$$1.setDOFParameter(name, dofOpts[name]);
    });
    ['brightness', 'contrast', 'saturation'].forEach(function (name) {
        compositor$$1.setColorCorrection(name, colorCorrOpts[name]);
    });
};

RenderMain.prototype.setShadow = function (opts) {
    var pcfKernels = [];
    var off = 0;
    for (var i = 0; i < 30; i++) {
        var pcfKernel = [];
        for (var k = 0; k < opts.kernelSize; k++) {
            pcfKernel.push((halton(off, 2) * 2.0 - 1.0) * opts.blurSize);
            pcfKernel.push((halton(off, 3) * 2.0 - 1.0) * opts.blurSize);
            off++;
        }
        pcfKernels.push(pcfKernel);
    }
    this._pcfKernels = pcfKernels;
};

RenderMain.prototype.isDOFEnabled = function () {
    return this._enablePostEffect && this._enableDOF;
};

RenderMain.prototype.setDOFFocusOnPoint = function (depth) {
    if (this._enablePostEffect) {

        if (depth > this.camera.far || depth < this.camera.near) {
            return;
        }

        this._compositor.setDOFParameter('focalDistance', depth);
        return true;
    }
};

RenderMain.prototype.setTemporalSuperSampling = function (temporalSuperSamplingOpt) {
    temporalSuperSamplingOpt = temporalSuperSamplingOpt || {};
    this._enableTemporalSS = temporalSuperSamplingOpt.enable;
    this._temporalSupportDynamic = temporalSuperSamplingOpt.dynamic;

    if (this._enableTemporalSS && this._temporalSupportDynamic) {
        this._compositor.enableVelocityBuffer();
    }
    else {
        this._compositor.disableVelocityBuffer();
    }
};

RenderMain.prototype.isLinearSpace = function () {
    return this._enablePostEffect;
};

var defaultGraphicConfig = {
    // If enable shadow
    shadow: {
        enable: true,
        kernelSize: 6,
        blurSize: 2
    },

    temporalSuperSampling: {
        // If support dynamic scene
        dynamic: true,
        enable: 'auto'
    },

    // Configuration about post effects.
    postEffect: {
        // If enable post effects.
        enable: true,
        // Configuration about bloom post effect
        bloom: {
            // If enable bloom
            enable: true,
            // Intensity of bloom
            intensity: 0.1
        },
        // Configuration about depth of field
        depthOfField: {
            enable: false,
            // Focal distance of camera in word space.
            focalDistance: 5,
            // Focal range of camera in word space. in this range image will be absolutely sharp.
            focalRange: 1,
            // Max out of focus blur radius.
            blurRadius: 5,
            // fstop of camera. Smaller fstop will have shallow depth of field
            aperture: 5.6,
            // Blur quality. 'low'|'medium'|'high'|'ultra'
            quality: 'medium'
        },
        // Configuration about screen space ambient occulusion
        screenSpaceAmbientOcclusion: {
            // If enable SSAO
            enable: false,
            // Sampling radius in work space.
            // Larger will produce more soft concat shadow.
            // But also needs higher quality or it will have more obvious artifacts
            radius: 0.2,
            // Quality of SSAO. 'low'|'medium'|'high'|'ultra'
            quality: 'medium',
            // Intensity of SSAO
            intensity: 1,
            temporalFilter: false
        },
        // Configuration about screen space reflection
        screenSpaceReflection: {
            enable: false,
            // If physically corrected.
            physical: false,
            // Quality of SSR. 'low'|'medium'|'high'|'ultra'
            quality: 'medium',
            // Surface with less roughness will have reflection.
            maxRoughness: 0.8
        },
        // Configuration about color correction
        colorCorrection: {
            // If enable color correction
            enable: true,
            exposure: 0,
            brightness: 0,
            contrast: 1,
            saturation: 1,
            // Lookup texture for color correction.
            // See https://ecomfe.github.io/echarts-doc/public/cn/option-gl.html#globe.postEffect.colorCorrection.lookupTexture
            lookupTexture: ''
        },
        FXAA: {
            // If enable FXAA
            enable: false
        }
    }
};

/**
 * @module zrender/core/util
 */

// 用于处理merge时无法遍历Date等对象的问题
var BUILTIN_OBJECT = {
    '[object Function]': 1,
    '[object RegExp]': 1,
    '[object Date]': 1,
    '[object Error]': 1,
    '[object CanvasGradient]': 1,
    '[object CanvasPattern]': 1,
    // For node-canvas
    '[object Image]': 1,
    '[object Canvas]': 1
};

var TYPED_ARRAY = {
    '[object Int8Array]': 1,
    '[object Uint8Array]': 1,
    '[object Uint8ClampedArray]': 1,
    '[object Int16Array]': 1,
    '[object Uint16Array]': 1,
    '[object Int32Array]': 1,
    '[object Uint32Array]': 1,
    '[object Float32Array]': 1,
    '[object Float64Array]': 1
};

var objToString = Object.prototype.toString;



/**
 * Those data types can be cloned:
 *     Plain object, Array, TypedArray, number, string, null, undefined.
 * Those data types will be assgined using the orginal data:
 *     BUILTIN_OBJECT
 * Instance of user defined class will be cloned to a plain object, without
 * properties in prototype.
 * Other data types is not supported (not sure what will happen).
 *
 * Caution: do not support clone Date, for performance consideration.
 * (There might be a large number of date in `series.data`).
 * So date should not be modified in and out of echarts.
 *
 * @param {*} source
 * @return {*} new
 */
function clone(source) {
    if (source == null || typeof source != 'object') {
        return source;
    }

    var result = source;
    var typeStr = objToString.call(source);

    if (typeStr === '[object Array]') {
        if (!isPrimitive(source)) {
            result = [];
            for (var i = 0, len = source.length; i < len; i++) {
                result[i] = clone(source[i]);
            }
        }
    }
    else if (TYPED_ARRAY[typeStr]) {
        if (!isPrimitive(source)) {
            var Ctor = source.constructor;
            if (source.constructor.from) {
                result = Ctor.from(source);
            }
            else {
                result = new Ctor(source.length);
                for (var i = 0, len = source.length; i < len; i++) {
                    result[i] = clone(source[i]);
                }
            }
        }
    }
    else if (!BUILTIN_OBJECT[typeStr] && !isPrimitive(source) && !isDom(source)) {
        result = {};
        for (var key in source) {
            if (source.hasOwnProperty(key)) {
                result[key] = clone(source[key]);
            }
        }
    }

    return result;
}

/**
 * @memberOf module:zrender/core/util
 * @param {*} target
 * @param {*} source
 * @param {boolean} [overwrite=false]
 */
function merge(target, source, overwrite) {
    // We should escapse that source is string
    // and enter for ... in ...
    if (!isObject(source) || !isObject(target)) {
        return overwrite ? clone(source) : target;
    }

    for (var key in source) {
        if (source.hasOwnProperty(key)) {
            var targetProp = target[key];
            var sourceProp = source[key];

            if (isObject(sourceProp)
                && isObject(targetProp)
                && !isArray(sourceProp)
                && !isArray(targetProp)
                && !isDom(sourceProp)
                && !isDom(targetProp)
                && !isBuiltInObject(sourceProp)
                && !isBuiltInObject(targetProp)
                && !isPrimitive(sourceProp)
                && !isPrimitive(targetProp)
            ) {
                // 如果需要递归覆盖，就递归调用merge
                merge(targetProp, sourceProp, overwrite);
            }
            else if (overwrite || !(key in target)) {
                // 否则只处理overwrite为true，或者在目标对象中没有此属性的情况
                // NOTE，在 target[key] 不存在的时候也是直接覆盖
                target[key] = clone(source[key], true);
            }
        }
    }

    return target;
}

/**
 * @param {Array} targetAndSources The first item is target, and the rests are source.
 * @param {boolean} [overwrite=false]
 * @return {*} target
 */


/**
 * @param {*} target
 * @param {*} source
 * @memberOf module:zrender/core/util
 */


/**
 * @param {*} target
 * @param {*} source
 * @param {boolean} [overlay=false]
 * @memberOf module:zrender/core/util
 */






/**
 * 查询数组中元素的index
 * @memberOf module:zrender/core/util
 */


/**
 * 构造类继承关系
 *
 * @memberOf module:zrender/core/util
 * @param {Function} clazz 源类
 * @param {Function} baseClazz 基类
 */


/**
 * @memberOf module:zrender/core/util
 * @param {Object|Function} target
 * @param {Object|Function} sorce
 * @param {boolean} overlay
 */


/**
 * Consider typed array.
 * @param {Array|TypedArray} data
 */


/**
 * 数组或对象遍历
 * @memberOf module:zrender/core/util
 * @param {Object|Array} obj
 * @param {Function} cb
 * @param {*} [context]
 */


/**
 * 数组映射
 * @memberOf module:zrender/core/util
 * @param {Array} obj
 * @param {Function} cb
 * @param {*} [context]
 * @return {Array}
 */


/**
 * @memberOf module:zrender/core/util
 * @param {Array} obj
 * @param {Function} cb
 * @param {Object} [memo]
 * @param {*} [context]
 * @return {Array}
 */


/**
 * 数组过滤
 * @memberOf module:zrender/core/util
 * @param {Array} obj
 * @param {Function} cb
 * @param {*} [context]
 * @return {Array}
 */


/**
 * 数组项查找
 * @memberOf module:zrender/core/util
 * @param {Array} obj
 * @param {Function} cb
 * @param {*} [context]
 * @return {*}
 */


/**
 * @memberOf module:zrender/core/util
 * @param {Function} func
 * @param {*} context
 * @return {Function}
 */


/**
 * @memberOf module:zrender/core/util
 * @param {Function} func
 * @return {Function}
 */


/**
 * @memberOf module:zrender/core/util
 * @param {*} value
 * @return {boolean}
 */
function isArray(value) {
    return objToString.call(value) === '[object Array]';
}

/**
 * @memberOf module:zrender/core/util
 * @param {*} value
 * @return {boolean}
 */


/**
 * @memberOf module:zrender/core/util
 * @param {*} value
 * @return {boolean}
 */


/**
 * @memberOf module:zrender/core/util
 * @param {*} value
 * @return {boolean}
 */
function isObject(value) {
    // Avoid a V8 JIT bug in Chrome 19-20.
    // See https://code.google.com/p/v8/issues/detail?id=2291 for more details.
    var type = typeof value;
    return type === 'function' || (!!value && type == 'object');
}

/**
 * @memberOf module:zrender/core/util
 * @param {*} value
 * @return {boolean}
 */
function isBuiltInObject(value) {
    return !!BUILTIN_OBJECT[objToString.call(value)];
}

/**
 * @memberOf module:zrender/core/util
 * @param {*} value
 * @return {boolean}
 */


/**
 * @memberOf module:zrender/core/util
 * @param {*} value
 * @return {boolean}
 */
function isDom(value) {
    return typeof value === 'object'
        && typeof value.nodeType === 'number'
        && typeof value.ownerDocument === 'object';
}

/**
 * Whether is exactly NaN. Notice isNaN('a') returns true.
 * @param {*} value
 * @return {boolean}
 */


/**
 * If value1 is not null, then return value1, otherwise judget rest of values.
 * Low performance.
 * @memberOf module:zrender/core/util
 * @return {*} Final value
 */






/**
 * @memberOf module:zrender/core/util
 * @param {Array} arr
 * @param {number} startIndex
 * @param {number} endIndex
 * @return {Array}
 */


/**
 * Normalize css liked array configuration
 * e.g.
 *  3 => [3, 3, 3, 3]
 *  [4, 2] => [4, 2, 4, 2]
 *  [4, 3, 2] => [4, 3, 2, 3]
 * @param {number|Array.<number>} val
 * @return {Array.<number>}
 */


/**
 * @memberOf module:zrender/core/util
 * @param {boolean} condition
 * @param {string} message
 */


/**
 * @memberOf module:zrender/core/util
 * @param {string} str string to be trimed
 * @return {string} trimed string
 */


var primitiveKey = '__ec_primitive__';
/**
 * Set an object as primitive to be ignored traversing children in clone or merge
 */


function isPrimitive(obj) {
    return obj[primitiveKey];
}

function ClayAdvancedRenderer(renderer, scene, timeline, graphicOpts) {
    graphicOpts = merge({}, graphicOpts);
    if (typeof graphicOpts.shadow === 'boolean') {
        graphicOpts.shadow = {
            enable: graphicOpts.shadow
        };
    }
    graphicOpts = merge(graphicOpts, defaultGraphicConfig);

    this._renderMain = new RenderMain(renderer, scene, graphicOpts.shadow);

    this._renderMain.setShadow(graphicOpts.shadow);
    this._renderMain.setPostEffect(graphicOpts.postEffect);
    this._renderMain.setTemporalSuperSampling(graphicOpts.temporalSuperSampling);

    this._needsRefresh = false;

    this._graphicOpts = graphicOpts;

    timeline.on('frame', this._loop, this);
}

ClayAdvancedRenderer.prototype.render = function (renderImmediately) {
    this._needsRefresh = true;
};

ClayAdvancedRenderer.prototype.setPostEffect = function (opts) {
    merge(this._graphicOpts.postEffect, opts, true);
    this._renderMain.setPostEffect(this._graphicOpts.postEffect);
};

ClayAdvancedRenderer.prototype.setShadow = function (opts) {
    merge(this._graphicOpts.shadow, opts, true);
    this._renderMain.setShadow(this._graphicOpts.shadow);
};

ClayAdvancedRenderer.prototype._loop = function (frameTime) {
    if (this._disposed) {
        return;
    }
    if (!this._needsRefresh) {
        return;
    }

    this._needsRefresh = false;

    this._renderMain.prepareRender();
    this._renderMain.render();

    this._startAccumulating();
};

var accumulatingId = 1;
ClayAdvancedRenderer.prototype._stopAccumulating = function () {
    this._accumulatingId = 0;
    clearTimeout(this._accumulatingTimeout);
};

ClayAdvancedRenderer.prototype._startAccumulating = function (immediate) {
    var self = this;
    this._stopAccumulating();

    var needsAccumulate = self._renderMain.needsAccumulate();
    if (!needsAccumulate) {
        return;
    }

    function accumulate(id) {
        if (!self._accumulatingId || id !== self._accumulatingId || self._disposed) {
            return;
        }

        var isFinished = self._renderMain.isAccumulateFinished() && needsAccumulate;

        if (!isFinished) {
            self._renderMain.render(true);

            if (immediate) {
                accumulate(id);
            }
            else {
                requestAnimationFrame(function () {
                    accumulate(id);
                });
            }
        }
    }

    this._accumulatingId = accumulatingId++;

    if (immediate) {
        accumulate(self._accumulatingId);
    }
    else {
        this._accumulatingTimeout = setTimeout(function () {
            accumulate(self._accumulatingId);
        }, 50);
    }
};

ClayAdvancedRenderer.prototype.dispose = function () {
    this._disposed = true;

    this._renderMain.dispose();
};

ClayAdvancedRenderer.version = '0.1.1';

return ClayAdvancedRenderer;

})));
