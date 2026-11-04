/** @vitest-environment happy-dom */

import { act, useEffect } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuth } from '../hooks/useAuth'
import { queryClient } from '../query/queryClient'
import { processQueryKeys } from '../query/processQueryKeys'
import {
  authService,
  type AuthState,
  type MembershipSummary,
} from '../services/authService'
import { AuthProvider } from './AuthContext'
import type { AuthContextValue } from './authContextDefinition'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

const membership: MembershipSummary = {
  id: 'member-1',
  displayName: 'Ana Silva',
  role: 'member',
  status: 'active',
  organization: {
    id: 'org-1',
    name: 'Organização 1',
    slug: 'org-1',
    timezone: 'America/Sao_Paulo',
  },
  modules: [
    {
      module: 'processes',
      globalAccess: false,
      actions: ['read'],
      executeSectors: ['com'],
      sectors: [
        {
          id: 'com',
          name: 'Diretoria',
          role: 'com',
          actions: ['read', 'create'],
        },
      ],
    },
  ],
}
function authState(activeMembership = membership): AuthState {
  return {
    session: {
      user: { id: 'user-1', email: 'ana@example.test', isPlatformStaff: false },
      memberships: [activeMembership],
      activeMembership,
    },
    departmentAccesses: [],
  }
}

let root: Root
let host: HTMLDivElement
let latest: AuthContextValue
let snapshots: { membership: string | undefined; queries: number }[]

function Probe() {
  const auth = useAuth()
  useEffect(() => {
    latest = auth
    snapshots.push({
      membership: auth.activeMembership?.id,
      queries: queryClient.getQueryCache().getAll().length,
    })
  }, [auth])
  return (
    <output>{auth.activeMembership?.organization.id ?? 'sem sessão'}</output>
  )
}

beforeEach(() => {
  queryClient.clear()
  snapshots = []
  vi.spyOn(authService, 'initialize').mockResolvedValue(authState())
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})
afterEach(async () => {
  await act(async () => {
    root.unmount()
  })
  queryClient.clear()
  host.remove()
  vi.restoreAllMocks()
})
async function mount() {
  await act(async () => {
    root.render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )
  })
  expect(latest.activeMembership?.id).toBe('member-1')
}

function confidentialRequest() {
  const scope = { organizationId: 'org-1', membershipId: 'member-1' }
  const key = processQueryKeys.detail(scope, 'process-1')
  queryClient.setQueryData(key, { id: 'process-1', honorario: '1900.00' })
  let resolve!: (value: { honorario: string }) => void
  let signal!: AbortSignal
  const work = new Promise<{ honorario: string }>((finish) => {
    resolve = finish
  })
  const pending = queryClient
    .fetchQuery({
      queryKey: processQueryKeys.detail(scope, 'process-pending'),
      retry: false,
      queryFn: (context) => {
        signal = context.signal
        return work
      },
    })
    .catch((error: unknown) => error)
  return {
    key,
    pending,
    resolve,
    get signal() {
      return signal
    },
  }
}

describe('AuthProvider cache lifecycle', () => {
  it('cancela respostas e apaga valores financeiros antes de expor permissões revogadas', async () => {
    await mount()
    const request = confidentialRequest()
    const revokedMembership = { ...membership, modules: [] }
    vi.spyOn(authService, 'refreshSession').mockResolvedValue(
      authState(revokedMembership),
    )
    await act(async () => {
      await latest.refreshSession()
    })
    expect(request.signal.aborted).toBe(true)
    expect(queryClient.getQueryData(request.key)).toBeUndefined()
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0)
    expect(latest.user?.modules).toEqual([])
    expect(snapshots.at(-1)).toEqual({ membership: 'member-1', queries: 0 })
    request.resolve({ honorario: '9999.00' })
    await request.pending
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0)
  })

  it('remove consultas do tenant anterior antes de apresentar a nova organização', async () => {
    await mount()
    const request = confidentialRequest()
    const nextMembership = {
      ...membership,
      id: 'member-2',
      organization: {
        ...membership.organization,
        id: 'org-2',
        name: 'Organização 2',
        slug: 'org-2',
      },
    }
    vi.spyOn(authService, 'selectActiveMembership').mockResolvedValue(
      authState(nextMembership),
    )
    await act(async () => {
      await latest.selectActiveMembership('member-2')
    })
    expect(request.signal.aborted).toBe(true)
    expect(host.textContent).toBe('org-2')
    expect(snapshots.at(-1)).toEqual({ membership: 'member-2', queries: 0 })
    request.resolve({ honorario: '9999.00' })
    await request.pending
    expect(queryClient.getQueryData(request.key)).toBeUndefined()
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0)
  })

  it('limpa sessão e consultas no logout mesmo se a requisição falhar', async () => {
    await mount()
    const request = confidentialRequest()
    vi.spyOn(authService, 'logout').mockRejectedValue(
      new Error('Indisponibilidade temporária'),
    )
    await act(async () => {
      await expect(latest.logout()).rejects.toThrow(
        'Indisponibilidade temporária',
      )
    })
    expect(latest.isAuthenticated).toBe(false)
    expect(latest.user).toBeNull()
    expect(request.signal.aborted).toBe(true)
    expect(snapshots.at(-1)).toEqual({ membership: undefined, queries: 0 })
    request.resolve({ honorario: '9999.00' })
    await request.pending
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0)
  })
})
