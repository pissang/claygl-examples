var app = clay.application.create('#viewport', {
    init: function (app) {
        // Create camera
        this._camera = app.createCamera([0, 1, 3], [0, 0, 0]);

        // Create light
        app.createDirectionalLight([-1, -1, -1]);

        // Load boombox model. return a load promise to make sure the look will be start after model loaded.
        return app.loadModel('../assets/models/suzanne/suzanne.gltf').then((function (result) {
            this._monkeyRoot = result.rootNode;
            // Set material to red.
            result.materials.forEach(function (mat) {
                mat.set('color', 'red');
            });
        }).bind(this));
    },

    loop: function (app) {
        this._monkeyRoot.rotation.rotateY(app.frameTime / 1000);
    }
});