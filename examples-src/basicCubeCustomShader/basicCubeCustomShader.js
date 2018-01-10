var vertexShader = `
attribute vec3 position: POSITION;
attribute vec3 normal: NORMAL;

uniform mat4 worldViewProjection : WORLDVIEWPROJECTION;

varying vec3 v_Normal;
void main() {
    gl_Position = worldViewProjection * vec4(position, 1.0);
    v_Normal = normal;
}
`;

var fragmentShader = `
varying vec3 v_Normal;
void main() {
    gl_FragColor = vec4(v_Normal, 1.0);
}
`;

var app = clay.application.create('#viewport', {
    init: function (app) {
        // Create a orthographic camera
        this._camera = app.createCamera([0, 2, 5], [0, 0, 0]);
        // Create a empty geometry and set the triangle vertices
        this._cube = app.createCube({
            shader: new clay.Shader(vertexShader, fragmentShader)
        });
    },

    loop: function (app) {
        this._cube.rotation.rotateY(app.frameTime / 1000);
    }
});