import { focusRing } from '../../constants/designTokens'

export interface CreationStep {
  id: string
  label: string
  description?: string
}

interface CreationProgressProps {
  steps: CreationStep[]
  currentStep: number
  onStepSelect?: (step: number) => void
}

function CreationProgress({
  steps,
  currentStep,
  onStepSelect,
}: CreationProgressProps) {
  return (
    <nav aria-label="Progresso do cadastro">
      <ol className="grid gap-2 sm:grid-cols-3">
        {steps.map((step, index) => {
          const isCurrent = index === currentStep
          const isComplete = index < currentStep
          const canSelect = Boolean(onStepSelect && isComplete)
          const content = (
            <>
              <span
                className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-black ${
                  isCurrent
                    ? 'bg-[var(--color-button-primary-bg)] text-[var(--color-button-primary-text)]'
                    : isComplete
                      ? 'bg-[var(--status-completed-bg)] text-[var(--status-completed-text)] ring-1 ring-[var(--status-completed-border)]'
                      : 'bg-[var(--color-panel-soft-bg)] text-[var(--color-text-muted)] ring-1 ring-[var(--color-divider)]'
                }`}
                aria-hidden="true"
              >
                {isComplete ? <CheckIcon /> : index + 1}
              </span>
              <span className="min-w-0 text-left">
                <span
                  className={`block text-sm font-bold ${
                    isCurrent
                      ? 'text-[var(--color-text-strong)]'
                      : 'text-[var(--color-text-muted)]'
                  }`}
                >
                  {step.label}
                </span>
                {step.description && (
                  <span className="mt-0.5 hidden text-xs leading-4 text-[var(--color-text-muted)] lg:block">
                    {step.description}
                  </span>
                )}
              </span>
            </>
          )

          return (
            <li key={step.id}>
              {canSelect ? (
                <button
                  type="button"
                  onClick={() => onStepSelect?.(index)}
                  className={`flex min-h-14 w-full items-center gap-3 rounded-[var(--radius-control)] border border-[var(--color-divider)] bg-[var(--color-panel-bg)] px-3 py-2 hover:bg-[var(--color-control-hover-bg)] ${focusRing}`}
                  aria-label={`Voltar para ${step.label}`}
                >
                  {content}
                </button>
              ) : (
                <div
                  className={`flex min-h-14 items-center gap-3 rounded-[var(--radius-control)] border px-3 py-2 ${
                    isCurrent
                      ? 'border-[var(--color-control-focus)] bg-[var(--color-brand-soft)]'
                      : 'border-[var(--color-divider)] bg-[var(--color-panel-bg)]'
                  }`}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  {content}
                </div>
              )}
            </li>
          )
        })}
      </ol>
      <p className="sr-only" aria-live="polite">
        Etapa {currentStep + 1} de {steps.length}: {steps[currentStep]?.label}
      </p>
    </nav>
  )
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m4 10 3.5 3.5L16 5.5" />
    </svg>
  )
}

export default CreationProgress
