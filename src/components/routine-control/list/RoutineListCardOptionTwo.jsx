import { routineStatusConfig } from '../../../constants/routineStatus.js'
import RoutineListExecutionPanel from './RoutineListExecutionPanel.jsx'
import RoutineListNoteField from './RoutineListNoteField.jsx'
import { formatShortDate, routineListStatusTone } from './routineListUtils.js'

function RoutineListCardOptionTwo({
  item,
  onOpen,
  onQuickAction,
  onNoteChange,
  onStatusChange,
  onStatusConfirm,
}) {
  const displayStatus = item.displayStatus ?? item.status
  const tone = routineListStatusTone[displayStatus]
  const statusConfig = routineStatusConfig[displayStatus]

  return (
    <article
      className={`relative flex min-w-0 flex-col overflow-hidden rounded-[var(--radius-panel)] border text-left shadow-[var(--shadow-panel)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-floating)] ${tone.card}`}
      data-list-card="tracking"
    >
      <div className={`absolute inset-y-0 left-0 w-1 ${tone.accent}`} />

      <div className="flex-1 p-4 pl-5">
        <button
          type="button"
          onClick={() => onOpen?.(item)}
          className="flex w-full items-start gap-3 rounded-md text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-control-focus)]"
          aria-label={`Abrir detalhes de ${item.primaryLabel ?? item.companyName}`}
        >
          <span
            className={`grid size-10 shrink-0 place-items-center rounded-[var(--radius-control)] text-xs font-extrabold ${tone.code}`}
          >
            {item.companyCode}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h4 className="line-clamp-2 text-sm font-bold leading-5 text-[var(--color-text-strong)]">
                {item.primaryLabel ?? item.companyName}
              </h4>
              <span
                className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-bold ${statusConfig.surfaceClass}`}
              >
                {statusConfig.label}
              </span>
            </div>
            <p className="mt-1 truncate text-xs text-[var(--color-text-muted)]">
              {item.routineName} · {item.departmentName} · {item.period}
            </p>
          </div>
        </button>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <MetaCell label="Prazo" value={formatShortDate(item.dueDate)} />
          <MetaCell label="Responsável" value={item.assigneeName} />
        </div>

        <details
          className="group mt-3 rounded-[var(--radius-control)] border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)]"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <summary className="flex min-h-9 cursor-pointer list-none items-center gap-2 px-2.5 text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-control-focus)] [&::-webkit-details-marker]:hidden">
            <NoteIcon />
            <span className="font-bold text-[var(--color-text-strong)]">
              Contexto
            </span>
            <span className="min-w-0 flex-1 truncate text-[var(--color-text-muted)]">
              {item.notes || 'Sem observações'}
            </span>
            <ChevronIcon />
          </summary>
          <div className="border-t border-[var(--color-divider)] p-2">
            <RoutineListNoteField
              item={item}
              onChange={onNoteChange}
              rows={2}
              placeholder="Observação complementar..."
              className={tone.field}
            />
          </div>
        </details>
      </div>

      <footer className="border-t border-[var(--color-divider)] bg-[var(--color-panel-bg)] px-3 py-2.5">
        <RoutineListExecutionPanel
          item={item}
          onQuickAction={onQuickAction}
          onStatusChange={onStatusChange}
          onStatusConfirm={onStatusConfirm}
        />
      </footer>
    </article>
  )
}

function MetaCell({ label, value }) {
  return (
    <div className="min-w-0 rounded-[var(--radius-control)] bg-[var(--color-panel-bg)] px-2.5 py-2 ring-1 ring-[var(--color-panel-border)]">
      <span className="block text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--color-text-subtle)]">
        {label}
      </span>
      <span className="mt-0.5 block truncate text-xs font-bold text-[var(--color-text-strong)]">
        {value}
      </span>
    </div>
  )
}

function NoteIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-3.5 shrink-0 text-[var(--color-text-muted)]"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        d="M5 5.5h14v13H8l-3 2v-15Z"
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
      className="size-3.5 shrink-0 text-[var(--color-text-subtle)] transition group-open:rotate-180"
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

export default RoutineListCardOptionTwo
