import Sidebar from './components/Sidebar'
import Header from './components/Header'
import StatCard from './components/StatCard'
import QuickActionButton from './components/QuickActionButton'
import ActivityTable from './components/ActivityTable'
import {
  sidebarItems,
  dashboardStats,
  quickActions,
  activityRows,
} from './data/dashboardData'

function App() {
  return (
    <div className="dashboard-shell">
      <div className="mx-auto flex max-w-[1800px] flex-col overflow-x-hidden lg:flex-row">
        <Sidebar items={sidebarItems} />

        <main className="flex-1 px-3 py-4 sm:px-5 lg:px-6 xl:px-8">
          <div className="dashboard-panel min-h-[calc(100vh-2rem)] bg-[#f3f6f8] p-3 sm:p-4 lg:p-6">
            <Header />

            <section className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {dashboardStats.map((stat) => (
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
                />
              ))}
            </div>

            <section className="mt-6 rounded-[18px] border border-[#dfe7ef] bg-white/80 p-3 sm:p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-700">Recent Activity</h2>
                  <p className="text-sm text-slate-500">Evidence transactions today</p>
                </div>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-700"
                >
                  <span>View all</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
                    <path d="M5 12h14" />
                    <path d="m13 5 7 7-7 7" />
                  </svg>
                </button>
              </div>

              <ActivityTable rows={activityRows} />
            </section>
          </div>
        </main>
      </div>
    </div>
  )
}

export default App
