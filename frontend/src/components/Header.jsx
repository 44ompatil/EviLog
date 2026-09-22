export default function Header() {
  return (
    <header className="flex items-center justify-between gap-4 border-b border-[#dfe7ef] pb-4 sm:pb-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-[-0.03em] text-slate-800 sm:text-[2.1rem]">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-slate-500 sm:text-base">
          Overview of evidence and station activity
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Notifications"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#dfe7ef] bg-white text-slate-500 transition-colors hover:bg-slate-50"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
            <path d="M15 17h5l-1.4-1.4A2.1 2.1 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5" />
            <path d="M10 20a2 2 0 0 0 4 0" />
          </svg>
        </button>

        <div className="flex items-center gap-3 rounded-xl border border-[#dfe7ef] bg-white px-2 py-1.5 shadow-sm">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#2b3d4f] text-sm font-semibold text-white">
            A
          </div>
          <div className="hidden min-w-0 sm:block">
            <div className="text-sm font-semibold text-slate-800">Administrator</div>
          </div>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4 text-slate-400">
            <path d="m9 6 6 6-6 6" />
          </svg>
        </div>
      </div>
    </header>
  )
}
