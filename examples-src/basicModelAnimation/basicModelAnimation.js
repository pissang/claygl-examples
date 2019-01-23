var app = clay.application.create('#viewport', {

    graphic: {
        // Enable shadow
        shadow: true
    },

    init: function (app) {
        // Create camera
        this._camera = app.createCamera([0, 150, 200], [0, 100, 0]);

        // Load model.
        app.loadModel('../assets/models/SambaDancing/SambaDancing.gltf')

        // Create lights
        app.createDirectionalLight([-1, -1, -1], '#fff', 0.7);
        app.createAmbientLight('#fff', 0.3);
    },

    loop: function (app) {}
});