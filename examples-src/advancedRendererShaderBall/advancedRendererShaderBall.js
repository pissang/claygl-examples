var BALL_GAP = 3;
var BALL_COUNT = 10;
var MID_BALL = Math.floor(BALL_COUNT / 2);

var materials = [{
    diffuseMap: 'bamboo-wood-semigloss/bamboo-wood-semigloss-albedo.jpg',
    normalMap: 'bamboo-wood-semigloss/bamboo-wood-semigloss-normal.jpg',
    roughnessMap: 'bamboo-wood-semigloss/bamboo-wood-semigloss-roughness.jpg'
}, {
    diffuseMap: 'bathroomtile2/bathroomtile2-basecolor.jpg',
    normalMap: 'bathroomtile2/bathroomtile2-normal-dx.jpg',
    roughnessMap: 'bathroomtile2/bathroomtile2-roughness.jpg'
}, {
    diffuseMap: 'copper-rock1/copper-rock1-alb.jpg',
    normalMap: 'copper-rock1/copper-rock1-normal.jpg',
    parallaxOcclusionMap: 'copper-rock1/copper-rock1-height.jpg',
    metalnessMap: 'copper-rock1/copper-rock1-metal.jpg'
}, {
    diffuseMap: 'octostone/octostoneAlbedo.jpg',
    normalMap: 'octostone/octostoneNormalc.jpg',
    parallaxOcclusionMap: 'octostone/octostoneHeightc.jpg',
    metalnessMap: 'octostone/octostoneRoughness2.jpg'
}, {
    diffuseMap: 'slipperystonework/slipperystonework-albedo.jpg',
    normalMap: 'slipperystonework/slipperystonework-normal.jpg',
    parallaxOcclusionMap: 'slipperystonework/slipperystonework-height.jpg'
}, {
    diffuseMap: 'old-textured-fabric/old-textured-fabric-albedo3.jpg',
    normalMap: 'old-textured-fabric/old-textured-fabric-normal.jpg',
    roughnessMap: 'old-textured-fabric/old-textured-fabric-roughness2.jpg'
}];

function setPBRTextures(app, rootNode, materialCfg) {
    var keys = Object.keys(materialCfg).filter(function (key) {
        return typeof materialCfg[key] === 'string';
    });
    return Promise.all(keys.map(function (key) {
        return app.loadTexture('../assets/textures/pbr/' + materialCfg[key], {
            anisotropic: 8
        });
    })).then(function (textures) {
        rootNode.traverse(function (mesh) {
            if (mesh.material && (mesh.material.name === 'lambert6' || mesh.material.name === 'lambert3' || mesh.material.name === 'lambert5')) {
                for (var i = 0; i < keys.length; i++) {
                    mesh.material.set(keys[i], textures[i]);
                }
                if (materialCfg.roughnessMap) {
                    mesh.material.set('roughness', 0.5);
                }
                else {
                    mesh.material.set('roughness', materialCfg.roughness == null ? 0.5 : materialCfg.roughness);
                }
                if (materialCfg.metalnessMap) {
                    mesh.material.set('metalness', 0.5);
                }
                else {
                    mesh.material.set('metalness', materialCfg.metalness == null ? 0 : materialCfg.metalness);
                }
            }
        });
    });
}

var app = clay.application.create('#viewport', {

    autoRender: false,

    devicePixelRatio: 1,

    _currentTargetBall: MID_BALL,

    init: function (app) {

        var adr = this._advancedRenderer = new ClayAdvancedRenderer(app.renderer, app.scene, app.timeline, {
            shadow: {
                enable: true
            },
            temporalSuperSampling: {
                enable: true
            },
            postEffect: {
                bloom: {
                    enable: false
                },
                screenSpaceAmbientOcclusion: {
                    temporalFilter: false,
                    enable: true,
                    radius: 0.2,
                    intensity: 1.2
                },
                screenSpaceReflection: {
                    enable: true
                }
            }
        });

        app.createAmbientCubemapLight('../assets/textures/hdr/pisa.hdr', 0.2, 0.8, 3).then(function (result) {
            adr.render();
        });

        // Create lights
        var light = app.createDirectionalLight([-1, -2, -1], '#fff', 1);
        light.shadowResolution = 2048;

        this._camera = app.createCamera([0, 3, 5], [0, 1, 0]);

        this._initKeyboardControl();

        var ground = app.createPlane({
            color: '#333',
            roughness: 0.7
        });
        ground.scale.set(40, 20, 1);
        ground.rotation.rotateX(-Math.PI / 2);
        ground.castShadow = false;

        // Load model.
        return app.loadModel('../assets/models/shaderBall/shaderBall.gltf').then(function (result) {
            result.rootNode.scale.set(0.01, 0.01, 0.01);
            result.rootNode.traverse(function (mesh) {
                if (mesh.geometry) {
                    mesh.geometry.generateTangents();
                }
            });
            // Clone more node
            for (var i = 0; i < BALL_COUNT - 1; i++) {
                var clonedNode = app.cloneNode(result.rootNode);
                clonedNode.position.x = (i - MID_BALL) * BALL_GAP;
                setPBRTextures(app, clonedNode, materials[i % materials.length]);
            }
            result.rootNode.position.x = (BALL_COUNT - 1 - MID_BALL) * BALL_GAP;
            adr.render();
        });

    },

    loop: function (app) {},

    _initKeyboardControl: function () {
        var self = this;
        document.body.addEventListener('keydown', function (e) {
            switch (e.keyCode) {
                case 39:
                    self._moveCameraToRight();
                    break;
                case 37:
                    self._moveCameraToLeft();
                    break;
            }
        });
    },
    _moveCameraToRight: function () {
        this._moveCameraTo(this._currentTargetBall + 1);
    },
    _moveCameraToLeft: function () {
        this._moveCameraTo(this._currentTargetBall - 1);
    },

    _moveCameraTo: function (ballIdx) {
        if (ballIdx >= BALL_COUNT || ballIdx <= 0) {
            return;
        }

        if (this._cameraAnimator) {
            this._cameraAnimator.stop();
        }
        var targetX = (ballIdx - MID_BALL) * BALL_GAP;
        var self = this;
        this._cameraAnimator = app.timeline.animate(this._camera.position)
            .when(2000, {
                x: targetX
            })
            .during(function () {
                self._advancedRenderer.render();
            })
            .start('cubicInOut');

        this._currentTargetBall = ballIdx;
    }
});