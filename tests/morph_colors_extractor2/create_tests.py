import glob
import os.path

# ##################################################################
# Config
# ##################################################################

JSFILES = "results/*.js"
HTMLPATH = "html"

# ##################################################################
# Templates
# ##################################################################

TEMPLATE_HTML = """\
<!DOCTYPE HTML>
<html>
<head>

<title>three.js webgl - %(title)s</title>

<style type="text/css">
body {
    font-family: Monospace;
    background-color: #545454;
    margin: 0px;
    overflow: hidden;
}
</style>

<script type="text/javascript" src="js/Three.js"></script>
<script type="text/javascript" src="js/AnimalRandomSoup.js"></script>
<script type="text/javascript" src="js/Detector.js"></script>
<script type="text/javascript" src="js/RequestAnimationFrame.js"></script>

</head>

<body>

<script>

if ( ! Detector.webgl ) Detector.addGetWebGLMessage();

var container;
var camera, scene, renderer;
var morphObject;

var postprocessing = {};

var SCREEN_HEIGHT = window.innerHeight;
var SCREEN_WIDTH = window.innerWidth;


init();
animate();


function init() {

    container = document.createElement( 'div' );
    document.body.appendChild( container );

    camera = new THREE.Camera( 45, window.innerWidth / window.innerHeight, 1, 2000 );
    camera.position.y = 20;
    camera.position.z = 150;

    scene = new THREE.Scene();

    scene.addLight( new THREE.AmbientLight( 0x333333 ) );

    var light;

    light = new THREE.DirectionalLight( 0xffffff, 1.25 );
    light.position.set( 0, 1, 1 );
    scene.addLight( light );

    renderer = new THREE.WebGLRenderer( { antialias: true, clearColor: 0x545454, clearAlpha: 1 } );
    renderer.setSize( window.innerWidth, window.innerHeight );
    
    renderer.autoClear = false;
    
    container.appendChild( renderer.domElement );

    initPostprocessingNoise( postprocessing );

    var loader = new THREE.JSONLoader();
    loader.load( { model: "../%(fname)s", callback: addAnimal } );

};

function addAnimal( geometry ) {

    morphObject = ROME.Animal( geometry, true );
    
    var mesh = morphObject.mesh;

    mesh.rotation.set( 0, -0.75, 0 );
    //mesh.position.set( 0, -100, 0 );

    mesh.matrixAutoUpdate = false;
    mesh.updateMatrix();
    mesh.update();
    
    scene.addChild( mesh );

    cameraDistance = 500;
    cameraHeight = 100;

    cameraDistance = mesh.boundRadius * 3;
    //cameraHeight = mesh.boundRadius * 0.1;    

    camera.position.set( 0, cameraHeight, cameraDistance );
    camera.target.position.set( 0, 0, 0 );

    var nameA = morphObject.availableAnimals[ 0 ],
        nameB = morphObject.availableAnimals[ 0 ];

    morphObject.play( nameA, nameB );
    morphObject.animalA.timeScale = morphObject.animalB.timeScale = 0.3;

};


var delta, time, oldTime = new Date().getTime();

function updateMorph( delta ) {

    if ( morphObject ) {
        
        THREE.AnimationHandler.update( delta );
        
    }

};

function animate() {

    requestAnimationFrame( animate );
    
    time = new Date().getTime();
    delta = time - oldTime;
    oldTime = time;

    if ( morphObject ) {
    
        //morphObject.mesh.rotation.y += -0.01;
        //morphObject.mesh.updateMatrix();

    }

    updateMorph( delta );
    
    render();

};

function initPostprocessingNoise( effect ) {
    
    effect.type = "noise";
    
    effect.scene = new THREE.Scene();
    
    effect.camera = new THREE.Camera();
    effect.camera.projectionMatrix = THREE.Matrix4.makeOrtho( SCREEN_WIDTH / - 2, SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2, SCREEN_HEIGHT / - 2, -10000, 10000 );
    effect.camera.position.z = 100;
    
    effect.texture = new THREE.WebGLRenderTarget( SCREEN_WIDTH, SCREEN_HEIGHT, { minFilter: THREE.LinearFilter, magFilter: THREE.NearestFilter } );
    effect.texture2 = new THREE.WebGLRenderTarget( SCREEN_WIDTH, SCREEN_HEIGHT, { minFilter: THREE.LinearFilter, magFilter: THREE.NearestFilter } );

    var film_shader = THREE.ShaderUtils.lib["film"];
    var film_uniforms = THREE.UniformsUtils.clone( film_shader.uniforms );
    
    film_uniforms["tDiffuse"].texture = effect.texture;
    
    effect.materialFilm = new THREE.MeshShaderMaterial( { uniforms: film_uniforms, vertexShader: film_shader.vertexShader, fragmentShader: film_shader.fragmentShader } );
    effect.materialFilm.uniforms.grayscale.value = 0;
    
    
    var heatUniforms = {

    "time": { type: "f", value: 0 },
    "map": { type: "t", value: 0, texture: effect.texture },
    "sampleDistance": { type: "f", value: 1 / SCREEN_WIDTH }

    };

    effect.materialHeat = new THREE.MeshShaderMaterial( {

        uniforms: heatUniforms,
        vertexShader: [

            "varying vec2 vUv;",

            "void main() {",

                "vUv = vec2( uv.x, 1.0 - uv.y );",
                "gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",

            "}"

        ].join("\\n"),
        
        fragmentShader: [

				"uniform sampler2D map;",
				"varying vec2 vUv;",

				"void main() {",

					"vec4 color, tmp, add;",
					
					"vec2 uv = vUv + vec2( sin( vUv.y * 100.0 ), sin( vUv.x * 100.0 )) * 0.0005;",
					
					"color = texture2D( map, uv );",

					"add = tmp = texture2D( map, uv + vec2( 0.0015, 0.0015 ));", 
					"if( tmp.r > color.r ) color = tmp;",

					"add += tmp = texture2D( map, uv + vec2( -0.0015, 0.0015 ));",
					"if( tmp.r > color.r ) color = tmp;",

					"add += tmp = texture2D( map, uv + vec2( -0.0015, -0.0015 ));",
					"if( tmp.r > color.r ) color = tmp;",

					"add += tmp = texture2D( map, uv + vec2( 0.0015, -0.0015 ));",
					"if( tmp.r > color.r ) color = tmp;",

					"add += tmp = texture2D( map, uv + vec2( 0.002, 0.0 ));",
					"if( tmp.r > color.r ) color = tmp;",

					"add += tmp = texture2D( map, uv + vec2( -0.002, 0.0 ));",
					"if( tmp.r > color.r ) color = tmp;",

					"add += tmp = texture2D( map, uv + vec2( 0, 0.002 ));",
					"if( tmp.r > color.r ) color = tmp;",

					"add += tmp = texture2D( map, uv + vec2( 0, -0.002 ));",
					"if( tmp.r > color.r ) color = tmp;",

					"uv = (uv - vec2(0.5)) * vec2(0.7);",
					"gl_FragColor = vec4(mix(color.rgb * color.rgb * vec3(1.8), color.ggg * color.ggg - vec3(0.4), vec3(dot(uv, uv))), 1.0);",
					
				"}"

            ].join("\\n")

    } );
    
    effect.quad = new THREE.Mesh( new THREE.Plane( SCREEN_WIDTH, SCREEN_HEIGHT ), effect.materialFilm );
    effect.quad.position.z = -500;
    effect.scene.addObject( effect.quad );

}

function render() {

    renderer.clear();

    renderer.render( scene, camera, postprocessing.texture, true );

    postprocessing.materialFilm.uniforms.time.value += 0.01 * delta;
    postprocessing.materialHeat.uniforms.time.value += 0.01 * delta;

    // HEAT => NOISE
    
    postprocessing.quad.materials[ 0 ] = postprocessing.materialHeat;
    postprocessing.materialHeat.uniforms.map.texture = postprocessing.texture;

    renderer.render( postprocessing.scene, postprocessing.camera );
    //renderer.render( postprocessing.scene, postprocessing.camera, postprocessing.texture2 );
    
    postprocessing.quad.materials[ 0 ] = postprocessing.materialFilm;
    postprocessing.materialFilm.uniforms.tDiffuse.texture = postprocessing.texture2;

}

</script>
</body>

</html>
"""

TEMPLATE_HTML_INDEX = """\
<!DOCTYPE HTML>
<html>
<head>

<title>rome - animals</title>

<style type="text/css">
body {
    
    background-color: #545454;
    margin: 0px;
    padding: 1em;
    text-align:left;

}
a { color:#fff; font-size:1.25em; text-decoration:none }

#links { float:left; width:9%% }
#animals { border: 0; float:left; width:90%%; height:95%%; background:#545454 }
</style>

</head>

<body>

<div id="links">
%(links)s
</div>

<iframe id="animals"></iframe>

</body>

</html>
"""

TEMPLATE_LINK = """<a href="#" onclick="document.getElementById('animals').src = '%s.html';">%s</a>"""

# ##################################################################
# Utils
# ##################################################################

def write_file(name, content):
    f = open(name, "w")
    f.write(content)
    f.close()

# ##################################################################
# Main
# ##################################################################

if __name__ == "__main__":

    jsfiles = sorted(glob.glob(JSFILES))
    
    links = []
    
    for jsname in jsfiles:

        fname = os.path.splitext(jsname)[0]
        bname = os.path.basename(fname)        

        htmlname = "%s.html" % bname
        htmlpath = os.path.join(HTMLPATH, htmlname)

        content = TEMPLATE_HTML % { 
        "fname"	: jsname.replace("\\","/"),
        "title"	: bname
        }
        
        write_file(htmlpath, content)
        
        links.append( bname )
        
    
    links_string = TEMPLATE_HTML_INDEX % {
    
    "links" : "<br/>".join(TEMPLATE_LINK % (x, x) for x in links)
    
    }
    
    linkspath = os.path.join(HTMLPATH, "index.html")
    write_file( linkspath, links_string )