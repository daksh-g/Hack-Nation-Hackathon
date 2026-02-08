import { useRef, useCallback } from 'react'

interface Ripple {
  id: string
  cx: number
  cy: number
  /** Current radius */
  radius: number
  /** Maximum expansion radius */
  maxRadius: number
  /** Current opacity (fades over time) */
  opacity: number
  /** Base color */
  color: string
  /** Time alive in seconds */
  age: number
}

interface FlashedNode {
  nodeId: string
  /** Remaining flash time in seconds */
  flashTime: number
  color: string
}

/**
 * Concentric ripple animation that expands from a source point.
 * Affected nodes flash when the ripple wave reaches them.
 */
export function useRipple() {
  const ripplesRef = useRef<Ripple[]>([])
  const flashedNodesRef = useRef<FlashedNode[]>([])

  /**
   * Trigger a ripple at graph coordinates (cx, cy).
   * Creates multiple concentric rings for a rich visual effect.
   */
  const triggerRipple = useCallback((cx: number, cy: number, color = '#3B82F6') => {
    // Create 3 concentric rings with staggered starts
    for (let i = 0; i < 3; i++) {
      const ripple: Ripple = {
        id: `ripple-${Date.now()}-${i}`,
        cx,
        cy,
        radius: 0,
        maxRadius: 250 + i * 50,
        opacity: 0.6 - i * 0.1,
        color,
        age: -i * 0.2, // stagger start times
      }
      ripplesRef.current.push(ripple)
    }
  }, [])

  /**
   * Flash a specific node (e.g. when ripple reaches it).
   */
  const flashNode = useCallback((nodeId: string, color = '#3B82F6') => {
    // Avoid duplicate flashes
    const existing = flashedNodesRef.current.find(f => f.nodeId === nodeId)
    if (existing) {
      existing.flashTime = 1.0 // reset
      return
    }
    flashedNodesRef.current.push({ nodeId, flashTime: 1.0, color })
  }, [])

  /**
   * Update ripple state. Call every frame.
   * @param dt - delta time in milliseconds
   * @param nodePositions - map of nodeId -> {x, y} for flash-on-reach
   * @param affectedNodeIds - node IDs that should flash when reached
   */
  const updateRipples = useCallback((
    dt: number,
    nodePositions?: Map<string, { x: number; y: number }>,
    affectedNodeIds?: string[]
  ) => {
    const dtSec = dt * 0.001

    // Update ripples
    const activeRipples: Ripple[] = []
    for (const r of ripplesRef.current) {
      r.age += dtSec
      if (r.age < 0) {
        activeRipples.push(r) // not started yet
        continue
      }
      r.radius += dtSec * 120 // expansion speed: 120 units/sec
      r.opacity = Math.max(0, 0.6 * (1 - r.radius / r.maxRadius))

      if (r.opacity > 0) {
        activeRipples.push(r)

        // Flash nodes that the ripple passes through
        if (nodePositions && affectedNodeIds) {
          for (const nodeId of affectedNodeIds) {
            const pos = nodePositions.get(nodeId)
            if (!pos) continue
            const dist = Math.sqrt((pos.x - r.cx) ** 2 + (pos.y - r.cy) ** 2)
            // Flash when ripple radius is close to the node
            if (Math.abs(dist - r.radius) < 15) {
              flashNode(nodeId, r.color)
            }
          }
        }
      }
    }
    ripplesRef.current = activeRipples

    // Update flash timers
    flashedNodesRef.current = flashedNodesRef.current
      .map(f => ({ ...f, flashTime: f.flashTime - dtSec }))
      .filter(f => f.flashTime > 0)
  }, [flashNode])

  /**
   * Render ripple rings onto canvas.
   */
  const renderRipples = useCallback((ctx: CanvasRenderingContext2D) => {
    for (const r of ripplesRef.current) {
      if (r.age < 0 || r.opacity <= 0) continue

      ctx.save()
      ctx.beginPath()
      ctx.arc(r.cx, r.cy, r.radius, 0, Math.PI * 2)
      ctx.strokeStyle = r.color
      ctx.globalAlpha = r.opacity
      ctx.lineWidth = 2.5
      ctx.stroke()

      // Inner softer ring
      ctx.beginPath()
      ctx.arc(r.cx, r.cy, r.radius, 0, Math.PI * 2)
      ctx.strokeStyle = r.color
      ctx.globalAlpha = r.opacity * 0.3
      ctx.lineWidth = 8
      ctx.stroke()

      ctx.globalAlpha = 1
      ctx.restore()
    }
  }, [])

  /**
   * Check if a given node is currently flashing.
   * Returns the flash intensity (0..1) or 0 if not flashing.
   */
  const getNodeFlash = useCallback((nodeId: string): { intensity: number; color: string } | null => {
    const flash = flashedNodesRef.current.find(f => f.nodeId === nodeId)
    if (!flash) return null
    return { intensity: flash.flashTime, color: flash.color }
  }, [])

  return { triggerRipple, updateRipples, renderRipples, getNodeFlash }
}
