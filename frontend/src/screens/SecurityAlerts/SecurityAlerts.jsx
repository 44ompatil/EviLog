import { useMemo, useState } from 'react'
import {
  formatRelativeTime,
  getSeverityTone,
  getStatusTone,
} from '../../data/securityAlertsData'

const severityOptions = ['All', 'Critical', 'High', 'Medium', 'Low']
const statusOptions = ['All', 'Open', 'Investigating', 'Pending Review', 'Resolved']

export default function SecurityAlerts({
  alerts = [],
  onMarkAlertAsRead,
  onMarkAllAlertsAsRead,
}) {
  const [search, setSearch] = useState('')
  const [selectedSeverity, setSelectedSeverity] = useState('All')
  const [selectedStatus, setSelectedStatus] = useState('All')
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [selectedAlert, setSelectedAlert] = useState(null)

  const filteredAlerts = useMemo(() => {
    const query = search.trim().toLowerCase()

    return alerts.filter((alert) => {
      const matchesSearch =
        query.length === 0 ||
        [
          alert.id,
          alert.title,
          alert.type,
          alert.description,
          alert.evidenceId,
          alert.officerId,
          alert.location,
        ]
          .join(' ')
          .toLowerCase()
          .includes(query)

      const matchesSeverity =
        selectedSeverity === 'All' || alert.severity === selectedSeverity
      const matchesStatus = selectedStatus === 'All' || alert.status === selectedStatus

      return matchesSearch && matchesSeverity && matchesStatus
    })
  }, [alerts, search, selectedSeverity, selectedStatus])

  const unreadCount = alerts.filter((alert) => !alert.read).length
  const criticalCount = alerts.filter((alert) => alert.severity === 'Critical').length
  const resolvedCount = alerts.filter((alert) => alert.status === 'Resolved').length

  const handleOpenAlert = (alert) => {
    onMarkAlertAsRead?.(alert.id)
    setSelectedAlert(alert)
  }

  return (
    <div className="w-full bg-[#f3f6f8]">
      <div className="px-3 py-4 sm:px-5 lg:px-6 xl:px-8">
        <div className="dashboard-panel min-h-[calc(100vh-2rem)] bg-[#f3f6f8] p-3 sm:p-4 lg:p-6">
          <div className="flex flex-col gap-3 border-b border-[#dfe7ef] pb-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Station monitoring
              </p>
              <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-slate-800">
                Security Alerts
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search alerts"
                  className="w-[220px] rounded-xl border border-[#dfe7ef] bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                />
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsFilterOpen((current) => !current)}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#dfe7ef] bg-white px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                >
                  Filters
                  <span className="text-xs text-slate-400">▾</span>
                </button>

                {isFilterOpen && (
                  <div className="absolute right-0 z-20 mt-2 w-[290px] rounded-2xl border border-[#dfe7ef] bg-white p-3 shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
                    <div className="space-y-3">
                      <div>
                        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                          Severity
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {severityOptions.map((option) => (
                            <button
                              key={option}
                              type="button"
                              onClick={() => {
                                setSelectedSeverity(option)
                                setIsFilterOpen(false)
                              }}
                              className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                                selectedSeverity === option
                                  ? 'border-sky-200 bg-sky-50 text-sky-700'
                                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                          Status
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {statusOptions.map((option) => (
                            <button
                              key={option}
                              type="button"
                              onClick={() => {
                                setSelectedStatus(option)
                                setIsFilterOpen(false)
                              }}
                              className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                                selectedStatus === option
                                  ? 'border-violet-200 bg-violet-50 text-violet-700'
                                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={onMarkAllAlertsAsRead}
                className="rounded-xl bg-slate-900 px-3 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                Mark all as read
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-[#dfe7ef] bg-white p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                Total alerts
              </p>
              <div className="mt-3 flex items-end justify-between">
                <span className="text-3xl font-semibold text-slate-800">{alerts.length}</span>
                <span className="text-sm text-slate-500">8 active</span>
              </div>
            </div>

            <div className="rounded-2xl border border-[#dfe7ef] bg-white p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                Unread
              </p>
              <div className="mt-3 flex items-end justify-between">
                <span className="text-3xl font-semibold text-slate-800">{unreadCount}</span>
                <span className="text-sm text-red-500">Requires review</span>
              </div>
            </div>

            <div className="rounded-2xl border border-[#dfe7ef] bg-white p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                Critical
              </p>
              <div className="mt-3 flex items-end justify-between">
                <span className="text-3xl font-semibold text-slate-800">{criticalCount}</span>
                <span className="text-sm text-red-600">Immediate</span>
              </div>
            </div>

            <div className="rounded-2xl border border-[#dfe7ef] bg-white p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                Resolved
              </p>
              <div className="mt-3 flex items-end justify-between">
                <span className="text-3xl font-semibold text-slate-800">{resolvedCount}</span>
                <span className="text-sm text-emerald-600">Stable</span>
              </div>
            </div>
          </div>

          <section className="mt-5 overflow-hidden rounded-2xl border border-[#dfe7ef] bg-white">
            <div className="grid grid-cols-[1.3fr_1.2fr_2.3fr_1.2fr_1.1fr_1fr_1.1fr_1fr] gap-3 border-b border-[#edf1f5] bg-[#f8fafc] px-3 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              <span>Alert</span>
              <span>Type</span>
              <span>Description</span>
              <span>Evidence ID</span>
              <span>Officer ID</span>
              <span>Severity</span>
              <span>Time</span>
              <span>Status</span>
            </div>

            {filteredAlerts.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-500">
                No alerts match the current filters.
              </div>
            ) : (
              filteredAlerts.map((alert) => (
                <button
                  key={alert.id}
                  type="button"
                  onClick={() => handleOpenAlert(alert)}
                  className="grid w-full grid-cols-[1.3fr_1.2fr_2.3fr_1.2fr_1.1fr_1fr_1.1fr_1fr] items-center gap-3 border-b border-[#edf1f5] px-3 py-3 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                >
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${alert.read ? 'bg-slate-300' : 'bg-red-500'}`} />
                    <span className="font-semibold">{alert.id}</span>
                  </div>
                  <span>{alert.type}</span>
                  <span className="text-slate-600">{alert.description}</span>
                  <span>{alert.evidenceId}</span>
                  <span>{alert.officerId}</span>
                  <span>
                    <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold ${getSeverityTone(alert.severity)}`}>
                      {alert.severity}
                    </span>
                  </span>
                  <span className="text-slate-500">{formatRelativeTime(alert.timestamp)}</span>
                  <span>
                    <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold ${getStatusTone(alert.status)}`}>
                      {alert.status}
                    </span>
                  </span>
                </button>
              ))
            )}
          </section>
        </div>
      </div>

      {selectedAlert && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4 backdrop-blur-[1px]"
          onClick={() => setSelectedAlert(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Alert detail
                </p>
                <h3 className="mt-1 text-xl font-semibold text-slate-800">{selectedAlert.title}</h3>
              </div>

              <button
                type="button"
                onClick={() => setSelectedAlert(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                aria-label="Close alert detail"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  {selectedAlert.id}
                </span>
                <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold ${getSeverityTone(selectedAlert.severity)}`}>
                  {selectedAlert.severity}
                </span>
              </div>

              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                {selectedAlert.description}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                    Evidence ID
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-800">{selectedAlert.evidenceId}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                    Officer ID
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-800">{selectedAlert.officerId}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                    Location
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-800">{selectedAlert.location}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                    Status
                  </p>
                  <span className={`mt-2 inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold ${getStatusTone(selectedAlert.status)}`}>
                    {selectedAlert.status}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-600">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Logged
                </p>
                <p className="mt-2 text-slate-700">{new Date(selectedAlert.timestamp).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
