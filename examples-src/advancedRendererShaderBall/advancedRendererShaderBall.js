var BALL_GAP = 3;
var BALL_COUNT = 10;
var MID_BALL = Math.floor(BALL_COUNT / 2);

var materials = [{
    diffuseMap: 'bamboo-wood-semigloss/bamboo-wood-semigloss-albedo.jpg',
    normalMap: 'bamboo-wood-semigloss/bamboo-wood-semigloss-normal.jpg',
    roughnessMap: 'bamboo-wood-semigloss/bamboo-wood-semigloss-roughness.jpg'
}, {
    diffuseMap: 'bathroomtile2/bathroomtile2-basecolor.jpg',
    normalMap: 'bathroomtile2/bathroomtile2-normal-dx.jpg',
    roughnessMap: 'bathroomtile2/bathroomtile2-roughness.jpg'
}, {
    diffuseMap: 'copper-rock1/copper-rock1-alb.jpg',
    normalMap: 'copper-rock1/copper-rock1-normal.jpg',
    parallaxOcclusionMap: 'copper-rock1/copper-rock1-height.jpg',
    metalnessMap: 'copper-rock1/copper-rock1-metal.jpg'
}, {
    diffuseMap: 'octostone/octostoneAlbedo.jpg',
    normalMap: 'octostone/octostoneNormalc.jpg',
    parallaxOcclusionMap: 'octostone/octostoneHeightc.jpg',
    metalnessMap: 'octostone/octostoneRoughness2.jpg'
}, {
    diffuseMap: 'slipperystonework/slipperystonework-albedo.jpg',
    normalMap: 'slipperystonework/slipperystonework-normal.jpg',
    parallaxOcclusionMap: 'slipperystonework/slipperystonework-height.jpg'
}, {
    diffuseMap: 'old-textured-fabric/old-textured-fabric-albedo3.jpg',
    normalMap: 'old-textured-fabric/old-textured-fabric-normal.jpg',
    roughnessMap: 'old-textured-fabric/old-textured-fabric-roughness2.jpg',
    uvRepeat: [4, 4],
    color: [0.7, 0.7, 0.7]
}, {
    diffuseMap: 'rustediron1/rustediron2_basecolor.jpg',
    metalnessMap: 'rustediron1/rustediron2_metallic.jpg',
    normalMap: 'rustediron1/rustediron2_normal.jpg'
}, {
    diffuseMap: 'waterwornstone1/waterwornstone1_Base_Color.jpg',
    normalMap: 'waterwornstone1/waterwornstone1_Normal.jpg',
    roughnessMap: 'waterwornstone1/waterwornstone1_Roughness.jpg',
    parallaxOcclusionMap: 'waterwornstone1/waterwornstone1_Height.jpg'
},
// {
//     diffuseMap: 'redbricks2b/redbricks2b.jpg',
//     normalMap: 'redbricks2b/redbricks2b-normal.jpg',
//     parallaxOcclusionMap: 'redbricks2b/redbricks2b-height4b.jpg',
//     parallaxOcclusionScale: 0.02,
//     roughness: 0.2
// }
];

function setPBRTextures(app, rootNode, materialCfg) {
    var keys = Object.keys(materialCfg).filter(function (key) {
        return typeof materialCfg[key] === 'string';
    });
    return Promise.all(keys.map(function (key) {
        return app.loadTexture('../assets/textures/pbr/' + materialCfg[key], {
            anisotropic: 8
        });
    })).then(function (textures) {
        rootNode.traverse(function (mesh) {
            if (mesh.material && (mesh.material.name === 'lambert6' || mesh.material.name === 'lambert3' || mesh.material.name === 'lambert5')) {
                for (var i = 0; i < keys.length; i++) {
                    mesh.material.set(keys[i], textures[i]);
                }
                if (materialCfg.roughnessMap) {
                    mesh.material.set('roughness', 0.5);
                }
                else {
                    mesh.material.set('roughness', materialCfg.roughness == null ? 0.5 : materialCfg.roughness);
                }
                if (materialCfg.metalnessMap) {
                    mesh.material.set('metalness', 0.5);
                }
                else {
                    mesh.material.set('metalness', materialCfg.metalness == null ? 0 : materialCfg.metalness);
                }
                materialCfg.parallaxOcclusionScale != null && mesh.material.set('parallaxOcclusionScale', materialCfg.parallaxOcclusionScale);
                materialCfg.uvRepeat != null && mesh.material.set('uvRepeat', materialCfg.uvRepeat);
                materialCfg.color != null && mesh.material.set('color', materialCfg.color);
            }
            else if (mesh.material) {
                mesh.material.set('roughness', 0.3);
                mesh.material.set('color', '#fff');
            }
        });
    });
}

var app = clay.application.create('#viewport', {

    autoRender: false,

    devicePixelRatio: 1,

    _currentTargetBall: MID_BALL,

    init: function (app) {

        app.renderer.clearColor = [0, 0, 0, 1];

        var adr = this._advancedRenderer = new ClayAdvancedRenderer(app.renderer, app.scene, app.timeline, {
            shadow: {
                enable: true
            },
            temporalSuperSampling: {
                enable: true
            },
            postEffect: {
                enable: true,
                bloom: {
                    enable: false
                },
                screenSpaceAmbientOcclusion: {
                    temporalFilter: false,
                    enable: true,
                    radius: 0.2,
                    intensity: 1.2
                },
                screenSpaceReflection: {
                    enable: true,
                    maxRoughness: 0.5
                },
                depthOfField: {
                    enable: true,
                    focalDistance: 3,
                    blurRadius: 10,
                    aperture: 2.8,
                    quality: 'medium'
                }
            }
        });

        app.createAmbientCubemapLight('../assets/textures/hdr/pisa.hdr', 0.2, 0.8, 3).then(function (result) {
            adr.render();
        });

        // Create lights
        var light = app.createDirectionalLight([-0.5, -3, -1], '#fff', 3);
        light.shadowResolution = 2048;

        this._camera = app.createCamera([-2.5, 2, 2.5], [0, 1.5, 0]);

        this._initKeyboardControl();

        this._initRoom(app);

        // this._startCameraAnimationLater(app);

        // Load model.
        return app.loadModel('../assets/models/shaderBall/shaderBall.gltf').then(function (result) {
            result.rootNode.scale.set(0.01, 0.01, 0.01);
            result.rootNode.traverse(function (mesh) {
                if (mesh.geometry) {
                    mesh.geometry.generateTangents();
                }
            });
            // Clone more node
            for (var i = 0; i < BALL_COUNT - 1; i++) {
                var clonedNode = app.cloneNode(result.rootNode);
                clonedNode.position.x = (i - MID_BALL) * BALL_GAP;
                setPBRTextures(app, clonedNode, materials[i % materials.length]);
            }
            setPBRTextures(app, result.rootNode, materials[materials.length - 1]);
            result.rootNode.position.x = (BALL_COUNT - 1 - MID_BALL) * BALL_GAP;
            adr.render();
        });

    },

    _initRoom: function (app) {
        var mat = app.createMaterial({
            diffuseMap: '../assets/textures/pbr/bathroomtile2/bathroomtile2-basecolor.jpg',
            normalMap: '../assets/textures/pbr/bathroomtile2/bathroomtile2-normal-dx.jpg',
            roughnessMap: '../assets/textures/pbr/bathroomtile2/bathroomtile2-roughness.jpg',
            uvRepeat: [15, 5],
            roughness: 0.4,
            texturesReady: function (textures) {
                textures.forEach(function (texture) {
                    texture.anisotropic = 8;
                });
            }
        });
        var ground = app.createPlane(mat);
        ground.scale.set(60, 20, 1);
        ground.rotation.rotateX(-Math.PI / 2);
        ground.castShadow = false;
        ground.geometry.generateTangents();

        var background = app.createPlane(mat);

        background.scale.set(60, 20, 1);
        background.castShadow = false;
        background.position.z = -10;
    },

    _initKeyboardControl: function () {
        var self = this;
        document.body.addEventListener('keydown', function (e) {
            switch (e.keyCode) {
                case 39:
                    self._moveCameraToRight();
                    break;
                case 37:
                    self._moveCameraToLeft();
                    break;
            }
        });
    },
    _moveCameraToRight: function () {
        this._moveCameraTo(this._currentTargetBall + 1);
    },
    _moveCameraToLeft: function () {
        this._moveCameraTo(this._currentTargetBall - 1);
    },

    _moveCameraTo: function (ballIdx) {
        if (ballIdx >= BALL_COUNT || ballIdx < 0) {
            return;
        }

        if (this._cameraAroundAnimator) {
            this._cameraAroundAnimator.stop();
        }
        if (this._cameraMoveAnimator) {
            this._cameraMoveAnimator.stop();
        }
        clearTimeout(this._startCameraAnimationTimeout);

        var targetX = (ballIdx - MID_BALL) * BALL_GAP - 2.5;
        var self = this;

        this._cameraMoveAnimator = app.timeline.animate(this._camera.position)
            .when(2000, {
                x: targetX,
                y: 2,
                z: 2.5
            })
            .during(function () {
                // self._camera.lookAt(new clay.Vector3(targetX, 1, 0), clay.Vector3.UP);
                self._advancedRenderer.render();
            })
            // .done(this._startCameraAnimationLater.bind(this, app))
            .start('cubicInOut');

        this._currentTargetBall = ballIdx;
    },

    _startCameraAnimationLater: function (app) {
        clearTimeout(this._startCameraAnimationTimeout);

        setTimeout(this._startCameraAnimation.bind(this, app), 5000);
    },

    _startCameraAnimation: function (app) {
        if (this._cameraAroundAnimator) {
            this._cameraAroundAnimator.stop();
        }
        var animator = app.timeline.animate(this._camera.position, {
            loop: true
        });
        var alpha = 0;
        var self = this;

        var targetX = (this._currentTargetBall - MID_BALL) * BALL_GAP;
        for (var i = 0; i < 5; i++) {
            var r = Math.cos(i / 2 * Math.PI) * 3 + 5;
            var x = Math.sin(alpha) * r;
            var z = Math.cos(alpha) * r;
            var y = Math.cos(i / 4 * Math.PI) * 2 + 3;
            alpha += Math.PI / 2;

            animator.then(3000, {
                x: x + targetX,
                y: y,
                z: z
            });
        }
        animator.then(2000, {
            x: this._camera.position.x,
            y: this._camera.position.y,
            z: this._camera.position.z
        }).during(function () {
            self._camera.lookAt(new clay.Vector3(targetX, 1, 0), clay.Vector3.UP);
            self._advancedRenderer.render();
        }).start('spline');

        this._cameraAroundAnimator = animator;
    },

    loop: function () {
        this._advancedRenderer.render();
    }
});