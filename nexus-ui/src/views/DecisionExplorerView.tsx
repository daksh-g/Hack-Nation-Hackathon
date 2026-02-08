import { useEffect, useState } from 'react'
import type { GraphNode, DecisionChain } from '../types/graph'
import { getDecisions, getDecisionChain } from '../lib/api'

export function DecisionExplorerView() {
  const [decisions, setDecisions] = useState<GraphNode[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [chain, setChain] = useState<DecisionChain | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDecisions()
      .then(data => {
        const all = [...(data.cross_division || []), ...Object.values(data.by_division || {}).flat()]
        setDecisions(all)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedId) return
    getDecisionChain(selectedId).then(setChain).catch(console.error)
  }, [selectedId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-text-tertiary animate-pulse">Loading decisions...</div>
      </div>
    )
  }

  return (
    <div className="flex h-full">
      <div className="w-80 border-r border-white/5 overflow-y-auto p-4">
        <h2 className="text-sm font-semibold text-text-secondary mb-3">Decisions</h2>
        <div className="space-y-2">
          {decisions.map(d => (
            <button
              key={d.id}
              onClick={() => setSelectedId(d.id)}
              className={`w-full text-left p-3 rounded-lg transition-colors ${
                selectedId === d.id
                  ? 'bg-accent-blue/20 border border-accent-blue/30'
                  : 'bg-cards border border-white/5 hover:border-white/10'
              }`}
            >
              <p className="text-sm text-text-primary font-medium">{d.label}</p>
              <p className="text-xs text-text-tertiary mt-1">{d.division || 'Unknown'}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 p-6 overflow-y-auto">
        {chain ? (
          <div className="max-w-xl">
            <h2 className="text-lg font-semibold text-text-primary mb-6">Decision Chain</h2>
            <div className="space-y-4">
              {chain.chain.map((item, idx) => (
                <div key={idx} className="relative pl-6 border-l-2 border-white/10 pb-4">
                  <div className="absolute left-[-5px] top-0 w-2 h-2 rounded-full bg-accent-blue" />
                  <div className="bg-cards rounded-lg p-3 border border-white/5">
                    <p className="text-sm text-text-primary">{item.node.label}</p>
                    <p className="text-xs text-text-tertiary mt-1">{item.node.type} — {item.division}</p>
                  </div>
                  {item.relationship_to_next && (
                    <p className="text-xs text-text-tertiary mt-2 ml-2">{item.relationship_to_next}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-text-tertiary">
            Select a decision to view its chain
          </div>
        )}
      </div>
    </div>
  )
}
