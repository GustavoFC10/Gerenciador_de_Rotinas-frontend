/** @vitest-environment happy-dom */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import initialParams from '../../../docs/honorarios_base/config-params.json'
import { honorariosService } from '../../services/honorariosService'
import type {
  HonorariosConfiguration,
  HonorariosDashboard as Dashboard,
} from '../../types/honorarios'
import HonorariosDashboard from './HonorariosDashboard'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
const configuration: HonorariosConfiguration = {
  version: 1,
  params: initialParams as HonorariosConfiguration['params'],
  office: {
    nome: 'Escritório',
    crc: '',
    cidade: '',
    telefone: '',
    email: '',
    site: '',
    logo: '',
    validadeDias: 15,
    condicoes: '',
    escopoExtra: '',
    units: [],
  },
  permissions: { read: true, edit: true, applyAdjustment: true, manage: true },
}
const scopeKey = [
  'organization',
  'org-1',
  'membership',
  'member-1',
  'honorarios',
]
const onDenied = vi.fn()
let host: HTMLDivElement, root: Root, cache: QueryClient
function emptyDashboard(): Dashboard {
  return {
    paramsVersion: 1,
    year: 2026,
    clients: {
      count: 0,
      current: '0.00',
      suggested: '0.00',
      potential: '0.00',
      byAlignment: { abaixo: 0, alinhado: 0, acima: 0 },
      adjustmentsDue: 0,
      adjustmentPlan: {
        maxIncreasePct: 20,
        count: 0,
        monthlyGain: '0.00',
        annualGain: '0.00',
        entries: [],
      },
    },
    quotes: {
      count: 0,
      byStatus: { rascunho: 0, enviado: 0, aceito: 0, recusado: 0 },
      acceptedValue: '0.00',
      openCount: 0,
      openValue: '0.00',
      expiringCount: 0,
      acceptanceRate: null,
    },
  }
}
function populatedDashboard(): Dashboard {
  const data = emptyDashboard()
  data.clients = {
    count: 3,
    current: '1200.30',
    suggested: '1500.00',
    potential: '300.00',
    byAlignment: { abaixo: 2, alinhado: 1, acima: 0 },
    adjustmentsDue: 1,
    adjustmentPlan: {
      maxIncreasePct: 20,
      count: 1,
      monthlyGain: '100.00',
      annualGain: '1300.00',
      entries: [
        {
          clientId: 'client-1',
          current: '300.00',
          proposed: '400.00',
          gain: '100.00',
          full: false,
        },
      ],
    },
  }
  data.quotes = {
    count: 4,
    byStatus: { rascunho: 0, enviado: 0, aceito: 3, recusado: 1 },
    acceptedValue: '2000.00',
    openCount: 1,
    openValue: '500.00',
    expiringCount: 1,
    acceptanceRate: 0.75,
  }
  return data
}
beforeEach(() => {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  cache = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  onDenied.mockReset()
  vi.spyOn(honorariosService, 'dashboard').mockResolvedValue(emptyDashboard())
})
afterEach(async () => {
  await act(async () => root.unmount())
  cache.clear()
  host.remove()
  vi.restoreAllMocks()
})
async function render(config = configuration) {
  await act(async () =>
    root.render(
      <MemoryRouter>
        <QueryClientProvider client={cache}>
          <HonorariosDashboard
            configuration={config}
            scopeKey={scopeKey}
            onDenied={onDenied}
          />
        </QueryClientProvider>
      </MemoryRouter>,
    ),
  )
}
async function waitFor(check: () => boolean) {
  const until = Date.now() + 2000
  while (!check()) {
    if (Date.now() > until)
      throw new Error(`Estado não alcançado: ${host.textContent}`)
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10))
    })
  }
}
function button(text: string) {
  return [...host.querySelectorAll('button')].find(
    (node) => node.textContent === text,
  )!
}

describe('Painel de Honorários', () => {
  it('shows a visible loading state before the dashboard response arrives', async () => {
    vi.mocked(honorariosService.dashboard).mockImplementationOnce(
      () => new Promise(() => {}),
    )
    await render()
    expect(host.querySelector('[role="status"]')?.textContent).toContain(
      'Carregando indicadores',
    )
    expect(host.textContent).not.toContain('Comece a organizar')
    expect(honorariosService.dashboard).toHaveBeenCalledWith(
      configuration.params.reajusteMax,
      expect.any(AbortSignal),
    )
  })

  it('shows zero metrics and useful first actions for an empty organization', async () => {
    await render()
    await waitFor(
      () => !!host.querySelector('[aria-label="Indicadores de honorários"]'),
    )
    expect(host.textContent).toContain('Comece a organizar seus honorários')
    expect(host.querySelector('a[href="/honorarios/novo"]')?.textContent).toBe(
      'Novo orçamento',
    )
    expect(
      host.querySelector('a[href="/honorarios/clientes?novo=true"]')
        ?.textContent,
    ).toBe('Cadastrar primeiro cliente')
    const metrics = host.querySelector(
      '[aria-label="Indicadores de honorários"]',
    )!
    expect(metrics.querySelectorAll('section')).toHaveLength(4)
    expect(metrics.textContent).toContain('0 clientes na carteira')
    expect(metrics.textContent).toContain('0 propostas em negociação')
    expect(metrics.textContent).toContain('0,00')
    expect(host.textContent).toContain('Nenhuma proposta registrada neste ano')
    expect(host.textContent).toContain('Nenhum aumento sugerido')
  })

  it('keeps the empty dashboard informative for a viewer without offering registration actions', async () => {
    await render({
      ...configuration,
      permissions: {
        read: true,
        edit: false,
        applyAdjustment: false,
        manage: false,
      },
    })
    await waitFor(
      () => !!host.querySelector('[aria-label="Indicadores de honorários"]'),
    )
    expect(host.textContent).toContain(
      'Seu acesso permite consultar a carteira e simular valores',
    )
    expect(
      host.querySelector('a[href="/honorarios/clientes?novo=true"]'),
    ).toBeNull()
    expect(host.querySelector('a[href="/honorarios/novo"]')?.textContent).toBe(
      'Abrir calculadora',
    )
  })

  it('renders the real portfolio, alerts, quote rates and client links', async () => {
    vi.mocked(honorariosService.dashboard).mockResolvedValueOnce(
      populatedDashboard(),
    )
    await render()
    await waitFor(
      () => !!host.querySelector('[aria-label="Indicadores de honorários"]'),
    )
    expect(host.textContent).toContain('1.200,30')
    expect(host.textContent).toContain('75%')
    expect(host.textContent).toContain('3 clientes na carteira')
    expect(host.textContent).toContain(
      '1 cliente(s) com reajuste próximo ou vencido',
    )
    expect(host.textContent).not.toContain('Comece a organizar')
    expect(
      host.querySelector('a[href="/honorarios/clientes?cliente=client-1"]')
        ?.textContent,
    ).toBe('Abrir perfil')
    expect(
      host.querySelector('a[href="/honorarios/orcamentos?status=aceito"]')
        ?.textContent,
    ).toContain('3')
  })

  it('shows API errors and recovers only after the user retries', async () => {
    vi.mocked(honorariosService.dashboard).mockRejectedValueOnce(
      new Error('Falha ao consultar o painel.'),
    )
    await render()
    await waitFor(() => !!host.querySelector('[role="alert"]'))
    expect(host.querySelector('[role="alert"]')?.textContent).toBe(
      'Falha ao consultar o painel.',
    )
    expect(
      host.querySelector('[aria-label="Indicadores de honorários"]'),
    ).toBeNull()
    expect(onDenied).toHaveBeenCalledWith(expect.any(Error))
    await act(async () => button('Tentar novamente').click())
    await waitFor(
      () => !!host.querySelector('[aria-label="Indicadores de honorários"]'),
    )
    expect(honorariosService.dashboard).toHaveBeenCalledTimes(2)
  })

  it('simulates a new percentage without hiding the current cards or applying changes', async () => {
    vi.mocked(honorariosService.dashboard).mockResolvedValueOnce(
      populatedDashboard(),
    )
    await render()
    await waitFor(
      () => !!host.querySelector('[aria-label="Indicadores de honorários"]'),
    )
    let finish!: (data: Dashboard) => void
    vi.mocked(honorariosService.dashboard).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve
        }),
    )
    const input = host.querySelector('input[type="number"]')!
    expect(input.getAttribute('max')).toBe('10000')
    await act(async () => {
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        'value',
      )!.set!.call(input, '25.50')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await act(async () =>
      host
        .querySelector('form')!
        .dispatchEvent(
          new Event('submit', { bubbles: true, cancelable: true }),
        ),
    )
    expect(honorariosService.dashboard).toHaveBeenLastCalledWith(
      25.5,
      expect.any(AbortSignal),
    )
    expect(host.textContent).toContain('1.200,30')
    expect(host.textContent).toContain('Atualizando simulação')
    const updated = populatedDashboard()
    updated.clients.adjustmentPlan.monthlyGain = '125.50'
    await act(async () => finish(updated))
    await waitFor(() => host.textContent!.includes('125,50'))
    expect(host.textContent).toContain('Esta simulação não altera os contratos')
    expect(honorariosService.dashboard).toHaveBeenCalledTimes(2)
  })
})
