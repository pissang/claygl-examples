var app = clay.application.create('#viewport', {

    // Enable event. Or the mouseover, mouseout events will not be triggered.
    event: true,

    init: function (app) {
        // Create camera
        this._camera = app.createCamera([0, 0.5, 7], [0, 0, 0]);

        function makeRandomColor() {
            return [Math.random(), Math.random(), Math.random()];
        }
        function createCube() {
            var randomColor = makeRandomColor();
            var cube = app.createCube({
                color: randomColor
            });
            cube
                .on('mouseover', function () {
                    cube.material.set('color', [1, 0, 0]);
                }, this)
                .on('mouseout', function () {
                    cube.material.set('color', randomColor);
                }, this);
            return cube;
        }

        this._cubes = [];
        // Create cube
        for (var i = 0; i < 3; i++) {
            for (var k = 0; k < 3; k++) {
                var cube = createCube();
                cube.scale.set(0.5, 0.5, 0.5);
                cube.position.set((i - 1) * 2, (k - 1) * 2, 0);
                this._cubes.push(cube);
            }
        }

        // Create light
        this._mainLight = app.createDirectionalLight([-1, -1, -1]);
        app.createAmbientLight('#fff', 0.3);
    },

    loop: function (app) {
        this._cubes.forEach(function (cube) {
            cube.rotation.rotateY(app.frameTime / 1000);
        });
    }
});