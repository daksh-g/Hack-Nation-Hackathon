import { useRef, useCallback } from 'react'
import type { GraphEdge } from '../../../types/graph'

interface Particle {
  edgeId: string
  t: number
  speed: number
}

interface ParticleSystem {
  render: (ctx: CanvasRenderingContext2D, getNodePos: (id: string) => { x: number; y: number } | undefined) => void
  update: (dt: number) => void
}

export function useParticles(_edges: GraphEdge[]): ParticleSystem {
  const particlesRef = useRef<Particle[]>([])

  const render = useCallback((ctx: CanvasRenderingContext2D, _getNodePos: (id: string) => { x: number; y: number } | undefined) => {
    // Stub: will be implemented
    void ctx
  }, [])

  const update = useCallback((dt: number) => {
    particlesRef.current.forEach(p => {
      p.t += p.speed * dt * 0.001
      if (p.t > 1) p.t = 0
    })
  }, [])

  return { render, update }
}
