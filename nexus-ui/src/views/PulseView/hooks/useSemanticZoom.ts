import { useState, useCallback, useMemo } from 'react'
import type {
  Hierarchy,
  Division,
  Department,
  Team,
  GraphData,
  GraphNode,
  GraphEdge,
} from '../../../types/graph'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ZoomLevel = 'enterprise' | 'division' | 'department' | 'team'

interface StackEntry {
  id: string
  label: string
  level: ZoomLevel
}

interface ZoomState {
  level: ZoomLevel
  stack: StackEntry[]
  currentDivision?: Division
  currentDepartment?: Department
  currentTeam?: Team
}

interface Stat {
  label: string
  value: number | string
}

interface SemanticZoomResult {
  zoomState: ZoomState
  zoomIn: (nodeId: string) => void
  zoomTo: (stackIndex: number) => void
  currentNodes: GraphNode[]
  currentEdges: GraphEdge[]
  breadcrumbs: { id: string; label: string }[]
  stats: Stat[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Count total teams across an array of departments */
function countTeams(departments: Department[]): number {
  return departments.reduce((sum, dept) => sum + dept.teams.length, 0)
}

/** Count total members across departments (summing all teams) */
function countMembers(departments: Department[]): number {
  return departments.reduce(
    (sum, dept) =>
      sum +
      dept.teams.reduce((ts, team) => ts + team.members.length, 0),
    0,
  )
}

/** Count members in a single department */
function countDeptMembers(dept: Department): number {
  return dept.teams.reduce((sum, t) => sum + t.members.length, 0)
}

/** Build a map from member ID -> division ID, given divisions */
function buildMemberToDivision(divisions: Division[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const div of divisions) {
    for (const dept of div.departments) {
      for (const team of dept.teams) {
        for (const m of team.members) {
          map.set(m, div.id)
        }
      }
    }
  }
  return map
}

/** Build a map from member ID -> department ID */
function buildMemberToDepartment(departments: Department[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const dept of departments) {
    for (const team of dept.teams) {
      for (const m of team.members) {
        map.set(m, dept.id)
      }
    }
  }
  return map
}

/** Build a map from member ID -> team ID */
function buildMemberToTeam(teams: Team[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const team of teams) {
    for (const m of team.members) {
      map.set(m, team.id)
    }
  }
  return map
}

/**
 * Given a mapping from node-id -> group-id, aggregate edges across groups.
 * Returns one synthetic edge per ordered group pair with weight = count.
 */
function aggregateEdges(
  edges: GraphEdge[],
  nodeToGroup: Map<string, string>,
  prefix: string,
): GraphEdge[] {
  const pairCounts = new Map<string, number>()
  for (const e of edges) {
    const sg = nodeToGroup.get(e.source)
    const tg = nodeToGroup.get(e.target)
    if (!sg || !tg || sg === tg) continue
    // Deterministic key: always smaller id first
    const key = sg < tg ? `${sg}::${tg}` : `${tg}::${sg}`
    pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1)
  }

  const result: GraphEdge[] = []
  for (const [key, count] of pairCounts) {
    const parts = key.split('::')
    const a = parts[0] ?? ''
    const b = parts[1] ?? ''
    result.push({
      id: `${prefix}-${a}-${b}`,
      source: a,
      target: b,
      type: 'COMMUNICATES_WITH',
      weight: count,
    })
  }
  return result
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useSemanticZoom(
  hierarchy: Hierarchy | null,
  graphData: GraphData | null,
): SemanticZoomResult {
  const enterpriseName = hierarchy?.enterprise?.name ?? 'Enterprise'

  const [zoomState, setZoomState] = useState<ZoomState>({
    level: 'enterprise',
    stack: [{ id: 'root', label: enterpriseName, level: 'enterprise' }],
  })

  // ----- Derived: nodes and edges for the current zoom level -----

  const { currentNodes, currentEdges, stats } = useMemo(() => {
    const emptyResult = { currentNodes: [] as GraphNode[], currentEdges: [] as GraphEdge[], stats: [] as Stat[] }
    if (!hierarchy) return emptyResult

    const divisions = hierarchy.enterprise.divisions
    const allEdges = graphData?.edges ?? []

    switch (zoomState.level) {
      // ----- L1: Enterprise -------------------------------------------------
      case 'enterprise': {
        const nodes: GraphNode[] = divisions.map((div) => ({
          id: div.id,
          type: 'team' as const,
          label: div.name,
          health: div.health,
          size: 52,
        }))

        const memberToDiv = buildMemberToDivision(divisions)
        const edges = aggregateEdges(allEdges, memberToDiv, 'div-edge')

        const totalTeams = divisions.reduce((s, d) => s + countTeams(d.departments), 0)
        const totalPeople = divisions.reduce((s, d) => s + countMembers(d.departments), 0)

        return {
          currentNodes: nodes,
          currentEdges: edges,
          stats: [
            { label: 'divisions', value: divisions.length },
            { label: 'teams', value: totalTeams },
            { label: 'people', value: totalPeople },
          ],
        }
      }

      // ----- L2: Division ---------------------------------------------------
      case 'division': {
        const division = zoomState.currentDivision
        if (!division) return emptyResult

        const nodes: GraphNode[] = division.departments.map((dept) => ({
          id: dept.id,
          type: 'team' as const,
          label: dept.name,
          health: dept.health,
          size: 42,
        }))

        const memberToDept = buildMemberToDepartment(division.departments)
        const edges = aggregateEdges(allEdges, memberToDept, 'dept-edge')

        const totalPeople = countMembers(division.departments)

        return {
          currentNodes: nodes,
          currentEdges: edges,
          stats: [
            { label: division.name, value: '' },
            { label: 'departments', value: division.departments.length },
            { label: 'people', value: totalPeople },
          ],
        }
      }

      // ----- L3: Department -------------------------------------------------
      case 'department': {
        const dept = zoomState.currentDepartment
        if (!dept) return emptyResult

        const nodes: GraphNode[] = dept.teams.map((team) => ({
          id: team.id,
          type: 'team' as const,
          label: team.name,
          health: team.health,
          size: 36,
        }))

        const memberToTeam = buildMemberToTeam(dept.teams)
        const edges = aggregateEdges(allEdges, memberToTeam, 'team-edge')

        const totalPeople = countDeptMembers(dept)

        const divLabel = zoomState.currentDivision?.name ?? ''

        return {
          currentNodes: nodes,
          currentEdges: edges,
          stats: [
            { label: `${divLabel} > ${dept.name}`, value: '' },
            { label: 'teams', value: dept.teams.length },
            { label: 'people', value: totalPeople },
          ],
        }
      }

      // ----- L4: Team -------------------------------------------------------
      case 'team': {
        const team = zoomState.currentTeam
        if (!team) return emptyResult

        const memberSet = new Set(team.members)
        const allNodes = graphData?.nodes ?? []

        // Collect person and agent nodes that are members
        const memberNodes = allNodes.filter((n) => memberSet.has(n.id))

        // Knowledge nodes connected to team members
        const knowledgeTypes = new Set(['decision', 'fact', 'commitment', 'question', 'topic'])
        const connectedKnowledgeIds = new Set<string>()
        for (const e of allEdges) {
          if (memberSet.has(e.source) && !memberSet.has(e.target)) {
            const targetNode = allNodes.find((n) => n.id === e.target)
            if (targetNode && knowledgeTypes.has(targetNode.type)) {
              connectedKnowledgeIds.add(targetNode.id)
            }
          }
          if (memberSet.has(e.target) && !memberSet.has(e.source)) {
            const sourceNode = allNodes.find((n) => n.id === e.source)
            if (sourceNode && knowledgeTypes.has(sourceNode.type)) {
              connectedKnowledgeIds.add(sourceNode.id)
            }
          }
        }

        const knowledgeNodes = allNodes.filter((n) => connectedKnowledgeIds.has(n.id))

        // All visible node IDs
        const visibleIds = new Set([...memberSet, ...connectedKnowledgeIds])
        const visibleEdges = allEdges.filter(
          (e) => visibleIds.has(e.source) && visibleIds.has(e.target),
        )

        const nodes = [...memberNodes, ...knowledgeNodes]

        const personCount = memberNodes.filter((n) => n.type === 'person').length
        const agentCount = memberNodes.filter((n) => n.type === 'agent').length

        const divLabel = zoomState.currentDivision?.name ?? ''
        const deptLabel = zoomState.currentDepartment?.name ?? ''

        return {
          currentNodes: nodes,
          currentEdges: visibleEdges,
          stats: [
            { label: `${divLabel} > ${deptLabel} > ${team.name}`, value: '' },
            { label: 'people', value: personCount },
            { label: 'agents', value: agentCount },
            { label: 'items', value: knowledgeNodes.length },
          ],
        }
      }

      default:
        return emptyResult
    }
  }, [hierarchy, graphData, zoomState])

  // ----- Breadcrumbs -----

  const breadcrumbs = useMemo(
    () => zoomState.stack.map(({ id, label }) => ({ id, label })),
    [zoomState.stack],
  )

  // ----- zoomIn: drill into a node -----

  const zoomIn = useCallback(
    (nodeId: string) => {
      if (!hierarchy) return

      const divisions = hierarchy.enterprise.divisions

      setZoomState((prev) => {
        switch (prev.level) {
          // Enterprise -> Division
          case 'enterprise': {
            const division = divisions.find((d) => d.id === nodeId)
            if (!division) return prev
            return {
              level: 'division',
              stack: [
                ...prev.stack,
                { id: division.id, label: division.name, level: 'division' },
              ],
              currentDivision: division,
            }
          }

          // Division -> Department
          case 'division': {
            const division = prev.currentDivision
            if (!division) return prev
            const department = division.departments.find((d) => d.id === nodeId)
            if (!department) return prev
            return {
              level: 'department',
              stack: [
                ...prev.stack,
                { id: department.id, label: department.name, level: 'department' },
              ],
              currentDivision: division,
              currentDepartment: department,
            }
          }

          // Department -> Team
          case 'department': {
            const dept = prev.currentDepartment
            if (!dept) return prev
            const team = dept.teams.find((t) => t.id === nodeId)
            if (!team) return prev
            return {
              level: 'team',
              stack: [
                ...prev.stack,
                { id: team.id, label: team.name, level: 'team' },
              ],
              currentDivision: prev.currentDivision,
              currentDepartment: dept,
              currentTeam: team,
            }
          }

          // Already at team level — no deeper zoom
          case 'team':
            return prev

          default:
            return prev
        }
      })
    },
    [hierarchy],
  )

  // ----- zoomTo: navigate back to a breadcrumb level -----

  const zoomTo = useCallback(
    (stackIndex: number) => {
      if (!hierarchy) return

      setZoomState((prev) => {
        const targetEntry = prev.stack[stackIndex]
        if (!targetEntry) return prev

        const newStack = prev.stack.slice(0, stackIndex + 1)
        const targetLevel = targetEntry.level

        const divisions = hierarchy.enterprise.divisions

        switch (targetLevel) {
          case 'enterprise':
            return {
              level: 'enterprise',
              stack: newStack,
            }

          case 'division': {
            const division = divisions.find((d) => d.id === targetEntry.id)
            return {
              level: 'division',
              stack: newStack,
              currentDivision: division,
            }
          }

          case 'department': {
            // Recover division from the stack entry before this one
            const divEntry = newStack.find((e) => e.level === 'division')
            const division = divEntry
              ? divisions.find((d) => d.id === divEntry.id)
              : undefined
            const department = division?.departments.find(
              (d) => d.id === targetEntry.id,
            )
            return {
              level: 'department',
              stack: newStack,
              currentDivision: division,
              currentDepartment: department,
            }
          }

          case 'team': {
            const divEntry = newStack.find((e) => e.level === 'division')
            const deptEntry = newStack.find((e) => e.level === 'department')
            const division = divEntry
              ? divisions.find((d) => d.id === divEntry.id)
              : undefined
            const department = division?.departments.find(
              (d) => d.id === deptEntry?.id,
            )
            const team = department?.teams.find(
              (t) => t.id === targetEntry.id,
            )
            return {
              level: 'team',
              stack: newStack,
              currentDivision: division,
              currentDepartment: department,
              currentTeam: team,
            }
          }

          default:
            return prev
        }
      })
    },
    [hierarchy],
  )

  return {
    zoomState,
    zoomIn,
    zoomTo,
    currentNodes,
    currentEdges,
    breadcrumbs,
    stats,
  }
}
