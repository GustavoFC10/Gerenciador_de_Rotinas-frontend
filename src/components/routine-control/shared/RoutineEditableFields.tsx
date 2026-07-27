import {
  useState,
  type Dispatch,
  type KeyboardEvent,
  type ReactNode,
  type SetStateAction,
} from 'react'

import { formatDisplayDate } from '../details/routineDetailsUtils'
import type { Employee, EntityId, Task } from '../../../types/domain'

const fieldAppearance = {
  card: {
    button:
      'min-h-14 rounded-[var(--radius-control)] border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] px-3 py-2.5',
    editor:
      'min-h-14 rounded-[var(--radius-control)] border border-[var(--color-control-focus)] bg-[var(--color-panel-soft-bg)] px-3 py-1.5 ring-2 ring-[var(--color-focus-ring)]',
    icon: 'size-8',
  },
  row: {
    button:
      'min-h-11 rounded-md bg-transparent px-2 py-1.5 hover:bg-[var(--color-control-hover-bg)]',
    editor:
      'min-h-11 rounded-md border border-[var(--color-control-focus)] bg-[var(--color-panel-bg)] px-2 py-1 ring-2 ring-[var(--color-focus-ring)]',
    icon: 'size-7',
  },
  band: {
    button:
      'min-h-16 rounded-[var(--radius-control)] border border-[var(--color-panel-border)] bg-[var(--color-panel-soft-bg)] px-3 py-2.5',
    editor:
      'min-h-16 rounded-[var(--radius-control)] border border-[var(--color-control-focus)] bg-[var(--color-panel-bg)] px-3 py-1.5 ring-2 ring-[var(--color-focus-ring)]',
    icon: 'size-9',
  },
}

type FieldAppearance = keyof typeof fieldAppearance
type FieldLayout = 'inline' | 'stacked'

function RoutineEditableFields({
  task,
  employees = [],
  onAssigneeChange,
  onDueDateChange,
  appearance = 'card',
  layout = 'inline',
  className = '',
}: {
  task: Task
  employees?: Employee[]
  onAssigneeChange?: (taskId: EntityId, assigneeId: EntityId | null) => void
  onDueDateChange?: (taskId: EntityId, dueDate: string) => void
  appearance?: FieldAppearance
  layout?: FieldLayout
  className?: string
}) {
  return (
    <div
      className={`grid gap-2 ${layout === 'stacked' ? 'grid-cols-1' : 'sm:grid-cols-2'} ${className}`}
    >
      <RoutineAssigneeField
        task={task}
        employees={employees}
        onChange={onAssigneeChange}
        appearance={appearance}
      />
      <RoutineDueDateField
        task={task}
        onChange={onDueDateChange}
        appearance={appearance}
      />
    </div>
  )
}

export function RoutineAssigneeField({
  task,
  employees = [],
  onChange,
  appearance = 'card',
}: {
  task: Task
  employees?: Employee[]
  onChange?: (taskId: EntityId, assigneeId: EntityId | null) => void
  appearance?: FieldAppearance
}) {
  const [isEditing, setIsEditing] = useState(false)
  const assignee = employees.find((employee) => employee.id === task.assigneeId)
  const assigneeName = assignee?.name ?? 'Não atribuído'

  if (isEditing) {
    return (
      <EditorShell label="Responsável" appearance={appearance}>
        <select
          autoFocus
          value={task.assigneeId ?? ''}
          onBlur={() => setIsEditing(false)}
          onKeyDown={(event) => finishEditingOnEscape(event, setIsEditing)}
          onChange={(event) => {
            onChange?.(task.id, event.target.value || null)
            setIsEditing(false)
          }}
          className={editorControlClass}
          aria-label="Alterar responsável"
        >
          <option value="">Não atribuído</option>
          {employees.map((employee) => (
            <option key={employee.id} value={employee.id}>
              {employee.name}
            </option>
          ))}
        </select>
      </EditorShell>
    )
  }

  return (
    <ReadOnlyField
      label="Responsável"
      value={assigneeName}
      icon={<AvatarInitials name={assignee?.name} />}
      onEdit={() => setIsEditing(true)}
      appearance={appearance}
    />
  )
}

export function RoutineDueDateField({
  task,
  onChange,
  appearance = 'card',
}: {
  task: Task
  onChange?: (taskId: EntityId, dueDate: string) => void
  appearance?: FieldAppearance
}) {
  const [isEditing, setIsEditing] = useState(false)

  if (isEditing) {
    return (
      <EditorShell label="Prazo" appearance={appearance}>
        <input
          autoFocus
          type="date"
          value={task.dueDate ?? ''}
          onBlur={() => setIsEditing(false)}
          onKeyDown={(event) => finishEditingOnEscape(event, setIsEditing)}
          onChange={(event) => {
            onChange?.(task.id, event.target.value)
            setIsEditing(false)
          }}
          className={editorControlClass}
          aria-label="Alterar prazo"
        />
      </EditorShell>
    )
  }

  return (
    <ReadOnlyField
      label="Prazo"
      value={formatDisplayDate(task.dueDate)}
      icon={<CalendarIcon />}
      onEdit={() => setIsEditing(true)}
      appearance={appearance}
    />
  )
}

const editorControlClass =
  'min-h-8 w-full rounded-md border border-[var(--color-control-border)] bg-[var(--color-control-bg)] px-2.5 text-sm font-semibold text-[var(--color-control-text)] outline-none transition focus:border-[var(--color-control-focus)] focus:ring-2 focus:ring-[var(--color-focus-ring)]'

function EditorShell({
  label,
  appearance,
  children,
}: {
  label: string
  appearance: FieldAppearance
  children: ReactNode
}) {
  const styles = fieldAppearance[appearance]

  return (
    <label className={styles.editor}>
      <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--color-text-muted)]">
        {label}
      </span>
      {children}
    </label>
  )
}

function ReadOnlyField({
  label,
  value,
  icon,
  onEdit,
  appearance,
}: {
  label: string
  value: string
  icon: ReactNode
  onEdit: () => void
  appearance: FieldAppearance
}) {
  const styles = fieldAppearance[appearance]

  return (
    <button
      type="button"
      onClick={onEdit}
      className={`group flex w-full items-center gap-2.5 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-control-focus)] ${styles.button}`}
      aria-label={`Alterar ${label.toLowerCase()}: ${value}`}
    >
      <span className={styles.icon}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--color-text-subtle)]">
          {label}
        </span>
        <span className="block truncate text-sm font-bold leading-5 text-[var(--color-text-strong)]">
          {value}
        </span>
      </span>
      <span className="grid size-6 shrink-0 place-items-center rounded-full text-[var(--color-text-subtle)] transition group-hover:bg-[var(--color-brand-soft)] group-hover:text-[var(--color-brand)]">
        <PencilIcon />
      </span>
    </button>
  )
}

function AvatarInitials({ name }: { name?: string }) {
  const initials = name
    ? name
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase()
    : '—'

  return (
    <span className="grid size-full place-items-center rounded-full bg-[var(--color-brand-soft)] text-[10px] font-extrabold text-[var(--color-brand)]">
      {initials}
    </span>
  )
}

function CalendarIcon() {
  return (
    <span className="grid size-full place-items-center rounded-full bg-[var(--color-panel-soft-bg)] text-[var(--color-text-muted)] ring-1 ring-[var(--color-panel-border)]">
      <svg
        viewBox="0 0 24 24"
        className="size-4"
        fill="none"
        stroke="currentColor"
        aria-hidden="true"
      >
        <rect x="4" y="5.5" width="16" height="14" rx="2.5" strokeWidth="1.8" />
        <path
          d="M8 3.5v4M16 3.5v4M4 10h16"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path d="M8 14h3M8 17h6" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </span>
  )
}

function PencilIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-3.5"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        d="m14.5 6.5 3 3M5 19l3.4-.7L18 8.7a1.4 1.4 0 0 0 0-2l-.7-.7a1.4 1.4 0 0 0-2 0l-9.6 9.6L5 19Z"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function finishEditingOnEscape(
  event: KeyboardEvent,
  setIsEditing: Dispatch<SetStateAction<boolean>>,
) {
  if (event.key === 'Escape') {
    event.stopPropagation()
    setIsEditing(false)
  }
}

export default RoutineEditableFields
