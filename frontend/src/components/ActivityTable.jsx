import StatusBadge from './StatusBadge'

export default function ActivityTable({ rows }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-[760px] w-full border-separate border-spacing-0 text-left text-sm text-slate-600">
        <thead>
          <tr className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-slate-500">
            <th className="pb-3 pl-2 font-semibold">Transaction ID</th>
            <th className="pb-3 pl-0 font-semibold">Officer ID</th>
            <th className="pb-3 pl-0 font-semibold">Evidence ID</th>
            <th className="pb-3 pl-0 font-semibold">Action</th>
            <th className="pb-3 pl-0 font-semibold">Timestamp</th>
            <th className="pb-3 pl-0 pr-2 text-right font-semibold">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const actionStyles = {
              green: 'bg-emerald-50 text-emerald-700',
              orange: 'bg-orange-50 text-orange-700',
              blue: 'bg-sky-50 text-sky-700',
              purple: 'bg-violet-50 text-violet-700',
            }

            return (
              <tr key={row.transactionId} className="border-t border-[#edf1f5] text-slate-700">
                <td className="py-3 pl-2 pr-4 font-medium text-slate-700">{row.transactionId}</td>
                <td className="py-3 pr-4">{row.officerId}</td>
                <td className="py-3 pr-4">{row.evidenceId}</td>
                <td className="py-3 pr-4">
                  <span className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-medium ${actionStyles[row.actionTone] || 'bg-slate-100 text-slate-700'}`}>
                    {row.action}
                  </span>
                </td>
                <td className="py-3 pr-4 whitespace-nowrap">{row.timestamp}</td>
                <td className="py-3 pr-2 text-right">
                  <StatusBadge status={row.status} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
