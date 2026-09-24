export default function FilterPopover({
  isOpen,
  title,
  options = [],
  groups = [],
  selectedValue,
  onSelect,
  onClear,
  onClose,
}) {
  if (!isOpen) return null

  const renderedOptions = groups.length
    ? groups
    : [{ label: '', options, selectedValue, onSelect }]

  return (
    <div className="absolute right-0 z-20 mt-2 w-[330px] rounded-2xl border border-[#dfe7ef] bg-white p-3 shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">{title}</p>
        {onClear && (
          <button type="button" onClick={onClear} className="text-xs font-medium text-sky-700 hover:text-sky-800">
            Clear
          </button>
        )}
      </div>

      <div className="space-y-3">
        {renderedOptions.map((group, index) => (
          <div key={group.label || `group-${index}`} className="space-y-2">
            {group.label && (
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">{group.label}</p>
            )}
            <div className="flex flex-wrap gap-2">
              {(group.options || []).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    group.onSelect ? group.onSelect(option) : onSelect?.(option)
                    onClose?.()
                  }}
                  className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                    (group.selectedValue ?? selectedValue) === option
                      ? 'border-sky-200 bg-sky-50 text-sky-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
