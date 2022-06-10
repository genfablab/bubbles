import * as THREE from 'three'
import { Shape, Vector2, Vector3, WebGLMultisampleRenderTarget } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { mergeBufferGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter.js'
import { GUI } from 'lil-gui'

function init() {
  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setAnimationLoop(animation)
  document.body.appendChild(renderer.domElement)

  camera = new THREE.PerspectiveCamera(
    70, window.innerWidth / window.innerHeight, 0.01, 200
  );
  camera.position.x = 5;
  camera.position.y = 0;
  camera.position.z = 80;
  camera.lookAt(new Vector3(0, 0, 0));

  scene = new THREE.Scene()
  scene.add(camera);
  scene.background = new THREE.Color(0x8FBCD4);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = true;

  const axesHelper = new THREE.AxesHelper(10);
  scene.add(axesHelper);

  window.addEventListener('resize', onWindowResize);

  const directionalLight = new THREE.DirectionalLight(0x8FBCD4, 1);
  directionalLight.position.set(1, 1, 20).normalize();
  scene.add(directionalLight);

  //parameters
  const gui = new GUI();
  gui.add( guiSettings, 'showSeeds' );  // Checkbox
  gui.add(guiSettings, 'totalLayer', 1, 27).step(1).onChange(function () {
    //TODO this is triggered if slider is clicked, without changing value
    addBubbles()
  })
  gui.add(guiSettings, 'download obj') // Button

  parent = new THREE.Object3D();
  scene.add(parent);
}

// //Scene setup
// const bgScene = new THREE.Scene();
// let bgMesh;
// {
//   const loader = new THREE.TextureLoader();
//   const texture = loader.load(
//     '/resources/tears_of_steel_bridge_2k.jpg',
//   );
//   texture.magFilter = THREE.LinearFilter;
//   texture.minFilter = THREE.LinearFilter;

//   const shader = THREE.ShaderLib.equirect;
//   const material = new THREE.ShaderMaterial({
//     fragmentShader: shader.fragmentShader,
//     vertexShader: shader.vertexShader,
//     uniforms: shader.uniforms,
//     depthWrite: false,
//     side: THREE.BackSide,
//   });
//   material.uniforms.tEquirect.value = texture;
//   const plane = new THREE.BoxBufferGeometry(100, 100, 100);
//   bgMesh = new THREE.Mesh(plane, material);
//   bgScene.add(bgMesh);
// }

// bgMesh.position.copy(camera.position);
// renderer.render(bgScene, camera);


// animation
function animation(time: number) {

  renderer.render(scene, camera)
}

function onWindowResize() {

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);

}



//----------------------------------------------------------------
//takes vertices and chain them into a contour 
class Loop {
  vertices: number[][]
  tail: string
  isClosed: boolean //closed ones are ready for extrusion 
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
  gen2DShape(): void {
    if (!this.isClosed || this.vertices.length < 3) {
      console.error("cannot generate THREE Shape")
      return
    }
    this.loopShape = new THREE.Shape()
    this.loopShape.moveTo(this.vertices[0][0], this.vertices[0][1])
    for (let v of this.vertices) {
      this.loopShape.lineTo(v[0], v[1])
    }
  }
  tailMatches(newPoint: number[]): boolean {
    return (newPoint.toString() == this.tail)
  }
}

class BubbleLayer {
  cellNum: number //total number of cells 
  cellSize: number
  cells: number[][] //[index][x,y]
  seeds: Array<BubbleSeed>
  threshold: number
  segments: number[][][] //an array of line segments [segement index][point index: 0 or 1] [coordinates: x, y ]
  loops: Array<Loop> //contours
  z: number
  defaultExtrudeSettings: Object = { //for future comparison/
    steps: 1,
    depth: 0,
    bevelEnabled: true,
    bevelThickness: 0.18,
    bevelSize: 0.18,
    bevelOffset: 0,
    bevelSegments: 7  //smooth curved extrusion
  }

  /*
  explanation http://jamie-wong.com/2014/08/19/metaballs-and-marching-squares/ 
  implementation https://openprocessing.org/sketch/375385 
  */
  constructor(_seeds: Array<BubbleSeed>) {
    //100,1
    //280 0.5 
    this.cellNum = 500
    this.cellSize = 0.25 //todoBUG finite options for cellsize.for other cellsizes NONE of the coordinates matches. 
    this.cells = [...Array(this.cellNum + 1)].map(e => Array(this.cellNum + 1).fill(0))
    this.seeds = _seeds
    this.threshold = 1.6 //default
    this.segments = []
    this.loops = []
  }

  update(): void {
    this.calculateSegments()
    this.calculateLoops()
  }

  getGeom(settings: Object, zPos: number) {
    //todo check settings if update() is needed 
    this.update()
    let geomArray: THREE.BufferGeometry[] = []
    for (let l of this.loops) {
      if (l.isClosed) {
        geomArray.push(new THREE.ExtrudeGeometry(l.loopShape, settings))
      }
    }
    if (geomArray.length > 0) {
      const mergedGeom = mergeBufferGeometries(geomArray)
      mergedGeom.translate(0, 0, zPos)
      return mergedGeom
    } else {
      //TODO question
      console.log('no loop exists')
    }

    return null
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
    // const lineMaterialSeg = new THREE.LineBasicMaterial({color: 0xff0000});
    // const points = [new THREE.Vector2(x1, y1), new THREE.Vector2(x2, y2)]
    // scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), lineMaterialSeg))
  }
  calculateLoops(): void {
    // console.log("total segements", this.segments.length)

    while (this.segments.length > 0) {
      var loop = new Loop()
      //go through the segments to add to this new loop 
      while (!loop.isClosed) {
        let newPointAdded: boolean = false;
        for (const { index, s } of this.segments.map((s, index) => ({ index, s }))) {
          const pointA = s[0] //[x,y]
          const pointB = s[1]

          if (loop.vertices.length == 0) {//put down the first two loop
            // console.log('begin a new loop')
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
          //todo manually stitch close the loop? //or adapt the size of the grid ?
          break
        }
      }
      this.loops.push(loop)
    }
    //all vertices added
    // console.log("total chain count", this.loops.length)    
  }

  drawSeeds(): void {  //debug: go through seeds and add extruded circles 

    let cShape: THREE.Shape
    let mesh: THREE.Mesh
    const material = new THREE.MeshNormalMaterial();
    for (let i: number = 0; i < this.seeds.length; i++) {
      cShape = new THREE.Shape()
      cShape.absarc(bubbleSeeds[i].x, this.seeds[i].y, this.seeds[i].r, 0, Math.PI * 2, true);
      mesh = new THREE.Mesh(new THREE.ExtrudeGeometry(cShape, this.defaultExtrudeSettings), material)
      mesh.position.z = -10;
      scene.add(mesh);
    }
  }

  drawWiredLoops(): void { //debug: draw sorted lines 
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
}

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
/*
bubbleSeeds -> marching squrae/ metaSquare edge segements -> contour -> layer geom buffer
*/

let scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer
let bubbleSeeds: Array<BubbleSeed>
let parent: THREE.Object3D, mesh: THREE.Mesh
bubbleSeeds = [
  new BubbleSeed(12, 22, 1.6),
  new BubbleSeed(18, 27, 2.4),
  new BubbleSeed(23, 21, 3),
  new BubbleSeed(32, 13, 1.5),
];

const extrudeSettings = {
  steps: 1,
  depth: 0,
  bevelEnabled: true,
  bevelThickness: 0.15,
  bevelSize: 0.18,
  bevelOffset: 0,
  bevelSegments: 7  //smooth curved extrusion
};
const guiSettings = {
  showSeeds: false,
  threshold: 1.7,
  totalLayer: 7,
  layerDistance: 0.75,
  layerVariation: 0.12,
  'download obj': exportToObj
}
const material = new THREE.MeshNormalMaterial();
const lineMaterial = new THREE.LineBasicMaterial({
  color: 0x0000ff
})

init()
addBubbles();

function addBubbles(){
  if (mesh !== undefined) {
    console.log("remvoe old mesh")
    parent.remove(mesh);
    mesh.geometry.dispose();
  }
  mesh = new THREE.Mesh(getBubblesGeom(), material)
  parent.add(mesh)
}


function getBubblesGeom() {
  var z = 0
  var scale
  let layerGeom: THREE.BufferGeometry[] = []
  let newSeeds: BubbleSeed[]
  for (let layer: number = 0; layer < guiSettings.totalLayer; layer++) {
    newSeeds = []
    z += guiSettings.layerDistance
    scale = 1 + layer * guiSettings.layerVariation * Math.random()
    for (let b of bubbleSeeds) {
      newSeeds.push(new BubbleSeed(b.x, b.y, b.r * scale))
    }
    const bubbleLayer = new BubbleLayer(newSeeds)
    bubbleLayer.threshold = guiSettings.threshold //smaller => blobbier
    // bubbleLayer.drawSeeds()
    layerGeom.push(bubbleLayer.getGeom(extrudeSettings, z))
  }
  if (layerGeom.length > 0) {
    const mergedGeom = mergeBufferGeometries(layerGeom)
    return mergedGeom
  } else { //TODO deal with it 
    console.log('no loop exists')
  }
  return null
}

function exportToObj() {
  const exporter = new OBJExporter();
  const result = exporter.parse(scene)
  const date = new Date()
  const timestamp = date.getFullYear().toString() + '_' + (date.getMonth() + 1) + date.getHours() + '_' + date.getMinutes() + date.getSeconds()
  exportToFile("bubbles_" + timestamp + ".obj", result);
}

function exportToFile(filename: string, data: any) {
  var pom = document.createElement('a');
  pom.href = URL.createObjectURL(new Blob([data], { type: 'text/plain' }));
  pom.download = filename;
  document.body.appendChild(pom);

  if (document.createEvent) {
    var event = document.createEvent('MouseEvents');
    event.initEvent('click', true, true);
    pom.dispatchEvent(event);
  }
  else {
    pom.click();
  }
}