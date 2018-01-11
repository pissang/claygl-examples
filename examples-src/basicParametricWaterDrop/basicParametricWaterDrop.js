// https://math.stackexchange.com/questions/51539/a-math-function-that-draws-water-droplet-shape
function createWaterDrop(app) {
    var a = 1;
    var b = 5 / 2;
    return app.createParametricSurface({}, null, {
        u: [0, Math.PI * 2, Math.PI / 40],
        v: [-Math.PI, Math.PI, Math.PI / 40],
        x: function (u, v) {
            var r = a * (1 - Math.sin(v)) * Math.cos(v);
            return Math.cos(u) * r;
        },
        y: function (u, v) {
            return b * (Math.sin(v) - 1) + 2;
        },
        z: function (u, v) {
            var r = a * (1 - Math.sin(v)) * Math.cos(v);
            return Math.sin(u) * r;
        }
    });
}

clay.application.create('#viewport', {

    graphic: {

        tonemapping: true,

        linear: true
    },

    init: function (app) {

        this._camera = app.createCamera([0, 1, 7], [0, 0, 0]);

        var mesh = createWaterDrop(app);
        // Load a panorama Milkyway texture
        app.loadTexture('../assets/textures/hdr/Milkyway.hdr', {
            flipY: false,
            exposure: 3
        }).then(function (panoramaTexture) {
            var cubemap = new clay.TextureCube();
            // Convert panorama to a cubemap
            clay.util.texture.panoramaToCubeMap(app.renderer, panoramaTexture, cubemap);

            var skybox = new clay.plugin.Skybox({
                // Attach skybox to the scene.
                scene: app.scene,
                // Use the cubemap as environment
                environmentMap: cubemap
            });

            // Cube can use cubemap to show the reflection.
            mesh.material.set('environmentMap', cubemap);
            // Reflectivity depends on the fresnel term
            // which is calculated from the metnalness and view angle in standard PBR material
            // And basically if metalness is 1, Reflectivity is high in each view angle.
            mesh.material.set('metalness', 1);
        });
    },

    loop: function (app) {
        this._camera.rotateAround(
            clay.math.Vector3.ZERO, clay.math.Vector3.UP, 0.01
        );
    }
});