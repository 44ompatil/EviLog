export default function StatusPill({ status }) {
  const styles = {
    Active: 'bg-[#ecfdf5] text-[#15803d] border-[#bbf7d0]',
    Inactive: 'bg-[#f3f4f6] text-[#4b5563] border-[#d1d5db]',
    'Under Review': 'bg-[#eff6ff] text-[#1d4ed8] border-[#bfdbfe]',
    'Pending Lab': 'bg-[#fff7ed] text-[#c2410c] border-[#fed7aa]',
    Closed: 'bg-[#f3f4f6] text-[#4b5563] border-[#d1d5db]',
    Stored: 'bg-[#ecfdf5] text-[#15803d] border-[#bbf7d0]',
    'Checked Out': 'bg-[#fff7ed] text-[#c2410c] border-[#fed7aa]',
    Enrolled: 'bg-[#ecfdf5] text-[#15803d] border-[#bbf7d0]',
    'Not Enrolled': 'bg-[#f3f4f6] text-[#475569] border-[#dfe7ef]',
    'Needs Update': 'bg-[#fff7ed] text-[#c2410c] border-[#fed7aa]',
  }

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-none tracking-[0.02em] ${
        styles[status] || 'bg-slate-100 text-slate-700 border-slate-200'
      }`}
    >
      {status}
    </span>
  )
}
