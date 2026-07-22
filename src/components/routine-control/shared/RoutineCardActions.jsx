import {
  ROUTINE_STATUS,
  routineStatusConfig,
} from '../../../constants/routineStatus.js'
import { getRoutineAttachments } from '../details/routineDetailsUtils.js'
import RoutineStatusIcon from './RoutineStatusIcon.jsx'

const selectableStatusOrder = [
  ROUTINE_STATUS.PENDING,
  ROUTINE_STATUS.IN_PROGRESS,
  ROUTINE_STATUS.ERROR,
  ROUTINE_STATUS.NO_MOVEMENT,
  ROUTINE_STATUS.COMPLETED,
  ROUTINE_STATUS.NOT_APPLICABLE,
]

const selectableStatusEntries = selectableStatusOrder.map((status) => [
  status,
  routineStatusConfig[status],
])

function RoutineCardActions({
  task,
  onStatusChange,
  onNotesChange,
  className = '',
}) {
  return (
    <div className={`space-y-3 ${className}`}>
      <RoutineStatusControl
        task={task}
        onStatusChange={onStatusChange}
        variant="strip"
      />
      <RoutineNotesPanel task={task} onNotesChange={onNotesChange} />
    </div>
  )
}

export function RoutineAttachmentButton({
  task,
  onAttachmentAdd,
  label = 'Anexar arquivo',
  compact = false,
}) {
  return (
    <button
      type="button"
      onClick={() => onAttachmentAdd?.(task)}
      className={`inline-flex items-center gap-1.5 rounded-[var(--radius-control)] border border-[var(--color-control-border)] bg-[var(--color-control-bg)] font-semibold text-[var(--color-text-muted)] transition hover:border-[var(--color-control-focus)] hover:bg-[var(--color-control-hover-bg)] hover:text-[var(--color-text-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-control-focus)] ${
        compact ? 'min-h-8 px-2.5 text-xs' : 'min-h-9 px-3 text-sm'
      }`}
    >
      <PaperclipIcon />
      {label}
    </button>
  )
}

export function RoutineAttachmentsPanel({
  task,
  onAttachmentAdd,
  variant = 'list',
  title = 'Anexos',
  description,
  className = '',
}) {
  const attachments = getRoutineAttachments(task)
  const attachmentCount = attachments.length
  const isGallery = variant === 'gallery'
  const isEmbedded = variant === 'embedded'

  return (
    <section
      className={`${
        isEmbedded
          ? ''
          : 'overflow-hidden rounded-[var(--radius-control)] border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)]'
      } ${className}`}
      aria-labelledby={`attachments-title-${task.id}`}
    >
      <header
        className={`flex items-center justify-between gap-3 ${
          isEmbedded
            ? 'mb-2'
            : 'min-h-11 border-b border-[var(--color-divider)] bg-[var(--color-panel-soft-bg)] px-3 py-2'
        }`}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3
              id={`attachments-title-${task.id}`}
              className="text-sm font-bold text-[var(--color-text-strong)]"
            >
              {title}
            </h3>
            <span className="rounded-full bg-[var(--color-brand-soft)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--color-brand)]">
              {attachmentCount}
            </span>
          </div>
          {description && (
            <p className="mt-0.5 truncate text-[11px] text-[var(--color-text-muted)]">
              {description}
            </p>
          )}
        </div>

        <RoutineAttachmentButton
          task={task}
          onAttachmentAdd={onAttachmentAdd}
          label="Anexar"
          compact
        />
      </header>

      <div className={isEmbedded ? '' : isGallery ? 'p-3' : 'p-2.5'}>
        {attachmentCount > 0 ? (
          <div
            className={`grid gap-2 ${
              isGallery
                ? 'grid-cols-2 sm:grid-cols-3'
                : 'grid-cols-1 sm:grid-cols-2'
            }`}
          >
            {attachments.map((attachment, index) => (
              <AttachmentTile
                key={attachment.id}
                attachment={attachment}
                index={index}
                variant={variant}
              />
            ))}
          </div>
        ) : (
          <AttachmentEmptyState variant={variant} />
        )}
      </div>
    </section>
  )
}

export function RoutineNotesPanel({
  task,
  onNotesChange,
  variant = 'panel',
  title = 'Observações',
  description,
  rows = 3,
  className = '',
}) {
  const isEmbedded = variant === 'embedded'
  const isCallout = variant === 'callout'

  return (
    <section
      className={`${
        isEmbedded
          ? ''
          : isCallout
            ? 'rounded-[var(--radius-control)] border border-dashed border-[var(--color-panel-border)] bg-[var(--color-panel-soft-bg)] p-3'
            : 'rounded-[var(--radius-control)] border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] p-3'
      } ${className}`}
      aria-labelledby={`notes-title-${task.id}`}
    >
      <div className="mb-2 flex items-start gap-2">
        <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-[var(--color-panel-soft-bg)] text-[var(--color-text-muted)]">
          <NoteIcon />
        </span>
        <div className="min-w-0">
          <h3
            id={`notes-title-${task.id}`}
            className="text-sm font-bold text-[var(--color-text-strong)]"
          >
            {title}
          </h3>
          {description && (
            <p className="text-[11px] text-[var(--color-text-muted)]">
              {description}
            </p>
          )}
        </div>
      </div>
      <textarea
        value={task.notes ?? ''}
        rows={rows}
        onChange={(event) => onNotesChange?.(task.id, event.target.value)}
        aria-label="Observações da rotina"
        placeholder="Adicione contexto apenas quando necessário..."
        className="w-full resize-none rounded-[var(--radius-control)] border border-[var(--color-control-border)] bg-[var(--color-control-bg)] px-3 py-2 text-sm leading-5 text-[var(--color-control-text)] outline-none transition placeholder:text-[var(--color-control-placeholder)] focus:border-[var(--color-control-focus)] focus:ring-2 focus:ring-[var(--color-focus-ring)]"
      />
    </section>
  )
}

export function RoutineStatusControl({
  task,
  onStatusChange,
  variant = 'menu',
  className = '',
}) {
  const currentStatus =
    routineStatusConfig[task.status] ??
    routineStatusConfig[ROUTINE_STATUS.PENDING]

  if (variant === 'grouped') {
    const groups = [
      {
        label: 'Execução',
        statuses: [
          ROUTINE_STATUS.PENDING,
          ROUTINE_STATUS.IN_PROGRESS,
          ROUTINE_STATUS.COMPLETED,
        ],
      },
      {
        label: 'Exceções',
        statuses: [
          ROUTINE_STATUS.ERROR,
          ROUTINE_STATUS.NO_MOVEMENT,
          ROUTINE_STATUS.NOT_APPLICABLE,
        ],
      },
    ]

    return (
      <fieldset className={`min-w-0 border-0 p-0 ${className}`}>
        <legend className="text-xs font-extrabold uppercase tracking-[0.12em] text-[var(--color-text-subtle)]">
          Estado
        </legend>
        <div
          className={`mt-2 rounded-[var(--radius-control)] border p-2 ${currentStatus.surfaceClass}`}
        >
          <span className="flex items-center gap-2 text-xs font-bold">
            <RoutineStatusIcon status={task.status} className="size-4" />
            {currentStatus.label}
          </span>
        </div>
        <div className="mt-3 space-y-4">
          {groups.map((group) => (
            <div key={group.label}>
              <p className="mb-1 px-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--color-text-subtle)]">
                {group.label}
              </p>
              <div className="space-y-1">
                {group.statuses.map((value) => {
                  const config = routineStatusConfig[value]

                  return (
                    <label
                      key={value}
                      className={`group flex min-h-9 cursor-pointer items-center gap-2 rounded-md border px-2 text-xs font-semibold transition hover:border-[var(--color-control-focus)] hover:bg-[var(--color-control-hover-bg)] ${
                        task.status === value
                          ? 'border-[var(--color-text-strong)] bg-[var(--color-panel-bg)] text-[var(--color-text-strong)] shadow-[var(--shadow-panel)]'
                          : 'border-transparent text-[var(--color-text-muted)]'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`routine-status-grouped-${task.id}`}
                        value={value}
                        checked={task.status === value}
                        onChange={() => onStatusChange?.(task.id, value)}
                        className="peer sr-only"
                      />
                      <span
                        className={`size-3 shrink-0 rounded-full ${config.dotClass}`}
                      />
                      <span className="min-w-0 flex-1 truncate">
                        {config.label}
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </fieldset>
    )
  }

  if (variant === 'rail') {
    return (
      <fieldset
        className={`rounded-[var(--radius-control)] border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] p-2.5 ${className}`}
      >
        <legend className="px-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[var(--color-text-subtle)]">
          Fluxo da execução
        </legend>
        <div className="mt-1 space-y-0.5">
          {selectableStatusEntries.map(([value, config], index) => (
            <label
              key={value}
              className={`group relative flex min-h-8 cursor-pointer items-center gap-2.5 rounded-md px-2 text-xs font-semibold transition hover:bg-[var(--color-control-hover-bg)] ${
                task.status === value
                  ? 'bg-[var(--color-panel-soft-bg)] text-[var(--color-text-strong)]'
                  : 'text-[var(--color-text-muted)]'
              }`}
            >
              {index < selectableStatusEntries.length - 1 && (
                <span className="absolute top-6 left-[0.93rem] h-3 w-px bg-[var(--color-divider)]" />
              )}
              <input
                type="radio"
                name={`routine-status-rail-${task.id}`}
                value={value}
                checked={task.status === value}
                onChange={() => onStatusChange?.(task.id, value)}
                className="peer sr-only"
              />
              <span
                className={`relative z-10 grid size-4 shrink-0 place-items-center rounded-full ring-2 ring-[var(--color-panel-bg)] ${config.dotClass}`}
              >
                {task.status === value && (
                  <span className="size-1.5 rounded-full bg-white" />
                )}
              </span>
              <span className="min-w-0 flex-1 truncate">{config.label}</span>
              {task.status === value && (
                <RoutineStatusIcon status={value} className="size-3.5" />
              )}
            </label>
          ))}
        </div>
      </fieldset>
    )
  }

  if (variant === 'strip') {
    return (
      <fieldset
        className={`rounded-[var(--radius-control)] border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] p-3 ${className}`}
      >
        <div className="mb-2 flex items-center justify-between gap-3">
          <legend className="text-xs font-bold text-[var(--color-text-strong)]">
            Estado da execução
          </legend>
          <span
            className={`rounded-full border px-2 py-1 text-[10px] font-bold ${currentStatus.surfaceClass}`}
          >
            {currentStatus.label}
          </span>
        </div>
        <div className="grid grid-cols-6 gap-1">
          {selectableStatusEntries.map(([value, config]) => (
            <label
              key={value}
              className="group min-w-0 cursor-pointer"
              title={config.label}
            >
              <input
                type="radio"
                name={`routine-status-strip-${task.id}`}
                value={value}
                checked={task.status === value}
                onChange={() => onStatusChange?.(task.id, value)}
                className="peer sr-only"
              />
              <span className="flex min-h-9 items-center justify-center rounded-md border border-[var(--color-panel-border)] bg-[var(--color-panel-soft-bg)] transition group-hover:border-[var(--color-control-focus)] peer-checked:border-[var(--color-text-strong)] peer-checked:bg-[var(--color-panel-bg)] peer-checked:ring-2 peer-checked:ring-[var(--color-focus-ring)] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--color-control-focus)]">
                <span className={`size-3.5 rounded-full ${config.dotClass}`} />
                <span className="sr-only">{config.label}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
    )
  }

  return (
    <details className={`group relative ${className}`}>
      <summary
        className={`inline-flex min-h-9 cursor-pointer list-none items-center gap-2 rounded-[var(--radius-control)] border px-3 text-sm font-bold transition marker:hidden hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-control-focus)] ${currentStatus.surfaceClass}`}
      >
        <RoutineStatusIcon status={task.status} className="size-4" />
        {currentStatus.label}
        <ChevronDownIcon />
      </summary>
      <div className="absolute right-0 z-30 mt-1 w-48 rounded-[var(--radius-control)] border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] p-1 shadow-[var(--shadow-floating)]">
        {selectableStatusEntries.map(([value, config]) => (
          <button
            key={value}
            type="button"
            onClick={(event) => {
              onStatusChange?.(task.id, value)
              event.currentTarget.closest('details')?.removeAttribute('open')
            }}
            className={`flex min-h-9 w-full items-center gap-2 rounded-md px-2.5 text-left text-xs font-semibold transition hover:bg-[var(--color-control-hover-bg)] ${
              task.status === value
                ? 'bg-[var(--color-panel-soft-bg)] text-[var(--color-text-strong)]'
                : 'text-[var(--color-text-muted)]'
            }`}
          >
            <span className={`size-3 rounded-full ${config.dotClass}`} />
            <span className="flex-1">{config.label}</span>
            {task.status === value && <CheckIcon />}
          </button>
        ))}
      </div>
    </details>
  )
}

function AttachmentTile({ attachment, index, variant }) {
  const name = attachment.name ?? `Anexo ${String(index + 1).padStart(2, '0')}`
  const isGallery = variant === 'gallery'

  return (
    <div
      className={`min-w-0 rounded-[var(--radius-control)] border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] transition hover:border-[var(--color-control-focus)] hover:bg-[var(--color-control-hover-bg)] ${
        isGallery
          ? 'flex min-h-24 flex-col items-start justify-between p-3'
          : 'flex items-center gap-2 p-2'
      }`}
      title={name}
    >
      <span
        className={`grid shrink-0 place-items-center rounded-[var(--radius-control)] bg-[var(--color-brand-soft)] text-[var(--color-brand)] ${
          isGallery ? 'size-10' : 'size-8'
        }`}
      >
        <FileIcon />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-xs font-bold text-[var(--color-text-strong)]">
          {name}
        </span>
        {isGallery && (
          <span className="mt-0.5 block text-[10px] text-[var(--color-text-muted)]">
            Arquivo da execução
          </span>
        )}
      </span>
    </div>
  )
}

function AttachmentEmptyState({ variant }) {
  return (
    <div
      className={`flex items-center justify-center gap-3 rounded-[var(--radius-control)] border border-dashed border-[var(--color-control-border)] bg-[var(--color-panel-soft-bg)] px-3 text-left ${
        variant === 'gallery' ? 'min-h-28' : 'min-h-16'
      }`}
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-[var(--radius-control)] bg-[var(--color-panel-bg)] text-[var(--color-text-subtle)] ring-1 ring-[var(--color-panel-border)]">
        <FileIcon />
      </span>
      <span>
        <span className="block text-xs font-bold text-[var(--color-text-strong)]">
          Nenhum arquivo nesta execução
        </span>
        <span className="block text-[10px] text-[var(--color-text-muted)]">
          Use “Anexar” para adicionar o primeiro documento.
        </span>
      </span>
    </div>
  )
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

function FileIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-4"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        d="M7 3.5h6l4 4V20H7a2 2 0 0 1-2-2V5.5a2 2 0 0 1 2-2Z"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M13 3.5V8h4M8.5 12h7M8.5 15.5h5"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

function NoteIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-3.5"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        d="M5 5.5h14v13H8l-3 2v-15Z"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M8.5 10h7M8.5 13.5H13" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function ChevronDownIcon() {
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

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-3.5"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        d="m6 12 4 4 8-9"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default RoutineCardActions
