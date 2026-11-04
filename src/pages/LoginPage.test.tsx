/** @vitest-environment happy-dom */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  AuthContext,
  type AuthContextValue,
} from '../contexts/authContextDefinition'
import { ApiError } from '../services/httpClient'
import LoginPage from './LoginPage'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-10-29T15:00:00Z'))
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

function failure(status: number, retryAfter = '5') {
  return new ApiError({
    problem: { type: 'request-failed', title: 'Senha incorreta', status },
    requestId: 'login-request',
    response: new Response(null, {
      status,
      headers: { 'Retry-After': retryAfter },
    }),
  })
}

async function render(
  login: AuthContextValue['login'],
  initializationError: Error | null = null,
) {
  const auth: AuthContextValue = {
    session: null,
    user: null,
    memberships: [],
    activeMembership: null,
    isAuthenticated: false,
    isInitializing: false,
    initializationError,
    login,
    logout: vi.fn(),
    selectActiveMembership: vi.fn(),
    refreshSession: vi.fn(),
  }
  await act(async () =>
    root.render(
      <AuthContext value={auth}>
        <MemoryRouter initialEntries={['/login']}>
          <LoginPage />
        </MemoryRouter>
      </AuthContext>,
    ),
  )
}

async function fillCredentials() {
  await act(async () => {
    for (const [name, value] of [
      ['email', 'ana@empresa.com'],
      ['password', 'senha preservada'],
    ]) {
      const input = host.querySelector<HTMLInputElement>(
        `input[name="${name}"]`,
      )!
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        'value',
      )!.set!.call(input, value)
      input.dispatchEvent(new Event('input', { bubbles: true }))
    }
  })
}

async function submit() {
  await act(async () => {
    host
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  })
}

describe('LoginPage service availability', () => {
  it.each([503, 429])(
    'preserves credentials on HTTP %i and permits retry only after Retry-After',
    async (status) => {
      const login = vi
        .fn<AuthContextValue['login']>()
        .mockRejectedValue(failure(status))
      await render(login)
      await fillCredentials()
      await submit()
      const button = host.querySelector<HTMLButtonElement>(
        'button[type="submit"]',
      )!
      expect(host.querySelector('[role="alert"]')?.textContent).toContain(
        status === 503 ? 'indisponível temporariamente' : 'Muitas tentativas',
      )
      expect(host.querySelector('[role="alert"]')?.textContent).toContain(
        'login-request',
      )
      expect(host.querySelector('[role="alert"]')?.textContent).not.toContain(
        'Senha incorreta',
      )
      expect(
        host.querySelector<HTMLInputElement>('input[name="email"]')?.value,
      ).toBe('ana@empresa.com')
      expect(
        host.querySelector<HTMLInputElement>('input[name="password"]')?.value,
      ).toBe('senha preservada')
      expect(button.disabled).toBe(true)
      await submit()
      expect(login).toHaveBeenCalledTimes(1)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(4999)
      })
      expect(button.disabled).toBe(true)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1)
      })
      expect(button.disabled).toBe(false)
      expect(login).toHaveBeenCalledTimes(1)
      await submit()
      expect(login).toHaveBeenCalledTimes(2)
      expect(login).toHaveBeenLastCalledWith({
        email: 'ana@empresa.com',
        password: 'senha preservada',
      })
    },
  )

  it('respects an HTTP-date Retry-After when restoring the session fails', async () => {
    const login = vi.fn<AuthContextValue['login']>()
    await render(login, failure(503, 'Thu, 29 Oct 2026 15:00:05 GMT'))
    const button = host.querySelector<HTMLButtonElement>(
      'button[type="submit"]',
    )!
    expect(host.querySelector('[role="alert"]')?.textContent).toContain(
      'indisponível temporariamente',
    )
    expect(button.disabled).toBe(true)
    await fillCredentials()
    await submit()
    expect(login).not.toHaveBeenCalled()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })
    expect(button.disabled).toBe(false)
  })
})
