// Basic scene example
// This example will show you how to create a scene, and put a cube, a light into the scene.
// And finally render the scene with a camera

var scene = new qtek.Scene();
var camera = new qtek.Camera({
    fov: 40,
    aspect: renderer.width / renderer.height
});

camera.position.y = 1;
camera.position.z = 2;

camera.lookAt(qtek.math.Vector3.ZERO);

var cubeGeo = new qtek.geometry.Cube();
var cubeMat = new qtek.Material({
    shader: qtek.shader.library.get('buildin.phong')
});

var cube = new qtek.Mesh({
    geometry: cubeGeo,
    material: cubeMat
});
scene.add(cube);

var light = new qtek.light.Point();
scene.add(light);

return {
    frame: function(fTime) {
        renderer.render(scene, camera);
    }
}