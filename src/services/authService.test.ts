import { afterEach, describe, expect, it } from 'vitest'

import {
  currentUserMock,
  leaderUserMock,
  managerUserMock,
} from '../constants/roles'
import {
  clearMockSession,
  loginWithMock,
  mockLoginCredentials,
  mockLoginCredentialsByRole,
  persistMockSession,
  readMockSession,
  registerMockAuthAccount,
  resetMockAuthAccounts,
} from './authService'

afterEach(() => {
  resetMockAuthAccounts()
})

describe('mock authentication service', () => {
  it('authenticates the employee, leader and manager development accounts', async () => {
    await expect(
      Promise.all([
        loginWithMock(mockLoginCredentialsByRole.employee),
        loginWithMock(mockLoginCredentialsByRole.leader),
        loginWithMock(mockLoginCredentialsByRole.manager),
      ]),
    ).resolves.toEqual([
      { user: currentUserMock },
      { user: leaderUserMock },
      { user: managerUserMock },
    ])
    expect(mockLoginCredentials).toEqual(mockLoginCredentialsByRole.manager)

    await expect(
      loginWithMock({
        email: mockLoginCredentialsByRole.employee.email,
        password: 'senha-incorreta',
      }),
    ).rejects.toThrow('E-mail ou senha incorretos.')
  })

  it('persists only the selected user identifier and restores any seeded account', () => {
    const storage = createStorage()
    const session = { user: managerUserMock }

    persistMockSession(storage, session)

    expect(readMockSession(storage)).toEqual(session)
    expect(storage.dump()).not.toContain(mockLoginCredentials.password)
  })

  it('supports a runtime account without storing its password in the session', async () => {
    const storage = createStorage()
    const runtimeUser = {
      ...currentUserMock,
      id: 'user-runtime',
      employeeId: 'employee-runtime',
      email: 'nova.pessoa@example.com',
    }

    registerMockAuthAccount(runtimeUser, 'senha-temporaria')
    const session = await loginWithMock({
      email: ' NOVA.PESSOA@example.com ',
      password: 'senha-temporaria',
    })
    persistMockSession(storage, session)

    expect(session).toEqual({ user: runtimeUser })
    expect(readMockSession(storage)).toEqual(session)
    expect(storage.dump()).not.toContain('senha-temporaria')
  })

  it('clears an invalid or explicitly ended session', () => {
    const storage = createStorage()

    storage.setItem('rotinas.auth-session.v1', '{invalid-json')
    expect(readMockSession(storage)).toBeNull()

    storage.setItem(
      'rotinas.auth-session.v1',
      JSON.stringify({ userId: 'unknown-user' }),
    )
    expect(readMockSession(storage)).toBeNull()
    expect(storage.length).toBe(0)

    persistMockSession(storage, { user: currentUserMock })
    clearMockSession(storage)
    expect(readMockSession(storage)).toBeNull()
  })

  it('rejects duplicate e-mails and empty temporary passwords', () => {
    expect(() =>
      registerMockAuthAccount(
        {
          ...currentUserMock,
          id: 'duplicate-email',
          email: currentUserMock.email.toUpperCase(),
        },
        'senha',
      ),
    ).toThrow('Já existe uma conta com este e-mail.')

    expect(() =>
      registerMockAuthAccount(
        {
          ...currentUserMock,
          id: 'empty-password',
          email: 'sem.senha@example.com',
        },
        '',
      ),
    ).toThrow('Informe uma senha temporária.')
  })
})

function createStorage(): Storage & { dump: () => string } {
  const values = new Map<string, string>()

  return {
    get length() {
      return values.size
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => {
      values.delete(key)
    },
    setItem: (key, value) => {
      values.set(key, value)
    },
    dump: () => JSON.stringify([...values.entries()]),
  }
}
