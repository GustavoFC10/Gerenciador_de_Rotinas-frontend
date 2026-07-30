/** @vitest-environment happy-dom */

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import TaskContextMenu from './TaskContextMenu'
import type { Task } from '../../types/domain'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

const task: Task = {
  id: 'task-context-menu',
  clientId: 'client-0001',
  routineId: 'routine-importar',
  departmentId: 'dept-fiscal',
  assigneeId: 'employee-001',
  status: 'in_progress',
  period: '2026-07',
  dueDate: '2026-07-31',
  completedAt: null,
  links: [
    {
      id: 'link-notas',
      label: 'Portal de notas',
      url: 'https://notas.exemplo.com/importar',
    },
    {
      id: 'link-unsafe',
      label: 'Link inseguro',
      url: 'javascript:alert(1)',
    },
  ],
  indicators: { attachments: 0 },
}

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => {
    root.unmount()
  })
  document.body.innerHTML = ''
})

describe('TaskContextMenu', () => {
  it('changes status and attaches a file through the selected task', async () => {
    const onClose = vi.fn()
    const onStatusChange = vi.fn()
    const onAttachmentAdd = vi.fn()

    await renderMenu({ onClose, onStatusChange, onAttachmentAdd })

    const statusTrigger = getButtonByText('Estado')
    expect(statusTrigger.tabIndex).toBe(-1)

    await act(async () => {
      statusTrigger.click()
      await nextFrame()
    })

    const statusItems = [
      ...document.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]'),
    ]
    expect(statusItems).toHaveLength(5)
    expect(statusItems[1]?.getAttribute('aria-checked')).toBe('true')

    await act(async () => {
      statusItems[3]?.click()
    })

    expect(onStatusChange).toHaveBeenCalledWith(task.id, 'completed')
    expect(onClose).toHaveBeenCalledWith(true)

    await renderMenu({ onClose, onStatusChange, onAttachmentAdd })

    await act(async () => {
      getButtonByText('Anexar arquivo').click()
    })

    expect(onAttachmentAdd).toHaveBeenCalledWith(task)
    expect(onClose).toHaveBeenLastCalledWith(true)
  })

  it('opens only safe links and supports submenu keyboard navigation', async () => {
    const onClose = vi.fn()

    await renderMenu({
      onClose,
      onStatusChange: vi.fn(),
      onAttachmentAdd: vi.fn(),
    })

    const statusTrigger = getButtonByText('Estado')
    statusTrigger.focus()

    await act(async () => {
      statusTrigger.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'ArrowRight',
          bubbles: true,
        }),
      )
      await nextFrame()
    })

    const statusItems = [
      ...document.querySelectorAll<HTMLElement>('[data-submenu-item]'),
    ]
    expect(document.activeElement).toBe(statusItems[0])

    await act(async () => {
      statusItems[0]?.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'ArrowDown',
          bubbles: true,
        }),
      )
    })
    expect(document.activeElement).toBe(statusItems[1])

    await act(async () => {
      statusItems[1]?.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'ArrowLeft',
          bubbles: true,
        }),
      )
      await nextFrame()
    })
    expect(document.activeElement).toBe(statusTrigger)

    await act(async () => {
      getButtonByText('Links salvos').click()
      await nextFrame()
    })

    const links = [
      ...document.querySelectorAll<HTMLAnchorElement>(
        '#task-links-context-submenu a',
      ),
    ]
    expect(links).toHaveLength(1)
    expect(links[0]?.textContent).toContain('Portal de notas')
    expect(links[0]?.textContent).toContain('notas.exemplo.com')
    expect(links[0]?.target).toBe('_blank')
    expect(document.body.textContent).not.toContain('Link inseguro')
  })
})

async function renderMenu({
  onClose,
  onStatusChange,
  onAttachmentAdd,
}: {
  onClose: (restoreFocus: boolean) => void
  onStatusChange: (taskId: string, status: Task['status']) => void
  onAttachmentAdd: (selectedTask: Task) => void
}) {
  await act(async () => {
    root.render(
      <TaskContextMenu
        task={task}
        label="Importar notas · Empresa Alpha"
        x={120}
        y={80}
        onClose={onClose}
        onStatusChange={onStatusChange}
        onAttachmentAdd={onAttachmentAdd}
      />,
    )
    await nextFrame()
  })
}

function getButtonByText(text: string): HTMLButtonElement {
  const button = [
    ...document.querySelectorAll<HTMLButtonElement>('button'),
  ].find((candidate) => candidate.textContent?.includes(text))

  if (!button) throw new Error(`Button not found: ${text}`)
  return button
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => resolve())
  })
}
