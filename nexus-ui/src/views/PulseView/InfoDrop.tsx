import { useState, useCallback } from 'react'
import { Send, Zap } from 'lucide-react'
import { infoDrop } from '../../lib/api'

interface InfoDropProps {
  onRipple?: (nodeId: string) => void
}

export function InfoDrop({ onRipple }: InfoDropProps) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [lastResult, setLastResult] = useState<string | null>(null)

  const handleSubmit = useCallback(async () => {
    if (!text.trim()) return
    setLoading(true)
    setLastResult(null)
    try {
      const res = await infoDrop(text)
      onRipple?.(res.ripple_target)
      setLastResult(`Classified as "${res.unit.type}" — ripple sent`)
      setText('')
    } catch (e) {
      console.error('Info Drop failed:', e)
      setLastResult('Failed to process. Try again.')
    }
    setLoading(false)
  }, [text, onRipple])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      void handleSubmit()
    }
  }, [handleSubmit])

  return (
    <div className="absolute bottom-4 left-4 w-72 bg-panels/90 backdrop-blur-md rounded-xl border border-white/10 p-3 shadow-2xl shadow-black/30">
      <div className="flex items-center gap-2 mb-2">
        <Zap size={14} className="text-accent-blue" />
        <span className="text-xs font-medium text-text-secondary tracking-wide uppercase">Info Drop</span>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Drop info into NEXUS..."
        className="w-full bg-white/5 rounded-lg text-sm text-text-primary resize-none outline-none placeholder:text-text-tertiary p-2 border border-white/5 focus:border-accent-blue/30 transition-colors"
        rows={3}
      />
      {lastResult && (
        <p className="text-xs text-accent-blue/80 mt-1 mb-1">{lastResult}</p>
      )}
      <button
        onClick={() => void handleSubmit()}
        disabled={loading || !text.trim()}
        className="mt-2 w-full flex items-center justify-center gap-2 py-1.5 rounded-lg bg-accent-blue/20 text-accent-blue text-sm font-medium hover:bg-accent-blue/30 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Send size={14} />
        {loading ? 'Processing...' : 'Drop'}
      </button>
    </div>
  )
}
