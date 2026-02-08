import { ChevronRight } from 'lucide-react'

interface BreadcrumbItem {
  id: string
  label: string
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
  onNavigate: (index: number) => void
}

export function Breadcrumb({ items, onNavigate }: BreadcrumbProps) {
  return (
    <nav className="flex items-center gap-1 text-sm">
      {items.map((item, idx) => (
        <span key={item.id} className="flex items-center gap-1">
          {idx > 0 && <ChevronRight size={14} className="text-text-tertiary" />}
          <button
            onClick={() => onNavigate(idx)}
            className={`hover:text-accent-blue transition-colors ${
              idx === items.length - 1
                ? 'text-text-primary font-medium'
                : 'text-text-tertiary'
            }`}
          >
            {item.label}
          </button>
        </span>
      ))}
    </nav>
  )
}
