var app = clay.application.create('#viewport', {
    init: function (app) {
        // Create camera
        this._camera = app.createCamera([0, 1, 3], [0, 0, 0]);

        // Create light
        app.createDirectionalLight([-1, -1, -1]);

        // Use orbit control
        this._control = new clay.plugin.OrbitControl({
            target: this._camera,
            domElement: app.container
        });

        // Load boombox model. return a load promise to make sure the look will be start after model loaded.
        return app.loadModel('../assets/models/suzanne/suzanne.gltf');
    },

    loop: function (app) {
        this._control.update(app.frameTime);
    }
});