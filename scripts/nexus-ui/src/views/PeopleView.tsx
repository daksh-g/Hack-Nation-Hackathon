import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Bot, User, AlertTriangle } from 'lucide-react'
import type { GraphNode } from '../types/graph'
import { getGraph } from '../lib/api'
import { CognitiveLoadBar, DivisionScopeBadge, StatsStrip } from '../components/shared'

// ── Constants ──────────────────────────────────────────────────────────────────

type Tab = 'people' | 'agents'

const DIVISION_ORDER = ['NA', 'EMEA', 'APAC', 'HQ'] as const

const DIVISION_LABELS: Record<string, string> = {
  NA: 'North America',
  EMEA: 'EMEA',
  APAC: 'Asia-Pacific',
  HQ: 'Headquarters',
  '': 'Unassigned',
}

const TRUST_COLORS: Record<string, string> = {
  autonomous:       'bg-accent-green/20 text-accent-green',
  supervised:       'bg-accent-amber/20 text-accent-amber',
  review_required:  'bg-accent-orange/20 text-accent-orange',
}

const AGENT_TYPE_COLORS: Record<string, string> = {
  coding:     'bg-agent-violet/20 text-agent-violet',
  research:   'bg-accent-blue/20 text-accent-blue',
  operations: 'bg-accent-amber/20 text-accent-amber',
  customer:   'bg-accent-green/20 text-accent-green',
}

const HEALTH_DOT_COLORS: Record<string, string> = {
  green:  'bg-accent-green',
  yellow: 'bg-accent-amber',
  orange: 'bg-accent-orange',
  red:    'bg-accent-red',
}

// ── Component ──────────────────────────────────────────────────────────────────

export function PeopleView() {
  const [nodes, setNodes] = useState<GraphNode[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('people')
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    getGraph()
      .then(data => setNodes(data.nodes))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  // ── Derived data ─────────────────────────────────────────────────────────────

  const people = useMemo(() => nodes.filter(n => n.type === 'person'), [nodes])
  const agents = useMemo(() => nodes.filter(n => n.type === 'agent'), [nodes])

  const currentList = activeTab === 'people' ? people : agents

  // Group by division
  const grouped = useMemo(() => {
    const groups: Record<string, GraphNode[]> = {}
    for (const division of DIVISION_ORDER) {
      const items = currentList.filter(n => n.division === division)
      if (items.length > 0) groups[division] = items
    }
    // Catch nodes without a recognized division
    const unassigned = currentList.filter(
      n => !n.division || !DIVISION_ORDER.includes(n.division as typeof DIVISION_ORDER[number]),
    )
    if (unassigned.length > 0) groups[''] = unassigned
    return groups
  }, [currentList])

  // Summary stats
  const stats = useMemo(() => {
    const avgLoad =
      people.length > 0
        ? Math.round(
            people.reduce((sum, p) => sum + (p.cognitive_load ?? 0), 0) / people.length,
          )
        : 0

    const attentionCount = people.filter(
      p => p.health === 'red' || p.health === 'orange',
    ).length

    return {
      totalPeople: people.length,
      totalAgents: agents.length,
      avgLoad,
      attentionCount,
    }
  }, [people, agents])

  // Node map for resolving supervising_human
  const nodeMap = useMemo(() => {
    const map = new Map<string, GraphNode>()
    for (const n of nodes) map.set(n.id, n)
    return map
  }, [nodes])

  // ── Loading state ────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-text-tertiary animate-pulse">Loading people &amp; agents...</div>
      </div>
    )
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 overflow-y-auto h-full">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <User size={22} className="text-accent-blue" />
          <h1 className="text-lg font-bold text-text-primary">People &amp; Workforce</h1>
        </div>

        {/* Stats strip */}
        <div className="mb-5">
          <StatsStrip
            items={[
              { label: 'People', value: stats.totalPeople },
              { label: 'AI Agents', value: stats.totalAgents },
              { label: 'Avg Load', value: `${stats.avgLoad}%` },
              { label: 'Attention', value: stats.attentionCount },
            ]}
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 mb-6">
          {([
            { key: 'people' as Tab, label: 'People', count: people.length },
            { key: 'agents' as Tab, label: 'AI Agents', count: agents.length },
          ]).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={[
                'px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-200',
                activeTab === tab.key
                  ? 'bg-accent-blue text-white shadow-lg shadow-accent-blue/20'
                  : 'bg-cards border border-white/10 text-text-secondary hover:border-white/20 hover:text-text-primary',
              ].join(' ')}
            >
              {tab.label}
              <span className="ml-1.5 text-[10px] opacity-70">({tab.count})</span>
            </button>
          ))}
        </div>

        {/* Content grouped by division */}
        {Object.keys(grouped).length === 0 ? (
          <div className="text-center py-16">
            <p className="text-text-tertiary text-sm">
              No {activeTab === 'people' ? 'people' : 'agents'} found
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(grouped).map(([division, items]) => (
              <section key={division || '_unassigned'}>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary mb-3">
                  {DIVISION_LABELS[division] ?? division}
                  <span className="ml-2 text-text-tertiary/60">({items.length})</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <AnimatePresence initial={false}>
                    {items.map((node, i) => (
                      <motion.div
                        key={node.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        transition={{ duration: 0.2, delay: i * 0.03 }}
                      >
                        {activeTab === 'people' ? (
                          <PersonCard
                            node={node}
                            isExpanded={expandedIds.has(node.id)}
                            onToggle={() => toggleExpand(node.id)}
                          />
                        ) : (
                          <AgentCard
                            node={node}
                            nodeMap={nodeMap}
                            isExpanded={expandedIds.has(node.id)}
                            onToggle={() => toggleExpand(node.id)}
                          />
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Person Card ──────────────────────────────────────────────────────────────

function PersonCard({
  node,
  isExpanded,
  onToggle,
}: {
  node: GraphNode
  isExpanded: boolean
  onToggle: () => void
}) {
  const healthColor = HEALTH_DOT_COLORS[node.health ?? 'green'] ?? 'bg-accent-green'

  return (
    <div className="bg-cards rounded-lg border border-white/10 overflow-hidden">
      <button onClick={onToggle} className="w-full text-left p-4 group">
        {/* Name row */}
        <div className="flex items-center gap-2 mb-2">
          {/* Health dot */}
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${healthColor}`} />
          <span className="text-sm font-semibold text-text-primary truncate flex-1">
            {node.label}
          </span>
          <ChevronDown
            size={14}
            className={[
              'flex-shrink-0 text-text-tertiary transition-transform duration-200',
              isExpanded ? 'rotate-180' : '',
            ].join(' ')}
          />
        </div>

        {/* Role */}
        {node.role && (
          <p className="text-xs text-text-tertiary mb-2 truncate">{node.role}</p>
        )}

        {/* Division badge */}
        {node.division && (
          <div className="mb-3">
            <DivisionScopeBadge scope={node.division} />
          </div>
        )}

        {/* Cognitive load */}
        {node.cognitive_load != null && (
          <div className="mb-2">
            <CognitiveLoadBar load={node.cognitive_load} />
          </div>
        )}

        {/* Quick stats */}
        <div className="flex items-center gap-3 text-[11px] text-text-tertiary">
          {node.active_commitments != null && (
            <span>
              <span className="text-text-secondary font-semibold">{node.active_commitments}</span>{' '}
              commitments
            </span>
          )}
          {node.pending_decisions != null && (
            <span>
              <span className="text-text-secondary font-semibold">{node.pending_decisions}</span>{' '}
              decisions
            </span>
          )}
        </div>
      </button>

      {/* Expanded detail */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-0 space-y-3 border-t border-white/5">
              <div className="pt-3 space-y-2 text-xs text-text-secondary">
                {node.department && (
                  <div>
                    <span className="text-text-tertiary">Department:</span>{' '}
                    <span className="text-text-primary">{node.department}</span>
                  </div>
                )}
                {node.team && (
                  <div>
                    <span className="text-text-tertiary">Team:</span>{' '}
                    <span className="text-text-primary">{node.team}</span>
                  </div>
                )}
                {node.cognitive_load != null && (
                  <div>
                    <span className="text-text-tertiary">Cognitive Load:</span>{' '}
                    <span className="text-text-primary font-mono">{node.cognitive_load}%</span>
                  </div>
                )}
                {(node.health === 'red' || node.health === 'orange') && (
                  <div className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-accent-orange/10 border border-accent-orange/20">
                    <AlertTriangle size={12} className="text-accent-orange" />
                    <span className="text-accent-orange text-[11px] font-medium">
                      Needs attention &mdash; high load or risk
                    </span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Agent Card ───────────────────────────────────────────────────────────────

function AgentCard({
  node,
  nodeMap,
  isExpanded,
  onToggle,
}: {
  node: GraphNode
  nodeMap: Map<string, GraphNode>
  isExpanded: boolean
  onToggle: () => void
}) {
  const supervisor = node.supervising_human
    ? nodeMap.get(node.supervising_human)
    : null

  return (
    <div className="bg-cards rounded-lg border border-agent-cyan/30 overflow-hidden">
      <button onClick={onToggle} className="w-full text-left p-4 group">
        {/* Name row with hex indicator */}
        <div className="flex items-center gap-2 mb-2">
          {/* Hexagonal avatar indicator */}
          <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
            <div
              className="w-5 h-5 bg-agent-cyan/20 border border-agent-cyan/40 flex items-center justify-center"
              style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
            >
              <Bot size={10} className="text-agent-cyan" />
            </div>
          </div>
          <span className="text-sm font-semibold text-text-primary truncate flex-1">
            {node.label}
          </span>
          <ChevronDown
            size={14}
            className={[
              'flex-shrink-0 text-text-tertiary transition-transform duration-200',
              isExpanded ? 'rotate-180' : '',
            ].join(' ')}
          />
        </div>

        {/* Badges row */}
        <div className="flex items-center gap-1.5 flex-wrap mb-3">
          {node.agent_type && (
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${AGENT_TYPE_COLORS[node.agent_type] ?? 'bg-white/10 text-text-tertiary'}`}
            >
              {node.agent_type}
            </span>
          )}
          {node.trust_level && (
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${TRUST_COLORS[node.trust_level] ?? 'bg-white/10 text-text-tertiary'}`}
            >
              {node.trust_level.replace('_', ' ')}
            </span>
          )}
        </div>

        {/* Supervising human */}
        {supervisor && (
          <div className="text-[11px] text-text-tertiary mb-2">
            Supervised by{' '}
            <span className="text-text-secondary font-medium">{supervisor.label}</span>
          </div>
        )}
        {node.supervising_human && !supervisor && (
          <div className="text-[11px] text-text-tertiary mb-2">
            Supervised by{' '}
            <span className="text-text-secondary font-medium">{node.supervising_human}</span>
          </div>
        )}

        {/* Active tasks preview */}
        {node.active_tasks && node.active_tasks.length > 0 && (
          <div className="text-[11px] text-text-tertiary">
            <span className="text-text-secondary font-semibold">{node.active_tasks.length}</span>{' '}
            active task{node.active_tasks.length !== 1 ? 's' : ''}
          </div>
        )}
      </button>

      {/* Expanded detail */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-0 space-y-3 border-t border-agent-cyan/10">
              {/* Active tasks list */}
              {node.active_tasks && node.active_tasks.length > 0 && (
                <div className="pt-3">
                  <h4 className="text-xs font-medium text-text-tertiary mb-1.5">Active Tasks</h4>
                  <ul className="space-y-1">
                    {node.active_tasks.map((task, i) => (
                      <li
                        key={i}
                        className="text-xs text-text-secondary flex items-center gap-1.5"
                      >
                        <span className="w-1 h-1 rounded-full bg-agent-cyan flex-shrink-0" />
                        {task}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Delegated authority scope */}
              {node.delegated_authority_scope && (
                <div>
                  <h4 className="text-xs font-medium text-text-tertiary mb-1">
                    Delegated Authority Scope
                  </h4>
                  <p className="text-xs text-text-secondary bg-white/[0.03] rounded px-2 py-1.5">
                    {node.delegated_authority_scope}
                  </p>
                </div>
              )}

              {/* Division */}
              {node.division && (
                <div>
                  <h4 className="text-xs font-medium text-text-tertiary mb-1">Division</h4>
                  <DivisionScopeBadge scope={node.division} />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
