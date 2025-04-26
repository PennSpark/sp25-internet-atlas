'use client';

import { useEffect, useState } from 'react';

interface PathOverlayProps {
  pathNodes: { id: string; x: number; y: number }[]; // normalized [0, 1]
  setFrozen?: (val: boolean) => void;
  clearPathNodes?: () => void;
}

export default function PathOverlay({ pathNodes, setFrozen, clearPathNodes }: PathOverlayProps) {
  const [windowSize, setWindowSize] = useState({ width: 1, height: 1 });

  useEffect(() => {
    const updateSize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };

    updateSize(); // initial size
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  if (pathNodes.length < 2) return null;

  const handleClose = () => {
    setFrozen?.(false);
    clearPathNodes?.();
  };

  const scaledNodes = pathNodes.map(node => ({
    id: node.id,
    x: (windowSize.width / 2) + (node.x - 0.5) * windowSize.height * 0.92,
    y: node.y * windowSize.height,
  }));

  const pathData = scaledNodes.map((node, index) => {
    const prefix = index === 0 ? 'M' : 'L';
    return `${prefix} ${node.x} ${node.y}`;
  }).join(' ');

  return (
    <svg
      className="absolute inset-0 w-screen h-screen"
      width="100%"
      height="100%"
      viewBox={`0 0 ${windowSize.width} ${windowSize.height}`}
      preserveAspectRatio="none"
    >
      {/* translucent black background */}
      <rect x="0" y="0" width={windowSize.width} height={windowSize.height} fill="black" opacity="0.75" />

      {/* path */}
      <path
        d={pathData}
        fill="none"
        stroke="white"
        strokeWidth={2}
        strokeDasharray="100%"
        strokeDashoffset="100%"
      >
        <animate
          attributeName="stroke-dashoffset"
          from="1000"
          to="0"
          dur="3s"
          fill="freeze"
          begin="0s"
        />
      </path>

      {/* nodes */}
      {scaledNodes.map((node, index) => {
        const isStart = index === 0;
        const isEnd = index === scaledNodes.length - 1;

        if (isStart || isEnd) {
          return (
            <image
              key={node.id}
              href={isStart ? "/start-rect.svg" : "/end-rect.svg"}
              x={node.x - 20}
              y={node.y - 20}
              width="40"
              height="40"
            />
          );
        } else {
          return (
            <circle
              key={node.id}
              cx={node.x}
              cy={node.y}
              r={7}
              fill="white"
            />
          );
        }
      })}

      {/* button */}
      <foreignObject x="0" y="0" width={windowSize.width} height={windowSize.height}>
        <div className="absolute top-0 left-0 m-4 p-2">
          <button
            className="bg-blue-500 text-white rounded p-2"
            onClick={handleClose}
          >
            Unfreeze & Close
          </button>
        </div>
      </foreignObject>
    </svg>
  );
}
