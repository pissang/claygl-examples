var app = clay.application.create('#viewport', {

    graphic: {
        shadow: true,
        // Enable tonemapping
        tonemapping: true,
        // Use linear color space instead of default sRGB.
        linear: true
    },

    init: function (app) {
        // Create camera
        this._camera = app.createCamera([3, 3, -10], [0, 0, 0]);

        // Create light
        var dirLight = app.createDirectionalLight([-1, -1, 1]);
        dirLight.shadowResolution = 2048;

        // Use orbit control
        this._control = new clay.plugin.OrbitControl({
            // The target or orbit control. Usually is a camera.
            target: this._camera,
            // The HTMLDomElement where we need to addEventListener.
            domElement: app.container
        });

        this._initGround(app);

        this._initMaterialSpheres(app);

        return app.createAmbientCubemapLight('../assets/textures/hdr/pisa.hdr', 1, 0.3).then(function (result) {
            var skybox = new clay.plugin.Skybox({
                scene: app.scene,
                environmentMap: result.environmentMap
            });
            // Use high lod to show the `rough` skybox
            skybox.material.set('lod', 3);
        });
    },

    _initGround: function (app) {
        var plane = app.createPlane({
            diffuseMap: '../assets/textures/oakfloor2/oakfloor2_basecolor.png',
            normalMap: '../assets/textures/oakfloor2/oakfloor2_normal.png',
            roughnessMap: '../assets/textures/oakfloor2/oakfloor2_roughness.png',
            // Force convert the texture to power of two.
            // None power of two texture doesn't support tiling.
            convertTextureToPOT: true,
            uvRepeat: [10, 10]
        });
        plane.castShadow = false;
        plane.scale.set(10, 10, 1);
        plane.rotation.rotateX(-Math.PI / 2);
    },

    _initMaterialSpheres: function (app) {

        for (var i = 0; i < 10; i++) {
            for (var k = 0; k < 10; k++) {
                var x = (i - 5);
                var y = (k - 5);
                // Create sphere with different metalness and roughness
                var sphere = app.createSphere({
                    roughness: i / 9,
                    metalness: k / 9
                });
                sphere.position.set(x, 0.4, y);
                sphere.scale.set(0.4, 0.4, 0.4);
            }
        }
    },

    loop: function (app) {
        // Control status must be updated each frame.
        this._control.update(app.frameTime);
    }
});