import { ChevronRight, Home } from 'lucide-react'

interface BreadcrumbItem {
  id: string
  label: string
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
  onNavigate: (index: number) => void
}

export function Breadcrumb({ items, onNavigate }: BreadcrumbProps) {
  if (items.length === 0) return null

  return (
    <nav className="flex items-center gap-1 text-sm" aria-label="Breadcrumb">
      <Home size={13} className="text-text-tertiary mr-0.5 shrink-0" />
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1
        return (
          <span key={item.id} className="flex items-center gap-1 min-w-0">
            {idx > 0 && (
              <ChevronRight size={13} className="text-text-tertiary/60 shrink-0" />
            )}
            <button
              onClick={() => onNavigate(idx)}
              className={[
                'truncate max-w-[160px] transition-colors duration-150 rounded px-1.5 py-0.5',
                isLast
                  ? 'text-text-primary font-medium bg-white/5'
                  : 'text-text-tertiary hover:text-accent-blue hover:bg-white/5',
              ].join(' ')}
            >
              {item.label}
            </button>
          </span>
        )
      })}
    </nav>
  )
}
