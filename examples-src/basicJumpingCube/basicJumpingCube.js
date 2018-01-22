clay.application.create('#viewport', {

    graphic: {
        shadow: true
    },

    init: function (app) {

        var camera = app.createCamera([0, 7, 25], [0, 2, 0]);

        var movingNode = app.createNode();
        var cube = app.createCube({
            color: 'red'
        }, movingNode);
        cube.position.y = 1;

        var props = {
            y: 0,
            sx: 1,
            sy: 1,
            rot: 0
        };

        app.timeline.animate(props, { loop: true })
            .when(500, {
                y: 10, rot: Math.PI
            }, 'circularOut')
            .when(1000, {
                y: 0, sx: 1, sy: 1, rot: Math.PI * 2
            }, 'circularIn')
            .when(1300, {
                sx: 2, sy: 0.5
            }, 'circularOut')
            .when(1400, {
                sx: 2, sy: 0.5
            })
            .when(1700, {
                sx: 1, sy: 1, rot: Math.PI * 2
            }, 'circularIn')
            .during(function () {
                movingNode.position.y = props.y;
                movingNode.scale.set(props.sx, props.sy, props.sx);

                cube.rotation.identity().rotateZ(props.rot);
            })
            .start();


        // Create ground
        var plane = app.createPlane();
        plane.castShadow = false;
        plane.rotation.rotateX(-Math.PI / 2);
        plane.scale.set(10, 10, 1);

        // Create lights
        app.createDirectionalLight([-1, -3, -1], '#fff', 0.7);
        app.createAmbientLight('#fff', 0.3);
    },

    loop: function () {}
});