export default function QuickActionButton({ label, tone = 'slate' }) {
  const toneClasses = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    slate: 'bg-slate-100 text-slate-700 border-slate-200',
    violet: 'bg-violet-50 text-violet-700 border-violet-200',
  }

  const icons = {
    emerald: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
        <path d="M12 5v14M5 12h14" />
      </svg>
    ),
    slate: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
        <path d="M12 5v14M5 12h14" />
      </svg>
    ),
    violet: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
        <path d="m9 9 6 6m-6 0 6-6" />
        <circle cx="12" cy="12" r="7" />
      </svg>
    ),
  }

  return (
    <button
      type="button"
      className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors hover:brightness-95 ${toneClasses[tone] || toneClasses.slate}`}
    >
      <span className="flex h-4 w-4 items-center justify-center">{icons[tone] || icons.slate}</span>
      {label}
    </button>
  )
}
