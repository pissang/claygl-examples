var app = clay.application.create('#viewport', {

    init: function (app) {

        // Create a perspective camera.
        // First parameter is the camera position. Which is in front of the cube.
        // Second parameter is the camera lookAt target. Which is the origin of the world, and where the cube puts.
        this._camera = app.createCamera([0, 2, 5], [0, 0, 0]);

        // Create a sample cube
        this._cube = app.createCube();

        // Create a directional light. The direction is from top right to left bottom, away from camera.
        this._mainLight = app.createDirectionalLight([-1, -1, -1]);
    },

    loop: function (app) {
        // Simply rotating the cube every frame.
        this._cube.rotation.rotateY(app.frameTime / 1000);
    }
});