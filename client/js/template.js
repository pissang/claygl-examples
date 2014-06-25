var renderer = playground.renderer;
var scene = new qtek.Scene();
var camera = new qtek.camera.Perspective({
    aspect: renderer.width / renderer.height
});
camera.position.z = 4;
camera.position.y = 2;
camera.lookAt(qtek.math.Vector3.ZERO);

var cube = new qtek.Mesh({
    geometry: new qtek.geometry.Cube(),
    material: new qtek.Material({
        shader: new qtek.Shader({
            vertex: qtek.Shader.source('playground.vertex'),
            fragment: qtek.Shader.source('playground.fragment')
        })
    })
});
scene.add(cube);

playground.run({
    scene: scene,
    camera: camera,
    frame: function(frameTime) {
        cube.rotation.rotateY(0.005);
        return renderer.render(scene, camera);
    },
    dispose: function(){}
});