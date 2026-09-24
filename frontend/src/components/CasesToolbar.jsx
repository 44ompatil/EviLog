export default function CasesToolbar({
  onRegisterCase,
  placeholder = 'Search case ID, RFID, title...',
  showRegisterButton = true,
  buttonLabel = 'Register Case',
  value = '',
  onSearchChange,
  filterLabel = 'Filter',
  isFilterOpen = false,
  onToggleFilter,
  filterButton,
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-[#dfe7ef] bg-[#f3f6f8] p-3 sm:p-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="relative w-full max-w-xl">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
        >
          <circle cx="11" cy="11" r="5.5" />
          <path d="m16 16 4.5 4.5" />
        </svg>
        <input
          type="text"
          value={value}
          onChange={(event) => onSearchChange?.(event.target.value)}
          placeholder={placeholder}
          className="h-11 w-full rounded-xl border border-[#dfe7ef] bg-white pl-10 pr-3 text-sm text-slate-700 outline-none ring-0 placeholder:text-slate-400 focus:border-[#b9d1e8]"
        />
      </div>

      <div className="relative flex items-center gap-3 self-end lg:self-auto">
        {filterButton && (
          <div className="relative">
            <button
              type="button"
              onClick={onToggleFilter}
              className="inline-flex items-center gap-2 rounded-xl border border-[#dfe7ef] bg-white px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
                <path d="M4 6h16M7 12h10M10 18h4" />
              </svg>
              {filterLabel}
            </button>

            {filterButton({ isOpen: isFilterOpen })}
          </div>
        )}

        {showRegisterButton && (
          <button
            type="button"
            onClick={onRegisterCase}
            className="inline-flex items-center gap-2 rounded-xl bg-[#1f5e52] px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#174d45]"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
              <path d="M12 5v14M5 12h14" />
            </svg>
            {buttonLabel}
          </button>
        )}
      </div>
    </div>
  )
}
