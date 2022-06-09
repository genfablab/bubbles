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
camera.position.x = 5;
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

class Loop {
  vertices: number[][]
  tail: string
  isClosed: boolean
  loopShape: THREE.Shape 
  constructor() {
    this.vertices = []
    this.isClosed = false
  }
  addVertex(newPoint: number[]) {
    this.vertices.push(newPoint)
    this.tail = newPoint.toString()
    if (this.vertices.length > 2 && this.tail == this.vertices[0].toString()) {
      // console.log("loop closed")
      this.isClosed = true
      this.gen2DShape()
    }
  }
  gen2DShape():void{
    if (!this.isClosed ||  this.vertices.length<3){
      console.error("cannot generate THREE Shape")
      return
    }
    this.loopShape = new THREE.Shape()
    this.loopShape.moveTo(this.vertices[0][0],this.vertices[0][1])
    for (let v of this.vertices) {
      this.loopShape.lineTo(v[0], v[1])
    }
  }
  tailMatches(newPoint: number[]): boolean {
    return (newPoint.toString() == this.tail)
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
  z: number
  // vertices: Array<THREE.Vector2>

  constructor(_seeds: Array<BubbleSeed>) {
    //100 1 
    this.cellNum = 280
    this.cellSize = 0.5
    this.cells = [...Array(this.cellNum + 1)].map(e => Array(this.cellNum + 1).fill(0))
    this.seeds = _seeds
    this.threshold = 1.6 //default
    this.segments = []
    this.loops = []
    this.update()
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
    // // DEBUGGING draw segments on scene
    // const points = [new THREE.Vector2(x1, y1), new THREE.Vector2(x2, y2)]
    // scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), lineMaterialSeg))
  }
  calculateLoops(): void {
    // console.log("total segements", this.segments.length)
    if (this.segments.length < 3) {
      return
    }
    while (this.segments.length > 0) {
      var loop = new Loop()
      //go through the segments to add to this new loop 
      while (!loop.isClosed) {
        let newPointAdded: boolean = false;
        for (const { index, s } of this.segments.map((s, index) => ({ index, s }))) {
          const pointA = s[0] //[x,y]
          const pointB = s[1]

          if (loop.vertices.length == 0) {
            // console.log('begin a new loop')
            //put down the first two loop
            loop.addVertex(this.segments[0][0]) //head , same as the tail when loop is finished 
            loop.addVertex(this.segments[0][1])
            this.segments.shift() //remove the segment that's added
            newPointAdded = true
            break
          }
          else if (loop.tailMatches(pointA)) {//add B to the end 
            loop.addVertex(pointB)
            this.segments.splice(index, 1) //remove one item
            newPointAdded = true
            break
          }
          else if (loop.tailMatches(pointB)) {//add B to the end 
            loop.addVertex(pointA)
            this.segments.splice(index, 1) //remove one item
            newPointAdded = true
            break
          }
        }
        if (!newPointAdded) { //after going through all segements, no match was found 
          console.log("Loop left open")
          break
        }
      }
      // if (loop.isClosed) { //only add closed contours
      this.loops.push(loop)
      // }
    }
    //all vertices added
    // console.log("total loops", this.loops.length)    
  }

  drawSeeds(): void {
    //go through seeds and add extruded circles 
    let cShape: THREE.Shape
    let mesh: THREE.Mesh

    for (let i: number = 0; i < this.seeds.length; i++) {
      cShape = new THREE.Shape()
      cShape.absarc(bubbleSeeds[i].x, this.seeds[i].y, this.seeds[i].r, 0, Math.PI * 2, true);
      mesh = extrudeRoundCorner(cShape);
      mesh.position.z = 0;
      scene.add(mesh);
    }

  }
  drawWiredLoops():void {
    for (let l of this.loops) {
      const points = []
      for (let v of l.vertices) {
        points.push(new THREE.Vector2(v[0], v[1]))
      }
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, lineMaterial);
      scene.add(line);
    }
  }

  update(): void {
    this.calculateSegments()
    this.calculateLoops()
  }

}

//todo interface 
class BubbleSeed {
  x: number
  y: number
  r: number
  pos: THREE.Vector2
  constructor(x: number, y: number, r = 5) {
    this.x = x
    this.y = y
    this.r = r
    this.pos = new THREE.Vector2(x, y)
  }
}


//setup---------------------------------------------------------------- 
let bubbleSeeds: Array<BubbleSeed>
bubbleSeeds = [
  new BubbleSeed(15, 30),
  new BubbleSeed(25, 31, 3),
  new BubbleSeed(12, 22, 1.6),
  new BubbleSeed(12, 12, 1.6),
  new BubbleSeed(16, 8, 1),
  new BubbleSeed(32, 12, 1),
  new BubbleSeed(40, 18, 3),
];
//4 1.9
var totalStep = 7
var eachStep = 0.9
var z = 0
var scale
let cShape: THREE.Shape
let mesh: THREE.Mesh
let newSeeds:BubbleSeed[]
for (let step: number = 0; step < totalStep; step++) {
  newSeeds=[]
  z += eachStep
  scale = 1 + step * 0.12* Math.random()
  for (let b of bubbleSeeds){
    newSeeds.push( new BubbleSeed(b.x, b.y, b.r*scale))
  }
  console.log(newSeeds)
  const metaSquare = new MetaSquare(newSeeds)
  // metaSquare.threshold = 1.6 //smaller => blobbier 
  for (let l of metaSquare.loops) {
    if (l.isClosed) { //only extrude closed loops
      // adapt the size of the grid 
      // throw an error when not closed 
      mesh = extrudeRoundCorner(l.loopShape);
      mesh.position.z = z
      scene.add(mesh)
    }
  }
}



//helpers---------------------------------------------------------------- 
function extrudeRoundCorner(_shape: Shape) {
  const extrudeSettings = {
    steps: 1,
    depth: 0,
    bevelEnabled: true,
    bevelThickness: 0.18,
    bevelSize: 0.18,
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
  bubbleSeeds[0].r = 5 + 2 * Math.sin(time / 2000)

  renderer.render(scene, camera)
}

function onWindowResize() {

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);

}

