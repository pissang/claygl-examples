var TRIANGLE_POSITIONS = [
    [-0.5, -0.5, 0],
    [0.5, -0.5, 0],
    [0, 0.5, 0]
];

var app = clay.application.create('#viewport', {
    init: function (app) {
        // Create a orthographic camera
        var camera = app.createCamera(null, null, 'orthographic');
        // Create a empty geometry and set the triangle vertices
        var geometry = new clay.StaticGeometry();
        geometry.attributes.position.fromArray(TRIANGLE_POSITIONS);

        var mesh = app.createMesh(geometry, {
            // Use basic shader that only show color
            shader: 'clay.basic'
        });
        mesh.material.set('color', 'blue');
    },

    loop: function () {}
});