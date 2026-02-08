import { useRef, useCallback, useEffect } from 'react'
import type { GraphEdge } from '../../../types/graph'

interface Particle {
  edgeId: string
  sourceId: string
  targetId: string
  /** Position along edge, 0..1 */
  t: number
  /** Speed: fraction of edge per second */
  speed: number
  /** Particle color */
  color: string
  /** Particle radius */
  radius: number
}

/** Map interaction_type to a color */
function edgeParticleColor(interactionType?: string): string {
  switch (interactionType) {
    case 'human-human': return 'rgba(255, 255, 255, 0.8)'
    case 'human-ai':    return 'rgba(6, 182, 212, 0.85)'   // cyan
    case 'ai-ai':       return 'rgba(139, 92, 246, 0.85)'   // violet
    default:            return 'rgba(148, 163, 184, 0.6)'   // gray
  }
}

/**
 * Manages a particle flow system on graph edges.
 * Particles flow along edges with weight > 0.3, with count and speed
 * proportional to edge weight.
 */
export function useParticles(edges: GraphEdge[]) {
  const particlesRef = useRef<Particle[]>([])
  const initializedRef = useRef(false)

  // Rebuild particles whenever edges change
  useEffect(() => {
    if (initializedRef.current && edges.length === 0) return

    const particles: Particle[] = []

    for (const edge of edges) {
      const weight = edge.weight ?? 0.5
      if (weight <= 0.3) continue

      // 1-5 particles based on weight (weight typically 0..1)
      const count = Math.max(1, Math.min(5, Math.round(weight * 5)))

      for (let i = 0; i < count; i++) {
        particles.push({
          edgeId: edge.id,
          sourceId: typeof edge.source === 'string' ? edge.source : String(edge.source),
          targetId: typeof edge.target === 'string' ? edge.target : String(edge.target),
          t: Math.random(), // random start position
          speed: 0.08 + weight * 0.15, // speed: 0.08 - 0.23 (fraction per second)
          color: edgeParticleColor(edge.interaction_type),
          radius: 1.5 + weight * 1.5, // radius 1.5 - 3
        })
      }
    }

    particlesRef.current = particles
    initializedRef.current = true
  }, [edges])

  /**
   * Advance all particles along their edges.
   * @param dt - delta time in milliseconds
   */
  const update = useCallback((dt: number) => {
    const dtSec = dt * 0.001
    for (const p of particlesRef.current) {
      p.t += p.speed * dtSec
      if (p.t > 1) {
        p.t -= 1 // recycle: wrap back to start
      }
    }
  }, [])

  /**
   * Render all particles onto the canvas.
   * Must be called from the graph's onRenderFramePost callback.
   * @param ctx - Canvas 2D context
   * @param getNodePos - Lookup function to get node screen positions
   */
  const render = useCallback((
    ctx: CanvasRenderingContext2D,
    getNodePos: (id: string) => { x: number; y: number } | undefined
  ) => {
    for (const p of particlesRef.current) {
      const srcPos = getNodePos(p.sourceId)
      const tgtPos = getNodePos(p.targetId)
      if (!srcPos || !tgtPos) continue

      // Interpolate position
      const x = srcPos.x + (tgtPos.x - srcPos.x) * p.t
      const y = srcPos.y + (tgtPos.y - srcPos.y) * p.t

      // Draw particle with a subtle glow
      ctx.save()
      ctx.beginPath()
      ctx.arc(x, y, p.radius * 2, 0, Math.PI * 2)
      ctx.fillStyle = p.color.replace(/[\d.]+\)$/, '0.15)')
      ctx.fill()

      ctx.beginPath()
      ctx.arc(x, y, p.radius, 0, Math.PI * 2)
      ctx.fillStyle = p.color
      ctx.fill()
      ctx.restore()
    }
  }, [])

  return { render, update }
}
