import StatCard from '../../components/StatCard'
import QuickActionButton from '../../components/QuickActionButton'
import ActivityTable from '../../components/ActivityTable'
import {
  dashboardStats,
  quickActions,
} from '../../data/dashboardData'

export default function Dashboard({
  cases = [],
  evidence = [],
  officers = [],
  activityRows = [],
  onOpenEntity,
  onRegisterCase,
  onRegisterOfficer,
  onRegisterEvidence,
  onAssignRfid,
}) {
  const stats = [
    { ...dashboardStats[0], value: cases.length },
    { ...dashboardStats[1], value: evidence.length },
    { ...dashboardStats[2], value: officers.length },
  ]

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
              onOpenEvidence={(id) => onOpenEntity?.('evidence', id)}
              onOpenOfficer={(id) => onOpenEntity?.('officer', id)}
            />
          </section>
        </div>
      </div>

    </div>
  )
}
