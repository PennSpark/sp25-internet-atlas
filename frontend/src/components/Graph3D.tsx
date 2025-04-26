import { useEffect, useRef, useState, useMemo } from 'react';
import ForceGraph3D, { ForceGraph3DInstance } from '3d-force-graph';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

import { getCoordinates, CoordinateResponse, getEdges } from '../api/api';
import { NodeType, LinkType } from '../types';
import { findConnectedPath, configureScene} from './graphHelpers';

interface GraphData {
  nodes: NodeType[];
  links: LinkType[];
}

interface Graph3DProps {
  descriptorX: string;
  descriptorY: string;
}

export default function Graph3D({ descriptorX, descriptorY }: Graph3DProps) {
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
    const graph = new ForceGraph3D(containerRef.current!) as ForceGraph3DInstance;
    fgRef.current = graph;
  
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
  
      const controls = fgRef.current?.controls() as OrbitControls | undefined;

      if (controls) {
        controls.target.set(node.x!, node.y!, node.z!);
        controls.update();
      }
        
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
    const controls = fgRef.current?.controls() as OrbitControls | undefined;
    if (controls) {
      const shouldEnable = !frozen;
      controls.enableRotate = shouldEnable;
      controls.enableZoom = shouldEnable;
      controls.enablePan = shouldEnable;
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
      
      .nodeThreeObjectExtend(false)
      .nodeThreeObject((node) => {
        const id = typeof node.id === 'string' ? node.id : String(node.id ?? '');
        const isHighlighted = highlightNodes?.has(id) ?? false;
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
    .linkColor((link) => {
      return highlightLinks?.has(link as LinkType) ? 'white' : 'gray';
    })
    .linkWidth((link) => {
      return highlightLinks?.has(link as LinkType) ? 2 : 0.5;
    })
    .nodeThreeObjectExtend(false)
    .nodeThreeObject((node) => {
      const typedNode = node as NodeType;
      const isHighlighted = highlightNodes?.has(typedNode.id) ?? false;
      return new THREE.Mesh(defaultSphere, isHighlighted ? highlightedMaterial : defaultMaterial);
    })
    .linkThreeObject((linkObj) => {
      const isHighlighted = highlightLinks?.has(linkObj as LinkType) ?? false;
    
      const source = typeof linkObj.source === 'object' ? linkObj.source as NodeType : null;
      const target = typeof linkObj.target === 'object' ? linkObj.target as NodeType : null;
    
      if (!source || !target) {
        // return an invisible dummy object instead of null
        const emptyObject = new THREE.Object3D();
        emptyObject.visible = false;
        return emptyObject;
      }
    
      const material = new THREE.MeshBasicMaterial({
        color: isHighlighted ? 0xffffff : 0x999999,
        transparent: false,
        opacity: 1,
        blending: THREE.NoBlending,
        depthWrite: true,
      });
    
      const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(source.x!, source.y!, source.z!),
        new THREE.Vector3(
          (source.x! + target.x!) / 2,
          (source.y! + target.y!) / 2 + 10,
          (source.z! + target.z!) / 2
        ),
        new THREE.Vector3(target.x!, target.y!, target.z!)
      );
    
      const points = curve.getPoints(20);
      const geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 64, 0.5, 8, false);
    
      return new THREE.Mesh(geometry, material);
    })
    
    .onLinkClick((linkObj) => {
      const sourceNode = typeof linkObj.source === 'object' ? linkObj.source as NodeType : undefined;
      const targetNode = typeof linkObj.target === 'object' ? linkObj.target as NodeType : undefined;
    
      if (!sourceNode || !targetNode) {
        console.warn('Link source/target is not an object:', linkObj);
        return;
      }
    
      const safeLink: LinkType = {
        source: sourceNode,
        target: targetNode,
        curvature: (linkObj as { curvature?: number }).curvature ?? 0,
        rotation: (linkObj as { rotation?: number }).rotation ?? 0,
      };
    
      findConnectedPath(
        safeLink,
        graphData,
        setHighlightNodes,
        setHighlightLinks,
        fgRef.current!,
        setFrozen
      );
    })
    
     
    .onNodeClick((node) => {
      if (typeof node.id !== 'string') {
        console.warn('Invalid node id:', node);
        return;
      }
    
      const distance = 40;
      const newPos = {
        x: node.x! + distance,
        y: node.y! + distance,
        z: node.z! + distance,
      };
    
      if (node.x !== undefined && node.y !== undefined && node.z !== undefined) {
        const lookAt = { x: node.x, y: node.y, z: node.z };
        fgRef.current?.cameraPosition(newPos, lookAt, 1000);
      } else {
        console.warn('Node coordinates are undefined:', node);
      }
      
      setSelectedNode(node as NodeType); // Safe cast after guard
    })
    
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