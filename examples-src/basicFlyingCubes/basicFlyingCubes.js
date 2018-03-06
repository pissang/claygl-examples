function randPos() {
    var r = Math.random() * 200 + 100;
    var alpha = Math.PI * 2 * Math.random();
    var beta = Math.PI / 6 * Math.random() + Math.PI / 2.5;
    return [
        Math.cos(alpha) * Math.sin(beta) * r,
        Math.cos(beta) * r + 100,
        Math.sin(alpha) * Math.sin(beta) * r
    ];
}


var app = clay.application.create('#viewport', {

    graphic: {
        shadow: true,

        tonemapping: true
    },

    init: function (app) {
        // Create camera
        this._camera = app.createCamera([0, 150, 200], [0, 100, 0]);

        this._initLights(app);

        // Create a room.
        var cube = app.createCubeInside({
            roughness: 1,
            color: [0.3, 0.3, 0.3]
        });
        // Cube not cast shadow to reduce the bounding box of scene and increse the shadow resolution.
        cube.castShadow = false;
        cube.scale.set(400, 200, 400);
        cube.position.y = 200;

        this._initCubes(app);

        // Use orbit control
        this._control = new clay.plugin.OrbitControl({
            target: this._camera,
            domElement: app.container
        });

        // Load model. return a load promise to make sure the look will be start after model loaded.
        return app.loadModel('../assets/models/SambaDancing/SambaDancing.gltf');
    },

    _initLights: function (app) {
        // Create lights
        app.createAmbientLight('#fff', 0.2);

        this._pointLight1 = app.createPointLight([100, 300, 100], 800, '#22f', 2);
        this._pointLight2 = app.createPointLight([-160, 250, 200], 800, '#2f2', 2);
        this._pointLight1.castShadow = true;
        this._pointLight2.castShadow = true;

        app.createSphere({
            shader: 'clay.basic', color: [0.3, 0.3, 1]
        }, this._pointLight1);

        app.createSphere({
            shader: 'clay.basic', color: [0.3, 1, 0.3]
        }, this._pointLight2);
    },

    _initCubes: function (app) {
        var cubes = [];
        for (var i = 0; i < 1000; i++) {
            var cube = app.createCube({
                color: [Math.random(), Math.random(), Math.random()]
            });
            cube.position.setArray(randPos());
            cube.center = new clay.Vector3(0, cube.position.y, 0);
            cube.moveSpeed = Math.random();
            cube.rotateSpeed = Math.random() * 5;
            cubes.push(cube);
        }
        this._cubes = cubes;
    },

    loop: function (app) {
        this._control.update(app.frameTime);
        this._pointLight1.rotateAround(new clay.Vector3(0, 100, 0), new clay.Vector3(0.1, 1, 0.1), 0.1);
        this._pointLight2.rotateAround(new clay.Vector3(0, 120, 0), new clay.Vector3(-0.1, 1, -0.2), 0.05);

        var frameTimeSecond = app.frameTime / 1000;
        var upVector = clay.Vector3.UP;
        this._cubes.forEach(function (cube) {
            cube.rotateAround(cube.center, upVector, cube.moveSpeed * frameTimeSecond);
            cube.rotation.rotateX(cube.rotateSpeed * frameTimeSecond).rotateY(cube.rotateSpeed * frameTimeSecond)
        });
    }
});