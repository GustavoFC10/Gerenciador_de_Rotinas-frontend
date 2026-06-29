const actionLabels = {
  attach: 'Anexar arquivo',
}

function PaperclipIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-4"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        d="m8 12.5 6.8-6.8a3 3 0 1 1 4.2 4.2l-8.5 8.5a5 5 0 0 1-7.1-7.1l8.1-8.1"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

function RoutineListQuickActions({
  item,
  actions = ['attach'],
  onAction,
  align = 'end',
}) {
  return (
    <div
      className={`flex flex-wrap gap-1.5 ${
        align === 'start' ? 'justify-start' : 'justify-end'
      }`}
      aria-label="Acoes rapidas"
    >
      {actions.map((action) => (
        <button
          key={action}
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onAction?.(item, action)
          }}
          className="grid size-8 place-items-center rounded-[var(--radius-control)] border border-[var(--color-control-border)] bg-[var(--color-control-bg)] text-[var(--color-text-muted)] transition hover:border-[var(--color-control-focus)] hover:bg-[var(--color-control-hover-bg)] hover:text-[var(--color-text-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-control-focus)]"
          aria-label={actionLabels[action]}
          title={actionLabels[action]}
        >
          <PaperclipIcon />
        </button>
      ))}
    </div>
  )
}

export default RoutineListQuickActions
