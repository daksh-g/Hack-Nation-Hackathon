const colors: Record<string, string> = {
  'on-track': 'bg-accent-green/20 text-accent-green',
  'at-risk': 'bg-accent-amber/20 text-accent-amber',
  overdue: 'bg-accent-red/20 text-accent-red',
  blocked: 'bg-accent-red/20 text-accent-red',
  active: 'bg-accent-blue/20 text-accent-blue',
  superseded: 'bg-text-tertiary/20 text-text-tertiary',
  resolved: 'bg-accent-green/20 text-accent-green',
}

interface StatusTagProps {
  status: string
}

export function StatusTag({ status }: StatusTagProps) {
  const color = colors[status] || 'bg-text-tertiary/20 text-text-tertiary'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${color}`}>
      {status}
    </span>
  )
}
