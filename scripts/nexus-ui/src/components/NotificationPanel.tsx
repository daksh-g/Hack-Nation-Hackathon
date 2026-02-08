import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bell,
  X,
  AlertTriangle,
  FileText,
  CheckCircle2,
  Brain,
  Globe,
  Zap,
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────

type Urgency = 'critical' | 'high' | 'warning' | 'info'

interface Notification {
  id: string
  icon: typeof AlertTriangle
  iconColor: string
  source: string
  sourceType: 'agent' | 'person'
  text: string
  timestamp: string
  urgency: Urgency
  read: boolean
}

// ── Constants ────────────────────────────────────────────────────────────────

const URGENCY_BADGE: Record<Urgency, { bg: string; text: string; label: string }> = {
  critical: { bg: 'bg-accent-red/20', text: 'text-accent-red', label: 'Critical' },
  high: { bg: 'bg-accent-amber/20', text: 'text-accent-amber', label: 'High' },
  warning: { bg: 'bg-accent-amber/15', text: 'text-accent-amber', label: 'Warning' },
  info: { bg: 'bg-accent-blue/15', text: 'text-accent-blue', label: 'Info' },
}

const INITIAL_NOTIFICATIONS: Notification[] = [
  {
    id: 'n1',
    icon: AlertTriangle,
    iconColor: 'text-accent-red',
    source: 'Contradiction Agent',
    sourceType: 'agent',
    text: 'Pricing contradiction requires your attention',
    timestamp: '2 min ago',
    urgency: 'critical',
    read: false,
  },
  {
    id: 'n2',
    icon: FileText,
    iconColor: 'text-accent-amber',
    source: 'Catherine Moore',
    sourceType: 'person',
    text: 'EMEA billing architecture proposal ready for review',
    timestamp: '18 min ago',
    urgency: 'high',
    read: false,
  },
  {
    id: 'n3',
    icon: CheckCircle2,
    iconColor: 'text-accent-green',
    source: 'Atlas-Code',
    sourceType: 'agent',
    text: 'Completed async payment retry v2.3.1',
    timestamp: '34 min ago',
    urgency: 'info',
    read: false,
  },
  {
    id: 'n4',
    icon: Brain,
    iconColor: 'text-agent-violet',
    source: 'Overload Agent',
    sourceType: 'agent',
    text: 'Cognitive load alert: Catherine Moore at 91%',
    timestamp: '1 hr ago',
    urgency: 'warning',
    read: false,
  },
  {
    id: 'n5',
    icon: Globe,
    iconColor: 'text-agent-cyan',
    source: 'Nova-Research',
    sourceType: 'agent',
    text: 'New APAC market data available for analysis',
    timestamp: '2 hr ago',
    urgency: 'info',
    read: true,
  },
]

// ── Component ────────────────────────────────────────────────────────────────

export function NotificationPanel() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>(INITIAL_NOTIFICATIONS)
  const panelRef = useRef<HTMLDivElement>(null)

  const unreadCount = notifications.filter((n) => !n.read).length

  // Close on Escape
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && open) {
        e.preventDefault()
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  // Close on click outside
  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    // Delay binding so the open-click itself doesn't immediately close
    const timeout = setTimeout(() => {
      document.addEventListener('mousedown', onClick)
    }, 0)
    return () => {
      clearTimeout(timeout)
      document.removeEventListener('mousedown', onClick)
    }
  }, [open])

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }, [])

  const toggleOpen = useCallback(() => {
    setOpen((prev) => !prev)
  }, [])

  return (
    <>
      {/* Bell Button */}
      <button
        onClick={toggleOpen}
        className="relative flex items-center justify-center w-9 h-9 rounded-lg hover:bg-white/5 transition-colors"
        aria-label="Notifications"
      >
        <Bell size={18} className="text-text-secondary" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-accent-red text-[10px] font-bold text-white px-1">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Slide-out Panel */}
      <AnimatePresence>
        {open && (
          <>
            {/* Scrim for visual context (non-blocking, click-through handled above) */}
            <motion.div
              className="fixed inset-0 z-[90] bg-black/20"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            />

            <motion.div
              ref={panelRef}
              className="fixed top-0 right-0 z-[95] h-full w-[380px] bg-panels border-l border-white/10 shadow-2xl flex flex-col"
              initial={{ x: 380 }}
              animate={{ x: 0 }}
              exit={{ x: 380 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Bell size={16} className="text-text-secondary" />
                  <h2 className="text-sm font-semibold text-text-primary">Notifications</h2>
                  {unreadCount > 0 && (
                    <span className="min-w-[20px] h-5 flex items-center justify-center rounded-full bg-accent-red/20 text-accent-red text-[11px] font-bold px-1.5">
                      {unreadCount}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-[11px] text-accent-blue hover:text-accent-blue/80 font-medium transition-colors"
                    >
                      Mark all read
                    </button>
                  )}
                  <button
                    onClick={() => setOpen(false)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <X size={16} className="text-text-tertiary" />
                  </button>
                </div>
              </div>

              {/* Routed by NEXUS label */}
              <div className="px-5 py-2 flex items-center gap-2 border-b border-white/5">
                <Zap size={12} className="text-agent-cyan" />
                <span className="text-[11px] font-semibold text-agent-cyan uppercase tracking-wider font-mono">
                  Routed by NEXUS
                </span>
              </div>

              {/* Notification List */}
              <div className="flex-1 overflow-y-auto">
                <AnimatePresence initial={false}>
                  {notifications.map((notification, index) => {
                    const badge = URGENCY_BADGE[notification.urgency]
                    const Icon = notification.icon
                    return (
                      <motion.div
                        key={notification.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.2, delay: index * 0.03 }}
                        className={`px-5 py-3.5 border-b border-white/5 hover:bg-white/[0.02] transition-colors cursor-pointer ${
                          !notification.read ? 'bg-white/[0.02]' : ''
                        }`}
                        onClick={() => {
                          setNotifications((prev) =>
                            prev.map((n) =>
                              n.id === notification.id ? { ...n, read: true } : n,
                            ),
                          )
                        }}
                      >
                        <div className="flex gap-3">
                          {/* Icon */}
                          <div className="flex-shrink-0 mt-0.5">
                            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                              <Icon size={16} className={notification.iconColor} />
                            </div>
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-xs font-medium ${
                                notification.sourceType === 'agent'
                                  ? 'text-agent-cyan'
                                  : 'text-text-secondary'
                              }`}>
                                {notification.source}
                              </span>
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${badge.bg} ${badge.text}`}>
                                {badge.label}
                              </span>
                              {!notification.read && (
                                <span className="w-1.5 h-1.5 rounded-full bg-accent-blue flex-shrink-0" />
                              )}
                            </div>
                            <p className={`text-sm leading-snug mb-1 ${
                              notification.read ? 'text-text-tertiary' : 'text-text-primary'
                            }`}>
                              {notification.text}
                            </p>
                            <span className="text-[11px] text-text-tertiary">
                              {notification.timestamp}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>

              {/* Footer */}
              <div className="px-5 py-3 border-t border-white/10 text-center">
                <span className="text-[11px] text-text-tertiary">
                  {notifications.length} notifications &middot; {unreadCount} unread
                </span>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
