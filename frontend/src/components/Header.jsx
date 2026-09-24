import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  formatRelativeTime,
  getSeverityTone,
  getUnreadAlertCount,
} from '../data/securityAlertsData'

export default function Header({
  title = 'Dashboard',
  subtitle = 'Overview of evidence and station activity',
  alerts = [],
  onMarkAlertAsRead,
  onMarkAllAlertsAsRead,
}) {
  const navigate = useNavigate()
  const containerRef = useRef(null)
  const [isAlertMenuOpen, setIsAlertMenuOpen] = useState(false)
  const [selectedAlert, setSelectedAlert] = useState(null)

  const unreadCount = getUnreadAlertCount(alerts)
  const recentAlerts = [...alerts]
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 4)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsAlertMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleAlertClick = (alert) => {
    onMarkAlertAsRead?.(alert.id)
    setSelectedAlert(alert)
    setIsAlertMenuOpen(false)
  }

  const handleViewAllAlerts = () => {
    setIsAlertMenuOpen(false)
    navigate('/security-alerts')
  }

  return (
    <header className="flex items-center justify-between gap-4 border-b border-[#dfe7ef] bg-[#f3f6f8] px-3 pb-4 pt-1 sm:px-4 sm:pb-5 lg:px-5">
      <div>
        <h1 className="text-[2rem] font-semibold tracking-[-0.04em] text-slate-800">{title}</h1>
        <p className="mt-1 text-sm text-slate-500 sm:text-base">{subtitle}</p>
      </div>

      <div className="flex items-center gap-3" ref={containerRef}>
        <div className="relative">
          <button
            type="button"
            aria-label="Notifications"
            onClick={() => setIsAlertMenuOpen((current) => !current)}
            className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-[#dfe7ef] bg-white text-slate-500 transition-colors hover:bg-slate-50"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
              <path d="M15 17h5l-1.4-1.4A2.1 2.1 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5" />
              <path d="M10 20a2 2 0 0 0 4 0" />
            </svg>

            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                {Math.min(unreadCount, 9)}
              </span>
            )}
          </button>

          {isAlertMenuOpen && (
            <div className="absolute right-0 z-30 mt-2 w-[360px] rounded-2xl border border-[#dfe7ef] bg-white p-2 shadow-[0_20px_45px_rgba(15,23,42,0.12)]">
              <div className="flex items-center justify-between rounded-xl bg-[#f8fafc] px-3 py-2.5">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Security alerts
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-slate-700">
                    {unreadCount} unread
                  </p>
                </div>

                <button
                  type="button"
                  onClick={onMarkAllAlertsAsRead}
                  className="text-xs font-medium text-sky-700 transition hover:text-sky-800"
                >
                  Mark all as read
                </button>
              </div>

              <div className="mt-2 space-y-1.5">
                {recentAlerts.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-sm text-slate-500">
                    No active security alerts.
                  </div>
                ) : (
                  recentAlerts.map((alert) => (
                    <button
                      key={alert.id}
                      type="button"
                      onClick={() => handleAlertClick(alert)}
                      className="flex w-full items-start gap-3 rounded-xl border border-transparent px-2.5 py-2 text-left transition hover:bg-slate-50 hover:border-slate-200"
                    >
                      <span
                        className={`mt-1 h-2.5 w-2.5 rounded-full ${
                          alert.read ? 'bg-slate-300' : 'bg-red-500'
                        }`}
                      />

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`inline-flex rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] ${getSeverityTone(alert.severity)}`}>
                            {alert.severity}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {formatRelativeTime(alert.timestamp)}
                          </span>
                        </div>
                        <p className="mt-1 text-sm font-semibold text-slate-700">{alert.title}</p>
                        <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{alert.description}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>

              <button
                type="button"
                onClick={handleViewAllAlerts}
                className="mt-2 flex w-full items-center justify-between rounded-xl bg-slate-900 px-3 py-2.5 text-left text-sm font-medium text-white transition hover:bg-slate-800"
              >
                <span>View all security alerts</span>
                <span className="text-lg text-slate-300">→</span>
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-[#dfe7ef] bg-white px-2 py-1.5 shadow-sm">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#2b3d4f] text-sm font-semibold text-white">
            A
          </div>
          <div className="hidden min-w-0 sm:block">
            <div className="text-sm font-semibold text-slate-800">Administrator</div>
          </div>
        </div>
      </div>

      {selectedAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4 backdrop-blur-[1px]">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Security alert
                </p>
                <h3 className="mt-1 text-xl font-semibold text-slate-800">{selectedAlert.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAlert(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                aria-label="Close alert details"
              >
                ×
              </button>
            </div>

            <div className="space-y-3 text-sm text-slate-600">
              <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3">
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Alert ID
                </span>
                <span className="text-base font-semibold text-slate-800">{selectedAlert.id}</span>
              </div>

              <div className="rounded-xl border border-dashed border-slate-200 p-3">
                <p>{selectedAlert.description}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                    Severity
                  </p>
                  <span className={`mt-2 inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${getSeverityTone(selectedAlert.severity)}`}>
                    {selectedAlert.severity}
                  </span>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                    Status
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-800">{selectedAlert.status}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
