"use client"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import ForceGraph from './components/ForceGraph'
import SlideShow from './components/SlideShow'
import { slides, NodeId } from './data/slides'

import PostProcessOverlay from "./components/PostProcessOverlay"

export default function InternetAtlas() {
  const [selectedNode, setSelectedNode] = useState<NodeId | null>(null)
  const navigate = useNavigate()

  // Define the nodes and links
  const nodes = [
    { id: "purpose", name: "Our purpose", x: 0, y: 0, isEnter: false },
    { id: "how", name: "How does it work?", x: 100, y: -100, isEnter: false },
    { id: "involved", name: "Get Involved", x: 100, y: 0, isEnter: false },
    { id: "team", name: "Our team", x: 100, y: 100, isEnter: false },
    { id: "enter", name: "ENTER", x: -100, y: 0, isEnter: true }
  ]

  const links = [
    { source: "purpose", target: "how", isDashed: true },
    { source: "purpose", target: "involved", isDashed: true },
    { source: "purpose", target: "team", isDashed: true },
    { source: "enter", target: "purpose", isDashed: false }
  ]

  const handleNodeClick = (nodeId: string) => {
    if (nodeId === "enter") {
      // First highlight the ENTER node
      setSelectedNode("enter" as NodeId)
      // Then navigate after a short delay to show the highlight
      setTimeout(() => {
        navigate('/visualization')
      }, 300)
      return
    }
    setSelectedNode(prevNode => prevNode === nodeId ? null : nodeId as NodeId)
  }

  return (
    <div className="relative w-full h-screen bg-black text-white overflow-hidden">
      {!selectedNode && (
        <PostProcessOverlay />
      )}
      {/* Corner plus symbols */}
      <div className="absolute top-8 left-8 z-[11]">
        <h1 className="text-[#757575]">
          +
        </h1>
      </div>
      <div className="absolute top-8 right-8 z-[11]">
        <h1 className="text-[#757575]">
          +
        </h1>
      </div>
      <div className="absolute bottom-8 left-8 z-[11]">
        <h1 className="text-[#757575]">
          +
        </h1>
      </div>
      <div className="absolute bottom-8 right-8 z-[11]">
        <h1 className="text-[#757575]">
          +
        </h1>
      </div>

      {/* Header */}
      <div className="absolute top-8 left-16 md:left-24 flex items-end space-x-1 md:space-x-4 z-[11]">
        <h1 className="tracking-wider handjet">INTERNET ATLAS</h1>
        <h2 className="hidden md:flex mb-[0.2rem] text-[#757575] handjet">How do we journey through the web?</h2>
      </div>

      <div className="absolute bottom-9.5 md:bottom-11 right-16 md:right-24 flex items-end z-[100]">
        <h3 className="text-[#757575] handjet"><a href='https://pennspark.org/' target="_blank" className='cursor-pointer hover:text-white'>Penn Spark 2024</a></h3>
      </div>

      {/* Main content */}
      <div className="w-full h-full">
        {/* Force Graph - now spans full width */}
        <div className="absolute inset-0 z-[11]">
          <ForceGraph 
            nodes={nodes} 
            links={links} 
            onNodeClick={handleNodeClick}
            selectedNode={selectedNode}
          />
        </div>

        {/* Right side - Slides */}
        {selectedNode && slides[selectedNode] && (
          <div className="absolute right-0 md:w-120 w-full h-full z-[11]">
            <SlideShow 
              slides={slides[selectedNode]} 
              selectedNode={selectedNode}
              onClose={() => setSelectedNode(null)}
            />
          </div>
        )}
      </div>
    </div>
  )
}