import { useState } from 'react'
import { Search } from 'lucide-react'
import type { AskResponse } from '../types/graph'
import { askNexus } from '../lib/api'

const SUGGESTED_QUERIES = [
  'What changed today?',
  'Is anything about to go wrong?',
  'Why did we switch pricing?',
  'Who should be in the payments review?',
  'What is Atlas-Code working on?',
]

export function AskNexusView() {
  const [query, setQuery] = useState('')
  const [response, setResponse] = useState<AskResponse | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (q?: string) => {
    const text = q || query
    if (!text.trim()) return
    setLoading(true)
    setResponse(null)
    try {
      const res = await askNexus(text)
      setResponse(res)
    } catch (e) {
      console.error('Ask failed:', e)
    }
    setLoading(false)
  }

  return (
    <div className="p-6 overflow-y-auto h-full">
      <div className="max-w-2xl mx-auto">
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary" size={20} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="Ask NEXUS anything..."
            className="w-full h-12 pl-12 pr-4 bg-cards rounded-lg border border-white/10 text-text-primary placeholder:text-text-tertiary outline-none focus:border-accent-blue/50 transition-colors"
          />
        </div>

        <div className="flex flex-wrap gap-2 mb-8">
          {SUGGESTED_QUERIES.map(sq => (
            <button
              key={sq}
              onClick={() => { setQuery(sq); handleSubmit(sq) }}
              className="px-3 py-1.5 rounded-full bg-cards border border-white/10 text-xs text-text-secondary hover:border-accent-blue/50 hover:text-accent-blue transition-colors"
            >
              {sq}
            </button>
          ))}
        </div>

        {loading && (
          <div className="text-center text-text-tertiary animate-pulse">Thinking...</div>
        )}

        {response && (
          <div className="space-y-3">
            {response.items.map((item, idx) => (
              <div key={idx} className="bg-cards rounded-lg p-4 border border-white/5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-accent-blue/20 text-accent-blue">
                    {item.type}
                  </span>
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-white/10 text-text-tertiary">
                    {item.division}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-text-primary mb-1">{item.headline}</h3>
                <p className="text-sm text-text-secondary">{item.detail}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
