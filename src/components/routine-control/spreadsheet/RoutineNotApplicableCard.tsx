function RoutineNotApplicableCard() {
  return (
    <div
      className="mx-auto grid h-9 w-full select-none place-items-center"
      data-routine-applicability="not-applicable"
      aria-label="Não se aplica: rotina não vinculada à empresa"
    >
      <span
        className="h-0.5 w-5 rounded-full bg-[var(--color-applicability-empty-marker)]"
        aria-hidden="true"
      />
    </div>
  )
}

export default RoutineNotApplicableCard
