import * as THREE from 'three'
import { Shape, Vector2, Vector3 } from 'three';
import { setQuaternionFromProperEuler } from 'three/src/math/MathUtils';

// init
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x8FBCD4);

const camera = new THREE.PerspectiveCamera(
  70, window.innerWidth / window.innerHeight, 0.01, 300
);
camera.position.z = 150;
scene.add(camera);

////example shape
// const heartShape = new THREE.Shape();
// heartShape.moveTo( 25, 25 );
// heartShape.bezierCurveTo( 25, 25, 20, 0, 0, 0 );
// heartShape.bezierCurveTo( - 30, 0, - 30, 35, - 30, 35 );
// heartShape.bezierCurveTo( - 30, 55, - 10, 77, 25, 95 );
// heartShape.bezierCurveTo( 60, 77, 80, 55, 80, 35 );
// heartShape.bezierCurveTo( 80, 35, 80, 0, 50, 0 );
// heartShape.bezierCurveTo( 35, 0, 25, 25, 25, 25 );

////example rect 
// var pts = [
// 	new THREE.Vector3(-2, 0, -2),
// 	new THREE.Vector3(0, 0, -2),
// 	new THREE.Vector3(0, 0, 0),
//   new THREE.Vector3(-2, 0, 0)
// ];
// var ptsShape = pts.map( p => {return new THREE.Vector2(p.x, -p.z)}); //QUESTION
// // console.log(ptsShape);
// var rect = new THREE.Shape(ptsShape);

//example circle 
// const circleShape = new THREE.Shape();
// circleShape.absarc(0,0,10,0,Math.PI*2,true);
// const mesh = ExtrudeRoundCorner(circleShape);
// scene.add(mesh);

//x,y,r instead of xyz
let seedPoints: Array<Vector3>;
seedPoints = [
  new THREE.Vector3(0,0,12),
  new THREE.Vector3(15,10,5),
  new THREE.Vector3(-10,-5,8),
];

//QUESTION
var cShape = new THREE.Shape();
for( let i = 0; i < seedPoints.length; i++){
  cShape.moveTo(seedPoints[i].x,seedPoints[i].y);
  cShape.absarc(seedPoints[i].x,seedPoints[i].y,seedPoints[i].z,0,Math.PI*2,true);
  scene.add(ExtrudeRoundCorner(cShape));
}

function ExtrudeRoundCorner(_shape:Shape ) {

  const extrudeSettings = {
    steps: 2,
    depth: 0,
    bevelEnabled: true,
    bevelThickness: 1,
    bevelSize: 1,
    bevelOffset: 0,
    bevelSegments: 7  //smooth curved extrusion
  };

  const geometry = new THREE.ExtrudeGeometry(_shape, extrudeSettings);
  const material = new THREE.MeshNormalMaterial();
  const mesh = new THREE.Mesh(geometry, material);
  return mesh;
}

const axesHelper = new THREE.AxesHelper( 10 );
scene.add( axesHelper );

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setAnimationLoop(animation)
document.body.appendChild(renderer.domElement)

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