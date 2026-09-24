import { useMemo, useState } from 'react'
import DeleteConfirmationDialog from '../../components/DeleteConfirmationDialog'
import FilterPopover from '../../components/FilterPopover'
import RegisterCaseOverlay from '../../components/overlays/RegisterCaseOverlay'
import CaseTable from '../../components/CaseTable'
import CasesToolbar from '../../components/CasesToolbar'

const caseTypeOptions = ['All', 'Criminal', 'Traffic', 'Burglary', 'Financial', 'Narcotics']
const statusOptions = ['All', 'Active', 'Under Review', 'Pending Lab', 'Closed']

export default function Cases({ cases = [], onAddCase, onUpdateCase, onDeleteCase }) {
  const [activeCaseId, setActiveCaseId] = useState(null)
  const [registerOpen, setRegisterOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedType, setSelectedType] = useState('All')
  const [selectedStatus, setSelectedStatus] = useState('All')
  const [filterOpen, setFilterOpen] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [editTarget, setEditTarget] = useState(null)

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
                  {cases.find((item) => item.id === activeCaseId)?.title || 'Case information is available.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <RegisterCaseOverlay
        isOpen={registerOpen}
        onClose={closeRegisterCase}
        onCaseRegistered={(payload) => {
          onAddCase?.(payload)
          setRegisterOpen(false)
        }}
      />

      {editTarget && (
        <RegisterCaseOverlay
          isOpen={Boolean(editTarget)}
          mode="edit"
          initialCaseData={editTarget}
          initialEvidenceItems={cases
            .find((item) => item.id === editTarget.id)
            ? []
            : []}
          onClose={closeEditCase}
          onCaseSaved={(payload) => {
            onUpdateCase?.(payload.caseData, payload.evidenceItems)
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
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => {
            onDeleteCase?.(deleteTarget.id)
            setDeleteTarget(null)
          }}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
