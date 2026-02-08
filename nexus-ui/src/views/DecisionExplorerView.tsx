import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { GitBranch, Calendar } from 'lucide-react'
import type { GraphNode, DecisionChain } from '../types/graph'
import { getDecisions, getDecisionChain } from '../lib/api'
import {
  DivisionScopeBadge,
  KnowledgeTypeBadge,
  StatusTag,
  FreshnessIndicator,
  FeedbackWidget,
} from '../components/shared'

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return ''
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

export function DecisionExplorerView() {
  const [searchParams] = useSearchParams()
  const [crossDivision, setCrossDivision] = useState<GraphNode[]>([])
  const [byDivision, setByDivision] = useState<Record<string, GraphNode[]>>({})
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [chain, setChain] = useState<DecisionChain | null>(null)
  const [loading, setLoading] = useState(true)
  const [chainLoading, setChainLoading] = useState(false)

  // Initialize from URL param if present
  useEffect(() => {
    const idFromUrl = searchParams.get('id')
    if (idFromUrl) setSelectedId(idFromUrl)
  }, [searchParams])

  useEffect(() => {
    getDecisions()
      .then(data => {
        setCrossDivision(data.cross_division ?? [])
        setByDivision(data.by_division ?? {})
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedId) {
      setChain(null)
      return
    }
    setChainLoading(true)
    getDecisionChain(selectedId)
      .then(setChain)
      .catch(console.error)
      .finally(() => setChainLoading(false))
  }, [selectedId])

  const handleSelect = useCallback((id: string) => {
    setSelectedId(prev => (prev === id ? null : id))
  }, [])

  // Group downstream impact by division
  const downstreamByDivision = useMemo(() => {
    if (!chain?.downstream_impact?.length) return {}
    const grouped: Record<string, GraphNode[]> = {}
    for (const node of chain.downstream_impact) {
      const div = node.division ?? 'Unknown'
      if (!grouped[div]) grouped[div] = []
      grouped[div].push(node)
    }
    return grouped
  }, [chain])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-text-tertiary animate-pulse">Loading decisions...</div>
      </div>
    )
  }

  return (
    <div className="flex h-full">
      {/* Left Pane — Decisions list */}
      <div className="w-80 flex-shrink-0 bg-sidebar border-r border-white/5 overflow-y-auto">
        <div className="p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary mb-4">
            Decisions
          </h2>

          {/* Cross-Division section */}
          {crossDivision.length > 0 && (
            <section className="mb-5">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-accent-red/80 mb-2">
                Cross-Division
              </h3>
              <div className="space-y-1.5">
                {crossDivision.map(d => (
                  <DecisionCard
                    key={d.id}
                    node={d}
                    isSelected={selectedId === d.id}
                    onSelect={handleSelect}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Per-division sections */}
          {Object.entries(byDivision).map(([division, nodes]) => (
            <section key={division} className="mb-5">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-text-tertiary/70 mb-2">
                {division}
              </h3>
              <div className="space-y-1.5">
                {nodes.map(d => (
                  <DecisionCard
                    key={d.id}
                    node={d}
                    isSelected={selectedId === d.id}
                    onSelect={handleSelect}
                  />
                ))}
              </div>
            </section>
          ))}

          {crossDivision.length === 0 && Object.keys(byDivision).length === 0 && (
            <p className="text-sm text-text-tertiary text-center py-8">No decisions found</p>
          )}
        </div>
      </div>

      {/* Right Pane — Decision chain timeline */}
      <div className="flex-1 overflow-y-auto bg-canvas">
        {chainLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-text-tertiary animate-pulse">Loading chain...</div>
          </div>
        ) : chain ? (
          <div className="p-6 max-w-2xl">
            <h2 className="text-base font-semibold text-text-primary mb-6">Decision Chain</h2>

            {/* Vertical timeline */}
            <div className="relative">
              {/* Connecting line */}
              <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-white/10" />

              <div className="space-y-0">
                {chain.chain.map((item, idx) => (
                  <div key={idx} className="relative">
                    {/* Timeline node */}
                    <div className="flex gap-4 relative">
                      {/* Dot */}
                      <div className="flex-shrink-0 mt-4 relative z-10">
                        <div className="w-[10px] h-[10px] rounded-full bg-accent-blue ring-2 ring-canvas ml-[6px]" />
                      </div>

                      {/* Card */}
                      <div className="flex-1 bg-cards rounded-lg border border-white/5 p-4 mb-2">
                        {/* Badges row */}
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <KnowledgeTypeBadge type={item.node.type} />
                          <DivisionScopeBadge scope={item.division} />
                          {item.node.freshness_score != null && (
                            <FreshnessIndicator score={item.node.freshness_score} />
                          )}
                        </div>

                        {/* Date */}
                        {item.node.created_at && (
                          <div className="flex items-center gap-1 mb-1.5">
                            <Calendar size={11} className="text-text-tertiary" />
                            <span className="text-[11px] text-text-tertiary">
                              {formatDate(item.node.created_at)}
                            </span>
                          </div>
                        )}

                        {/* Content */}
                        <p className="text-sm font-medium text-text-primary leading-snug mb-1">
                          {item.node.label}
                        </p>
                        {item.node.content && item.node.content !== item.node.label && (
                          <p className="text-xs text-text-secondary leading-relaxed">
                            {item.node.content}
                          </p>
                        )}

                        {/* Source attribution */}
                        {item.node.source_type && (
                          <p className="text-[11px] text-text-tertiary mt-2">
                            Source:{' '}
                            <span className="font-medium">
                              {item.node.source_type === 'ai_agent' ? 'AI Agent' : 'Human'}
                            </span>
                            {item.node.source_id && (
                              <span className="text-text-tertiary/70"> ({item.node.source_id})</span>
                            )}
                          </p>
                        )}

                        {/* Status tag */}
                        {item.node.status && (
                          <div className="mt-2">
                            <StatusTag status={item.node.status} />
                          </div>
                        )}

                        <div className="mt-2">
                          <FeedbackWidget nodeId={item.node.id} />
                        </div>
                      </div>
                    </div>

                    {/* Relationship label between nodes */}
                    {item.relationship_to_next && idx < chain.chain.length - 1 && (
                      <div className="flex items-center gap-2 ml-[22px] py-1.5">
                        <span className="text-[10px] italic text-text-tertiary/70 bg-canvas px-2 py-0.5 rounded-full border border-white/5">
                          {item.relationship_to_next}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Downstream Impact */}
            {Object.keys(downstreamByDivision).length > 0 && (
              <div className="mt-8 pt-6 border-t border-white/5">
                <h3 className="text-sm font-semibold text-text-primary mb-4">
                  Downstream Impact
                </h3>
                {Object.entries(downstreamByDivision).map(([division, nodes]) => (
                  <div key={division} className="mb-4">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-text-tertiary/70 mb-2">
                      {division}
                    </h4>
                    <div className="space-y-1.5">
                      {nodes.map(node => (
                        <div
                          key={node.id}
                          className="flex items-center gap-3 bg-cards rounded-lg border border-white/5 px-3 py-2"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-text-primary font-medium truncate">
                              {node.label}
                            </p>
                            {node.content && node.content !== node.label && (
                              <p className="text-[11px] text-text-tertiary truncate">
                                {node.content}
                              </p>
                            )}
                          </div>
                          {node.status && <StatusTag status={node.status} />}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Empty state */
          <div className="flex flex-col items-center justify-center h-full text-center">
            <GitBranch className="text-text-tertiary/30 mb-3" size={40} />
            <p className="text-sm text-text-tertiary">Select a decision to view its chain</p>
            <p className="text-xs text-text-tertiary/60 mt-1">
              Choose from the list on the left
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Decision Card component for left pane                             */
/* ------------------------------------------------------------------ */

interface DecisionCardProps {
  node: GraphNode
  isSelected: boolean
  onSelect: (id: string) => void
}

function DecisionCard({ node, isSelected, onSelect }: DecisionCardProps) {
  return (
    <button
      onClick={() => onSelect(node.id)}
      className={[
        'w-full text-left p-3 rounded-lg transition-all duration-200',
        isSelected
          ? 'bg-accent-blue/10 border-2 border-accent-blue/40 shadow-lg shadow-accent-blue/5'
          : 'bg-cards border border-white/5 hover:border-white/10 hover:bg-cards/80',
      ].join(' ')}
    >
      {/* Label — truncated to 2 lines */}
      <p className="text-sm text-text-primary font-medium leading-snug line-clamp-2">
        {node.label}
      </p>

      {/* Meta row */}
      <div className="flex items-center gap-2 mt-2 flex-wrap">
        <DivisionScopeBadge scope={node.division ?? 'Unknown'} />
        {node.created_at && (
          <span className="text-[10px] text-text-tertiary">{formatDate(node.created_at)}</span>
        )}
      </div>

      {/* Status + blast radius */}
      <div className="flex items-center gap-2 mt-1.5">
        {node.status && <StatusTag status={node.status} />}
        {node.blast_radius != null && node.blast_radius > 0 && (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-accent-orange/15 text-[10px] font-bold text-accent-orange">
            {node.blast_radius}
            <span className="font-normal text-accent-orange/70">blast</span>
          </span>
        )}
      </div>
    </button>
  )
}
