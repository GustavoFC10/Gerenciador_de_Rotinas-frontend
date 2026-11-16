/** @vitest-environment happy-dom */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import initialParams from '../../../docs/honorarios_base/config-params.json'
import { honorariosService } from '../../services/honorariosService'
import type {
  HonorariosConfiguration,
  HonorariosParams,
} from '../../types/honorarios'
import HonorariosSettings from './HonorariosSettings'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
const originalTabs = [
  'Valores base',
  'Adicionais',
  'Regime e horas',
  'Faturamento',
  'Serviços',
  'Exceções',
  'Planos',
  'Cobrança e reajuste',
  'Regras',
]
let host: HTMLDivElement,
  root: Root,
  client: QueryClient,
  configuration: HonorariosConfiguration
beforeEach(() => {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  configuration = {
    version: 8,
    params: structuredClone(initialParams) as HonorariosParams,
    office: {
      nome: 'Escritório da matriz',
      crc: '',
      cidade: 'Curitiba',
      telefone: '',
      email: '',
      site: '',
      logo: '',
      validadeDias: 15,
      condicoes: 'Condições da proposta',
      escopoExtra: '',
      units: [],
    },
    permissions: {
      read: true,
      edit: true,
      applyAdjustment: true,
      manage: true,
    },
  }
  vi.spyOn(honorariosService, 'saveConfiguration').mockImplementation(
    async (input) => ({ ...input, version: input.version + 1 }),
  )
})
afterEach(async () => {
  await act(async () => root.unmount())
  client.clear()
  host.remove()
  vi.restoreAllMocks()
})
async function render(canManage = true) {
  await act(async () =>
    root.render(
      <MemoryRouter>
        <QueryClientProvider client={client}>
          <HonorariosSettings
            configuration={configuration}
            canEdit={canManage}
            canManage={canManage}
            scopeKey={['parameters-regression']}
          />
        </QueryClientProvider>
      </MemoryRouter>,
    ),
  )
}
async function tab(label: string) {
  const button = [...host.querySelectorAll('button')].find(
    (element) => element.textContent?.trim() === label,
  )
  expect(button, `Aba ${label}`).toBeDefined()
  await act(async () => button!.click())
}
function field(label: string) {
  const aria = [...host.querySelectorAll<HTMLInputElement>('input')].find(
    (element) => element.getAttribute('aria-label') === label,
  )
  const wrapped = [...host.querySelectorAll('label')]
    .find((element) => element.textContent?.trim() === label)
    ?.querySelector('input')
  const input = aria ?? wrapped
  expect(input, `Campo ${label}`).toBeDefined()
  return input!
}
async function change(input: HTMLInputElement, value: string) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value',
    )!.set!.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new Event('change', { bubbles: true }))
  })
}

describe('Organização dos parâmetros de Honorários conforme referência', () => {
  it('preserva as nove abas e apresenta a matriz de segmento por regime na entrada', async () => {
    await render()
    const navigation = host.querySelector(
      '[role="tablist"][aria-label="Seções dos parâmetros"]',
    )!
    expect(
      [...navigation.querySelectorAll('button')]
        .slice(0, 9)
        .map((button) => button.textContent?.trim()),
    ).toEqual(originalTabs)
    expect(host.textContent).toContain('Valor base por segmento e regime')
    const table = [...host.querySelectorAll('table')].find((element) =>
      element.textContent?.includes('Segmento'),
    )!
    expect(table).toBeDefined()
    expect(
      [...table.querySelectorAll('th')].map((element) => element.textContent),
    ).toEqual(
      expect.arrayContaining([
        'Segmento',
        'MEI',
        'Simples Nacional',
        'Lucro Presumido',
        'Lucro Real',
      ]),
    )
    for (const segment of configuration.params.segmentos) {
      expect(field(`${segment.nome} Simples Nacional`).value).toBe(
        String(segment.base.simples),
      )
      expect(field(`${segment.nome} Lucro Real`).value).toBe(
        String(segment.base.real),
      )
    }
    expect(host.textContent).toContain('Empresa inativa')
    expect(host.textContent).not.toContain('Fator de complexidade por regime')
    expect(honorariosService.saveConfiguration).not.toHaveBeenCalled()
  })

  it.each([
    [
      'Adicionais',
      [
        'Funcionários',
        'Sócios com pró-labore',
        'Blocos de XML',
        'Emissão de notas fiscais',
        'Filiais',
      ],
    ],
    [
      'Regime e horas',
      ['Fator de complexidade por regime', 'Horas × mão de obra'],
    ],
    [
      'Faturamento',
      [
        'Faixas de faturamento mensal',
        'MEI',
        'Simples Nacional',
        'Lucro Presumido',
        'Lucro Real',
      ],
    ],
    ['Serviços', ['Serviços adicionais']],
    ['Exceções', ['Taxas de exceção']],
    ['Planos', ['Planos de venda']],
    [
      'Cobrança e reajuste',
      [
        'Parcelas por ano',
        'Dia de vencimento',
        'Limite do reajuste',
        'Quando reajustar',
        'Percentual do reajuste anual',
        'Descontos e reajustes',
      ],
    ],
    ['Regras', ['Arredondamento', 'Tolerância da comparação']],
  ])(
    'agrupa %s sem expor o formulário genérico da configuração',
    async (label, groups) => {
      await render()
      await tab(label as string)
      const headings = [
        ...host.querySelectorAll('form h2,form h3,form legend'),
      ].map((element) => element.textContent)
      for (const group of groups) expect(headings).toContain(group)
      expect(host.textContent).not.toContain('Identificador')
      expect(host.textContent).not.toContain('Tabela e adicionais')
      expect(honorariosService.saveConfiguration).not.toHaveBeenCalled()
    },
  )

  it('conserva alterações de grupos diferentes ao trocar de aba e salva o objeto completo com a versão', async () => {
    await render()
    const segment = configuration.params.segmentos[0]
    await change(field(`${segment.nome} Simples Nacional`), '620')
    await tab('Adicionais')
    await change(field('Por funcionário adicional (R$)'), '59')
    await tab('Faturamento')
    await tab('Valores base')
    expect(field(`${segment.nome} Simples Nacional`).value).toBe('620')
    await tab('Adicionais')
    expect(field('Por funcionário adicional (R$)').value).toBe('59')
    expect(honorariosService.saveConfiguration).not.toHaveBeenCalled()
    await tab('Regras')
    const form = host.querySelector('form')!
    expect(
      form.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled,
    ).toBe(false)
    // happy-dom checks decimal steps with floating-point remainder (10 % 0.01),
    // incorrectly rejecting valid money fields. Exercise React's submit handler directly.
    await act(async () => {
      form.dispatchEvent(
        new Event('submit', { bubbles: true, cancelable: true }),
      )
    })
    const expected = structuredClone(configuration.params)
    expected.segmentos[0].base.simples = 620
    expected.funcionarios.valor = 59
    expect(honorariosService.saveConfiguration).toHaveBeenCalledExactlyOnceWith(
      { version: 8, params: expected, office: configuration.office },
      expect.any(AbortSignal),
    )
  })

  it('mantém os dados comerciais do escritório acessíveis separadamente dos grupos de cálculo', async () => {
    await render()
    expect(host.querySelector('input[value="Escritório da matriz"]')).toBeNull()
    await tab('Dados do escritório')
    expect(field('Nome do escritório').value).toBe('Escritório da matriz')
    expect(host.textContent).toContain('Condições comerciais')
    expect(host.textContent).not.toContain('Valor base por segmento e regime')
  })

  it('restaura os parâmetros somente no rascunho após confirmação e preserva os dados do escritório', async () => {
    configuration.params.segmentos[0].base.simples = 999
    await render()
    const label = `${configuration.params.segmentos[0].nome} Simples Nacional`
    await tab('Dados do escritório')
    await change(field('Nome do escritório'), 'Nome comercial preservado')
    await tab('Valores base')
    await tab('Restaurar padrão')
    expect(field(label).value).toBe('999')
    expect(honorariosService.saveConfiguration).not.toHaveBeenCalled()
    await tab('Restaurar no rascunho')
    expect(field(label).value).toBe(
      String(initialParams.segmentos[0].base.simples),
    )
    await tab('Dados do escritório')
    expect(field('Nome do escritório').value).toBe('Nome comercial preservado')
    expect(honorariosService.saveConfiguration).not.toHaveBeenCalled()
    await tab('Salvar parâmetros')
    expect(honorariosService.saveConfiguration).toHaveBeenCalledWith(
      {
        version: 8,
        params: initialParams,
        office: { ...configuration.office, nome: 'Nome comercial preservado' },
      },
      expect.any(AbortSignal),
    )
  })

  it('permite consultar as abas com acesso de leitura e mantém a gravação indisponível', async () => {
    await render(false)
    await tab('Faturamento')
    expect(host.textContent).toContain('Faixas de faturamento mensal')
    expect(host.querySelector('form fieldset[disabled]')).not.toBeNull()
    await tab('Cobrança e reajuste')
    expect(host.textContent).toContain('Percentual do reajuste anual')
    expect(
      [...host.querySelectorAll('button')].some(
        (button) => button.textContent?.trim() === 'Salvar parâmetros',
      ),
    ).toBe(false)
    expect(honorariosService.saveConfiguration).not.toHaveBeenCalled()
  })
})
