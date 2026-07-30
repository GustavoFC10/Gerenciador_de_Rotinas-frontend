import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import { createPortal } from 'react-dom'

import {
  ROUTINE_STATUS,
  routineStatusConfig,
} from '../../constants/routineStatus'
import type {
  EntityId,
  RoutineStatus,
  Task,
  TaskLink,
} from '../../types/domain'
import {
  getTaskLinkHost,
  normalizeTaskLinkUrl,
} from '../../utils/taskLinks'

type TaskSubmenu = 'status' | 'links'

interface TaskContextMenuProps {
  task: Task
  label: string
  x: number
  y: number
  onClose: (restoreFocus: boolean) => void
  onStatusChange?: (taskId: EntityId, status: RoutineStatus) => void
  onAttachmentAdd?: (task: Task) => void
}

const statusOrder = [
  ROUTINE_STATUS.PENDING,
  ROUTINE_STATUS.IN_PROGRESS,
  ROUTINE_STATUS.ERROR,
  ROUTINE_STATUS.COMPLETED,
  ROUTINE_STATUS.NO_MOVEMENT,
] satisfies RoutineStatus[]

function TaskContextMenu({
  task,
  label,
  x,
  y,
  onClose,
  onStatusChange,
  onAttachmentAdd,
}: TaskContextMenuProps) {
  const rootMenuRef = useRef<HTMLDivElement | null>(null)
  const submenuRef = useRef<HTMLDivElement | null>(null)
  const statusTriggerRef = useRef<HTMLButtonElement | null>(null)
  const linksTriggerRef = useRef<HTMLButtonElement | null>(null)
  const onCloseRef = useRef(onClose)
  const [activeSubmenu, setActiveSubmenu] = useState<TaskSubmenu | null>(null)
  const [rootPosition, setRootPosition] = useState({ x, y })
  const [submenuPosition, setSubmenuPosition] = useState({ x, y })
  const links = getSafeTaskLinks(task.links)
  const currentStatus =
    routineStatusConfig[task.status] ??
    routineStatusConfig[ROUTINE_STATUS.PENDING]

  onCloseRef.current = onClose

  useLayoutEffect(() => {
    const menu = rootMenuRef.current
    if (!menu) return

    setRootPosition(clampToViewport(x, y, menu.getBoundingClientRect()))
  }, [task.id, x, y])

  useLayoutEffect(() => {
    if (!activeSubmenu) return

    const submenu = submenuRef.current
    const trigger =
      activeSubmenu === 'status'
        ? statusTriggerRef.current
        : linksTriggerRef.current

    if (!submenu || !trigger) return

    const triggerBounds = trigger.getBoundingClientRect()
    const submenuBounds = submenu.getBoundingClientRect()
    const margin = 8
    const gap = 5
    const preferredRight = triggerBounds.right + gap
    const nextX =
      preferredRight + submenuBounds.width <= window.innerWidth - margin
        ? preferredRight
        : triggerBounds.left - submenuBounds.width - gap

    setSubmenuPosition(
      clampToViewport(nextX, triggerBounds.top - 6, submenuBounds, margin),
    )
  }, [activeSubmenu, links.length, rootPosition.x, rootPosition.y, task.id])

  useEffect(() => {
    const focusFrame = window.requestAnimationFrame(() => {
      getRootMenuItems(rootMenuRef.current)[0]?.focus()
    })

    function handlePointerDown(event: PointerEvent) {
      if (!(event.target instanceof Node)) return

      const isInsideRoot = rootMenuRef.current?.contains(event.target)
      const isInsideSubmenu = submenuRef.current?.contains(event.target)

      if (!isInsideRoot && !isInsideSubmenu) {
        onCloseRef.current(false)
      }
    }

    function closeWithoutRestoringFocus() {
      onCloseRef.current(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('blur', closeWithoutRestoringFocus)
    window.addEventListener('resize', closeWithoutRestoringFocus)
    window.addEventListener('scroll', closeWithoutRestoringFocus, true)

    return () => {
      window.cancelAnimationFrame(focusFrame)
      document.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('blur', closeWithoutRestoringFocus)
      window.removeEventListener('resize', closeWithoutRestoringFocus)
      window.removeEventListener('scroll', closeWithoutRestoringFocus, true)
    }
  }, [task.id, x, y])

  function openSubmenu(submenu: TaskSubmenu, moveFocus: boolean) {
    setActiveSubmenu(submenu)

    if (moveFocus) {
      window.requestAnimationFrame(() => {
        getSubmenuItems(submenuRef.current)[0]?.focus()
      })
    }
  }

  function closeSubmenu(restoreParentFocus: boolean) {
    const submenu = activeSubmenu
    setActiveSubmenu(null)

    if (!restoreParentFocus) return

    window.requestAnimationFrame(() => {
      if (submenu === 'status') {
        statusTriggerRef.current?.focus()
      } else {
        linksTriggerRef.current?.focus()
      }
    })
  }

  function handleRootKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.preventDefault()
      onClose(true)
      return
    }

    if (event.key === 'Tab') {
      onClose(false)
      return
    }

    const target = document.activeElement as HTMLElement | null

    if (event.key === 'ArrowRight') {
      if (target === statusTriggerRef.current) {
        event.preventDefault()
        openSubmenu('status', true)
      } else if (target === linksTriggerRef.current) {
        event.preventDefault()
        openSubmenu('links', true)
      }
      return
    }

    moveMenuFocus(event, getRootMenuItems(rootMenuRef.current))
  }

  function handleSubmenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape' || event.key === 'ArrowLeft') {
      event.preventDefault()
      closeSubmenu(true)
      return
    }

    if (event.key === 'Tab') {
      onClose(false)
      return
    }

    moveMenuFocus(event, getSubmenuItems(submenuRef.current))
  }

  function handleStatusChange(status: RoutineStatus) {
    onStatusChange?.(task.id, status)
    onClose(true)
  }

  function handleAttachmentAdd() {
    onAttachmentAdd?.(task)
    onClose(true)
  }

  return createPortal(
    <>
      <div
        ref={rootMenuRef}
        id="task-context-menu"
        role="menu"
        aria-label={`Ações da tarefa ${label}`}
        onKeyDown={handleRootKeyDown}
        onContextMenu={(event) => event.preventDefault()}
        className="fixed z-[120] w-72 max-w-[calc(100vw-1rem)] rounded-[var(--radius-panel)] border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] p-1.5 text-[var(--color-text-main)] shadow-[var(--shadow-floating)]"
        style={{ left: rootPosition.x, top: rootPosition.y }}
        data-task-context-menu
      >
       

        <div className="pt-1" role="presentation">
          {onStatusChange && (
            <button
              ref={statusTriggerRef}
              type="button"
              role="menuitem"
              tabIndex={-1}
              data-root-menu-item
              aria-haspopup="menu"
              aria-expanded={activeSubmenu === 'status'}
              aria-controls={
                activeSubmenu === 'status'
                  ? 'task-status-context-submenu'
                  : undefined
              }
              onClick={() => openSubmenu('status', true)}
              onMouseEnter={() => openSubmenu('status', false)}
              className="flex min-h-10 w-full items-center gap-2 rounded-[var(--radius-control)] px-2.5 text-left text-sm font-semibold outline-none hover:bg-[var(--color-control-hover-bg)] focus:bg-[var(--color-control-hover-bg)]"
            >
              <span
                className={`size-2.5 shrink-0 rounded-full ${currentStatus.dotClass}`}
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1">Estado</span>
              <span className="max-w-28 truncate text-xs font-medium text-[var(--color-text-muted)]">
                {currentStatus.label}
              </span>
              <ChevronRightIcon />
            </button>
          )}

          {onAttachmentAdd && (
            <button
              type="button"
              role="menuitem"
              tabIndex={-1}
              data-root-menu-item
              onClick={handleAttachmentAdd}
              onMouseEnter={() => setActiveSubmenu(null)}
              className="flex min-h-10 w-full items-center gap-2 rounded-[var(--radius-control)] px-2.5 text-left text-sm font-semibold outline-none hover:bg-[var(--color-control-hover-bg)] focus:bg-[var(--color-control-hover-bg)]"
            >
              <AttachmentIcon />
              <span className="flex-1">Anexar arquivo…</span>
            </button>
          )}

          <div
            className="my-1 border-t border-[var(--color-divider)]"
            role="separator"
          />

          <button
            ref={linksTriggerRef}
            type="button"
            role="menuitem"
            tabIndex={-1}
            data-root-menu-item
            aria-haspopup="menu"
            aria-expanded={activeSubmenu === 'links'}
            aria-controls={
              activeSubmenu === 'links'
                ? 'task-links-context-submenu'
                : undefined
            }
            onClick={() => openSubmenu('links', true)}
            onMouseEnter={() => openSubmenu('links', false)}
            className="flex min-h-10 w-full items-center gap-2 rounded-[var(--radius-control)] px-2.5 text-left text-sm font-semibold outline-none hover:bg-[var(--color-control-hover-bg)] focus:bg-[var(--color-control-hover-bg)]"
          >
            <LinkIcon />
            <span className="min-w-0 flex-1">Links salvos</span>
            <span className="text-xs font-medium text-[var(--color-text-muted)]">
              {links.length}
            </span>
            <ChevronRightIcon />
          </button>
        </div>
      </div>

      {activeSubmenu === 'status' && (
        <div
          ref={submenuRef}
          id="task-status-context-submenu"
          role="menu"
          aria-label="Selecionar estado"
          onKeyDown={handleSubmenuKeyDown}
          onContextMenu={(event) => event.preventDefault()}
          className="fixed z-[121] w-64 max-w-[calc(100vw-1rem)] rounded-[var(--radius-panel)] border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] p-1.5 text-[var(--color-text-main)] shadow-[var(--shadow-floating)]"
          style={{ left: submenuPosition.x, top: submenuPosition.y }}
        >
          <p
            className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--color-text-subtle)]"
            role="presentation"
          >
            Selecionar estado
          </p>
          {statusOrder.map((status) => {
            const config = routineStatusConfig[status]
            const isCurrent = task.status === status

            return (
              <button
                key={status}
                type="button"
                role="menuitemradio"
                tabIndex={-1}
                aria-checked={isCurrent}
                data-submenu-item
                onClick={() => handleStatusChange(status)}
                className={`flex min-h-10 w-full items-center gap-2 rounded-[var(--radius-control)] px-2.5 text-left text-sm font-semibold outline-none hover:bg-[var(--color-control-hover-bg)] focus:bg-[var(--color-control-hover-bg)] ${
                  isCurrent ? 'bg-[var(--color-control-hover-bg)]' : ''
                }`}
              >
                <span
                  className={`size-2.5 shrink-0 rounded-full ${config.dotClass}`}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1">{config.label}</span>
                {isCurrent && <CheckIcon />}
              </button>
            )
          })}
        </div>
      )}

      {activeSubmenu === 'links' && (
        <div
          ref={submenuRef}
          id="task-links-context-submenu"
          role="menu"
          aria-label="Links salvos da tarefa"
          onKeyDown={handleSubmenuKeyDown}
          onContextMenu={(event) => event.preventDefault()}
          className="fixed z-[121] max-h-[min(26rem,calc(100dvh-1rem))] w-72 max-w-[calc(100vw-1rem)] overflow-y-auto rounded-[var(--radius-panel)] border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] p-1.5 text-[var(--color-text-main)] shadow-[var(--shadow-floating)]"
          style={{ left: submenuPosition.x, top: submenuPosition.y }}
        >
          <p
            className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--color-text-subtle)]"
            role="presentation"
          >
            Abrir link
          </p>

          {links.length > 0 ? (
            links.map((link) => (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                role="menuitem"
                tabIndex={-1}
                data-submenu-item
                onClick={() => onClose(true)}
                className="flex min-h-12 w-full items-center gap-2 rounded-[var(--radius-control)] px-2.5 text-left outline-none hover:bg-[var(--color-control-hover-bg)] focus:bg-[var(--color-control-hover-bg)]"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-[var(--color-text-strong)]">
                    {link.label}
                  </span>
                  <span className="block truncate text-[11px] text-[var(--color-text-muted)]">
                    {getTaskLinkHost(link.url)}
                  </span>
                </span>
                <ExternalLinkIcon />
              </a>
            ))
          ) : (
            <div
              role="menuitem"
              aria-disabled="true"
              tabIndex={-1}
              data-submenu-item
              className="flex min-h-10 items-center rounded-[var(--radius-control)] px-2.5 text-sm font-medium text-[var(--color-text-subtle)] outline-none focus:bg-[var(--color-control-hover-bg)]"
            >
              Nenhum link cadastrado
            </div>
          )}
        </div>
      )}
    </>,
    document.body,
  )
}

function clampToViewport(
  x: number,
  y: number,
  bounds: Pick<DOMRect, 'width' | 'height'>,
  margin = 8,
) {
  return {
    x: Math.max(margin, Math.min(x, window.innerWidth - bounds.width - margin)),
    y: Math.max(
      margin,
      Math.min(y, window.innerHeight - bounds.height - margin),
    ),
  }
}

function moveMenuFocus(
  event: KeyboardEvent<HTMLDivElement>,
  items: HTMLElement[],
) {
  if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return

  event.preventDefault()

  if (event.key === 'Home') {
    items[0]?.focus()
    return
  }

  if (event.key === 'End') {
    items.at(-1)?.focus()
    return
  }

  const currentIndex = items.indexOf(document.activeElement as HTMLElement)
  const direction = event.key === 'ArrowDown' ? 1 : -1
  const nextIndex =
    currentIndex < 0
      ? 0
      : (currentIndex + direction + items.length) % items.length

  items[nextIndex]?.focus()
}

function getRootMenuItems(menu: HTMLDivElement | null): HTMLElement[] {
  return menu
    ? [...menu.querySelectorAll<HTMLElement>('[data-root-menu-item]')]
    : []
}

function getSubmenuItems(menu: HTMLDivElement | null): HTMLElement[] {
  return menu
    ? [...menu.querySelectorAll<HTMLElement>('[data-submenu-item]')]
    : []
}

function getSafeTaskLinks(links: TaskLink[] | undefined): TaskLink[] {
  return (links ?? []).flatMap((link) => {
    const normalizedUrl = normalizeTaskLinkUrl(link.url)
    return normalizedUrl ? [{ ...link, url: normalizedUrl }] : []
  })
}

function AttachmentIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-4 shrink-0 text-[var(--color-text-muted)]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m20.5 11.5-8.8 8.8a6 6 0 0 1-8.5-8.5l9.5-9.5a4 4 0 0 1 5.7 5.7l-9.6 9.6a2 2 0 0 1-2.8-2.8l8.8-8.8" />
    </svg>
  )
}

function LinkIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-4 shrink-0 text-[var(--color-text-muted)]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.1 1.1" />
      <path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.1-1.1" />
    </svg>
  )
}

function ExternalLinkIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-4 shrink-0 text-[var(--color-text-muted)]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14 4h6v6M20 4l-9 9" />
      <path d="M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6" />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-4 shrink-0 text-[var(--color-text-subtle)]"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m9 6 6 6-6 6" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-4 shrink-0 text-[var(--color-brand)]"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m5 12 4 4L19 6" />
    </svg>
  )
}

export default TaskContextMenu
