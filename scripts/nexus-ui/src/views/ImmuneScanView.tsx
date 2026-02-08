import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, ChevronDown, Loader2, Shield, Zap } from 'lucide-react'
import type { Alert, GraphNode } from '../types/graph'
import { getAlerts, getGraph, runImmuneScan } from '../lib/api'
import { DivisionScopeBadge, ReasoningTrace } from '../components/shared'

// ── Agent definitions ──────────────────────────────────────────────────────────

type AgentKey = Alert['agent']

interface AgentDef {
  key: AgentKey
  label: string
  color: string          // Tailwind border/text color class stem
  colorBg: string        // Background for badges
  description: string
}

const AGENTS: AgentDef[] = [
  { key: 'contradiction', label: 'Contradiction Agent', color: 'accent-red',    colorBg: 'bg-accent-red/20 text-accent-red',    description: 'Finds conflicting information' },
  { key: 'staleness',     label: 'Staleness Agent',     color: 'accent-amber',  colorBg: 'bg-accent-amber/20 text-accent-amber',  description: 'Detects outdated knowledge' },
  { key: 'silo',          label: 'Silo Agent',          color: 'agent-violet',  colorBg: 'bg-agent-violet/20 text-agent-violet',  description: 'Identifies information silos' },
  { key: 'overload',      label: 'Overload Agent',      color: 'accent-orange', colorBg: 'bg-accent-orange/20 text-accent-orange', description: 'Monitors cognitive overload' },
  { key: 'coordination',  label: 'Coordination Agent',  color: 'accent-blue',   colorBg: 'bg-accent-blue/20 text-accent-blue',   description: 'Checks team alignment' },
  { key: 'drift',         label: 'Drift Agent',         color: 'agent-cyan',    colorBg: 'bg-agent-cyan/20 text-agent-cyan',    description: 'Detects goal/strategy drift' },
]

const AGENT_BADGE_COLORS: Record<string, string> = {
  contradiction: 'bg-accent-red/20 text-accent-red',
  coordination:  'bg-accent-blue/20 text-accent-blue',
  staleness:     'bg-accent-amber/20 text-accent-amber',
  silo:          'bg-agent-violet/20 text-agent-violet',
  overload:      'bg-accent-orange/20 text-accent-orange',
  drift:         'bg-agent-cyan/20 text-agent-cyan',
}

type AgentState = 'idle' | 'queued' | 'scanning' | 'complete'

interface AgentStatus {
  state: AgentState
  findings: number
}

// ── Reasoning trace steps ──────────────────────────────────────────────────────

const REASONING_STEPS = [
  { label: 'Initializing immune system agents' },
  { label: 'Scanning 87 nodes for contradictions' },
  { label: 'Checking knowledge freshness (half-life analysis)' },
  { label: 'Detecting information silos across divisions' },
  { label: 'Evaluating cognitive load distribution' },
  { label: 'Analyzing coordination patterns' },
]

// ── Component ──────────────────────────────────────────────────────────────────

export function ImmuneScanView() {
  const [agentStatuses, setAgentStatuses] = useState<Record<AgentKey, AgentStatus>>(() => {
    const initial: Record<string, AgentStatus> = {}
    for (const a of AGENTS) initial[a.key] = { state: 'idle', findings: 0 }
    return initial as Record<AgentKey, AgentStatus>
  })

  const [alerts, setAlerts] = useState<Alert[]>([])
  const [scanAlertIds, setScanAlertIds] = useState<Set<string>>(new Set())
  const [nodeMap, setNodeMap] = useState<Map<string, GraphNode>>(new Map())
  const [scanning, setScanning] = useState(false)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [completedCount, setCompletedCount] = useState(0)
  const scanningRef = useRef(false)

  // Load graph node map for display purposes
  useEffect(() => {
    getGraph()
      .then(data => {
        const map = new Map<string, GraphNode>()
        for (const n of data.nodes) map.set(n.id, n)
        setNodeMap(map)
      })
      .catch(console.error)
  }, [])

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  // ── Run scan ───────────────────────────────────────────────────────────────

  const handleRunScan = useCallback(async () => {
    if (scanningRef.current) return
    scanningRef.current = true
    setScanning(true)
    setCompletedCount(0)

    // Set all agents to queued
    const queued: Record<string, AgentStatus> = {}
    for (const a of AGENTS) queued[a.key] = { state: 'queued', findings: 0 }
    setAgentStatuses(queued as Record<AgentKey, AgentStatus>)

    // Fire API call and fetch alerts
    let resultAlerts: Alert[] = []
    try {
      const result = await runImmuneScan()
      // Attempt to extract alerts from result
      if (result && typeof result === 'object' && 'alerts' in result) {
        resultAlerts = (result as { alerts: Alert[] }).alerts
      }
    } catch {
      // ignore API failure
    }

    // Fallback: load from getAlerts
    if (resultAlerts.length === 0) {
      try {
        const data = await getAlerts()
        resultAlerts = data.alerts
      } catch {
        // no alerts available
      }
    }

    // Count findings per agent
    const countByAgent: Record<string, number> = {}
    for (const a of AGENTS) countByAgent[a.key] = 0
    for (const alert of resultAlerts) {
      if (countByAgent[alert.agent] !== undefined) {
        countByAgent[alert.agent]++
      }
    }

    // Track new scan alert IDs
    const newIds = new Set(resultAlerts.map(a => a.id))
    setScanAlertIds(newIds)

    // Stagger agents to complete one by one
    for (let i = 0; i < AGENTS.length; i++) {
      const agent = AGENTS[i]
      // Set to scanning
      setAgentStatuses(prev => ({
        ...prev,
        [agent.key]: { ...prev[agent.key], state: 'scanning' },
      }))

      await new Promise(r => setTimeout(r, 300))

      // Set to complete
      setAgentStatuses(prev => ({
        ...prev,
        [agent.key]: { state: 'complete', findings: countByAgent[agent.key] },
      }))
      setCompletedCount(i + 1)
    }

    // Merge alerts (deduplicate by id)
    setAlerts(prev => {
      const existing = new Map(prev.map(a => [a.id, a]))
      for (const a of resultAlerts) existing.set(a.id, a)
      return Array.from(existing.values())
    })

    setScanning(false)
    scanningRef.current = false
  }, [])

  // ── Derived data ─────────────────────────────────────────────────────────────

  const unresolvedAlerts = useMemo(
    () => alerts.filter(a => !a.resolved),
    [alerts],
  )

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 overflow-y-auto h-full">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Shield size={24} className="text-agent-cyan" />
          <div>
            <h1 className="text-lg font-bold text-text-primary">Immune Scan</h1>
            <p className="text-xs text-text-tertiary">
              6 AI agents scanning your organization for knowledge health issues
            </p>
          </div>
        </div>

        {/* Run button */}
        <button
          onClick={handleRunScan}
          disabled={scanning}
          className={[
            'w-full mb-6 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all duration-300',
            scanning
              ? 'bg-agent-cyan/20 text-agent-cyan cursor-wait'
              : 'bg-agent-cyan text-white hover:bg-agent-cyan/90 shadow-lg shadow-agent-cyan/25 hover:shadow-agent-cyan/40',
          ].join(' ')}
        >
          {scanning ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Running Immune Scan...
            </>
          ) : (
            <>
              <Zap size={18} />
              Run Immune Scan
            </>
          )}
        </button>

        {/* Progress bar (visible during scan) */}
        <AnimatePresence>
          {scanning && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6"
            >
              <div className="flex items-center justify-between text-xs text-text-tertiary mb-1.5">
                <span>Scan progress</span>
                <span className="font-mono">{completedCount}/6 agents complete</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-agent-cyan rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${(completedCount / 6) * 100}%` }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Agent pipeline grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
          {AGENTS.map(agent => {
            const status = agentStatuses[agent.key]
            return (
              <AgentCard key={agent.key} agent={agent} status={status} />
            )
          })}
        </div>

        {/* Reasoning trace (visible during scan) */}
        <AnimatePresence>
          {scanning && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mb-6 bg-cards rounded-lg border border-white/10 p-4"
            >
              <ReasoningTrace
                steps={REASONING_STEPS}
                staggerMs={400}
                active={scanning}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Findings list */}
        {unresolvedAlerts.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-text-primary mb-3">
              Findings
              <span className="ml-2 text-text-tertiary font-normal">
                ({unresolvedAlerts.length})
              </span>
            </h2>
            <div className="space-y-2">
              <AnimatePresence initial={false}>
                {unresolvedAlerts.map(alert => {
                  const isExpanded = expandedIds.has(alert.id)
                  const isNew = scanAlertIds.has(alert.id)
                  return (
                    <motion.div
                      key={alert.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2 }}
                      className="bg-cards rounded-lg border border-white/10 overflow-hidden"
                    >
                      {/* Header */}
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
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            {/* Agent badge */}
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${AGENT_BADGE_COLORS[alert.agent] ?? 'bg-white/10 text-text-tertiary'}`}
                            >
                              {alert.agent}
                            </span>
                            <DivisionScopeBadge scope={alert.scope} />
                            {isNew && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-accent-green/20 text-accent-green shadow-[0_0_8px_rgba(34,197,94,0.3)]">
                                NEW
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-semibold text-text-primary leading-snug">
                            {alert.headline}
                          </p>
                          <p className="text-xs text-text-secondary mt-0.5 line-clamp-1">
                            {alert.detail}
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
                            <div className="px-4 pb-4 pt-0 space-y-4 border-t border-white/5">
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

                              {/* Resolution */}
                              <div className="bg-white/[0.03] rounded-lg p-3">
                                <h4 className="text-xs font-medium text-text-tertiary mb-1.5">
                                  Resolution
                                </h4>
                                <p className="text-sm text-text-primary">
                                  <span className="font-medium">
                                    {nodeMap.get(alert.resolution.authority)?.label ?? alert.resolution.authority}
                                  </span>
                                  <span className="text-text-secondary">
                                    {' '}&mdash; {alert.resolution.action}
                                  </span>
                                </p>
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
          </div>
        )}
      </div>
    </div>
  )
}

// ── Agent Card sub-component ─────────────────────────────────────────────────

function AgentCard({ agent, status }: { agent: AgentDef; status: AgentStatus }) {
  const borderColor = (() => {
    switch (status.state) {
      case 'idle':
        return 'border-white/10'
      case 'queued':
        return 'border-white/20'
      case 'scanning':
        return `border-${agent.color}`
      case 'complete':
        return `border-${agent.color}`
    }
  })()

  const glowClass = status.state === 'scanning' ? `shadow-[0_0_12px_rgba(6,182,212,0.3)]` : ''

  return (
    <motion.div
      layout
      className={[
        'bg-cards rounded-lg border p-4 transition-all duration-300',
        borderColor,
        glowClass,
      ].join(' ')}
      animate={
        status.state === 'scanning'
          ? {
              boxShadow: [
                '0 0 8px rgba(6,182,212,0.15)',
                '0 0 16px rgba(6,182,212,0.35)',
                '0 0 8px rgba(6,182,212,0.15)',
              ],
            }
          : { boxShadow: '0 0 0px rgba(0,0,0,0)' }
      }
      transition={
        status.state === 'scanning'
          ? { duration: 1.5, repeat: Infinity, ease: 'easeInOut' }
          : { duration: 0.3 }
      }
    >
      {/* Icon + name */}
      <div className="flex items-center gap-2 mb-2">
        {status.state === 'complete' ? (
          <CheckCircle size={16} className={`text-${agent.color} flex-shrink-0`} />
        ) : status.state === 'scanning' ? (
          <Loader2 size={16} className="text-agent-cyan flex-shrink-0 animate-spin" />
        ) : (
          <div className={`w-4 h-4 rounded-full border ${status.state === 'queued' ? 'border-white/30' : 'border-white/10'} flex-shrink-0`} />
        )}
        <span
          className={[
            'text-xs font-semibold truncate',
            status.state === 'idle' || status.state === 'queued'
              ? 'text-text-tertiary'
              : 'text-text-primary',
          ].join(' ')}
        >
          {agent.label}
        </span>
      </div>

      {/* Description */}
      <p className="text-[11px] text-text-tertiary mb-3 leading-snug">
        {agent.description}
      </p>

      {/* Status line */}
      <div className="text-xs font-mono">
        {status.state === 'idle' && (
          <span className="text-text-tertiary/60">Ready</span>
        )}
        {status.state === 'queued' && (
          <span className="text-text-tertiary">Waiting...</span>
        )}
        {status.state === 'scanning' && (
          <span className="text-agent-cyan">Analyzing...</span>
        )}
        {status.state === 'complete' && (
          <span className={`text-${agent.color} font-semibold`}>
            {status.findings} finding{status.findings !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    </motion.div>
  )
}
