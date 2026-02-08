import { useState, useCallback } from 'react'
import type { Hierarchy, Division, Department, Team } from '../../../types/graph'

type ZoomLevel = 'enterprise' | 'division' | 'department' | 'team'

interface ZoomState {
  level: ZoomLevel
  stack: { id: string; label: string }[]
  currentDivision?: Division
  currentDepartment?: Department
  currentTeam?: Team
}

export function useSemanticZoom(hierarchy: Hierarchy | null) {
  const [zoomState, setZoomState] = useState<ZoomState>({
    level: 'enterprise',
    stack: [{ id: 'root', label: hierarchy?.enterprise?.name || 'Enterprise' }],
  })

  const zoomIn = useCallback((nodeId: string) => {
    if (!hierarchy) return
    // Stub: will traverse hierarchy to find target and update zoom state
    void nodeId
  }, [hierarchy])

  const zoomTo = useCallback((stackIndex: number) => {
    setZoomState(prev => ({
      ...prev,
      level: stackIndex === 0 ? 'enterprise' : 'division',
      stack: prev.stack.slice(0, stackIndex + 1),
    }))
  }, [])

  return { zoomState, zoomIn, zoomTo }
}
