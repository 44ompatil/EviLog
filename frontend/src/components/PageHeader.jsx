export default function PageHeader({ title, subtitle }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[#dfe7ef] bg-[#f3f6f8] p-3 sm:p-4 lg:p-5">
      <div>
        <h1 className="text-[2rem] font-semibold tracking-[-0.04em] text-slate-800">
          {title}
        </h1>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      </div>
    </div>
  )
}
