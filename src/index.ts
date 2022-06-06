import * as THREE from 'three'
import { Shape, Vector2, Vector3 } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { setQuaternionFromProperEuler } from 'three/src/math/MathUtils';

//---- init ----
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x8FBCD4);

const camera = new THREE.PerspectiveCamera(
  70, window.innerWidth / window.innerHeight, 0.01, 200
);
camera.position.x = 0;
camera.position.y = 0;
camera.position.z = 80;
camera.lookAt (new Vector3(0,0,0));
scene.add(camera);

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setAnimationLoop(animation)
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls( camera, renderer.domElement );
controls.autoRotate = false;
controls.enablePan = true;

const lineMaterial = new THREE.LineBasicMaterial({
  color: 0x0000ff
});


////example shape
// const heartShape = new THREE.Shape();
// heartShape.moveTo( 25, 25 );
// heartShape.bezierCurveTo( 25, 25, 20, 0, 0, 0 );
// heartShape.bezierCurveTo( - 30, 0, - 30, 35, - 30, 35 );
// heartShape.bezierCurveTo( - 30, 55, - 10, 77, 25, 95 );
// heartShape.bezierCurveTo( 60, 77, 80, 55, 80, 35 );
// heartShape.bezierCurveTo( 80, 35, 80, 0, 50, 0 );
// heartShape.bezierCurveTo( 35, 0, 25, 25, 25, 25 );

class BubbleSeed {
  x: number;
  y: number;
  r: number;
  pos: THREE.Vector2
  constructor(x:number, y:number, r=5){
    this.x = x
    this.y = y
    this.r = r; 
    this.pos = new THREE.Vector2(x,y)
  }

  get size(): number {
    return this.r;
  }
}

  /*
  explanation http://jamie-wong.com/2014/08/19/metaballs-and-marching-squares/ 
  implementation https://openprocessing.org/sketch/375385 
  */
class MetaSquare{
  cellNum:number
  cellSize:number
  cells: number[][]
  seeds: Array<BubbleSeed>
  threshold:number 
  segments: THREE.Vector2[][]
  vertices: Array<THREE.Vector2>

  constructor( _seeds: Array<BubbleSeed> ){
    this.cellNum = 30
    this.cellSize = 3
    this.cells = [...Array(this.cellNum+1)].map(e => Array(this.cellNum+1).fill(0))
    this.seeds = _seeds 
    this.threshold = 1.01
    this.segments = new Array<THREE.Vector2[]>()
    this.vertices=  new Array<THREE.Vector2>()
  }

  calculate():void{
    let x1: number, y1: number, x2: number, y2: number;
    for (var y:number = 0; y < this.cellNum +1; y++){
      for(var x:number = 0; x < this.cellNum + 1; x++){
        for(let s of this.seeds){
          this.cells[x][y] += s.r/ s.pos.distanceTo( new THREE.Vector2(x*this.cellSize, y*this.cellSize))
        }
      }
    } 

    for (var y:number = 0; y < this.cellNum; y++){
      for(var x:number = 0; x < this.cellNum; x++){
        let state:number =  (this.cells[x][y + 1] >= this.threshold ? 1: 0)
        + Math.pow(this.cells[x + 1][y + 1] >= this.threshold ? 2: 0, 1)
        + Math.pow(this.cells[x + 1][y] >= this.threshold ? 2: 0, 2)
        + Math.pow(this.cells[x][y] >= this.threshold ? 2: 0, 3);
        // console.log(x,y,state)
        let c:THREE.Vector2 = new THREE.Vector2(this.cellSize * x, this.cellSize * y)
        switch(state){
          case 0:
            break;
          case 1:
          case 14: 
            x1 = c.x;
            y1 = c.y + this.cellSize * ((this.threshold- this.cells[x][y]) / (this.cells[x][y + 1] -this.cells[x][y]));
            x2 = c.x +this.cellSize * ((this.threshold-this.cells[x][y + 1]) / (this.cells[x + 1][y + 1] -this.cells[x][y + 1]));
            y2 = c.y +this.cellSize;
             this.addSegment(x1, y1, x2, y2);
            break;
          case 2:
          case 13:
            x1 = c.x +this.cellSize;
            y1 = c.y +this.cellSize * ((this.threshold-this.cells[x + 1][y]) / (this.cells[x + 1][y + 1] - this.cells[x + 1][y]));
            x2 = c.x + this.cellSize * ((this.threshold- this.cells[x][y + 1]) / (this.cells[x + 1][y + 1] - this.cells[x][y + 1]));
            y2 = c.y + this.cellSize;
             this.addSegment(x1, y1, x2, y2);  
            break;
          case 3:
          case 12:
            x1 = c.x;
            y1 = c.y + this.cellSize * ((this.threshold- this.cells[x][y]) / (this.cells[x][y + 1] - this.cells[x][y]));
            x2 = c.x + this.cellSize;
            y2 = c.y + this.cellSize * ((this.threshold- this.cells[x + 1][y]) / (this.cells[x + 1][y + 1] - this.cells[x + 1][y]));
             this.addSegment(x1, y1, x2, y2);  
            break;
          case 4:
          case 11:
            x1 = c.x + this.cellSize * ((this.threshold- this.cells[x][y]) / (this.cells[x + 1][y] - this.cells[x][y]));
            y1 = c.y;
            x2 = c.x + this.cellSize;
            y2 = c.y + this.cellSize * ((this.threshold- this.cells[x + 1][y]) / (this.cells[x + 1][y + 1] - this.cells[x + 1][y]));
             this.addSegment(x1, y1, x2, y2);  
            break;
          case 5:
            x1 = c.x + this.cellSize * ((this.threshold- this.cells[x][y]) / (this.cells[x + 1][y] - this.cells[x][y]));
            y1 = c.y;
            x2 = c.x;
            y2 = c.y + this.cellSize * ((this.threshold- this.cells[x][y]) / (this.cells[x][y + 1] - this.cells[x][y]));
             this.addSegment(x1, y1, x2, y2);  
            x1 = c.x + this.cellSize;
            y1 = c.y + this.cellSize * ((this.threshold- this.cells[x + 1][y]) / (this.cells[x + 1][y + 1] - this.cells[x + 1][y]));
            x2 = c.x + this.cellSize * ((this.threshold- this.cells[x][y + 1]) / (this.cells[x + 1][y + 1] - this.cells[x][y + 1]));
            y2 = c.y + this.cellSize;
             this.addSegment(x1, y1, x2, y2);  
            break;
          case 6:
          case 9:
            x1 = c.x + this.cellSize * ((this.threshold- this.cells[x][y]) / (this.cells[x + 1][y] - this.cells[x][y]));
            y1 = c.y;
            x2 = c.x + this.cellSize * ((this.threshold- this.cells[x][y + 1]) / (this.cells[x + 1][y + 1] - this.cells[x][y + 1]));
            y2 = c.y + this.cellSize;
             this.addSegment(x1, y1, x2, y2);  
            break;
          case 7:
          case 8:
            x1 = c.x + this.cellSize * ((this.threshold- this.cells[x][y]) / (this.cells[x + 1][y] - this.cells[x][y]));
            y1 = c.y;
            x2 = c.x;
            y2 = c.y + this.cellSize * ((this.threshold- this.cells[x][y]) / (this.cells[x][y + 1] - this.cells[x][y]));
             this.addSegment(x1, y1, x2, y2);  
            break;    
          case 10:
            x1 = c.x + this.cellSize * ((this.threshold- this.cells[x][y]) / (this.cells[x + 1][y] - this.cells[x][y]));
            y1 = c.y;
            x2 = c.x + this.cellSize;
            y2 = c.y + this.cellSize * ((this.threshold- this.cells[x + 1][y]) / (this.cells[x + 1][y + 1] - this.cells[x + 1][y]));
             this.addSegment(x1, y1, x2, y2);  
            x1 = c.x;
            y1 = c.y + this.cellSize * ((this.threshold- this.cells[x][y]) / (this.cells[x][y + 1] - this.cells[x][y]));
            x2 = c.x + this.cellSize * ((this.threshold- this.cells[x][y + 1]) / (this.cells[x + 1][y + 1] - this.cells[x][y + 1]));
            y2 = c.y + this.cellSize;
            this.addSegment(x1, y1, x2, y2);
            break;
          case 15:
            break;      
        }
      }
    }
  }

  addSegment(x1:number,y1:number,x2:number, y2:number ):void{

    const points = [new THREE.Vector2(x1,y1), new THREE.Vector2(x2,y2)]
    this.segments.push(points)

  }

  drawLine():void{
  
    // const pointA = new THREE.Vector2(1,10)
    // const pointB = new THREE.Vector2(1,10)
    // this.vertices.push(pointA)

    // console.log(this.vertices.includes(pointA)) //true 
    // console.log(this.vertices.includes(pointB)) //false 

    console.log("total segements", this.segments.length)
    for (let s of this.segments){
      const pointA:THREE.Vector2 = s[0]
      const pointB:THREE.Vector2 = s[1]
      if (this.vertices.includes(pointA)&&this.vertices.includes(pointB))
      {
        // add the points to a closed contour 
        for (let v of this.vertices){
          
        }
        //delete the vertices that are added 

        break;
      }
      else if( this.vertices.includes(pointA)){
        //A is the first point in the array
        if(this.vertices.indexOf(pointA)==0){
          this.vertices.unshift(pointB)
        }else{
          //A is the last point. Just add B to the last
          this.vertices.push(pointB)
        }
        //todo: check for end of loop?

      }else if(this.vertices.includes(pointB)){//A is not yet in the array, try look for B 
          if(this.vertices.indexOf(pointB)==0){
            //add A to the last
            this.vertices.push(pointA)
          }
          else{
            //add A to the first
            this.vertices.unshift(pointA)
          }
        }
        else{
          //A and B are both new. Add both points.
          this.vertices.push(pointA)
          this.vertices.push(pointB)
        }
    }
    console.log("total vertices", this.vertices.length)
    
    const geometry = new THREE.BufferGeometry().setFromPoints( this.vertices );  
    const line = new THREE.Line( geometry, lineMaterial );
    scene.add( line );
  }
  update():void{ 

  }
}
//setup 
let bubbleSeeds: Array<BubbleSeed>
bubbleSeeds = [
  new BubbleSeed(15,30,1.4),
  new BubbleSeed(25,20),
  new BubbleSeed(16,20,2),
  new BubbleSeed(6,5,3),
  new BubbleSeed(4,15,1),
];

let metaSquare = new MetaSquare(bubbleSeeds) 
metaSquare.calculate()
metaSquare.drawLine()

//go through seeds and add extruded circles 
let cShape: Shape = new THREE.Shape()
var mesh = new THREE.Mesh()
var scale 
var totalStep =1; 
for (let step: number =0; step < totalStep; step++ ){
  scale = 1 - step*.1; 
  for( let i: number = 0; i < bubbleSeeds.length; i++){
    // cShape.moveTo(seedPoints[i].x,seedPoints[i].y);
    // console.log(step,i)
    cShape.absarc(bubbleSeeds[i].x,bubbleSeeds[i].y,bubbleSeeds[i].r*scale,0,Math.PI*2,true);
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

