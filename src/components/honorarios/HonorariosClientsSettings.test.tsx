/** @vitest-environment happy-dom */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import params from '../../../docs/honorarios_base/config-params.json'
import { honorariosService } from '../../services/honorariosService'
import { ApiError } from '../../services/httpClient'
import type {
  HonorariosClient,
  HonorariosConfiguration,
} from '../../types/honorarios'
import { defaultProfile } from '../../utils/honorariosPresentation'
import HonorariosClients from './HonorariosClients'
import HonorariosSettings from './HonorariosSettings'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
const configuration: HonorariosConfiguration = {
  version: 2,
  params: params as HonorariosConfiguration['params'],
  office: {
    nome: 'Escritório de teste',
    crc: '',
    cidade: 'Curitiba',
    telefone: '',
    email: '',
    site: '',
    logo: '',
    validadeDias: 15,
    condicoes: 'Condições originais',
    escopoExtra: '',
    units: [],
  },
  permissions: { read: true, edit: true, applyAdjustment: true, manage: true },
}
const client: HonorariosClient = {
  id: 'client-1',
  companyId: 'company-1',
  company: {
    id: 'company-1',
    name: 'Cliente de teste',
    cnpj: '12345678000100',
  },
  profile: defaultProfile(configuration.params),
  currentFee: '300.00',
  adjustmentDate: '2025-11-01',
  contact: 'Maria',
  notes: '',
  version: 4,
  paramsVersion: 2,
  archivedAt: null,
  calculation: {
    total: '450.00',
    anual: '5850.00',
    tabela: '450.00',
    custo: '0.00',
    valorHoras: '0.00',
    ajuste: '0.00',
    linhas: [],
  },
  difference: '-150.00',
  alignment: 'abaixo',
  adjustment: {
    dueDate: '2026-11-01',
    days: -11,
    notice: true,
    current: '300.00',
    full: '313.74',
    value: '313.74',
    table: '450.00',
    blocked: false,
    limited: false,
    index: { nome: 'IPCA', pct: 4.58 },
  },
}
let host: HTMLDivElement, root: Root, cache: QueryClient
beforeEach(() => {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  cache = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
})
afterEach(async () => {
  await act(async () => root.unmount())
  cache.clear()
  host.remove()
  vi.restoreAllMocks()
})
async function render(node: React.ReactNode, path = '/') {
  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={[path]}>
        <QueryClientProvider client={cache}>{node}</QueryClientProvider>
      </MemoryRouter>,
    )
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}
async function click(label: string) {
  let button = [...host.querySelectorAll('button')].find(
    (node) => node.textContent?.trim() === label,
  )
  for (let attempt = 0; !button && attempt < 30; attempt++) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10))
    })
    button = [...host.querySelectorAll('button')].find(
      (node) => node.textContent?.trim() === label,
    )
  }
  expect(button, `Botão ${label}`).toBeDefined()
  await act(async () => {
    button!.click()
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}

describe('Honorários: parâmetros e carteira', () => {
  it('abre o cadastro de cliente pelo atalho inicial do painel', async () => {
    vi.spyOn(honorariosService, 'clients').mockResolvedValue({
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
    await render(
      <HonorariosClients
        configuration={configuration}
        canEdit
        canManage
        scopeKey={['shortcut']}
      />,
      '/honorarios/clientes?novo=true',
    )
    expect(host.querySelector('form')).not.toBeNull()
    expect(host.textContent).toContain('Empresa do cadastro central')
    expect(host.textContent).toContain('Salvar perfil')
  })

  it('mantém a edição de parâmetros em rascunho e salva o payload completo com a versão', async () => {
    const save = vi
      .spyOn(honorariosService, 'saveConfiguration')
      .mockResolvedValue({ ...configuration, version: 3 })
    const onSaved = vi.fn()
    await render(
      <HonorariosSettings
        configuration={configuration}
        canEdit
        canManage
        scopeKey={['test']}
        onConfigurationSaved={onSaved}
      />,
    )
    const name = [...host.querySelectorAll('label')]
      .find((label) => label.textContent?.includes('Nome do escritório'))!
      .querySelector('input')!
    await act(async () => {
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        'value',
      )!.set!.call(name, 'Novo nome')
      name.dispatchEvent(new Event('input', { bubbles: true }))
      name.dispatchEvent(new Event('change', { bubbles: true }))
    })
    expect(save).not.toHaveBeenCalled()
    await act(async () => {
      host
        .querySelector('form')!
        .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    expect(save).toHaveBeenCalledWith(
      {
        version: 2,
        params: configuration.params,
        office: { ...configuration.office, nome: 'Novo nome' },
      },
      expect.any(AbortSignal),
    )
    expect(onSaved).toHaveBeenCalledWith(
      expect.objectContaining({
        version: 3,
        permissions: configuration.permissions,
      }),
    )
  })

  it('exibe parâmetros somente para consulta sem controles de gravação', async () => {
    await render(
      <HonorariosSettings
        configuration={configuration}
        canEdit={false}
        canManage={false}
        scopeKey={['viewer']}
      />,
    )
    expect(host.textContent).toContain(
      'A edição está disponível à administração de Honorários',
    )
    expect(
      [...host.querySelectorAll('button')].some(
        (button) => button.textContent === 'Salvar parâmetros',
      ),
    ).toBe(false)
    expect(host.querySelector('fieldset[disabled]')).not.toBeNull()
  })

  it('preserva rascunho dos parâmetros quando chega uma nova versão da configuração', async () => {
    const onSaved = vi.fn()
    await render(
      <HonorariosSettings
        configuration={configuration}
        canEdit
        canManage
        scopeKey={['external']}
        onConfigurationSaved={onSaved}
      />,
    )
    const name = [...host.querySelectorAll('label')]
      .find((label) => label.textContent?.includes('Nome do escritório'))!
      .querySelector('input')!
    await act(async () => {
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        'value',
      )!.set!.call(name, 'Meu rascunho')
      name.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await render(
      <HonorariosSettings
        configuration={{
          ...configuration,
          version: 3,
          office: { ...configuration.office, nome: 'Outra pessoa' },
        }}
        canEdit
        canManage
        scopeKey={['external']}
        onConfigurationSaved={onSaved}
      />,
    )
    expect(name.value).toBe('Meu rascunho')
    expect(host.textContent).toContain('Seu rascunho foi preservado')
    expect(
      [...host.querySelectorAll('button')].find(
        (button) => button.textContent === 'Salvar parâmetros',
      )!.disabled,
    ).toBe(true)
    expect(onSaved).not.toHaveBeenCalled()
  })

  it.each([false, true])(
    'apresenta falha de lote sem anunciar sucesso e bloqueia resultado incerto: %s',
    async (networkError) => {
      vi.spyOn(honorariosService, 'clients').mockResolvedValue({
        count: 0,
        next: null,
        previous: null,
        results: [],
      })
      vi.spyOn(honorariosService, 'companyOptions').mockResolvedValue({
        count: 2,
        next: null,
        previous: null,
        results: [
          {
            id: 'company-1',
            name: 'Primeira empresa',
            cnpj: '12345678000100',
            code: '1',
          },
          {
            id: 'company-2',
            name: 'Segunda empresa',
            cnpj: '22345678000100',
            code: '2',
          },
        ],
      })
      const importRows = vi
        .spyOn(honorariosService, 'importClients')
        .mockRejectedValue(
          networkError
            ? new Error('Falha de rede.')
            : new ApiError({
                problem: {
                  type: 'about:blank',
                  title: 'Linha inválida',
                  status: 400,
                  detail: 'Uma empresa já possui perfil.',
                },
                response: new Response(null, { status: 400 }),
                requestId: null,
              }),
        )
      await render(
        <HonorariosClients
          configuration={configuration}
          canEdit
          canManage
          scopeKey={['import']}
        />,
      )
      await click('Importar carteira')
      const file = new File(
        [
          'cnpj;nome;honorario_atual;regime;segmento\r\n12345678000100;Empresa 1;300.00;simples;servicos\r\n22345678000100;Empresa 2;400.00;simples;servicos',
        ],
        'carteira.csv',
        { type: 'text/csv' },
      )
      const input = host.querySelector<HTMLInputElement>('input[type="file"]')!
      await act(async () => {
        Object.defineProperty(input, 'files', { value: [file] })
        input.dispatchEvent(new Event('change', { bubbles: true }))
        await new Promise((resolve) => setTimeout(resolve, 10))
      })
      await click('Confirmar importação de 2 perfil(is)')
      expect(importRows).toHaveBeenCalledTimes(1)
      expect(importRows.mock.calls[0][0].map((row) => row.companyId)).toEqual([
        'company-1',
        'company-2',
      ])
      expect(host.textContent).toContain(
        networkError
          ? 'Não foi possível confirmar o resultado deste lote'
          : 'O lote em processamento não foi importado',
      )
      expect(host.textContent).toContain('0 já importada(s)')
      expect(host.textContent).not.toContain('Importação concluída')
      if (networkError) {
        const submit = [...host.querySelectorAll('button')].find(
          (button) =>
            button.textContent === 'Confirmar importação de 2 perfil(is)',
        )!
        expect(submit.disabled).toBe(true)
        await act(async () => submit.click())
        expect(importRows).toHaveBeenCalledTimes(1)
        expect(input.disabled).toBe(true)
      }
    },
  )

  it('exige confirmação do reajuste e recarrega as versões após conflito antes de nova confirmação', async () => {
    vi.spyOn(honorariosService, 'clients').mockResolvedValue({
      count: 1,
      next: null,
      previous: null,
      results: [client],
    })
    vi.spyOn(honorariosService, 'client')
      .mockResolvedValueOnce(client)
      .mockResolvedValue({ ...client, version: 5, paramsVersion: 3 })
    const conflict = new ApiError({
      problem: {
        type: 'about:blank',
        title: 'Conflito',
        status: 409,
        detail: 'A tabela mudou.',
      },
      response: new Response(null, { status: 409 }),
      requestId: null,
    })
    const adjust = vi
      .spyOn(honorariosService, 'adjustClient')
      .mockRejectedValueOnce(conflict)
      .mockResolvedValue({ ...client, version: 6, paramsVersion: 3 })
    await render(
      <HonorariosClients
        configuration={configuration}
        canEdit
        canManage
        scopeKey={['adjustment']}
      />,
    )
    await click('Ver perfil')
    await click('Aplicar reajuste')
    expect(adjust).not.toHaveBeenCalled()
    await click('Confirmar')
    expect(adjust).toHaveBeenNthCalledWith(
      1,
      'client-1',
      {
        version: 4,
        paramsVersion: 2,
        mode: 'indice',
      },
      expect.any(AbortSignal),
    )
    expect(host.textContent).toContain('A prévia foi recarregada')
    expect(
      host.querySelector('[aria-label="Confirmação da alteração"]'),
    ).toBeNull()
    await click('Aplicar reajuste')
    await click('Confirmar')
    expect(adjust).toHaveBeenNthCalledWith(
      2,
      'client-1',
      {
        version: 5,
        paramsVersion: 3,
        mode: 'indice',
      },
      expect.any(AbortSignal),
    )
  })
})
