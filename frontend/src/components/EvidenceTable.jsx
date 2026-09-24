import Table from './Table'
import StatusPill from './StatusPill'

export default function EvidenceTable({ rows, onOpenEvidence, onOpenCase, onEdit, onDelete }) {
  const actionButtonClass =
    'inline-flex items-center justify-center rounded-md border border-[#dfe7ef] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-800'

  const columns = [
    {
      key: 'id',
      label: 'Evidence ID',
      headerClass: 'pl-4',
      cellClass: 'font-semibold text-[#1f5ea8] align-middle',
      render: (row) => (
        <button
          type="button"
          onClick={() => onOpenEvidence?.(row.id)}
          className="underline-offset-2 transition hover:text-[#163d70] hover:underline"
        >
          {row.id}
        </button>
      ),
    },
    {
      key: 'caseId',
      label: 'Case ID',
      cellClass: 'font-semibold text-[#1f5ea8] align-middle',
      render: (row) => (
        <button
          type="button"
          onClick={() => onOpenCase?.(row.caseId)}
          className="underline-offset-2 transition hover:text-[#163d70] hover:underline"
        >
          {row.caseId}
        </button>
      ),
    },
    { key: 'name', label: 'Evidence Name', cellClass: 'font-medium text-slate-800' },
    { key: 'type', label: 'Type', cellClass: 'text-slate-600' },
    { key: 'rfid', label: 'Assigned RFID', cellClass: 'text-slate-700' },
    {
      key: 'status',
      label: 'Status',
      render: (row) => <StatusPill status={row.status} />,
    },
    { key: 'registered', label: 'Registered', cellClass: 'whitespace-nowrap text-slate-700' },
    {
      key: 'actions',
      label: 'Actions',
      align: 'right',
      headerClass: 'pr-4',
      cellClass: 'pr-4',
      render: (row) => (
        <div className="flex justify-end gap-2">
          <button
            type="button"
            aria-label={`Edit ${row.id}`}
            onClick={() => onEdit?.(row)}
            className={actionButtonClass}
          >
            Edit
          </button>
          <button
            type="button"
            aria-label={`Delete ${row.id}`}
            onClick={() => onDelete?.(row)}
            className="inline-flex items-center justify-center rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] font-semibold text-red-600 transition hover:bg-red-100"
          >
            Delete
          </button>
        </div>
      ),
    },
  ]

  return <Table columns={columns} rows={rows} rowKey={(row) => row.id} minWidth="920px" />
}
