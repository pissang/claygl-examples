define(function(require) {

/**
 * Template code showed in editor
 */
var templateCode = function() {
var scene = new qtek.Scene();
var camera = new qtek.camera.Perspective({
    aspect: renderer.width / renderer.height
});
camera.position.z = 4;

return {
    scene: scene,
    camera: camera,
    frame: function(frameTime) {
        renderer.render(scene, camera);
    },
    dispose: function(){}
}
}

    function start() {
        
        jsEditor.editor = ace.edit('editor-js');

        jsEditor.editor.setTheme('ace/theme/twilight');
        jsEditor.editor.getSession().setMode('ace/mode/javascript');

        jsEditor.setCode(templateCode.toString().replace(/^[^{]*{\s*/,'').replace(/\s*}[^}]*$/,''));
    }

    var jsEditor = {

        start: start,

        editor: null,

        getCode: function() {
            return jsEditor.editor.getValue();
        },

        setCode: function(code) {
            jsEditor.editor.setValue(code, -1);
        }
    }

    return jsEditor;
});