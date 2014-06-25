define(function(require) {

    var qtek = require('qtek');

    var evalResult;

    var inPlay = true;

    // Methods exposed to js code
    var api = {
        
        renderer: null,

        animation: new qtek.animation.Animation(),

        run: function(res) {
            evalResult = res;

            if (evalResult.frame) {
                api.animation.on('frame', function(frameTime) {
                    if (inPlay) {
                        evalResult.frame(frameTime);
                    }
                });
            }
        }
    }

    function resize() {
        var viewport = document.getElementById('viewport');
        var height = viewport.clientWidth * 10 / 16;
        viewport.style.height = height + 'px';
        viewport.style.marginTop = -height / 2 + 'px';

        api.renderer.resize(viewport.clientWidth, viewport.clientHeight);
    }

    function start() {
        api.renderer = new qtek.Renderer({
            canvas: document.getElementById('viewport-canvas')
        });

        window.addEventListener('resize', resize);
        $('#toggle-play').click(togglePlay);

        resize();

        api.animation.start();
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

    }

    return {
        start: start,

        runCode: runCode,

        clear: clear
    }
});