/** @vitest-environment happy-dom */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import initialParams from '../../../docs/honorarios_base/config-params.json'
import { honorariosService } from '../../services/honorariosService'
import { ApiError } from '../../services/httpClient'
import type {
  HonorariosCalculateResponse,
  HonorariosConfiguration,
  HonorariosParams,
  HonorariosQuote,
} from '../../types/honorarios'
import {
  defaultProfile,
  downloadText,
} from '../../utils/honorariosPresentation'
import { HonorariosQuoteDetail, HonorariosQuoteForm } from './HonorariosQuotes'

vi.mock('../../hooks/useHonorariosCalculation', () => ({
  useHonorariosCalculation: () => ({
    data: calculation,
    error: undefined,
    isPending: false,
  }),
}))
vi.mock('../../utils/honorariosPresentation', async (original) => ({
  ...(await original<typeof import('../../utils/honorariosPresentation')>()),
  downloadText: vi.fn(),
}))
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

const config: HonorariosConfiguration = {
  version: 4,
  permissions: { read: true, edit: true, applyAdjustment: true, manage: true },
  params: initialParams as HonorariosParams,
  office: {
    nome: 'Escritório atual',
    crc: '',
    cidade: 'Curitiba',
    telefone: '4133330000',
    email: '',
    site: '',
    logo: '',
    validadeDias: 15,
    condicoes: 'Condições atuais',
    escopoExtra: '',
    units: [],
  },
}
const calculation: HonorariosCalculateResponse = {
  paramsVersion: config.version,
  calculation: {
    total: '500.00',
    anual: '6500.00',
    tabela: '500.00',
    custo: '0.00',
    valorHoras: '0.00',
    ajuste: '0.00',
    linhas: [{ label: 'Base', value: '500.00' }],
  },
  plans: [],
}

function quoteFixture(): HonorariosQuote {
  return {
    id: 'quote-1',
    number: '2026-007',
    revision: 1,
    version: 3,
    status: 'rascunho',
    companyId: 'company-1',
    selectedPlan: null,
    convertedClientId: null,
    archivedAt: null,
    createdAt: '2026-11-11T15:00:00Z',
    snapshot: {
      paramsVersion: 2,
      params: initialParams as HonorariosParams,
      office: {
        ...config.office,
        nome: 'Escritório salvo',
        condicoes: 'Condições salvas',
      },
      profile: defaultProfile(),
      company: {
        id: 'company-1',
        name: 'Empresa salva',
        cnpj: '12345678000190',
      },
      prospect: 'Destinatário salvo',
      contact: 'Contato salvo',
      calculation: calculation.calculation,
      plans: [],
      value: '523.60',
      annualValue: '6806.80',
      warnings: [],
      validUntil: '2026-11-26',
      decimoTerceiro: true,
      inicioCobranca: 2,
      aberturaValor: '0.00',
      aberturaParcelas: 1,
      vencimento: 10,
      revisionOf: null,
    },
  }
}

const scopeKey = [
  'organization',
  'org-1',
  'membership',
  'member-1',
  'honorarios',
]
const onDenied = vi.fn()
let host: HTMLDivElement
let root: Root
let client: QueryClient
let currentQuote: HonorariosQuote

beforeEach(() => {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  currentQuote = quoteFixture()
  vi.spyOn(honorariosService, 'proposal').mockImplementation(
    async () => currentQuote,
  )
  vi.spyOn(honorariosService, 'quote').mockImplementation(
    async () => currentQuote,
  )
  vi.spyOn(honorariosService, 'quotes').mockImplementation(async (filters) => ({
    count: filters?.archived ? 0 : 1,
    next: null,
    previous: null,
    results: filters?.archived ? [] : [currentQuote],
  }))
  vi.spyOn(honorariosService, 'quoteHistory').mockResolvedValue({
    count: 0,
    next: null,
    previous: null,
    results: [],
  })
  vi.spyOn(honorariosService, 'companyOptions').mockResolvedValue({
    count: 0,
    next: null,
    previous: null,
    results: [],
  })
})

afterEach(async () => {
  await act(async () => root.unmount())
  client.clear()
  host.remove()
  vi.restoreAllMocks()
  vi.clearAllMocks()
})

async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 10))
  })
}

async function render(path: string, canEdit = true) {
  const props = {
    configuration: config,
    canEdit,
    canManage: canEdit,
    scopeKey,
    onDenied,
  }
  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={[path]}>
        <QueryClientProvider client={client}>
          <Routes>
            <Route
              path="/honorarios/novo"
              element={<HonorariosQuoteForm {...props} />}
            />
            <Route
              path="/honorarios/orcamentos/:quoteId"
              element={<HonorariosQuoteDetail {...props} />}
            />
            <Route
              path="/honorarios/orcamentos/:quoteId/revisar"
              element={<HonorariosQuoteForm {...props} />}
            />
          </Routes>
          <Location />
        </QueryClientProvider>
      </MemoryRouter>,
    )
  })
  await settle()
  await settle()
}

function Location() {
  return <output data-location>{useLocation().pathname}</output>
}
function button(text: string): HTMLButtonElement {
  const found = [...host.querySelectorAll('button')].find(
    (item) => item.textContent?.trim() === text,
  )
  if (!found) throw new Error(`Botão ausente: ${text}`)
  return found
}
function field<T extends HTMLInputElement | HTMLSelectElement>(
  label: string,
): T {
  const found = [...host.querySelectorAll('label')]
    .find((item) => item.textContent?.includes(label))
    ?.querySelector('input,select')
  if (!found) throw new Error(`Campo ausente: ${label}`)
  return found as T
}
async function change(label: string, value: string) {
  await act(async () => {
    const control = field(label)
    if (control instanceof HTMLInputElement)
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        'value',
      )!.set!.call(control, value)
    else control.value = value
    control.dispatchEvent(
      new Event(control instanceof HTMLSelectElement ? 'change' : 'input', {
        bubbles: true,
      }),
    )
  })
}
async function click(text: string) {
  await act(async () => {
    button(text).click()
  })
  await settle()
}
async function submit() {
  await act(async () => {
    host
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  })
  await settle()
}

describe('Honorários quote workflow', () => {
  it('preserves UUID and body after an uncertain response, then displays the saved snapshot', async () => {
    const create = vi
      .spyOn(honorariosService, 'createQuote')
      .mockRejectedValueOnce(new Error('Conexão interrompida'))
      .mockResolvedValueOnce(currentQuote)
    await render('/honorarios/novo')
    await change('Empresa ou pessoa interessada', 'Destinatário solicitado')
    await submit()
    expect(create).toHaveBeenCalledOnce()
    const firstBody = create.mock.calls[0][0]
    expect(firstBody.requestId).toMatch(/^[0-9a-f-]{36}$/i)
    expect(firstBody.prospect).toBe('Destinatário solicitado')
    expect(
      field<HTMLInputElement>('Empresa ou pessoa interessada').closest(
        'fieldset',
      )?.disabled,
    ).toBe(true)
    await click('Reenviar tentativa')
    expect(create).toHaveBeenCalledTimes(2)
    expect(create.mock.calls[1][0]).toEqual(firstBody)
    expect(host.querySelector('[data-location]')?.textContent).toBe(
      '/honorarios/orcamentos/quote-1',
    )
    expect(host.textContent).toContain('Destinatário salvo')
    expect(host.textContent).toContain('523,60')
    expect(host.textContent).not.toContain('Destinatário solicitado')
    await click('Baixar HTML')
    const exported = vi.mocked(downloadText).mock.calls[0][0]
    expect(exported).toContain('Escritório salvo')
    expect(exported).toContain('Condições salvas')
    expect(exported).toContain('523,60')
    expect(exported).not.toContain('Escritório atual')
  })

  it('requires explicit plan selection and sends its ID with the current version', async () => {
    currentQuote.snapshot.plans = [
      {
        id: 'recomendado',
        nome: 'Plano recomendado',
        destaque: true,
        profile: defaultProfile(),
        calculation: calculation.calculation,
        value: '750.00',
        annualValue: '9750.00',
      },
    ]
    const state = vi
      .spyOn(honorariosService, 'changeQuoteState')
      .mockImplementation(async (_id, body) => {
        currentQuote = {
          ...currentQuote,
          status: body.status,
          selectedPlan: body.selectedPlan ?? null,
          version: 4,
        }
        return currentQuote
      })
    await render('/honorarios/orcamentos/quote-1')
    await click('Registrar aceite')
    expect(field<HTMLSelectElement>('Plano escolhido pelo cliente').value).toBe(
      '',
    )
    expect(button('Confirmar').disabled).toBe(true)
    expect(state).not.toHaveBeenCalled()
    await change('Plano escolhido pelo cliente', 'recomendado')
    expect(button('Confirmar').disabled).toBe(false)
    await click('Confirmar')
    expect(state).toHaveBeenCalledExactlyOnceWith(
      'quote-1',
      {
        version: 3,
        status: 'aceito',
        selectedPlan: 'recomendado',
      },
      expect.any(AbortSignal),
    )
  })

  it('converts accepted proposals only after confirmation, with company and version and no editable price', async () => {
    currentQuote.status = 'aceito'
    const convert = vi
      .spyOn(honorariosService, 'convertQuote')
      .mockResolvedValue({} as never)
    await render('/honorarios/orcamentos/quote-1')
    await click('Converter em cliente')
    expect(convert).not.toHaveBeenCalled()
    expect(host.textContent).toContain('523,60')
    expect(
      field<HTMLSelectElement>('Empresa do cadastro central').disabled,
    ).toBe(true)
    await click('Confirmar')
    expect(convert).toHaveBeenCalledExactlyOnceWith(
      'quote-1',
      {
        version: 3,
        companyId: 'company-1',
      },
      expect.any(AbortSignal),
    )
  })

  it('reloads a version conflict and requires another confirmation with the returned version', async () => {
    const problem = {
      type: 'conflict',
      title: 'Conflito de versão',
      status: 409,
      detail: 'A proposta foi alterada por outra pessoa.',
    }
    const state = vi
      .spyOn(honorariosService, 'changeQuoteState')
      .mockImplementationOnce(async () => {
        currentQuote = { ...currentQuote, version: 4 }
        throw new ApiError({
          problem,
          requestId: null,
          response: new Response('', { status: 409 }),
        })
      })
      .mockImplementation(async (_id, body) => {
        currentQuote = { ...currentQuote, version: 5, status: body.status }
        return currentQuote
      })
    await render('/honorarios/orcamentos/quote-1')
    await click('Registrar aceite')
    await click('Confirmar')
    await settle()
    expect(state.mock.calls[0][1].version).toBe(3)
    expect(
      [...host.querySelectorAll('button')].some(
        (item) => item.textContent === 'Confirmar',
      ),
    ).toBe(false)
    expect(host.textContent).toContain(
      'A proposta foi alterada por outra pessoa.',
    )
    await click('Registrar aceite')
    expect(state).toHaveBeenCalledOnce()
    await click('Confirmar')
    expect(state.mock.calls[1][1]).toEqual({ version: 4, status: 'aceito' })
  })

  it('keeps previous revisions readable while hiding negotiation actions', async () => {
    vi.mocked(honorariosService.quotes).mockResolvedValue({
      count: 1,
      next: null,
      previous: null,
      results: [{ ...currentQuote, id: 'quote-latest', revision: 2 }],
    })
    await render('/honorarios/orcamentos/quote-1')
    expect(host.textContent).toContain('revisão anterior')
    expect(host.textContent).not.toContain('Registrar aceite')
    expect(host.textContent).not.toContain('Criar nova revisão')
    await click('Baixar HTML')
    expect(downloadText).toHaveBeenCalledOnce()
  })

  it('creates a new revision with a new request ID, source ID and source version', async () => {
    const create = vi
      .spyOn(honorariosService, 'createQuote')
      .mockResolvedValue({ ...currentQuote, id: 'revision-2', revision: 2 })
    await render('/honorarios/orcamentos/quote-1/revisar')
    expect(host.textContent).toContain('Nova revisão de 2026-007')
    await submit()
    expect(create).toHaveBeenCalledOnce()
    expect(create.mock.calls[0][0]).toMatchObject({
      revisionOf: 'quote-1',
      sourceVersion: 3,
      prospect: 'Destinatário salvo',
      value: '523.60',
    })
    expect(create.mock.calls[0][0].requestId).toMatch(/^[0-9a-f-]{36}$/i)
  })

  it('allows consulting and exporting a saved proposal without operation permissions', async () => {
    const state = vi.spyOn(honorariosService, 'changeQuoteState')
    await render('/honorarios/orcamentos/quote-1', false)
    expect(host.textContent).toContain('Destinatário salvo')
    expect(host.textContent).not.toContain('Registrar aceite')
    expect(host.textContent).not.toContain('Criar nova revisão')
    await click('Baixar HTML')
    expect(downloadText).toHaveBeenCalledOnce()
    expect(state).not.toHaveBeenCalled()
  })
})
