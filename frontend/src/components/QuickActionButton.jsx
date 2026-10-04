export default function QuickActionButton({ label, tone = 'green', onClick }) {
  const toneClasses = {
    green: 'bg-[#edf8ee] text-[#1b7b52] border-[#bfe7d0]',
    emerald: 'bg-[#edf8ee] text-[#1b7b52] border-[#bfe7d0]',
    slate: 'bg-[#edf8ee] text-[#1b7b52] border-[#bfe7d0]',
    violet: 'bg-[#edf8ee] text-[#1b7b52] border-[#bfe7d0]',
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
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors hover:brightness-95 ${toneClasses[tone] || toneClasses.slate}`}
    >
      <span className="flex h-4 w-4 items-center justify-center">{icons[tone] || icons.slate}</span>
      {label}
    </button>
  )
}
