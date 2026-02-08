import { useLocation } from 'react-router-dom'

const viewTitles: Record<string, string> = {
  '/pulse': 'Pulse View',
  '/alerts': 'Alerts',
  '/ask': 'Ask NEXUS',
  '/decisions': 'Decision Explorer',
}

export function TopBar() {
  const location = useLocation()
  const title = viewTitles[location.pathname] || 'NEXUS'

  return (
    <header className="h-12 bg-sidebar border-b border-white/5 flex items-center px-4 gap-4">
      <h1 className="text-sm font-semibold text-text-primary">{title}</h1>
      <div className="flex-1" />
      <span className="text-xs text-text-tertiary font-mono">Meridian Technologies</span>
    </header>
  )
}
