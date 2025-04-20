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

    // counts edges for landmark size
    const outgoingEdges: Record<string, number> = {};    
    data.nodes.forEach(node => {
      outgoingEdges[node.id] = data.links.filter(
        link => link.source === node.id).length;
    });

    graph
      .graphData(data)
      .nodeAutoColorBy('id')
      .nodeLabel('name')
      .nodeThreeObject((node) => {
        const group = new THREE.Group();
        const sphereGeometry = new THREE.SphereGeometry(1, 16, 16);
        const sphereMaterial = new THREE.MeshBasicMaterial({ color: node.color || 'orange' });
        const nodeSphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        group.add(nodeSphere);
        
        // landmarks
        const connections = outgoingEdges[node.id] || 0;
        const landmarkRadius = 2 + connections * 3.5; // arbitraruy number to vary size of landmarks based on # of outgoing edges
        
        const landmarkGeometry = new THREE.SphereGeometry(landmarkRadius, 32, 32);
        const landmarkMaterial = new THREE.MeshBasicMaterial({ 
          color: node.color || 'orange',
          transparent: true,
          opacity: 0.1
        });
        
        const landmarkSphere = new THREE.Mesh(landmarkGeometry, landmarkMaterial);
        group.add(landmarkSphere);
        
        return group;
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
