import { useState } from 'react'
import StatCard from '../../components/StatCard'
import QuickActionButton from '../../components/QuickActionButton'
import ActivityTable from '../../components/ActivityTable'
import {
  dashboardStats,
  quickActions,
  activityRows,
} from '../../data/dashboardData'

export default function Dashboard({
  cases = [],
  evidence = [],
  officers = [],
  onRegisterCase,
  onRegisterOfficer,
  onRegisterEvidence,
  onAssignRfid,
}) {
  const [details, setDetails] = useState(null)

  const stats = [
    { ...dashboardStats[0], value: cases.length },
    { ...dashboardStats[1], value: evidence.length },
    { ...dashboardStats[2], value: officers.length },
  ]

  const openDetails = (type, id) => setDetails({ type, id })
  const closeDetails = () => setDetails(null)

  return (
    <div className="w-full bg-[#f3f6f8]">
      <div className="px-3 py-4 sm:px-5 lg:px-6 xl:px-8">
        <div className="dashboard-panel min-h-[calc(100vh-2rem)] bg-[#f3f6f8] p-3 sm:p-4 lg:p-6">
          <section className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {stats.map((stat) => (
              <StatCard
                key={stat.label}
                label={stat.label}
                value={stat.value}
                icon={stat.icon}
                tone={stat.tone}
              />
            ))}
          </section>

          <div className="mt-5 flex flex-wrap gap-3">
            {quickActions.map((action) => (
              <QuickActionButton
                key={action.label}
                label={action.label}
                tone={action.tone}
                onClick={() => {
                  if (action.label === 'Register Case') onRegisterCase?.()
                  if (action.label === 'Register Officer') onRegisterOfficer?.()
                  if (action.label === 'Register Evidence') onRegisterEvidence?.()
                  if (action.label === 'Assign RFID') onAssignRfid?.()
                }}
              />
            ))}
          </div>

          <section className="mt-6 rounded-[18px] border border-[#dfe7ef] bg-white/80 p-3 sm:p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-700">Recent Activity</h2>
                <p className="text-sm text-slate-500">Evidence transactions today</p>
              </div>
            </div>

            <ActivityTable
              rows={activityRows}
              onOpenEvidence={(id) => openDetails('evidence', id)}
              onOpenOfficer={(id) => openDetails('officer', id)}
            />
          </section>
        </div>
      </div>

      {details && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4 backdrop-blur-[1px]">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  {details.type === 'evidence' ? 'Evidence' : 'Officer'} details
                </p>
                <h3 className="mt-1 text-xl font-semibold text-slate-800">
                  {details.type === 'evidence' ? 'Evidence Details' : 'Officer Details'}
                </h3>
              </div>
              <button
                type="button"
                onClick={closeDetails}
                className="flex h-8 w-8 items-center justify-center rounded-full text-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                aria-label="Close details"
              >
                ×
              </button>
            </div>

            <div className="space-y-3 text-sm text-slate-600">
              <div className="rounded-xl bg-slate-50 p-3">
                <span className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                  {details.type === 'evidence' ? 'Evidence ID' : 'Officer ID'}
                </span>
                <span className="mt-1 block text-base font-semibold text-slate-800">{details.id}</span>
              </div>
              <div className="rounded-xl border border-dashed border-slate-200 p-3">
                <p className="text-slate-600">
                  {details.type === 'evidence'
                    ? 'Evidence record information and chain-of-custody details would load here.'
                    : 'Officer profile and assignment details would load here.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
