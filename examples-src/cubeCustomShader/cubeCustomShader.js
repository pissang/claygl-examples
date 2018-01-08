// Shader in ClayGL use semantics like `POSITION`, `NORMAL`, `WORLDVIEWPROJECTION` to indicate
// what the attributes/uniform is and tells the application how to set the data.

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
        var camera = app.createCamera(null, null, 'orthographic');
        // Create a empty geometry and set the triangle vertices
        var cube = app.createCube(1, {
            shader: new clay.Shader(vertexShader, fragmentShader)
        });
    },

    loop: function () {}
});