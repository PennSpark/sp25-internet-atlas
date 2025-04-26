import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { ForceGraph3DInstance } from '3d-force-graph';
import { LinkType, NodeType } from '../types';

export function createTextTexture(text: string): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = 'white';
  ctx.font = '24px Arial';
  ctx.fillText(text, 10, 40);
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  return texture;
}

export function setupGraphControls(controls: OrbitControls) {
  controls.enableZoom = true;
  controls.enablePan = true;
  controls.enableRotate = true;
  controls.minPolarAngle = Math.PI / 2;
  controls.maxPolarAngle = Math.PI / 2;
  controls.minAzimuthAngle = -Math.PI / 4;
  controls.maxAzimuthAngle = Math.PI / 4;
  controls.minDistance = 100;
  controls.maxDistance = 1000;
}

export function findConnectedPath(
  clickedLink: LinkType,
  graphData: { nodes: NodeType[]; links: LinkType[] },
  graph: ForceGraph3DInstance,
  setFrozen: (val: boolean) => void,
  setPathNodes: (nodes: { id: string; x: number; y: number }[]) => void
) {
  const visited = new Set<string>();
  const queue = [clickedLink.source.id, clickedLink.target.id];
  const nodesInPath: NodeType[] = [];

  while (queue.length) {
    const current = queue.shift();
    if (!current || visited.has(current)) continue;
    visited.add(current);

    const node = graphData.nodes.find(n => n.id === current);
    if (node) {
      nodesInPath.push(node);
    }

    graphData.links.forEach(link => {
      if (link.source.id === current && !visited.has(link.target.id)) {
        queue.push(link.target.id);
      } else if (link.target.id === current && !visited.has(link.source.id)) {
        queue.push(link.source.id);
      }
    });
  }

  const minX = Math.min(...nodesInPath.map(n => n.x ?? 0));
  const maxX = Math.max(...nodesInPath.map(n => n.x ?? 0));
  const minY = Math.min(...nodesInPath.map(n => n.y ?? 0));
  const maxY = Math.max(...nodesInPath.map(n => n.y ?? 0));
  const minZ = Math.min(...nodesInPath.map(n => n.z ?? 0));
  const maxZ = Math.max(...nodesInPath.map(n => n.z ?? 0));

  const center = {
    x: (minX + maxX) / 2,
    y: (minY + maxY) / 2,
    z: (minZ + maxZ) / 2,
  };

  setFrozen(true);

  graph.cameraPosition(
    {
      x: center.x + (maxX - minX),
      y: center.y + (maxY - minY),
      z: center.z + (maxZ - minZ),
    },
    center,
    1000 // ms transition
  );

  // 📸 After camera movement, re-project to screen coordinates
  setTimeout(() => {
    const camera = graph.camera();
    const width = window.innerWidth;
    const height = window.innerHeight;

    const screenPositions = nodesInPath.map(node => {
      const projected = new THREE.Vector3(node.x!, node.y!, node.z!).project(camera);

      return {
        id: node.id,
        x: (projected.x * 0.5 + 0.5),
        y: (-projected.y * 0.5 + 0.5),
      };
    });

    setPathNodes(screenPositions);
    console.log(screenPositions);
  }, 1000); // match cameraPosition duration
}


export function addSceneDecorations(scene: THREE.Scene) {
  const axesLength = 200;
  const axes = new THREE.Group();

  axes.add(new THREE.ArrowHelper(
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(0, 0, 0),
    axesLength,
    0xffffff
  ));
  axes.add(new THREE.ArrowHelper(
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(0, 0, 0),
    axesLength,
    0x0000ff
  ));

  const timeline = new THREE.Group();
  const timelineColor = 0x00ffff;
  const tickColor = 0xffffff;
  const tickSpacing = 20;
  const tickCount = 10;
  const halfLength = tickSpacing * tickCount;

  timeline.add(new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, -halfLength),
      new THREE.Vector3(0, 0, halfLength)
    ]),
    new THREE.LineBasicMaterial({ color: timelineColor })
  ));

  for (let i = -tickCount; i <= tickCount; i++) {
    const z = i * tickSpacing;
    timeline.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-2, 0, z),
        new THREE.Vector3(2, 0, z)
      ]),
      new THREE.LineBasicMaterial({ color: tickColor })
    ));

    const label = new THREE.Sprite(new THREE.SpriteMaterial({
      map: createTextTexture(`T${i}`),
      depthTest: false,
      transparent: true
    }));
    label.scale.set(10, 5, 1);
    label.position.set(5, 0, z);
    timeline.add(label);
  }

  const grid = new THREE.Group();
  const step = 30;
  for (let i = -axesLength; i <= axesLength; i += step) {
    const fade = 1 - Math.abs(i / axesLength);
    const material = new THREE.LineBasicMaterial({
      color: 0x333333,
      opacity: fade,
      transparent: true,
      depthWrite: false
    });

    grid.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(i, -axesLength, 0),
        new THREE.Vector3(i, axesLength, 0)
      ]),
      material
    ));
    grid.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-axesLength, i, 0),
        new THREE.Vector3(axesLength, i, 0)
      ]),
      material
    ));
    grid.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(i, 0, -axesLength),
        new THREE.Vector3(i, 0, axesLength)
      ]),
      material
    ));
    grid.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-axesLength, 0, i),
        new THREE.Vector3(axesLength, 0, i)
      ]),
      material
    ));
    grid.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, i, -axesLength),
        new THREE.Vector3(0, i, axesLength)
      ]),
      material
    ));
    grid.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, -axesLength, i),
        new THREE.Vector3(0, axesLength, i)
      ]),
      material
    ));
  }

  scene.add(axes);
  scene.add(timeline);
  scene.add(grid);
}

export function configureScene(graph: ForceGraph3DInstance) {
  const controls = graph.controls?.() as OrbitControls | undefined;
  if (controls) {
    setupGraphControls(controls);
  }

  const scene = graph.scene();
  addSceneDecorations(scene);
}