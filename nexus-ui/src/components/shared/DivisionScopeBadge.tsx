const scopeColors: Record<string, string> = {
  NA: 'bg-accent-blue/20 text-accent-blue',
  EMEA: 'bg-accent-green/20 text-accent-green',
  APAC: 'bg-accent-amber/20 text-accent-amber',
  HQ: 'bg-agent-violet/20 text-agent-violet',
  'cross-division': 'bg-accent-red/20 text-accent-red',
  ENTERPRISE: 'bg-accent-orange/20 text-accent-orange',
}

interface DivisionScopeBadgeProps {
  scope: string
}

export function DivisionScopeBadge({ scope }: DivisionScopeBadgeProps) {
  const color = scopeColors[scope] || 'bg-text-tertiary/20 text-text-tertiary'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${color}`}>
      {scope}
    </span>
  )
}
