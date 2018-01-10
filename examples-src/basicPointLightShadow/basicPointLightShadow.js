var app = clay.application.create('#viewport', {

    graphic: {
        shadow: true
    },

    init: function (app) {
        // Create camera
        this._camera = app.createCamera([0, 150, 200], [0, 100, 0]);

        // Load boombox model.
        app.loadModel('../assets/models/SambaDancing/SambaDancing.gltf');

        // Create lights
        app.createDirectionalLight([-1, -1, -1], '#fff', 0.7);
        app.createAmbientLight('#fff', 0.3);

        this._pointLight1 = app.createPointLight([50, 100, 50], 500, '#00f', 2);
        this._pointLight2 = app.createPointLight([-80, 150, 70], 500, '#0f0', 2);
        this._pointLight1.castShadow = true;
        this._pointLight2.castShadow = true;

        app.createSphere({
            shader: 'clay.basic', color: [0, 0, 1]
        }, this._pointLight1);

        app.createSphere({
            shader: 'clay.basic', color: [0, 1, 0]
        }, this._pointLight2);


        // Create a room.
        var cube = app.createCubeInside({
            roughness: 1,
            color: [0.3, 0.3, 0.3]
        });
        // Cube not cast shadow to reduce the bounding box of scene and increse the shadow resolution.
        cube.castShadow = false;
        cube.scale.set(400, 400, 400);
        cube.position.y = 400;

        // Use orbit control
        this._control = new clay.plugin.OrbitControl({
            target: this._camera,
            domElement: app.container
        });
    },

    loop: function (app) {
        this._control.update(app.frameTime);
        this._pointLight1.rotateAround(new clay.math.Vector3(0, 100, 0), new clay.math.Vector3(0.1, 1, 0.1), 0.1);
        this._pointLight2.rotateAround(new clay.math.Vector3(0, 120, 0), new clay.math.Vector3(-0.1, 1, -0.2), 0.05);
    }
});