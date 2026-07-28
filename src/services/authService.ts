import { currentUserMock } from '../constants/roles'
import type { AppUser } from '../types/domain'

export interface LoginCredentials {
  email: string
  password: string
}

export interface AuthSession {
  user: AppUser
}

const MOCK_PASSWORD = 'rotinas123'
const SESSION_STORAGE_KEY = 'rotinas.auth-session.v1'

const wait = (milliseconds: number) =>
  new Promise<void>((resolve) => globalThis.setTimeout(resolve, milliseconds))

export async function loginWithMock(
  credentials: LoginCredentials,
): Promise<AuthSession> {
  await wait(400)

  const email = credentials.email.trim().toLocaleLowerCase('pt-BR')
  const expectedEmail = currentUserMock.email.toLocaleLowerCase('pt-BR')

  if (email !== expectedEmail || credentials.password !== MOCK_PASSWORD) {
    throw new Error('E-mail ou senha incorretos.')
  }

  return { user: currentUserMock }
}

export function readMockSession(storage: Storage): AuthSession | null {
  try {
    const storedSession = JSON.parse(
      storage.getItem(SESSION_STORAGE_KEY) ?? 'null',
    ) as { userId?: unknown } | null

    if (storedSession?.userId !== currentUserMock.id) return null

    return { user: currentUserMock }
  } catch {
    storage.removeItem(SESSION_STORAGE_KEY)
    return null
  }
}

export function persistMockSession(storage: Storage, session: AuthSession) {
  storage.setItem(
    SESSION_STORAGE_KEY,
    JSON.stringify({ userId: session.user.id }),
  )
}

export function clearMockSession(storage: Storage) {
  storage.removeItem(SESSION_STORAGE_KEY)
}

export const mockLoginCredentials: LoginCredentials = {
  email: currentUserMock.email,
  password: MOCK_PASSWORD,
}
