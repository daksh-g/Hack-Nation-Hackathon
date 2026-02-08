interface StatsStripProps {
  items: { label: string; value: number | string }[]
}

export function StatsStrip({ items }: StatsStripProps) {
  return (
    <div className="flex items-center gap-3 text-xs">
      {items.map((item, idx) => (
        <div key={idx} className="flex items-center gap-1.5">
          {idx > 0 && <span className="w-px h-3 bg-white/10" />}
          <span className="text-text-primary font-semibold font-mono tabular-nums">{item.value}</span>
          <span className="text-text-tertiary">{item.label}</span>
        </div>
      ))}
    </div>
  )
}
