import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Mic, Sun, Shield, GitBranch, Users, Sparkles } from 'lucide-react'
import { useVoiceInput } from '../hooks/useVoiceInput'
import { ReasoningTrace } from './shared/ReasoningTrace'
import { streamPost, simulateStream } from '../lib/sse'

// ── Constants ────────────────────────────────────────────────────────────────

const FALLBACK_RESPONSE = `Based on NEXUS analysis of 87 nodes and 243 relationships:\n\n**Key Findings:**\n1. Pricing contradiction detected between Sarah Chen ($20/seat) and Nova-Sales ($15/seat) — estimated $30K ARR impact\n2. EMEA billing migration blocked pending Catherine Moore's architecture review\n3. Atlas-Code operating at supervised trust level — 2 production deploys awaiting human review\n\n**Recommended Actions:**\n- Resolve pricing contradiction (high urgency)\n- Unblock EMEA billing decision\n- Review Atlas-Code trust level escalation`

type Intent = 'briefing' | 'immune' | 'workforce' | 'ask'

interface HistoryEntry {
  query: string
  intent: Intent
}

const INTENT_ROUTES: Record<Exclude<Intent, 'ask'>, string> = {
  briefing: '/briefing',
  immune: '/immune',
  workforce: '/people',
}

const REASONING_STEPS_BY_INTENT: Record<Intent, { label: string; detail?: string }[]> = {
  briefing: [
    { label: 'Scanning organizational graph', detail: '87 nodes' },
    { label: 'Aggregating overnight changes', detail: '12 updates' },
    { label: 'Prioritizing by relevance to your role' },
    { label: 'Generating morning briefing' },
  ],
  immune: [
    { label: 'Initializing immune sweep', detail: '6 agents' },
    { label: 'Checking contradiction vectors' },
    { label: 'Analyzing staleness & drift signals' },
    { label: 'Compiling health report' },
  ],
  workforce: [
    { label: 'Querying people graph', detail: '34 members' },
    { label: 'Calculating cognitive load scores' },
    { label: 'Mapping team dependencies' },
    { label: 'Preparing workforce overview' },
  ],
  ask: [
    { label: 'Parsing natural language query' },
    { label: 'Searching knowledge graph', detail: '243 edges' },
    { label: 'Cross-referencing contradictions' },
    { label: 'Synthesizing response' },
  ],
}

const QUICK_ACTIONS: { label: string; icon: typeof Sun; intent: Intent; route: string }[] = [
  { label: 'Morning Briefing', icon: Sun, intent: 'briefing', route: '/briefing' },
  { label: 'Run Immune Scan', icon: Shield, intent: 'immune', route: '/immune' },
  { label: 'What Changed?', icon: GitBranch, intent: 'ask', route: '/ask' },
  { label: 'Workforce Status', icon: Users, intent: 'workforce', route: '/people' },
]

// ── Helpers ──────────────────────────────────────────────────────────────────

function classifyIntent(query: string): Intent {
  const q = query.toLowerCase()
  if (/\b(brief|briefing|morning)\b/.test(q)) return 'briefing'
  if (/\b(scan|immune|health\s*check)\b/.test(q)) return 'immune'
  if (/\b(who|people|team|workforce)\b/.test(q)) return 'workforce'
  return 'ask'
}

// ── Component ────────────────────────────────────────────────────────────────

export function CommandBar() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [history, setHistory] = useState<HistoryEntry[]>([])

  // Reasoning + streaming state
  const [phase, setPhase] = useState<'idle' | 'reasoning' | 'streaming' | 'done'>('idle')
  const [activeIntent, setActiveIntent] = useState<Intent>('ask')
  const [streamText, setStreamText] = useState('')
  const streamTextRef = useRef('')
  const abortRef = useRef<AbortController | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Voice
  const { isListening, isSupported, startListening, stopListening } = useVoiceInput({
    onResult: (transcript) => {
      setQuery(transcript)
      handleSubmit(transcript)
    },
  })

  // ── Keyboard shortcuts ───────────────────────────────────────────────────

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
      if (e.key === 'Escape' && open) {
        e.preventDefault()
        handleClose()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Auto-focus input when opened
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  // ── Close & cleanup ──────────────────────────────────────────────────────

  const handleClose = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setOpen(false)
    setQuery('')
    setPhase('idle')
    setStreamText('')
    streamTextRef.current = ''
    if (isListening) stopListening()
  }, [isListening, stopListening])

  // ── Submit ───────────────────────────────────────────────────────────────

  const handleSubmit = useCallback(
    (q?: string) => {
      const text = (q ?? query).trim()
      if (!text) return

      const intent = classifyIntent(text)
      setActiveIntent(intent)
      setPhase('reasoning')
      setStreamText('')
      streamTextRef.current = ''

      // Push to history (last 5)
      setHistory((prev) => {
        const next = [{ query: text, intent }, ...prev]
        return next.slice(0, 5)
      })

      // Abort any previous in-flight request
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      if (intent !== 'ask') {
        // Navigate intents: show reasoning, then navigate after 1.5s
        setTimeout(() => {
          if (!controller.signal.aborted) {
            handleClose()
            navigate(INTENT_ROUTES[intent])
          }
        }, 1500)
      } else {
        // Ask intent: show reasoning, then stream response
        setTimeout(() => {
          if (controller.signal.aborted) return
          setPhase('streaming')

          streamPost(
            '/api/ask',
            { query: text, stream: true },
            {
              onToken: (token) => {
                streamTextRef.current += token
                setStreamText(streamTextRef.current)
              },
              onDone: () => {
                setPhase('done')
              },
              onError: () => {
                // Backend unavailable -- fall back to simulated stream
                simulateStream(FALLBACK_RESPONSE, {
                  onToken: (token) => {
                    streamTextRef.current += token
                    setStreamText(streamTextRef.current)
                  },
                  onDone: () => {
                    setPhase('done')
                  },
                }, 15, controller.signal)
              },
            },
            controller.signal,
          )
        }, 1200)
      }
    },
    [query, navigate, handleClose],
  )

  // ── Quick action click ───────────────────────────────────────────────────

  const handleQuickAction = useCallback(
    (action: (typeof QUICK_ACTIONS)[number]) => {
      if (action.intent === 'ask') {
        setQuery('What changed today?')
        handleSubmit('What changed today?')
      } else {
        setActiveIntent(action.intent)
        setPhase('reasoning')
        abortRef.current?.abort()
        const controller = new AbortController()
        abortRef.current = controller
        setTimeout(() => {
          if (!controller.signal.aborted) {
            handleClose()
            navigate(action.route)
          }
        }, 1500)
      }
    },
    [handleSubmit, handleClose, navigate],
  )

  // ── Mic toggle ───────────────────────────────────────────────────────────

  const toggleMic = useCallback(() => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }, [isListening, startListening, stopListening])

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/60"
            onClick={handleClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Modal */}
          <motion.div
            className="relative w-full max-w-2xl mx-4 backdrop-blur-xl bg-panels/90 border border-white/10 shadow-2xl rounded-2xl overflow-hidden"
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            {/* Input Row */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10">
              <Search size={18} className="text-text-tertiary flex-shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleSubmit()
                  }
                }}
                placeholder="Ask NEXUS anything... (Cmd+K)"
                className="flex-1 bg-transparent text-text-primary text-sm placeholder:text-text-tertiary outline-none"
              />
              <button
                onClick={toggleMic}
                disabled={!isSupported}
                title={!isSupported ? 'Voice not available' : isListening ? 'Stop listening' : 'Voice input'}
                className={`relative flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full transition-colors ${
                  !isSupported
                    ? 'text-text-tertiary/40 cursor-not-allowed'
                    : isListening
                      ? 'text-accent-red'
                      : 'text-text-tertiary hover:text-text-secondary hover:bg-white/5'
                }`}
              >
                {isListening && (
                  <span className="absolute inset-0 rounded-full border-2 border-accent-red animate-ping opacity-40" />
                )}
                <Mic size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-4 max-h-[60vh] overflow-y-auto">
              {/* Phase: Idle -- show quick actions or history */}
              {phase === 'idle' && (
                <>
                  {/* Quick Actions */}
                  {!query && (
                    <div>
                      <div className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-3">
                        Quick Actions
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {QUICK_ACTIONS.map((action) => (
                          <button
                            key={action.label}
                            onClick={() => handleQuickAction(action)}
                            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-cards border border-white/5 hover:border-accent-blue/30 hover:bg-accent-blue/5 transition-all duration-200 group"
                          >
                            <div className="w-8 h-8 rounded-lg bg-accent-blue/10 flex items-center justify-center group-hover:bg-accent-blue/20 transition-colors">
                              <action.icon size={16} className="text-accent-blue" />
                            </div>
                            <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors">
                              {action.label}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* History */}
                  {history.length > 0 && (
                    <div className={query ? '' : 'mt-4'}>
                      <div className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-2">
                        Recent
                      </div>
                      <div className="space-y-1">
                        {history.map((entry, i) => (
                          <button
                            key={`${entry.query}-${i}`}
                            onClick={() => {
                              setQuery(entry.query)
                              handleSubmit(entry.query)
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm text-text-secondary hover:bg-white/5 hover:text-text-primary transition-colors"
                          >
                            <Search size={13} className="text-text-tertiary flex-shrink-0" />
                            <span className="truncate">{entry.query}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Phase: Reasoning */}
              {(phase === 'reasoning' || phase === 'streaming' || phase === 'done') && (
                <ReasoningTrace
                  steps={REASONING_STEPS_BY_INTENT[activeIntent]}
                  staggerMs={280}
                  active={phase === 'reasoning'}
                  className="mb-4"
                />
              )}

              {/* Phase: Streaming / Done -- inline response */}
              {(phase === 'streaming' || phase === 'done') && (
                <div className="mt-4 bg-cards rounded-lg border border-white/5 border-l-[3px] border-l-accent-blue p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles size={14} className="text-accent-blue" />
                    <span className="text-xs font-semibold text-accent-blue uppercase tracking-wider">
                      NEXUS Response
                    </span>
                    {phase === 'streaming' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-accent-blue animate-pulse" />
                    )}
                  </div>
                  <div className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
                    {streamText}
                    {phase === 'streaming' && (
                      <span className="inline-block w-0.5 h-4 bg-accent-blue ml-0.5 animate-pulse align-middle" />
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer hint */}
            <div className="px-5 py-2.5 border-t border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3 text-[11px] text-text-tertiary">
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-mono">Enter</kbd>
                  to submit
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-mono">Esc</kbd>
                  to close
                </span>
              </div>
              <span className="text-[11px] text-agent-cyan font-mono">
                NEXUS v2.1
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
