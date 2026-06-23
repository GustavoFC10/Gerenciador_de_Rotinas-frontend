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
          className="grid size-8 place-items-center rounded-lg border border-slate-300 bg-white text-slate-600 transition hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
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
