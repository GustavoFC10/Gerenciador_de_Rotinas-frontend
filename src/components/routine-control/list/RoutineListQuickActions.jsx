const actionLabels = {
  attach: 'Anexar arquivo',
}

const actionShortLabels = {
  attach: 'Anexar',
}

function getActionCount(item, action) {
  if (action === 'attach') return item.indicators?.attachments ?? 0
  return 0
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
  showLabels = false,
  showCounts = false,
}) {
  return (
    <div
      className={`flex flex-wrap gap-1.5 ${
        align === 'start' ? 'justify-start' : 'justify-end'
      }`}
      aria-label="Acoes rapidas"
    >
      {actions.map((action) => {
        const count = getActionCount(item, action)

        return (
          <button
            key={action}
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              onAction?.(item, action)
            }}
            className={`relative inline-flex min-h-8 items-center justify-center gap-1.5 rounded-[var(--radius-control)] border border-[var(--color-control-border)] bg-[var(--color-control-bg)] text-sm font-semibold text-[var(--color-text-muted)] transition hover:border-[var(--color-control-focus)] hover:bg-[var(--color-control-hover-bg)] hover:text-[var(--color-text-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-control-focus)] ${
              showLabels ? 'px-2.5' : 'size-8'
            }`}
            aria-label={actionLabels[action]}
            title={actionLabels[action]}
          >
            <PaperclipIcon />
            {showLabels && (
              <span className="text-xs">{actionShortLabels[action]}</span>
            )}
            {showCounts && count > 0 && !showLabels && (
              <span className="absolute -right-1.5 -top-1.5 grid min-w-4 place-items-center rounded-full bg-[var(--color-brand)] px-1 text-[9px] font-bold leading-4 text-white ring-2 ring-[var(--color-list-muted-bg)]">
                {count}
              </span>
            )}
            {showCounts && count > 0 && showLabels && (
              <span className="rounded-full bg-[var(--color-brand-soft)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--color-brand)]">
                {count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export default RoutineListQuickActions
