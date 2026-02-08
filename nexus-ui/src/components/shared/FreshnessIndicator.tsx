interface FreshnessIndicatorProps {
  score: number // 0.0 (fresh) to 2.0+ (stale)
}

function getFreshnessColor(score: number): string {
  if (score < 0.5) return 'bg-accent-green'
  if (score < 1.0) return 'bg-accent-amber'
  if (score < 1.5) return 'bg-accent-orange'
  return 'bg-accent-red'
}

export function FreshnessIndicator({ score }: FreshnessIndicatorProps) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${getFreshnessColor(score)}`} />
      <span className="text-xs text-text-tertiary font-mono">{score.toFixed(1)}</span>
    </span>
  )
}
