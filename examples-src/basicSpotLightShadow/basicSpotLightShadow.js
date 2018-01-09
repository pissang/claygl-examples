var app = clay.application.create('#viewport', {

    graphic: {
        shadow: true
    },

    init: function (app) {

        // Set a black background color
        app.renderer.clearColor = [0, 0, 0, 1];

        // Create camera
        this._camera = app.createCamera([2, 2, 2], [0, 0, 0]);

        // Create light
        var spotlight = app.createSpotLight([-2, 1, 3], [0, 0, 0], 10, '#fff', 2);
        // Increase the resolution of shadow map
        spotlight.shadowResolution = 1024;

        // Use orbit control
        this._control = new clay.plugin.OrbitControl({
            // The target or orbit control. Usually is a camera.
            target: this._camera,
            // The HTMLDomElement where we need to addEventListener.
            domElement: app.container
        });

        // Load boombox model. return a load promise to make sure the look will be start after model loaded.
        return app.loadModel('../assets/models/BasicScene/scene.gltf', {
            // Need to change the up axis from z axis to y axis, which is used in ClayGL, or other WebGL apps.
            upAxis: 'z'
        });
    },

    loop: function (app) {
        // Control status must be updated each frame.
        this._control.update(app.frameTime);
    }
});