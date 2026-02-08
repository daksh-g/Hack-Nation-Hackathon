interface StatsStripProps {
  items: { label: string; value: number | string }[]
}

export function StatsStrip({ items }: StatsStripProps) {
  return (
    <div className="flex items-center gap-4 text-xs text-text-tertiary">
      {items.map((item, idx) => (
        <span key={idx}>
          <span className="text-text-secondary font-medium">{item.value}</span> {item.label}
        </span>
      ))}
    </div>
  )
}
