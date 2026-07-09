function FiscalPlaceholder() {
  return (
    <span
      className="mx-auto block size-5 cursor-default rounded-full bg-[var(--status-pending-dot)] shadow-[var(--shadow-panel)] ring-4 ring-[var(--color-table-bg)]"
      aria-hidden="true"
    />
  )
}

function AccountingPlaceholder() {
  return (
    <div className="flex h-9 w-full cursor-default items-center justify-center gap-1.5 rounded-[var(--radius-control)] border border-[var(--status-pending-border)] bg-[var(--status-pending-soft-bg)] px-2 text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-subtle)]">
      <span
        className="size-1.5 rounded-full bg-[var(--status-pending-dot)]"
        aria-hidden="true"
      />
      Nao se aplica
    </div>
  )
}

function PersonnelPlaceholder() {
  return (
    <div className="relative flex h-10 w-full cursor-default items-center justify-center overflow-hidden rounded-[var(--radius-control)] border border-[var(--status-pending-border)] bg-[var(--status-pending-soft-bg)]">
      <span
        className="absolute inset-y-0 left-0 w-1.5 bg-[var(--status-pending-dot)]"
        aria-hidden="true"
      />
      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-subtle)]">
        Nao se aplica
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
  const Placeholder = placeholderByDepartment[departmentId] ?? FiscalPlaceholder

  return (
    <div aria-label="Nao se aplica" title="Nao se aplica">
      <Placeholder />
    </div>
  )
}

export default RoutineNotApplicableCard
