import { useMemo, useState } from 'react'
import CaseInformationForm from '../forms/CaseInformationForm'
import EvidenceForm from '../forms/EvidenceForm'
import ReviewCase from '../forms/ReviewCase'

const allRfidOptions = ['RFID-001', 'RFID-002', 'RFID-003', 'RFID-004', 'RFID-005', 'RFID-006']

function getCaseId() {
  const year = new Date().getFullYear()
  const random = Math.floor(Math.random() * 9000 + 1000)
  return `CSE-${year}-${random}`
}

function getEvidenceId(index) {
  const year = new Date().getFullYear()
  const serial = String(index + 1).padStart(4, '0')
  return `EVD-${year}-${serial}`
}

function getInitialEvidenceItem() {
  return {
    id: Date.now() + Math.random(),
    evidenceName: '',
    evidenceType: 'Physical',
    description: '',
    assignedRfid: '',
  }
}

function validateCaseData(data) {
  const errors = {}

  if (!data.title.trim()) errors.title = 'Case title is required.'
  if (!data.firNumber.trim()) errors.firNumber = 'FIR number is required.'
  if (!data.caseType) errors.caseType = 'Case type is required.'
  if (!data.status) errors.status = 'Status is required.'

  return errors
}

function validateEvidenceItem(item) {
  const errors = {}

  if (!item.evidenceName.trim()) errors.evidenceName = 'Evidence name is required.'
  if (!item.evidenceType) errors.evidenceType = 'Evidence type is required.'
  if (!item.assignedRfid) errors.assignedRfid = 'RFID assignment is required.'

  return errors
}

export default function RegisterCaseOverlay({
  isOpen,
  onClose,
  onCaseRegistered,
  onCaseSaved,
  mode = 'create',
  initialCaseData = null,
  initialEvidenceItems = [],
}) {
  const isEditMode = mode === 'edit'
  const workflowSteps = isEditMode
    ? ['Case Information']
    : ['Case Information', 'Evidence', 'Review & Register']
  const [step, setStep] = useState(1)
  const [caseData, setCaseData] = useState(() => ({
    id: initialCaseData?.id || '',
    title: initialCaseData?.title || '',
    firNumber: initialCaseData?.firNumber || '',
    caseType: initialCaseData?.caseType || initialCaseData?.type || '',
    status: initialCaseData?.status || 'Active',
    description: initialCaseData?.description || '',
  }))
  const [evidenceItems, setEvidenceItems] = useState(() => {
    if (!initialEvidenceItems.length) return [getInitialEvidenceItem()]

    return initialEvidenceItems.map((item, index) => ({
      id: item.id || item.evidenceId || `edit-evidence-${index}`,
      evidenceName: item.evidenceName || item.name || '',
      evidenceType: item.evidenceType || item.type || 'Physical',
      description: item.description || '',
      assignedRfid: item.assignedRfid || item.rfid || '',
      status: item.status || 'Stored',
      registeredAt: item.registeredAt || item.registered || new Date().toISOString().slice(0, 10),
      createdAt: item.createdAt || new Date().toISOString(),
    }))
  })
  const [caseErrors, setCaseErrors] = useState({})
  const [evidenceErrors, setEvidenceErrors] = useState([{}])
  const [successData, setSuccessData] = useState(null)

  const availableRfidOptionsByItem = useMemo(() => {
    return evidenceItems.map((item, itemIndex) => {
      const usedInOtherItems = evidenceItems.flatMap((entry, entryIndex) =>
        entryIndex !== itemIndex && entry.assignedRfid ? [entry.assignedRfid] : [],
      )

      return allRfidOptions.filter(
        (rfid) => rfid === item.assignedRfid || !usedInOtherItems.includes(rfid),
      )
    })
  }, [evidenceItems])

  const isCaseInfoValid = !Object.keys(validateCaseData(caseData)).length

  const validateCurrentEvidence = () => {
    const nextErrors = evidenceItems.map((item) => validateEvidenceItem(item))
    setEvidenceErrors(nextErrors)
    return nextErrors.every((itemErrors) => Object.keys(itemErrors).length === 0)
  }

  const handleFieldChange = (field, value) => {
    setCaseData((current) => ({ ...current, [field]: value }))
    setCaseErrors((current) => ({ ...current, [field]: '' }))
  }

  const handleEvidenceChange = (itemId, field, value) => {
    setEvidenceItems((current) =>
      current.map((item) => {
        if (item.id !== itemId) return item

        const updated = { ...item, [field]: value }

        if (field === 'assignedRfid') {
          setEvidenceErrors((existing) =>
            existing.map((error, index) => {
              if (index !== current.findIndex((entry) => entry.id === itemId)) return error
              return { ...error, assignedRfid: '' }
            }),
          )
        }

        return updated
      }),
    )
  }

  const handleAddEvidence = () => {
    setEvidenceItems((current) => [...current, getInitialEvidenceItem()])
    setEvidenceErrors((current) => [...current, {}])
  }

  const handleRemoveEvidence = (itemId) => {
    setEvidenceItems((current) => {
      if (current.length === 1) return current
      return current.filter((item) => item.id !== itemId)
    })

    setEvidenceErrors((current) => {
      if (current.length === 1) return current
      return current.filter((_, index) => index !== evidenceItems.findIndex((item) => item.id === itemId))
    })
  }

  const handleNext = () => {
    if (isEditMode) {
      const errors = validateCaseData(caseData)
      setCaseErrors(errors)
      if (Object.keys(errors).length > 0) return
      handleRegister()
      return
    }

    if (step === 1) {
      const errors = validateCaseData(caseData)
      setCaseErrors(errors)
      if (Object.keys(errors).length > 0) return
      setStep(2)
      return
    }

    if (step === 2) {
      const valid = validateCurrentEvidence()
      if (!valid) return
      setStep(3)
    }
  }

  const handlePrevious = () => {
    if (step > 1) setStep((current) => current - 1)
  }

  const handleRegister = () => {
    const caseInfoErrors = validateCaseData(caseData)

    if (Object.keys(caseInfoErrors).length > 0) {
      setCaseErrors(caseInfoErrors)
      setStep(1)
      return
    }

    if (isEditMode) {
      const payload = {
        caseData: {
          ...caseData,
          id: initialCaseData?.id,
          createdAt: initialCaseData?.createdAt || initialCaseData?.created,
          created: initialCaseData?.created || initialCaseData?.createdAt || new Date().toISOString().slice(0, 10),
          caseType: caseData.caseType,
        },
        evidenceItems: [],
      }

      onCaseSaved?.(payload)
      closeOverlay()
      return
    }

    const evidenceValid = validateCurrentEvidence()
    if (!evidenceValid) {
      setStep(2)
      return
    }

    const generatedCaseId = getCaseId()
    const generatedEvidenceIds = evidenceItems.map((_, index) => getEvidenceId(index))

    setSuccessData({
      caseId: generatedCaseId,
      evidenceCount: evidenceItems.length,
      evidenceIds: generatedEvidenceIds,
    })
    setStep(4)
  }

  const resetOverlay = () => {
    setStep(1)
    setCaseData({
      id: initialCaseData?.id || '',
      title: initialCaseData?.title || '',
      firNumber: initialCaseData?.firNumber || '',
      caseType: initialCaseData?.caseType || initialCaseData?.type || '',
      status: initialCaseData?.status || 'Active',
      description: initialCaseData?.description || '',
    })
    setEvidenceItems(() => {
      if (!initialEvidenceItems.length) return [getInitialEvidenceItem()]
      return initialEvidenceItems.map((item, index) => ({
        id: item.id || item.evidenceId || `edit-evidence-${index}`,
        evidenceName: item.evidenceName || item.name || '',
        evidenceType: item.evidenceType || item.type || 'Physical',
        description: item.description || '',
        assignedRfid: item.assignedRfid || item.rfid || '',
        status: item.status || 'Stored',
        registeredAt: item.registeredAt || item.registered || new Date().toISOString().slice(0, 10),
        createdAt: item.createdAt || new Date().toISOString(),
      }))
    })
    setCaseErrors({})
    setEvidenceErrors([{}])
    setSuccessData(null)
  }

  const closeOverlay = () => {
    resetOverlay()
    onClose()
  }

  const handleCaseRegistered = () => {
    if (!successData) return
    onCaseRegistered?.({
      id: successData.caseId,
      title: caseData.title,
      caseType: caseData.caseType,
      status: caseData.status,
      firNumber: caseData.firNumber,
      description: caseData.description,
      createdAt: new Date().toISOString(),
      created: new Date().toISOString().slice(0, 10),
      evidenceItems: evidenceItems.map((item, index) => ({
        ...item,
        id: successData.evidenceIds[index],
        evidenceId: successData.evidenceIds[index],
        evidenceName: item.evidenceName,
        evidenceType: item.evidenceType,
        description: item.description,
        assignedRfid: item.assignedRfid,
        status: item.status || 'Stored',
        registeredAt: new Date().toISOString().slice(0, 10),
      })),
    })
    closeOverlay()
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-3 backdrop-blur-[1px]"
      onClick={(event) => {
        if (event.target === event.currentTarget) closeOverlay()
      }}
    >
      <div className="w-full max-w-[1120px] overflow-hidden rounded-[20px] border border-[#dfe7ef] bg-white shadow-2xl">
        <div className="flex max-h-[92vh] flex-col">
          <div className="flex items-center justify-between border-b border-[#e9edf2] px-4 py-3 sm:px-5">
            <div className="flex items-center gap-3 overflow-x-auto pb-1">
              {workflowSteps.map((label, index) => {
                const currentStep = index + 1
                const isCurrent = step === currentStep
                const isCompleted = step > currentStep || step === 4

                return (
                  <div key={label} className="flex min-w-max items-center gap-2">
                    <div
                      className={`flex h-7 w-7 items-center justify-center rounded-full border text-[11px] font-bold ${
                        isCompleted
                          ? 'border-[#1a9d63] bg-[#e9f9f0] text-[#0d7a4f]'
                          : isCurrent
                            ? 'border-[#1a3d62] bg-[#12314d] text-white'
                            : 'border-[#dfe7ef] bg-[#f8fafc] text-slate-500'
                      }`}
                    >
                      {isCompleted ? '✓' : currentStep}
                    </div>
                    <span
                      className={`whitespace-nowrap text-sm ${
                        isCurrent ? 'font-semibold text-slate-800' : 'text-slate-500'
                      }`}
                    >
                      {label}
                    </span>
                  </div>
                )
              })}
            </div>

            <button
              type="button"
              onClick={closeOverlay}
              className="ml-3 flex h-8 w-8 items-center justify-center rounded-full text-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              aria-label="Close register case"
            >
              ×
            </button>
          </div>

          <div className="overflow-y-auto p-4 sm:p-5">
            {step === 1 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-semibold text-slate-800">
                    {isEditMode ? 'Edit Case' : 'Case Information'}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {isEditMode
                      ? 'Update the case information without changing its registered evidence.'
                      : 'Enter the basic case and FIR details.'}
                  </p>
                </div>

                <CaseInformationForm
                  formData={caseData}
                  onFieldChange={handleFieldChange}
                  errors={caseErrors}
                  systemValues={
                    isEditMode
                      ? {
                          caseId: initialCaseData?.id || caseData.id,
                          createdAt: initialCaseData?.createdAt || initialCaseData?.created,
                        }
                      : undefined
                  }
                />

                <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-between">
                  <button
                    type="button"
                    onClick={closeOverlay}
                    className="rounded-xl border border-[#dfe7ef] bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={!isCaseInfoValid}
                    className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition ${
                      isCaseInfoValid ? 'bg-[#172c41] hover:bg-[#111f32]' : 'cursor-not-allowed bg-slate-300'
                    }`}
                  >
                    {isEditMode ? 'Save Changes' : 'Next: Evidence →'}
                  </button>
                </div>
              </div>
            )}

            {!isEditMode && step === 2 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-semibold text-slate-800">Evidence</h2>
                  <p className="mt-1 text-sm text-slate-500">Add evidence items associated with this case.</p>
                </div>

                <EvidenceForm
                  evidenceItems={evidenceItems}
                  itemOptions={availableRfidOptionsByItem}
                  onEvidenceChange={handleEvidenceChange}
                  onAddEvidence={handleAddEvidence}
                  onRemoveEvidence={handleRemoveEvidence}
                  errors={evidenceErrors}
                />

                <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-between">
                  <button
                    type="button"
                    onClick={handlePrevious}
                    className="rounded-xl border border-[#dfe7ef] bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                  >
                    ← Back
                  </button>

                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={evidenceItems.length === 0}
                    className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition ${
                      evidenceItems.length > 0 ? 'bg-[#172c41] hover:bg-[#111f32]' : 'cursor-not-allowed bg-slate-300'
                    }`}
                  >
                    Next: Review →
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-semibold text-slate-800">Review Case</h2>
                  <p className="mt-1 text-sm text-slate-500">Review the case and evidence details before registration.</p>
                </div>

                <ReviewCase caseData={caseData} evidenceItems={evidenceItems} />

                <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-between">
                  <button
                    type="button"
                    onClick={handlePrevious}
                    className="rounded-xl border border-[#dfe7ef] bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                  >
                    ← Back
                  </button>

                  <button
                    type="button"
                    onClick={handleRegister}
                    className="rounded-xl bg-[#172c41] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#111f32]"
                  >
                    Register Case
                  </button>
                </div>
              </div>
            )}

            {step === 4 && successData && (
              <div className="flex min-h-[320px] items-center justify-center py-8">
                <div className="w-full max-w-md rounded-[20px] border border-[#dfe7ef] bg-[#f8fafc] p-6 text-center shadow-sm">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#dff7ea] text-3xl text-[#1d8d5a]">
                    ✓
                  </div>

                  <h2 className="text-2xl font-semibold text-slate-800">Case Registered</h2>

                  <div className="mt-5 rounded-xl border border-[#dfe7ef] bg-white px-3 py-4 text-left">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Case ID</p>
                    <p className="mt-2 text-lg font-semibold text-slate-800">{successData.caseId}</p>
                    <p className="mt-2 text-sm text-slate-500">{successData.evidenceCount} evidence item{successData.evidenceCount !== 1 ? 's' : ''} registered</p>
                  </div>

                  <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => {
                        resetOverlay()
                        onClose()
                      }}
                      className="flex-1 rounded-xl border border-[#dfe7ef] bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                    >
                      Register Another Case
                    </button>

                    <button
                      type="button"
                      onClick={handleCaseRegistered}
                      className="flex-1 rounded-xl bg-[#172c41] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#111f32]"
                    >
                      View Case
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
