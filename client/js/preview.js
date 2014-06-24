define(function(require) {

    var qtek = require('qtek');

    var renderer;
    var animation = new qtek.animation.Animation();

    var evalResult;

    var inPlay = true;

    function resize() {
        var viewport = document.getElementById('viewport');
        var height = viewport.clientWidth * 10 / 16;
        viewport.style.height = height + 'px';
        viewport.style.marginTop = -height / 2 + 'px';
        renderer.resize(viewport.clientWidth, viewport.clientHeight);
    }

    function start() {
        renderer = new qtek.Renderer({
            canvas: document.getElementById('viewport-canvas')
        });

        window.addEventListener('resize', resize);
        $('#toggle-play').click(togglePlay);

        resize();

        animation.start();
    }

    function runCode(js, glsl) {
        // Dispose previous
        animation.off('frame');
        if (evalResult) {
            renderer.disposeScene(evalResult.scene);
        }
        for (var name in qtek.Shader.codes) {
            if (name !== 'buildin') {
                delete qtek.Shader.codes[name];
            }
        }

        if (glsl) {
            qtek.Shader.import(glsl);
        }

        var func = new Function('qtek', 'renderer', js);
        evalResult = func(qtek, renderer);
        
        if (evalResult.frame) {
            animation.on('frame', function(frameTime) {
                if (inPlay) {
                    evalResult.frame(frameTime);
                }
            });
        }
    }

    function togglePlay() {
        inPlay = !inPlay;
        if (inPlay) {
            $(this).addClass('pause').removeClass('play');
        } else {
            $(this).removeClass('pause').addClass('play');
        }
    }

    return {
        start: start,

        runCode: runCode
    }
});