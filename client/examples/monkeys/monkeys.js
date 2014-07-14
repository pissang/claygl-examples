var renderer = playground.renderer;
var camera = new qtek.camera.Perspective({
    aspect: renderer.width / renderer.height,
    near: 0.01,
    far: 100
});
camera.position.z = 2;
var scene = new qtek.Scene();

var control = new qtek.plugin.OrbitControl({
    domElement: renderer.canvas,
    target: camera
});

var gltf = new qtek.loader.GLTF();
gltf.load('assets/models/suzanne/suzanne_low.json');

gltf.success(function(res) {
    var model = res.scene.getNode('Suzanne');
    var monkeyGeo = model.geometry;
    var root = new qtek.Node();
    var shader = qtek.shader.library.get('buildin.physical');

    var N = 20;
    for (var i = 0; i < N; i++) {
        for (var j = 0; j < N; j++) {
            for (var k = 0; k < N; k++) {

                var material = new qtek.Material({
                    shader: shader
                });
                var mesh = new qtek.Mesh({
                    geometry: monkeyGeo,
                    material: material
                });
                mesh.scale.set(0.4, 0.4, 0.4);

                root.add(mesh);

                mesh.position.set(i - N / 2, j - N / 2, k - N / 2);
                mesh.rotation.rotateY(Math.random() * Math.PI * 2);

                material.set('color', [i / N, j / N, k / N]);
                material.set('glossiness', Math.random() * 0.6 + 0.4);
            }
        }
    }

    scene.add(root);

    var light = new qtek.light.Directional();
    scene.add(light);

    var monkeys = root.children();

    playground.run({
        scene: scene,
        camera: camera,
        frame: function(frameTime) {
            control.update(frameTime);

            for (var i = 0; i < monkeys.length; i++) {
                monkeys[i].rotation.rotateY(0.0002 * frameTime);
            }
            return renderer.render(scene, camera);
        }
    })
});