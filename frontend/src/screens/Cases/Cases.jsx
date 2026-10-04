import { useEffect, useMemo, useState } from 'react'
import DeleteConfirmationDialog from '../../components/DeleteConfirmationDialog'
import FilterPopover from '../../components/FilterPopover'
import RegisterCaseOverlay from '../../components/overlays/RegisterCaseOverlay'
import CaseTable from '../../components/CaseTable'
import CasesToolbar from '../../components/CasesToolbar'

const statusOptions = ['All', 'Active', 'Under Review', 'Pending Lab', 'Closed']

export default function Cases({ cases = [], evidence = [], activityRows = [], openEntitySignal, onOpenEntity, onAddCase, onUpdateCase, onDeleteCase, availableRfids = [] }) {
  const [activeCaseId, setActiveCaseId] = useState(null)
  const [registerOpen, setRegisterOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedType, setSelectedType] = useState('All')
  const [selectedStatus, setSelectedStatus] = useState('All')
  const [filterOpen, setFilterOpen] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [editTarget, setEditTarget] = useState(null)
  const [actionError, setActionError] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (openEntitySignal?.type !== 'case') return undefined
    const frame = requestAnimationFrame(() => setActiveCaseId(openEntitySignal.id))
    return () => cancelAnimationFrame(frame)
  }, [openEntitySignal])

  const filteredCases = useMemo(() => {
    const query = search.trim().toLowerCase()

    return cases.filter((item) => {
      const matchesSearch =
        query.length === 0 ||
        [item.id, item.title, item.firNumber, item.caseType, item.type].join(' ').toLowerCase().includes(query)

      const matchesType = selectedType === 'All' || item.caseType === selectedType || item.type === selectedType
      const matchesStatus = selectedStatus === 'All' || item.status === selectedStatus

      return matchesSearch && matchesType && matchesStatus
    })
  }, [cases, search, selectedType, selectedStatus])

  const closeCaseDetails = () => setActiveCaseId(null)
  const activeCase = cases.find((item) => item.id === activeCaseId)
  const caseEvidence = evidence.filter((item) => item.caseId === activeCaseId)
  const caseEvidenceIds = new Set(caseEvidence.map((item) => item.id))
  const caseHistory = activityRows.filter((item) => caseEvidenceIds.has(item.evidenceId))
  const closeRegisterCase = () => setRegisterOpen(false)
  const closeEditCase = () => setEditTarget(null)

  return (
    <div className="w-full bg-[#f3f6f8]">
      <CasesToolbar
        value={search}
        onSearchChange={setSearch}
        onRegisterCase={() => setRegisterOpen(true)}
        filterLabel="Filter"
        isFilterOpen={filterOpen !== null}
        onToggleFilter={() => setFilterOpen((current) => (current ? null : 'status'))}
        filterButton={({ isOpen }) => (
          <FilterPopover
            isOpen={isOpen}
            title="Case filters"
            options={statusOptions}
            selectedValue={selectedStatus}
            onSelect={(value) => {
              setSelectedStatus(value)
              setFilterOpen(null)
            }}
            onClear={() => {
              setSelectedStatus('All')
              setSelectedType('All')
            }}
            onClose={() => setFilterOpen(null)}
          />
        )}
      />

      {actionError && <p className="mx-4 text-sm text-red-600" role="alert">{actionError}</p>}

      <div className="p-3 sm:p-4 lg:p-5">
        <CaseTable
          rows={filteredCases}
          onOpenCase={(id) => setActiveCaseId(id)}
          onEdit={(row) => setEditTarget(row)}
          onDelete={(row) => setDeleteTarget(row)}
        />
      </div>

      {activeCaseId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4 backdrop-blur-[1px]">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Case details
                </p>
                <h3 className="mt-1 text-xl font-semibold text-slate-800">{activeCase?.title || 'Case Details'}</h3>
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

            <div className="space-y-4 text-sm text-slate-600">
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ['Case ID', activeCaseId],
                  ['FIR Number', activeCase?.firNumber],
                  ['Case Type', activeCase?.caseType],
                  ['Status', activeCase?.status],
                  ['Created', activeCase?.createdAt || activeCase?.created],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl bg-slate-50 p-3">
                    <span className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</span>
                    <span className="mt-1 block font-semibold text-slate-800">{value || '—'}</span>
                  </div>
                ))}
                <div className="rounded-xl bg-slate-50 p-3 sm:col-span-2">
                  <span className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">Description</span>
                  <span className="mt-1 block text-slate-700">{activeCase?.description || '—'}</span>
                </div>
              </div>

              <section className="rounded-xl border border-slate-200 p-3">
                <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Related Evidence</h4>
                {caseEvidence.length ? caseEvidence.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 border-t border-slate-100 py-2 first:border-0">
                    <button type="button" onClick={() => onOpenEntity?.('evidence', item.id)} className="font-semibold text-[#1f5ea8] underline-offset-2 hover:underline">{item.id}</button>
                    <span className="min-w-0 flex-1 truncate text-slate-600">{item.name}</span>
                    <span className="text-xs text-slate-500">{item.status}</span>
                  </div>
                )) : <p className="text-sm text-slate-500">No evidence is registered to this case.</p>}
              </section>

              <section className="rounded-xl border border-slate-200 p-3">
                <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Recorded Activity</h4>
                {caseHistory.length ? caseHistory.map((entry) => (
                  <div key={entry.transactionId} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-t border-slate-100 py-2 first:border-0">
                    <span className="font-medium text-slate-700">{entry.action}</span>
                    <button type="button" onClick={() => onOpenEntity?.('evidence', entry.evidenceId)} className="font-semibold text-[#1f5ea8] underline-offset-2 hover:underline">{entry.evidenceId}</button>
                    <button type="button" onClick={() => onOpenEntity?.('officer', entry.officerId)} className="font-semibold text-[#1f5ea8] underline-offset-2 hover:underline">{entry.officerId}</button>
                    <span className="col-span-3 text-xs text-slate-500">{entry.timestamp}</span>
                  </div>
                )) : <p className="text-sm text-slate-500">No transaction history is recorded for this case&apos;s evidence.</p>}
              </section>
            </div>
          </div>
        </div>
      )}

      <RegisterCaseOverlay
        isOpen={registerOpen}
        availableRfids={availableRfids}
        onClose={closeRegisterCase}
        onCaseRegistered={async (payload) => {
          return onAddCase?.(payload)
        }}
      />

      {editTarget && (
        <RegisterCaseOverlay
          isOpen={Boolean(editTarget)}
          mode="edit"
          initialCaseData={editTarget}
          availableRfids={availableRfids}
          initialEvidenceItems={cases
            .find((item) => item.id === editTarget.id)
            ? []
            : []}
          onClose={closeEditCase}
          onCaseSaved={async (payload) => {
            await onUpdateCase?.(payload.caseData)
            setEditTarget(null)
          }}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmationDialog
          isOpen={Boolean(deleteTarget)}
          title="Delete Case?"
          message="Are you sure you want to delete"
          itemLabel={deleteTarget.title}
          errorMessage={actionError}
          isSubmitting={isDeleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={async () => {
            setActionError('')
            setIsDeleting(true)
            try {
              await onDeleteCase?.(deleteTarget.id)
              setDeleteTarget(null)
            } catch (error) {
              setActionError(error.message || 'Unable to delete this case.')
            } finally {
              setIsDeleting(false)
            }
          }}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
