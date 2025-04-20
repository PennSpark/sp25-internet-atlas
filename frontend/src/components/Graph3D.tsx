'use client';

import { useEffect, useRef, useState } from 'react';
import ForceGraph3D, { ForceGraph3DInstance } from '3d-force-graph';
import * as THREE from 'three';

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

  useEffect(() => {
    console.log('Initializing 3D graph...');
    const fetchGraphData = async () => {
      console.log('Fetching graph data...');
      try {
        const res: CoordinateResponse = await getCoordinates(descriptorX, descriptorY, 'cherry');
        console.log('Graph data response:', res);
        const scaleFactor = 2000;

        const nodes: NodeType[] = res.results.map((result) => ({
          id: result.id,
          name: result.id,
          val: result.scores.reduce((a, b) => a + b, 0),
          x: result.scores[0] * scaleFactor,
          y: result.scores[1] * scaleFactor,
          z: (result.scores[2] ?? 0) * scaleFactor,
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
    if (!containerRef.current || graphData.nodes.length === 0) return;

    const graph = ForceGraph3D()(containerRef.current);
    fgRef.current = graph;

    graph
  .d3Force('charge', null)
  .d3VelocityDecay(0)
  .graphData(graphData)
  .nodeAutoColorBy('id')
  .nodeLabel('name')
  .nodeThreeObjectExtend(true)
  // .linkCurvature('curvature')
  // .linkCurveRotation('rotation')
  .linkOpacity(0.4)
  .linkWidth(0.1)
  .backgroundColor('black')
  .cameraPosition({ z: 300 });

  
    graph.controls().enableZoom = true;
    graph.controls().enablePan = true;
    graph.controls().enableRotate = true;

    // === ADD AXES ===
const axesLength = 200;
const axes = new THREE.Group();

// X (red)
axes.add(new THREE.ArrowHelper(
  new THREE.Vector3(1, 0, 0),
  new THREE.Vector3(0, 0, 0),
  axesLength,
  0xff0000
));
// Y (green)
axes.add(new THREE.ArrowHelper(
  new THREE.Vector3(0, 1, 0),
  new THREE.Vector3(0, 0, 0),
  axesLength,
  0x00ff00
));
// Z (blue)
axes.add(new THREE.ArrowHelper(
  new THREE.Vector3(0, 0, 1),
  new THREE.Vector3(0, 0, 0),
  axesLength,
  0x0000ff
));

graph.scene().add(axes);

// === ADD GRIDLINES ===
const gridMaterial = new THREE.LineBasicMaterial({ color: 0x333333 });
const grid = new THREE.Group();
const step = 30;

for (let i = -axesLength; i <= axesLength; i += step) {
  // XY Plane
  grid.add(new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(i, -axesLength, 0),
      new THREE.Vector3(i, axesLength, 0)
    ]),
    gridMaterial
  ));
  grid.add(new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-axesLength, i, 0),
      new THREE.Vector3(axesLength, i, 0)
    ]),
    gridMaterial
  ));

  // XZ Plane
  grid.add(new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(i, 0, -axesLength),
      new THREE.Vector3(i, 0, axesLength)
    ]),
    gridMaterial
  ));
  grid.add(new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-axesLength, 0, i),
      new THREE.Vector3(axesLength, 0, i)
    ]),
    gridMaterial
  ));

  // YZ Plane
  grid.add(new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, i, -axesLength),
      new THREE.Vector3(0, i, axesLength)
    ]),
    gridMaterial
  ));
  grid.add(new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, -axesLength, i),
      new THREE.Vector3(0, axesLength, i)
    ]),
    gridMaterial
  ));
}

graph.scene().add(grid);



    return () => {
      fgRef.current = null;
    };
  }, [graphData]);

  return <div ref={containerRef} className="w-screen h-screen" />;
}
