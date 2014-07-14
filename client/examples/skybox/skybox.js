var renderer = playground.renderer;
var scene = new qtek.Scene();
var camera = new qtek.camera.Perspective({
    aspect: renderer.width / renderer.height
});

var control = new qtek.plugin.OrbitControl({
    target: camera,
    domElement: renderer.canvas
});

var texture = new qtek.texture.TextureCube({ flipY: false });
texture.load({
    px : 'assets/textures/skybox/px.jpg',
    nx : 'assets/textures/skybox/nx.jpg',
    py : 'assets/textures/skybox/py.jpg',
    ny : 'assets/textures/skybox/ny.jpg',
    pz : 'assets/textures/skybox/pz.jpg',
    nz : 'assets/textures/skybox/nz.jpg',
});

var skybox = new qtek.plugin.Skybox({
    scene: scene
});
skybox.material.set('environmentMap', texture);

texture.success(function() {
    playground.run({
        scene: scene,
        camera: camera,
        frame: function(fTime) {
            control.update(fTime);
            renderer.render(scene, camera);
        }
    });
})