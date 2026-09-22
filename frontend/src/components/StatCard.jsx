export default function StatCard({ label, value, icon, tone }) {
  const iconMap = {
    folder: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
        <path d="M3.5 7.5A2.5 2.5 0 0 1 6 5h4l1.5 2H18a2.5 2.5 0 0 1 2.5 2.5v7A2.5 2.5 0 0 1 18 17H6a2.5 2.5 0 0 1-2.5-2.5v-7Z" />
      </svg>
    ),
    evidence: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
        <path d="M12 3.5 5.5 7v10L12 20.5 18.5 17V7L12 3.5Z" />
        <path d="M12 3.5v17" />
        <path d="M5.5 7 12 10.5 18.5 7" />
      </svg>
    ),
    officer: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
        <path d="M16 19v-1a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v1" />
        <circle cx="10" cy="7" r="3.5" />
        <path d="M19 19v-1a4 4 0 0 0-3-3.87" />
        <path d="M15.5 4.5A3.5 3.5 0 0 1 18.5 8" />
      </svg>
    ),
  }

  const toneClasses = {
    slate: 'bg-slate-100 text-slate-600',
    emerald: 'bg-emerald-100 text-emerald-600',
  }

  return (
    <article className="dashboard-panel flex min-h-[150px] flex-col justify-between p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-base font-medium text-slate-600">{label}</span>
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${toneClasses[tone] || toneClasses.slate}`}>
          {iconMap[icon]}
        </div>
      </div>

      <div className="mt-6 text-4xl font-semibold tracking-[-0.05em] text-slate-800 sm:text-[2.3rem]">
        {value}
      </div>
    </article>
  )
}
