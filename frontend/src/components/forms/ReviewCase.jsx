export default function ReviewCase({ caseData, evidenceItems }) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#e8edf3] bg-[#f9fbfd] p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">
            Case Information
          </h3>
          <button type="button" className="rounded-lg border border-[#dfe7ef] bg-white px-2 py-1 text-xs font-medium text-slate-600">
            Edit
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Case Title</p>
            <div className="rounded-lg border border-[#e8edf3] bg-white px-3 py-2 text-sm text-slate-700">
              {caseData.title || '—'}
            </div>
          </div>

          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">FIR Number</p>
            <div className="rounded-lg border border-[#e8edf3] bg-white px-3 py-2 text-sm text-slate-700">
              {caseData.firNumber || '—'}
            </div>
          </div>

          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Case Type</p>
            <div className="rounded-lg border border-[#e8edf3] bg-white px-3 py-2 text-sm text-slate-700">
              {caseData.caseType || '—'}
            </div>
          </div>

          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Status</p>
            <div className="rounded-lg border border-[#e8edf3] bg-white px-3 py-2 text-sm text-slate-700">
              {caseData.status || '—'}
            </div>
          </div>
        </div>

        <div className="mt-4">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Description</p>
          <div className="rounded-lg border border-[#e8edf3] bg-white px-3 py-2 text-sm text-slate-700">
            {caseData.description || 'No description provided.'}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-[#e8edf3] bg-[#f9fbfd] p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">
            Evidence
          </h3>
          <span className="rounded-full border border-[#dfe7ef] bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600">
            {evidenceItems.length} item{evidenceItems.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="space-y-3">
          {evidenceItems.map((item, index) => (
            <div key={item.id} className="rounded-xl border border-[#e8edf3] bg-white p-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-slate-700">{item.evidenceName || `Evidence ${index + 1}`}</span>
                <span className="rounded-full border border-[#dfe7ef] bg-slate-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                  {item.evidenceType || 'Unassigned'}
                </span>
              </div>

              <div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                <div>
                  <span className="block text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">Evidence Type</span>
                  <span>{item.evidenceType || '—'}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">Assigned RFID</span>
                  <span>{item.assignedRfid || '—'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
