/** @vitest-environment happy-dom */

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  currentUserMock,
  leaderUserMock,
  managerUserMock,
} from '../../constants/roles'
import { AuthContext } from '../../contexts/authContextDefinition'
import type { AuthContextValue } from '../../contexts/authContextDefinition'
import type { AppUser } from '../../types/domain'
import { APP_PERMISSION } from '../../utils/permissions'
import RequirePermission from './RequirePermission'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

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

describe('RequirePermission', () => {
  it('renders protected content for an authorized manager', async () => {
    await renderGuard(managerUserMock, APP_PERMISSION.CREATE_EMPLOYEE)

    expect(host.querySelector('[data-protected]')?.textContent).toBe(
      'Conteúdo protegido',
    )
  })

  it('redirects an authenticated employee without permission', async () => {
    await renderGuard(currentUserMock, APP_PERMISSION.CREATE_COMPANY)

    expect(host.querySelector('[data-location]')?.textContent).toBe('/')
    expect(
      host.querySelector('[data-location]')?.getAttribute('data-state'),
    ).toContain('"accessDenied":true')
  })

  it('applies department scope to a leader', async () => {
    await renderGuard(leaderUserMock, APP_PERMISSION.CREATE_ROUTINE, [
      'dept-contabil',
    ])

    expect(host.querySelector('[data-location]')?.textContent).toBe('/')
  })

  it('sends an unauthenticated visitor to login with a safe return location', async () => {
    await renderGuard(null, APP_PERMISSION.CREATE_ROUTINE)

    const location = host.querySelector('[data-location]')
    expect(location?.textContent).toBe('/login')
    expect(location?.getAttribute('data-state')).toContain(
      '"/cadastro?origem=sidebar#form"',
    )
  })
})

async function renderGuard(
  user: AppUser | null,
  permission: (typeof APP_PERMISSION)[keyof typeof APP_PERMISSION],
  departmentIds: string[] = [],
) {
  const authValue: AuthContextValue = {
    user,
    isAuthenticated: Boolean(user),
    login: async () => undefined,
    logout: () => undefined,
  }

  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={['/cadastro?origem=sidebar#form']}>
        <AuthContext.Provider value={authValue}>
          <Routes>
            <Route
              path="/cadastro"
              element={
                <RequirePermission
                  permission={permission}
                  departmentIds={departmentIds}
                >
                  <p data-protected>Conteúdo protegido</p>
                </RequirePermission>
              }
            />
            <Route path="/" element={<LocationProbe />} />
            <Route path="/login" element={<LocationProbe />} />
          </Routes>
        </AuthContext.Provider>
      </MemoryRouter>,
    )
  })
}

function LocationProbe() {
  const location = useLocation()

  return (
    <output data-location data-state={JSON.stringify(location.state)}>
      {location.pathname}
    </output>
  )
}
