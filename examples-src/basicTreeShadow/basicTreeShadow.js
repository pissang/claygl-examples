var app = clay.application.create('#viewport', {

    graphic: {
        shadow: true
    },

    init: function (app) {
        // Create camera
        this._camera = app.createCamera([0, 20, 25], [0, 10, 0]);

        // Create light
        var light = app.createDirectionalLight([-1, -3, -1]);
        light.shadowResolution = 1024;

        this._orbitControl = new clay.plugin.OrbitControl({
            target: this._camera,
            domElement: app.container
            // autoRotate: true
        });

        app.createAmbientLight('#fff', 0.3);

        var ground = app.createPlane({
            color: '#aaa'
        });
        ground.castShadow = false;
        ground.rotation.rotateX(-Math.PI / 2);
        ground.scale.set(40, 40, 1);

        // Load model. return a load promise to make sure the look will be start after model loaded.
        return app.loadModel('../assets/models/tree1/tree1.gltf').then(function (result) {
            result.materials.forEach(function (material) {
                // Enable alpha test
                material.define('fragment', 'ALPHA_TEST');
                material.set('alphaCutoff', 0.8);
            });
        });
    },

    loop: function (app) {
        this._orbitControl.update(app.frameTime);
    }
});