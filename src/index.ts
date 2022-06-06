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
    return this.r;
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
  // vertices: Array<THREE.Vector2>

  constructor(_seeds: Array<BubbleSeed>) {
    //100 1 
    this.cellNum = 40
    this.cellSize = 2
    this.cells = [...Array(this.cellNum + 1)].map(e => Array(this.cellNum + 1).fill(0))
    this.seeds = _seeds
    this.threshold = 0.95
    this.segments = []
    // this.vertices=  []//new Array<THREE.Vector2>()
  }

  calculate(): void {
    let x1: number, y1: number, x2: number, y2: number;
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
          + Math.pow(this.cells[x][y] >= this.threshold ? 2 : 0, 3);
        // console.log(x,y,state)
        let c: THREE.Vector2 = new THREE.Vector2(this.cellSize * x, this.cellSize * y)
        switch (state) {
          case 0:
            break;
          case 1:
          case 14:
            x1 = c.x;
            y1 = c.y + this.cellSize * ((this.threshold - this.cells[x][y]) / (this.cells[x][y + 1] - this.cells[x][y]));
            x2 = c.x + this.cellSize * ((this.threshold - this.cells[x][y + 1]) / (this.cells[x + 1][y + 1] - this.cells[x][y + 1]));
            y2 = c.y + this.cellSize;
            this.addSegment(x1, y1, x2, y2);
            break;
          case 2:
          case 13:
            x1 = c.x + this.cellSize;
            y1 = c.y + this.cellSize * ((this.threshold - this.cells[x + 1][y]) / (this.cells[x + 1][y + 1] - this.cells[x + 1][y]));
            x2 = c.x + this.cellSize * ((this.threshold - this.cells[x][y + 1]) / (this.cells[x + 1][y + 1] - this.cells[x][y + 1]));
            y2 = c.y + this.cellSize;
            this.addSegment(x1, y1, x2, y2);
            break;
          case 3:
          case 12:
            x1 = c.x;
            y1 = c.y + this.cellSize * ((this.threshold - this.cells[x][y]) / (this.cells[x][y + 1] - this.cells[x][y]));
            x2 = c.x + this.cellSize;
            y2 = c.y + this.cellSize * ((this.threshold - this.cells[x + 1][y]) / (this.cells[x + 1][y + 1] - this.cells[x + 1][y]));
            this.addSegment(x1, y1, x2, y2);
            break;
          case 4:
          case 11:
            x1 = c.x + this.cellSize * ((this.threshold - this.cells[x][y]) / (this.cells[x + 1][y] - this.cells[x][y]));
            y1 = c.y;
            x2 = c.x + this.cellSize;
            y2 = c.y + this.cellSize * ((this.threshold - this.cells[x + 1][y]) / (this.cells[x + 1][y + 1] - this.cells[x + 1][y]));
            this.addSegment(x1, y1, x2, y2);
            break;
          case 5:
            x1 = c.x + this.cellSize * ((this.threshold - this.cells[x][y]) / (this.cells[x + 1][y] - this.cells[x][y]));
            y1 = c.y;
            x2 = c.x;
            y2 = c.y + this.cellSize * ((this.threshold - this.cells[x][y]) / (this.cells[x][y + 1] - this.cells[x][y]));
            this.addSegment(x1, y1, x2, y2);
            x1 = c.x + this.cellSize;
            y1 = c.y + this.cellSize * ((this.threshold - this.cells[x + 1][y]) / (this.cells[x + 1][y + 1] - this.cells[x + 1][y]));
            x2 = c.x + this.cellSize * ((this.threshold - this.cells[x][y + 1]) / (this.cells[x + 1][y + 1] - this.cells[x][y + 1]));
            y2 = c.y + this.cellSize;
            this.addSegment(x1, y1, x2, y2);
            break;
          case 6:
          case 9:
            x1 = c.x + this.cellSize * ((this.threshold - this.cells[x][y]) / (this.cells[x + 1][y] - this.cells[x][y]));
            y1 = c.y;
            x2 = c.x + this.cellSize * ((this.threshold - this.cells[x][y + 1]) / (this.cells[x + 1][y + 1] - this.cells[x][y + 1]));
            y2 = c.y + this.cellSize;
            this.addSegment(x1, y1, x2, y2);
            break;
          case 7:
          case 8:
            x1 = c.x + this.cellSize * ((this.threshold - this.cells[x][y]) / (this.cells[x + 1][y] - this.cells[x][y]));
            y1 = c.y;
            x2 = c.x;
            y2 = c.y + this.cellSize * ((this.threshold - this.cells[x][y]) / (this.cells[x][y + 1] - this.cells[x][y]));
            this.addSegment(x1, y1, x2, y2);
            break;
          case 10:
            x1 = c.x + this.cellSize * ((this.threshold - this.cells[x][y]) / (this.cells[x + 1][y] - this.cells[x][y]));
            y1 = c.y;
            x2 = c.x + this.cellSize;
            y2 = c.y + this.cellSize * ((this.threshold - this.cells[x + 1][y]) / (this.cells[x + 1][y + 1] - this.cells[x + 1][y]));
            this.addSegment(x1, y1, x2, y2);
            x1 = c.x;
            y1 = c.y + this.cellSize * ((this.threshold - this.cells[x][y]) / (this.cells[x][y + 1] - this.cells[x][y]));
            x2 = c.x + this.cellSize * ((this.threshold - this.cells[x][y + 1]) / (this.cells[x + 1][y + 1] - this.cells[x][y + 1]));
            y2 = c.y + this.cellSize;
            this.addSegment(x1, y1, x2, y2);
            break;
          case 15:
            break;
        }
      }
    }
  }

  addSegment(x1: number, y1: number, x2: number, y2: number): void {

    const seg = [[x1, y1], [x2, y2]]
    this.segments.push(seg)
    //draw on scene
    const points = [new THREE.Vector2(x1, y1), new THREE.Vector2(x2, y2)]
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), lineMaterialSeg))
    console.log("added segments", this.segments.length)
  }

  drawSegments():void{

    // const points = []
    // for (let s of this.segments){
    //   console.log(s)
    //   points.push(new THREE.Vector3( s[0][0],s[0][1], 4));
    //   points.push(new THREE.Vector3( s[1][0],s[1][1], 4));
    // }
    // scene.add( new THREE.Line(new THREE.BufferGeometry().setFromPoints( points ), lineMaterialSeg ) )

  }
  drawLine(): void {
    console.log("total segements", this.segments.length)

    let vertices: number[][] = []
    for (let s of this.segments) {
      const pointA = s[0] //[x,y]
      const pointB = s[1]
      const indexA = this.getIndexOf(vertices, pointA)
      const indexB = this.getIndexOf(vertices, pointB)
      
      if (indexA > -1 && indexB > -1) //last link in the chain ??
      {
        console.log("A ", indexA, pointA, ". B ", indexB, pointB)  
      }
      else if (indexA > -1) { //A is found , B is not 
        if (indexA == 0) { //A exist as the first point in the array 
          vertices.unshift(pointB)
        } else {
          //A is the last point. Just add B to the last
          vertices.push(pointB)
        }
      }
      else if (indexB > -1) {//A is not yet in the array, B is 
        if (indexB == 0) {
          //add A to the first
          vertices.unshift(pointA)
        }
        else {
          //add A to the last
          vertices.push(pointA)
        }
      }
      else {
        //A and B are both new. Add both points.
        //happens at the beginning of each loop
        vertices.push(pointA)
        vertices.push(pointB)
      }
    }
    console.log("total vertices", vertices.length)
    const points = []
    // add the points to a closed contour 
    for (let v of vertices) {
      points.push(new THREE.Vector3(v[0], v[1], -4));
    }
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geometry, lineMaterial);
    scene.add(line);

    //delete the vertices that are added? 
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
  new BubbleSeed(16, 20, 2),
  // new BubbleSeed(6,5,3),
  // new BubbleSeed(4,15,1),
];

let metaSquare = new MetaSquare(bubbleSeeds)
metaSquare.calculate()
metaSquare.drawSegments()
metaSquare.drawLine()

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

