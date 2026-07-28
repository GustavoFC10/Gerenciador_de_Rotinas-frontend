import { describe, expect, it } from 'vitest'

import { currentUserMock } from '../constants/roles'
import {
  clearMockSession,
  loginWithMock,
  mockLoginCredentials,
  persistMockSession,
  readMockSession,
} from './authService'

describe('mock authentication service', () => {
  it('authenticates only the development credentials', async () => {
    await expect(loginWithMock(mockLoginCredentials)).resolves.toEqual({
      user: currentUserMock,
    })
    await expect(
      loginWithMock({
        email: mockLoginCredentials.email,
        password: 'senha-incorreta',
      }),
    ).rejects.toThrow('E-mail ou senha incorretos.')
  })

  it('persists only the user identifier and restores the session', () => {
    const storage = createStorage()
    const session = { user: currentUserMock }

    persistMockSession(storage, session)

    expect(readMockSession(storage)).toEqual(session)
    expect(storage.dump()).not.toContain(mockLoginCredentials.password)
  })

  it('clears an invalid or explicitly ended session', () => {
    const storage = createStorage()

    storage.setItem('rotinas.auth-session.v1', '{invalid-json')
    expect(readMockSession(storage)).toBeNull()

    persistMockSession(storage, { user: currentUserMock })
    clearMockSession(storage)
    expect(readMockSession(storage)).toBeNull()
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
