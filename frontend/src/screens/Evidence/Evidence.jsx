import { useMemo, useState } from 'react'
import DeleteConfirmationDialog from '../../components/DeleteConfirmationDialog'
import FilterPopover from '../../components/FilterPopover'
import CasesToolbar from '../../components/CasesToolbar'
import EvidenceTable from '../../components/EvidenceTable'

const statusOptions = ['All', 'Stored', 'Checked Out']
const typeOptions = ['All', 'Digital', 'Weapon', 'Biological', 'Document', 'Physical']

const resolveOfficerDisplay = (value, officers = []) => {
  if (!value) return value
  const officerIdMatch = String(value).match(/OF-\d+/)
  if (!officerIdMatch) return value

  const officer = officers.find((entry) => entry.id === officerIdMatch[0])
  return officer ? `${officerIdMatch[0]} · ${officer.name}` : officerIdMatch[0]
}

export default function Evidence({
  evidence = [],
  cases = [],
  officers = [],
  onRegisterEvidence,
  onUpdateEvidence,
  onDeleteEvidence,
}) {
  const [activeEvidenceId, setActiveEvidenceId] = useState(null)
  const [activeCaseId, setActiveCaseId] = useState(null)
  const [search, setSearch] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('All')
  const [selectedType, setSelectedType] = useState('All')
  const [filterOpen, setFilterOpen] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [editTarget, setEditTarget] = useState(null)

  const filteredEvidence = useMemo(() => {
    const query = search.trim().toLowerCase()

    return evidence.filter((item) => {
      const matchesSearch =
        query.length === 0 ||
        [item.id, item.caseId, item.name, item.type, item.rfid].join(' ').toLowerCase().includes(query)

      const matchesStatus = selectedStatus === 'All' || item.status === selectedStatus
      const matchesType = selectedType === 'All' || item.type === selectedType

      return matchesSearch && matchesStatus && matchesType
    })
  }, [evidence, search, selectedStatus, selectedType])

  const selectedEvidence = useMemo(
    () => evidence.find((item) => item.id === activeEvidenceId) || null,
    [evidence, activeEvidenceId],
  )

  const closeEvidenceDetails = () => setActiveEvidenceId(null)
  const closeCaseDetails = () => setActiveCaseId(null)

  return (
    <div className="w-full bg-[#f3f6f8]">
      <CasesToolbar
        placeholder="Search evidence ID, case ID, evidence name..."
        value={search}
        onSearchChange={setSearch}
        buttonLabel="Register Evidence"
        onRegisterCase={onRegisterEvidence}
        filterLabel="Filter"
        isFilterOpen={filterOpen !== null}
        onToggleFilter={() => setFilterOpen((current) => (current ? null : 'status'))}
        filterButton={({ isOpen }) => (
          <FilterPopover
            isOpen={isOpen}
            title="Evidence filters"
            groups={[
              {
                label: 'Status',
                options: statusOptions,
                selectedValue: selectedStatus,
                onSelect: (value) => {
                  setSelectedStatus(value)
                  setFilterOpen(null)
                },
              },
              {
                label: 'Type',
                options: typeOptions,
                selectedValue: selectedType,
                onSelect: (value) => {
                  setSelectedType(value)
                  setFilterOpen(null)
                },
              },
            ]}
            onClear={() => {
              setSelectedStatus('All')
              setSelectedType('All')
              setFilterOpen(null)
            }}
            onClose={() => setFilterOpen(null)}
          />
        )}
      />

      <div className="p-3 sm:p-4 lg:p-5">
        <EvidenceTable
          rows={filteredEvidence}
          onOpenEvidence={(id) => setActiveEvidenceId(id)}
          onOpenCase={(id) => setActiveCaseId(id)}
          onEdit={(row) => setEditTarget(row)}
          onDelete={(row) => setDeleteTarget(row)}
        />
      </div>

      {activeEvidenceId && selectedEvidence && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4 backdrop-blur-[1px]"
          onClick={(event) => {
            if (event.target === event.currentTarget) closeEvidenceDetails()
          }}
        >
          <div className="w-full max-w-[980px] rounded-[22px] border border-slate-200 bg-white p-5 shadow-[0_20px_50px_rgba(15,23,42,0.18)]">
            <div className="mb-5 flex items-center justify-between gap-3 border-b border-[#e9edf2] pb-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Evidence details
                </p>
                <h3 className="mt-1 text-[1.8rem] font-semibold tracking-[-0.04em] text-slate-800">
                  {selectedEvidence.id}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditTarget(selectedEvidence)}
                  className="rounded-xl border border-[#dfe7ef] bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(selectedEvidence)}
                  className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                >
                  Delete
                </button>
                <div className="mx-1 h-5 w-px bg-slate-200" />
                <button
                  type="button"
                  onClick={closeEvidenceDetails}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                  aria-label="Close evidence details"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="rounded-[18px] border border-[#dfe7ef] bg-[#f8fafc] p-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-[#e6edf4] bg-white p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Evidence ID</p>
                  <p className="mt-2 text-sm font-semibold text-slate-800">{selectedEvidence.id}</p>
                </div>
                <div className="rounded-xl border border-[#e6edf4] bg-white p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Evidence Name</p>
                  <p className="mt-2 text-sm font-semibold text-slate-800">{selectedEvidence.name}</p>
                </div>
                <div className="rounded-xl border border-[#e6edf4] bg-white p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Case ID</p>
                  <button
                    type="button"
                    onClick={() => setActiveCaseId(selectedEvidence.caseId)}
                    className="mt-2 text-sm font-semibold text-[#1f5ea8] underline-offset-2 hover:underline"
                  >
                    {selectedEvidence.caseId}
                  </button>
                </div>
                <div className="rounded-xl border border-[#e6edf4] bg-white p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Evidence Type</p>
                  <p className="mt-2 text-sm font-semibold text-slate-800">{selectedEvidence.type}</p>
                </div>
                <div className="rounded-xl border border-[#e6edf4] bg-white p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Assigned RFID</p>
                  <p className="mt-2 text-sm font-semibold text-slate-800">{selectedEvidence.rfid || 'Not Assigned'}</p>
                </div>
                <div className="rounded-xl border border-[#e6edf4] bg-white p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Status</p>
                  <p className="mt-2 text-sm font-semibold text-slate-800">{selectedEvidence.status}</p>
                </div>
                <div className="rounded-xl border border-[#e6edf4] bg-white p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Registered</p>
                  <p className="mt-2 text-sm font-semibold text-slate-800">{selectedEvidence.registered || '—'}</p>
                </div>
                <div className="rounded-xl border border-[#e6edf4] bg-white p-3 md:col-span-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Description</p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    {selectedEvidence.description || 'No additional description provided.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                Chain of Custody
              </p>
              <div className="space-y-4 border-l border-[#dfe7ef] pl-4">
                {(selectedEvidence.custodyHistory || []).map((event, index) => {
                  const isLatest = index === (selectedEvidence.custodyHistory || []).length - 1
                  const eventText = event.actor ? resolveOfficerDisplay(event.actor, officers) : event.actor || 'System'

                  return (
                    <div key={`${event.type}-${event.date}-${index}`} className="relative">
                      <div className="absolute -left-[1.13rem] top-1.5 h-3 w-3 rounded-full border-2 border-white bg-[#1f5e52] shadow-sm" />
                      <div
                        className={`rounded-xl border p-3 ${
                          isLatest
                            ? 'border-[#dbeafe] bg-[#eff6ff] shadow-sm'
                            : 'border-[#eaeef3] bg-[#f8fafc]'
                        }`}
                      >
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                          <p className="text-sm font-semibold text-slate-800">{event.type}</p>
                          <p className="text-[11px] uppercase tracking-[0.08em] text-slate-500">
                            {event.date} · {event.time || '00:00'}
                          </p>
                        </div>
                        <p className="mt-2 text-sm text-slate-600">
                          {eventText} {event.details ? `· ${event.details}` : ''}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeCaseId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4 backdrop-blur-[1px]">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Case details
                </p>
                <h3 className="mt-1 text-xl font-semibold text-slate-800">Case Details</h3>
              </div>
              <button
                type="button"
                onClick={closeCaseDetails}
                className="flex h-8 w-8 items-center justify-center rounded-full text-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                aria-label="Close case details"
              >
                ×
              </button>
            </div>

            <div className="space-y-3 text-sm text-slate-600">
              <div className="rounded-xl bg-slate-50 p-3">
                <span className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                  Case ID
                </span>
                <span className="mt-1 block text-base font-semibold text-slate-800">{activeCaseId}</span>
              </div>
              <div className="rounded-xl border border-dashed border-slate-200 p-3">
                <p className="text-slate-600">
                  {cases.find((item) => item.id === activeCaseId)?.title || 'Case information loaded.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4 backdrop-blur-[1px]">
          <div className="w-full max-w-xl rounded-[22px] border border-slate-200 bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Edit evidence
                </p>
                <h3 className="mt-1 text-xl font-semibold text-slate-800">Edit Evidence</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditTarget(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                aria-label="Close evidence edit"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Evidence ID
                  </label>
                  <input
                    readOnly
                    value={editTarget.id}
                    className="w-full rounded-xl border border-[#dfe7ef] bg-slate-50 px-3 py-2.5 text-sm text-slate-500"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Case ID
                  </label>
                  <input
                    readOnly
                    value={editTarget.caseId}
                    className="w-full rounded-xl border border-[#dfe7ef] bg-slate-50 px-3 py-2.5 text-sm text-slate-500"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Evidence Name
                  </label>
                  <input
                    value={editTarget.name}
                    onChange={(event) => setEditTarget({ ...editTarget, name: event.target.value })}
                    className="w-full rounded-xl border border-[#dfe7ef] bg-white px-3 py-2.5 text-sm text-slate-700"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Evidence Type
                  </label>
                  <select
                    value={editTarget.type}
                    onChange={(event) => setEditTarget({ ...editTarget, type: event.target.value })}
                    className="w-full rounded-xl border border-[#dfe7ef] bg-white px-3 py-2.5 text-sm text-slate-700"
                  >
                    {typeOptions.filter((item) => item !== 'All').map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Description
                </label>
                <textarea
                  value={editTarget.description || ''}
                  onChange={(event) => setEditTarget({ ...editTarget, description: event.target.value })}
                  rows={3}
                  className="w-full rounded-xl border border-[#dfe7ef] bg-white px-3 py-2.5 text-sm text-slate-700"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Assigned RFID
                  </label>
                  <select
                    value={editTarget.rfid}
                    onChange={(event) => setEditTarget({ ...editTarget, rfid: event.target.value })}
                    className="w-full rounded-xl border border-[#dfe7ef] bg-white px-3 py-2.5 text-sm text-slate-700"
                  >
                    <option value="">Select RFID</option>
                    {['RFID-A7F3-29C1', 'RFID-B2D8-441A', 'RFID-C09E1-7F20', 'RFID-D4B6-93EF', 'RFID-E8A2-1C74', 'RFID-F1D5-8B03'].map((rfid) => (
                      <option key={rfid} value={rfid}>
                        {rfid}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Status
                  </label>
                  <select
                    value={editTarget.status}
                    onChange={(event) => setEditTarget({ ...editTarget, status: event.target.value })}
                    className="w-full rounded-xl border border-[#dfe7ef] bg-white px-3 py-2.5 text-sm text-slate-700"
                  >
                    {statusOptions.filter((item) => item !== 'All').map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Registered At
                </label>
                <input
                  readOnly
                  value={editTarget.registered || editTarget.createdAt || ''}
                  className="w-full rounded-xl border border-[#dfe7ef] bg-slate-50 px-3 py-2.5 text-sm text-slate-500"
                />
              </div>

              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setEditTarget(null)}
                  className="rounded-xl border border-[#dfe7ef] bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onUpdateEvidence?.({
                      ...editTarget,
                      name: editTarget.name.trim() || editTarget.name,
                      type: editTarget.type,
                      status: editTarget.status,
                      rfid: editTarget.rfid,
                    })
                    setEditTarget(null)
                  }}
                  className="rounded-xl bg-[#172c41] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#111f32]"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <DeleteConfirmationDialog
          isOpen={Boolean(deleteTarget)}
          title="Delete Evidence?"
          message="Are you sure you want to delete"
          itemLabel={deleteTarget.name}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => {
            onDeleteEvidence?.(deleteTarget.id)
            setDeleteTarget(null)
            closeEvidenceDetails()
          }}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
