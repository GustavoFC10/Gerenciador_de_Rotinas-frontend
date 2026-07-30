import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from 'react'

import CompanyContextMenu from '../../context-menu/CompanyContextMenu'
import TaskContextMenu from '../../context-menu/TaskContextMenu'
import RoutineClosedCardCompact from './RoutineClosedCardCompact'
import RoutineNotApplicableCard from './RoutineNotApplicableCard'
import type {
  Client,
  ClientRoutineLink,
  Department,
  DepartmentDivision,
  EntityId,
  Routine,
  RoutineStatus,
  Task,
} from '../../../types/domain'

type RoutineControlContextMenu =
  | {
      kind: 'company'
      client: Client
      x: number
      y: number
      trigger: HTMLButtonElement
    }
  | {
      kind: 'task'
      task: Task
      label: string
      x: number
      y: number
      trigger: HTMLButtonElement
    }

function RoutineHeaderButton({
  routine,
  onOpen,
}: {
  routine: Routine
  onOpen?: (routine: Routine) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen?.(routine)}
      className="block min-h-14 w-full px-3 py-3 text-center text-xs font-bold leading-tight text-[var(--color-table-action-text)] transition hover:bg-[var(--color-table-action-hover-bg)] hover:text-[var(--color-brand)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--color-control-focus)]"
      aria-label={`Abrir página da rotina ${routine.name}`}
    >
      <span className="line-clamp-2">{routine.shortName}</span>
    </button>
  )
}

function ClientRowButton({
  client,
  onOpen,
  onContextMenuOpen,
  isContextMenuOpen,
}: {
  client: Client
  onOpen?: (client: Client) => void
  onContextMenuOpen: (
    client: Client,
    x: number,
    y: number,
    trigger: HTMLButtonElement,
  ) => void
  isContextMenuOpen: boolean
}) {
  function handleKeyboardContextMenu(event: KeyboardEvent<HTMLButtonElement>) {
    if (
      event.key !== 'ContextMenu' &&
      !(event.shiftKey && event.key === 'F10')
    ) {
      return
    }

    event.preventDefault()
    const bounds = event.currentTarget.getBoundingClientRect()
    onContextMenuOpen(
      client,
      bounds.left + Math.min(56, bounds.width / 2),
      bounds.top + Math.min(44, bounds.height),
      event.currentTarget,
    )
  }

  function handleContextMenu(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault()
    onContextMenuOpen(client, event.clientX, event.clientY, event.currentTarget)
  }

  return (
    <button
      type="button"
      onClick={() => onOpen?.(client)}
      onContextMenu={handleContextMenu}
      onKeyDown={handleKeyboardContextMenu}
      className="grid min-h-16 w-full grid-cols-[44px_minmax(0,1fr)] items-center gap-3 px-5 py-3 text-left transition hover:bg-[var(--color-table-action-hover-bg)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--color-control-focus)]"
      aria-label={`Abrir página da empresa ${client.name}`}
      aria-haspopup="menu"
      aria-expanded={isContextMenuOpen || undefined}
      aria-controls={isContextMenuOpen ? 'company-context-menu' : undefined}
      aria-keyshortcuts="Shift+F10"
    >
      <span className="text-xs font-bold text-[var(--color-table-client-code)]">
        {client.code}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-bold text-[var(--color-text-strong)]">
          {client.name}
        </span>
      </span>
    </button>
  )
}

function RoutineControlTable({
  title,
  description,
  accessibleName,
  showHeader = false,
  clients,
  departments = [],
  divisions = [],
  routines,
  clientRoutineLinks,
  tasks,
  onClientOpen,
  onRoutineOpen,
  onTaskOpen,
  onTaskStatusChange,
  onTaskAttachmentAdd,
}: {
  title?: string
  description?: string
  accessibleName?: string
  showHeader?: boolean
  clients: Client[]
  departments?: Department[]
  divisions?: DepartmentDivision[]
  routines: Routine[]
  clientRoutineLinks: ClientRoutineLink[]
  tasks: Task[]
  onClientOpen?: (client: Client) => void
  onRoutineOpen?: (routine: Routine) => void
  onTaskOpen?: (task: Task) => void
  onTaskStatusChange?: (taskId: EntityId, status: RoutineStatus) => void
  onTaskAttachmentAdd?: (task: Task) => void
}) {
  const [contextMenu, setContextMenu] =
    useState<RoutineControlContextMenu | null>(null)
  const [actionFeedback, setActionFeedback] = useState<{
    message: string
    isError: boolean
  } | null>(null)
  const feedbackTimerRef = useRef<number | null>(null)
  const clientIds = new Set(clients.map((client) => client.id))
  const routineIds = new Set(routines.map((routine) => routine.id))
  const linkedCells = new Set(
    clientRoutineLinks.map((link) => `${link.clientId}:${link.routineId}`),
  )
  const tableTasks = tasks.filter(
    (task) =>
      task.clientId !== null &&
      task.routineId !== null &&
      clientIds.has(task.clientId) &&
      routineIds.has(task.routineId),
  )
  const taskByCell = new Map<string, Task>(
    tableTasks.map((task) => [`${task.clientId}:${task.routineId}`, task]),
  )
  const hasTaskContextMenu = Boolean(
    onTaskStatusChange ||
    onTaskAttachmentAdd ||
    tableTasks.some((task) => (task.links?.length ?? 0) > 0),
  )

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current !== null) {
        window.clearTimeout(feedbackTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    setContextMenu(null)
  }, [clients])

  function openClientContextMenu(
    client: Client,
    x: number,
    y: number,
    trigger: HTMLButtonElement,
  ) {
    setContextMenu({ kind: 'company', client, x, y, trigger })
  }

  function openTaskContextMenu(
    task: Task,
    label: string,
    x: number,
    y: number,
    trigger: HTMLButtonElement,
  ) {
    setContextMenu({ kind: 'task', task, label, x, y, trigger })
  }

  function closeContextMenu(restoreFocus: boolean) {
    const trigger = contextMenu?.trigger
    setContextMenu(null)

    if (restoreFocus && trigger?.isConnected) {
      window.requestAnimationFrame(() => trigger.focus())
    }
  }

  function showActionFeedback(message: string, isError = false) {
    setActionFeedback({ message, isError })

    if (feedbackTimerRef.current !== null) {
      window.clearTimeout(feedbackTimerRef.current)
    }

    feedbackTimerRef.current = window.setTimeout(() => {
      setActionFeedback(null)
      feedbackTimerRef.current = null
    }, 2200)
  }

  function handleTaskAttachmentAdd(task: Task) {
    onTaskAttachmentAdd?.(task)
    showActionFeedback('Arquivo anexado à tarefa.')
  }

  return (
    <>
      <section
        className="flex h-full min-h-[620px] flex-col overflow-hidden rounded-[var(--radius-panel)] border border-[var(--color-table-border)] bg-[var(--color-table-bg)] shadow-[var(--shadow-panel)]"
        data-spreadsheet-variant="round"
      >
        {showHeader && (
          <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--color-table-border)] px-6 py-5">
            <div>
              <h2 className="text-lg font-bold text-[var(--color-text-main)]">
                {title}
              </h2>
              {description && (
                <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                  {description}
                </p>
              )}
            </div>
            <p className="text-xs font-medium text-[var(--color-text-muted)]">
              {clients.length} clientes - {routines.length} rotinas
            </p>
          </header>
        )}

        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full min-w-max border-collapse text-left">
            <caption className="sr-only">
              {accessibleName ?? title ?? 'Planilha de rotinas'}
            </caption>
            <thead>
              <tr className="bg-[var(--color-table-header-bg)]">
                <th className="sticky left-0 z-20 min-w-64 border-b border-r border-[var(--color-table-border)] bg-[var(--color-table-header-bg)] px-5 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-table-heading-text)]">
                  Empresas
                </th>
                {routines.map((routine) => (
                  <th
                    key={routine.id}
                    className="w-20 min-w-20 max-w-20 border-b border-r border-[var(--color-table-border)] bg-[var(--color-table-header-bg)] p-0 text-center text-xs font-semibold text-[var(--color-table-heading-text)] last:border-r-0"
                    title={routine.name}
                  >
                    <RoutineHeaderButton
                      routine={routine}
                      onOpen={onRoutineOpen}
                    />
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {clients.map((client) => (
                <tr key={client.id} className="group">
                  <th className="sticky left-0 z-10 border-b border-r border-[var(--color-table-border)] bg-[var(--color-table-sticky-bg)] p-0 group-hover:bg-[var(--color-table-row-hover-bg)]">
                    <ClientRowButton
                      client={client}
                      onOpen={onClientOpen}
                      onContextMenuOpen={openClientContextMenu}
                      isContextMenuOpen={
                        contextMenu?.kind === 'company' &&
                        contextMenu.client.id === client.id
                      }
                    />
                  </th>

                  {routines.map((routine) => {
                    const cellKey = `${client.id}:${routine.id}`
                    const isApplicable = linkedCells.has(cellKey)
                    const task = taskByCell.get(cellKey)

                    return (
                      <td
                        key={routine.id}
                        data-routine-applicability={
                          isApplicable ? 'applicable' : 'not-applicable'
                        }
                        className={`h-12 border-b border-r border-[var(--color-table-border)] bg-[var(--color-table-cell-bg)] p-1.5 text-center last:border-r-0 ${
                          isApplicable && task
                            ? 'group-hover:bg-[var(--color-table-row-hover-bg)]'
                            : ''
                        }`}
                      >
                        {!isApplicable ? (
                          <RoutineNotApplicableCard />
                        ) : task ? (
                          <RoutineClosedCardCompact
                            task={task}
                            label={`${routine.name} de ${client.name}`}
                            onOpen={onTaskOpen}
                            onContextMenuOpen={
                              hasTaskContextMenu
                                ? openTaskContextMenu
                                : undefined
                            }
                            isContextMenuOpen={
                              contextMenu?.kind === 'task' &&
                              contextMenu.task.id === task.id
                            }
                          />
                        ) : (
                          <RoutineExecutionUnavailable />
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {contextMenu?.kind === 'company' && (
        <CompanyContextMenu
          client={contextMenu.client}
          departments={departments}
          divisions={divisions}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={closeContextMenu}
          onCopied={showActionFeedback}
        />
      )}

      {contextMenu?.kind === 'task' && (
        <TaskContextMenu
          key={`${contextMenu.task.id}:${contextMenu.x}:${contextMenu.y}`}
          task={contextMenu.task}
          label={contextMenu.label}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={closeContextMenu}
          onStatusChange={onTaskStatusChange}
          onAttachmentAdd={
            onTaskAttachmentAdd ? handleTaskAttachmentAdd : undefined
          }
        />
      )}

      {actionFeedback && (
        <p
          className={`fixed bottom-4 right-4 z-[110] rounded-[var(--radius-control)] border px-3 py-2 text-sm font-bold shadow-[var(--shadow-floating)] ${
            actionFeedback.isError
              ? 'border-[var(--status-error-border)] bg-[var(--status-error-bg)] text-[var(--status-error-text)]'
              : 'border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] text-[var(--color-text-strong)]'
          }`}
          role={actionFeedback.isError ? 'alert' : 'status'}
          data-action-feedback
        >
          {actionFeedback.message}
        </p>
      )}
    </>
  )
}

function RoutineExecutionUnavailable() {
  return (
    <div
      className="mx-auto grid h-9 w-full select-none place-items-center"
      data-routine-execution="unavailable"
      aria-label="Execução ainda não disponível"
    >
      <span
        className="size-3 rounded-full border border-dashed border-[var(--color-text-subtle)]"
        aria-hidden="true"
      />
    </div>
  )
}

export default RoutineControlTable
