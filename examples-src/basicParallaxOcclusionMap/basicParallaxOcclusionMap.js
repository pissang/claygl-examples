var config = {
    scale: 0.01
};

var gui = new dat.GUI();
gui.add(config, 'scale', 0, 0.1);

var app = clay.application.create('#viewport', {

    init: function (app) {

        this._camera = app.createCamera([0, 1.5, 3.5], [0, 0, 0]);

        this._cube = app.createCube({
            parallaxOcclusionMap: '../assets/textures/depth.png',
            diffuseMap: '../assets/textures/diffuse2.png',
            normalMap: '../assets/textures/normal.png'
        });

        this._mainLight = app.createDirectionalLight([-1, -1, -1]);
        app.createAmbientLight('#fff', 0.3);
    },

    loop: function (app) {
        this._cube.material.set('parallaxOcclusionScale', config.scale);
        // Simply rotating the cube every frame.
        this._cube.rotation.rotateY(app.frameTime / 1000);
    }
});