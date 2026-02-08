import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Command } from 'lucide-react'
import { StatsStrip } from '../shared/StatsStrip'
import { getGraph, getAlerts } from '../../lib/api'

const viewTitles: Record<string, string> = {
  '/pulse': 'Pulse View',
  '/alerts': 'Alerts',
  '/ask': 'Ask NEXUS',
  '/decisions': 'Decision Explorer',
  '/briefing': 'Morning Briefing',
  '/immune': 'Immune Scan',
  '/people': 'People & Workforce',
  '/tasks': 'Task Graph',
}

export function TopBar() {
  const location = useLocation()
  const title = viewTitles[location.pathname] || 'NEXUS'
  const [stats, setStats] = useState([
    { label: 'nodes', value: 0 },
    { label: 'edges', value: 0 },
    { label: 'alerts', value: 0 },
  ])

  useEffect(() => {
    Promise.all([getGraph(), getAlerts()]).then(([graph, alertData]) => {
      setStats([
        { label: 'nodes', value: graph.nodes.length },
        { label: 'edges', value: graph.edges.length },
        { label: 'alerts', value: alertData.alerts.filter(a => !a.resolved).length },
      ])
    }).catch(() => {})
  }, [])

  return (
    <header className="h-12 bg-sidebar border-b border-white/10 flex items-center px-4 gap-4 shrink-0">
      {/* Left: View title */}
      <h1 className="text-sm font-semibold text-text-primary whitespace-nowrap">{title}</h1>

      {/* Cmd+K hint */}
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition-colors"
        onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
      >
        <Command size={11} className="text-text-tertiary" />
        <span className="text-[11px] text-text-tertiary font-mono">K</span>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right: Stats strip */}
      <StatsStrip items={stats} />

      {/* Divider */}
      <div className="w-px h-5 bg-white/10" />

      {/* Company name + live indicator */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-text-tertiary font-mono whitespace-nowrap">Meridian Technologies</span>
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-green opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-green" />
        </span>
      </div>
    </header>
  )
}
