import { useEffect, useMemo, useRef, useState } from 'react'

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

export default function OfficerRegistrationOverlay({
  isOpen,
  officers = [],
  onClose,
  onAddOfficer,
}) {
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
  const videoRef = useRef(null)
  const streamRef = useRef(null)

  const currentSampleName = sampleSequence[Math.min(sampleIndex, sampleSequence.length - 1)]
  const totalCaptured = useMemo(
    () => Object.values(capturedSamples).filter(Boolean).length,
    [capturedSamples],
  )
  const isEnrollmentReady = totalCaptured >= sampleSequence.length

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
    stopCamera()
  }

  const closeRegister = () => {
    stopCamera()
    setFaceEnrollmentOpen(false)
    setCameraError('')
    setEnrollmentSuccess(false)
    setRegistrationSucceeded(false)
    setRegisteredOfficer(null)
    onClose?.()
  }

  useEffect(() => {
    if (!isOpen) return
    resetRegistrationState()
  }, [isOpen])

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

  const getNextOfficerId = () => {
    const extracted = officers
      .map((officer) => Number(String(officer.id).replace(/\D/g, '')))
      .filter((value) => Number.isFinite(value))

    const maxNumber = extracted.length ? Math.max(...extracted) : 703
    return `OF-${maxNumber + 1}`
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

  const handleCompleteEnrollment = () => {
    if (!isEnrollmentReady) return

    setFaceAuthenticated(true)
    setEnrollmentSuccess(true)
    setFaceEnrollmentOpen(false)
    stopCamera()
  }

  const handleRegisterOfficer = () => {
    if (!validateForm()) return

    const generatedId = getNextOfficerId()
    const timestamp = new Date()
    const nextOfficer = {
      id: generatedId,
      name: form.name.trim(),
      badgeNumber: form.badgeNumber.trim(),
      role: form.role,
      faceAuthentication: faceAuthenticated ? 'Enrolled' : 'Not Enrolled',
      status: form.status,
      registered: timestamp.toLocaleDateString('en-CA'),
      createdAt: timestamp.toISOString(),
    }

    onAddOfficer?.(nextOfficer)
    setRegisteredOfficer(nextOfficer)
    setRegistrationSucceeded(true)
  }

  if (!isOpen) return null

  return (
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
                  value={registeredOfficer ? registeredOfficer.id : 'SYSTEM-GENERATED'}
                  readOnly
                  className="h-11 w-full rounded-xl border border-[#dfe7ef] bg-[#f8fafc] px-3 text-sm text-slate-500 outline-none"
                />
              </div>

              <div className="sm:col-span-1">
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Registered At</label>
                <input
                  type="text"
                  value={registeredOfficer ? registeredOfficer.registered : 'SYSTEM-GENERATED'}
                  readOnly
                  className="h-11 w-full rounded-xl border border-[#dfe7ef] bg-[#f8fafc] px-3 text-sm text-slate-500 outline-none"
                />
              </div>
            </div>

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
                className="inline-flex items-center gap-2 rounded-xl bg-[#12263d] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0f1f32]"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Register Officer
              </button>
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-[420px] rounded-[18px] border border-[#bbf7d0] bg-[#ecfdf5] p-5 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#22c55e] text-xl font-bold text-white">
              ✓
            </div>
            <h3 className="text-[1.4rem] font-semibold text-slate-800">Officer Registered</h3>
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
                onClick={() => {
                  setRegistrationSucceeded(false)
                  setRegisteredOfficer(null)
                  resetRegistrationState()
                }}
                className="rounded-xl border border-[#1f5e52] bg-[#1f5e52] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#174d45]"
              >
                Register Another Officer
              </button>
              <button
                type="button"
                onClick={closeRegister}
                className="rounded-xl bg-[#12263d] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0f1f32]"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>

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
                    }}
                    className="mt-4 rounded-xl border border-[#dfe7ef] bg-white px-3 py-2 text-sm font-medium text-slate-700"
                  >
                    Try Again
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="min-h-[280px] w-full rounded-[14px] object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-slate-900/75 to-transparent p-3 text-[12px] font-medium text-white">
                    <span>{currentSampleName}</span>
                    <span>{Math.min(sampleIndex + 1, sampleSequence.length)}/{sampleSequence.length}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-5 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  stopCamera()
                  setFaceEnrollmentOpen(false)
                  setCameraError('')
                  setEnrollmentSuccess(false)
                }}
                className="rounded-xl border border-[#dfe7ef] bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                Cancel
              </button>

              {isEnrollmentReady ? (
                <button
                  type="button"
                  onClick={handleCompleteEnrollment}
                  className="rounded-xl bg-[#12263d] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0f1f32]"
                >
                  Continue
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
