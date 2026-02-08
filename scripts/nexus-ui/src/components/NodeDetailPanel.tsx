import type { ReactNode } from 'react'
import { X, User, Bot, Shield, AlertTriangle, ExternalLink, Clock, Zap } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { GraphNode } from '../types/graph'
import { CognitiveLoadBar } from './shared/CognitiveLoadBar'
import { StatusTag } from './shared/StatusTag'
import { KnowledgeTypeBadge } from './shared/KnowledgeTypeBadge'
import { FreshnessIndicator } from './shared/FreshnessIndicator'
import { FeedbackWidget } from './shared/FeedbackWidget'
import { DivisionScopeBadge } from './shared/DivisionScopeBadge'

/* ------------------------------------------------------------------ */
/*  Subcomponents for each node type                                   */
/* ------------------------------------------------------------------ */

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-[10px] font-semibold uppercase tracking-widest text-text-tertiary mb-2 mt-5 first:mt-0">
      {children}
    </h3>
  )
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between py-1.5 border-b border-white/5 last:border-0">
      <span className="text-xs text-text-tertiary shrink-0 mr-3">{label}</span>
      <span className="text-xs text-text-secondary text-right">{children}</span>
    </div>
  )
}

function HealthBadge({ health }: { health: string }) {
  const colors: Record<string, string> = {
    green:  'bg-accent-green/15 text-accent-green border-accent-green/20',
    yellow: 'bg-accent-amber/15 text-accent-amber border-accent-amber/20',
    orange: 'bg-accent-orange/15 text-accent-orange border-accent-orange/20',
    red:    'bg-accent-red/15 text-accent-red border-accent-red/20',
  }
  const c = colors[health] ?? colors.green
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase border ${c}`}>
      {health}
    </span>
  )
}

function TrustLevelBadge({ level }: { level: string }) {
  const map: Record<string, { color: string; label: string }> = {
    autonomous:       { color: 'bg-accent-green/15 text-accent-green border-accent-green/20', label: 'Autonomous' },
    supervised:       { color: 'bg-accent-amber/15 text-accent-amber border-accent-amber/20', label: 'Supervised' },
    review_required:  { color: 'bg-accent-red/15 text-accent-red border-accent-red/20', label: 'Review Required' },
  }
  const m = map[level] ?? map.supervised
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${m.color}`}>
      <Shield size={10} />
      {m.label}
    </span>
  )
}

function AgentTypeBadge({ agentType }: { agentType: string }) {
  const colors: Record<string, string> = {
    coding:     'bg-agent-cyan/15 text-agent-cyan',
    research:   'bg-agent-violet/15 text-agent-violet',
    operations: 'bg-accent-amber/15 text-accent-amber',
    customer:   'bg-accent-green/15 text-accent-green',
  }
  const c = colors[agentType] ?? 'bg-text-tertiary/15 text-text-tertiary'
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${c}`}>
      <Bot size={10} />
      {agentType}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/*  Person Detail                                                      */
/* ------------------------------------------------------------------ */

function PersonDetail({ node }: { node: GraphNode }) {
  return (
    <>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-accent-blue/20 flex items-center justify-center">
          <User size={20} className="text-accent-blue" />
        </div>
        <div>
          <p className="text-sm font-semibold text-text-primary">{node.label}</p>
          {node.role && <p className="text-xs text-text-tertiary">{node.role}</p>}
        </div>
      </div>

      <SectionLabel>Details</SectionLabel>
      <div className="bg-cards/50 rounded-lg p-3 border border-white/5">
        {node.team && <DetailRow label="Team">{node.team}</DetailRow>}
        {node.division && <DetailRow label="Division">{node.division}</DetailRow>}
        {node.department && <DetailRow label="Department">{node.department}</DetailRow>}
        {node.health && (
          <DetailRow label="Health">
            <HealthBadge health={node.health} />
          </DetailRow>
        )}
      </div>

      {node.cognitive_load !== undefined && (
        <>
          <SectionLabel>Cognitive Load</SectionLabel>
          <div className="bg-cards/50 rounded-lg p-3 border border-white/5">
            <CognitiveLoadBar load={node.cognitive_load} showLabel />
          </div>
        </>
      )}

      <SectionLabel>Activity</SectionLabel>
      <div className="bg-cards/50 rounded-lg p-3 border border-white/5">
        <DetailRow label="Active Commitments">
          <span className="font-mono text-text-primary">{node.active_commitments ?? 0}</span>
        </DetailRow>
        <DetailRow label="Pending Decisions">
          <span className="font-mono text-text-primary">{node.pending_decisions ?? 0}</span>
        </DetailRow>
      </div>

      <SectionLabel>Related Alerts</SectionLabel>
      <div className="bg-cards/50 rounded-lg p-3 border border-white/5">
        <div className="flex items-center gap-2 text-xs text-text-tertiary">
          <AlertTriangle size={12} />
          <span>No related alerts</span>
        </div>
      </div>
    </>
  )
}

/* ------------------------------------------------------------------ */
/*  Agent Detail                                                       */
/* ------------------------------------------------------------------ */

function AgentDetail({ node }: { node: GraphNode }) {
  return (
    <>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-agent-cyan/20 flex items-center justify-center">
          <Bot size={20} className="text-agent-cyan" />
        </div>
        <div>
          <p className="text-sm font-semibold text-text-primary">{node.label}</p>
          <div className="flex items-center gap-1.5 mt-1">
            {node.agent_type && <AgentTypeBadge agentType={node.agent_type} />}
            {node.trust_level && <TrustLevelBadge level={node.trust_level} />}
          </div>
        </div>
      </div>

      <SectionLabel>Supervision</SectionLabel>
      <div className="bg-cards/50 rounded-lg p-3 border border-white/5">
        <DetailRow label="Supervising Human">
          <span className="text-text-primary">{node.supervising_human ?? 'Unassigned'}</span>
        </DetailRow>
        {node.delegated_authority_scope && (
          <DetailRow label="Authority Scope">
            <span className="text-text-secondary">{node.delegated_authority_scope}</span>
          </DetailRow>
        )}
      </div>

      {node.active_tasks && node.active_tasks.length > 0 && (
        <>
          <SectionLabel>Active Tasks</SectionLabel>
          <div className="bg-cards/50 rounded-lg border border-white/5 divide-y divide-white/5">
            {node.active_tasks.map((task, idx) => (
              <div key={idx} className="px-3 py-2 flex items-start gap-2">
                <Zap size={12} className="text-agent-cyan mt-0.5 shrink-0" />
                <span className="text-xs text-text-secondary">{task}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {node.freshness_score !== undefined && (
        <>
          <SectionLabel>Context Freshness</SectionLabel>
          <div className="bg-cards/50 rounded-lg p-3 border border-white/5">
            <FreshnessIndicator score={node.freshness_score} showLabel />
          </div>
        </>
      )}
    </>
  )
}

/* ------------------------------------------------------------------ */
/*  Knowledge Node Detail (Decision / Fact / Commitment / Question)    */
/* ------------------------------------------------------------------ */

function KnowledgeDetail({ node }: { node: GraphNode }) {
  const createdDate = node.created_at ? new Date(node.created_at) : null
  const isDecision = node.type === 'decision'

  return (
    <>
      {/* Type + Division badges */}
      <div className="flex items-center gap-2 flex-wrap mb-4">
        <KnowledgeTypeBadge type={node.type} />
        {node.division && <DivisionScopeBadge scope={node.division} />}
        {node.status && <StatusTag status={node.status} />}
      </div>

      {/* Content */}
      {node.content && (
        <>
          <SectionLabel>Content</SectionLabel>
          <div className="bg-cards/50 rounded-lg p-3 border border-white/5">
            <p className="text-sm text-text-secondary leading-relaxed">{node.content}</p>
          </div>
        </>
      )}

      {/* Metadata */}
      <SectionLabel>Metadata</SectionLabel>
      <div className="bg-cards/50 rounded-lg p-3 border border-white/5">
        {node.source_type && (
          <DetailRow label="Source">
            <span className="inline-flex items-center gap-1">
              {node.source_type === 'human' ? <User size={11} /> : <Bot size={11} />}
              <span className="text-text-primary">{node.source_id ?? node.source_type}</span>
            </span>
          </DetailRow>
        )}
        {createdDate && (
          <DetailRow label="Created">
            <span className="inline-flex items-center gap-1">
              <Clock size={11} />
              {createdDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </DetailRow>
        )}
        {node.freshness_score !== undefined && (
          <DetailRow label="Freshness">
            <FreshnessIndicator score={node.freshness_score} showLabel />
          </DetailRow>
        )}
        {node.blast_radius !== undefined && (
          <DetailRow label="Blast Radius">
            <span className="font-mono text-text-primary">{node.blast_radius} nodes</span>
          </DetailRow>
        )}
        {node.half_life_days !== undefined && (
          <DetailRow label="Half-life">
            <span className="font-mono text-text-primary">{node.half_life_days} days</span>
          </DetailRow>
        )}
      </div>

      {/* Decision chain link */}
      {isDecision && (
        <>
          <SectionLabel>Decision Chain</SectionLabel>
          <a
            href={`/decisions?id=${node.id}`}
            className="flex items-center gap-2 bg-cards/50 rounded-lg p-3 border border-white/5 text-accent-blue hover:bg-accent-blue/10 transition-colors group"
          >
            <ExternalLink size={14} className="group-hover:translate-x-0.5 transition-transform" />
            <span className="text-xs font-medium">View Decision Chain</span>
          </a>
        </>
      )}

      {/* Feedback */}
      <SectionLabel>Feedback</SectionLabel>
      <div className="bg-cards/50 rounded-lg p-3 border border-white/5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-tertiary">Was this useful?</span>
          <FeedbackWidget nodeId={node.id} />
        </div>
      </div>
    </>
  )
}

/* ------------------------------------------------------------------ */
/*  Fallback for other node types (team, topic, etc.)                  */
/* ------------------------------------------------------------------ */

function GenericDetail({ node }: { node: GraphNode }) {
  return (
    <>
      <SectionLabel>Details</SectionLabel>
      <div className="bg-cards/50 rounded-lg p-3 border border-white/5">
        <DetailRow label="Type">
          <span className="font-mono text-text-primary">{node.type}</span>
        </DetailRow>
        {node.division && <DetailRow label="Division">{node.division}</DetailRow>}
        {node.department && <DetailRow label="Department">{node.department}</DetailRow>}
        {node.health && (
          <DetailRow label="Health">
            <HealthBadge health={node.health} />
          </DetailRow>
        )}
      </div>
    </>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Panel                                                         */
/* ------------------------------------------------------------------ */

interface NodeDetailPanelProps {
  node: GraphNode | null
  onClose: () => void
}

function getNodeContent(node: GraphNode) {
  switch (node.type) {
    case 'person':
      return <PersonDetail node={node} />
    case 'agent':
      return <AgentDetail node={node} />
    case 'decision':
    case 'fact':
    case 'commitment':
    case 'question':
      return <KnowledgeDetail node={node} />
    default:
      return <GenericDetail node={node} />
  }
}

export function NodeDetailPanel({ node, onClose }: NodeDetailPanelProps) {
  return (
    <AnimatePresence>
      {node && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/20 z-40"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 260, mass: 0.8 }}
            className="fixed right-0 top-0 h-full w-[400px] bg-panels border-l border-white/10 z-50 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 shrink-0">
              <h2 className="text-base font-semibold text-text-primary truncate pr-4">{node.label}</h2>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-white/10 text-text-tertiary hover:text-text-primary transition-colors shrink-0"
                title="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {getNodeContent(node)}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-white/5 shrink-0">
              <span className="text-[10px] text-text-tertiary/60 font-mono">{node.id}</span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
