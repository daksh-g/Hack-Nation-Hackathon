import { useState, useRef, useEffect } from 'react'
import { ThumbsUp, ThumbsDown, Check, ChevronDown } from 'lucide-react'
import { submitFeedback } from '../../lib/api'

const negativeReasons = ['Incorrect', 'Outdated', 'Irrelevant', 'Missing context']

interface FeedbackWidgetProps {
  nodeId: string
}

export function FeedbackWidget({ nodeId }: FeedbackWidgetProps) {
  const [submitted, setSubmitted] = useState<boolean | null>(null)
  const [showReasons, setShowReasons] = useState(false)
  const [selectedReason, setSelectedReason] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    if (!showReasons) return
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowReasons(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showReasons])

  const handlePositive = async () => {
    setSubmitted(true)
    await submitFeedback(nodeId, true)
  }

  const handleNegative = () => {
    setSubmitted(false)
    setShowReasons(true)
  }

  const handleReasonSelect = async (reason: string) => {
    setSelectedReason(reason)
    setShowReasons(false)
    await submitFeedback(nodeId, false, reason)
  }

  // After positive feedback: "Thanks!" confirmation
  if (submitted === true) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-accent-green">
        <Check size={14} />
        Thanks!
      </span>
    )
  }

  // After negative feedback with reason selected
  if (submitted === false && selectedReason) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-text-tertiary">
        <Check size={14} />
        Feedback recorded
      </span>
    )
  }

  // After negative click but reason not yet selected: show dropdown
  if (submitted === false && showReasons) {
    return (
      <div ref={dropdownRef} className="relative">
        <div className="flex items-center gap-1 text-xs text-text-tertiary mb-1">
          <ThumbsDown size={12} className="text-accent-red" />
          <span>What was the issue?</span>
          <ChevronDown size={12} />
        </div>
        <div className="absolute top-full left-0 mt-1 w-40 bg-cards rounded-lg border border-white/10 shadow-xl overflow-hidden z-10">
          {negativeReasons.map(reason => (
            <button
              key={reason}
              onClick={() => handleReasonSelect(reason)}
              className="w-full text-left px-3 py-2 text-xs text-text-secondary hover:bg-white/5 hover:text-text-primary transition-colors"
            >
              {reason}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={handlePositive}
        className="p-1.5 rounded-md hover:bg-accent-green/10 text-text-tertiary hover:text-accent-green transition-all duration-150"
        title="Useful"
      >
        <ThumbsUp size={14} />
      </button>
      <button
        onClick={handleNegative}
        className="p-1.5 rounded-md hover:bg-accent-red/10 text-text-tertiary hover:text-accent-red transition-all duration-150"
        title="Not useful"
      >
        <ThumbsDown size={14} />
      </button>
    </div>
  )
}
