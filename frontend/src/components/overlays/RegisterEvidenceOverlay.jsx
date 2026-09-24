import { useMemo, useState } from 'react'
import { getAvailableRfidOptions, rfidCatalog } from '../../data/rfidData'

function getNextEvidenceId(existingEvidence = []) {
  const numericIds = existingEvidence
    .map((entry) => Number(String(entry.id).match(/(\d+)$/)?.[1] || '0'))
    .filter((value) => Number.isFinite(value))

  const nextValue = numericIds.length ? Math.max(...numericIds) + 1 : 142
  return `EVD-${new Date().getFullYear()}-${String(nextValue).padStart(5, '0')}`
}

export default function RegisterEvidenceOverlay({
  isOpen,
  cases = [],
  evidence = [],
  currentlyAssignedRfids = [],
  onClose,
  onRegister,
}) {
  const [selectedCaseId, setSelectedCaseId] = useState('')
  const [form, setForm] = useState({
    name: '',
    type: 'Digital',
    description: '',
    rfid: '',
    status: 'Stored',
  })
  const [errors, setErrors] = useState({})
  const [successState, setSuccessState] = useState(null)

  const availableRfidOptions = useMemo(
    () => getAvailableRfidOptions(evidence).filter((tag) => !currentlyAssignedRfids.includes(tag)),
    [evidence, currentlyAssignedRfids],
  )

  const resetForm = () => {
    setSelectedCaseId('')
    setForm({
      name: '',
      type: 'Digital',
      description: '',
      rfid: '',
      status: 'Stored',
    })
    setErrors({})
    setSuccessState(null)
  }

  const closeOverlay = () => {
    resetForm()
    onClose?.()
  }

  const validateForm = () => {
    const nextErrors = {}

    if (!selectedCaseId) nextErrors.caseId = 'Please choose a case.'
    if (!form.name.trim()) nextErrors.name = 'Evidence name is required.'
    if (!form.type) nextErrors.type = 'Evidence type is required.'
    if (!form.rfid) nextErrors.rfid = 'RFID is required.'

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = () => {
    if (!validateForm()) return

    const generatedId = getNextEvidenceId(evidence)
    const nextRecord = {
      id: generatedId,
      caseId: selectedCaseId,
      name: form.name.trim(),
      type: form.type,
      description: form.description.trim(),
      rfid: form.rfid,
      status: form.status,
      registered: new Date().toISOString().slice(0, 10),
      createdAt: new Date().toISOString(),
    }

    setSuccessState(nextRecord)
    onRegister?.(nextRecord)
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[1px]"
      onClick={(event) => {
        if (event.target === event.currentTarget) closeOverlay()
      }}
    >
      <div className="w-full max-w-[760px] rounded-[22px] border border-[#dfe7ef] bg-white p-5 shadow-[0_20px_50px_rgba(15,23,42,0.18)]">
        {!successState ? (
          <>
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Evidence registration
                </p>
                <h3 className="mt-1 text-[1.7rem] font-semibold tracking-[-0.04em] text-slate-800">
                  Register Evidence
                </h3>
              </div>

              <button
                type="button"
                onClick={closeOverlay}
                className="flex h-8 w-8 items-center justify-center rounded-full text-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                aria-label="Close evidence registration"
              >
                ×
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Case ID <span className="text-[#dc2626]">*</span>
                </label>
                <select
                  value={selectedCaseId}
                  onChange={(event) => {
                    setSelectedCaseId(event.target.value)
                    setErrors((current) => ({ ...current, caseId: '' }))
                  }}
                  className="h-11 w-full rounded-xl border border-[#dfe7ef] bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-[#b9d1e8]"
                >
                  <option value="">Select Case</option>
                  {cases.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.id} — {item.title} — {item.caseType}
                    </option>
                  ))}
                </select>
                {errors.caseId && <p className="mt-1.5 text-xs text-[#dc2626]">{errors.caseId}</p>}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Evidence Name <span className="text-[#dc2626]">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(event) => {
                    setForm((current) => ({ ...current, name: event.target.value }))
                    setErrors((current) => ({ ...current, name: '' }))
                  }}
                  placeholder="Laptop Computer"
                  className="h-11 w-full rounded-xl border border-[#dfe7ef] bg-white px-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#b9d1e8]"
                />
                {errors.name && <p className="mt-1.5 text-xs text-[#dc2626]">{errors.name}</p>}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Evidence Type <span className="text-[#dc2626]">*</span>
                </label>
                <select
                  value={form.type}
                  onChange={(event) => {
                    setForm((current) => ({ ...current, type: event.target.value }))
                    setErrors((current) => ({ ...current, type: '' }))
                  }}
                  className="h-11 w-full rounded-xl border border-[#dfe7ef] bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-[#b9d1e8]"
                >
                  <option value="Digital">Digital</option>
                  <option value="Weapon">Weapon</option>
                  <option value="Biological">Biological</option>
                  <option value="Document">Document</option>
                  <option value="Physical">Physical</option>
                </select>
                {errors.type && <p className="mt-1.5 text-xs text-[#dc2626]">{errors.type}</p>}
              </div>

              <div className="md:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Description</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                  className="w-full rounded-xl border border-[#dfe7ef] bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#b9d1e8]"
                  placeholder="Optional details about chain of custody or evidence notes"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Assigned RFID <span className="text-[#dc2626]">*</span>
                </label>
                <select
                  value={form.rfid}
                  onChange={(event) => {
                    setForm((current) => ({ ...current, rfid: event.target.value }))
                    setErrors((current) => ({ ...current, rfid: '' }))
                  }}
                  className="h-11 w-full rounded-xl border border-[#dfe7ef] bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-[#b9d1e8]"
                >
                  <option value="">Select RFID</option>
                  {availableRfidOptions.length > 0 ? (
                    availableRfidOptions.map((tag) => (
                      <option key={tag} value={tag}>
                        {tag}
                      </option>
                    ))
                  ) : (
                    <option value="" disabled>No available RFID tags</option>
                  )}
                </select>
                {errors.rfid && <p className="mt-1.5 text-xs text-[#dc2626]">{errors.rfid}</p>}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Status</label>
                <select
                  value={form.status}
                  onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
                  className="h-11 w-full rounded-xl border border-[#dfe7ef] bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-[#b9d1e8]"
                >
                  <option value="Stored">Stored</option>
                  <option value="Checked Out">Checked Out</option>
                </select>
              </div>

              <div className="md:col-span-2 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Evidence ID</label>
                  <input
                    type="text"
                    readOnly
                    value={getNextEvidenceId(evidence)}
                    className="h-11 w-full rounded-xl border border-[#dfe7ef] bg-[#f8fafc] px-3 text-sm text-slate-500 outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Registered At</label>
                  <input
                    type="text"
                    readOnly
                    value={new Date().toISOString().slice(0, 10)}
                    className="h-11 w-full rounded-xl border border-[#dfe7ef] bg-[#f8fafc] px-3 text-sm text-slate-500 outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeOverlay}
                className="rounded-xl border border-[#dfe7ef] bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                className="rounded-xl bg-[#172c41] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#111f32]"
              >
                Register Evidence
              </button>
            </div>
          </>
        ) : (
          <div className="mx-auto max-w-md py-6 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#dff7ea] text-3xl text-[#1d8d5a]">
              ✓
            </div>
            <h3 className="text-2xl font-semibold text-slate-800">Evidence Registered</h3>
            <div className="mt-5 rounded-xl border border-[#dfe7ef] bg-[#f8fafc] p-4 text-left">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Evidence ID</p>
              <p className="mt-2 text-lg font-semibold text-slate-800">{successState.id}</p>
              <p className="mt-2 text-sm text-slate-500">Case: {successState.caseId}</p>
              <p className="mt-1 text-sm text-slate-500">RFID: {successState.rfid}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                resetForm()
                onClose?.()
              }}
              className="mt-6 rounded-xl bg-[#172c41] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#111f32]"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
