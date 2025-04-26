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
  setHighlightNodes: (val: Set<string>) => void,
  setHighlightLinks: (val: Set<LinkType>) => void,
  graph: ForceGraph3DInstance,
  setFrozen: (val: boolean) => void
) {
  const visited = new Set<string>();
  const queue = [clickedLink.source.id, clickedLink.target.id];
  const newHighlightedLinks = new Set<LinkType>();

  while (queue.length) {
    const current = queue.shift();
    if (!current || visited.has(current)) continue;
    visited.add(current);

    graphData.links.forEach(link => {
      if (link.source.id === current && !visited.has(link.target.id)) {
        queue.push(link.target.id);
        newHighlightedLinks.add(link);
      } else if (link.target.id === current && !visited.has(link.source.id)) {
        queue.push(link.source.id);
        newHighlightedLinks.add(link);
      }
    });
  }

  const involvedNodes = graphData.nodes.filter(n => visited.has(n.id));
  const minX = Math.min(...involvedNodes.map(n => n.x!));
  const maxX = Math.max(...involvedNodes.map(n => n.x!));
  const minY = Math.min(...involvedNodes.map(n => n.y!));
  const maxY = Math.max(...involvedNodes.map(n => n.y!));
  const minZ = Math.min(...involvedNodes.map(n => n.z!));
  const maxZ = Math.max(...involvedNodes.map(n => n.z!));

  const center = {
    x: (minX + maxX) / 2,
    y: (minY + maxY) / 2,
    z: (minZ + maxZ) / 2,
  };

  graph.cameraPosition(
    {
      x: center.x + (maxX - minX),
      y: center.y + (maxY - minY),
      z: center.z + (maxZ - minZ),
    },
    center,
    1000
  );

  setHighlightNodes(visited);
  setHighlightLinks(newHighlightedLinks);
  setFrozen(true);
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