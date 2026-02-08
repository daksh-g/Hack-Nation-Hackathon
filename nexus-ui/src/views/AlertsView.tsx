import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, ExternalLink, ChevronDown, Shield } from 'lucide-react'
import type { Alert, GraphNode } from '../types/graph'
import { getAlerts, getGraph, resolveAlert } from '../lib/api'
import { DivisionScopeBadge, FeedbackWidget } from '../components/shared'

type FilterTab = 'all' | 'contradiction' | 'staleness' | 'silo' | 'overload' | 'drift' | 'coordination' | 'resolved'

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'contradiction', label: 'Contradictions' },
  { key: 'staleness', label: 'Staleness' },
  { key: 'silo', label: 'Silos' },
  { key: 'overload', label: 'Overload' },
  { key: 'drift', label: 'Drift' },
  { key: 'coordination', label: 'Coordination' },
  { key: 'resolved', label: 'Resolved' },
]

const DIVISION_ORDER: Alert['scope'][] = ['cross-division', 'NA', 'EMEA', 'APAC', 'HQ']

const DIVISION_LABELS: Record<string, string> = {
  'cross-division': 'CROSS-DIVISION',
  NA: 'North America',
  EMEA: 'EMEA',
  APAC: 'Asia-Pacific',
  HQ: 'Headquarters',
}

function formatRelativeTime(timestamp: string): string {
  const now = Date.now()
  const then = new Date(timestamp).getTime()
  const diffMs = now - then
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 7) return `${diffDay}d ago`
  return `${Math.floor(diffDay / 7)}w ago`
}

const AGENT_COLORS: Record<string, string> = {
  contradiction: 'bg-accent-red/20 text-accent-red',
  coordination: 'bg-accent-blue/20 text-accent-blue',
  staleness: 'bg-accent-amber/20 text-accent-amber',
  silo: 'bg-agent-violet/20 text-agent-violet',
  overload: 'bg-accent-orange/20 text-accent-orange',
  drift: 'bg-agent-cyan/20 text-agent-cyan',
}

export function AlertsView() {
  const navigate = useNavigate()
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [nodeMap, setNodeMap] = useState<Map<string, GraphNode>>(new Map())
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all')
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [resolvingIds, setResolvingIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    Promise.all([
      getAlerts().then(data => setAlerts(data.alerts)),
      getGraph().then(data => {
        const map = new Map<string, GraphNode>()
        for (const node of data.nodes) {
          map.set(node.id, node)
        }
        setNodeMap(map)
      }),
    ])
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

  const handleResolve = useCallback(async (id: string) => {
    setResolvingIds(prev => new Set(prev).add(id))
    try {
      await resolveAlert(id)
      setAlerts(prev => prev.map(a => (a.id === id ? { ...a, resolved: true } : a)))
    } catch (err) {
      console.error('Failed to resolve alert:', err)
    } finally {
      setResolvingIds(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }, [])

  const filtered = useMemo(() => {
    if (activeFilter === 'all') return alerts.filter(a => !a.resolved)
    if (activeFilter === 'resolved') return alerts.filter(a => a.resolved)
    return alerts.filter(a => !a.resolved && a.agent === activeFilter)
  }, [alerts, activeFilter])

  const grouped = useMemo(() => {
    const groups: Record<string, Alert[]> = {}
    for (const scope of DIVISION_ORDER) {
      const items = filtered.filter(a => a.scope === scope)
      if (items.length > 0) groups[scope] = items
    }
    // catch any scopes not in DIVISION_ORDER
    for (const a of filtered) {
      if (!DIVISION_ORDER.includes(a.scope)) {
        if (!groups[a.scope]) groups[a.scope] = []
        groups[a.scope].push(a)
      }
    }
    return groups
  }, [filtered])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-text-tertiary animate-pulse">Loading alerts...</div>
      </div>
    )
  }

  return (
    <div className="p-6 overflow-y-auto h-full">
      <div className="max-w-[768px] mx-auto">
        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-1.5 mb-6">
          {FILTER_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key)}
              className={[
                'px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200',
                activeFilter === tab.key
                  ? 'bg-accent-blue text-white shadow-lg shadow-accent-blue/20'
                  : 'bg-cards border border-white/10 text-text-secondary hover:border-white/20 hover:text-text-primary',
              ].join(' ')}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Alerts grouped by scope */}
        {Object.keys(grouped).length === 0 ? (
          <div className="text-center py-16">
            <Shield className="mx-auto mb-3 text-text-tertiary/50" size={32} />
            <p className="text-text-tertiary text-sm">No alerts matching filter</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([scope, scopeAlerts]) => (
              <section key={scope}>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary mb-3">
                  {DIVISION_LABELS[scope] ?? scope}
                  <span className="ml-2 text-text-tertiary/60">({scopeAlerts.length})</span>
                </h3>
                <div className="space-y-2">
                  <AnimatePresence initial={false}>
                    {scopeAlerts.map(alert => {
                      const isExpanded = expandedIds.has(alert.id)
                      const isResolving = resolvingIds.has(alert.id)
                      return (
                        <motion.div
                          key={alert.id}
                          layout
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.2 }}
                          className={[
                            'bg-cards rounded-lg border border-white/5 overflow-hidden',
                            alert.resolved ? 'opacity-60' : '',
                          ].join(' ')}
                        >
                          {/* Header — clickable */}
                          <button
                            onClick={() => toggleExpand(alert.id)}
                            className="w-full text-left p-4 flex items-start gap-3 group"
                          >
                            {/* Severity dot */}
                            <span
                              className={[
                                'mt-1 w-2 h-2 rounded-full flex-shrink-0',
                                alert.severity === 'critical'
                                  ? 'bg-accent-red'
                                  : alert.severity === 'warning'
                                    ? 'bg-accent-amber'
                                    : 'bg-accent-blue',
                              ].join(' ')}
                            />
                            <div className="flex-1 min-w-0">
                              {/* Badges row */}
                              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${AGENT_COLORS[alert.agent] ?? 'bg-white/10 text-text-tertiary'}`}
                                >
                                  {alert.agent}
                                </span>
                                <DivisionScopeBadge scope={alert.scope} />
                                <span className="text-[11px] text-text-tertiary ml-auto flex-shrink-0">
                                  {formatRelativeTime(alert.timestamp)}
                                </span>
                              </div>
                              {/* Headline */}
                              <p className="text-sm font-semibold text-text-primary leading-snug">
                                {alert.headline}
                              </p>
                            </div>
                            <ChevronDown
                              size={16}
                              className={[
                                'flex-shrink-0 mt-1 text-text-tertiary transition-transform duration-200',
                                isExpanded ? 'rotate-180' : '',
                              ].join(' ')}
                            />
                          </button>

                          {/* Expandable detail */}
                          <AnimatePresence initial={false}>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.25, ease: 'easeInOut' }}
                                className="overflow-hidden"
                              >
                                <div className="px-4 pb-4 pt-0 space-y-4 border-t border-white/5">
                                  {/* Detail text */}
                                  <p className="text-sm text-text-secondary leading-relaxed pt-3">
                                    {alert.detail}
                                  </p>

                                  {/* Affected nodes */}
                                  {alert.affected_node_ids.length > 0 && (
                                    <div>
                                      <h4 className="text-xs font-medium text-text-tertiary mb-1.5">
                                        Affected Nodes
                                      </h4>
                                      <div className="flex flex-wrap gap-1.5">
                                        {alert.affected_node_ids.map(nodeId => {
                                          const node = nodeMap.get(nodeId)
                                          return (
                                            <span
                                              key={nodeId}
                                              className="px-2 py-0.5 rounded bg-white/5 text-xs text-text-secondary"
                                            >
                                              {node?.label ?? nodeId}
                                            </span>
                                          )
                                        })}
                                      </div>
                                    </div>
                                  )}

                                  {/* Estimated cost */}
                                  {alert.estimated_cost && (
                                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent-orange/10 border border-accent-orange/20">
                                      <span className="text-xs font-semibold text-accent-orange uppercase tracking-wider">
                                        Est. Cost
                                      </span>
                                      <span className="text-sm font-bold text-accent-orange">
                                        {alert.estimated_cost}
                                      </span>
                                    </div>
                                  )}

                                  {/* Resolution */}
                                  <div className="bg-white/[0.03] rounded-lg p-3">
                                    <h4 className="text-xs font-medium text-text-tertiary mb-1.5">
                                      Resolution
                                    </h4>
                                    <p className="text-sm text-text-primary">
                                      <span className="font-medium">{nodeMap.get(alert.resolution.authority)?.label ?? alert.resolution.authority}</span>
                                      <span className="text-text-secondary"> -- {alert.resolution.action}</span>
                                    </p>
                                  </div>

                                  {/* Action buttons + Feedback */}
                                  <div className="flex items-center gap-3 pt-1">
                                    {!alert.resolved && (
                                      <button
                                        onClick={() => handleResolve(alert.id)}
                                        disabled={isResolving}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-green/20 text-accent-green text-xs font-medium hover:bg-accent-green/30 transition-colors disabled:opacity-50"
                                      >
                                        <CheckCircle size={14} />
                                        {isResolving ? 'Resolving...' : 'Resolve'}
                                      </button>
                                    )}
                                    <button
                                      onClick={() =>
                                        navigate(
                                          `/decisions?id=${alert.affected_node_ids[0] ?? ''}`
                                        )
                                      }
                                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-blue/20 text-accent-blue text-xs font-medium hover:bg-accent-blue/30 transition-colors"
                                    >
                                      <ExternalLink size={14} />
                                      Trace Decision Chain
                                    </button>
                                    <div className="ml-auto">
                                      <FeedbackWidget nodeId={alert.id} />
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      )
                    })}
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
