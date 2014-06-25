// Basic scene example
// This example will show you how to create a simple scene with a cube, a plane and a spot light in it.
var renderer = playground.renderer;
var scene = new qtek.Scene();
var camera = new qtek.camera.Perspective({
    aspect: renderer.width / renderer.height
});

camera.position.y = 3;
camera.position.z = 5;

camera.lookAt(qtek.math.Vector3.ZERO);

// Create a cube
var cubeGeo = new qtek.geometry.Cube();
var cubeMat = new qtek.Material({
    shader: qtek.shader.library.get('buildin.phong')
});
cubeMat.set('color', [0.5, 0, 0]);
var cube = new qtek.Mesh({
    geometry: cubeGeo,
    material: cubeMat
});
cube.position.y = 1;
scene.add(cube);

// Create a plane
var planeGeo = new qtek.geometry.Plane();
var planeMat = new qtek.Material({
    shader: qtek.shader.library.get('buildin.phong')
});
planeMat.set('color', [0, 0, 0.4]);
var plane = new qtek.Mesh({
    geometry: planeGeo,
    material: planeMat
});
plane.scale.set(10, 10, 10);
plane.rotation.rotateX(-Math.PI / 2);
scene.add(plane);

// Create a spot light
var light = new qtek.light.Spot({
    intensity: 1.2
});
light.position.set(2.5, 2.5, 2.5);
light.lookAt(qtek.math.Vector3.ZERO);
scene.add(light);

playground.run({
    scene: scene,
    camera: camera,
    frame: function(fTime) {
        renderer.render(scene, camera);
    }
});