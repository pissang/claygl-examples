define(function(require) {

    var qtek = require('qtek');
    var statistics = require('./statistics');

    var evalResult;

    var inPlay = true;

    // Methods exposed to js code
    var api = {
        
        renderer: null,

        animation: new qtek.animation.Animation(),

        stats: {
            fps: 0,
            frameTime: 0,
            renderTime: 0
        },

        run: function(res) {
            evalResult = res;

            if (evalResult.frame) {
                api.animation.on('frame', function(frameTime) {
                    api.stats.fps = Math.round(1000 / frameTime);
                    api.stats.frameTime = frameTime;
                    if (inPlay) {
                        var start = Date.now();
                        evalResult.frame(frameTime);
                        api.stats.renderTime = Date.now() - start;
                        statistics.update();
                    }
                });
            }
        }
    }

    function resize() {
        var viewport = document.getElementById('viewport');
        api.renderer.resize(viewport.clientWidth, viewport.clientHeight);
    }

    function start() {
        api.renderer = new qtek.Renderer({
            preserveDrawingBuffer: true,
            canvas: document.getElementById('viewport-canvas')
        });

        window.addEventListener('resize', resize);

        $('#toggle-play').click(togglePlay);
        $("#capture").click(capture);

        resize();

        api.animation.start();

        // Statistics
        statistics.addStats(function() {
            return api.stats.fps;
        }, 0, 100, 'fps');
        statistics.addStats(function() {
            return api.stats.renderTime;
        }, 0, 32, 'ms');
    }

    function runCode(js, glsl) {
        
        clear();

        if (glsl) {
            qtek.Shader.import(glsl);
        }

        var func = new Function('qtek', 'playground', js);
        func(qtek, api);
        
        $('#toggle-play').addClass('pause').removeClass('play');
        inPlay = true;
    }

    function clear() {
        // Dispose previous
        api.animation.off('frame');
        if (evalResult) {
            if (evalResult.scene) {
                api.renderer.disposeScene(evalResult.scene);
            }
            if (evalResult.dispose) {
                evalResult.dispose(api.renderer.gl);
            }
        }
        for (var name in qtek.Shader.codes) {
            if (name !== 'buildin') {
                delete qtek.Shader.codes[name];
            }
        }

        api.renderer.gl.clear(api.renderer.gl.DEPTH_BUFFER_BIT | api.renderer.gl.COLOR_BUFFER_BIT);
    }

    function togglePlay() {
        inPlay = !inPlay;
        if (inPlay) {
            $(this).addClass('pause').removeClass('play');
        } else {
            $(this).removeClass('pause').addClass('play');
        }
    }

    function capture() {
        // api.renderer.canvas.toBlob(function(blob) {
        //     saveAs(blob, 'thumb.jpg');
        // });
        window.open(api.renderer.canvas.toDataURL());
    }

    return {
        start: start,

        runCode: runCode,

        clear: clear
    }
});