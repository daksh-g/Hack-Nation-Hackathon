import { Globe, MapPin } from 'lucide-react'

const scopeColors: Record<string, { bg: string; text: string }> = {
  NA:               { bg: 'bg-accent-blue/15',   text: 'text-accent-blue' },
  EMEA:             { bg: 'bg-accent-green/15',   text: 'text-accent-green' },
  APAC:             { bg: 'bg-accent-amber/15',   text: 'text-accent-amber' },
  HQ:               { bg: 'bg-agent-violet/15',   text: 'text-agent-violet' },
  'cross-division': { bg: 'bg-accent-red/15',     text: 'text-accent-red' },
  ENTERPRISE:       { bg: 'bg-accent-orange/15',  text: 'text-accent-orange' },
}

const fallback = { bg: 'bg-text-tertiary/15', text: 'text-text-tertiary' }

interface DivisionScopeBadgeProps {
  scope: string
}

export function DivisionScopeBadge({ scope }: DivisionScopeBadgeProps) {
  const c = scopeColors[scope] ?? fallback
  const isCross = scope === 'cross-division' || scope === 'ENTERPRISE'
  const Icon = isCross ? Globe : MapPin
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium',
        'border border-white/5',
        c.bg,
        c.text,
      ].join(' ')}
    >
      <Icon size={11} />
      {scope}
    </span>
  )
}
