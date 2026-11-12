/** @vitest-environment happy-dom */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter, useLocation } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import {
  AuthContext,
  type AuthContextValue,
} from './contexts/authContextDefinition'
import { honorariosService } from './services/honorariosService'
import { moduleService } from './services/moduleService'
import * as routineControlService from './services/routineControlService'
import type {
  HonorariosCalculateResponse,
  HonorariosConfiguration,
  HonorariosDashboard,
  HonorariosPage,
  HonorariosParams,
  HonorariosQuote,
} from './types/honorarios'
import initialParams from '../docs/honorarios_base/config-params.json'
import { defaultProfile } from './utils/honorariosPresentation'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
const configuration: HonorariosConfiguration = {
  version: 4,
  params: initialParams as HonorariosParams,
  office: {
    nome: 'Escritório integrado',
    crc: '',
    cidade: 'Curitiba',
    telefone: '',
    email: '',
    site: '',
    logo: '',
    validadeDias: 15,
    condicoes: 'Condições de teste',
    escopoExtra: '',
    units: [],
  },
  permissions: { read: true, edit: true, applyAdjustment: true, manage: true },
}
const dashboard: HonorariosDashboard = {
  paramsVersion: 4,
  year: 2026,
  clients: {
    count: 2,
    current: '1500.00',
    suggested: '2000.00',
    potential: '500.00',
    byAlignment: { abaixo: 1, alinhado: 1, acima: 0 },
    adjustmentsDue: 1,
    adjustmentPlan: {
      maxIncreasePct: 20,
      count: 1,
      monthlyGain: '100.00',
      annualGain: '1300.00',
      entries: [],
    },
  },
  quotes: {
    count: 2,
    byStatus: { rascunho: 1, enviado: 0, aceito: 1, recusado: 0 },
    acceptedValue: '800.00',
    openCount: 1,
    openValue: '600.00',
    expiringCount: 0,
    acceptanceRate: 1,
  },
}
const calculation: HonorariosCalculateResponse = {
  paramsVersion: 4,
  calculation: {
    total: '450.00',
    anual: '5850.00',
    tabela: '450.00',
    custo: '0.00',
    valorHoras: '0.00',
    ajuste: '0.00',
    linhas: [{ label: 'Base do segmento', value: '450.00' }],
  },
  plans: [],
}
const quote: HonorariosQuote = {
  id: 'quote-1',
  number: '2026-011',
  revision: 2,
  version: 3,
  status: 'rascunho',
  selectedPlan: '',
  companyId: null,
  convertedClientId: null,
  archivedAt: null,
  createdAt: '2026-11-12T15:00:00Z',
  snapshot: {
    paramsVersion: 4,
    params: configuration.params,
    office: configuration.office,
    profile: defaultProfile(configuration.params),
    company: null,
    prospect: 'Prospect preservado',
    contact: 'Contato preservado',
    calculation: calculation.calculation,
    plans: [],
    value: '450.00',
    annualValue: '5850.00',
    warnings: [],
    validUntil: '2026-11-27',
    decimoTerceiro: true,
    inicioCobranca: 1,
    aberturaValor: '0.00',
    aberturaParcelas: 1,
    vencimento: 10,
    revisionOf: null,
  },
}
const emptyPage = <T,>(): HonorariosPage<T> => ({
  count: 0,
  next: null,
  previous: null,
  results: [],
})
const membership: NonNullable<AuthContextValue['activeMembership']> = {
  id: 'member-1',
  displayName: 'Colaborador',
  role: 'owner',
  status: 'active',
  organization: {
    id: 'org-1',
    name: 'Organização de teste',
    slug: 'teste',
    timezone: 'America/Sao_Paulo',
  },
  modules: [
    {
      module: 'honorarios',
      role: 'manager',
      globalAccess: false,
      actions: ['read', 'edit', 'applyAdjustment', 'manage'],
      sectors: [],
    },
  ],
}
const auth: AuthContextValue = {
  session: {
    user: {
      id: 'user-1',
      email: 'colaborador@example.com',
      isPlatformStaff: false,
    },
    memberships: [membership],
    activeMembership: membership,
  },
  user: null,
  memberships: [membership],
  activeMembership: membership,
  isAuthenticated: true,
  isInitializing: false,
  initializationError: null,
  login: vi.fn(),
  logout: vi.fn(),
  selectActiveMembership: vi.fn(),
  refreshSession: vi.fn(),
}
let host: HTMLDivElement, root: Root, client: QueryClient
beforeEach(() => {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  })
  vi.spyOn(moduleService, 'permissions').mockResolvedValue({
    modules: membership.modules!,
  })
  vi.spyOn(honorariosService, 'configuration').mockResolvedValue(configuration)
  vi.spyOn(honorariosService, 'dashboard').mockResolvedValue(dashboard)
  vi.spyOn(honorariosService, 'calculate').mockResolvedValue(calculation)
  vi.spyOn(honorariosService, 'clients').mockResolvedValue(emptyPage())
  vi.spyOn(honorariosService, 'companyOptions').mockResolvedValue(emptyPage())
  vi.spyOn(honorariosService, 'quotes').mockImplementation(async (filters) =>
    filters?.q === quote.number && !filters.archived
      ? { count: 1, next: null, previous: null, results: [quote] }
      : emptyPage(),
  )
  vi.spyOn(honorariosService, 'quote').mockResolvedValue(quote)
  vi.spyOn(honorariosService, 'proposal').mockResolvedValue(quote)
  vi.spyOn(honorariosService, 'quoteHistory').mockResolvedValue(emptyPage())
  vi.spyOn(routineControlService, 'getRoutineControl')
})
afterEach(async () => {
  await act(async () => root.unmount())
  client.clear()
  host.remove()
  vi.restoreAllMocks()
})
function LocationProbe() {
  return <output data-location>{useLocation().pathname}</output>
}
async function render(path = '/honorarios') {
  await act(async () =>
    root.render(
      <MemoryRouter initialEntries={[path]}>
        <QueryClientProvider client={client}>
          <AuthContext.Provider value={auth}>
            <App />
            <LocationProbe />
          </AuthContext.Provider>
        </QueryClientProvider>
      </MemoryRouter>,
    ),
  )
}
async function clickLink(href: string) {
  const link = host.querySelector<HTMLAnchorElement>(`a[href="${href}"]`)
  if (!link) throw new Error(`Link ausente: ${href}`)
  await act(async () =>
    link.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0 })),
  )
}
function inputByLabel(label: string) {
  return [...host.querySelectorAll('label')]
    .find((element) => element.textContent?.includes(label))
    ?.querySelector('input')
}
async function waitFor(check: () => boolean) {
  const deadline = Date.now() + 2000
  while (!check()) {
    if (Date.now() > deadline)
      throw new Error(
        `Conteúdo não carregado em ${host.querySelector('[data-location]')?.textContent}: ${host.textContent}`,
      )
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10))
    })
  }
}

describe('Honorários no roteamento real da aplicação', () => {
  it('monta o painel na rota-base e busca os indicadores sem depender de Rotinas', async () => {
    await render()
    await waitFor(
      () => host.textContent?.includes('Receita mensal atual') ?? false,
    )
    expect(honorariosService.dashboard).toHaveBeenCalledWith(
      20,
      expect.any(AbortSignal),
    )
    expect(host.textContent).toContain('1.500,00')
    expect(host.textContent).toContain('2 clientes na carteira')
    expect(routineControlService.getRoutineControl).not.toHaveBeenCalled()
  })
  it('navega pelas abas reais, monta seus formulários e consulta os endpoints correspondentes', async () => {
    await render()
    await waitFor(
      () => host.textContent?.includes('Receita mensal atual') ?? false,
    )
    await clickLink('/honorarios/novo')
    await waitFor(
      () =>
        host.querySelector('form') !== null &&
        inputByLabel('Faturamento mensal') !== undefined,
    )
    await waitFor(
      () => vi.mocked(honorariosService.calculate).mock.calls.length > 0,
    )
    expect(host.querySelector('[data-location]')?.textContent).toBe(
      '/honorarios/novo',
    )
    expect(host.textContent).toContain('Base do segmento')
    expect(
      host.querySelector('a[href="/honorarios/novo"][aria-current="page"]'),
    ).not.toBeNull()
    await clickLink('/honorarios/orcamentos')
    await waitFor(
      () => host.textContent?.includes('Nenhum orçamento encontrado') ?? false,
    )
    expect(honorariosService.quotes).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, archived: false }),
      expect.any(AbortSignal),
    )
    await clickLink('/honorarios/clientes')
    await waitFor(
      () => host.textContent?.includes('Nenhum cliente encontrado') ?? false,
    )
    expect(honorariosService.clients).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, pageSize: 20 }),
      expect.any(AbortSignal),
    )
    await clickLink('/honorarios/parametros')
    await waitFor(
      () =>
        inputByLabel('Nome do escritório')?.value === configuration.office.nome,
    )
    expect(host.textContent).toContain('Parâmetros de honorários')
    expect(host.querySelector('[data-location]')?.textContent).toBe(
      '/honorarios/parametros',
    )
    expect(routineControlService.getRoutineControl).not.toHaveBeenCalled()
  })
  it('abre diretamente a calculadora pelo endereço completo', async () => {
    await render('/honorarios/novo')
    await waitFor(() => inputByLabel('Faturamento mensal') !== undefined)
    await waitFor(
      () => vi.mocked(honorariosService.calculate).mock.calls.length > 0,
    )
    expect(host.textContent).toContain('Mensalidade sugerida')
    expect(host.querySelector('[data-location]')?.textContent).toBe(
      '/honorarios/novo',
    )
  })
  it('resolve o ID de uma proposta aberta por link direto e renderiza o documento salvo', async () => {
    await render('/honorarios/orcamentos/quote-1')
    await waitFor(() => host.querySelector('iframe') !== null)
    expect(honorariosService.proposal).toHaveBeenCalledWith(
      'quote-1',
      expect.any(AbortSignal),
    )
    expect(host.textContent).toContain('Prospect preservado')
    expect(host.querySelector('iframe')?.getAttribute('srcdoc')).toContain(
      '2026-011',
    )
    expect(
      host.querySelector(
        'a[href="/honorarios/orcamentos"][aria-current="page"]',
      ),
    ).not.toBeNull()
  })
  it('resolve o ID da revisão e preenche o novo formulário a partir da proposta de origem', async () => {
    await render('/honorarios/orcamentos/quote-1/revisar')
    await waitFor(
      () =>
        inputByLabel('Empresa ou pessoa interessada')?.value ===
        quote.snapshot.prospect,
    )
    expect(honorariosService.quote).toHaveBeenCalledWith(
      'quote-1',
      expect.any(AbortSignal),
    )
    expect(host.textContent).toContain('Nova revisão de 2026-011')
    expect(host.querySelector('[data-location]')?.textContent).toBe(
      '/honorarios/orcamentos/quote-1/revisar',
    )
  })
  it('mantém os indicadores visíveis quando a carteira e as propostas estão vazias', async () => {
    vi.mocked(honorariosService.dashboard).mockResolvedValue({
      ...dashboard,
      clients: {
        ...dashboard.clients,
        count: 0,
        current: '0.00',
        suggested: '0.00',
        potential: '0.00',
        adjustmentsDue: 0,
        byAlignment: { abaixo: 0, alinhado: 0, acima: 0 },
        adjustmentPlan: {
          maxIncreasePct: 20,
          count: 0,
          monthlyGain: '0.00',
          annualGain: '0.00',
          entries: [],
        },
      },
      quotes: {
        ...dashboard.quotes,
        count: 0,
        byStatus: { rascunho: 0, enviado: 0, aceito: 0, recusado: 0 },
        acceptedValue: '0.00',
        openCount: 0,
        openValue: '0.00',
        expiringCount: 0,
        acceptanceRate: null,
      },
    })
    await render()
    await waitFor(
      () => host.textContent?.includes('Receita mensal atual') ?? false,
    )
    expect(host.textContent).toContain('0,00')
    expect(host.textContent).toContain('0 clientes na carteira')
    expect(host.textContent).toContain('Nenhum aumento sugerido')
  })
  it('apresenta a falha do painel e permite tentar novamente', async () => {
    vi.mocked(honorariosService.dashboard).mockRejectedValueOnce(
      new Error('Falha ao consultar os indicadores de teste'),
    )
    await render()
    await waitFor(() => host.querySelector('[role="alert"]') !== null)
    expect(host.textContent).toContain(
      'Falha ao consultar os indicadores de teste',
    )
    const retry = [...host.querySelectorAll('button')].find(
      (button) => button.textContent === 'Tentar novamente',
    )!
    await act(async () => retry.click())
    await waitFor(
      () => host.textContent?.includes('Receita mensal atual') ?? false,
    )
    expect(honorariosService.dashboard).toHaveBeenCalledTimes(2)
  })
  it('oferece retorno explícito ao HUB dos módulos', async () => {
    await render('/honorarios/clientes')
    await waitFor(
      () => host.textContent?.includes('Nenhum cliente encontrado') ?? false,
    )
    const back = [
      ...host.querySelectorAll<HTMLAnchorElement>('a[href="/hub"]'),
    ].find((link) => link.textContent?.includes('Voltar aos módulos'))
    expect(back).toBeDefined()
    await act(async () => back!.click())
    await waitFor(
      () => host.querySelector('[data-location]')?.textContent === '/hub',
    )
    expect(host.textContent).toContain('Onde vamos trabalhar?')
  })
})
