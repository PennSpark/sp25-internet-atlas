'use client';

import { useEffect, useRef } from 'react';
import ForceGraph3D, { ForceGraph3DInstance } from '3d-force-graph';

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

    graph
      .graphData(data)
      .nodeAutoColorBy('id')
      .nodeLabel('name')
      .nodeThreeObjectExtend(true)
      .linkCurvature('curvature')
      .linkCurveRotation('rotation')
      .linkDirectionalParticles(2)
      .linkOpacity(0.4)
      .linkWidth(1)
      .backgroundColor('#111827')
      .cameraPosition({ z: 100 });

    graph.controls().enableZoom = true;

    // ✅ Set node positions *after* node objects are created
    graph.onEngineTick(() => {
      for (const node of data.nodes) {
        const obj = graph.nodeThreeObject()(node);
        if (obj) {
          obj.position.set(node.x ?? 0, node.y ?? 0, node.z ?? 0);
        }
      }
    });

    return () => {
      fgRef.current = null;
    };
  }, [data]);

  return <div ref={containerRef} className="w-screen h-screen" />;
}
