var app = clay.application.create('#viewport', {

    init: function (app) {
        // Create a perspective camera.
        this._camera = app.createCamera([0, 2, 5], [0, 0, 0]);

        // Create a white directional light.
        app.createDirectionalLight([-1, -2, -1], '#fff', 1);

        // Create a ground with plane
        var groundPlane = app.createPlane();
        // Scale the plane to 10x10 on x and y dimensions.
        groundPlane.scale.set(10, 10, 1);
        // Defaultly plane is facing the camera. So rotate it to face the top.
        groundPlane.rotation.rotateX(-Math.PI / 2);
        groundPlane.position.y = -1;
        groundPlane.material.set('color', '#333');

        // Create geometries

        // Create a cube
        var cube = app.createCube();
        // Create a sphere and put it on the right of the cube
        var sphere = app.createSphere();
        sphere.position.x = 3;
        // Create a cone and put it on the left of the cube.
        // createMesh is a more general method to create a mesh with any geometry and material.
        // And you can found more procedural geometry constructor under `clay.geometry`
        var cone = app.createMesh(new clay.geometry.Cone());
        cone.position.x = -3;
    },

    loop: function (app) {
        // Do nothing in loop
    }
});