import { useLocation, useNavigate } from 'react-router-dom'

const navItems = [
  { path: '/demo', label: 'Demo' },
  { path: '/pulse', label: 'Pulse' },
  { path: '/briefing', label: 'Briefing' },
  { path: '/alerts', label: 'Alerts' },
  { path: '/immune', label: 'Immune' },
  { path: '/ask', label: 'Ask' },
  { path: '/people', label: 'People' },
  { path: '/decisions', label: 'Decisions' },
  { path: '/tasks', label: 'Tasks' },
]

export function NavBubbles() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <div className="flex items-center justify-center gap-2 px-4 py-2 bg-sidebar border-b border-white/10">
      {navItems.map(({ path, label }) => {
        const active = location.pathname === path
        return (
          <button
            key={path}
            onClick={() => navigate(path)}
            className={[
              'px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200',
              active
                ? 'bg-accent-blue text-white shadow-lg shadow-accent-blue/25'
                : 'bg-white/5 text-text-secondary hover:bg-white/10 hover:text-text-primary border border-white/10',
            ].join(' ')}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
