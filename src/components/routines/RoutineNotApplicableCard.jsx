function FiscalPlaceholder() {
  return (
    <span
      className="mx-auto block size-5 cursor-default rounded-full bg-slate-400 shadow-sm ring-4 ring-white"
      aria-hidden="true"
    />
  )
}

function AccountingPlaceholder() {
  return (
    <div className="flex h-9 w-full cursor-default items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-slate-100 px-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">
      <span
        className="size-1.5 rounded-full bg-slate-300"
        aria-hidden="true"
      />
      Não se aplica
    </div>
  )
}

function PersonnelPlaceholder() {
  return (
    <div className="relative flex h-10 w-full cursor-default items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-slate-100">
      <span
        className="absolute inset-y-0 left-0 w-1.5 bg-slate-300"
        aria-hidden="true"
      />
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
        Não se aplica
      </span>
    </div>
  )
}

const placeholderByDepartment = {
  'dept-fiscal': FiscalPlaceholder,
  'dept-accounting': AccountingPlaceholder,
  'dept-personnel': PersonnelPlaceholder,
}

function RoutineNotApplicableCard({ departmentId }) {
  const Placeholder =
    placeholderByDepartment[departmentId] ?? FiscalPlaceholder

  return (
    <div aria-label="Não se aplica" title="Não se aplica">
      <Placeholder />
    </div>
  )
}

export default RoutineNotApplicableCard
