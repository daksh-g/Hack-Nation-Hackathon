const typeColors: Record<string, string> = {
  decision: 'bg-accent-blue/20 text-accent-blue',
  fact: 'bg-accent-green/20 text-accent-green',
  commitment: 'bg-accent-amber/20 text-accent-amber',
  question: 'bg-agent-violet/20 text-agent-violet',
}

interface KnowledgeTypeBadgeProps {
  type: string
}

export function KnowledgeTypeBadge({ type }: KnowledgeTypeBadgeProps) {
  const color = typeColors[type] || 'bg-text-tertiary/20 text-text-tertiary'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider ${color}`}>
      {type}
    </span>
  )
}
