var app = clay.application.create('#viewport', {

    graphic: {
        shadow: true,
        linear: true,
        tonemapping: true
    },

    init: function (app) {
        // Create camera
        this._camera = app.createCamera([0, 2, 15], [0, 2, 0]);

        // Create light
        app.createDirectionalLight([-1, -3, -1]);

        this._orbitControl = new clay.plugin.OrbitControl({
            target: this._camera,
            domElement: app.container
            // autoRotate: true
        });

        app.createAmbientCubemapLight('../assets/textures/hdr/Grand_Canyon_C.hdr', 0.7, 0.3);

        // Load boombox model. return a load promise to make sure the look will be start after model loaded.
        return app.loadModel('../assets/models/logo/logo.gltf').then((function (result) {
            this._logoRoot = result.rootNode;

            result.materials.forEach(function (material) {
                material.set('roughness', 0.3);
            });
        }).bind(this));
    },

    loop: function (app) {
        this._orbitControl.update(app.frameTime);
    }
});