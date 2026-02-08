interface CognitiveLoadBarProps {
  load: number // 0-100
}

function getLoadColor(load: number): string {
  if (load < 40) return 'bg-accent-green'
  if (load < 65) return 'bg-accent-amber'
  if (load < 85) return 'bg-accent-orange'
  return 'bg-accent-red'
}

export function CognitiveLoadBar({ load }: CognitiveLoadBarProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${getLoadColor(load)}`}
          style={{ width: `${Math.min(100, load)}%` }}
        />
      </div>
      <span className="text-xs text-text-tertiary font-mono w-8 text-right">{load}%</span>
    </div>
  )
}
