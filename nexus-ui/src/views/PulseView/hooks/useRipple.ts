import { useState, useCallback } from 'react'

interface Ripple {
  id: string
  cx: number
  cy: number
  radius: number
  maxRadius: number
  opacity: number
  color: string
}

export function useRipple() {
  const [ripples, setRipples] = useState<Ripple[]>([])

  const triggerRipple = useCallback((cx: number, cy: number, color = '#3B82F6') => {
    const ripple: Ripple = {
      id: `ripple-${Date.now()}`,
      cx, cy,
      radius: 0,
      maxRadius: 200,
      opacity: 0.6,
      color,
    }
    setRipples(prev => [...prev, ripple])
  }, [])

  const updateRipples = useCallback((dt: number) => {
    setRipples(prev => prev
      .map(r => ({
        ...r,
        radius: r.radius + dt * 0.1,
        opacity: r.opacity - dt * 0.001,
      }))
      .filter(r => r.opacity > 0)
    )
  }, [])

  const renderRipples = useCallback((ctx: CanvasRenderingContext2D) => {
    ripples.forEach(r => {
      ctx.beginPath()
      ctx.arc(r.cx, r.cy, r.radius, 0, Math.PI * 2)
      ctx.strokeStyle = r.color
      ctx.globalAlpha = r.opacity
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.globalAlpha = 1
    })
  }, [ripples])

  return { triggerRipple, updateRipples, renderRipples, ripples }
}
