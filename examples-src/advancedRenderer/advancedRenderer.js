var app = clay.application.create('#viewport', {

    autoRender: false,

    devicePixelRatio: 1,

    init: function (app) {

        var adr = this._advancedRenderer = new ClayAdvancedRenderer(app.renderer, app.scene, app.timeline, {
            shadow: {
                enable: true
            },
            postEffect: {
                bloom: {
                    enable: false
                },
                screenSpaceAmbientOcclusion: {
                    temporalFilter: true,
                    enable: true,
                    radius: 2,
                    intensity: 1.2
                }
            }
        });

        // Create camera
        this._camera = app.createCamera([-10, 15, 20], [0, 5, 0], 'orthographic', [35, app.height / app.width * 35, 50]);

        this._control = new clay.plugin.OrbitControl({
            target: this._camera,
            domElement: app.container,
            timeline: app.timeline,
            zoomSensitivity: 0
        });

        // Only re-render when the control is updated.
        this._control.on('update', function () {
            adr.render();
        }, this);

        // Load model.
        app.loadModel('../assets/models/monument/monu16.glb').then(function (result) {
            result.rootNode.scale.set(0.1, 0.1, 0.1);
            adr.render();
        });

        app.createAmbientCubemapLight('../assets/textures/hdr/pisa.hdr', 0.5, 0.5).then(function (result) {
            adr.render();
        });

        // Create lights
        app.createDirectionalLight([-1, -1, -1], '#fff', 2);
    },

    loop: function (app) {}
});