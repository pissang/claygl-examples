var config = {
    debug: 'normal'
};

var gui = new dat.GUI();
gui.add(config, 'debug', [
    'normal', 'depth', 'position', 'glossiness', 'metalness', 'albedo'
]);

var app = clay.application.create('#viewport', {

    // Disable default forward render.
    autoRender: false,

    init: function (app) {

        // Create camera
        this._camera = app.createCamera([0, 1, 3], [0, 0, 0]);

        this._gBuffer = new clay.deferred.GBuffer();
        this._gBuffer.resize(app.width, app.height);

        this._control = new clay.plugin.OrbitControl({
            target: this._camera,
            domElement: app.container
        });

        // Create light
        app.createDirectionalLight([-1, -1, -1]);

        // Load model. return a load promise to make sure the look will be start after model loaded.
        return app.loadModel('../assets/models/suzanne/suzanne.gltf').then((function (result) {
            this._monkeyRoot = result.rootNode;
            // Set material to red.
            result.materials.forEach(function (mat) {
                mat.set('color', 'red');
            });
        }).bind(this));
    },

    loop: function (app) {
        this._control.update(app.frameTime);

        app.scene.update();
        this._camera.update();

        this._gBuffer.update(app.renderer, app.scene, this._camera);
        this._gBuffer.renderDebug(app.renderer, this._camera, config.debug);
    }
});