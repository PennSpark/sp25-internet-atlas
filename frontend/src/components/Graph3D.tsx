'use client';

import { useEffect, useRef, useState } from 'react';
import ForceGraph3D, { ForceGraph3DInstance } from '3d-force-graph';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

import { getCoordinates, CoordinateResponse } from '../api/api';

interface NodeType {
  id: string;
  name?: string;
  val?: number;
  x?: number;
  y?: number;
  z?: number;
}

interface LinkType {
  source: string;
  target: string;
  curvature?: number;
  rotation?: number;
}

interface GraphData {
  nodes: NodeType[];
  links: LinkType[];
}

interface Graph3DProps {
  descriptorX: string;
  descriptorY: string;
}

export default function Graph3D({ descriptorX, descriptorY }: Graph3DProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<ForceGraph3DInstance | null>(null);
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });

  const [highlightNodes, setHighlightNodes] = useState<Set<string>>(new Set());
  const [highlightLinks, setHighlightLinks] = useState<Set<LinkType>>(new Set());

  const [selectedNode, setSelectedNode] = useState<NodeType | null>(null);
  const [overlayPos, setOverlayPos] = useState({ x: 0, y: 0 });

  const [frozen, setFrozen] = useState(false);


  useEffect(() => {
    if (!fgRef.current || !selectedNode) return;
  
    const graph = fgRef.current;
    const camera = graph.camera();
    const controls = graph.controls();
  
    let animationFrameId: number;
  
    const update = () => {
      const node = graph.graphData().nodes.find(n => n.id === selectedNode.id);
      if (!node) return;
  
      // Camera offset (distance behind the node)
      const offset = 30;
      const camPos = new THREE.Vector3(
        node.x! + offset,
        node.y! + offset,
        node.z! + offset
      );
  
      camera.position.copy(camPos);
      camera.lookAt(new THREE.Vector3(node.x!, node.y!, node.z!));
      camera.updateMatrixWorld();
  
      // If you want controls to sync (e.g., OrbitControls)
      if (controls) controls.target.set(node.x!, node.y!, node.z!);
  
      // Update overlay position
      const projected = new THREE.Vector3(node.x!, node.y!, node.z!).project(camera);
      const width = window.innerWidth;
      const height = window.innerHeight;
  
      setOverlayPos({
        x: (projected.x * 0.5 + 0.5) * width,
        y: (-projected.y * 0.5 + 0.5) * height,
      });
  
      animationFrameId = requestAnimationFrame(update);
    };
  
    update();
  
    return () => cancelAnimationFrame(animationFrameId);
  }, [selectedNode]);

  function createTextTexture(text: string): THREE.Texture {
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
  


  useEffect(() => {
    if (fgRef.current) {
      const controls = fgRef.current.controls() as OrbitControls;
      if (controls) {
        controls.enabled = !frozen;
      }
    }
  }, [frozen]);

  const findConnectedPath = (clickedLink: LinkType) => {
    const visited = new Set<string>();
    const queue = [clickedLink.source, clickedLink.target];
    const newHighlightedLinks = new Set<LinkType>();
  
    while (queue.length) {
      const current = queue.shift();
      if (!current || visited.has(current)) continue;
      visited.add(current);
  
      graphData.links.forEach(link => {
        if (link.source === current && !visited.has(link.target as string)) {
          queue.push(link.target as string);
          newHighlightedLinks.add(link);
        } else if (link.target === current && !visited.has(link.source as string)) {
          queue.push(link.source as string);
          newHighlightedLinks.add(link);
        }
      });
    }
  
    // Zoom out to fit all involved nodes
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
      z: (minZ + maxZ) / 2
    };

    console.log('Center:', center);
    console.log('Min:', { minX, minY, minZ });
    console.log('Max:', { maxX, maxY, maxZ });
    console.log('Involved Nodes:', involvedNodes);
  
    const graph = fgRef.current!;
    graph.cameraPosition(
      {
        x: center.x + (maxX - minX),
        y: center.y + (maxY - minY),
        z: center.z + (maxZ - minZ)
      },
      center,
      1000
    );
  
    setHighlightNodes(visited);
    setHighlightLinks(newHighlightedLinks);
    setFrozen(true);
  };
  
  useEffect(() => {
    console.log('Initializing 3D graph...');
    const fetchGraphData = async () => {
      console.log('Fetching graph data...');
      try {
        const res: CoordinateResponse = await getCoordinates(descriptorX, descriptorY, 'soft');
        console.log('Graph data response:', res);
        const scaleFactor = 2000;

        const nodes: NodeType[] = res.results.map((result) => ({
          id: result.id,
          name: result.id,
          val: result.scores.reduce((a, b) => a + b, 0),
          x: result.scores[0] * scaleFactor,
          y: result.scores[1] * scaleFactor,
          z: (0) * scaleFactor,
        }));
        
        console.log('Nodes:', nodes);

        const links: LinkType[] = nodes.slice(1).map((node, i) => ({
          source: nodes[i].id,
          target: node.id,
          curvature: 0.3,
          rotation: 0.5,
        }));

        setGraphData({ nodes, links });

        console.log('Graph data:', { nodes, links });
      } catch (error) {
        console.error('Error fetching graph data:', error);
      }
    };

    fetchGraphData();
  }, [descriptorX, descriptorY]);

  useEffect(() => {
    if (!fgRef.current) return;
  
    fgRef.current
      .linkColor(link => highlightLinks.has(link) ? 'white' : 'gray')
      .linkWidth(link => highlightLinks.has(link) ? 2 : 0.5)
      .linkOpacity(link => highlightLinks.has(link) ? 1 : 0.4)
      .nodeThreeObjectExtend(false)
      .nodeThreeObject(node => {
        const isHighlighted = highlightNodes.has(node.id);

        const material = new THREE.MeshBasicMaterial({
          color: isHighlighted ? 0xffffff : 0x999999,
          transparent: false,
          opacity: 1,
          depthWrite: true,
        });

        const geometry = new THREE.SphereGeometry(4); // or any shape you want
        return new THREE.Mesh(geometry, material);
      })

  }, [highlightNodes, highlightLinks]);
  

  useEffect(() => {
    if (!containerRef.current || graphData.nodes.length === 0) return;

    const graph = ForceGraph3D()(containerRef.current);
    fgRef.current = graph;

    graph
  .d3Force('charge', null)  
  .d3Force('center', null)
  .d3VelocityDecay(0)
  .graphData(graphData)
  .nodeAutoColorBy('id')
  .nodeLabel('name')
  .nodeThreeObjectExtend(true)
  // .linkCurvature('curvature')
  // .linkCurveRotation('rotation')
  .linkColor(link => highlightLinks.has(link) ? 'white' : 'gray')
  .linkWidth(link => highlightLinks.has(link) ? 2 : 0.5)
  .nodeThreeObjectExtend(false)
  .nodeThreeObject(node => {
    const isHighlighted = highlightNodes.has(node.id);

    const material = new THREE.MeshBasicMaterial({
      color: isHighlighted ? 0xffffff : 0x999999,
      transparent: false,
      opacity: 1,
      depthWrite: true,
    });

    const geometry = new THREE.SphereGeometry(4); // or any shape you want
    return new THREE.Mesh(geometry, material);
  })
  .linkThreeObject(link => {
    const isHighlighted = highlightLinks.has(link);
  
    const sourceNode = graphData.nodes.find(n => n.id === link.source);
    const targetNode = graphData.nodes.find(n => n.id === link.target);
  
    if (!sourceNode || !targetNode) return null; // fallback safety
  
    const material = new THREE.MeshBasicMaterial({
      color: isHighlighted ? 0xffffff : 0x999999,
      transparent: false,
      opacity: 1,
      blending: THREE.NoBlending,
      depthWrite: true,
    });
  
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(sourceNode.x!, sourceNode.y!, sourceNode.z!),
      new THREE.Vector3(
        (sourceNode.x! + targetNode.x!) / 2,
        (sourceNode.y! + targetNode.y!) / 2 + 10,
        (sourceNode.z! + targetNode.z!) / 2
      ),
      new THREE.Vector3(targetNode.x!, targetNode.y!, targetNode.z!)
    );
  
    const points = curve.getPoints(20);
    const geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 64, 0.5, 8, false);
  
    return new THREE.Mesh(geometry, material);
  })  
  .onLinkClick(link => {
    findConnectedPath(link);
  })  
  .onNodeClick(node => {
    const distance = 60;
    const distRatio = 1 + 1.5;
  
    const newPos = {
      x: node.x! + distance,
      y: node.y! + distance,
      z: node.z! + distance,
    };
  
    graph.cameraPosition(
      newPos,
      node as any,
      1000 //transition duration
    );
  
    setSelectedNode(node);
  })
  
  .linkOpacity(link => highlightLinks.has(link) ? 1 : 0.4)
  .linkWidth(0.1)
  .backgroundColor('black')
  .cameraPosition({ z: 300 });

  
    graph.controls().enableZoom = true;
    graph.controls().enablePan = true;
    graph.controls().enableRotate = true;

    // === ADD AXES ===
const axesLength = 200;
const axes = new THREE.Group();

// X (white)
axes.add(new THREE.ArrowHelper(
  new THREE.Vector3(1, 0, 0),
  new THREE.Vector3(0, 0, 0),
  axesLength,
  0xffffff
));
// Y (blue)
axes.add(new THREE.ArrowHelper(
  new THREE.Vector3(0, 1, 0),
  new THREE.Vector3(0, 0, 0),
  axesLength,
  0x0000ff
));
// Z timeline
const timeline = new THREE.Group();
const timelineColor = 0x00ffff;
const tickColor = 0xffffff;
const labelColor = '#ffffff';

const tickSpacing = 20;
const tickCount = 10; // on each side of zero

const halfLength = tickSpacing * tickCount;

// Main timeline line (from -Z to +Z)
timeline.add(new THREE.Line(
  new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, -halfLength),
    new THREE.Vector3(0, 0, halfLength)
  ]),
  new THREE.LineBasicMaterial({ color: timelineColor })
));

// Ticks + labels
for (let i = -tickCount; i <= tickCount; i++) {
  const z = i * tickSpacing;

  // Tick mark
  timeline.add(new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-2, 0, z),
      new THREE.Vector3(2, 0, z)
    ]),
    new THREE.LineBasicMaterial({ color: tickColor })
  ));

  // Label (Sprite)
  const label = new THREE.Sprite(new THREE.SpriteMaterial({
    map: createTextTexture(`T${i}`),
    depthTest: false,
    transparent: true
  }));
  label.scale.set(10, 5, 1);
  label.position.set(5, 0, z);
  timeline.add(label);
}

graph.scene().add(axes);
graph.scene().add(timeline);

// === ADD GRIDLINES ===
const grid = new THREE.Group();
const step = 30;

for (let i = -axesLength; i <= axesLength; i += step) {
  const fade = 1 - Math.abs(i / axesLength); // 1 at center, 0 at edge
  const material = new THREE.LineBasicMaterial({
    color: 0x333333,
    opacity: fade,
    transparent: true,
    depthWrite: false
  });

  // XY Plane
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

  // XZ Plane
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

  // YZ Plane
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

graph.scene().add(grid);



    return () => {
      fgRef.current = null;
    };
  }, [graphData]);

  return (
  <div ref={containerRef} className="relative w-screen h-screen"
    onClick={() => {
      setSelectedNode(null);
      setHighlightNodes(new Set());
      setHighlightLinks(new Set());
      setFrozen(false);
    }}>
      {selectedNode && (
        <div
          style={{
            position: 'absolute',
            top: overlayPos.y,
            left: overlayPos.x,
            transform: 'translate(-0%, -50%)',
            width: '50svh',
            height: '60svh',
            backgroundImage: "url('/overlay.svg')",
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            padding: '6px 10px',
            borderRadius: '6px',
            pointerEvents: 'none',
            zIndex: 10
          }}
        >
          {selectedNode.name}
        </div>
      )}
    </div>
  )};
