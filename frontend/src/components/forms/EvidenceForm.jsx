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
          rows={3}
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

export default function EvidenceForm({
  evidenceItems,
  itemOptions,
  onEvidenceChange,
  onAddEvidence,
  onRemoveEvidence,
  errors,
}) {
  return (
    <div className="space-y-4">
      {evidenceItems.map((item, index) => (
        <div key={item.id} className="rounded-2xl border border-[#e8edf3] bg-[#f9fbfd] p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#e5f7ef] text-sm font-semibold text-[#166533]">
                {index + 1}
              </div>
              <span className="text-sm font-semibold text-slate-700">Evidence Item</span>
            </div>

            {evidenceItems.length > 1 && (
              <button
                type="button"
                onClick={() => onRemoveEvidence(item.id)}
                className="rounded-lg border border-[#e5e7eb] bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
              >
                Remove
              </button>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <TextInput
              label="Evidence Name"
              value={item.evidenceName}
              onChange={(value) => onEvidenceChange(item.id, 'evidenceName', value)}
              required
              placeholder="Laptop / Mobile / Bag"
              error={errors[index]?.evidenceName}
            />

            <DropdownField
              label="Evidence Type"
              value={item.evidenceType}
              onChange={(value) => onEvidenceChange(item.id, 'evidenceType', value)}
              required
              placeholder="Select type"
              options={['Physical', 'Digital', 'Document', 'Biometric']}
              error={errors[index]?.evidenceType}
            />
          </div>

          <div className="mt-4">
            <TextInput
              label="Description"
              value={item.description}
              onChange={(value) => onEvidenceChange(item.id, 'description', value)}
              placeholder="Add a short description"
              multiline
            />
          </div>

          <div className="mt-4">
            <DropdownField
              label="Assigned RFID"
              value={item.assignedRfid}
              onChange={(value) => onEvidenceChange(item.id, 'assignedRfid', value)}
              required
              placeholder="Select RFID"
              options={itemOptions[index]}
              error={errors[index]?.assignedRfid}
            />
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={onAddEvidence}
        className="inline-flex items-center gap-2 rounded-xl border border-dashed border-[#ccd8e5] bg-white px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
      >
        <span className="text-base leading-none">+</span>
        Add Another Evidence
      </button>
    </div>
  )
}
