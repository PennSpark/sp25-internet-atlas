'use client';

import { useEffect, useRef } from 'react';
import ForceGraph3D, { ForceGraph3DInstance } from '3d-force-graph';
import * as THREE from 'three';

interface NodeType {
  id: string;
  name?: string;
  val?: number;
  color?: string;
  x?: number;
  y?: number;
  z?: number;
}

interface LinkType {
  source: string;
  target: string;
  curvature?: number;
  rotation?: number;
  user?: string;
}

interface GraphData {
  nodes: NodeType[];
  links: LinkType[];
}

interface Graph3DProps {
  data: GraphData;
}

export default function Graph3D({ data }: Graph3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<ForceGraph3DInstance | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const graph = ForceGraph3D()(containerRef.current);
    fgRef.current = graph;

    const resize = () => {
      if (containerRef.current) {
        const { offsetWidth, offsetHeight } = containerRef.current;
        graph.width(offsetWidth);
        graph.height(offsetHeight);
      }
    };

    // Initial size
    resize();

    graph
      .graphData(data)
      .nodeAutoColorBy('id')
      .nodeLabel('name')
      .nodeThreeObject((node) => {
        const sphereGeometry = new THREE.SphereGeometry(1, 16, 16);
        const sphereMaterial = new THREE.MeshBasicMaterial({ color: node.color || 'orange' });
        return new THREE.Mesh(sphereGeometry, sphereMaterial);
      })
      .nodeThreeObjectExtend(false)
      .linkCurvature('curvature')
      .linkCurveRotation('rotation')
      .linkDirectionalParticles(1)
      .linkOpacity(0.5)
      .linkWidth(0.1)
      .backgroundColor('black')
      .cameraPosition({ z: 100 });

    graph.controls().enableZoom = true;

    graph.onEngineTick(() => {
      data.nodes.forEach((node) => {
        const obj = graph.nodeThreeObject()(node);
        if (obj) {
          obj.position.set(node.x ?? 0, node.y ?? 0, node.z ?? 0);
        }
      });
    });

    window.addEventListener('resize', resize);

    return () => {
      fgRef.current = null;
      window.removeEventListener('resize', resize);
    };
  }, [data]);

  return <div ref={containerRef} className="w-screen h-screen" />;
}
