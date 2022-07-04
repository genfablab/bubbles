import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { mergeBufferGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter.js'
import { GUI } from 'lil-gui'
import { SVGRenderer } from 'three/examples/jsm/renderers/SVGRenderer'

function init() {
  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setAnimationLoop(animation)
  document.body.appendChild(renderer.domElement)

  let camX = 200, camY = -200
  camera = new THREE.PerspectiveCamera(
    50, window.innerWidth / window.innerHeight, 0.01, 1000
  );
  // camera.setViewOffset( window.innerWidth, window.innerHeight, camX,camY, window.innerWidth, window.innerHeight )
  camera.position.set(0, 0, 500)


  scene = new THREE.Scene()
  scene.add(camera);
  scene.background = new THREE.Color(0x8FBCD4);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = true;

  const axesHelper = new THREE.AxesHelper(10);
  scene.add(axesHelper);

  window.addEventListener('resize', onWindowResize);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(1, 1, 20).normalize();
  scene.add(directionalLight);

  //build GUI 
  const gui = new GUI();

  gui.add(params, 'showOutline').onChange(function () { // Checkbox
    scene.getObjectByName('lineObject').visible = params.showOutline
  })

  gui.add(params, 'totalLayer', 1, 16).step(1).onChange(function () {
    //TODO this is triggered if slider is clicked, without changing value
    addBubbles()

  })
  gui.add(params, 'extrusionThickness', 0.5, 3).step(0.5).onChange(function () {
    addBubbles()
  })
  gui.add(params, 'layerDistance', 0.15, 5).step(0.05).onChange(function () {
    addBubbles() //todo dont need to reset bubbles

  })
  // gui.add(params, 'layerVariation', 0.0, 0.5).step(0.05).onChange(function () { addBubbles() })
  gui.add(params, 'deflation', 0.9, 6).step(0.5).onChange(function () {
    addBubbles()

  })
  gui.add(params, 'download obj') // Button
  gui.add(params, 'download svg') // Button

  initBubbleObject()
  initOutline()

}

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


class BubbleLayer { //one for each layer of merged bubbles 
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
    bevelThickness: 1,
    bevelSize: 1,
    bevelOffset: 0,
    bevelSegments: 7  //smooth curved extrusion
  }

  /*
  explanation http://jamie-wong.com/2014/08/19/metaballs-and-marching-squares/ 
  implementation https://openprocessing.org/sketch/375385 
  */
  constructor(_seeds: Array<BubbleSeed>) {
    //grid size 
    //100,1
    //280 0.5 
    //500 0.25 
    this.cellNum = 1000
    this.cellSize = 1 //todoBUG finite options for cellsize.for other cellsizes NONE of the coordinates matches. 
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

  getExtrudedGeom(settings: Object, zPos: number) {
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

  getOutline() { //this returns outline that's intercounnected 
    this.update()
    let geomArray: THREE.BufferGeometry[] = []
    for (let l of this.loops) {
      geomArray.push(new THREE.ShapeGeometry(l.loopShape))
    }
    if (geomArray.length > 0) {
      const mergedGeom = mergeBufferGeometries(geomArray)
      // mergedGeom.translate(0, 0, 0)
      return mergedGeom
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
    return
    // // DEBUGGING draw segments on scene
    const lineMaterialSeg = new THREE.LineBasicMaterial({ color: 0xff0000 });
    const points = [new THREE.Vector2(x1, y1), new THREE.Vector2(x2, y2)]
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), lineMaterialSeg))
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

  drawWiredLoops(): void { //debug: draw loops 

    for (var l of this.loops) {
      const points = []
      for (let v of l.vertices) {
        points.push(new THREE.Vector2(v[0], v[1]))
      }

      // console.log(points)
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
let scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer
let bubbleSeeds: Array<BubbleSeed>
let bubbleObject: THREE.Object3D, scaleOverYears: number[]
let lineObject: THREE.Object3D, mesh: THREE.Mesh
bubbleSeeds = [
  new BubbleSeed(10, 138.6, 20.59126028),
  new BubbleSeed(62.2, 110.9, 13.26649916),
  new BubbleSeed(73.4, 171.3, 20.976177),
  new BubbleSeed(92.8, 130.9, 17.29161647),
  new BubbleSeed(116.9, 153.7, 20.976177),
  new BubbleSeed(157.5, 126.1, 12.32882801), //6
  new BubbleSeed(182.4, 153.4, 16.1864141),
  new BubbleSeed(195.5, 122.9, 8.602325267),
  new BubbleSeed(214.6, 158.3, 18.27566688),
  new BubbleSeed(301.1, 122, 9.055385138),
  new BubbleSeed(187.6, 103, 8.185352772),
  new BubbleSeed(219, 99, 6.782329983),
  new BubbleSeed(245.4, 119.1, 19.13112647),
  new BubbleSeed(231.9, 101.2, 16.43167673),
  new BubbleSeed(266.1, 95.6, 14.49137675),
  new BubbleSeed(108.9, 57.6, 9.486832981),//16
  new BubbleSeed(102.1, 33.5, 15.8113883),
  new BubbleSeed(340.5, 22.3, 7.071067812),
  new BubbleSeed(72.9, 10, 23.28089345),
]
scaleOverYears = [
  0,
  9.5,
  15.5,
  20,
  22.8
]
const xOffset = 100
const yOffset = 100

const params = {
  totalLayer: 5,
  extrusionThickness: 1.27, //in cm 
  layerDistance: 2.54+0.01, //0.75,
  // layerVariation: 0.12, //0.05, 
  deflation: 5.3, //1.75,

  outlineOnly: false,
  showOutline: true,
  'download obj': downloadObj,
  'download svg': downloadSVG,
}
const extrudeSettings = {
  steps: 1,
  depth: 0,
  bevelEnabled: true,
  bevelThickness: params.extrusionThickness,
  bevelSize: 0, //0 means straight edge or bevelthickness for rounded  
  bevelOffset: 0,
  bevelSegments: 7  //smooth curved extrusion
}

const material = new THREE.MeshPhysicalMaterial({ //todo translucency 
  roughness: 0.27,
  transmission: 0.64,
  transparent: true,
  opacity: 0.3
})
material.thickness = 0.01
material.roughness = 0.7

const lineMaterial = new THREE.LineBasicMaterial({
  color: 0x0000ff
})

init()
addBubbles()

function addBubbles() {

  initBubbleObject()
  initOutline()


  // var arctic = [
  //   bubbleSeeds[2],
  //   bubbleSeeds[4],
  //   bubbleSeeds[6],
  //   bubbleSeeds[8],
  // ]
  // var antarctic = [
  //   bubbleSeeds[18]
  // ]
  // var rest = [
  //   bubbleSeeds[0],
  //   bubbleSeeds[1],
  //   bubbleSeeds[3],
  //   bubbleSeeds[5],
  //   bubbleSeeds[15],
  //   bubbleSeeds[16], //america 
  //   bubbleSeeds[7],
  //   bubbleSeeds[9],
  //   bubbleSeeds[10],
  //   bubbleSeeds[11],
  //   bubbleSeeds[12],
  //   bubbleSeeds[13],
  //   bubbleSeeds[14],
  //   bubbleSeeds[17], //euroasia 

  // ]
  // var america = [
  //   bubbleSeeds[0],
  //   bubbleSeeds[1],
  //   bubbleSeeds[3],
  //   bubbleSeeds[5],
  //   bubbleSeeds[15],
  //   bubbleSeeds[16],
  // ]

  // var euroasia = [
  //   bubbleSeeds[7],
  //   bubbleSeeds[9],
  //   bubbleSeeds[10],
  //   bubbleSeeds[11],
  //   bubbleSeeds[12],
  //   bubbleSeeds[13],
  //   bubbleSeeds[14],
  //   bubbleSeeds[17],
  // ]
  // bubbleObject.add(new THREE.Mesh(getBubblesGeom(arctic),material))
  // bubbleObject.add(new THREE.Mesh(getBubblesGeom(antarctic),material))
  // bubbleObject.add(new THREE.Mesh(getBubblesGeom(rest),material))
  
/////////
  // var northernHemisphere = bubbleSeeds.slice(0,15)
  // var southernHemisphere = bubbleSeeds.slice(15)
  // bubbleObject.add(new THREE.Mesh(getBubblesGeom(northernHemisphere),material))
  // bubbleObject.add(new THREE.Mesh(getBubblesGeom(southernHemisphere),material))

  bubbleObject.add(new THREE.Mesh(getBubblesGeom(bubbleSeeds),material))

}

function initBubbleObject() {
  let object = scene.getObjectByName('bubbleObject')
  if (object != undefined) {
    scene.remove(object)
  }

  bubbleObject = new THREE.Object3D()
  bubbleObject.name = 'bubbleObject'
  scene.add(bubbleObject)

}

function initOutline() {
  let object = scene.getObjectByName('lineObject')
  if (object != undefined) {
    scene.remove(object)
  }

  lineObject = new THREE.Object3D()
  lineObject.name = 'lineObject'
  scene.add(lineObject)
}

function getBubblesGeom(_seeds: Array<BubbleSeed>) {
  var z = 0
  var scale  //this will be 1 if each seed's r is fed by data! 
  let layerGeom: THREE.BufferGeometry[] = []
  let newSeeds: BubbleSeed[]
  //bubbleSeeds -> marching square/ metaSquare edge segements -> contour -> layer geom buffer
  for (let layer: number = 0; layer < params.totalLayer; layer++) {
    newSeeds = []
    z += params.layerDistance
    scale = 1 + scaleOverYears[layer] * 0.018 //layer * params.layerVariation //* ((layer+1)%2)// * Math.random()
    for (let s of _seeds) {
      newSeeds.push(new BubbleSeed(s.x + xOffset, s.y + yOffset, s.r * scale))
    }
    const bubbleLayer = new BubbleLayer(newSeeds)
    bubbleLayer.threshold = params.deflation //smaller => blobbier
    layerGeom.push(bubbleLayer.getExtrudedGeom(extrudeSettings, z))
    
    //a bit of mix up: adding lines to the scene.. 
    for (let l of bubbleLayer.loops) {
      const points = []
      for (let v of l.vertices) {
        points.push(new THREE.Vector2(v[0], v[1]))
      }
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, lineMaterial);
      lineObject.add(line);
    }

  }
  if (layerGeom.length > 0) {
    const mergedGeom = mergeBufferGeometries(layerGeom)
    return mergedGeom
  } else { //TODO deal with it 
    console.log('no loop exists')
  }
  return null
}

function downloadObj() {
  const exporter = new OBJExporter();
  const result = exporter.parse(scene)
  const date = new Date()
  const timestamp = date.getFullYear().toString() + '_' + (date.getMonth() + 1) + date.getHours() + '_' + date.getMinutes() + date.getSeconds()
  exportToFile("glacier_" + timestamp + ".obj", result);
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

function downloadSVG() {
  scene.getObjectByName('bubbleObject').visible = false
  exportToSVG('outline')
  scene.getObjectByName('bubbleObject').visible = true
}

function exportToSVG(filename: string) {   //https://jsfiddle.net/9y0b3wet/ 
  const rendererSVG = new SVGRenderer();
  rendererSVG.setSize(window.innerWidth, window.innerHeight);
  rendererSVG.render(scene, camera);

  var XMLS = new XMLSerializer();
  var svgfile = XMLS.serializeToString(rendererSVG.domElement);

  var svgData = svgfile;
  var preface = '<?xml version="1.0" standalone="no"?>\r\n';
  var svgBlob = new Blob([preface, svgData], { type: "image/svg+xml;charset=utf-8" });
  var svgUrl = URL.createObjectURL(svgBlob);
  var downloadLink = document.createElement("a");
  downloadLink.href = svgUrl;
  downloadLink.download = filename + ".svg";
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
}


