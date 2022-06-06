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
camera.lookAt(new Vector3(0, 0, 0));
scene.add(camera);

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setAnimationLoop(animation)
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement);
controls.autoRotate = false;
controls.enablePan = true;

const lineMaterialSeg = new THREE.LineBasicMaterial({
  color: 0xff0000
});
const lineMaterial = new THREE.LineBasicMaterial({
  color: 0x0000ff
});

class BubbleSeed {
  x: number;
  y: number;
  r: number;
  pos: THREE.Vector2
  constructor(x: number, y: number, r = 5) {
    this.x = x
    this.y = y
    this.r = r;
    this.pos = new THREE.Vector2(x, y)
  }

  get size(): number {
    return this.r
  }
}

class Loop{
  vertices: number[][]
  tail: string 
  isClosed: boolean
  constructor(){
    this.vertices =[]
    this.isClosed = false 
  }
  addVertex( newPoint:number[]){
    this.vertices.push(newPoint)
    this.tail = newPoint.toString() 
    if (this.vertices.length > 2 && this.tail == this.vertices[0].toString()){
      console.log("loop closed")
      this.isClosed = true 
    }
  }
  tailMatches( newPoint: number[]): boolean{
    return (newPoint.toString()== this.tail)
  }
}
/*
explanation http://jamie-wong.com/2014/08/19/metaballs-and-marching-squares/ 
implementation https://openprocessing.org/sketch/375385 
*/
class MetaSquare {
  cellNum: number
  cellSize: number
  cells: number[][]
  seeds: Array<BubbleSeed>
  threshold: number
  segments: number[][][]
  loops: Array<Loop>
  // vertices: Array<THREE.Vector2>

  constructor(_seeds: Array<BubbleSeed>) {
    //100 1 
    this.cellNum = 90
    this.cellSize = 0.5
    this.cells = [...Array(this.cellNum + 1)].map(e => Array(this.cellNum + 1).fill(0))
    this.seeds = _seeds
    this.threshold = 0.9
    this.segments = []
    this.loops = []
  }

  calculateSegments(): void {
    let x1: number, y1: number, x2: number, y2: number
    for (var y: number = 0; y < this.cellNum + 1; y++) {
      for (var x: number = 0; x < this.cellNum + 1; x++) {
        for (let s of this.seeds) {
          this.cells[x][y] += s.r / s.pos.distanceTo(new THREE.Vector2(x * this.cellSize, y * this.cellSize))
        }
      }
    }

    for (var y: number = 0; y < this.cellNum; y++) {
      for (var x: number = 0; x < this.cellNum; x++) {
        let state: number = (this.cells[x][y + 1] >= this.threshold ? 1 : 0)
          + Math.pow(this.cells[x + 1][y + 1] >= this.threshold ? 2 : 0, 1)
          + Math.pow(this.cells[x + 1][y] >= this.threshold ? 2 : 0, 2)
          + Math.pow(this.cells[x][y] >= this.threshold ? 2 : 0, 3)
        // console.log(x,y,state)
        let c: THREE.Vector2 = new THREE.Vector2(this.cellSize * x, this.cellSize * y)
        switch (state) {
          case 0:
            break
          case 1:
          case 14:
            x1 = c.x
            y1 = c.y + this.cellSize * ((this.threshold - this.cells[x][y]) / (this.cells[x][y + 1] - this.cells[x][y]))
            x2 = c.x + this.cellSize * ((this.threshold - this.cells[x][y + 1]) / (this.cells[x + 1][y + 1] - this.cells[x][y + 1]))
            y2 = c.y + this.cellSize
            this.addSegment(x1, y1, x2, y2)
            break
          case 2:
          case 13:
            x1 = c.x + this.cellSize
            y1 = c.y + this.cellSize * ((this.threshold - this.cells[x + 1][y]) / (this.cells[x + 1][y + 1] - this.cells[x + 1][y]))
            x2 = c.x + this.cellSize * ((this.threshold - this.cells[x][y + 1]) / (this.cells[x + 1][y + 1] - this.cells[x][y + 1]))
            y2 = c.y + this.cellSize
            this.addSegment(x1, y1, x2, y2)
            break
          case 3:
          case 12:
            x1 = c.x
            y1 = c.y + this.cellSize * ((this.threshold - this.cells[x][y]) / (this.cells[x][y + 1] - this.cells[x][y]))
            x2 = c.x + this.cellSize
            y2 = c.y + this.cellSize * ((this.threshold - this.cells[x + 1][y]) / (this.cells[x + 1][y + 1] - this.cells[x + 1][y]))
            this.addSegment(x1, y1, x2, y2)
            break
          case 4:
          case 11:
            x1 = c.x + this.cellSize * ((this.threshold - this.cells[x][y]) / (this.cells[x + 1][y] - this.cells[x][y]))
            y1 = c.y
            x2 = c.x + this.cellSize
            y2 = c.y + this.cellSize * ((this.threshold - this.cells[x + 1][y]) / (this.cells[x + 1][y + 1] - this.cells[x + 1][y]))
            this.addSegment(x1, y1, x2, y2)
            break
          case 5:
            x1 = c.x + this.cellSize * ((this.threshold - this.cells[x][y]) / (this.cells[x + 1][y] - this.cells[x][y]))
            y1 = c.y
            x2 = c.x
            y2 = c.y + this.cellSize * ((this.threshold - this.cells[x][y]) / (this.cells[x][y + 1] - this.cells[x][y]))
            this.addSegment(x1, y1, x2, y2)
            x1 = c.x + this.cellSize
            y1 = c.y + this.cellSize * ((this.threshold - this.cells[x + 1][y]) / (this.cells[x + 1][y + 1] - this.cells[x + 1][y]))
            x2 = c.x + this.cellSize * ((this.threshold - this.cells[x][y + 1]) / (this.cells[x + 1][y + 1] - this.cells[x][y + 1]))
            y2 = c.y + this.cellSize
            this.addSegment(x1, y1, x2, y2)
            break
          case 6:
          case 9:
            x1 = c.x + this.cellSize * ((this.threshold - this.cells[x][y]) / (this.cells[x + 1][y] - this.cells[x][y]))
            y1 = c.y
            x2 = c.x + this.cellSize * ((this.threshold - this.cells[x][y + 1]) / (this.cells[x + 1][y + 1] - this.cells[x][y + 1]))
            y2 = c.y + this.cellSize
            this.addSegment(x1, y1, x2, y2)
            break
          case 7:
          case 8:
            x1 = c.x + this.cellSize * ((this.threshold - this.cells[x][y]) / (this.cells[x + 1][y] - this.cells[x][y]))
            y1 = c.y
            x2 = c.x
            y2 = c.y + this.cellSize * ((this.threshold - this.cells[x][y]) / (this.cells[x][y + 1] - this.cells[x][y]))
            this.addSegment(x1, y1, x2, y2)
            break
          case 10:
            x1 = c.x + this.cellSize * ((this.threshold - this.cells[x][y]) / (this.cells[x + 1][y] - this.cells[x][y]))
            y1 = c.y
            x2 = c.x + this.cellSize
            y2 = c.y + this.cellSize * ((this.threshold - this.cells[x + 1][y]) / (this.cells[x + 1][y + 1] - this.cells[x + 1][y]))
            this.addSegment(x1, y1, x2, y2)
            x1 = c.x
            y1 = c.y + this.cellSize * ((this.threshold - this.cells[x][y]) / (this.cells[x][y + 1] - this.cells[x][y]))
            x2 = c.x + this.cellSize * ((this.threshold - this.cells[x][y + 1]) / (this.cells[x + 1][y + 1] - this.cells[x][y + 1]))
            y2 = c.y + this.cellSize
            this.addSegment(x1, y1, x2, y2)
            break
          case 15:
            break
        }
      }
    }
  }
  addSegment(x1: number, y1: number, x2: number, y2: number): void {
    //short straight lines
    const seg = [[x1, y1], [x2, y2]]
    this.segments.push(seg)
    //draw on scene
    const points = [new THREE.Vector2(x1, y1), new THREE.Vector2(x2, y2)]
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), lineMaterialSeg))
    // console.log("added segments", this.segments.length)
  }
  drawLoops(): void {
    console.log("total segements", this.segments.length)
    if(this.segments.length <3){
      return 
    }
 while(this.segments.length>0){
      var loop = new Loop() 
      //go through the segments to add to this new loop 
      //TODO assuming all loops are closed. otherwise stuck in the while loop. 
      while (!loop.isClosed){
        for (const { index, s } of this.segments.map((s, index) => ({ index, s }))) {
          const pointA = s[0] //[x,y]
          const pointB = s[1]
        
          if(loop.vertices.length == 0){
            console.log('begin a new loop')
            //put down the first two loop
            loop.addVertex(this.segments[0][0]) //head , same as the tail when loop is finished 
            loop.addVertex(this.segments[0][1])
            this.segments.shift(); //remove the segment that's added
            break
          }
          else if(loop.tailMatches(pointA)){//add B to the end 
            loop.addVertex(pointB)
            this.segments.splice(index,1) //remove one item
            break
          }
          else if(loop.tailMatches(pointB)){//add B to the end 
            loop.addVertex(pointA)
            this.segments.splice(index,1) //remove one item
            break
          }
        }
        // console.log(loop.vertices)
      }
      this.loops.push(loop)
      
    }
    //all vertices added
    console.log("total loops", this.loops.length)
    // // add the points to a closed contour 
    for (let l of this.loops){
      const points = []
      for (let v of l.vertices) {  
        points.push(new THREE.Vector3(v[0], v[1], -4))
      }
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, lineMaterial);
      scene.add(line);
    }
    
    
  }

  //return index of the first obj in arr. -1 if not found
  getIndexOf(arr: number[][], obj: number[]): number {
    for (const { index, a } of arr.map((a, index) => ({ index, a }))) {
      if (a[0] == obj[0] && a[1] == obj[1]) {
        // console.log(a[0],a[1],obj[0],obj[1] )
        return index
      }
    }
    return -1
  }


  update(): void {

  }
}
//setup 
let bubbleSeeds: Array<BubbleSeed>
bubbleSeeds = [
  new BubbleSeed(15, 30, 1.4),
  new BubbleSeed(25, 20),
  new BubbleSeed(16, 27, .6),
  new BubbleSeed(6,8,3),

];

let metaSquare = new MetaSquare(bubbleSeeds)
metaSquare.calculateSegments()
metaSquare.drawLoops()

//go through seeds and add extruded circles 
let cShape: THREE.Shape
var mesh: THREE.Mesh
var scale
var totalStep = 1;
for (let step: number = 0; step < totalStep; step++) {
  scale = 1 - step * .1;
  for (let i: number = 0; i < bubbleSeeds.length; i++) {
    cShape = new THREE.Shape()
    cShape.absarc(bubbleSeeds[i].x, bubbleSeeds[i].y, bubbleSeeds[i].r * scale, 0, Math.PI * 2, true);
    mesh = ExtrudeRoundCorner(cShape);
    mesh.position.z = step * -7;
    scene.add(mesh);
  }

}

function ExtrudeRoundCorner(_shape: Shape) {

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

  return new THREE.Mesh(geometry, material);;
}

const axesHelper = new THREE.AxesHelper(10);
scene.add(axesHelper);

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

