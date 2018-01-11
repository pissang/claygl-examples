clay.application.create('#viewport', {

    init: function (app) {

        this._camera = app.createCamera([0, 1, 5], [0, 0, 0]);
        var cube = app.createSphere();
        // Load a panorama Milkyway texture
        app.loadTexture('../assets/textures/Milkyway.jpg', {
            flipY: false
        }).then(function (panoramaTexture) {
            var cubemap = new clay.TextureCube({
                flipY: false
            });
            // Convert panorama to a cubemap
            clay.util.texture.panoramaToCubeMap(app.renderer, panoramaTexture, cubemap);

            var skybox = new clay.plugin.Skybox({
                // Attach skybox to the scene.
                scene: app.scene,
                // Use the cubemap as environment
                environmentMap: cubemap
            });

            // Cube can use cubemap to show the reflection.
            cube.material.set('environmentMap', cubemap);
            // Reflectivity depends on the fresnel term
            // which is calculated from the metnalness and view angle in standard PBR material
            // And basically if metalness is 1, Reflectivity is high in each view angle.
            cube.material.set('metalness', 1);
        });
    },

    loop: function (app) {
        this._camera.rotateAround(
            clay.math.Vector3.ZERO, clay.math.Vector3.UP, 0.01
        );
    }
});