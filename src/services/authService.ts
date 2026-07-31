import {
  appUsersMock,
  currentUserMock,
  leaderUserMock,
  managerUserMock,
} from '../constants/roles'
import type { AppUser, UserRole } from '../types/domain'

export interface LoginCredentials {
  email: string
  password: string
}

export interface AuthSession {
  user: AppUser
}

const MOCK_PASSWORD = 'rotinas123'
const SESSION_STORAGE_KEY = 'rotinas.auth-session.v1'
const seededAccounts = appUsersMock.map((user) => ({
  user,
  password: MOCK_PASSWORD,
}))
const accountsByUserId = new Map(
  seededAccounts.map((account) => [account.user.id, account]),
)

const wait = (milliseconds: number) =>
  new Promise<void>((resolve) => globalThis.setTimeout(resolve, milliseconds))

export async function loginWithMock(
  credentials: LoginCredentials,
): Promise<AuthSession> {
  await wait(400)

  const email = normalizeEmail(credentials.email)
  const account = [...accountsByUserId.values()].find(
    (item) => normalizeEmail(item.user.email) === email,
  )

  if (!account || credentials.password !== account.password) {
    throw new Error('E-mail ou senha incorretos.')
  }

  return { user: account.user }
}

export function readMockSession(storage: Storage): AuthSession | null {
  try {
    const storedSession = JSON.parse(
      storage.getItem(SESSION_STORAGE_KEY) ?? 'null',
    ) as { userId?: unknown } | null

    if (typeof storedSession?.userId !== 'string') {
      storage.removeItem(SESSION_STORAGE_KEY)
      return null
    }

    const account = accountsByUserId.get(storedSession.userId)

    if (!account) {
      storage.removeItem(SESSION_STORAGE_KEY)
      return null
    }

    return { user: account.user }
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

export function registerMockAuthAccount(user: AppUser, password: string): void {
  const normalizedEmail = normalizeEmail(user.email)
  const conflictingAccount = [...accountsByUserId.values()].find(
    (account) =>
      account.user.id !== user.id &&
      normalizeEmail(account.user.email) === normalizedEmail,
  )

  if (conflictingAccount) {
    throw new Error('Já existe uma conta com este e-mail.')
  }

  if (!password) {
    throw new Error('Informe uma senha temporária.')
  }

  accountsByUserId.set(user.id, { user, password })
}

export function resetMockAuthAccounts(): void {
  accountsByUserId.clear()
  seededAccounts.forEach((account) => {
    accountsByUserId.set(account.user.id, account)
  })
}

export const mockLoginCredentialsByRole: Record<UserRole, LoginCredentials> = {
  employee: {
    email: currentUserMock.email,
    password: MOCK_PASSWORD,
  },
  leader: {
    email: leaderUserMock.email,
    password: MOCK_PASSWORD,
  },
  manager: {
    email: managerUserMock.email,
    password: MOCK_PASSWORD,
  },
}

export const mockLoginCredentials = mockLoginCredentialsByRole.manager

function normalizeEmail(value: string): string {
  return value.trim().toLocaleLowerCase('pt-BR')
}
