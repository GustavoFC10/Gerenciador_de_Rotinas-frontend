/** @vitest-environment happy-dom */

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { RoutineStatusControl } from './RoutineCardActions'
import type { Task } from '../../../types/domain'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

const task: Task = {
  id: 'task-status-menu',
  kind: 'scheduled',
  clientId: 'client-001',
  routineId: 'routine-001',
  departmentId: 'department-001',
  assigneeId: null,
  status: 'pending',
  period: '2026-07',
  dueDate: '2026-07-20',
  completedAt: null,
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

describe('RoutineStatusControl', () => {
  it('renders the status menu outside clipping containers', async () => {
    const onStatusChange = vi.fn()

    await act(async () => {
      root.render(
        <div className="overflow-hidden" data-clipping-container>
          <RoutineStatusControl task={task} onStatusChange={onStatusChange} />
        </div>,
      )
    })

    const trigger = host.querySelector<HTMLButtonElement>(
      '[data-status-menu-trigger]',
    )
    if (!trigger) throw new Error('Status menu trigger not found')

    await act(async () => {
      trigger.click()
      await nextFrame()
    })

    const menu = document.querySelector<HTMLDivElement>('[data-floating-menu]')
    expect(menu).not.toBeNull()
    expect(menu?.parentElement).toBe(document.body)
    expect(host.contains(menu)).toBe(false)
    expect(menu?.className).toContain('fixed')

    const statusOptions =
      menu?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')
    expect(statusOptions).toHaveLength(4)

    await act(async () => {
      statusOptions?.[0]?.click()
    })

    expect(onStatusChange).toHaveBeenCalledWith(task.id, 'in_progress')
    expect(document.querySelector('[data-floating-menu]')).toBeNull()
  })
})

function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => resolve())
  })
}
