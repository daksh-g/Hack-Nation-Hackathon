import { GitBranch, BookOpen, Handshake, HelpCircle } from 'lucide-react'

const typeConfig: Record<string, { bg: string; text: string }> = {
  decision:   { bg: 'bg-accent-blue/15',   text: 'text-accent-blue' },
  fact:       { bg: 'bg-accent-green/15',   text: 'text-accent-green' },
  commitment: { bg: 'bg-accent-amber/15',   text: 'text-accent-amber' },
  question:   { bg: 'bg-agent-violet/15',   text: 'text-agent-violet' },
}

const fallbackConfig = { bg: 'bg-text-tertiary/15', text: 'text-text-tertiary' }

function TypeIcon({ type, size }: { type: string; size: number }) {
  switch (type) {
    case 'decision': return <GitBranch size={size} />
    case 'fact': return <BookOpen size={size} />
    case 'commitment': return <Handshake size={size} />
    case 'question': return <HelpCircle size={size} />
    default: return <BookOpen size={size} />
  }
}

interface KnowledgeTypeBadgeProps {
  type: string
}

export function KnowledgeTypeBadge({ type }: KnowledgeTypeBadgeProps) {
  const config = typeConfig[type] ?? fallbackConfig
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider',
        'border border-white/5',
        config.bg,
        config.text,
      ].join(' ')}
    >
      <TypeIcon type={type} size={12} />
      {type}
    </span>
  )
}
