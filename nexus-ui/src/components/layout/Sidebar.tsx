import { useLocation, useNavigate } from 'react-router-dom'
import { Activity, AlertTriangle, MessageSquare, GitBranch } from 'lucide-react'

const navItems = [
  { path: '/pulse', icon: Activity, label: 'Pulse' },
  { path: '/alerts', icon: AlertTriangle, label: 'Alerts' },
  { path: '/ask', icon: MessageSquare, label: 'Ask NEXUS' },
  { path: '/decisions', icon: GitBranch, label: 'Decisions' },
]

export function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <aside className="w-16 bg-sidebar flex flex-col items-center py-4 gap-2 border-r border-white/5">
      <div className="w-9 h-9 rounded-lg bg-accent-blue/20 flex items-center justify-center mb-4">
        <span className="text-accent-blue font-bold text-sm">N</span>
      </div>
      {navItems.map(({ path, icon: Icon, label }) => {
        const active = location.pathname === path
        return (
          <button
            key={path}
            onClick={() => navigate(path)}
            title={label}
            className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
              active
                ? 'bg-accent-blue/20 text-accent-blue'
                : 'text-text-tertiary hover:text-text-secondary hover:bg-white/5'
            }`}
          >
            <Icon size={20} />
          </button>
        )
      })}
    </aside>
  )
}
