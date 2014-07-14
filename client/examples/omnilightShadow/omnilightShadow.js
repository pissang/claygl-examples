var renderer = playground.renderer;
var camera = new qtek.camera.Perspective({
    aspect: renderer.width / renderer.height,
    far: 500
});
camera.position.set(0, 2, 10);
camera.lookAt(new qtek.math.Vector3(0, 0, 0));

var scene = new qtek.Scene();
var shadowMapPass = new qtek.prePass.ShadowMap();

var cube = new qtek.geometry.Cube();
var material = new qtek.Material({
    shader : qtek.shader.library.get('buildin.lambert')
});

var root = new qtek.Node();
scene.add(root);

for(var i = 0; i < 2; i++){
    for(var j = 0; j < 2; j++){
        for(var k = 0; k < 2; k++){
            var mesh = new qtek.Mesh({
                geometry : cube,
                material : material
            });
            mesh.scale.set(0.5, 0.5, 0.5);
            mesh.position.set((i-0.5) * 5, (j-0.5) * 5, (k-0.5)*5);
            root.add(mesh);
        }
    }
}

var bigCube = new qtek.Mesh({
    geometry : new qtek.geometry.Cube({
        inside : true
    }),
    material : new qtek.Material({
        shader : qtek.shader.library.get("buildin.lambert")
    }),
    culling : false,
    scale : new qtek.math.Vector3(10, 10, 10)
});
root.add(bigCube);

var light = new qtek.light.Point({
    color : [1.5, 1.5, 1.5],
    shadowResolution : 512,
    range : 30,
    castShadow : true
})
light.position.set(0.2, 0.2, 0.2);
scene.add(light);

playground.run({
    scene: scene,
    camera: camera,
    frame: function(frameTime) {
        shadowMapPass.render(renderer, scene);
        root.rotation.rotateY(frameTime / 4000);
        return renderer.render(scene, camera);
    }
});