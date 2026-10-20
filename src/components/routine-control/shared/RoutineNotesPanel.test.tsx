/** @vitest-environment happy-dom */

import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'

import { NotificationsProvider } from '../../../contexts/NotificationsContext'
import type { Task } from '../../../types/domain'
import { RoutineNotesPanel } from './RoutineCardActions'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

describe('RoutineNotesPanel feedback', () => {
  it('preserves the draft and allows retry after a failed save in a stable status region', async () => {
    const host = document.createElement('div')
    document.body.append(host)
    const root = createRoot(host)
    const onNotesChange = vi
      .fn()
      .mockRejectedValueOnce(new Error('Conexão interrompida'))
      .mockResolvedValueOnce(undefined)
    const task: Task = {
      id: 'task-notes',
      kind: 'ad_hoc',
      clientId: 'client',
      routineId: null,
      departmentId: 'department',
      assigneeId: null,
      status: 'pending',
      period: '2026-10',
      dueDate: '2026-10-19',
      completedAt: null,
      notes: '',
      indicators: { attachments: 0 },
    }
    try {
      await act(async () =>
        root.render(
          <NotificationsProvider>
            <RoutineNotesPanel task={task} onNotesChange={onNotesChange} />
          </NotificationsProvider>,
        ),
      )
      const input = host.querySelector('textarea')!
      const status = host.querySelector('#notes-feedback-task-notes')!
      expect(status.className).toContain('h-5')
      await act(async () => {
        Object.getOwnPropertyDescriptor(
          HTMLTextAreaElement.prototype,
          'value',
        )!.set!.call(input, 'Meu rascunho')
        input.dispatchEvent(new Event('input', { bubbles: true }))
      })
      await act(async () =>
        input.dispatchEvent(new FocusEvent('focusout', { bubbles: true })),
      )
      expect(onNotesChange).toHaveBeenCalledWith('task-notes', 'Meu rascunho')
      expect(input.value).toBe('Meu rascunho')
      expect(input.getAttribute('aria-invalid')).toBe('true')
      expect(status.textContent).toContain('Não foi possível salvar.')
      expect(status.className).toContain('h-5')
      await act(async () =>
        status.querySelector<HTMLButtonElement>('button')!.click(),
      )
      expect(onNotesChange).toHaveBeenCalledTimes(2)
      expect(status.textContent).toBe('Salvo')
      expect(input.getAttribute('aria-invalid')).toBe('false')
    } finally {
      await act(async () => root.unmount())
      host.remove()
    }
  })
})
