import { useCallback, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Sparkles, ArrowRight, Zap } from 'lucide-react'
import type { AskResponse } from '../types/graph'
import { askNexus } from '../lib/api'
import { streamPost } from '../lib/sse'
import { DivisionScopeBadge, FeedbackWidget } from '../components/shared'

const SUGGESTED_QUERIES = [
  'What changed today?',
  'Is anything about to go wrong?',
  'Why did we switch pricing?',
  'Who should be in the payments review?',
  'What is Atlas-Code working on?',
]

const TYPE_COLORS: Record<string, string> = {
  contradiction: 'border-l-accent-red',
  staleness: 'border-l-accent-amber',
  silo: 'border-l-agent-violet',
  overload: 'border-l-accent-orange',
  drift: 'border-l-agent-cyan',
  answer: 'border-l-accent-blue',
}

const TYPE_BADGE_COLORS: Record<string, string> = {
  contradiction: 'bg-accent-red/20 text-accent-red',
  staleness: 'bg-accent-amber/20 text-accent-amber',
  silo: 'bg-agent-violet/20 text-agent-violet',
  overload: 'bg-accent-orange/20 text-accent-orange',
  drift: 'bg-agent-cyan/20 text-agent-cyan',
  answer: 'bg-accent-blue/20 text-accent-blue',
}

function LoadingDots() {
  return (
    <div className="flex items-center justify-center gap-1.5 py-12">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="w-2 h-2 rounded-full bg-accent-blue animate-pulse"
          style={{ animationDelay: `${i * 200}ms` }}
        />
      ))}
    </div>
  )
}

export function AskNexusView() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [response, setResponse] = useState<AskResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [streamText, setStreamText] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [useStream, setUseStream] = useState(false)
  const streamTextRef = useRef('')

  const handleSubmit = useCallback(
    async (q?: string) => {
      const text = q ?? query
      if (!text.trim()) return
      setLoading(true)
      setResponse(null)
      setStreamText('')
      streamTextRef.current = ''

      if (useStream) {
        setIsStreaming(true)
        try {
          await streamPost('/api/ask', { query: text, stream: true }, {
            onToken: (token) => {
              streamTextRef.current += token
              setStreamText(streamTextRef.current)
            },
            onDone: () => {
              setIsStreaming(false)
              setLoading(false)
            },
            onError: (err) => {
              console.error('Stream error:', err)
              setIsStreaming(false)
              setLoading(false)
            },
          })
        } catch (err) {
          console.error('Stream failed:', err)
          setIsStreaming(false)
          setLoading(false)
        }
      } else {
        try {
          const res = await askNexus(text)
          setResponse(res)
        } catch (err) {
          console.error('Ask failed:', err)
        }
        setLoading(false)
      }
    },
    [query, useStream]
  )

  const handleChipClick = useCallback(
    (sq: string) => {
      setQuery(sq)
      void handleSubmit(sq)
    },
    [handleSubmit]
  )

  return (
    <div className="p-6 overflow-y-auto h-full">
      <div className="max-w-2xl mx-auto pt-8">
        {/* Title area */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <Sparkles className="text-accent-blue" size={20} />
            <h1 className="text-lg font-semibold text-text-primary">Ask NEXUS</h1>
          </div>
          <p className="text-sm text-text-tertiary">
            Query the organizational knowledge graph
          </p>
        </div>

        {/* Search input */}
        <div className="relative mb-4">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none"
            size={20}
          />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') void handleSubmit()
            }}
            placeholder="Ask NEXUS anything..."
            className="w-full h-12 pl-12 pr-4 bg-cards rounded-lg border border-white/10 text-text-primary placeholder:text-text-tertiary outline-none focus:border-accent-blue/50 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.15)] transition-all duration-200"
          />
        </div>

        {/* Stream toggle */}
        <div className="flex items-center justify-end gap-2 mb-6">
          <button
            onClick={() => setUseStream(!useStream)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
              useStream
                ? 'bg-accent-blue/20 text-accent-blue border border-accent-blue/30'
                : 'bg-white/5 text-text-tertiary border border-white/10 hover:border-white/20'
            }`}
          >
            <Zap size={12} />
            {useStream ? 'Streaming On' : 'Streaming Off'}
          </button>
        </div>

        {/* Suggested queries */}
        {!response && !loading && (
          <div className="flex flex-wrap gap-2 mb-10 justify-center">
            {SUGGESTED_QUERIES.map(sq => (
              <button
                key={sq}
                onClick={() => handleChipClick(sq)}
                className="px-4 py-2 rounded-full border border-white/10 text-xs text-text-secondary hover:border-accent-blue/40 hover:text-accent-blue transition-all duration-200 hover:shadow-[0_0_0_1px_rgba(59,130,246,0.2)]"
              >
                {sq}
              </button>
            ))}
          </div>
        )}

        {/* Loading state */}
        {loading && !isStreaming && <LoadingDots />}

        {/* Streaming response */}
        {(isStreaming || streamText) && !response && (
          <div className="bg-cards rounded-lg border border-white/5 border-l-[3px] border-l-accent-blue p-5 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={14} className="text-accent-blue" />
              <span className="text-xs font-semibold text-accent-blue uppercase tracking-wider">
                LLM Response
              </span>
              {isStreaming && (
                <span className="w-1.5 h-1.5 rounded-full bg-accent-blue animate-pulse" />
              )}
            </div>
            <div className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
              {streamText}
              {isStreaming && (
                <span className="inline-block w-0.5 h-4 bg-accent-blue ml-0.5 animate-pulse align-middle" />
              )}
            </div>
          </div>
        )}

        {/* Response */}
        {response && (
          <div className="space-y-4">
            {/* Highlight on Pulse View button */}
            {response.highlight_node_ids.length > 0 && (
              <button
                onClick={() =>
                  navigate(`/pulse?highlight=${response.highlight_node_ids.join(',')}`)
                }
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-accent-blue/10 border border-accent-blue/20 text-accent-blue text-sm font-medium hover:bg-accent-blue/20 transition-colors"
              >
                <Sparkles size={14} />
                Highlight on Pulse View
                <ArrowRight size={14} />
              </button>
            )}

            {/* Response items as numbered cards */}
            {response.items.map((item, idx) => {
              const borderColor = TYPE_COLORS[item.type] ?? 'border-l-text-tertiary'
              const badgeColor =
                TYPE_BADGE_COLORS[item.type] ?? 'bg-text-tertiary/20 text-text-tertiary'
              return (
                <div
                  key={idx}
                  className={`bg-cards rounded-lg border border-white/5 border-l-[3px] ${borderColor} p-4`}
                >
                  {/* Header */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-white/10 text-[10px] font-bold text-text-tertiary flex-shrink-0">
                      {idx + 1}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${badgeColor}`}
                    >
                      {item.type}
                    </span>
                    <DivisionScopeBadge scope={item.division} />
                  </div>

                  {/* Headline */}
                  <h3 className="text-sm font-semibold text-text-primary mb-1 leading-snug">
                    {item.headline}
                  </h3>

                  {/* Detail */}
                  <p className="text-sm text-text-secondary leading-relaxed mb-3">
                    {item.detail}
                  </p>

                  {/* Action buttons + Feedback */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {item.actions.map((action, actionIdx) => (
                      <button
                        key={actionIdx}
                        onClick={() => navigate(action.route)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-accent-blue/10 text-accent-blue text-xs font-medium hover:bg-accent-blue/20 transition-colors"
                      >
                        {action.label}
                        <ArrowRight size={12} />
                      </button>
                    ))}
                    <div className="ml-auto">
                      <FeedbackWidget nodeId={`ask-${idx}`} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
