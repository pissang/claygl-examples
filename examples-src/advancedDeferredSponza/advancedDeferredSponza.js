var BOX = [
    new clay.Vector3(1028, 551, 396),
    new clay.Vector3(-1028, 150, -396)
];

var app = clay.application.create('#viewport', {

    // Disable default forward render.
    autoRender: false,

    init: function (app) {

        // Create camera
        this._camera = app.createCamera([0, 100, 0], [-10, 100, 0]);
        this._camera.far = 10000;

        this._shadowPass = new clay.prePass.ShadowMap();
        this._dRenderer = new clay.deferred.Renderer({
            shadowMapPass: this._shadowPass
        });

        this._control = new clay.plugin.FreeControl({
            target: this._camera,
            domElement: app.container,
            speed: 10
        });

        this._initLights(app);
        // Load model. return a load promise to make sure the look will be start after model loaded.
        return app.loadModel('../assets/models/sponza/sponza.gltf').then((function (result) {
            this._sponzaRoot = result.rootNode;
            result.textures.forEach(function (texture) {
                texture.anisotropic = 8;
            });
        }).bind(this));
    },

    _initLights: function (app) {

        var randomPos = clay.Value.random3D(BOX[0], BOX[1]);

        this._lights = [];
        for (var i = 0; i < 100; i++) {
            var pointLight = app.createPointLight([0, 0, 0], 500, [Math.random(), Math.random(), Math.random()]);
            randomPos.get(pointLight.position);

            var sphere = app.createSphere({}, pointLight);
            sphere.scale.set(2, 2, 2);

            pointLight.center = new clay.Vector3(0, pointLight.position.y, 0);
            pointLight.moveSpeed = Math.random();

            this._lights.push(pointLight);
        }

        app.createAmbientLight('#fff', 0.2);
    },

    loop: function (app) {
        var frameTimeSecond = app.frameTime / 1000;
        var upVector = clay.Vector3.UP;
        this._lights.forEach(function (light) {
            light.rotateAround(light.center, upVector, light.moveSpeed * frameTimeSecond);
        });

        this._control.update(app.frameTime);
        this._shadowPass.render(app.renderer, app.scene, this._camera);
        this._dRenderer.render(app.renderer, app.scene, this._camera);
    }
});