import { ROUTINE_LIST_PRESENTATION } from './routineListUtils.js'

const viewOptions = [
  {
    id: ROUTINE_LIST_PRESENTATION.OPERATIONAL,
    label: 'Opção 1 · Fila compacta',
    shortLabel: 'Fila compacta',
    description: 'A visualização operacional atual',
  },
  {
    id: ROUTINE_LIST_PRESENTATION.TRACKING,
    label: 'Opção 2 · Acompanhamento',
    shortLabel: 'Acompanhamento',
    description: 'Cards contextuais organizados por macrofluxo',
  },
  {
    id: ROUTINE_LIST_PRESENTATION.LEDGER,
    label: 'Opção 3 · Registro operacional',
    shortLabel: 'Registro',
    description: 'Linhas densas para comparar e executar rapidamente',
  },
]

function RoutineListViewSwitcher({ value, onChange }) {
  const selectedOption =
    viewOptions.find((option) => option.id === value) ?? viewOptions[0]

  return (
    <details className="group relative">
      <summary
        className="inline-flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-[var(--radius-control)] border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] px-3 text-sm font-bold text-[var(--color-text-muted)] shadow-[var(--shadow-panel)] transition marker:hidden hover:bg-[var(--color-control-hover-bg)] hover:text-[var(--color-text-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-control-focus)]"
        aria-label="Trocar visualização da lista"
        title="Visualização da lista"
      >
        <LayoutIcon />
        <span className="hidden sm:inline">{selectedOption.shortLabel}</span>
        <ChevronIcon />
      </summary>

      <div className="absolute right-0 z-30 mt-1 w-72 rounded-[var(--radius-control)] border border-[var(--color-list-border)] bg-[var(--color-list-panel-bg)] p-1 shadow-[var(--shadow-floating)]">
        {viewOptions.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={(event) => {
              onChange?.(option.id)
              event.currentTarget.closest('details')?.removeAttribute('open')
            }}
            className={`block w-full rounded-[var(--radius-control)] px-3 py-2 text-left transition ${
              selectedOption.id === option.id
                ? 'bg-[var(--color-brand-soft)] text-[var(--color-brand)]'
                : 'text-[var(--color-text-muted)] hover:bg-[var(--color-control-hover-bg)] hover:text-[var(--color-text-strong)]'
            }`}
            aria-current={selectedOption.id === option.id ? 'true' : undefined}
          >
            <span className="block text-xs font-bold">{option.label}</span>
            <span className="mt-0.5 block text-[10px] opacity-80">
              {option.description}
            </span>
          </button>
        ))}
      </div>
    </details>
  )
}

function LayoutIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-4"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        d="M4 5h16v14H4zM4 10h16M10 10v9"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ChevronIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-3.5 transition group-open:rotate-180"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        d="m7 9.5 5 5 5-5"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default RoutineListViewSwitcher
