import { useState } from 'react'
import { Send } from 'lucide-react'
import { infoDrop } from '../../lib/api'

interface InfoDropProps {
  onRipple?: (nodeId: string) => void
}

export function InfoDrop({ onRipple }: InfoDropProps) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!text.trim()) return
    setLoading(true)
    try {
      const res = await infoDrop(text)
      onRipple?.(res.ripple_target)
      setText('')
    } catch (e) {
      console.error('Info Drop failed:', e)
    }
    setLoading(false)
  }

  return (
    <div className="absolute bottom-4 left-4 w-64 bg-panels/90 backdrop-blur-sm rounded-lg border border-white/10 p-3">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Drop info into NEXUS..."
        className="w-full bg-transparent text-sm text-text-primary resize-none outline-none placeholder:text-text-tertiary"
        rows={3}
      />
      <button
        onClick={handleSubmit}
        disabled={loading || !text.trim()}
        className="mt-2 w-full flex items-center justify-center gap-2 py-1.5 rounded bg-accent-blue/20 text-accent-blue text-sm hover:bg-accent-blue/30 transition-colors disabled:opacity-50"
      >
        <Send size={14} />
        {loading ? 'Processing...' : 'Drop'}
      </button>
    </div>
  )
}
