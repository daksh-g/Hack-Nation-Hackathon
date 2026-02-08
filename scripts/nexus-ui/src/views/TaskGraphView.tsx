import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle2,
  AlertTriangle,
  Zap,
  User,
  Bot,
  ArrowRight,
  ArrowLeft,
  Layers,
} from 'lucide-react'
import type { GraphNode, GraphEdge } from '../types/graph'
import { getGraph } from '../lib/api'
import { DivisionScopeBadge, FreshnessIndicator, StatsStrip } from '../components/shared'

// ── Helpers ──────────────────────────────────────────────────────────────

interface TaskCard {
  node: GraphNode
  blocksCount: number
  blockedByCount: number
  assignedTo: string | null
  isCriticalPath: boolean
}

type Column = 'active' | 'blocked' | 'resolved'

function truncate(text: string, max: number): string {
  if (!text) return ''
  return text.length > max ? text.slice(0, max) + '...' : text
}

/**
 * Compute the critical path length for each node:
 * the length of the longest chain of downstream BLOCKS edges.
 * Returns a Map from node id to depth.
 */
function computeDownstreamDepth(
  taskIds: Set<string>,
  blocksEdges: GraphEdge[],
): Map<string, number> {
  // Build adjacency: source -> [targets]
  const adj = new Map<string, string[]>()
  for (const e of blocksEdges) {
    if (!taskIds.has(e.source) || !taskIds.has(e.target)) continue
    if (!adj.has(e.source)) adj.set(e.source, [])
    adj.get(e.source)!.push(e.target)
  }

  const cache = new Map<string, number>()
  const visiting = new Set<string>()

  function dfs(id: string): number {
    if (cache.has(id)) return cache.get(id)!
    if (visiting.has(id)) return 0 // cycle guard
    visiting.add(id)
    const children = adj.get(id) ?? []
    let maxChild = 0
    for (const child of children) {
      maxChild = Math.max(maxChild, 1 + dfs(child))
    }
    visiting.delete(id)
    cache.set(id, maxChild)
    return maxChild
  }

  for (const id of taskIds) dfs(id)
  return cache
}

// ── Column config ────────────────────────────────────────────────────────

const COLUMN_CONFIG: Record<Column, { label: string; icon: React.ReactNode; color: string }> = {
  active: {
    label: 'Active',
    icon: <Zap size={14} className="text-accent-green" />,
    color: 'border-accent-green/40',
  },
  blocked: {
    label: 'Blocked',
    icon: <AlertTriangle size={14} className="text-accent-amber" />,
    color: 'border-accent-amber/40',
  },
  resolved: {
    label: 'Resolved',
    icon: <CheckCircle2 size={14} className="text-text-tertiary" />,
    color: 'border-text-tertiary/30',
  },
}

// ── Component ────────────────────────────────────────────────────────────

export function TaskGraphView() {
  const [nodes, setNodes] = useState<GraphNode[]>([])
  const [edges, setEdges] = useState<GraphEdge[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getGraph()
      .then(data => {
        setNodes(data.nodes)
        setEdges(data.edges)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  // Filter to task-type nodes
  const taskNodes = useMemo(
    () => nodes.filter(n => n.type === 'commitment' || n.type === 'decision'),
    [nodes],
  )

  // Filter to relevant edges
  const relevantEdges = useMemo(
    () => edges.filter(e => e.type === 'BLOCKS' || e.type === 'DEPENDS_ON' || e.type === 'ASSIGNED_TO'),
    [edges],
  )

  const blocksEdges = useMemo(
    () => relevantEdges.filter(e => e.type === 'BLOCKS'),
    [relevantEdges],
  )

  const dependsOnEdges = useMemo(
    () => relevantEdges.filter(e => e.type === 'DEPENDS_ON'),
    [relevantEdges],
  )

  const assignedToEdges = useMemo(
    () => relevantEdges.filter(e => e.type === 'ASSIGNED_TO'),
    [relevantEdges],
  )

  // Node map for lookups
  const nodeMap = useMemo(() => {
    const m = new Map<string, GraphNode>()
    for (const n of nodes) m.set(n.id, n)
    return m
  }, [nodes])

  // Set of active node IDs (for blocked detection)
  const activeNodeIds = useMemo(
    () => new Set(taskNodes.filter(n => n.status === 'active').map(n => n.id)),
    [taskNodes],
  )

  // Nodes that are blocked: have an incoming BLOCKS edge from an active node
  const blockedNodeIds = useMemo(() => {
    const blocked = new Set<string>()
    for (const e of blocksEdges) {
      if (activeNodeIds.has(e.source)) {
        blocked.add(e.target)
      }
    }
    return blocked
  }, [blocksEdges, activeNodeIds])

  // Critical path: downstream depth computation
  const taskIdSet = useMemo(() => new Set(taskNodes.map(n => n.id)), [taskNodes])
  const downstreamDepth = useMemo(
    () => computeDownstreamDepth(taskIdSet, blocksEdges),
    [taskIdSet, blocksEdges],
  )

  // Critical path threshold: top quartile of depth (minimum depth of 1)
  const criticalThreshold = useMemo(() => {
    const depths = Array.from(downstreamDepth.values()).filter(d => d > 0)
    if (depths.length === 0) return Infinity
    depths.sort((a, b) => b - a)
    return depths[Math.floor(depths.length * 0.25)] ?? 1
  }, [downstreamDepth])

  // The maximum depth is the "critical path length"
  const criticalPathLength = useMemo(() => {
    const depths = Array.from(downstreamDepth.values())
    return depths.length > 0 ? Math.max(...depths) : 0
  }, [downstreamDepth])

  // Build TaskCards per column
  const columns = useMemo(() => {
    const result: Record<Column, TaskCard[]> = { active: [], blocked: [], resolved: [] }

    for (const node of taskNodes) {
      // Count blocks / blocked-by
      const blocksCount = blocksEdges.filter(e => e.source === node.id).length
      const blockedByCount =
        blocksEdges.filter(e => e.target === node.id).length +
        dependsOnEdges.filter(e => e.source === node.id).length

      // Find assigned person
      const assignEdge = assignedToEdges.find(e => e.source === node.id || e.target === node.id)
      let assignedTo: string | null = null
      if (assignEdge) {
        // The person is whichever end is a person node
        const otherId = assignEdge.source === node.id ? assignEdge.target : assignEdge.source
        const other = nodeMap.get(otherId)
        assignedTo = other?.label ?? otherId
      }

      const isCriticalPath = (downstreamDepth.get(node.id) ?? 0) >= criticalThreshold

      const card: TaskCard = { node, blocksCount, blockedByCount, assignedTo, isCriticalPath }

      // Column placement
      if (node.status === 'superseded' || node.status === 'resolved') {
        result.resolved.push(card)
      } else if (blockedNodeIds.has(node.id)) {
        result.blocked.push(card)
      } else {
        result.active.push(card)
      }
    }

    // Sort: critical path first, then by blocksCount desc
    for (const col of Object.values(result)) {
      col.sort((a, b) => {
        if (a.isCriticalPath !== b.isCriticalPath) return a.isCriticalPath ? -1 : 1
        return b.blocksCount - a.blocksCount
      })
    }

    return result
  }, [taskNodes, blocksEdges, dependsOnEdges, assignedToEdges, nodeMap, blockedNodeIds, downstreamDepth, criticalThreshold])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-text-tertiary animate-pulse">Loading task graph...</div>
      </div>
    )
  }

  return (
    <div className="p-6 overflow-y-auto h-full">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Layers size={20} className="text-accent-blue" />
            <h1 className="text-lg font-semibold text-text-primary">Task Graph</h1>
          </div>
          <StatsStrip
            items={[
              { label: 'Active', value: columns.active.length },
              { label: 'Blocked', value: columns.blocked.length },
              { label: 'Resolved', value: columns.resolved.length },
              { label: 'Critical Path', value: criticalPathLength },
            ]}
          />
        </div>

        {/* Kanban Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {(['active', 'blocked', 'resolved'] as Column[]).map(col => {
            const config = COLUMN_CONFIG[col]
            const cards = columns[col]
            return (
              <div key={col} className="flex flex-col min-h-0">
                {/* Column header */}
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`flex items-center gap-2 mb-3 pb-2 border-b-2 ${config.color}`}
                >
                  {config.icon}
                  <span className="text-sm font-semibold text-text-primary">{config.label}</span>
                  <span className="ml-auto text-xs text-text-tertiary font-mono tabular-nums">
                    {cards.length}
                  </span>
                </motion.div>

                {/* Cards */}
                <div className="space-y-2">
                  <AnimatePresence initial={false}>
                    {cards.length === 0 ? (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-8 text-text-tertiary text-xs"
                      >
                        No tasks
                      </motion.div>
                    ) : (
                      cards.map(card => (
                        <TaskCardComponent key={card.node.id} card={card} column={col} />
                      ))
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Task Card Component ──────────────────────────────────────────────────

function TaskCardComponent({ card, column }: { card: TaskCard; column: Column }) {
  const { node, blocksCount, blockedByCount, assignedTo, isCriticalPath } = card

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={[
        'bg-cards rounded-lg border border-white/5 p-3.5',
        'hover:border-white/10 transition-colors duration-200',
        column === 'resolved' ? 'opacity-60' : '',
        isCriticalPath ? 'border-l-2 border-l-accent-red' : '',
      ].join(' ')}
    >
      {/* Top row: type badge + critical path */}
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-accent-blue/15 text-accent-blue">
          {node.type}
        </span>
        {isCriticalPath && (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-accent-red/15 text-accent-red">
            Critical Path
          </span>
        )}
        {node.source_type && (
          <span
            className={[
              'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium',
              node.source_type === 'ai_agent'
                ? 'bg-agent-violet/15 text-agent-violet'
                : 'bg-accent-green/15 text-accent-green',
            ].join(' ')}
          >
            {node.source_type === 'ai_agent' ? <Bot size={10} /> : <User size={10} />}
            {node.source_type === 'ai_agent' ? 'AI Agent' : 'Human'}
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="text-sm font-semibold text-text-primary leading-snug mb-1">
        {node.label}
      </h3>

      {/* Content preview */}
      {node.content && (
        <p className="text-xs text-text-secondary leading-relaxed mb-2">
          {truncate(node.content, 80)}
        </p>
      )}

      {/* Metadata row */}
      <div className="flex items-center gap-2 flex-wrap mt-2">
        {/* Assigned person */}
        {assignedTo && (
          <span className="inline-flex items-center gap-1 text-[11px] text-text-tertiary">
            <User size={10} className="text-text-tertiary" />
            {assignedTo}
          </span>
        )}

        {/* Division badge */}
        {node.division && <DivisionScopeBadge scope={node.division} />}
      </div>

      {/* Freshness bar */}
      {node.freshness_score != null && (
        <div className="mt-2 flex items-center gap-2">
          <div className="flex-1 h-1 rounded-full bg-white/5 overflow-hidden">
            <motion.div
              className={[
                'h-full rounded-full',
                node.freshness_score < 0.5
                  ? 'bg-accent-green'
                  : node.freshness_score < 1.0
                    ? 'bg-accent-amber'
                    : 'bg-accent-red',
              ].join(' ')}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, (1 - node.freshness_score / 2) * 100)}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
          <FreshnessIndicator score={node.freshness_score} />
        </div>
      )}

      {/* Dependency counts */}
      {(blocksCount > 0 || blockedByCount > 0) && (
        <div className="flex items-center gap-3 mt-2 pt-2 border-t border-white/5">
          {blocksCount > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] text-accent-amber">
              <ArrowRight size={10} />
              Blocks {blocksCount} task{blocksCount !== 1 ? 's' : ''}
            </span>
          )}
          {blockedByCount > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] text-accent-red">
              <ArrowLeft size={10} />
              Blocked by {blockedByCount}
            </span>
          )}
        </div>
      )}
    </motion.div>
  )
}
