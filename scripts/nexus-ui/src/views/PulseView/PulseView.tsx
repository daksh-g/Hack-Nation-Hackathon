import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import type { ForceGraphMethods, NodeObject, LinkObject } from 'react-force-graph-2d'
import type { GraphData, GraphNode, GraphEdge } from '../../types/graph'
import { getGraph } from '../../lib/api'
import { NodeDetailPanel } from '../../components/NodeDetailPanel'
import { InfoDrop } from './InfoDrop'
import { usePulseAnimation } from './hooks/usePulseAnimation'
import { useParticles } from './hooks/useParticles'
import { useRipple } from './hooks/useRipple'
import { useRealtimeGraph } from '../../hooks/useRealtimeGraph'

// ── Color maps ──────────────────────────────────────────────────────────────

const HEALTH_COLORS: Record<string, string> = {
  green:  '#22C55E',
  yellow: '#EAB308',
  orange: '#F97316',
  red:    '#EF4444',
}

const EDGE_COLORS: Record<string, string> = {
  'human-human': '#FFFFFF',
  'human-ai':    '#06B6D4',
  'ai-ai':       '#8B5CF6',
}

const DEFAULT_EDGE_COLOR = '#475569'
const BG_COLOR = '#0F1419'
const AGENT_GLOW_COLOR = '#06B6D4'

// ── Type aliases for ForceGraph ─────────────────────────────────────────────

type FGNode = NodeObject<GraphNode>
type FGLink = LinkObject<GraphNode, GraphEdge>

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Get the base color for a node based on its health */
function getNodeColor(node: FGNode): string {
  const health = (node.health as string) ?? 'green'
  return HEALTH_COLORS[health] ?? HEALTH_COLORS.green
}

/** Get edge color from interaction_type */
function getEdgeColor(link: FGLink): string {
  const it = (link.interaction_type as string) ?? ''
  return EDGE_COLORS[it] ?? DEFAULT_EDGE_COLOR
}

/** Draw a regular hexagon at (x, y) with given radius */
function drawHexagon(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath()
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 2
    const px = x + r * Math.cos(angle)
    const py = y + r * Math.sin(angle)
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
}

/** Draw a diamond shape at (x, y) */
function drawDiamond(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x, y - r)
  ctx.lineTo(x + r * 0.7, y)
  ctx.lineTo(x, y + r)
  ctx.lineTo(x - r * 0.7, y)
  ctx.closePath()
}

/** Convert our GraphData to the shape ForceGraph2D expects */
function toForceGraphData(data: GraphData) {
  const nodes = data.nodes.map(n => ({
    ...n,
    // Set fixed positions from golden layout if provided
    fx: n.x ?? undefined,
    fy: n.y ?? undefined,
  }))

  const links = data.edges.map(e => ({
    ...e,
    source: e.source,
    target: e.target,
  }))

  return { nodes, links }
}

// ── Component ───────────────────────────────────────────────────────────────

export function PulseView() {
  const [graphData, setGraphData] = useState<GraphData | null>(null)
  const [fgData, setFgData] = useState<ReturnType<typeof toForceGraphData> | null>(null)
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const [hoveredLinkId, setHoveredLinkId] = useState<string | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fgRef = useRef<ForceGraphMethods<any, any> | undefined>(undefined)
  const lastFrameTime = useRef<number>(performance.now())
  const nodeMapRef = useRef<Map<string, FGNode>>(new Map())

  // Animation hooks
  const pulse = usePulseAnimation()
  const edges = useMemo(() => graphData?.edges ?? [], [graphData])
  const particles = useParticles(edges)
  const ripple = useRipple()

  // ── Load data ───────────────────────────────────────────────────────────

  const loadGraphData = useCallback(() => {
    getGraph()
      .then(data => {
        setGraphData(data)
        const fg = toForceGraphData(data)
        setFgData(fg)

        // Build node lookup
        const map = new Map<string, FGNode>()
        for (const n of fg.nodes) map.set(n.id, n as FGNode)
        nodeMapRef.current = map
      })
      .catch(console.error)
  }, [])

  useEffect(() => {
    loadGraphData()
  }, [loadGraphData])

  // ── Realtime subscription ─────────────────────────────────────────────

  useRealtimeGraph({
    onGraphChange: useCallback(() => {
      // Re-fetch the full graph when any node/edge/alert changes
      loadGraphData()
    }, [loadGraphData]),
  })

  // ── Resize observer ─────────────────────────────────────────────────────

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        })
      }
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  // ── Configure forces after mount ────────────────────────────────────────

  useEffect(() => {
    const fg = fgRef.current
    if (!fg) return

    // Weak charge to keep golden layout mostly intact
    const charge = fg.d3Force('charge')
    if (charge && 'strength' in charge) {
      (charge as unknown as { strength: (v: number) => void }).strength(-80)
    }

    const link = fg.d3Force('link')
    if (link && 'distance' in link) {
      (link as unknown as { distance: (v: number) => void }).distance(100)
    }

    // Zoom to fit after initial layout
    setTimeout(() => {
      fg.zoomToFit(800, 60)
    }, 500)
  }, [fgData])

  // ── Node canvas renderer ────────────────────────────────────────────────

  const nodeCanvasObject = useCallback((node: FGNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const x = node.x ?? 0
    const y = node.y ?? 0
    const baseSize = (Number(node.size) || 30) / globalScale
    const nodeId = String(node.id ?? '')
    const nodeType = String(node.type ?? '')
    const cogLoad = Number(node.cognitive_load) || 0.5
    const scale = pulse.getNodeScale(nodeId, cogLoad)
    const glowIntensity = pulse.getGlowIntensity(nodeId)
    const r = baseSize * 0.4 * scale
    const color = getNodeColor(node)
    const label = String(node.label ?? '')

    // Check for ripple flash
    const flash = ripple.getNodeFlash(nodeId)

    ctx.save()

    if (nodeType === 'person') {
      // ── Person: Circle with health-color glow ────────────────────────

      // Outer glow layer
      ctx.beginPath()
      ctx.arc(x, y, r * 1.8, 0, Math.PI * 2)
      ctx.fillStyle = color
      ctx.globalAlpha = 0.12 * glowIntensity
      ctx.fill()

      // Inner glow
      ctx.beginPath()
      ctx.arc(x, y, r * 1.4, 0, Math.PI * 2)
      ctx.fillStyle = color
      ctx.globalAlpha = 0.2 * glowIntensity
      ctx.fill()

      // Main circle
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fillStyle = color
      ctx.globalAlpha = 0.9
      ctx.fill()

      // Highlight rim
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.strokeStyle = '#FFFFFF'
      ctx.globalAlpha = 0.15
      ctx.lineWidth = 1 / globalScale
      ctx.stroke()

    } else if (nodeType === 'agent') {
      // ── Agent: Hexagon with cyan glow ────────────────────────────────

      // Outer cyan glow
      ctx.globalAlpha = 0.08 * glowIntensity
      drawHexagon(ctx, x, y, r * 2.2)
      ctx.fillStyle = AGENT_GLOW_COLOR
      ctx.fill()

      // Middle cyan glow
      ctx.globalAlpha = 0.15 * glowIntensity
      drawHexagon(ctx, x, y, r * 1.7)
      ctx.fillStyle = AGENT_GLOW_COLOR
      ctx.fill()

      // Inner cyan glow
      ctx.globalAlpha = 0.3 * glowIntensity
      drawHexagon(ctx, x, y, r * 1.3)
      ctx.fillStyle = AGENT_GLOW_COLOR
      ctx.fill()

      // Main hexagon
      drawHexagon(ctx, x, y, r)
      ctx.fillStyle = AGENT_GLOW_COLOR
      ctx.globalAlpha = 0.9
      ctx.fill()

      // Bright edge
      drawHexagon(ctx, x, y, r)
      ctx.strokeStyle = '#22D3EE'
      ctx.globalAlpha = 0.6
      ctx.lineWidth = 1.5 / globalScale
      ctx.stroke()

    } else if (nodeType === 'team') {
      // ── Team: Small circle with border ────────────────────────────────
      const tr = r * 0.7

      // Glow
      ctx.beginPath()
      ctx.arc(x, y, tr * 1.5, 0, Math.PI * 2)
      ctx.fillStyle = color
      ctx.globalAlpha = 0.1 * glowIntensity
      ctx.fill()

      // Fill
      ctx.beginPath()
      ctx.arc(x, y, tr, 0, Math.PI * 2)
      ctx.fillStyle = color
      ctx.globalAlpha = 0.5
      ctx.fill()

      // Border
      ctx.beginPath()
      ctx.arc(x, y, tr, 0, Math.PI * 2)
      ctx.strokeStyle = color
      ctx.globalAlpha = 0.9
      ctx.lineWidth = 2 / globalScale
      ctx.stroke()

    } else if (['decision', 'fact', 'commitment', 'question', 'topic'].includes(nodeType)) {
      // ── Knowledge units: Diamond ──────────────────────────────────────
      const dr = r * 0.6

      // Glow
      drawDiamond(ctx, x, y, dr * 1.6)
      ctx.fillStyle = color
      ctx.globalAlpha = 0.1 * glowIntensity
      ctx.fill()

      // Fill
      drawDiamond(ctx, x, y, dr)
      ctx.fillStyle = color
      ctx.globalAlpha = 0.7
      ctx.fill()

      // Border
      drawDiamond(ctx, x, y, dr)
      ctx.strokeStyle = color
      ctx.globalAlpha = 0.9
      ctx.lineWidth = 1 / globalScale
      ctx.stroke()

    } else {
      // Fallback: small circle
      ctx.beginPath()
      ctx.arc(x, y, r * 0.5, 0, Math.PI * 2)
      ctx.fillStyle = color
      ctx.globalAlpha = 0.8
      ctx.fill()
    }

    // ── Flash overlay (from ripple) ───────────────────────────────────
    if (flash) {
      ctx.beginPath()
      ctx.arc(x, y, r * 1.5, 0, Math.PI * 2)
      ctx.fillStyle = flash.color
      ctx.globalAlpha = flash.intensity * 0.4
      ctx.fill()
    }

    // ── Label ─────────────────────────────────────────────────────────
    if (label) {
      const fontSize = Math.max(10, 12 / globalScale)
      ctx.font = `${fontSize}px Inter, system-ui, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.fillStyle = '#E2E8F0'
      ctx.globalAlpha = globalScale > 0.8 ? 0.9 : 0.6
      ctx.fillText(label, x, y + r + 3 / globalScale)
    }

    ctx.restore()
  }, [pulse, ripple])

  // ── Node pointer area (for accurate hit detection) ──────────────────────

  const nodePointerAreaPaint = useCallback((node: FGNode, paintColor: string, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const x = node.x ?? 0
    const y = node.y ?? 0
    const r = ((Number(node.size) || 30) / globalScale) * 0.4

    ctx.beginPath()
    ctx.arc(x, y, r * 1.3, 0, Math.PI * 2)
    ctx.fillStyle = paintColor
    ctx.fill()
  }, [])

  // ── Link color & width ──────────────────────────────────────────────────

  const linkColorFn = useCallback((link: FGLink) => {
    return getEdgeColor(link)
  }, [])

  const linkWidthFn = useCallback((link: FGLink) => {
    const w = Number(link.weight) || 0.5
    return 0.5 + w * 2.5
  }, [])

  // ── Link canvas object (for hovered label) ─────────────────────────────

  const linkCanvasObject = useCallback((link: FGLink, ctx: CanvasRenderingContext2D, globalScale: number) => {
    // After force simulation resolves, source/target become node objects
    const source = link.source as FGNode
    const target = link.target as FGNode
    if (source.x == null || source.y == null || target.x == null || target.y == null) return

    // Draw the link line
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(source.x, source.y)
    ctx.lineTo(target.x, target.y)
    ctx.strokeStyle = getEdgeColor(link)
    const w = Number(link.weight) || 0.5
    ctx.lineWidth = (0.5 + w * 2.5) / globalScale
    ctx.globalAlpha = 0.6
    ctx.stroke()

    // Draw label only when hovered
    const linkId = String(link.id ?? '')
    const linkLabel = String(link.label ?? '')
    if (hoveredLinkId && hoveredLinkId === linkId && linkLabel) {
      const mx = (source.x + target.x) / 2
      const my = (source.y + target.y) / 2
      const fontSize = Math.max(10, 11 / globalScale)

      ctx.font = `${fontSize}px Inter, system-ui, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      // Background pill
      const metrics = ctx.measureText(linkLabel)
      const pad = 3 / globalScale
      ctx.fillStyle = '#1E293B'
      ctx.globalAlpha = 0.9
      ctx.fillRect(
        mx - metrics.width / 2 - pad,
        my - fontSize / 2 - pad,
        metrics.width + pad * 2,
        fontSize + pad * 2
      )

      // Text
      ctx.fillStyle = '#CBD5E1'
      ctx.globalAlpha = 1
      ctx.fillText(linkLabel, mx, my)
    }

    ctx.restore()
  }, [hoveredLinkId])

  // ── Frame callbacks ─────────────────────────────────────────────────────

  const onRenderFramePre = useCallback((ctx: CanvasRenderingContext2D, _globalScale: number) => {
    const now = performance.now()
    const dt = Math.min(now - lastFrameTime.current, 50) // cap at 50ms
    lastFrameTime.current = now

    // Update all animation systems
    pulse.update(dt)
    particles.update(dt)

    // Build node positions for ripple flash detection
    const nodePositions = new Map<string, { x: number; y: number }>()
    for (const [id, node] of nodeMapRef.current) {
      if (node.x != null && node.y != null) {
        nodePositions.set(id, { x: node.x, y: node.y })
      }
    }
    const allNodeIds = Array.from(nodeMapRef.current.keys())
    ripple.updateRipples(dt, nodePositions, allNodeIds)

    // Apply global heartbeat opacity
    ctx.globalAlpha = pulse.getGlobalOpacity()
  }, [pulse, particles, ripple])

  const onRenderFramePost = useCallback((ctx: CanvasRenderingContext2D, _globalScale: number) => {
    // Draw particles along edges
    const getNodePos = (id: string) => {
      const node = nodeMapRef.current.get(id)
      if (!node || node.x == null || node.y == null) return undefined
      return { x: node.x, y: node.y }
    }
    particles.render(ctx, getNodePos)

    // Draw ripple rings
    ripple.renderRipples(ctx)

    // Reset global alpha
    ctx.globalAlpha = 1
  }, [particles, ripple])

  // ── Event handlers ──────────────────────────────────────────────────────

  const handleNodeClick = useCallback((node: FGNode) => {
    setSelectedNode(node as unknown as GraphNode)
  }, [])

  const handleLinkHover = useCallback((link: FGLink | null) => {
    setHoveredLinkId(link ? String(link.id ?? '') : null)
  }, [])

  const handleBackgroundClick = useCallback(() => {
    setSelectedNode(null)
  }, [])

  // ── InfoDrop ripple trigger ─────────────────────────────────────────────

  const handleInfoRipple = useCallback((nodeId: string) => {
    const node = nodeMapRef.current.get(nodeId)
    if (node && node.x != null && node.y != null) {
      ripple.triggerRipple(node.x, node.y)
    }
  }, [ripple])

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div ref={containerRef} className="relative w-full h-full" style={{ background: BG_COLOR }}>
      {!fgData ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-text-tertiary animate-pulse text-lg">Loading Pulse View...</div>
        </div>
      ) : (
        <ForceGraph2D
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ref={fgRef as React.MutableRefObject<ForceGraphMethods<any, any> | undefined>}
          graphData={fgData as { nodes: NodeObject[]; links: LinkObject[] }}
          width={dimensions.width}
          height={dimensions.height}
          backgroundColor={BG_COLOR}

          // Node rendering
          nodeCanvasObject={nodeCanvasObject as (node: NodeObject, ctx: CanvasRenderingContext2D, globalScale: number) => void}
          nodeCanvasObjectMode={() => 'replace' as const}
          nodePointerAreaPaint={nodePointerAreaPaint as (node: NodeObject, color: string, ctx: CanvasRenderingContext2D, globalScale: number) => void}

          // Link rendering
          linkCanvasObject={linkCanvasObject as (link: LinkObject, ctx: CanvasRenderingContext2D, globalScale: number) => void}
          linkCanvasObjectMode={() => 'replace' as const}
          linkColor={linkColorFn as (link: LinkObject) => string}
          linkWidth={linkWidthFn as (link: LinkObject) => number}

          // Force config: very weak forces to preserve golden layout
          cooldownTime={3000}
          warmupTicks={50}
          d3AlphaDecay={0.05}
          d3VelocityDecay={0.3}

          // Frame hooks
          onRenderFramePre={onRenderFramePre}
          onRenderFramePost={onRenderFramePost}

          // Interaction
          onNodeClick={handleNodeClick as unknown as (node: NodeObject, event: MouseEvent) => void}
          onLinkHover={handleLinkHover as (link: LinkObject | null, prev: LinkObject | null) => void}
          onBackgroundClick={handleBackgroundClick}
          enableNodeDrag={true}
          enableZoomInteraction={true}
          enablePanInteraction={true}

          // Keep re-rendering for animations
          autoPauseRedraw={false}
        />
      )}

      {/* Info Drop panel */}
      <InfoDrop onRipple={handleInfoRipple} />

      {/* Node detail panel */}
      <NodeDetailPanel node={selectedNode} onClose={() => setSelectedNode(null)} />
    </div>
  )
}
