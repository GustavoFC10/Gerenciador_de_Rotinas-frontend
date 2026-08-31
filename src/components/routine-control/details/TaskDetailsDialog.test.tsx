/** @vitest-environment happy-dom */

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Task } from '../../../types/domain'
import TaskDetailsDialog from './TaskDetailsDialog'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

let host: HTMLDivElement
let trigger: HTMLButtonElement
let root: Root
let isMounted: boolean

beforeEach(() => {
  host = document.createElement('div')
  host.id = 'root'
  trigger = document.createElement('button')
  trigger.textContent = 'Abrir detalhes'
  document.body.append(host, trigger)
  trigger.focus()
  root = createRoot(host)
  isMounted = true
})

afterEach(async () => {
  if (isMounted) {
    await act(async () => {
      root.unmount()
    })
  }
  document.body.innerHTML = ''
})

describe('TaskDetailsDialog', () => {
  it('restores document state and the trigger focus after closing', async () => {
    const onClose = vi.fn()

    await act(async () => {
      root.render(<TaskDetailsDialog task={task} onClose={onClose} />)
    })

    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull()
    expect(host.getAttribute('aria-hidden')).toBe('true')
    expect(document.body.style.overflow).toBe('hidden')

    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    })

    expect(onClose).toHaveBeenCalledOnce()

    await act(async () => {
      root.unmount()
    })
    isMounted = false

    expect(host.hasAttribute('aria-hidden')).toBe(false)
    expect(document.body.style.overflow).toBe('')
    expect(document.activeElement).toBe(trigger)
  })
})

const task: Task = {
  id: 'task-1',
  kind: 'ad_hoc',
  clientId: null,
  routineId: null,
  departmentId: 'department-1',
  assigneeId: null,
  status: 'pending',
  period: '2026-08',
  dueDate: '2026-08-31',
  completedAt: null,
  title: 'Conferir pendencias',
  indicators: { attachments: 0 },
}
