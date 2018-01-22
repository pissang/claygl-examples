clay.application.create('#viewport', {

    graphic: {
        shadow: true,
        tonemapping: true
    },

    init: function (app) {

        var camera = app.createCamera([0, 7, 25], [0, 2, 0]);

        this._createJumpingCube(app);

        this._createMovingPlatform(app);

        // Create lights
        var dirLight = app.createDirectionalLight([-1, -3, -1], '#fff', 2);
        dirLight.shadowResolution = 1024;

        app.createPointLight([-20, 10, 0], 50, '#fff', 2);
        // app.createAmbientLight('#fff', 0.5);
    },

    _createJumpingCube: function (app) {
        var jumpingNode = app.createNode();
        var cube = app.createCube({
            color: 'red'
        }, jumpingNode);
        cube.position.y = 1;

        var props = {
            y: 0,
            sx: 1,
            sy: 1,
            rot: 0
        };

        app.timeline.animate(props, { loop: true })
            .when(500, {    // Jump
                y: 10, rot: Math.PI
            }, 'circularOut')
            .when(1000, {   // Fall
                y: 0, sx: 1, sy: 1, rot: Math.PI * 2
            }, 'circularIn')
            .when(1300, {   // Squish
                sx: 2, sy: 0.5
            }, 'circularOut')
            .when(1400, {   // Pause
                sx: 2, sy: 0.5
            })
            .when(1700, {   // Recover
                sx: 1, sy: 1, rot: Math.PI * 2
            }, 'circularIn')
            .during(function () {
                jumpingNode.position.y = props.y;
                jumpingNode.scale.set(props.sx, props.sy, props.sx);

                cube.rotation.identity().rotateZ(props.rot);
            })
            .start();
    },

    _createMovingPlatform: function (app) {
        var cylinderGeo = new clay.geometry.Cylinder();
        var platformRoot = app.createNode();
        var color = 'skyblue';
        for (var i = 0; i < 9; i++) {
            var cylinder = app.createMesh(cylinderGeo, {
                // color: color
            }, platformRoot);
            cylinder.castShadow = false;
            cylinder.scale.set(4, 0.3, 4);
            cylinder.position.x = (i - 4) * 10;
            cylinder.position.y = -0.3;
        }

        app.timeline.animate(platformRoot.position, {
                loop: true
            })
            .when(1300, {   // Move
                x: -10
            }, 'cubicInOut')
            .when(1700, {   // Pause
                x: -10
            })
            .start();
    },

    loop: function () {}
});