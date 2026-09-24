import { useMemo, useState } from 'react'

export default function AssignRfidOverlay({
  isOpen,
  evidence = [],
  availableRfids = [],
  onClose,
  onAssign,
}) {
  const [selectedEvidenceId, setSelectedEvidenceId] = useState('')
  const [selectedRfid, setSelectedRfid] = useState('')
  const [errors, setErrors] = useState({})
  const [successMessage, setSuccessMessage] = useState('')

  const selectedEvidence = useMemo(
    () => evidence.find((item) => item.id === selectedEvidenceId) || null,
    [evidence, selectedEvidenceId],
  )

  const resetState = () => {
    setSelectedEvidenceId('')
    setSelectedRfid('')
    setErrors({})
    setSuccessMessage('')
  }

  const closeOverlay = () => {
    resetState()
    onClose?.()
  }

  const handleAssign = () => {
    const nextErrors = {}

    if (!selectedEvidenceId) nextErrors.evidenceId = 'Select an evidence item.'
    if (!selectedRfid) nextErrors.rfid = 'Select an RFID tag.'

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    const success = onAssign?.(selectedEvidenceId, selectedRfid)
    if (success !== false) {
      setSuccessMessage(`${selectedRfid} assigned to ${selectedEvidence?.name || selectedEvidenceId}`)
      setTimeout(() => closeOverlay(), 1200)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[1px]"
      onClick={(event) => {
        if (event.target === event.currentTarget) closeOverlay()
      }}
    >
      <div className="w-full max-w-[520px] rounded-[22px] border border-[#dfe7ef] bg-white p-5 shadow-[0_20px_50px_rgba(15,23,42,0.18)]">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              Inventory
            </p>
            <h3 className="mt-1 text-[1.5rem] font-semibold tracking-[-0.04em] text-slate-800">
              Assign RFID
            </h3>
          </div>

          <button
            type="button"
            onClick={closeOverlay}
            className="flex h-8 w-8 items-center justify-center rounded-full text-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close RFID assignment"
          >
            ×
          </button>
        </div>

        {successMessage ? (
          <div className="rounded-xl border border-[#bbf7d0] bg-[#ecfdf5] p-4 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#22c55e] text-xl font-bold text-white">
              ✓
            </div>
            <p className="text-lg font-semibold text-slate-800">RFID Assigned</p>
            <p className="mt-2 text-sm text-slate-700">{successMessage}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Evidence</label>
              <select
                value={selectedEvidenceId}
                onChange={(event) => {
                  setSelectedEvidenceId(event.target.value)
                  setErrors((current) => ({ ...current, evidenceId: '' }))
                }}
                className="h-11 w-full rounded-xl border border-[#dfe7ef] bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-[#b9d1e8]"
              >
                <option value="">Select evidence</option>
                {evidence.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.id} — {item.name}
                  </option>
                ))}
              </select>
              {errors.evidenceId && <p className="mt-1.5 text-xs text-[#dc2626]">{errors.evidenceId}</p>}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">RFID</label>
              <select
                value={selectedRfid}
                onChange={(event) => {
                  setSelectedRfid(event.target.value)
                  setErrors((current) => ({ ...current, rfid: '' }))
                }}
                className="h-11 w-full rounded-xl border border-[#dfe7ef] bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-[#b9d1e8]"
              >
                <option value="">Select RFID tag</option>
                {availableRfids.length > 0 ? (
                  availableRfids.map((tag) => (
                    <option key={tag} value={tag}>
                      {tag} — Available
                    </option>
                  ))
                ) : (
                  <option value="" disabled>No RFID tags available</option>
                )}
              </select>
              {errors.rfid && <p className="mt-1.5 text-xs text-[#dc2626]">{errors.rfid}</p>}
            </div>

            <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeOverlay}
                className="rounded-xl border border-[#dfe7ef] bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAssign}
                className="rounded-xl bg-[#172c41] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#111f32]"
              >
                Assign RFID
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
