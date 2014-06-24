define(function(require) {

    function start() {
        
        glslEditor.editor = ace.edit('editor-glsl');

        glslEditor.editor.setTheme('ace/theme/twilight');
        glslEditor.editor.getSession().setMode('ace/mode/glsl');
    }

    var glslEditor = {

        start: start,

        editor: null,

        getCode: function() {
            return glslEditor.editor.getValue();
        },

        setCode: function(code) {
            
        }
    }

    return glslEditor;
});