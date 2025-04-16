"use client"

import { useEffect, useRef } from 'react'
import * as d3 from 'd3'

interface Node extends d3.SimulationNodeDatum {
  id: string
  name: string
  x: number
  y: number
  isEnter?: boolean
}

interface Link extends d3.SimulationLinkDatum<Node> {
  source: string | Node
  target: string | Node
  isDashed: boolean
}

interface ForceGraphProps {
  nodes: Node[]
  links: Link[]
  width?: number
  height?: number
  onNodeClick?: (nodeId: string) => void
  selectedNode?: string | null
}

export default function ForceGraph({ 
  nodes, 
  links, 
  width = window.innerWidth / 2, // Changed to half width
  height = window.innerHeight,
  onNodeClick,
  selectedNode 
}: ForceGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!svgRef.current) return

    // Helper function to calculate line-box intersection
    function calculateIntersection(x1: number, y1: number, x2: number, y2: number, boxSize: number) {
      // Calculate direction vector
      const dx = x2 - x1
      const dy = y2 - y1
      
      // Normalize direction vector
      const length = Math.sqrt(dx * dx + dy * dy)
      const normalizedDx = dx / length
      const normalizedDy = dy / length
      
      // Calculate intersection point
      return {
        x: x2 - normalizedDx * boxSize,
        y: y2 - normalizedDy * boxSize
      }
    }

    // Clear any existing content
    d3.select(svgRef.current).selectAll("*").remove()

    // Create the SVG container
    const svg = d3.select(svgRef.current)
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("viewBox", [-width/2, -height/2, width, height])

    // Create defs for image
    const defs = svg.append("defs")
    defs.append("pattern")
      .attr("id", "union-pattern")
      .attr("width", 1)
      .attr("height", 1)
      .append("image")
      .attr("href", "/Union.png")
      .attr("width", 40)
      .attr("height", 40)

    // Create the force simulation
    const simulation = d3.forceSimulation<Node>(nodes)
      .force("link", d3.forceLink<Node, Link>(links).id(d => d.id).distance(150))
      .force("charge", d3.forceManyBody().strength(-200))
      .force("collision", d3.forceCollide().radius(30))

    // Create the links
    const link = svg.append("g")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", d => d.isDashed ? "#757575" : "#0b9b79")
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", d => d.isDashed ? "5,5" : "none")
      .style("opacity", d => {
        if (!selectedNode) return 1
        return (d.source as Node).id === selectedNode || (d.target as Node).id === selectedNode ? 1 : 0.2
      })

    // Add dots at the end of lines
    const linkDots = svg.append("g")
      .selectAll("rect")
      .data(links)
      .join("circle")
      .attr("r", 10)
      .attr("fill", d => d.isDashed ? "#757575" : "#0b9b79")
      .style("opacity", d => {
        if (!selectedNode) return 1
        return (d.source as Node).id === selectedNode || (d.target as Node).id === selectedNode ? 1 : 0.2
      })

    // Create the nodes
    const node = svg.append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .style("cursor", "pointer")
      .style("opacity", d => {
        if (!selectedNode) return 1
        return d.id === selectedNode ? 1 : 0.2
      })
      .on("click", (event, d) => {
        if (onNodeClick) onNodeClick(d.id)
      })
      .call(drag(simulation) as any)

    // Add hexagon background to non-ENTER nodes
    node.filter(d => !d.isEnter)
      .append("circle")
      .attr("r", 20)
      .attr("fill", d => {
        if (d.id === "purpose") return "transparent"
        if (d.id === "involved") return "white"
        return "#595959"
      })
      .attr("stroke", d => d.id === "purpose" ? "#595959" : "none")
      .attr("stroke-opacity", 0.5)

    // Add transparent box around Union image for ENTER node
    node.filter(d => d.isEnter === true)
      .append("rect")
      .attr("x", -30)
      .attr("y", -30)
      .attr("width", 60)
      .attr("height", 60)
      .attr("fill", "transparent")
      .attr("rx", 4)

    // Add Union image for ENTER node
    node.filter(d => d.isEnter === true)
      .append("rect")
      .attr("x", -20)
      .attr("y", -20)
      .attr("width", 40)
      .attr("height", 40)
      .attr("fill", "url(#union-pattern)")

    // Add green box under ENTER node
    node.filter(d => d.isEnter === true)
      .append("rect")
      .attr("x", -40)
      .attr("y", 30)
      .attr("width", 80)
      .attr("height", 30)
      .attr("fill", "#0b9b79")

    // Add hexagon icon to non-ENTER nodes
    node.filter(d => !d.isEnter)
      .append("text")
      .attr("font-family", "lucide-icons")
      .attr("font-size", "24px")
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("fill", d => d.id === "involved" ? "black" : "white")
      .text("⬡")

    // Add white background for "Our team" label
    node.filter(d => d.id === "team")
      .append("rect")
      .attr("x", 30)
      .attr("y", -15)
      .attr("width", 120)
      .attr("height", 30)
      .attr("fill", "white")

    // Add labels
    node.append("text")
      .attr("class", "handjet")
      .attr("font-size", "24px")
      .attr("text-anchor", d => d.isEnter ? "middle" : "start")
      .attr("x", d => d.isEnter ? 0 : 30)
      .attr("y", d => d.isEnter ? 50 : "0.35em")
      .attr("fill", d => {
        if (d.id === "team") return "black"
        if (d.id === "enter") return "black"
        return "white"
      })
      .text(d => d.name)

    // Update positions on each tick
    simulation.on("tick", () => {
      // Update links with intersection points for ENTER node
      link.attr("x1", d => {
        if ((d.source as Node).id === "enter") {
          const intersection = calculateIntersection(
            (d.source as Node).x,
            (d.source as Node).y,
            (d.target as Node).x,
            (d.target as Node).y,
            110 // box size
          )
          return intersection.x
        }
        return (d.source as Node).x
      })
      .attr("y1", d => {
        if ((d.source as Node).id === "enter") {
          const intersection = calculateIntersection(
            (d.source as Node).x,
            (d.source as Node).y,
            (d.target as Node).x,
            (d.target as Node).y,
            110 // box size
          )
          return intersection.y
        }
        return (d.source as Node).y
      })
      .attr("x2", d => (d.target as Node).x)
      .attr("y2", d => (d.target as Node).y)

      // Update dot positions to be at source end
      linkDots
        .attr("cx", d => {
          if ((d.source as Node).id === "enter") {
            const intersection = calculateIntersection(
              (d.source as Node).x,
              (d.source as Node).y,
              (d.target as Node).x,
              (d.target as Node).y,
              110 // box size
            )
            return intersection.x
          }
          return (d.source as Node).x
        })
        .attr("cy", d => {
          if ((d.source as Node).id === "enter") {
            const intersection = calculateIntersection(
              (d.source as Node).x,
              (d.source as Node).y,
              (d.target as Node).x,
              (d.target as Node).y,
              110 // box size
            )
            return intersection.y
          }
          return (d.source as Node).y
        })

      node.attr("transform", d => `translate(${d.x},${d.y})`)
    })

    // Drag behavior
    function drag(simulation: d3.Simulation<Node, undefined>) {
      function dragstarted(event: d3.D3DragEvent<SVGElement, Node, any>, d: Node) {
        if (!event.active) simulation.alphaTarget(0.3).restart()
        d.fx = d.x
        d.fy = d.y
      }

      function dragged(event: d3.D3DragEvent<SVGElement, Node, any>, d: Node) {
        d.fx = event.x
        d.fy = event.y
      }

      function dragended(event: d3.D3DragEvent<SVGElement, Node, any>, d: Node) {
        if (!event.active) simulation.alphaTarget(0)
        d.fx = null
        d.fy = null
      }

      return d3.drag<SVGElement, Node>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended)
    }

    return () => {
      simulation.stop()
    }
  }, [nodes, links, width, height, selectedNode, onNodeClick])

  return <svg ref={svgRef} className="w-full h-full" />
} 