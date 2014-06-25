define(function(require) {

    var etpl = require('etpl');
    /**
     * Template code showed in editor
     */
    var templateCode = require('text!./template.js');

    function start() {
        
        jsEditor.editor = ace.edit('editor-js');

        jsEditor.editor.setTheme('ace/theme/twilight');
        jsEditor.editor.getSession().setMode('ace/mode/javascript');

        jsEditor.setCode(templateCode);
    }

    var jsEditor = {

        start: start,

        editor: null,

        getCode: function() {
            return jsEditor.editor.getValue();
        },

        setCode: function(code) {
            jsEditor.editor.setValue(code, -1);
        },

        resize: function() {
            jsEditor.editor.resize();
        }
    }

    return jsEditor;
});