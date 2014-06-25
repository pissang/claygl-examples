var renderer = playground.renderer;
var camera = new qtek.camera.Perspective({
    aspect: renderer.width / renderer.height
});

camera.position.y = 0.1;
camera.position.z = 0.4;

camera.lookAt(qtek.math.Vector3.ZERO);

var gltf = new qtek.loader.GLTF();
gltf.load('assets/models/leeperrysmith/leeperrysmith.json');

gltf.success(function(res) {

    var scene = res.scene;
    var model = scene.getNode('leeperrysmith');
    model.rotation.rotateX(-Math.PI / 2);
    model.material.set('glossiness', 0.4);

    var light = new qtek.light.Directional({
        intensity: 0.6
    });
    light.position.set(1, 1, 1);
    light.lookAt(qtek.math.Vector3.ZERO);

    scene.add(light);
    scene.add(new qtek.light.Ambient({
        intensity: 0.3
    }));

    playground.run({
        scene: scene,
        camera: camera,
        frame: function(fTime) {
            scene.rotation.rotateY(0.001);
            renderer.render(res.scene, camera);
        }  
    });
});
