function createMap() {
    var canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 2048;

    var map = new maptalks.Map(canvas, {
        // center: [-0.113049,51.498568],
        center: [-73.99774358945177, 40.708643546076274],
        zoom: 17,
        baseLayer: new maptalks.TileLayer('base', {
            // urlTemplate: 'http://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png',
            // subdomains: ['a','b','c', 'd'],
            urlTemplate: 'http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
            subdomains: ['mt0','mt1','mt2','mt3'],
            attribution: '&copy; <a href="http://osm.org">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/">CARTO</a>'
        })
    });

    canvas.style.cssText = 'position:absolute;right:5px;bottom:5px;width:256px;height:256px;';
    document.body.appendChild(canvas);

    return map;
}

clay.application.create('#viewport', {

    graphic: {
        shadow: true,
        // linear: true,
        // tonemapping: true
    },

    event: true,

    init: function (app) {

        var map = createMap();

        var diffuseMap = new clay.Texture2D({
            dynamic: true,
            anisotropic: 8,
            image: map.getContainer()
        });

        map.on('baselayerload', function () {
            // diffuseMap.dynamic = false;
        });

        var cube = app.createCube();
        this._cube = cube;

        var plane = app.createPlane({
            diffuseMap: diffuseMap
        });
        plane.rotation.rotateX(-Math.PI / 2);
        plane.position.y = 0.101;
        this._plane = plane;

        cube.scale.set(1, 0.1, 1);


        var camera = app.createCamera([4, 4 * Math.sqrt(2), 4], [0, 0, 0], 'orthographic', [4, 4, 20]);

        app.createDirectionalLight([-1, -2, -1], '#fff', 1.2);
        app.createAmbientLight('#fff', 0.1);

        app.container.style.background = 'linear-gradient(rgb(218, 210, 153), rgb(176, 218, 185))';
    },

    loop: function (app) {
        // this._plane.material.set('uvRepeat', [0.5, 0.5]);
        // this._plane.material.set('uvOffset', [app.elapsedTime * 5e-5, app.elapsedTime * 5e-5]);
    }
});