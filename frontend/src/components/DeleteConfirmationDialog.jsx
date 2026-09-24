export default function DeleteConfirmationDialog({
  isOpen,
  title,
  message,
  itemLabel,
  confirmText = 'Delete',
  onCancel,
  onConfirm,
  onClose,
}) {
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[1px]"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose?.()
      }}
    >
      <div className="w-full max-w-md rounded-[22px] border border-[#dfe7ef] bg-white p-5 shadow-[0_20px_50px_rgba(15,23,42,0.18)]">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              Confirm deletion
            </p>
            <h3 className="mt-1 text-xl font-semibold text-slate-800">{title}</h3>
          </div>

          <button
            type="button"
            onClick={onClose || onCancel}
            className="flex h-8 w-8 items-center justify-center rounded-full text-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close confirmation"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          <p className="text-sm leading-6 text-slate-600">
            {message}{' '}
            {itemLabel && <span className="font-semibold text-slate-800">&ldquo;{itemLabel}&rdquo;</span>}
          </p>

          <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
            This action cannot be undone.
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl border border-[#dfe7ef] bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="rounded-xl border border-red-200 bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500"
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
