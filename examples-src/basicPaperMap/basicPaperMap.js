function createMap(app) {
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

    canvas.style.cssText = 'position:absolute;right:5px;bottom:5px;width:256px;height:256px;border:2px solid #fff';
    app.container.appendChild(canvas);

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

        var map = createMap(app);

        var diffuseMap = new clay.Texture2D({
            dynamic: true,
            anisotropic: 8,
            image: map.getContainer()
        });

        var planes = [];
        for (var i = 0; i < 10; i++) {
            var plane = app.createPlane({
                diffuseMap: diffuseMap
            });
            planes.push(plane);
            plane.rotation.rotateX(-Math.PI / 2);
            plane.position.set(0, (i - 5) / 10 - 1, 0);

            var y = plane.position.y + i * i * 0.04;
            app.timeline.animate(plane.position, { loop: true })
                .then(1000 - i * 100, {    // Delay
                    y: plane.position.y
                })
                .then(1000, { // Up
                    y: y
                }, 'cubicOut')
                .then(i * 100, { // Wait
                    y: y
                })
                .then(i * 100, { // Delay
                    y: y
                })
                .then(1000, {    // Drop
                    y: plane.position.y
                }, 'cubicOut')
                .then(1000 - i * 100, {
                    y: plane.position.y  // Wait
                })
                .start();
        }


        var camera = app.createCamera([4, 4 * Math.sqrt(2), 4], [0, 0, 0], 'orthographic', [4, 4, 20]);

        var light = app.createDirectionalLight([-1, -2, -0.5], '#fff', 0.6);
        light.shadowResolution = 1024;
        app.createAmbientLight('#fff', 0.5);

        app.container.style.background = 'linear-gradient(rgb(218, 210, 153), rgb(176, 218, 185))';
    },

    loop: function (app) {
    }
});