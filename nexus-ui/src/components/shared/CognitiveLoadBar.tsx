import { useEffect, useState } from 'react'

interface CognitiveLoadBarProps {
  load: number // 0-100
  showLabel?: boolean
}

function getLoadColor(load: number): string {
  if (load < 40) return 'bg-accent-green'
  if (load < 65) return 'bg-accent-amber'
  if (load < 85) return 'bg-accent-orange'
  return 'bg-accent-red'
}

function getLoadGlow(load: number): string {
  if (load < 40) return 'shadow-[0_0_6px_rgba(34,197,94,0.4)]'
  if (load < 65) return 'shadow-[0_0_6px_rgba(234,179,8,0.4)]'
  if (load < 85) return 'shadow-[0_0_6px_rgba(249,115,22,0.4)]'
  return 'shadow-[0_0_8px_rgba(239,68,68,0.5)]'
}

function getLoadLabel(load: number): string {
  if (load < 40) return 'Low'
  if (load < 65) return 'Moderate'
  if (load < 85) return 'High'
  return 'Critical'
}

export function CognitiveLoadBar({ load, showLabel = false }: CognitiveLoadBarProps) {
  const [animatedWidth, setAnimatedWidth] = useState(0)

  useEffect(() => {
    // Animate from 0 to target on mount
    const timer = setTimeout(() => setAnimatedWidth(Math.min(100, load)), 50)
    return () => clearTimeout(timer)
  }, [load])

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className={[
              'h-full rounded-full transition-all duration-700 ease-out',
              getLoadColor(load),
              getLoadGlow(load),
            ].join(' ')}
            style={{ width: `${animatedWidth}%` }}
          />
        </div>
        <span className="text-xs text-text-tertiary font-mono w-8 text-right">{load}%</span>
      </div>
      {showLabel && (
        <span className={`text-[10px] font-medium ${
          load >= 85 ? 'text-accent-red' :
          load >= 65 ? 'text-accent-orange' :
          load >= 40 ? 'text-accent-amber' :
          'text-accent-green'
        }`}>
          {getLoadLabel(load)}
        </span>
      )}
    </div>
  )
}
