/** @vitest-environment happy-dom */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  companyService,
  type ClientCompanyResource,
} from '../../services/companyService'
import { honorariosService } from '../../services/honorariosService'
import type { ModuleSummary } from '../../types/modules'
import CompanyModuleSummary from './CompanyModuleSummary'
const context = vi.hoisted(() => ({ modules: [] as ModuleSummary[] }))
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    activeMembership: { id: 'member', organization: { id: 'org' } },
  }),
}))
vi.mock('../../hooks/useModuleAccess', () => ({
  useModuleAccess: () => ({
    getModule: (name: string) =>
      context.modules.find((item) => item.module === name),
  }),
}))
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
let host: HTMLDivElement, root: Root, client: QueryClient
const company: ClientCompanyResource = {
  id: 'company',
  name: 'Aurora',
  legalName: 'Aurora Ltda.',
  code: '001',
  cnpj: '',
  email: '',
  mobilePhone: '',
  taxRegime: '',
  version: 1,
  status: 'active',
  archivedAt: null,
  createdAt: '',
  updatedAt: '',
}
beforeEach(() => {
  context.modules = []
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  })
})
afterEach(async () => {
  await act(async () => root.unmount())
  client.clear()
  host.remove()
  vi.restoreAllMocks()
})
async function render() {
  await act(async () => {
    root.render(
      <MemoryRouter
        initialEntries={['/cadastro-empresas/company?q=Aurora&pagina=2']}
      >
        <QueryClientProvider client={client}>
          <CompanyModuleSummary company={company} />
        </QueryClientProvider>
      </MemoryRouter>,
    )
    await new Promise((resolve) => setTimeout(resolve, 10))
  })
}
async function waitFor(check: () => boolean) {
  for (let i = 0; i < 100; i++) {
    if (check()) return
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10))
    })
  }
  throw new Error(host.textContent ?? 'Not ready')
}
describe('company module summaries', () => {
  it('does not fetch operational or financial information without its module grants', async () => {
    const routines = vi.spyOn(companyService, 'listRoutineAssignments')
    const financial = vi.spyOn(honorariosService, 'clientCompanies')
    await render()
    expect(routines).not.toHaveBeenCalled()
    expect(financial).not.toHaveBeenCalled()
    expect(host.textContent).toBe('')
  })
  it('does not treat a failed financial query as an absent profile', async () => {
    context.modules = [
      {
        module: 'honorarios',
        actions: ['read'],
        globalAccess: false,
        sectors: [],
      },
    ]
    vi.spyOn(honorariosService, 'clientCompanies').mockRejectedValue(
      new Error('Sem autorização.'),
    )
    await render()
    await waitFor(
      () => host.textContent?.includes('Não foi possível consultar') ?? false,
    )
    expect(host.textContent).not.toContain('Sem dados financeiros cadastrados')
    expect(host.querySelector('a')).toBeNull()
  })
  it('finds the exact company across filtered pages and preserves the return context', async () => {
    context.modules = [
      {
        module: 'honorarios',
        actions: ['read', 'edit'],
        globalAccess: false,
        sectors: [],
      },
    ]
    const target = {
      id: 'company',
      name: 'Aurora',
      legalName: 'Aurora Ltda.',
      code: '001',
      cnpj: '',
      hasFinancialProfile: false,
      financialProfile: null,
    }
    const financial = vi
      .spyOn(honorariosService, 'clientCompanies')
      .mockResolvedValueOnce({
        count: 2,
        next: '?page=2',
        previous: null,
        results: [{ ...target, id: 'other-company' }],
      })
      .mockResolvedValueOnce({
        count: 2,
        next: null,
        previous: '?page=1',
        results: [target],
      })
    await render()
    await waitFor(
      () =>
        host.textContent?.includes('Sem dados financeiros cadastrados') ??
        false,
    )
    expect(financial).toHaveBeenCalledTimes(2)
    expect(financial.mock.calls[1]![0]).toMatchObject({ q: '001', page: 2 })
    const link = host.querySelector('a')!
    const params = new URL(link.href).searchParams
    expect(params.get('empresa')).toBe('company')
    expect(params.get('retorno')).toBe(
      '/cadastro-empresas/company?q=Aurora&pagina=2',
    )
  })
})
