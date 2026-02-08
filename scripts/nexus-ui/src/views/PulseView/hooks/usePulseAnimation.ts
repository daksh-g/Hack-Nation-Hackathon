import { useRef, useCallback } from 'react'

interface PulseState {
  /** Elapsed time in seconds */
  time: number
}

/**
 * Provides smooth sinusoidal pulse and heartbeat animations.
 * - Node pulse: 97%-103% scale, ~3s cycle, varied per node
 * - Heartbeat: global opacity 98%-100%, ~2s cycle
 */
export function usePulseAnimation() {
  const stateRef = useRef<PulseState>({ time: 0 })

  const update = useCallback((dt: number) => {
    // dt is in milliseconds; convert to seconds
    stateRef.current.time += dt * 0.001
  }, [])

  /**
   * Returns a scale factor for a given node, oscillating between 0.97 and 1.03.
   * Each node gets a unique phase offset derived from its id so they don't all
   * pulse in perfect unison, creating a more organic feel.
   * @param nodeId - The node's id string
   * @param activity - Optional activity multiplier (0-1) to vary intensity
   */
  const getNodeScale = useCallback((nodeId: string, activity = 0.5): number => {
    const t = stateRef.current.time
    // Hash the node ID to produce a stable phase offset
    let hash = 0
    for (let i = 0; i < nodeId.length; i++) {
      hash = ((hash << 5) - hash + nodeId.charCodeAt(i)) | 0
    }
    const phaseOffset = (hash % 1000) / 1000 * Math.PI * 2

    // 3-second base cycle. Activity increases amplitude slightly.
    const amplitude = 0.03 + activity * 0.02 // 3-5% swing
    const frequency = (2 * Math.PI) / 3 // 3s cycle
    return 1.0 + amplitude * Math.sin(frequency * t + phaseOffset)
  }, [])

  /**
   * Returns a glow intensity multiplier for nodes, creating a "breathing" glow.
   * Oscillates between 0.6 and 1.0.
   */
  const getGlowIntensity = useCallback((nodeId: string): number => {
    const t = stateRef.current.time
    let hash = 0
    for (let i = 0; i < nodeId.length; i++) {
      hash = ((hash << 5) - hash + nodeId.charCodeAt(i)) | 0
    }
    const phaseOffset = (hash % 1000) / 1000 * Math.PI * 2
    // Slower glow cycle for a gentle breathing effect
    return 0.6 + 0.4 * (0.5 + 0.5 * Math.sin(t * 0.8 + phaseOffset))
  }, [])

  /**
   * Returns a global canvas opacity for the heartbeat effect.
   * Oscillates between 0.98 and 1.0 on a 2s cycle.
   */
  const getGlobalOpacity = useCallback((): number => {
    const t = stateRef.current.time
    const frequency = (2 * Math.PI) / 2 // 2s cycle
    return 0.98 + 0.02 * Math.sin(frequency * t)
  }, [])

  return { update, getNodeScale, getGlowIntensity, getGlobalOpacity }
}
