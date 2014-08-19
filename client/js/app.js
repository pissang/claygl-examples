// TODO 
//  + Code snippet
//  + Partial evaluate
define(function(require) {

    var qtek = require('qtek');
    var etpl = require('etpl');

    var jsEditor = require('./jsEditor');
    var glslEditor = require('./glslEditor');
    var preview = require('./preview');
    var statistics = require('./statistics');

    etpl.compile(require('text!html/editor.html'));
    etpl.compile(require('text!html/preview.html'));

    var renderApp = etpl.compile(require('text!html/app.html'));
    var renderExamples = etpl.compile(require('text!html/examples.html'));

    var exampleList = JSON.parse(require('text!examples/examples.json'));

    function start() {

        document.getElementById('container').innerHTML = renderApp();

        jsEditor.start();
        glslEditor.start();
        preview.start();
        statistics.start();

        $('#run-code').bind('click', runCode);

        enableEditorTab();

        prepareExamples();

        runCode();
    }

    function enableEditorTab() {
        // Code editor tabs
        var $items = $('.main.menu>.item');
        var $editorJS = $("#editor-js");
        var $editorGLSL = $("#editor-glsl").hide();
        $items.click(function() {
            var $this = $(this);
            $items.removeClass('active');
            $this.addClass('active');

            $editorJS.hide();
            $editorGLSL.hide();

            if ($this.data('tab') == 'editor-js') {
                $editorJS.show();
                jsEditor.resize();
            } else {
                $editorGLSL.show();
                glslEditor.resize();
            }
        });
    }

    function prepareExamples() {
        var $examples = $(renderExamples({
            examples: exampleList
        }));
        $('#open-examples').click(function() {
            $examples.modal('show');
        });

        $examples.delegate('.example.item', 'click', openExample);
    }

    function openExample() {
        var path = $(this).data('path');

        var tasks = qtek.async.Task.makeRequestTask([path + '.js', path + '.essl']);
        var group = new qtek.async.TaskGroup();
        group.all(tasks)
            .success(function(res) {
                var jsCode = res[0];
                var glslCode = res[1];

                jsEditor.setCode(jsCode);
                glslEditor.setCode(glslCode);

                preview.runCode(jsCode, glslCode);
                $("#examples").modal('hide');

            }).error(function() {
                console.error("Load error");
            })
    }

    function runCode() {
        var jsCode = jsEditor.getCode();
        var glslCode = glslEditor.getCode();

        preview.runCode(jsCode, glslCode);
    }

    return {
        start: start
    }
});