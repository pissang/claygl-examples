var app = clay.application.create('#viewport', {

    graphic: {
        // Enable shadow
        shadow: true
    },

    init: function (app) {
        // Create camera
        this._camera = app.createCamera([0, 150, 600], [0, 100, 0]);

        // Load model.
        app.loadModel('../assets/models/SambaDancing/SambaDancing.gltf').then(function (result) {
            result.rootNode.position.z = 200;
            for (var i = 0; i < 5; i++) {
                for (var k = 0; k < 2; k++) {
                    var color = [Math.random(), Math.random(), Math.random()];
                    var twin = app.cloneNode(result.rootNode);
                    twin.traverse(function (child) {
                        // Share the same animation clip
                        if (child.skeleton) {
                            child.skeleton.addClip(result.clips[0]);
                        }
                        if (child.material) {
                            child.material.set('color', color);
                        }
                    });

                    twin.position.x = (i - 2) * 150;
                    twin.position.z = -200 * k;
                }
            }
        });

        // Create a room.
        var cube = app.createCubeInside({
            roughness: 1,
            color: [0.3, 0.3, 0.3]
        });
        // Cube not cast shadow to reduce the bounding box of scene and increse the shadow resolution.
        cube.castShadow = false;
        cube.scale.set(500, 200, 500);
        cube.position.y = 200;

        // Use orbit control
        this._control = new clay.plugin.OrbitControl({
            target: this._camera,
            domElement: app.container
        });

        this._initLights(app);
    },

    _initLights: function (app) {
        // Create lights
        app.createAmbientLight('#fff', 0.2);

        this._pointLight1 = app.createPointLight([100, 300, 100], 1000, '#22f', 2);
        this._pointLight2 = app.createPointLight([-160, 250, 200], 1000, '#2f2', 2);
        this._pointLight1.castShadow = true;
        this._pointLight2.castShadow = true;

        this._pointLight1.shadowResolution = 1024;
        this._pointLight2.shadowResolution = 1024;

        app.createSphere({
            shader: 'clay.basic', color: [0.3, 0.3, 1]
        }, this._pointLight1);

        app.createSphere({
            shader: 'clay.basic', color: [0.3, 1, 0.3]
        }, this._pointLight2);
    },

    loop: function (app) {
        this._control.update(app.frameTime);
        this._pointLight1.rotateAround(new clay.Vector3(0, 100, 0), new clay.Vector3(0.1, 1, 0.1), 0.1);
        this._pointLight2.rotateAround(new clay.Vector3(0, 120, 0), new clay.Vector3(-0.1, 1, -0.2), 0.05);
    }
});