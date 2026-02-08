const colors: Record<string, { bg: string; text: string; dot: string }> = {
  'on-track':   { bg: 'bg-accent-green/15', text: 'text-accent-green', dot: 'bg-accent-green' },
  'at-risk':    { bg: 'bg-accent-amber/15', text: 'text-accent-amber', dot: 'bg-accent-amber' },
  overdue:      { bg: 'bg-accent-red/15',   text: 'text-accent-red',   dot: 'bg-accent-red' },
  blocked:      { bg: 'bg-accent-red/15',   text: 'text-accent-red',   dot: 'bg-accent-red' },
  active:       { bg: 'bg-accent-blue/15',  text: 'text-accent-blue',  dot: 'bg-accent-blue' },
  superseded:   { bg: 'bg-text-tertiary/15', text: 'text-text-tertiary', dot: 'bg-text-tertiary' },
  resolved:     { bg: 'bg-accent-green/15', text: 'text-accent-green', dot: 'bg-accent-green' },
}

const fallback = { bg: 'bg-text-tertiary/15', text: 'text-text-tertiary', dot: 'bg-text-tertiary' }

interface StatusTagProps {
  status: string
}

export function StatusTag({ status }: StatusTagProps) {
  const c = colors[status] ?? fallback
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium',
        'border border-white/5',
        c.bg,
        c.text,
      ].join(' ')}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {status.replace(/-/g, ' ').replace(/_/g, ' ')}
    </span>
  )
}
