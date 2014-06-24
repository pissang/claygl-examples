define(function(require) {

    /**
     * Template code showed in editor
     */
    var templateCode = require('text!./template.essl');

    function start() {
        
        glslEditor.editor = ace.edit('editor-glsl');

        glslEditor.editor.setTheme('ace/theme/twilight');
        glslEditor.editor.getSession().setMode('ace/mode/glsl');

        glslEditor.setCode(templateCode);
    }

    var glslEditor = {

        start: start,

        editor: null,

        getCode: function() {
            return glslEditor.editor.getValue();
        },

        setCode: function(code) {
            glslEditor.editor.setValue(code, -1);
        },

        resize: function() {
            glslEditor.editor.resize();
        }
    }

    return glslEditor;
});