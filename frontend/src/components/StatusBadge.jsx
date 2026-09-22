export default function StatusBadge({ status }) {
  const styles = {
    Completed: 'bg-emerald-50 text-emerald-700',
    'In Transit': 'bg-sky-50 text-sky-700',
    Verified: 'bg-violet-50 text-violet-700',
    Pending: 'bg-amber-50 text-amber-700',
  }

  return (
    <span
      className={`inline-flex items-center justify-center rounded-lg px-2.5 py-1 text-xs font-medium ${styles[status] || 'bg-slate-100 text-slate-700'}`}
    >
      {status}
    </span>
  )
}
