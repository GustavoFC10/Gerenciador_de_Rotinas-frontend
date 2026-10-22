/** @vitest-environment happy-dom */

import { act, useEffect } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import NotificationCenterTrigger from '../components/feedback/NotificationCenterTrigger'
import { useNotifications } from '../hooks/useNotifications'
import { NotificationsProvider } from './NotificationsContext'
import type { NotificationsContextValue } from './notificationContextDefinition'
import { AuthContext, type AuthContextValue } from './authContextDefinition'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

let root: Root
let host: HTMLDivElement
let notifications: NotificationsContextValue

function Probe() {
  const context = useNotifications()
  useEffect(() => {
    notifications = context
  }, [context])
  return (
    <>
      <input aria-label="Campo de trabalho" />
      <NotificationCenterTrigger />
    </>
  )
}

async function advance(milliseconds: number) {
  await act(async () => {
    vi.advanceTimersByTime(milliseconds)
  })
}

beforeEach(async () => {
  vi.useFakeTimers()
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () =>
    root.render(
      <NotificationsProvider>
        <Probe />
      </NotificationsProvider>,
    ),
  )
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.useRealTimers()
})

describe('NotificationsProvider', () => {
  it('clears the previous membership history and rejects callbacks from its old session scope', async () => {
    const authValue = (membershipId: string): AuthContextValue => ({
      session: null,
      user: null,
      activeMembership: {
        id: membershipId,
        organization: { id: 'organization' },
      } as NonNullable<AuthContextValue['activeMembership']>,
      memberships: [],
      isAuthenticated: true,
      isInitializing: false,
      initializationError: null,
      login: async () => {
        throw new Error('Unused')
      },
      logout: async () => undefined,
      selectActiveMembership: async () => undefined,
      refreshSession: async () => undefined,
    })
    const renderScope = (membershipId: string) =>
      root.render(
        <AuthContext.Provider value={authValue(membershipId)}>
          <NotificationsProvider>
            <Probe />
          </NotificationsProvider>
        </AuthContext.Provider>,
      )
    await act(async () => renderScope('first-member'))
    const previousNotify = notifications.notify
    await act(async () => {
      notifications.notify({
        title: 'Falha da organização anterior',
        tone: 'error',
      })
      notifications.setActivity('refresh', 'Atualizando dados')
    })
    expect(notifications.history).toHaveLength(1)
    await act(async () => renderScope('second-member'))
    expect(notifications.history).toHaveLength(0)
    expect(notifications.activities).toEqual({})
    await act(async () =>
      previousNotify({ title: 'Resposta tardia', tone: 'error' }),
    )
    expect(notifications.notifications).toHaveLength(0)
    await act(async () =>
      notifications.notify({ title: 'Nova sessão', tone: 'success' }),
    )
    expect(document.body.textContent).toContain('Nova sessão')
  })

  it('allows components to render outside the application provider', async () => {
    await act(async () => root.render(<Probe />))
    expect(notifications.isAvailable).toBe(false)
    expect(
      notifications.notify({ title: 'Prévia isolada', tone: 'success' }),
    ).toBe('')
  })

  it('expires successes and errors independently and keeps errors accessible', async () => {
    await act(async () => {
      notifications.notify({ title: 'Perfil atualizado', tone: 'success' })
      notifications.notify({
        title: 'Falha ao salvar',
        message: 'Sua conexão foi interrompida.',
        tone: 'error',
      })
    })
    await advance(4000)
    expect(document.body.textContent).not.toContain('Perfil atualizado')
    expect(document.querySelector('[role="alert"]')?.textContent).toContain(
      'Falha ao salvar',
    )
    await advance(4000)
    expect(document.querySelector('[role="alert"]')).toBeNull()
    expect(notifications.history).toHaveLength(1)
    await act(async () => notifications.openHistory())
    expect(document.querySelector('[role="dialog"]')?.textContent).toContain(
      'Sua conexão foi interrompida.',
    )
  })

  it('deduplicates repeated messages and starts their duration again', async () => {
    let initial = ''
    await act(async () => {
      initial = notifications.notify({
        title: 'Copiado',
        tone: 'success',
        duration: 3000,
        dedupeKey: 'copy',
      })
    })
    await advance(2500)
    await act(async () => {
      expect(
        notifications.notify({
          title: 'Código copiado',
          tone: 'success',
          duration: 3000,
          dedupeKey: 'copy',
        }),
      ).toBe(initial)
    })
    expect(notifications.notifications).toHaveLength(1)
    await advance(2500)
    expect(document.body.textContent).toContain('Código copiado')
    await advance(500)
    expect(document.body.textContent).not.toContain('Código copiado')
  })

  it('limits the viewport to two toasts and prioritizes a failure', async () => {
    await act(async () => {
      notifications.notify({ title: 'Primeiro', tone: 'success' })
      notifications.notify({ title: 'Segundo', tone: 'success' })
      notifications.notify({ title: 'Falha prioritária', tone: 'error' })
    })
    expect(
      document.querySelectorAll('[role="status"], [role="alert"]'),
    ).toHaveLength(2)
    expect(document.body.textContent).toContain('Falha prioritária')
    expect(document.body.textContent).not.toContain('Segundo')
    await advance(4000)
    expect(document.body.textContent).toContain('Segundo')
    await advance(3999)
    expect(document.body.textContent).toContain('Segundo')
    await advance(1)
    expect(document.body.textContent).not.toContain('Segundo')
  })

  it('pauses on hover and keyboard focus without stealing the working field focus', async () => {
    const input = host.querySelector('input')!
    input.focus()
    await act(async () =>
      notifications.notify({ title: 'Sucesso discreto', tone: 'success' }),
    )
    expect(document.activeElement).toBe(input)
    const toast = document.querySelector('[role="status"]')!
    await advance(1000)
    await act(async () =>
      toast.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })),
    )
    await advance(10000)
    expect(document.body.textContent).toContain('Sucesso discreto')
    await act(async () =>
      toast.dispatchEvent(
        new MouseEvent('mouseout', {
          bubbles: true,
          relatedTarget: document.body,
        }),
      ),
    )
    const close = toast.querySelector('button')!
    await act(async () => close.focus())
    await advance(10000)
    expect(document.body.textContent).toContain('Sucesso discreto')
    await act(async () => input.focus())
    await advance(2999)
    expect(document.body.textContent).toContain('Sucesso discreto')
    await advance(1)
    expect(document.body.textContent).not.toContain('Sucesso discreto')
  })

  it('pauses when the browser tab is hidden', async () => {
    await act(async () =>
      notifications.notify({ title: 'Aba pausada', tone: 'success' }),
    )
    await advance(1000)
    const descriptor = Object.getOwnPropertyDescriptor(
      document,
      'visibilityState',
    )
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'hidden',
    })
    await act(async () => document.dispatchEvent(new Event('visibilitychange')))
    await advance(15000)
    expect(document.body.textContent).toContain('Aba pausada')
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    })
    await act(async () => document.dispatchEvent(new Event('visibilitychange')))
    await advance(3000)
    expect(document.body.textContent).not.toContain('Aba pausada')
    if (descriptor)
      Object.defineProperty(document, 'visibilityState', descriptor)
    else Reflect.deleteProperty(document, 'visibilityState')
  })

  it('keeps a toast read-only while a dialog owns keyboard focus', async () => {
    const dialog = document.createElement('div')
    dialog.setAttribute('role', 'dialog')
    dialog.setAttribute('aria-modal', 'true')
    document.body.append(dialog)
    const onClick = vi.fn()
    await act(async () =>
      notifications.notify({
        title: 'Um envio falhou',
        tone: 'error',
        action: { label: 'Ver envios', onClick },
      }),
    )
    expect(document.querySelector('[role="alert"]')?.textContent).toContain(
      'Um envio falhou',
    )
    expect(document.querySelector('[role="alert"] button')).toBeNull()
    expect(
      document
        .querySelector('[role="alert"]')
        ?.classList.contains('pointer-events-none'),
    ).toBe(true)
    await act(async () => dialog.remove())
    expect(
      document.querySelector('[role="alert"] button')?.textContent,
    ).toContain('Ver envios')
  })

  it('hides and pauses upload summaries while their panel is open', async () => {
    await act(async () =>
      notifications.notify({
        title: 'Anexos adicionados',
        tone: 'success',
        category: 'uploads',
      }),
    )
    await advance(1000)
    const panel = document.createElement('div')
    panel.setAttribute('data-overlay-dialog', 'uploads')
    await act(async () => document.body.append(panel))
    expect(
      document.querySelector('[role="status"]')?.getAttribute('aria-hidden'),
    ).toBe('true')
    await advance(12000)
    expect(notifications.notifications).toHaveLength(1)
    await act(async () => panel.remove())
    expect(
      document.querySelector('[role="status"]')?.getAttribute('aria-hidden'),
    ).toBeNull()
    await advance(2999)
    expect(notifications.notifications).toHaveLength(1)
    await advance(1)
    expect(notifications.notifications).toHaveLength(0)
  })

  it('opens history only on request and restores focus when it closes', async () => {
    await act(async () =>
      notifications.notify({ title: 'Falha registrada', tone: 'error' }),
    )
    const trigger = host.querySelector('button')!
    trigger.focus()
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    await act(async () => trigger.click())
    const panel = document.querySelector('[role="dialog"]')!
    expect(panel.contains(document.activeElement)).toBe(true)
    await act(async () =>
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      ),
    )
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })
})
