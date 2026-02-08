import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Activity, AlertTriangle, MessageSquare, GitBranch, Settings } from 'lucide-react'
import { getAlerts } from '../../lib/api'

const navItems = [
  { path: '/pulse', icon: Activity, label: 'Pulse' },
  { path: '/alerts', icon: AlertTriangle, label: 'Alerts' },
  { path: '/ask', icon: MessageSquare, label: 'Ask NEXUS' },
  { path: '/decisions', icon: GitBranch, label: 'Decisions' },
]

export function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const [alertCount, setAlertCount] = useState(0)

  useEffect(() => {
    getAlerts()
      .then(data => {
        const unresolved = data.alerts.filter(a => !a.resolved)
        setAlertCount(unresolved.length)
      })
      .catch(() => setAlertCount(0))
  }, [])

  return (
    <aside className="w-16 bg-sidebar flex flex-col items-center py-4 border-r border-white/5">
      {/* NEXUS Logo */}
      <div className="w-9 h-9 rounded-lg bg-accent-blue/20 flex items-center justify-center mb-6 cursor-default select-none">
        <span className="text-accent-blue font-bold text-sm tracking-tight">N</span>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col items-center gap-1 flex-1">
        {navItems.map(({ path, icon: Icon, label }) => {
          const active = location.pathname === path
          const isAlerts = path === '/alerts'
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              title={label}
              className={[
                'relative w-10 h-10 rounded-lg flex items-center justify-center',
                'transition-all duration-200 ease-out',
                active
                  ? 'bg-accent-blue/20 text-accent-blue shadow-[inset_0_0_0_1px_rgba(59,130,246,0.3)]'
                  : 'text-text-tertiary hover:text-text-secondary hover:bg-white/5',
              ].join(' ')}
            >
              <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
              {isAlerts && alertCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-accent-red text-white text-[10px] font-bold flex items-center justify-center leading-none">
                  {alertCount > 9 ? '9+' : alertCount}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Settings (decorative) */}
      <button
        title="Settings"
        className="w-10 h-10 rounded-lg flex items-center justify-center text-text-tertiary/50 cursor-default"
      >
        <Settings size={18} strokeWidth={1.5} />
      </button>
    </aside>
  )
}
