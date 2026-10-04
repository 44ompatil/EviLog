import { useEffect, useRef, useState } from 'react'

function DropdownField({ label, value, options, onChange, required, error, placeholder }) {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
        {label}
        {required && <span className="ml-1 text-[#d64545]">*</span>}
      </label>

      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          className={`flex w-full items-center justify-between rounded-xl border bg-white px-3 py-2.5 text-sm text-left shadow-sm transition ${
            error ? 'border-red-300' : 'border-[#dfe7ef] focus:border-[#b9d1e8]'
          }`}
        >
          <span className={value ? 'text-slate-700' : 'text-slate-400'}>{value || placeholder}</span>
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4 text-slate-500">
            <path d="m5 7.5 5 5 5-5" />
          </svg>
        </button>

        {isOpen && (
          <div className="absolute left-0 right-0 z-50 mt-2 overflow-hidden rounded-xl border border-[#dfe7ef] bg-white shadow-xl">
            {options.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  onChange(option)
                  setIsOpen(false)
                }}
                className={`block w-full px-3 py-2.5 text-left text-sm transition ${
                  value === option ? 'bg-slate-100 font-medium text-slate-800' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && <p className="text-xs font-medium text-red-500">{error}</p>}
    </div>
  )
}

function TextInput({ label, value, onChange, required, placeholder, error, multiline = false }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
        {label}
        {required && <span className="ml-1 text-[#d64545]">*</span>}
      </label>

      {multiline ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          rows={4}
          className={`w-full rounded-xl border bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 ${
            error ? 'border-red-300' : 'border-[#dfe7ef] focus:border-[#b9d1e8]'
          }`}
        />
      ) : (
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className={`w-full rounded-xl border bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 ${
            error ? 'border-red-300' : 'border-[#dfe7ef] focus:border-[#b9d1e8]'
          }`}
        />
      )}

      {error && <p className="text-xs font-medium text-red-500">{error}</p>}
    </div>
  )
}

export default function CaseInformationForm({ formData, onFieldChange, errors, systemValues }) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <TextInput
          label="Case Title"
          value={formData.title}
          onChange={(value) => onFieldChange('title', value)}
          required
          placeholder="Vehicle Theft"
          error={errors.title}
        />

        <TextInput
          label="FIR Number"
          value={formData.firNumber}
          onChange={(value) => onFieldChange('firNumber', value)}
          required
          placeholder="FIR-001"
          error={errors.firNumber}
        />

        <DropdownField
          label="Case Type"
          value={formData.caseType}
          onChange={(value) => onFieldChange('caseType', value)}
          required
          placeholder="Select type"
          options={['Traffic', 'Burglary', 'Fraud', 'Cyber', 'Drug', 'Violence']}
          error={errors.caseType}
        />

        <DropdownField
          label="Status"
          value={formData.status}
          onChange={(value) => onFieldChange('status', value)}
          required
          placeholder="Select status"
          options={['Active', 'Under Review', 'Pending Lab', 'Closed']}
          error={errors.status}
        />
      </div>

      <TextInput
        label="Description"
        value={formData.description}
        onChange={(value) => onFieldChange('description', value)}
        placeholder="Enter a brief description of the case"
        multiline
      />

      <div className="rounded-xl border border-[#e8edf3] bg-[#f8fbfd] p-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              Case ID
            </p>
            <div className="rounded-lg border border-[#e8edf3] bg-white px-3 py-2 text-sm text-slate-500">
              {systemValues?.caseId || 'System-generated'}
            </div>
          </div>

          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              Created At
            </p>
            <div className="rounded-lg border border-[#e8edf3] bg-white px-3 py-2 text-sm text-slate-500">
              {systemValues?.createdAt || 'System-generated'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
