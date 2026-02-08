import { useEffect, useState } from 'react'
import type { Alert } from '../types/graph'
import { getAlerts } from '../lib/api'

export function AlertsView() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAlerts()
      .then(data => setAlerts(data.alerts))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-text-tertiary animate-pulse">Loading alerts...</div>
      </div>
    )
  }

  return (
    <div className="p-6 overflow-y-auto h-full">
      <div className="max-w-3xl mx-auto space-y-3">
        {alerts.length === 0 ? (
          <p className="text-text-tertiary">No alerts</p>
        ) : (
          alerts.map(alert => (
            <div key={alert.id} className="bg-cards rounded-lg p-4 border border-white/5">
              <div className="flex items-center gap-2 mb-2">
                <span className={`w-2 h-2 rounded-full ${
                  alert.severity === 'critical' ? 'bg-accent-red' :
                  alert.severity === 'warning' ? 'bg-accent-amber' :
                  'bg-accent-blue'
                }`} />
                <span className="text-sm font-semibold text-text-primary">{alert.headline}</span>
              </div>
              <p className="text-sm text-text-secondary">{alert.detail}</p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
