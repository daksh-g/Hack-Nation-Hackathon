import { useRef, useCallback } from 'react'

interface PulseState {
  phase: number
}

export function usePulseAnimation() {
  const stateRef = useRef<PulseState>({ phase: 0 })

  const update = useCallback((dt: number) => {
    stateRef.current.phase += dt * 0.001
  }, [])

  const getNodeScale = useCallback((nodeId: string): number => {
    const phase = stateRef.current.phase
    return 0.97 + 0.06 * Math.sin(phase + nodeId.length * 0.3)
  }, [])

  const getGlobalOpacity = useCallback((): number => {
    return 0.98 + 0.02 * Math.sin(stateRef.current.phase * 0.5)
  }, [])

  return { update, getNodeScale, getGlobalOpacity }
}
