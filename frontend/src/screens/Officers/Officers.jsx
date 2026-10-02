import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import CasesToolbar from '../../components/CasesToolbar'
import DeleteConfirmationDialog from '../../components/DeleteConfirmationDialog'
import FilterPopover from '../../components/FilterPopover'
import StatusPill from '../../components/StatusPill'
import Table from '../../components/Table'

const faceAuthStyles = {
  Enrolled: 'border-[#bbf7d0] bg-[#ecfdf5] text-[#15803d]',
  'Not Enrolled': 'border-[#dfe7ef] bg-[#f3f4f6] text-[#475569]',
  'Needs Update': 'border-[#fed7aa] bg-[#fff7ed] text-[#c2410c]',
}

const sampleSequence = ['Front Profile', 'Left Profile', 'Right Profile']
const roleOptions = ['Constable', 'Head Constable', 'Assistant Sub-Inspector', 'Sub-Inspector', 'Inspector']
const statusOptions = ['Active', 'Inactive', 'Suspended']

function createEmptyForm() {
  return {
    name: '',
    badgeNumber: '',
    role: 'Constable',
    status: 'Active',
  }
}

function fieldClass(hasError) {
  return `h-11 w-full rounded-xl border bg-white px-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 ${
    hasError ? 'border-[#ef4444] focus:border-[#ef4444]' : 'border-[#dfe7ef] focus:border-[#b9d1e8]'
  }`
}

function DropdownField({ label, value, options, open, setOpen, onChange, required, placeholder, error }) {
  return (
    <div className="relative">
      <label className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="ml-1 text-[#dc2626]">*</span>}
      </label>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`${fieldClass(Boolean(error))} flex items-center justify-between pr-10 text-left`}
      >
        <span className={value ? 'text-slate-700' : 'text-slate-400'}>{value || placeholder}</span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          className={`h-4 w-4 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="absolute left-0 right-0 z-20 mt-2 rounded-xl border border-[#dfe7ef] bg-white p-1.5 shadow-lg">
          {options.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                onChange(option)
                setOpen(false)
              }}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${
                value === option ? 'bg-[#edf3f7] text-slate-800' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span>{option}</span>
              {value === option && (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 text-[#1f5e52]">
                  <path d="m5 12 4 4 10-10" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
      {error && <p className="mt-1.5 text-xs text-[#dc2626]">{error}</p>}
    </div>
  )
}

export default function Officers({
  officers = [],
  openRegisterSignal = false,
  onRegisterSignalConsumed,
  onAddOfficer,
  onUpdateOfficer,
  onDeleteOfficer,
  onEnrollFace,
  onPrepareFace,
  onCancelFace,
  transactions = [],
  alerts = [],
  openEntitySignal,
  onOpenEntity,
}) {
  const navigate = useNavigate()
  const officersList = officers
  const [activeOfficerId, setActiveOfficerId] = useState(null)
  const [registerOpen, setRegisterOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editingOfficerId, setEditingOfficerId] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [form, setForm] = useState(createEmptyForm)
  const [errors, setErrors] = useState({})
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false)
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false)
  const [faceAuthenticated, setFaceAuthenticated] = useState(false)
  const [faceEnrollmentOpen, setFaceEnrollmentOpen] = useState(false)
  const [enrollmentSuccess, setEnrollmentSuccess] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [sampleIndex, setSampleIndex] = useState(0)
  const [capturedSamples, setCapturedSamples] = useState({})
  const [registrationSucceeded, setRegistrationSucceeded] = useState(false)
  const [registeredOfficer, setRegisteredOfficer] = useState(null)
  const [preparedOfficerId, setPreparedOfficerId] = useState(null)
  const [search, setSearch] = useState('')
  const [selectedRole, setSelectedRole] = useState('All')
  const [selectedStatus, setSelectedStatus] = useState('All')
  const [selectedFaceAuth, setSelectedFaceAuth] = useState('All')
  const [filterOpen, setFilterOpen] = useState(null)
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isPreparingEnrollment, setIsPreparingEnrollment] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const videoRef = useRef(null)
  const streamRef = useRef(null)

  useEffect(() => {
    if (openRegisterSignal) {
      const frame = requestAnimationFrame(() => setRegisterOpen(true))
      onRegisterSignalConsumed?.()
      return () => cancelAnimationFrame(frame)
    }
  }, [openRegisterSignal, onRegisterSignalConsumed])

  useEffect(() => {
    if (openEntitySignal?.type !== 'officer') return undefined
    const frame = requestAnimationFrame(() => setActiveOfficerId(openEntitySignal.id))
    return () => cancelAnimationFrame(frame)
  }, [openEntitySignal])

  const officerRoleOptions = useMemo(
    () => Array.from(new Set(officersList.map((officer) => officer.role))).filter(Boolean),
    [officersList],
  )

  const faceAuthOptions = ['All', 'Enrolled', 'Not Enrolled', 'Needs Update']
  const filteredOfficers = useMemo(() => {
    const query = search.trim().toLowerCase()

    return officersList.filter((officer) => {
      const matchesSearch =
        query.length === 0 ||
        [officer.id, officer.name, officer.badgeNumber, officer.role].join(' ').toLowerCase().includes(query)

      const matchesRole = selectedRole === 'All' || officer.role === selectedRole
      const matchesStatus = selectedStatus === 'All' || officer.status === selectedStatus
      const matchesFaceAuth = selectedFaceAuth === 'All' || officer.faceAuthentication === selectedFaceAuth

      return matchesSearch && matchesRole && matchesStatus && matchesFaceAuth
    })
  }, [officersList, search, selectedRole, selectedStatus, selectedFaceAuth])

  const totalCaptured = useMemo(
    () => Object.values(capturedSamples).filter(Boolean).length,
    [capturedSamples],
  )

  const currentSampleName = sampleSequence[Math.min(sampleIndex, sampleSequence.length - 1)]
  const isEnrollmentReady = totalCaptured >= sampleSequence.length

  const closeDetails = () => setActiveOfficerId(null)

  const selectedOfficer = useMemo(
    () => officersList.find((officer) => officer.id === activeOfficerId) || null,
    [officersList, activeOfficerId],
  )

  const recentActivity = useMemo(() => {
    if (!selectedOfficer) return []
    const transactionEntries = transactions
      .filter((entry) => entry.officerId === selectedOfficer.id)
      .map((entry, index) => ({
        action: entry.action,
        evidenceId: entry.evidenceId === 'unknown' ? '—' : entry.evidenceId,
        timestamp: entry.timestamp,
        sortTime: entry.timestamp,
        key: `${entry.transactionId}-${index}`,
      }))
    const alertEntries = alerts
      .filter((entry) => entry.officerId === selectedOfficer.id)
      .map((entry) => ({
        action: `Security alert: ${entry.title}`,
        evidenceId: entry.evidenceId === 'unknown' ? '—' : entry.evidenceId,
        timestamp: new Date(entry.timestamp).toLocaleString(),
        sortTime: entry.timestamp,
        key: `alert-${entry.id}`,
      }))
    return [...transactionEntries, ...alertEntries]
      .sort((left, right) => new Date(right.sortTime) - new Date(left.sortTime))
  }, [selectedOfficer, transactions, alerts])

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

  const resetRegistrationState = () => {
    if (preparedOfficerId) void Promise.resolve(onCancelFace?.(preparedOfficerId)).catch(() => {})
    setForm(createEmptyForm())
    setErrors({})
    setFaceAuthenticated(false)
    setFaceEnrollmentOpen(false)
    setEnrollmentSuccess(false)
    setCameraError('')
    setSampleIndex(0)
    setCapturedSamples({})
    setRegistrationSucceeded(false)
    setRegisteredOfficer(null)
    setPreparedOfficerId(null)
    setFormError('')
    setIsEditMode(false)
    setEditingOfficerId(null)
    stopCamera()
  }

  const closeRegister = () => {
    setRegisterOpen(false)
    resetRegistrationState()
  }

  useEffect(() => {
    return () => stopCamera()
  }, [])

  useEffect(() => {
    if (!faceEnrollmentOpen) {
      stopCamera()
      return
    }

    let isActive = true

    const startCamera = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Camera access is unavailable on this browser or device.')
        return
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: false,
        })

        if (!isActive) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }

        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
        setCameraError('')
      } catch (error) {
        if (!isActive) return
        if (error && error.name === 'NotAllowedError') {
          setCameraError('Camera permission was denied. Please allow camera access and try again.')
        } else {
          setCameraError('Unable to access the camera. Please check your browser permissions and try again.')
        }
      }
    }

    startCamera()

    return () => {
      isActive = false
      stopCamera()
    }
  }, [faceEnrollmentOpen])

  const handleInputChange = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: '' }))
    setFormError('')
  }

  const validateForm = () => {
    const nextErrors = {}

    if (!form.name.trim()) nextErrors.name = 'Officer Name is required.'
    if (!form.badgeNumber.trim()) nextErrors.badgeNumber = 'Badge Number is required.'
    if (!form.role) nextErrors.role = 'Role is required.'
    if (!form.status) nextErrors.status = 'Status is required.'

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleCaptureSample = () => {
    const video = videoRef.current

    if (!video || !video.videoWidth || !video.videoHeight) {
      setCameraError('The live camera is not ready yet. Please wait a moment and try again.')
      return
    }

    const canvas = document.createElement('canvas')
    const width = video.videoWidth
    const height = video.videoHeight
    canvas.width = width
    canvas.height = height

    const context = canvas.getContext('2d')
    context.drawImage(video, 0, 0, width, height)

    const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
    const sampleName = currentSampleName

    setCapturedSamples((current) => ({
      ...current,
      [sampleName]: dataUrl,
    }))

    if (sampleIndex < sampleSequence.length - 1) {
      setSampleIndex((current) => current + 1)
    }
  }

  const handleCompleteEnrollment = async () => {
    if (!isEnrollmentReady) return

    if (isEditMode && editingOfficerId) {
      try {
        await onEnrollFace?.(editingOfficerId, {
          front_profile: capturedSamples['Front Profile'],
          left_profile: capturedSamples['Left Profile'],
          right_profile: capturedSamples['Right Profile'],
        })
      } catch (error) {
        setFormError(error.message || 'Unable to save face enrollment.')
        return
      }
      setFaceAuthenticated(true)
      setEnrollmentSuccess(true)
      setFaceEnrollmentOpen(false)
      stopCamera()
      return
    }

    setIsPreparingEnrollment(true)
    setFormError('')
    try {
      const enrollment = await onPrepareFace?.({
        'Front Profile': capturedSamples['Front Profile'],
        'Left Profile': capturedSamples['Left Profile'],
        'Right Profile': capturedSamples['Right Profile'],
      })
      if (!enrollment?.enrolled || !enrollment?.officer_id) {
        throw new Error('Face enrollment was not confirmed by the server.')
      }
      if (preparedOfficerId && preparedOfficerId !== enrollment.officer_id) {
        void Promise.resolve(onCancelFace?.(preparedOfficerId)).catch(() => {})
      }
      setPreparedOfficerId(enrollment.officer_id)
      setFaceAuthenticated(true)
      setEnrollmentSuccess(true)
      setFaceEnrollmentOpen(false)
      stopCamera()
    } catch (error) {
      if (!preparedOfficerId) {
        setPreparedOfficerId(null)
        setFaceAuthenticated(false)
        setSampleIndex(0)
        setCapturedSamples({})
      }
      setFaceEnrollmentOpen(false)
      stopCamera()
      setFormError(error.message || 'Unable to enroll these face samples.')
    } finally {
      setIsPreparingEnrollment(false)
    }
  }

  const handleRegisterOfficer = async () => {
    if (isSubmitting) return
    if (!validateForm()) return
    if (!isEditMode && (!faceAuthenticated || !preparedOfficerId)) {
      setFormError('Complete face enrollment before registering this officer.')
      return
    }
    setFormError('')
    setIsSubmitting(true)
    const values = { ...form, name: form.name.trim(), badgeNumber: form.badgeNumber.trim() }
    try {
      if (isEditMode && editingOfficerId) {
        const existing = officersList.find((officer) => officer.id === editingOfficerId)
        const result = await onUpdateOfficer?.({ ...existing, ...values })
        if (result?.faceError) {
          setFormError(`Officer details saved, but face enrollment failed: ${result.faceError}`)
          return
        }
        closeRegister()
        return
      }
      const result = await onAddOfficer?.({ ...values }, null, preparedOfficerId)
      const registered = result?.officer || result
      if (result?.faceError) setFormError(`Officer registered, but face enrollment failed: ${result.faceError}`)
      setRegisteredOfficer(registered)
      setPreparedOfficerId(null)
      setRegistrationSucceeded(true)
    } catch (error) {
      setFormError(error.message || 'Unable to save officer details.')
    } finally {
      setIsSubmitting(false)
    }
    setRegisterOpen(true)
  }

  const handleRegisterAnotherOfficer = () => {
    setRegistrationSucceeded(false)
    setRegisteredOfficer(null)
    resetRegistrationState()
    setRegisterOpen(true)
  }

  const handleViewOfficer = () => {
    if (registeredOfficer) {
      setActiveOfficerId(registeredOfficer.id)
    }
    navigate('/officers')
    closeRegister()
  }

  const openOfficerEditor = (officer) => {
    setIsEditMode(true)
    setEditingOfficerId(officer.id)
    setForm({
      name: officer.name,
      badgeNumber: officer.badgeNumber,
      role: officer.role,
      status: officer.status,
    })
    setFaceAuthenticated(officer.faceAuthentication === 'Enrolled')
    setFaceEnrollmentOpen(false)
    setRegistrationSucceeded(false)
    setRegisteredOfficer(null)
    setRegisterOpen(true)
  }

  const handleDeleteOfficer = (officerId) => {
    const selected = officersList.find((officer) => officer.id === officerId)
    setDeleteTarget(selected || null)
  }

  const confirmOfficerDelete = async () => {
    if (!deleteTarget) return
    setFormError('')
    setIsDeleting(true)
    try {
      await onDeleteOfficer?.(deleteTarget.id)
      setDeleteTarget(null)
    } catch (error) {
      setFormError(error.message || 'Unable to delete officer.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="w-full bg-[#f3f6f8]">
      <CasesToolbar
        placeholder="Search officer ID, name, badge number..."
        value={search}
        onSearchChange={setSearch}
        buttonLabel="Register Officer"
        filterLabel="Filter"
        isFilterOpen={filterOpen !== null}
        onToggleFilter={() => setFilterOpen((current) => (current ? null : 'role'))}
        onRegisterCase={() => {
          resetRegistrationState()
          setRegisterOpen(true)
        }}
        filterButton={({ isOpen }) => (
          <FilterPopover
            isOpen={isOpen}
            title="Officer filters"
            groups={[
              {
                label: 'Role',
                options: ['All', ...officerRoleOptions],
                selectedValue: selectedRole,
                onSelect: (value) => {
                  setSelectedRole(value)
                  setFilterOpen(null)
                },
              },
              {
                label: 'Status',
                options: ['All', ...statusOptions],
                selectedValue: selectedStatus,
                onSelect: (value) => {
                  setSelectedStatus(value)
                  setFilterOpen(null)
                },
              },
              {
                label: 'Face Authentication',
                options: faceAuthOptions,
                selectedValue: selectedFaceAuth,
                onSelect: (value) => {
                  setSelectedFaceAuth(value)
                  setFilterOpen(null)
                },
              },
            ]}
            onClear={() => {
              setSelectedRole('All')
              setSelectedStatus('All')
              setSelectedFaceAuth('All')
              setFilterOpen(null)
            }}
            onClose={() => setFilterOpen(null)}
          />
        )}
      />

      <div className="p-3 sm:p-4 lg:p-5">
        <Table
          columns={columns({
            setActiveOfficerId,
            faceAuthStyles,
            onEditOfficer: openOfficerEditor,
            onDeleteOfficer: handleDeleteOfficer,
          })}
          rows={filteredOfficers}
          rowKey={(row) => row.id}
          minWidth="980px"
        />
      </div>

      {selectedOfficer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4 backdrop-blur-[1px]"
          onClick={(event) => {
            if (event.target === event.currentTarget) closeDetails()
          }}
        >
          <div className="max-h-[92vh] w-full max-w-[1200px] overflow-y-auto rounded-[22px] border border-slate-200 bg-[#f3f6f8] p-4 shadow-[0_20px_50px_rgba(15,23,42,0.18)] sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3 rounded-t-[18px] border-b border-[#dfe7ef] bg-white px-3 py-3">
              <div className="flex items-center gap-3">
                <span className="text-[1.1rem] font-semibold text-slate-800">Officer Details</span>
                <span className="text-[1.1rem] font-medium text-slate-600">{selectedOfficer.id}</span>
                <StatusPill status={selectedOfficer.status} />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openOfficerEditor(selectedOfficer)}
                  className="rounded-xl border border-[#dfe7ef] bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteOfficer(selectedOfficer.id)}
                  className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                >
                  Delete
                </button>
                <div className="mx-1 h-5 w-px bg-slate-200" />
                <button
                  type="button"
                  onClick={closeDetails}
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-[#dfe7ef] bg-white text-lg text-slate-400 transition hover:bg-slate-50 hover:text-slate-600"
                  aria-label="Close officer details"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="rounded-[18px] border border-[#dfe7ef] bg-white p-4 sm:p-5">
              <div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                Officer Information
              </div>

              <div className="grid gap-0 border border-[#dfe7ef]">
                <div className="grid grid-cols-1 divide-y divide-[#dfe7ef] md:grid-cols-2 md:divide-x md:divide-y-0">
                  <div className="p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Officer ID</p>
                    <p className="mt-2 text-base font-semibold text-slate-800">{selectedOfficer.id}</p>
                  </div>
                  <div className="p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Officer Name</p>
                    <p className="mt-2 text-base font-semibold text-slate-800">{selectedOfficer.name}</p>
                  </div>
                  <div className="p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Badge Number</p>
                    <p className="mt-2 text-base font-semibold text-slate-800">{selectedOfficer.badgeNumber}</p>
                  </div>
                  <div className="p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Role</p>
                    <p className="mt-2 text-base font-semibold text-slate-800">{selectedOfficer.role}</p>
                  </div>
                  <div className="p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Status</p>
                    <div className="mt-2">
                      <StatusPill status={selectedOfficer.status} />
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Registered At</p>
                    <p className="mt-2 text-base font-semibold text-slate-800">{selectedOfficer.registered}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-[18px] border border-[#dfe7ef] bg-white p-4">
              <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                Face Authentication
              </div>

              <div className={`flex flex-col gap-3 rounded-xl border border-[#dfe7ef] px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${selectedOfficer.faceAuthentication === 'Enrolled' ? 'bg-[#eafae9]' : 'bg-[#f8fafc]'}`}>
                <div className="flex items-center gap-3">
                  <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full border ${selectedOfficer.faceAuthentication === 'Enrolled' ? 'border-[#bbf7d0] bg-[#ecfdf5] text-[#15803d]' : 'border-[#dfe7ef] bg-white text-slate-500'}`}>
                    {selectedOfficer.faceAuthentication === 'Enrolled' ? '✓' : '—'}
                  </span>
                  <div>
                    <div className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${faceAuthStyles[selectedOfficer.faceAuthentication] || faceAuthStyles['Not Enrolled']}`}>
                      {selectedOfficer.faceAuthentication}
                    </div>
                    <p className="mt-2 text-sm text-slate-600">
                      {selectedOfficer.faceAuthentication === 'Enrolled' ? 'Officer can authenticate at EviLog hardware.' : 'Face authentication has not been enrolled for this officer.'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => openOfficerEditor(selectedOfficer)}
                  className="rounded-xl border border-[#dfe7ef] bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Manage Face Authentication
                </button>
              </div>
            </div>

            <div className="mt-4 rounded-[18px] border border-[#dfe7ef] bg-white p-4">
              <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                Recent Activity
              </div>

              <div className="overflow-hidden rounded-xl border border-[#dfe7ef]">
                <div className="grid grid-cols-[1.2fr_1fr_1fr] gap-0 bg-[#f8fafc] text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  <div className="border-r border-[#dfe7ef] p-3">Action</div>
                  <div className="border-r border-[#dfe7ef] p-3">Evidence ID</div>
                  <div className="p-3">Timestamp</div>
                </div>

                {recentActivity.map((entry) => (
                  <div key={entry.key} className="grid grid-cols-[1.2fr_1fr_1fr] border-t border-[#dfe7ef] bg-white text-sm text-slate-700">
                    <div className="p-3 font-medium text-slate-700">{entry.action}</div>
                    <div className="border-l border-[#dfe7ef] p-3">
                      {entry.evidenceId === '—' ? (
                        <span className="text-slate-400">—</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onOpenEntity?.('evidence', entry.evidenceId)}
                          className="font-semibold text-[#1f5ea8] underline-offset-2 hover:underline"
                        >
                          {entry.evidenceId}
                        </button>
                      )}
                    </div>
                    <div className="border-l border-[#dfe7ef] p-3">{entry.timestamp}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <DeleteConfirmationDialog
          isOpen={Boolean(deleteTarget)}
          title="Delete Officer?"
          message="Are you sure you want to delete"
          itemLabel={deleteTarget.name}
          errorMessage={formError}
          isSubmitting={isDeleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={confirmOfficerDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}

      {registerOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/30 p-4 backdrop-blur-[1px]">
          <div className="w-full max-w-[760px] rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_20px_50px_rgba(15,23,42,0.18)] sm:p-5 lg:p-6">
            {!registrationSucceeded ? (
              <div className="mx-auto max-w-[620px]">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Officer information
                    </p>
                    <h3 className="mt-1 text-[1.7rem] font-semibold tracking-[-0.04em] text-slate-800">
                      Register Officer
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={closeRegister}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                    aria-label="Close register officer"
                  >
                    ×
                  </button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-1">
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Officer Name <span className="text-[#dc2626]">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(event) => handleInputChange('name', event.target.value)}
                      placeholder="Rahul Gandhi"
                      className={fieldClass(Boolean(errors.name))}
                    />
                    {errors.name && <p className="mt-1.5 text-xs text-[#dc2626]">{errors.name}</p>}
                  </div>

                  <div className="sm:col-span-1">
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Badge Number <span className="text-[#dc2626]">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.badgeNumber}
                      onChange={(event) => handleInputChange('badgeNumber', event.target.value)}
                      placeholder="6767"
                      className={fieldClass(Boolean(errors.badgeNumber))}
                    />
                    {errors.badgeNumber && <p className="mt-1.5 text-xs text-[#dc2626]">{errors.badgeNumber}</p>}
                  </div>

                  <div className="sm:col-span-1">
                    <DropdownField
                      label="Role"
                      value={form.role}
                      options={roleOptions}
                      open={roleDropdownOpen}
                      setOpen={setRoleDropdownOpen}
                      onChange={(value) => handleInputChange('role', value)}
                      required
                      placeholder="Select role"
                      error={errors.role}
                    />
                  </div>

                  <div className="sm:col-span-1">
                    <DropdownField
                      label="Status"
                      value={form.status}
                      options={statusOptions}
                      open={statusDropdownOpen}
                      setOpen={setStatusDropdownOpen}
                      onChange={(value) => handleInputChange('status', value)}
                      required
                      placeholder="Select status"
                      error={errors.status}
                    />
                  </div>

                  <div className="sm:col-span-1">
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Officer ID</label>
                    <input
                      type="text"
                      value={isEditMode && editingOfficerId ? editingOfficerId : preparedOfficerId || (registeredOfficer ? registeredOfficer.id : 'SYSTEM-GENERATED')}
                      readOnly
                      className="h-11 w-full rounded-xl border border-[#dfe7ef] bg-[#f8fafc] px-3 text-sm text-slate-500 outline-none"
                    />
                  </div>

                  <div className="sm:col-span-1">
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Registered At</label>
                    <input
                      type="text"
                      value={
                        isEditMode && editingOfficerId
                          ? officersList.find((officer) => officer.id === editingOfficerId)?.registered || 'SYSTEM-GENERATED'
                          : registeredOfficer
                            ? registeredOfficer.registered
                            : 'SYSTEM-GENERATED'
                      }
                      readOnly
                      className="h-11 w-full rounded-xl border border-[#dfe7ef] bg-[#f8fafc] px-3 text-sm text-slate-500 outline-none"
                    />
                  </div>
                </div>

                {formError && <p className="mt-3 text-sm text-red-600" role="alert">{formError}</p>}

                <div className="mt-5 rounded-[16px] border border-[#e2e8f0] bg-[#f8fafc] p-4">
                  <div className="mb-3 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Face Authentication
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                    <span
                      className={`inline-flex items-center justify-center rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-none tracking-[0.02em] ${
                        faceAuthenticated ? faceAuthStyles.Enrolled : faceAuthStyles['Not Enrolled']
                      }`}
                    >
                      {faceAuthenticated ? 'Enrolled' : 'Not Enrolled'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setFaceEnrollmentOpen(true)
                        setCameraError('')
                      }}
                      className="inline-flex items-center justify-center rounded-xl border border-[#dfe7ef] bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      {faceAuthenticated ? 'Update Face Authentication' : 'Set Up Face Authentication'}
                    </button>
                  </div>
                  <p className="mt-3 text-xs text-slate-500">
                    Face enrollment uses the station camera to create the officer&apos;s authentication profile.
                  </p>
                </div>

                <div className="mt-5 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={closeRegister}
                    className="rounded-xl border border-[#dfe7ef] bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleRegisterOfficer}
                    disabled={isSubmitting || (!isEditMode && (!faceAuthenticated || !preparedOfficerId))}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#12263d] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0f1f32] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                    {isSubmitting ? 'Saving…' : isEditMode ? 'Save Changes' : 'Register Officer'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="mx-auto max-w-[420px] rounded-[18px] border border-[#bbf7d0] bg-[#ecfdf5] p-5 text-center shadow-sm">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#22c55e] text-xl font-bold text-white">
                  ✓
                </div>
                <h3 className="text-[1.4rem] font-semibold text-slate-800">Officer Registered</h3>
                {formError && <p className="mt-3 text-sm text-red-600" role="alert">{formError}</p>}
                <div className="mt-4 space-y-2 text-sm text-slate-700">
                  <p>
                    <span className="font-medium text-slate-600">Officer ID:</span> {registeredOfficer.id}
                  </p>
                  <p>
                    <span className="font-medium text-slate-600">Face Authentication:</span>{' '}
                    {registeredOfficer.faceAuthentication}
                  </p>
                </div>

                <div className="mt-6 flex flex-col gap-2.5">
                  <button
                    type="button"
                    onClick={handleRegisterAnotherOfficer}
                    className="rounded-xl border border-[#1f5e52] bg-[#1f5e52] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#174d45]"
                  >
                    Register Another Officer
                  </button>
                  <button
                    type="button"
                    onClick={handleViewOfficer}
                    className="rounded-xl bg-[#12263d] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0f1f32]"
                  >
                    View Officer
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {faceEnrollmentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4">
          <div className="w-full max-w-[520px] rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_18px_60px_rgba(15,23,42,0.2)]">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-[1.8rem] font-semibold tracking-[-0.04em] text-slate-800">Face Enrollment</h3>
              <button
                type="button"
                onClick={() => {
                  stopCamera()
                  setFaceEnrollmentOpen(false)
                  setCameraError('')
                  setEnrollmentSuccess(false)
                }}
                className="flex h-8 w-8 items-center justify-center rounded-full text-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                aria-label="Close face enrollment"
              >
                ×
              </button>
            </div>

            <div className="mb-3 text-sm text-slate-600">
              <span className="font-medium text-slate-700">Capture the {currentSampleName}</span>
            </div>

            <div className="mb-4 text-[13px] font-medium uppercase tracking-[0.08em] text-slate-500">
              Sample {Math.min(sampleIndex + 1, sampleSequence.length)} of {sampleSequence.length}
            </div>

            <div className="relative overflow-hidden rounded-[18px] border border-[#dfe7ef] bg-[#0f172a] p-3">
              {cameraError ? (
                <div className="flex min-h-[280px] flex-col items-center justify-center rounded-[14px] border border-dashed border-slate-300 bg-[#f8fafc] p-5 text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-xl text-red-600">
                    !
                  </div>
                  <p className="max-w-xs text-sm text-slate-700">{cameraError}</p>
                  <button
                    type="button"
                    onClick={() => {
                      stopCamera()
                      setCameraError('')
                      setFaceEnrollmentOpen(false)
                      requestAnimationFrame(() => setFaceEnrollmentOpen(true))
                    }}
                    className="mt-4 rounded-xl border border-[#dfe7ef] bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    Retry Camera
                  </button>
                </div>
              ) : (
                <video ref={videoRef} autoPlay playsInline muted className="h-[280px] w-full rounded-[14px] object-cover" />
              )}
            </div>

            <div className="mt-4 space-y-2">
              {sampleSequence.map((sample, index) => {
                const captured = Boolean(capturedSamples[sample])
                return (
                  <div
                    key={sample}
                    className={`flex items-center justify-between rounded-xl border px-3 py-2.5 ${
                      captured ? 'border-[#bbf7d0] bg-[#ecfdf5]' : 'border-[#dfe7ef] bg-[#f8fafc]'
                    }`}
                  >
                    <div className="flex items-center gap-3 text-sm font-medium text-slate-700">
                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                          captured ? 'bg-[#22c55e] text-white' : 'bg-white text-slate-500'
                        }`}
                      >
                        {captured ? '✓' : index + 1}
                      </span>
                      <span>{sample}</span>
                    </div>
                    <span className={`text-[11px] font-semibold uppercase tracking-[0.08em] ${captured ? 'text-[#15803d]' : 'text-slate-500'}`}>
                      {captured ? 'Captured' : 'Pending'}
                    </span>
                  </div>
                )
              })}
            </div>

            {isEnrollmentReady && !enrollmentSuccess && (
              <div className="mt-4 rounded-xl border border-[#bbf7d0] bg-[#ecfdf5] p-3 text-center">
                <div className="mb-1 flex justify-center text-lg text-[#15803d]">✓</div>
                <div className="text-sm font-medium text-slate-800">Face profile ready</div>
                <div className="mt-1 text-xs text-[#15803d]">All 3 samples captured</div>
              </div>
            )}

            <div className="mt-5 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  stopCamera()
                  setFaceEnrollmentOpen(false)
                  setCameraError('')
                  setSampleIndex(0)
                  setCapturedSamples({})
                  setEnrollmentSuccess(false)
                  setFaceAuthenticated(false)
                }}
                className="rounded-xl border border-[#dfe7ef] bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                Cancel
              </button>

              {isEnrollmentReady ? (
                <button
                  type="button"
                  onClick={handleCompleteEnrollment}
                  disabled={isPreparingEnrollment}
                  className="rounded-xl bg-[#12263d] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0f1f32]"
                >
                  {isPreparingEnrollment ? 'Enrolling…' : 'Continue'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCaptureSample}
                  disabled={!currentSampleName}
                  className="rounded-xl bg-[#12263d] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0f1f32] disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  Capture Sample
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const columns = ({ setActiveOfficerId, faceAuthStyles, onEditOfficer, onDeleteOfficer }) => [
  {
    key: 'id',
    label: 'Officer ID',
    headerClass: 'pl-4',
    cellClass: 'font-semibold text-[#1f5ea8] align-middle',
    render: (row) => (
      <button
        type="button"
        onClick={() => setActiveOfficerId(row.id)}
        className="underline-offset-2 transition hover:text-[#163d70] hover:underline"
      >
        {row.id}
      </button>
    ),
  },
  {
    key: 'name',
    label: 'Officer Name',
    cellClass: 'font-medium text-slate-800',
  },
  {
    key: 'badgeNumber',
    label: 'Badge No.',
    cellClass: 'text-slate-700',
  },
  { key: 'role', label: 'Role', cellClass: 'text-slate-600' },
  {
    key: 'faceAuthentication',
    label: 'Face Authentication',
    render: (row) => (
      <span
        className={`inline-flex items-center justify-center rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-none tracking-[0.02em] ${
          faceAuthStyles[row.faceAuthentication] || 'bg-slate-100 text-slate-700 border-slate-200'
        }`}
      >
        {row.faceAuthentication}
      </span>
    ),
  },
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
          onClick={() => onEditOfficer(row)}
          className="inline-flex items-center justify-center rounded-md border border-[#dfe7ef] bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Edit
        </button>
        <button
          type="button"
          aria-label={`Delete ${row.id}`}
          onClick={() => onDeleteOfficer(row.id)}
          className="inline-flex items-center justify-center rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-100"
        >
          Delete
        </button>
      </div>
    ),
  },
]
