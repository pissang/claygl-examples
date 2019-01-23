var CUBE_COUNT = 60;

clay.application.create('#viewport', {

    graphic: {
        shadow: true
    },

    init: function (app) {

        var camera = app.createCamera([6, 15, 15], [0, 0, 0]);

        var instancedCubeMesh = new clay.InstancedMesh({
            geometry: new clay.geometry.Cube(),
            material: app.createMaterial()
        });
        app.scene.add(instancedCubeMesh);
        // Create cubes
        var cubes = [];
        for (var i = 0; i < CUBE_COUNT; i++) {
            for (var j = 0; j < CUBE_COUNT; j++) {
                var cubeNode = app.createNode();
                cubeNode.position.set(i - CUBE_COUNT / 2, 0, j - CUBE_COUNT / 2);
                cubeNode.scale.set(0.5, 0, 0.5);
                cubes.push({
                    node: cubeNode
                });
            }
        }
        instancedCubeMesh.instances = cubes;

        this._cubes = cubes;

        // Create lights.
        var directionalLight = app.createDirectionalLight([-1, -1, -1]);
        directionalLight.shadowResolution = 2048;
        this._pointLight = app.createPointLight([-30, 30, 0], 100, '#fff', 1);

        this._control = new clay.plugin.OrbitControl({
            target: camera,
            domElement: app.container
        });
    },

    loop: function (app) {
        this._control.update(app.deltaTime);

        this._cubes.forEach(function (cube, idx) {
            var x = Math.round(idx / CUBE_COUNT);
            var y = idx % CUBE_COUNT;
            // cube y is animated in sin/cos wave.
            cube.node.scale.y = (Math.sin(x / 3 + app.elapsedTime / 1000) * Math.cos(y / 3 + app.elapsedTime / 1000) + 1) * 2;
        });
    }
});