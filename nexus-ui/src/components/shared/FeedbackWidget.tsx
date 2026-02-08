import { useState } from 'react'
import { ThumbsUp, ThumbsDown } from 'lucide-react'
import { submitFeedback } from '../../lib/api'

interface FeedbackWidgetProps {
  nodeId: string
}

export function FeedbackWidget({ nodeId }: FeedbackWidgetProps) {
  const [submitted, setSubmitted] = useState<boolean | null>(null)

  const handleFeedback = async (useful: boolean) => {
    setSubmitted(useful)
    await submitFeedback(nodeId, useful)
  }

  if (submitted !== null) {
    return (
      <span className="text-xs text-text-tertiary">
        {submitted ? 'Marked useful' : 'Marked not useful'}
      </span>
    )
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => handleFeedback(true)}
        className="p-1 rounded hover:bg-white/10 text-text-tertiary hover:text-accent-green transition-colors"
        title="Useful"
      >
        <ThumbsUp size={14} />
      </button>
      <button
        onClick={() => handleFeedback(false)}
        className="p-1 rounded hover:bg-white/10 text-text-tertiary hover:text-accent-red transition-colors"
        title="Not useful"
      >
        <ThumbsDown size={14} />
      </button>
    </div>
  )
}
