
var app = clay.application.create('#viewport', {

    graphic: {
        shadow: true,
        tonemapping: true
    },
    init: function (app) {
        app.renderer.maxJointNumber = 30;
        // Create camera
        this._camera = app.createCamera([0, 600, 1600], [0, 0, 0]);
        this._camera.far = 10000;

        app.loadModel('../assets/models/pokemon_center/scene.gltf', {
            // shader: 'clay.basic',
            waitTextureLoaded: true
        }).then(result => {
            result.rootNode.scale.set(500, 500, 500);
        });

        // Load boombox model.
        app.loadModel('../assets/models/kgirls/kgirls01.gltf', {
            // shader: 'clay.basic',
            waitTextureLoaded: true
        })
            .then(function (result) {

                var instancedMeshes = result.meshes.map(mesh => {
                    return new clay.InstancedMesh({
                        geometry: mesh.geometry,
                        material: mesh.material,
                        skeleton: mesh.skeleton,
                        joints: mesh.joints,
                        instances: []
                    });
                });

                result.meshes.forEach((mesh, idx) => {
                    var parent = mesh.getParent();
                    parent.remove(mesh);
                    parent.add(instancedMeshes[idx]);
                });

                var ROBOT_COUNT = 10;
                var instances = [];
                for (var i = 0; i < ROBOT_COUNT * 2; i++) {
                    for (var j = 0; j < ROBOT_COUNT; j++) {
                        var node = new clay.Node();
                        node.position.x = (i - ROBOT_COUNT) * 150;
                        node.position.z = (j - ROBOT_COUNT / 2) * 180 + 700;


                        instances.push({
                            node: node
                        });

                        node.update();
                    }
                }

                instancedMeshes.forEach(mesh => {
                    mesh.instances = instances;
                });
            });

        // Create light
        this._mainLight = app.createDirectionalLight([-2, -1, -1]);
        this._mainLight.intensity = 2;
        this._mainLight.shadowResolution = 2048;
        this._mainLight.shadowCascade = 2;

        app.createAmbientLight('#fff', 0.4);

        // Use orbit control
        this._control = new clay.plugin.OrbitControl({
            target: this._camera,
            domElement: app.container,
            minDistance: 100,
            maxDistance: 5000
        });
    },

    loop: function (app) {
        this._control.update(app.frameTime);
    }
});