'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import ForceGraph3D, { ForceGraph3DInstance } from '3d-force-graph';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

import { getCoordinates, CoordinateResponse, getEdges } from '../api/api';
import { NodeType, LinkType } from '../types';
import { setupGraphControls, createTextTexture, findConnectedPath, addSceneDecorations, configureScene} from './graphHelpers';

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

  const [highlightNodes, setHighlightNodes] = useState<Set<string> | null>(null);
  const [highlightLinks, setHighlightLinks] = useState<Set<LinkType> | null>(null);

  const [selectedNode, setSelectedNode] = useState<NodeType | null>(null);
  const [overlayPos, setOverlayPos] = useState({ x: 0, y: 0 });

  const [frozen, setFrozen] = useState(false);

  const [loading, setLoading] = useState(false);


  useEffect(() => {
    const graph = ForceGraph3D()(containerRef.current);
    fgRef.current = graph;
  
    // Modular scene + control setup
    configureScene(graph);
  
    const handleResize = () => {
      if (fgRef.current) {
        fgRef.current.width(window.innerWidth);
        fgRef.current.height(window.innerHeight);
      }
    };
  
    handleResize();
    window.addEventListener('resize', handleResize);
  
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  

  useEffect(() => {
    if (!fgRef.current || !selectedNode) return;
  
    const graph = fgRef.current;
    const camera = graph.camera();
    const controls = graph.controls();
  
    let animationFrameId: number;
  
    const update = () => {
      const node = graph.graphData().nodes.find(n => n.id === selectedNode.id);
      if (!node) {
        camera.lookAt(new THREE.Vector3(0, 0, 0));
        return
      };
  
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

  useEffect(() => {
    if (fgRef.current) {
      const controls = fgRef.current.controls() as OrbitControls;
      
      if (controls) {
        controls.enabled = !frozen;
      }
    }
  }, [frozen]);
  
  useEffect(() => {
    console.log('Initializing 3D graph...');
    if (!fgRef.current) {
      console.log('Graph not initialized or no nodes available.');
      return;
    };
    setSelectedNode(null);
    setHighlightNodes(null);
    setHighlightLinks(null);
    setFrozen(false);
    if (!containerRef.current) return;
    const fetchGraphData = async () => {
      console.log('Fetching graph data...');
      setLoading(true);
      try {
        const res: CoordinateResponse = await getCoordinates(descriptorX, descriptorY, 'soft');
        console.log('Graph data response:', res);
        const scaleFactor = 2000;
    
        const nodes: NodeType[] = res.results.map((result) => ({
          id: result.id.replace(/^https?:\/\//, ''),
          name: result.id.replace(/^https?:\/\//, ''),
          val: result.scores.reduce((a, b) => a + b, 0),
          x: result.scores[0] * scaleFactor,
          y: result.scores[1] * scaleFactor,
          z: (0) * scaleFactor,
        }));
    
        const websiteIds = nodes.map((node) => node.id);

        const edgeRes = await getEdges(websiteIds);
        console.log('Fetched edges:', edgeRes);
    
        const links: LinkType[] = edgeRes.results.map((entry) => ({
          source: nodes.find(node => node.id === entry.origin)!,
          target: nodes.find(node => node.id === entry.target)!,
          curvature: 0.3,
          rotation: 0.5,
        }));
    
        setGraphData({ nodes, links });
    
        console.log('Graph data:', { nodes, links });
      } catch (error) {
        console.error('Error fetching graph data or edges:', error);
      } finally {
        setLoading(false); //end loading
      }
    };
    

    fetchGraphData();
  }, [descriptorX, descriptorY, graphData.nodes.length]);

  const defaultSphere = useMemo(() => new THREE.SphereGeometry(3), []);
  const defaultMaterial = useMemo(() => new THREE.MeshBasicMaterial({ color: 0x999999 }), []);

  const highlightedMaterial = useMemo(() => new THREE.MeshBasicMaterial({ color: 0xffffff }), []);

  useEffect(() => {
    if (!fgRef.current || !highlightLinks || !highlightNodes) return;
  
    fgRef.current
      .linkColor((link) => highlightLinks.has(link as LinkType) ? 'white' : 'gray')
      .linkWidth((link) => highlightLinks.has(link as LinkType) ? 2 : 0.5)
      .linkOpacity((link) => highlightLinks.has(link as LinkType) ? 1 : 0.4)
      .nodeThreeObjectExtend(false)
      .nodeThreeObject((node: NodeType) => {
      const isHighlighted: boolean = highlightNodes.has(node.id);
      return new THREE.Mesh(defaultSphere, isHighlighted ? highlightedMaterial : defaultMaterial);
      })

  }, [highlightNodes, highlightLinks, selectedNode, defaultMaterial, defaultSphere, highlightedMaterial]);
  

  useEffect(() => {
    if (!containerRef.current || graphData.nodes.length === 0 || !fgRef.current) return;

    const graph = fgRef.current!;

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
    .linkColor((link: LinkType) => highlightLinks && highlightLinks.has(link) ? 'white' : 'gray')
    .linkWidth((link: LinkType) => highlightLinks && highlightLinks.has(link) ? 2 : 0.5)
    .nodeThreeObjectExtend(false)
    .nodeThreeObject((node: NodeType): THREE.Mesh => {
      const isHighlighted: boolean = highlightNodes?.has(node.id) ?? false;
      return new THREE.Mesh(defaultSphere, isHighlighted ? highlightedMaterial : defaultMaterial);
    })

    .linkThreeObject((link: LinkType): THREE.Mesh | null => {
      const isHighlighted: boolean = highlightLinks?.has(link) ?? false;
      
      const sourceNode: NodeType | undefined = graphData.nodes.find(n => n.id === link.source);
      const targetNode: NodeType | undefined = graphData.nodes.find(n => n.id === link.target);
      
      if (!sourceNode || !targetNode) return null; // fallback safety
      
      const material: THREE.MeshBasicMaterial = new THREE.MeshBasicMaterial({
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
    .onLinkClick((link: LinkType): void => {
      findConnectedPath(
      link,
      graphData,
      setHighlightNodes,
      setHighlightLinks,
      fgRef.current!,
      setFrozen
      );
    })  
    .onNodeClick((node: NodeType): void => {
      const distance = 40;
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
    
      if (typeof node.id === 'string') {
      setSelectedNode(node as NodeType);
      } else {
      console.warn('Node id is not a string:', node);
      }
    })
    
    .linkOpacity((link: LinkType): number => highlightLinks.has(link) ? 1 : 0.4)
    .linkWidth(0.1)
    .backgroundColor('black')
    .cameraPosition({ z: 500 });

  return () => {
    if (fgRef.current) {
      fgRef.current.graphData({ nodes: [], links: [] });
    }
  };
  
  }, [defaultMaterial, defaultSphere, graphData, highlightLinks, highlightNodes, highlightedMaterial]);

  return (
  <div ref={containerRef} className="relative w-screen h-screen"
    onClick={() => {
      setSelectedNode(null);
      setHighlightNodes(null);
      setHighlightLinks(null);
      setFrozen(false);
    }}>
      {loading && (
        <div className="absolute inset-0 bg-[radial-gradient(circle,_black,_transparent)] opacity-70 flex items-center justify-center z-50">
          <div className='flex justify-center items-center animate-pulse w-50 aspect-[1/1] rounded-full border border-white'>
          <h1>Loading...</h1>
          </div>
        </div>
      )}
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
