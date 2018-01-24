var app = clay.application.create('#viewport', {

    graphic: {
        shadow: true,

        // Enable tonemapping
        tonemapping: true,

        // Use linear color space instead of default sRGB.
        linear: true
    },

    init: function (app) {
        // Create camera
        this._camera = app.createCamera([2, 1, -2.6], [0, 0, 0]);

        // Create light
        app.createDirectionalLight([-1, -1, -1]);

        // Use orbit control
        this._control = new clay.plugin.OrbitControl({
            // The target or orbit control. Usually is a camera.
            target: this._camera,
            // The HTMLDomElement where we need to addEventListener.
            domElement: app.container
        });

        app.createAmbientCubemapLight('../assets/textures/hdr/pisa.hdr', 1, 1);

        // Load model. return a load promise to make sure the look will be start after model loaded.
        return app.loadModel('../assets/models/DamagedHelmet/DamagedHelmet.gltf');
    },

    loop: function (app) {
        // Control status must be updated each frame.
        this._control.update(app.frameTime);
    }
});