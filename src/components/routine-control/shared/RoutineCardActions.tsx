import { useEffect, useId, useRef, useState } from 'react'

import {
  ROUTINE_STATUS,
  routineStatusConfig,
} from '../../../constants/routineStatus'
import type {
  EntityId,
  RoutineStatus,
  Task,
  TaskAttachment,
} from '../../../types/domain'
import { getRoutineAttachments } from '../details/routineDetailsUtils'
import FloatingMenu from '../../ui/FloatingMenu'
import RoutineStatusIcon from './RoutineStatusIcon'

type AttachmentVariant = 'list' | 'gallery' | 'preview' | 'embedded'
type NotesVariant = 'panel' | 'embedded' | 'callout'
type StatusControlVariant = 'menu' | 'grouped' | 'rail' | 'strip'
type StatusChangeHandler = (taskId: EntityId, status: RoutineStatus) => void

interface RoutineCardActionsProps {
  task: Task
  onStatusChange?: StatusChangeHandler
  onNotesChange?: (taskId: EntityId, notes: string) => void | Promise<void>
  className?: string
}

interface RoutineAttachmentButtonProps {
  task: Task
  onAttachmentAdd?: (task: Task) => void
  label?: string
  compact?: boolean
}

interface RoutineAttachmentsPanelProps {
  task: Task
  onAttachmentAdd?: (task: Task) => void
  onAttachmentRemove?: (taskId: EntityId, attachmentId: EntityId) => void
  variant?: AttachmentVariant
  title?: string
  description?: string
  className?: string
}

interface RoutineNotesPanelProps {
  task: Task
  onNotesChange?: (taskId: EntityId, notes: string) => void | Promise<void>
  variant?: NotesVariant
  title?: string
  description?: string
  rows?: number
  className?: string
}

interface RoutineStatusControlProps {
  task: Task
  onStatusChange?: StatusChangeHandler
  allowedStatusChanges?: readonly RoutineStatus[]
  variant?: StatusControlVariant
  className?: string
}

const selectableStatusOrder: RoutineStatus[] = [
  ROUTINE_STATUS.PENDING,
  ROUTINE_STATUS.IN_PROGRESS,
  ROUTINE_STATUS.ERROR,
  ROUTINE_STATUS.NO_MOVEMENT,
  ROUTINE_STATUS.COMPLETED,
]

function RoutineCardActions({
  task,
  onStatusChange,
  onNotesChange,
  className = '',
}: RoutineCardActionsProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      <RoutineStatusControl
        task={task}
        onStatusChange={onStatusChange}
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
}: RoutineAttachmentButtonProps) {
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
  onAttachmentRemove,
  variant = 'list',
  title = 'Anexos',
  description,
  className = '',
}: RoutineAttachmentsPanelProps) {
  const attachments = getRoutineAttachments(task)
  const attachmentCount = attachments.length
  const isGallery = variant === 'gallery'
  const isPreview = variant === 'preview'
  const isCompact = variant === 'embedded'
  const isEmbedded = variant === 'embedded' || isPreview
  const layoutName = isPreview
    ? 'single-row'
    : isGallery
      ? 'vertical-two-rows'
      : isCompact
        ? 'fixed-three-rows'
        : 'grid'
  const viewportClass = isPreview
    ? 'h-52 overflow-x-auto overflow-y-hidden overscroll-x-contain pb-4'
    : isGallery
      ? 'min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-3'
      : isCompact
        ? 'h-40 overflow-y-auto overscroll-contain pr-1'
        : 'p-2.5'
  const itemsClass = isPreview
    ? 'flex min-w-max gap-2'
    : isGallery
      ? 'grid grid-cols-1 gap-2 sm:grid-cols-2'
      : isCompact
        ? 'grid auto-rows-[3rem] grid-cols-1 gap-2 sm:grid-cols-2'
        : 'grid grid-cols-1 gap-2 sm:grid-cols-2'

  return (
    <section
      className={`${
        isEmbedded
          ? ''
          : `overflow-hidden rounded-[var(--radius-control)] border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] ${
              isGallery ? 'flex min-h-0 flex-col' : ''
            }`
      } ${className}`}
      aria-labelledby={`attachments-title-${task.id}`}
    >
      <header
        className={`flex shrink-0 items-center justify-between gap-3 ${
          isEmbedded
            ? isPreview
              ? 'mb-3'
              : 'mb-2'
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

        {onAttachmentAdd && (
          <RoutineAttachmentButton
            task={task}
            onAttachmentAdd={onAttachmentAdd}
            label="Anexar"
            compact
          />
        )}
      </header>

      <div
        className={viewportClass}
        data-attachment-layout={layoutName}
        data-scroll-owner={isGallery ? 'attachments' : undefined}
      >
        {attachmentCount > 0 ? (
          <div className={itemsClass}>
            {attachments.map((attachment, index) => (
              <AttachmentTile
                key={attachment.id}
                attachment={attachment}
                index={index}
                variant={variant}
                onRemove={
                  onAttachmentRemove
                    ? () => onAttachmentRemove(task.id, attachment.id)
                    : undefined
                }
              />
            ))}
          </div>
        ) : (
          <AttachmentEmptyState
            variant={variant}
            canAdd={Boolean(onAttachmentAdd)}
          />
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
}: RoutineNotesPanelProps) {
  const isEmbedded = variant === 'embedded'
  const isCallout = variant === 'callout'
  const [draftNotes, setDraftNotes] = useState(task.notes ?? '')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setDraftNotes(task.notes ?? '')
    setIsSaving(false)
    setError('')
  }, [task.id, task.notes])

  async function saveNotes() {
    if (
      !onNotesChange ||
      isSaving ||
      draftNotes === (task.notes ?? '')
    ) {
      return
    }

    setError('')
    setIsSaving(true)

    try {
      await onNotesChange(task.id, draftNotes)
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Não foi possível salvar a observação.',
      )
    } finally {
      setIsSaving(false)
    }
  }

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
        value={draftNotes}
        rows={rows}
        readOnly={!onNotesChange || isSaving}
        disabled={isSaving}
        maxLength={5000}
        aria-readonly={!onNotesChange || undefined}
        onChange={(event) => {
          setDraftNotes(event.target.value)
          setError('')
        }}
        onBlur={() => void saveNotes()}
        aria-label="Observações da rotina"
        placeholder="Adicione contexto apenas quando necessário..."
        className="w-full resize-none rounded-[var(--radius-control)] border border-[var(--color-control-border)] bg-[var(--color-control-bg)] px-3 py-2 text-sm leading-5 text-[var(--color-control-text)] outline-none transition placeholder:text-[var(--color-control-placeholder)] focus:border-[var(--color-control-focus)] focus:ring-2 focus:ring-[var(--color-focus-ring)]"
      />
      {error && (
        <p
          role="alert"
          className="mt-1.5 text-xs font-semibold text-[var(--status-error-text)]"
        >
          {error}
        </p>
      )}
      {!error && isSaving && (
        <p className="mt-1.5 text-xs font-semibold text-[var(--color-text-muted)]">
          Salvando…
        </p>
      )}
    </section>
  )
}

export function RoutineStatusControl({
  task,
  onStatusChange,
  allowedStatusChanges,
  variant = 'menu',
  className = '',
}: RoutineStatusControlProps) {
  const currentStatus =
    routineStatusConfig[task.status] ??
    routineStatusConfig[ROUTINE_STATUS.PENDING]
  const statusEntries = (allowedStatusChanges ?? selectableStatusOrder)
    .filter((status) => status !== task.status)
    .map((status) => [status, routineStatusConfig[status]] as const)
  const menuTriggerRef = useRef<HTMLButtonElement | null>(null)
  const menuId = useId()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  if (!onStatusChange || statusEntries.length === 0) {
    return (
      <span
        className={`inline-flex min-h-9 items-center gap-2 rounded-[var(--radius-control)] border px-3 text-sm font-bold ${currentStatus.surfaceClass} ${className}`}
        aria-label={`Estado da execução: ${currentStatus.label}`}
      >
        <RoutineStatusIcon status={task.status} className="size-4" />
        {currentStatus.label}
      </span>
    )
  }

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
        statuses: [ROUTINE_STATUS.ERROR, ROUTINE_STATUS.NO_MOVEMENT],
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
          {groups.map((group) => {
            const statuses = group.statuses.filter((status) =>
              statusEntries.some(([value]) => value === status),
            )

            if (statuses.length === 0) return null

            return (
              <div key={group.label}>
                <p className="mb-1 px-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--color-text-subtle)]">
                  {group.label}
                </p>
                <div className="space-y-1">
                  {statuses.map((value) => {
                    const config = routineStatusConfig[value]

                    return (
                      <label
                        key={value}
                        className="group flex min-h-9 cursor-pointer items-center gap-2 rounded-md border border-transparent px-2 text-xs font-semibold text-[var(--color-text-muted)] transition hover:border-[var(--color-control-focus)] hover:bg-[var(--color-control-hover-bg)]"
                      >
                        <input
                          type="radio"
                          name={`routine-status-grouped-${task.id}`}
                          value={value}
                          checked={false}
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
            )
          })}
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
          {statusEntries.map(([value, config], index) => (
            <label
              key={value}
              className={`group relative flex min-h-8 cursor-pointer items-center gap-2.5 rounded-md px-2 text-xs font-semibold transition hover:bg-[var(--color-control-hover-bg)] ${
                task.status === value
                  ? 'bg-[var(--color-panel-soft-bg)] text-[var(--color-text-strong)]'
                  : 'text-[var(--color-text-muted)]'
              }`}
            >
              {index < statusEntries.length - 1 && (
                <span className="absolute top-6 left-[0.93rem] h-3 w-px bg-[var(--color-divider)]" />
              )}
              <input
                type="radio"
                name={`routine-status-rail-${task.id}`}
                value={value}
                checked={false}
                onChange={() => onStatusChange?.(task.id, value)}
                className="peer sr-only"
              />
              <span
                className={`relative z-10 grid size-4 shrink-0 place-items-center rounded-full ring-2 ring-[var(--color-panel-bg)] ${config.dotClass}`}
              />
              <span className="min-w-0 flex-1 truncate">{config.label}</span>
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
          {statusEntries.map(([value, config]) => (
            <label
              key={value}
              className="group min-w-0 cursor-pointer"
              title={config.label}
            >
              <input
                type="radio"
                name={`routine-status-strip-${task.id}`}
                value={value}
                checked={false}
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
    <>
      <button
        ref={menuTriggerRef}
        type="button"
        onClick={() => setIsMenuOpen((isOpen) => !isOpen)}
        className={`inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-[var(--radius-control)] border px-3 text-sm font-bold transition hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-control-focus)] ${currentStatus.surfaceClass} ${className}`}
        aria-haspopup="menu"
        aria-expanded={isMenuOpen}
        aria-controls={isMenuOpen ? menuId : undefined}
        data-status-menu-trigger
      >
        <RoutineStatusIcon status={task.status} className="size-4" />
        {currentStatus.label}
        <ChevronDownIcon isOpen={isMenuOpen} />
      </button>

      <FloatingMenu
        anchorRef={menuTriggerRef}
        id={menuId}
        isOpen={isMenuOpen}
        onDismiss={() => setIsMenuOpen(false)}
        className="w-48 rounded-[var(--radius-control)] border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] p-1 shadow-[var(--shadow-floating)]"
        ariaLabel="Selecionar estado da execução"
      >
        {statusEntries.map(([value, config]) => (
          <button
            key={value}
            type="button"
            role="menuitem"
            onClick={() => {
              onStatusChange?.(task.id, value)
              setIsMenuOpen(false)
            }}
            className="flex min-h-9 w-full items-center gap-2 rounded-md px-2.5 text-left text-xs font-semibold text-[var(--color-text-muted)] transition hover:bg-[var(--color-control-hover-bg)]"
          >
            <span className={`size-3 rounded-full ${config.dotClass}`} />
            <span className="flex-1">{config.label}</span>
          </button>
        ))}
      </FloatingMenu>
    </>
  )
}

interface AttachmentTileProps {
  attachment: TaskAttachment
  index: number
  variant: AttachmentVariant
  onRemove?: () => void
}

function AttachmentTile({
  attachment,
  index,
  variant,
  onRemove,
}: AttachmentTileProps) {
  const name = attachment.name ?? `Anexo ${String(index + 1).padStart(2, '0')}`
  const isGallery = variant === 'gallery'
  const isPreview = variant === 'preview'
  const showsPreview = isGallery || isPreview
  const previewKind = getAttachmentPreviewKind(attachment, name)
  const extension = getAttachmentExtension(name)

  if (showsPreview) {
    return (
      <article
        className={`group relative min-w-0 overflow-hidden rounded-[var(--radius-control)] border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] transition hover:border-[var(--color-control-focus)] hover:shadow-[var(--shadow-panel)] ${
          isPreview ? 'w-72 shrink-0' : 'w-full'
        }`}
        title={name}
        data-attachment-kind={previewKind}
      >
        {onRemove && (
          <AttachmentRemoveButton name={name} onRemove={onRemove} overlay />
        )}
        <AttachmentPreview
          attachment={attachment}
          name={name}
          previewKind={previewKind}
          compact={isGallery}
        />
        <div className="flex min-w-0 items-center gap-2.5 p-2.5">
          <span className="shrink-0 rounded bg-[var(--color-brand-soft)] px-1.5 py-1 text-[9px] font-extrabold uppercase tracking-wide text-[var(--color-brand)]">
            {extension}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-xs font-bold text-[var(--color-text-strong)]">
              {name}
            </span>
            <span className="mt-0.5 block truncate text-[10px] text-[var(--color-text-muted)]">
              {attachment.sizeLabel ?? 'Arquivo da execução'}
            </span>
          </span>
        </div>
      </article>
    )
  }

  return (
    <div
      className={`relative min-w-0 rounded-[var(--radius-control)] border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] transition hover:border-[var(--color-control-focus)] hover:bg-[var(--color-control-hover-bg)] ${
        isGallery
          ? 'flex min-h-24 flex-col items-start justify-between p-3'
          : 'flex h-full items-center gap-2 p-2'
      }`}
      title={name}
      data-attachment-kind={previewKind}
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
      {onRemove && <AttachmentRemoveButton name={name} onRemove={onRemove} />}
    </div>
  )
}

interface AttachmentRemoveButtonProps {
  name: string
  onRemove: () => void
  overlay?: boolean
}

function AttachmentRemoveButton({
  name,
  onRemove,
  overlay = false,
}: AttachmentRemoveButtonProps) {
  return (
    <button
      type="button"
      onClick={onRemove}
      className={`grid size-7 shrink-0 place-items-center rounded-full border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] text-[var(--color-text-muted)] shadow-[var(--shadow-panel)] transition hover:border-[var(--status-error-border)] hover:bg-[var(--status-error-soft-bg)] hover:text-[var(--status-error-text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-control-focus)] ${
        overlay ? 'absolute top-2 right-2 z-10' : 'ml-auto'
      }`}
      aria-label={`Excluir ${name}`}
      title={`Excluir ${name}`}
    >
      <CloseSmallIcon />
    </button>
  )
}

interface AttachmentPreviewProps {
  attachment: TaskAttachment
  name: string
  previewKind: string
  compact?: boolean
}

function AttachmentPreview({
  attachment,
  name,
  previewKind,
  compact = false,
}: AttachmentPreviewProps) {
  const previewTitle = attachment.previewTitle ?? 'Documento da execução'
  const previewClass = `${
    compact ? 'h-24' : 'h-28 sm:h-32'
  } overflow-hidden border-b border-[var(--color-divider)]`

  if (previewKind === 'pdf') {
    return (
      <div
        className={`${previewClass} flex items-center justify-center bg-[var(--status-error-soft-bg)] p-3`}
        role="img"
        aria-label={`Prévia de PDF: ${name}`}
      >
        <div className="relative h-full w-3/4 max-w-44 rounded-sm bg-white px-3 pt-7 shadow-[var(--shadow-panel)] ring-1 ring-[var(--color-panel-border)]">
          <span className="absolute top-2 left-3 rounded bg-[var(--status-error-strong-bg)] px-1.5 py-0.5 text-[8px] font-black text-white">
            PDF
          </span>
          <span className="block truncate text-[9px] font-extrabold text-[var(--color-text-strong)]">
            {previewTitle}
          </span>
          <span className="mt-2 block h-1 rounded-full bg-[var(--color-divider)]" />
          <span className="mt-1.5 block h-1 w-4/5 rounded-full bg-[var(--color-divider)]" />
          <span className="mt-1.5 block h-1 w-3/5 rounded-full bg-[var(--color-divider)]" />
        </div>
      </div>
    )
  }

  if (previewKind === 'spreadsheet') {
    const cells = [
      'Data',
      'Doc.',
      'Valor',
      'Sit.',
      '18/06',
      '1542',
      '4.820',
      'OK',
      '19/06',
      '1548',
      '2.390',
      'OK',
    ]

    return (
      <div
        className={`${previewClass} bg-[var(--status-completed-soft-bg)] p-3`}
        role="img"
        aria-label={`Prévia de planilha: ${name}`}
      >
        <div className="grid h-full grid-cols-4 gap-px overflow-hidden rounded border border-[var(--status-completed-border)] bg-[var(--status-completed-border)] shadow-[var(--shadow-panel)]">
          {cells.map((cell, cellIndex) => (
            <span
              key={`${cell}-${cellIndex}`}
              className={`flex items-center justify-center truncate px-1 text-[8px] ${
                cellIndex < 4
                  ? 'bg-[var(--status-completed-strong-bg)] font-extrabold text-white'
                  : 'bg-[var(--color-panel-bg)] font-semibold text-[var(--color-text-muted)]'
              }`}
            >
              {cell}
            </span>
          ))}
        </div>
      </div>
    )
  }

  if (previewKind === 'xml') {
    return (
      <div
        className={`${previewClass} bg-[var(--color-list-muted-bg)] p-3 font-mono text-[9px] leading-4 text-[var(--color-text-muted)]`}
        role="img"
        aria-label={`Prévia de XML: ${name}`}
      >
        <span className="block text-[var(--color-brand)]">&lt;evento&gt;</span>
        <span className="block pl-3">
          &lt;periodo&gt;2026-06&lt;/periodo&gt;
        </span>
        <span className="block pl-3">
          &lt;status&gt;processado&lt;/status&gt;
        </span>
        <span className="block text-[var(--color-brand)]">&lt;/evento&gt;</span>
      </div>
    )
  }

  if (previewKind === 'image') {
    return (
      <div
        className={`${previewClass} relative bg-[var(--color-brand-soft)]`}
        role="img"
        aria-label={`Prévia de imagem: ${name}`}
      >
        <svg
          viewBox="0 0 320 160"
          className="h-full w-full text-[var(--color-brand)]"
          fill="none"
          aria-hidden="true"
        >
          <rect x="42" y="18" width="236" height="124" rx="9" fill="white" />
          <rect
            x="60"
            y="36"
            width="92"
            height="8"
            rx="4"
            fill="currentColor"
            opacity=".22"
          />
          <rect
            x="60"
            y="54"
            width="168"
            height="6"
            rx="3"
            fill="currentColor"
            opacity=".12"
          />
          <path
            d="m62 119 43-38 29 24 32-31 58 45H62Z"
            fill="currentColor"
            opacity=".2"
          />
          <circle cx="221" cy="77" r="13" fill="currentColor" opacity=".35" />
        </svg>
        <span className="absolute right-2 bottom-2 rounded bg-white/90 px-2 py-1 text-[9px] font-bold text-[var(--color-brand)] shadow-sm">
          Comprovante
        </span>
      </div>
    )
  }

  if (previewKind === 'document') {
    return (
      <div
        className={`${previewClass} flex items-center justify-center bg-[var(--color-brand-soft)] p-3`}
        role="img"
        aria-label={`Prévia de documento: ${name}`}
      >
        <div className="h-full w-3/4 max-w-44 rounded-sm bg-white p-3 shadow-[var(--shadow-panel)] ring-1 ring-[var(--color-panel-border)]">
          <span className="block truncate text-[9px] font-extrabold text-[var(--color-brand)]">
            {previewTitle}
          </span>
          {[100, 84, 92, 68].map((width) => (
            <span
              key={width}
              className="mt-2 block h-1 rounded-full bg-[var(--color-divider)]"
              style={{ width: `${width}%` }}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div
      className={`${previewClass} grid place-items-center bg-[var(--color-panel-soft-bg)] text-[var(--color-text-subtle)]`}
      role="img"
      aria-label={`Prévia indisponível: ${name}`}
    >
      <span className="grid size-12 place-items-center rounded-[var(--radius-control)] bg-[var(--color-panel-bg)] ring-1 ring-[var(--color-panel-border)]">
        <FileIcon />
      </span>
    </div>
  )
}

function getAttachmentPreviewKind(
  attachment: TaskAttachment,
  name: string,
): string {
  if (attachment.previewType) return attachment.previewType

  const mimeType = String(
    attachment.mimeType ?? attachment.type ?? '',
  ).toLowerCase()
  const extension = getAttachmentExtension(name).toLowerCase()

  if (mimeType.includes('pdf') || extension === 'pdf') return 'pdf'
  if (
    mimeType.startsWith('image/') ||
    ['png', 'jpg', 'jpeg'].includes(extension)
  ) {
    return 'image'
  }
  if (
    mimeType.includes('spreadsheet') ||
    mimeType.includes('excel') ||
    mimeType.includes('csv') ||
    ['xls', 'xlsx', 'csv'].includes(extension)
  ) {
    return 'spreadsheet'
  }
  if (mimeType.includes('xml') || extension === 'xml') return 'xml'
  if (
    mimeType.includes('word') ||
    mimeType.includes('document') ||
    ['doc', 'docx', 'txt'].includes(extension)
  ) {
    return 'document'
  }

  return 'file'
}

function getAttachmentExtension(name: string): string {
  const extension = name.includes('.') ? name.split('.').pop() : ''
  return extension?.slice(0, 5).toUpperCase() || 'ARQ'
}

function AttachmentEmptyState({
  variant,
  canAdd,
}: {
  variant: AttachmentVariant
  canAdd: boolean
}) {
  return (
    <div
      className={`flex items-center justify-center gap-3 rounded-[var(--radius-control)] border border-dashed border-[var(--color-control-border)] bg-[var(--color-panel-soft-bg)] px-3 text-left ${
        ['gallery', 'preview', 'embedded'].includes(variant)
          ? 'h-full min-h-0'
          : 'min-h-16'
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
          {canAdd
            ? 'Use “Anexar” para adicionar o primeiro documento.'
            : 'O envio de anexos ainda não está disponível nesta versão.'}
        </span>
      </span>
    </div>
  )
}

function CloseSmallIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-3.5"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path d="m8 8 8 8m0-8-8 8" strokeWidth="2" strokeLinecap="round" />
    </svg>
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

function ChevronDownIcon({ isOpen = false }: { isOpen?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`size-3.5 transition ${isOpen ? 'rotate-180' : ''}`}
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

export default RoutineCardActions
