// TODO 
//  + Code snippet
//  + Partial evaluate
define(function(require) {

    var qtek = require('qtek');

    var jsEditor = require('./jsEditor');
    var glslEditor = require('./glslEditor');
    var preview = require('./preview');

    function start() {
        jsEditor.start();
        glslEditor.start();
        preview.start();

        $('#run-code').bind('click', runCode);

        enableEditorTab();
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
            $('#' + $this.data('tab')).show();
        });
    }

    function runCode() {
        var jsCode = jsEditor.getCode();

        preview.runCode(jsCode);
    }

    return {
        start: start
    }
});