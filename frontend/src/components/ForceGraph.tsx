"use client"

import { useEffect, useRef, useMemo } from "react"
import * as d3 from "d3"

interface Node extends d3.SimulationNodeDatum {
  id: string
  name: string
  x?: number
  y?: number
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

const CENTER_ID = "purpose"
const BRANCHED_TARGETS = new Set<string>(["enter", "how", "involved"])
const GRID_SIZE = 30

function normalizeId(id: string | Node): string {
  return typeof id === "string" ? id : id.id
}

function getBackgroundWidth(nodeId: string, isEnter: boolean = false, name: string = ""): number {
  const customWidths: Record<string, number> = {
    purpose: 100,
    how: 150,
    involved: 100,
    team: 75,
    enter: 80
  }
  if (customWidths[nodeId]) return customWidths[nodeId]
  return isEnter ? 80 : name.length * 10 - 7
}

export default function ForceGraph({
  nodes,
  links,
  width = typeof window !== "undefined" ? window.innerWidth / 2 : 600,
  height = typeof window !== "undefined" ? window.innerHeight : 800,
  onNodeClick,
  selectedNode
}: ForceGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const hasShiftedRef = useRef(false)

  // Add mid-nodes between CENTER_ID -> selected branches
const { augmentedNodes, augmentedLinks } = useMemo(() => {
  const newNodes: Node[] = nodes.map(n => ({ ...n }))
  const newLinks: Link[] = []

  const center = newNodes.find(n => n.id === CENTER_ID)

  for (const link of links) {
    const a = normalizeId(link.source)
    const b = normalizeId(link.target)

    // Figure out which end is center and which is branch, regardless of direction
    let centerId: string | null = null
    let branchId: string | null = null

    if (a === CENTER_ID && BRANCHED_TARGETS.has(b)) {
      centerId = a
      branchId = b
    } else if (b === CENTER_ID && BRANCHED_TARGETS.has(a)) {
      centerId = b
      branchId = a
    }

    // If this link isn't a center↔branch pair, keep it as-is
    if (!centerId || !branchId) {
      newLinks.push({ ...link, source: a, target: b })
      continue
    }

    // Build / reuse a mid-node for this branch
    const midId = `${branchId}-mid`
    let midNode = newNodes.find(n => n.id === midId)

    if (!midNode) {
      const centerNode = newNodes.find(n => n.id === centerId)
      const branchNode = newNodes.find(n => n.id === branchId)

      const cx = centerNode?.x ?? 0
      const cy = centerNode?.y ?? 0
      const bx = branchNode?.x ?? 0
      const by = branchNode?.y ?? 0

      const mx = (cx + bx) / 2
      const my = (cy + by) / 2
      const dx = bx - cx
      const dy = by - cy
      const len = Math.sqrt(dx * dx + dy * dy) || 1
      const ox = (-dy / len) * 20
      const oy = (dx / len) * 20

      midNode = {
        id: midId,
        name: "",
        x: mx + ox,
        y: my + oy
      }
      newNodes.push(midNode)
    }

    // Always wire as center → mid → branch for layout
    newLinks.push({
      ...link,
      source: centerId,
      target: midId
    })
    newLinks.push({
      ...link,
      source: midId,
      target: branchId
    })
  }

  return { augmentedNodes: newNodes, augmentedLinks: newLinks }
}, [nodes, links])

  // Decide if we shift the graph left when something on the right is selected
  const shouldShift = useMemo(() => {
    if (!selectedNode || !svgRef.current) {
      hasShiftedRef.current = false
      return false
    }

    if (hasShiftedRef.current) return true

    const found = augmentedNodes.find(n => n.id === selectedNode)
    if (!found || found.x == null) return false

    if (found.id === "purpose") {
      hasShiftedRef.current = true
      return true
    }

    const screenCenter = typeof window !== "undefined" ? window.innerWidth / 2 : 0
    const svg = svgRef.current
    const svgRect = svg.getBoundingClientRect()
    const svgCenterX = svgRect.left + svgRect.width / 2
    const nodeScreenX = svgCenterX + (found.x ?? 0)

    const needsShift = nodeScreenX > screenCenter
    if (needsShift) hasShiftedRef.current = true
    return needsShift
  }, [selectedNode, augmentedNodes])

  useEffect(() => {
    if (!svgRef.current) return

    const svgEl = svgRef.current
    const svg = d3.select(svgEl)
    svg.selectAll("*").remove()

    const defs = svg
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("viewBox", [-width / 2, -height / 2, width, height])
      .append("defs")

    // grid pattern
    defs
      .append("pattern")
      .attr("id", "grid-pattern")
      .attr("width", GRID_SIZE)
      .attr("height", GRID_SIZE)
      .attr("patternUnits", "userSpaceOnUse")
      .append("path")
      .attr("d", `M ${GRID_SIZE} 0 L 0 0 0 ${GRID_SIZE}`)
      .attr("fill", "none")
      .attr("stroke", "#666")
      .attr("stroke-width", 0.4)

    // radial fade mask
    const radialGradient = defs
      .append("radialGradient")
      .attr("id", "grid-fade")
      .attr("cx", "50%")
      .attr("cy", "50%")
      .attr("r", "50%")

    radialGradient
      .append("stop")
      .attr("offset", "0%")
      .attr("stop-color", "white")
      .attr("stop-opacity", 1)

    radialGradient
      .append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "white")
      .attr("stop-opacity", 0)

    defs
      .append("mask")
      .attr("id", "grid-mask")
      .append("rect")
      .attr("x", -width / 2)
      .attr("y", -height / 2)
      .attr("width", width)
      .attr("height", height)
      .attr("fill", "url(#grid-fade)")

    svg
      .append("rect")
      .attr("x", -width / 2)
      .attr("y", -height / 2)
      .attr("width", width)
      .attr("height", height)
      .attr("fill", "url(#grid-pattern)")
      .attr("mask", "url(#grid-mask)")
      .lower()

    // simulation
    const simulation = d3
      .forceSimulation<Node>(augmentedNodes)
      .force(
        "link",
        d3
          .forceLink<Node, Link>(augmentedLinks)
          .id(d => d.id)
          .distance(l => {
            const src = typeof l.source === "string" ? l.source : l.source.id
            const tgt = typeof l.target === "string" ? l.target : l.target.id

            const center = "enter"
            const isMid = src.endsWith("-mid") || tgt.endsWith("-mid")

            if (isMid) return 120
            if (src === center || tgt === center) return 30 // direct center links
            return 120                  // everything else
          })
      )

      .force("charge", d3.forceManyBody().strength(-20))
      .force("collision", d3.forceCollide().radius(30))

    const link = svg
      .append("g")
      .selectAll("line")
      .data(augmentedLinks)
      .join("line")
      .attr("stroke", d => (d.isDashed ? "#757575" : "#0b9b79"))
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", d => (d.isDashed ? "5,5" : "none"))

    const node = svg
      .append("g")
      .selectAll<SVGGElement, Node>("g")
      .data(augmentedNodes)
      .join("g")
      .classed("node", true)
      .style("cursor", "pointer")
      .on("click", (_, d) => {
        if (onNodeClick) onNodeClick(d.id)
      })

    // icon patterns
    defs
      .append("pattern")
      .attr("id", "union-pattern")
      .attr("width", 1)
      .attr("height", 1)
      .append("image")
      .attr("href", "/Union.svg")
      .attr("width", 34)
      .attr("height", 34)

    const iconFiles: Record<string, string> = {
      purpose: "icon2.svg",
      how: "icon1.svg",
      involved: "icon3.svg",
      team: "icon4.svg"
    }

    Object.entries(iconFiles).forEach(([nodeId, iconFile]) => {
      defs
        .append("pattern")
        .attr("id", `${nodeId}-pattern`)
        .attr("width", 1)
        .attr("height", 1)
        .append("image")
        .attr("href", `/${iconFile}`)
        .attr("width", 40)
        .attr("height", 40)
    })

    // non-enter nodes with icons (skip mid-nodes because they won't be in iconFiles)
    node
      .filter(d => !d.isEnter && iconFiles[d.id])
      .append("rect")
      .attr("class", "enter-button")
      .attr("x", -20)
      .attr("y", -20)
      .attr("width", 40)
      .attr("height", 40)
      .attr("fill", d => `url(#${d.id}-pattern)`)

    // ENTER node visuals
    node
      .filter(d => d.isEnter)
      .append("rect")
      .attr("x", -25)
      .attr("y", -25)
      .attr("width", 50)
      .attr("height", 50)
      .attr("fill", "transparent")
      .attr("rx", 4)

    node
      .filter(d => d.isEnter)
      .append("rect")
      .attr("class", "enter-icon")
      .attr("x", -17)
      .attr("y", -17)
      .attr("width", 34)
      .attr("height", 34)
      .attr("fill", "url(#union-pattern)")

    node
      .filter(d => d.isEnter)
      .append("rect")
      .attr("class", "enter-label")
      .attr("x", -35)
      .attr("y", 25)
      .attr("width", 70)
      .attr("height", 24)
      .attr("fill", "#0b9b79")

    // text background
    node
      .append("rect")
      .attr("class", "text-bg")
      .attr("x", d => (d.isEnter ? -40 : 30))
      .attr("y", d => (d.isEnter ? 35 : -15))
      .attr("width", d => getBackgroundWidth(d.id, d.isEnter, d.name))
      .attr("height", 30)
      .attr("fill", "white")
      .style("opacity", 0)

    // labels
    node
      .append("text")
      .attr("class", "handjet")
      .attr("font-size", "24px")
      .attr("text-anchor", d => (d.isEnter ? "middle" : "start"))
      .attr("x", d => (d.isEnter ? 0 : 30))
      .attr("y", d => (d.isEnter ? 43 : "0.35em"))
      .attr("fill", d => (d.id === "enter" ? "black" : "white"))
      .text(d => d.name)

    // hover (no selectedNode logic here, keep it simple)
    node
      .on("mouseenter", function () {
        const g = d3.select<SVGGElement, Node>(this)
        const data = g.datum()

        if (data.isEnter) {
          g.select<SVGRectElement>(".enter-icon")
            .transition()
            .duration(200)
            .style("filter", "brightness(1.3)")

          g.select<SVGRectElement>(".enter-label")
            .transition()
            .duration(200)
            .attr("fill", "#30c0a0")
          return
        }

        g.select<SVGRectElement>(".text-bg")
          .transition()
          .duration(200)
          .style("opacity", 1)
        g.select("text")
          .transition()
          .duration(200)
          .attr("fill", "black")
      })
      .on("mouseleave", function () {
        const g = d3.select<SVGGElement, Node>(this)
        const data = g.datum()

        if (data.isEnter) {
          g.select<SVGRectElement>(".enter-icon")
            .transition()
            .duration(200)
            .style("filter", null)

          g.select<SVGRectElement>(".enter-label")
            .transition()
            .duration(200)
            .attr("fill", "#0b9b79")
          return
        }

        g.select<SVGRectElement>(".text-bg")
          .transition()
          .duration(200)
          .style("opacity", 0)
        g.select("text")
          .transition()
          .duration(200)
          .attr("fill", "white")
      })

    function calculateIntersection(
      x1: number,
      y1: number,
      x2: number,
      y2: number,
      boxSize: number
    ) {
      const dx = x2 - x1
      const dy = y2 - y1
      const length = Math.sqrt(dx * dx + dy * dy) || 1
      const ndx = dx / length
      const ndy = dy / length
      return {
        x: x2 - ndx * boxSize,
        y: y2 - ndy * boxSize
      }
    }

    function drag(sim: d3.Simulation<Node, undefined>) {
      function dragstarted(
        event: d3.D3DragEvent<SVGElement, Node, any>,
        d: Node
      ) {
        if (!event.active) sim.alphaTarget(0.3).restart()
        d.fx = d.x
        d.fy = d.y
      }
      function dragged(
        event: d3.D3DragEvent<SVGElement, Node, any>,
        d: Node
      ) {
        d.fx = event.x
        d.fy = event.y
      }
      function dragended(
        event: d3.D3DragEvent<SVGElement, Node, any>,
        d: Node
      ) {
        if (!event.active) sim.alphaTarget(0)
        d.fx = null
        d.fy = null
      }
      return d3
        .drag<SVGElement, Node>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended)
    }

    node.call(drag(simulation) as any)

    simulation.on("tick", () => {
      link
        .attr("x1", d => {
          const src = d.source as Node
          const tgt = d.target as Node
          if (src.id === CENTER_ID) {
            const p = calculateIntersection(src.x ?? 0, src.y ?? 0, tgt.x ?? 0, tgt.y ?? 0, 80)
            return p.x
          }
          return src.x ?? 0
        })
        .attr("y1", d => {
          const src = d.source as Node
          const tgt = d.target as Node
          if (src.id === CENTER_ID) {
            const p = calculateIntersection(src.x ?? 0, src.y ?? 0, tgt.x ?? 0, tgt.y ?? 0, 80)
            return p.y
          }
          return src.y ?? 0
        })
        .attr("x2", d => (d.target as Node).x ?? 0)
        .attr("y2", d => (d.target as Node).y ?? 0)

      node.attr("transform", d => `translate(${d.x ?? 0},${d.y ?? 0})`)
    })

    return () => {
      simulation.stop()
    }
  }, [augmentedNodes, augmentedLinks, width, height, onNodeClick])

  // restyle on selection
  useEffect(() => {
    if (!svgRef.current) return
    const svg = d3.select(svgRef.current)

    svg
      .selectAll<SVGLineElement, Link>("line")
      .style("opacity", d => {
        if (!selectedNode) return 1
        if (selectedNode === "purpose") return 0.2
        const src = normalizeId(d.source)
        const tgt = normalizeId(d.target)
        return src === selectedNode || tgt === selectedNode ? 1 : 0.2
      })

    svg
      .selectAll<SVGGElement, Node>("g.node")
      .style("opacity", d => {
        if (!selectedNode) return 1
        return d.id === selectedNode ? 1 : 0.2
      })
  }, [selectedNode])

  return (
    <svg
      ref={svgRef}
      className="w-full h-full transition-transform duration-500 ease-in-out"
      style={{
        transform: selectedNode && shouldShift ? "translateY(-200px) md:translateX(-400px)" : "translateY(0) md:translateX(0)"
      }}
    />
  )
}
