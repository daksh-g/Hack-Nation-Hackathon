interface FreshnessIndicatorProps {
  score: number // 0.0 (fresh) to 2.0+ (stale)
  showLabel?: boolean
}

function getFreshnessColor(score: number): string {
  if (score < 0.5) return 'bg-accent-green'
  if (score < 1.0) return 'bg-accent-amber'
  if (score < 1.5) return 'bg-accent-orange'
  return 'bg-accent-red'
}

function getFreshnessLabel(score: number): string {
  if (score < 0.5) return 'Fresh'
  if (score < 1.0) return 'Aging'
  if (score < 1.5) return 'Stale'
  return 'Expired'
}

function getFreshnessTextColor(score: number): string {
  if (score < 0.5) return 'text-accent-green'
  if (score < 1.0) return 'text-accent-amber'
  if (score < 1.5) return 'text-accent-orange'
  return 'text-accent-red'
}

export function FreshnessIndicator({ score, showLabel = false }: FreshnessIndicatorProps) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="relative flex">
        {score >= 1.5 && (
          <span className={`absolute inline-flex h-2 w-2 rounded-full ${getFreshnessColor(score)} opacity-40 animate-ping`} />
        )}
        <span className={`relative w-2 h-2 rounded-full ${getFreshnessColor(score)}`} />
      </span>
      <span className="text-xs text-text-tertiary font-mono">{score.toFixed(1)}</span>
      {showLabel && (
        <span className={`text-[10px] font-medium ${getFreshnessTextColor(score)}`}>
          {getFreshnessLabel(score)}
        </span>
      )}
    </span>
  )
}
