import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, Loader2 } from 'lucide-react'

export interface ReasoningStep {
  label: string
  detail?: string
}

interface ReasoningTraceProps {
  steps: ReasoningStep[]
  /** Auto-advance through steps at this interval (ms). 0 = show all at once */
  staggerMs?: number
  /** Whether the trace is actively running */
  active?: boolean
  className?: string
}

export function ReasoningTrace({ steps, staggerMs = 400, active = true, className = '' }: ReasoningTraceProps) {
  const [visibleCount, setVisibleCount] = useState(active ? 0 : steps.length)

  useEffect(() => {
    if (!active || staggerMs === 0) {
      setVisibleCount(steps.length)
      return
    }

    setVisibleCount(0)
    let current = 0
    const interval = setInterval(() => {
      current++
      setVisibleCount(current)
      if (current >= steps.length) clearInterval(interval)
    }, staggerMs)

    return () => clearInterval(interval)
  }, [steps, staggerMs, active])

  return (
    <div className={`space-y-1 ${className}`}>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-1.5 h-1.5 rounded-full bg-agent-cyan animate-pulse" />
        <span className="text-[11px] font-semibold text-agent-cyan uppercase tracking-wider font-mono">
          NEXUS Reasoning
        </span>
      </div>
      <AnimatePresence>
        {steps.slice(0, visibleCount).map((step, i) => {
          const isComplete = i < visibleCount - 1 || visibleCount >= steps.length
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-2 py-0.5"
            >
              {isComplete ? (
                <CheckCircle size={13} className="text-accent-green flex-shrink-0" />
              ) : (
                <Loader2 size={13} className="text-agent-cyan flex-shrink-0 animate-spin" />
              )}
              <span className={`text-xs ${isComplete ? 'text-text-secondary' : 'text-text-primary font-medium'}`}>
                {step.label}
              </span>
              {step.detail && (
                <span className="text-[11px] text-text-tertiary font-mono ml-auto">
                  {step.detail}
                </span>
              )}
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
