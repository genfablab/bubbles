import * as THREE from 'three'

// init

const scene = new THREE.Scene()
scene.background = new THREE.Color( 0x8FBCD4 );

const camera = new THREE.PerspectiveCamera( 
  70, window.innerWidth / window.innerHeight, 0.01, 10 
);
camera.position.z = 2;
scene.add(camera);

// scene.add( new THREE.AmbientLight( 0x8FBCD4, 0.4 ) );
// const pointLight = new THREE.PointLight( 0xffffff, 1 );
// camera.add( pointLight );

const geometry = new THREE.BoxGeometry( 0.2, 0.2, 0.2 )
const material = new THREE.MeshNormalMaterial()

const mesh = new THREE.Mesh( geometry, material )
scene.add( mesh )

const renderer = new THREE.WebGLRenderer( { antialias: true } )
renderer.setPixelRatio( window.devicePixelRatio );
renderer.setSize( window.innerWidth, window.innerHeight )
renderer.setAnimationLoop( animation )
document.body.appendChild( renderer.domElement )

window.addEventListener( 'resize', onWindowResize );

// animation

function animation( time: number ) {

  mesh.rotation.x = time / 2000
  mesh.rotation.y = time / 1000

  renderer.render( scene, camera )

  
}


function onWindowResize() {

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize( window.innerWidth, window.innerHeight );

}