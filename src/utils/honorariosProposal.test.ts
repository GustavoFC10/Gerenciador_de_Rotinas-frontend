/** @vitest-environment happy-dom */
import { afterEach, describe, expect, it, vi } from 'vitest'
import initialParams from '../../docs/honorarios_base/config-params.json'
import type { HonorariosParams, HonorariosQuote } from '../types/honorarios'
import { defaultProfile } from './honorariosPresentation'
import {
  buildProposalHtml,
  printProposal,
  proposalMessage,
} from './honorariosProposal'

function fixture(): HonorariosQuote {
  return {
    id: 'quote-1',
    number: '2026-001',
    revision: 2,
    version: 1,
    status: 'rascunho',
    selectedPlan: null,
    companyId: 'company-1',
    convertedClientId: null,
    archivedAt: null,
    createdAt: '2026-11-11T18:00:00Z',
    snapshot: {
      paramsVersion: 8,
      params: structuredClone(initialParams) as HonorariosParams,
      office: {
        nome: 'Escritório congelado',
        crc: '123-PR',
        cidade: 'Curitiba',
        telefone: '(41) 99999-0000',
        email: 'contato@example.com',
        site: 'example.com',
        logo: 'data:image/png;base64,aGVsbG8=',
        validadeDias: 15,
        condicoes:
          'Condição comercial original\nServiços extras sob orçamento.',
        escopoExtra: 'Atendimento comercial original',
        units: [
          {
            name: 'Unidade original',
            address: 'Rua preservada, 123',
            phone: '(41) 3333-0000',
          },
        ],
      },
      profile: {
        ...defaultProfile(),
        funcionarios: 4,
        servicos: ['consultoria'],
      },
      company: {
        id: 'company-1',
        name: 'Empresa congelada',
        cnpj: '12.345.678/0001-90',
      },
      prospect: 'Cliente original',
      contact: 'Maria, telefone comercial',
      calculation: {
        total: '999.00',
        anual: '12987.00',
        tabela: '888.00',
        custo: '1234567.89',
        valorHoras: '2345678.90',
        ajuste: '42.00',
        linhas: [{ label: 'Composição interna sigilosa', value: '42.00' }],
      },
      plans: [],
      value: '500.00',
      annualValue: '6500.00',
      warnings: [{ code: 'discount_above_limit' }],
      validUntil: '2026-11-26',
      decimoTerceiro: true,
      inicioCobranca: 3,
      aberturaValor: '800.00',
      aberturaParcelas: 2,
      vencimento: 10,
      revisionOf: 'previous-quote',
    },
  }
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
  document.querySelectorAll('iframe').forEach((frame) => frame.remove())
})

describe('commercial proposal', () => {
  it('uses the saved prices, terms, logo and units without disclosing internal calculations', () => {
    const quote = fixture()
    const html = buildProposalHtml(quote)
    const content = new DOMParser().parseFromString(html, 'text/html')
    expect(content.querySelector('img')?.getAttribute('src')).toBe(
      quote.snapshot.office.logo,
    )
    for (const label of [
      'Empresa congelada',
      '12.345.678/0001-90',
      'Escritório congelado',
      'Condição comercial original',
      'Unidade original',
      'Rua preservada, 123',
      'Atendimento comercial original',
      'Consultoria contábil sob demanda',
      '26/11/2026',
      '13 parcelas',
      '3ª competência',
      '2 competência(s) sem cobrança',
      '2 parcelas',
      'Revisão 2',
    ])
      expect(content.body.textContent).toContain(label)
    expect(content.body.textContent).toContain('500,00')
    expect(content.body.textContent).toContain('6.500,00')
    expect(content.body.textContent).toContain('400,00')
    for (const forbidden of [
      'Composição interna sigilosa',
      '1234567.89',
      '2345678.90',
      'paramsVersion',
      'custoHora',
      'discount_above_limit',
      'Documentação desorganizada',
      'previous-quote',
      'sourceVersion',
    ])
      expect(html).not.toContain(forbidden)
    expect(content.querySelector('script')).toBeNull()
  })

  it('renders every offered plan with its frozen scope, negotiated price and annual total', () => {
    const quote = fixture()
    const calculation = quote.snapshot.calculation
    quote.snapshot.plans = [
      {
        id: 'basico',
        nome: 'Plano original básico',
        destaque: false,
        profile: defaultProfile(),
        calculation,
        value: '345.00',
        suggested: '99999.00',
        annualValue: '4485.00',
      },
      {
        id: 'premium',
        nome: 'Plano original premium',
        destaque: true,
        profile: { ...defaultProfile(), servicos: ['consultoria'] },
        calculation,
        value: '678.00',
        suggested: '99999.00',
        annualValue: '8814.00',
      },
    ]
    const html = buildProposalHtml(quote)
    expect(html).toContain('Plano original básico')
    expect(html).toContain('Plano original premium')
    expect(html).toContain('345,00')
    expect(html).toContain('678,00')
    expect(html).toContain('4.485,00')
    expect(html).toContain('8.814,00')
    expect(html).not.toContain('99.999,00')
    expect(html).not.toContain('Plano escolhido')
    quote.selectedPlan = 'premium'
    expect(buildProposalHtml(quote)).toContain('Plano escolhido')
  })

  it('escapes text and rejects active or remote logo content', () => {
    const quote = fixture()
    quote.snapshot.company!.name = '<script>alert("x")</script>'
    quote.snapshot.office.condicoes = '<img src=x onerror=alert(1)>'
    quote.snapshot.office.units[0].address = '" onmouseover="alert(1)'
    for (const logo of [
      'javascript:alert(1)',
      'https://example.com/track.png',
      'data:image/svg+xml;base64,PHN2Zz4=',
      'data:image/png;base64,aGVsbG8=" onerror="alert(1)',
    ]) {
      quote.snapshot.office.logo = logo
      const html = buildProposalHtml(quote)
      const doc = new DOMParser().parseFromString(html, 'text/html')
      expect(doc.querySelector('script,img,[onerror],[onmouseover]')).toBeNull()
      expect(doc.body.textContent).toContain('<script>alert("x")</script>')
      expect(
        doc
          .querySelector('meta[http-equiv="Content-Security-Policy"]')
          ?.getAttribute('content'),
      ).toContain("default-src 'none'")
    }
  })

  it('builds a WhatsApp message from the same commercial snapshot without sending anything', () => {
    const quote = fixture()
    quote.snapshot.decimoTerceiro = false
    quote.snapshot.inicioCobranca = 0
    const message = proposalMessage(quote)
    expect(message).toContain('Escritório congelado')
    expect(message).toContain('Empresa congelada')
    expect(message).toContain('500,00')
    expect(message).toContain('12 parcelas mensais')
    expect(message).toContain('no ato da contratação')
    expect(message).toContain('Condição comercial original')
    expect(message).not.toContain('Composição interna sigilosa')
    expect(message).not.toContain('custoHora')
  })

  it('prints an isolated sandboxed document and removes it after printing', () => {
    vi.useFakeTimers()
    printProposal(fixture())
    const frame = document.querySelector('iframe')!
    expect(frame.getAttribute('sandbox')).toBe('allow-same-origin allow-modals')
    expect(frame.srcdoc).toContain('Proposta de honorários')
    const cleanup = vi.fn()
    const target = {
      focus: vi.fn(),
      print: vi.fn(),
      addEventListener: vi.fn((_name: string, handler: () => void) =>
        cleanup.mockImplementation(handler),
      ),
    }
    vi.spyOn(frame, 'contentWindow', 'get').mockReturnValue(
      target as unknown as Window,
    )
    frame.dispatchEvent(new Event('load'))
    expect(target.print).toHaveBeenCalledOnce()
    cleanup()
    expect(frame.isConnected).toBe(false)
  })
})
