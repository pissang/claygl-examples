define(function(require) {

    var qtek = require('qtek');

    var renderer;
    var animation = new qtek.animation.Animation();

    var result;

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

        resize();

        animation.start();
    }

    function runCode(js, glsl) {
        // Dispose previous
        animation.off('frame');
        if (result) {
            renderer.disposeScene(result.scene);
        }

        var func = new Function('qtek', 'renderer', js);
        result = func(qtek, renderer);
        
        if (result.frame) {
            animation.on('frame', result.frame);
        }
    }

    return {
        start: start,

        runCode: runCode
    }
});