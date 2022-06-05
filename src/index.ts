import * as THREE from 'three'
import { Shape, Vector2, Vector3 } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { setQuaternionFromProperEuler } from 'three/src/math/MathUtils';

// init
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x8FBCD4);

const camera = new THREE.PerspectiveCamera(
  70, window.innerWidth / window.innerHeight, 0.01, 300
);
camera.position.x = 50;
camera.position.y = -90;
camera.position.z = 150;
camera.lookAt (new Vector3(0,0,0));
scene.add(camera);

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setAnimationLoop(animation)
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls( camera, renderer.domElement );
controls.autoRotate = true;
controls.enablePan = false;

////example shape
// const heartShape = new THREE.Shape();
// heartShape.moveTo( 25, 25 );
// heartShape.bezierCurveTo( 25, 25, 20, 0, 0, 0 );
// heartShape.bezierCurveTo( - 30, 0, - 30, 35, - 30, 35 );
// heartShape.bezierCurveTo( - 30, 55, - 10, 77, 25, 95 );
// heartShape.bezierCurveTo( 60, 77, 80, 55, 80, 35 );
// heartShape.bezierCurveTo( 80, 35, 80, 0, 50, 0 );
// heartShape.bezierCurveTo( 35, 0, 25, 25, 25, 25 );

//todo make a class 
//x,y,r instead of xyz
let seedPoints: Array<Vector3>;
seedPoints = [
  new THREE.Vector3(0,0,12),
  new THREE.Vector3(15,10,5),
  new THREE.Vector3(-27,5,8),
];


//QUESTION
/*
?extra arcs 
? extra lines
1.a. how to best structure the bubble class? 
  seed, bubble, layer freeze 
  editing: move the seeds , change elasticity, amount 
  b. three js: calculate mesh and render 
2. typescript-fy code? 

*/



//go through seeds and add extruded circles 
let cShape: Shape = new THREE.Shape()
var mesh = new THREE.Mesh()
var scale 
var totalStep =5; 
for (let step: number =0; step < totalStep; step++ ){
  scale = 1 - step*.1; 
  for( let i: number = 0; i < seedPoints.length; i++){
    // cShape.moveTo(seedPoints[i].x,seedPoints[i].y);
    // console.log(step,i)
    cShape.absarc(seedPoints[i].x,seedPoints[i].y,seedPoints[i].z*scale,0,Math.PI*2,true);
    mesh =ExtrudeRoundCorner(cShape);
    mesh.position.z= step*-7;
    scene.add(mesh);
    
  }
  
}

function ExtrudeRoundCorner(_shape:Shape ) {

  const extrudeSettings = {
    steps: 1,
    depth: 0,
    bevelEnabled: true,
    bevelThickness: 1,
    bevelSize: 1,
    bevelOffset: 0,
    bevelSegments: 7  //smooth curved extrusion
  };

  const geometry = new THREE.ExtrudeGeometry(_shape, extrudeSettings);
  const material = new THREE.MeshNormalMaterial();

  return  new THREE.Mesh(geometry, material);;
}

const axesHelper = new THREE.AxesHelper( 10 );
scene.add( axesHelper );

window.addEventListener('resize', onWindowResize);

// animation

function animation(time: number) {

  // mesh.rotation.x = time / 2000
  // mesh.rotation.y = time / 2000

  renderer.render(scene, camera)


}


function onWindowResize() {

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);

}