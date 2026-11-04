/** @vitest-environment happy-dom */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { processService } from '../../services/processService'
import { ApiError, type ApiResponse } from '../../services/httpClient'
import type { ProcessAlert, ProcessPermissions } from '../../types/processes'
import { processTestPermissions } from './processTestFixtures'
import ProcessAlerts from './ProcessAlerts'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
const scope = { organizationId: 'org-1', membershipId: 'member-1' }
const alertId = '00000000-0000-4000-8000-000000000001'
const memberId = '00000000-0000-4000-8000-000000000002'
const processId = '00000000-0000-4000-8000-000000000003'
let root: Root
let host: HTMLDivElement
let client: QueryClient
let alert: ProcessAlert
let copy: ReturnType<typeof vi.fn>
const response = <T,>(data: T): ApiResponse<T> => ({
  data,
  status: 200,
  headers: new Headers(),
  requestId: null,
  etag: null,
})
function failure(status: number) {
  return new ApiError({
    problem: {
      type: 'test',
      status,
      title:
        status === 400
          ? 'Destinatário suspenso ou acesso revogado.'
          : 'Conflito de versão',
    },
    requestId: 'request-alert-test',
    response: new Response(null, { status }),
  })
}
beforeEach(() => {
  alert = {
    id: alertId,
    processId,
    empresa: 'Empresa Exemplo',
    codigo: 'ABE-TEST',
    kind: 'leggacy',
    followUpId: null,
    stageIndex: null,
    subject: 'Retorno da Leggacy',
    body: '<script>texto seguro</script>',
    defaultSectors: ['com', 'fin'],
    selectedSectors: [],
    selectedMemberIds: [],
    recipients: [],
    createdAt: '2026-11-03T12:00:00Z',
    sentAt: null,
    sentBy: null,
    resolvedAt: null,
    status: 'pending',
    deliveryMode: 'manual',
    version: 4,
  }
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  })
  copy = vi.fn().mockResolvedValue(undefined)
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: copy },
  })
  vi.spyOn(processService, 'alerts').mockImplementation(async () =>
    response({ count: 81, next: '?page=2', previous: null, results: [alert] }),
  )
  vi.spyOn(processService, 'alert').mockImplementation(async () =>
    response(alert),
  )
  vi.spyOn(processService, 'alertRecipientOptions').mockResolvedValue(
    response({
      count: 1,
      next: null,
      previous: null,
      results: [
        {
          memberId,
          name: 'Ana Silva',
          email: 'ana@example.test',
          sectors: ['com', 'fin'],
        },
      ],
    }),
  )
  vi.spyOn(processService, 'prepareAlert').mockImplementation(
    async (_id, selection) =>
      response({
        alertId,
        version: selection.version,
        subject: alert.subject,
        body: alert.body,
        recipients: [
          { memberId, name: 'Ana Silva', email: 'ana@example.test' },
        ],
        copyText: 'TEXTO EXATO RETORNADO PELO SERVIDOR',
      }),
  )
  vi.spyOn(processService, 'declareAlertSent').mockImplementation(
    async (_id, selection) => {
      alert = {
        ...alert,
        ...selection,
        selectedSectors: selection.sectors ?? [],
        selectedMemberIds: selection.memberIds ?? [],
        recipients: [
          { memberId, name: 'Ana Silva', email: 'ana@example.test' },
        ],
        status: 'sent',
        sentAt: '2026-11-03T13:00:00Z',
        sentBy: 'Diretora Ana',
        version: selection.version + 1,
      }
      return response(alert)
    },
  )
})
afterEach(async () => {
  await act(async () => root.unmount())
  client.clear()
  host.remove()
  vi.restoreAllMocks()
})
async function waitFor(check: () => boolean) {
  const deadline = Date.now() + 2500
  while (!check()) {
    if (Date.now() >= deadline)
      throw new Error(`Estado esperado não chegou: ${host.textContent}`)
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10))
    })
  }
}
async function render(
  permissions: ProcessPermissions = processTestPermissions,
  nextScope = scope,
  onUnavailable = vi.fn(),
) {
  await act(async () =>
    root.render(
      <QueryClientProvider client={client}>
        <ProcessAlerts
          scope={nextScope}
          permissions={permissions}
          onOpen={vi.fn()}
          onUnavailable={onUnavailable}
        />
      </QueryClientProvider>,
    ),
  )
  return onUnavailable
}
function button(text: string) {
  const found = [...host.querySelectorAll<HTMLButtonElement>('button')].find(
    (item) => item.textContent?.includes(text),
  )
  if (!found) throw new Error(`Botão não encontrado: ${text}`)
  return found
}
async function click(text: string) {
  await act(async () => button(text).click())
}
async function openAlert() {
  await waitFor(() => !!host.querySelector('.process-alert-row'))
  await act(async () =>
    host.querySelector<HTMLButtonElement>('.process-alert-row')!.click(),
  )
  await waitFor(() => !!host.querySelector('.process-recipient-selector'))
  await openSelector()
  await waitFor(
    () => !!host.querySelector('[aria-label="Pessoas cadastradas"] input'),
  )
}
async function openSelector() {
  if (!host.querySelector('[role="dialog"]'))
    await act(async () =>
      host
        .querySelector<HTMLButtonElement>('.process-recipient-trigger')!
        .click(),
    )
  await waitFor(
    () => !!host.querySelector('[aria-label="Pessoas cadastradas"] input'),
  )
}
async function prepareAndCopy() {
  const close = [...host.querySelectorAll<HTMLButtonElement>('button')].find(
    (item) => item.textContent?.includes('Concluir'),
  )
  if (close) await act(async () => close.click())
  await click('Preparar texto')
  await waitFor(() => !button('Copiar texto').disabled)
  await click('Copiar texto')
  await waitFor(() => !button('Declarar envio').disabled)
}
function checkbox(label: string) {
  const found = [...host.querySelectorAll<HTMLLabelElement>('label')].find(
    (item) => item.querySelector('strong')?.textContent === label,
  )
  if (!found) throw new Error(`Checkbox não encontrado: ${label}`)
  return found.querySelector<HTMLInputElement>('input[type=checkbox]')!
}

describe('central de avisos manuais', () => {
  it.each(['fin', 'reg'] as const)(
    'bloqueia o setor %s sem consultar dados restritos',
    async (sector) => {
      await render({
        ...processTestPermissions,
        create: false,
        executeSectors: [sector],
      })
      expect(host.textContent).toContain('Acesso restrito')
      expect(processService.alerts).not.toHaveBeenCalled()
      expect(processService.alertRecipientOptions).not.toHaveBeenCalled()
    },
  )

  it('prepara setores e membro sem deduplicar no navegador e declara somente após cópia', async () => {
    await render()
    await openAlert()
    expect(host.textContent).toContain('81 avisos')
    expect(host.querySelectorAll('.process-recipient-trigger')).toHaveLength(1)
    expect(
      host
        .querySelector('.process-recipient-selector')!
        .compareDocumentPosition(host.querySelector('.process-alert-email')!) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(checkbox('Diretoria').checked).toBe(true)
    expect(checkbox('Financeiro').checked).toBe(true)
    expect(host.querySelector('script')).toBeNull()
    expect(host.querySelector('pre')?.textContent).toContain(
      '<script>texto seguro</script>',
    )
    const member = host.querySelector<HTMLInputElement>(
      '[aria-label="Pessoas cadastradas"] input',
    )!
    await act(async () => member.click())
    await prepareAndCopy()
    expect(processService.prepareAlert).toHaveBeenCalledWith(alertId, {
      version: 4,
      sectors: ['com', 'fin'],
      memberIds: [memberId],
    })
    expect(
      host.querySelectorAll('.process-alert-effective-recipients li'),
    ).toHaveLength(1)
    expect(copy).toHaveBeenCalledWith('TEXTO EXATO RETORNADO PELO SERVIDOR')
    expect(processService.declareAlertSent).not.toHaveBeenCalled()
    await click('Declarar envio realizado')
    await waitFor(() => host.textContent!.includes('Diretora Ana'))
    expect(processService.declareAlertSent).toHaveBeenCalledWith(alertId, {
      version: 4,
      sectors: ['com', 'fin'],
      memberIds: [memberId],
    })
    expect(host.textContent).toContain('Envio declarado')
    expect(host.textContent).not.toContain('Entregue')
    expect(host.querySelector('.process-recipient-selector')).toBeNull()
  })

  it('invalida preparo e cópia ao alterar seleção e permite destinatários individuais', async () => {
    await render()
    await openAlert()
    await prepareAndCopy()
    await openSelector()
    await act(async () => checkbox('Diretoria').click())
    expect(button('Copiar texto').disabled).toBe(true)
    expect(button('Declarar envio').disabled).toBe(true)
    await act(async () => checkbox('Financeiro').click())
    expect(button('Preparar texto').disabled).toBe(true)
    await act(async () =>
      host
        .querySelector<HTMLInputElement>(
          '[aria-label="Pessoas cadastradas"] input',
        )!
        .click(),
    )
    await prepareAndCopy()
    expect(processService.prepareAlert).toHaveBeenLastCalledWith(alertId, {
      version: 4,
      sectors: [],
      memberIds: [memberId],
    })
    expect(processService.declareAlertSent).not.toHaveBeenCalled()
  })

  it('preserva seleção no conflito e exige nova revisão, preparo e cópia', async () => {
    await render()
    await openAlert()
    await act(async () => checkbox('Regularidade').click())
    await prepareAndCopy()
    vi.mocked(processService.declareAlertSent).mockImplementationOnce(
      async () => {
        alert = { ...alert, version: 5 }
        throw failure(409)
      },
    )
    await click('Declarar envio realizado')
    await waitFor(() =>
      host.textContent!.includes('Sua seleção foi preservada'),
    )
    await openSelector()
    expect(checkbox('Regularidade').checked).toBe(true)
    expect(button('Declarar envio').disabled).toBe(true)
    expect(button('Copiar texto').disabled).toBe(true)
    expect(processService.declareAlertSent).toHaveBeenCalledTimes(1)
    await prepareAndCopy()
    expect(processService.prepareAlert).toHaveBeenLastCalledWith(alertId, {
      version: 5,
      sectors: ['com', 'fin', 'reg'],
      memberIds: [],
    })
    expect(processService.declareAlertSent).toHaveBeenCalledTimes(1)
  })

  it('mostra recusa do servidor a destinatário revogado e mantém aviso pendente', async () => {
    await render()
    await openAlert()
    await prepareAndCopy()
    vi.mocked(processService.declareAlertSent).mockRejectedValueOnce(
      failure(400),
    )
    await click('Declarar envio realizado')
    await waitFor(() => host.textContent!.includes('Destinatário suspenso'))
    expect(host.textContent).not.toContain('Diretora Ana')
    expect(button('Declarar envio').disabled).toBe(true)
    expect(button('Copiar texto').disabled).toBe(true)
  })

  it('pagina a consulta sem buscar todas as páginas para o contador', async () => {
    await render()
    await waitFor(() => host.textContent!.includes('81 avisos'))
    expect(processService.alerts).toHaveBeenCalledTimes(1)
    await click('Próxima')
    await waitFor(() =>
      vi
        .mocked(processService.alerts)
        .mock.calls.some(([filters]) => filters?.page === 2),
    )
    expect(processService.alerts).toHaveBeenCalledTimes(2)
  })

  it('descarta seleção e texto preparado ao trocar tenant ou perder permissão', async () => {
    await render()
    await openAlert()
    await prepareAndCopy()
    await render(processTestPermissions, {
      organizationId: 'org-2',
      membershipId: 'member-2',
    })
    await waitFor(() => host.textContent!.includes('Selecione um aviso'))
    expect(host.querySelector('.process-alert-editor')).toBeNull()
    await render({ ...processTestPermissions, create: false })
    expect(host.textContent).toContain('Acesso restrito')
    expect(host.querySelector('.process-alert-editor')).toBeNull()
  })

  it('remove dados restritos e pede revalidação de acesso em 403', async () => {
    const onUnavailable = vi.fn()
    await render(processTestPermissions, scope, onUnavailable)
    await openAlert()
    vi.mocked(processService.prepareAlert).mockRejectedValueOnce(failure(403))
    await click('Preparar texto')
    await waitFor(() => onUnavailable.mock.calls.length > 0)
    expect(host.textContent).not.toContain('Empresa Exemplo')
    expect(host.querySelector('.process-alert-editor')).toBeNull()
  })

  it('ignora preparo que termina após troca de tenant e bloqueia cliques repetidos', async () => {
    let release!: () => void
    vi.mocked(processService.prepareAlert).mockImplementationOnce(async () => {
      await new Promise<void>((resolve) => {
        release = resolve
      })
      return response({
        alertId,
        version: 4,
        subject: 'Texto antigo',
        body: 'Dados antigos',
        recipients: [],
        copyText: 'Não copiar',
      })
    })
    await render()
    await openAlert()
    await act(async () => {
      button('Preparar texto').click()
      button('Preparar texto').click()
    })
    expect(processService.prepareAlert).toHaveBeenCalledTimes(1)
    await render(processTestPermissions, {
      organizationId: 'org-2',
      membershipId: 'member-2',
    })
    await act(async () => release())
    await waitFor(() => host.textContent!.includes('Selecione um aviso'))
    expect(host.textContent).not.toContain('Dados antigos')
    expect(copy).not.toHaveBeenCalled()
    expect(processService.declareAlertSent).not.toHaveBeenCalled()
  })

  it('mantém destinatários e autor históricos de envio declarado após encerramento', async () => {
    alert = {
      ...alert,
      status: 'sent',
      sentAt: '2026-11-03T13:00:00Z',
      sentBy: 'Diretora Ana',
      resolvedAt: '2026-11-03T14:00:00Z',
      recipients: [
        { memberId, name: 'Nome no envio', email: 'historico@example.test' },
      ],
    }
    await render()
    await waitFor(() => !!host.querySelector('.process-alert-row'))
    await act(async () =>
      host.querySelector<HTMLButtonElement>('.process-alert-row')!.click(),
    )
    await waitFor(() => host.textContent!.includes('Nome no envio'))
    expect(host.textContent).toContain('Envio declarado em')
    expect(host.textContent).toContain('Diretora Ana')
    expect(host.textContent).toContain('Situação encerrada em')
    expect(host.textContent).toContain('historico@example.test')
    expect(host.querySelector('.process-recipient-selector')).toBeNull()
    expect(processService.alertRecipientOptions).not.toHaveBeenCalled()
  })

  it('prepara Todos com todas as pessoas resolvidas pelo servidor, além da página visível', async () => {
    const recipients = Array.from({ length: 81 }, (_, index) => ({
      memberId: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
      name: `Pessoa ${index + 1}`,
      email: `pessoa${index + 1}@example.test`,
    }))
    vi.mocked(processService.alertRecipientOptions).mockResolvedValue(
      response({
        count: 81,
        next: '?page=2',
        previous: null,
        results: recipients
          .slice(0, 50)
          .map((member) => ({ ...member, sectors: ['fin'] })),
      }),
    )
    vi.mocked(processService.prepareAlert).mockResolvedValue(
      response({
        alertId,
        version: 4,
        subject: alert.subject,
        body: alert.body,
        recipients,
        copyText: 'TODOS RESOLVIDOS PELO SERVIDOR',
      }),
    )
    await render()
    await openAlert()
    expect(
      host.querySelectorAll('[aria-label="Pessoas cadastradas"] input'),
    ).toHaveLength(50)
    await act(async () => checkbox('Todos com acesso a Processos').click())
    await prepareAndCopy()
    expect(processService.prepareAlert).toHaveBeenCalledWith(alertId, {
      version: 4,
      sectors: ['com', 'fin', 'reg'],
      memberIds: [],
    })
    expect(processService.alertRecipientOptions).toHaveBeenCalledTimes(1)
    expect(
      host.querySelectorAll('.process-alert-effective-recipients li'),
    ).toHaveLength(81)
    expect(host.textContent).toContain('pessoa81@example.test')
    expect(copy).toHaveBeenCalledWith('TODOS RESOLVIDOS PELO SERVIDOR')
    expect(processService.declareAlertSent).not.toHaveBeenCalled()
  })

  it('foca o detalhe ao abrir e retorna ao aviso selecionado ao voltar à lista', async () => {
    await render()
    await waitFor(() => !!host.querySelector('.process-alert-row'))
    const row = host.querySelector<HTMLButtonElement>('.process-alert-row')!
    expect(row.textContent).toContain('Selecionar destinatários')
    await act(async () => row.click())
    await waitFor(() => !!host.querySelector('.process-recipient-selector'))
    expect(document.activeElement).toBe(
      host.querySelector('.process-alert-detail'),
    )
    expect(host.querySelector('.process-alert-show-detail')).not.toBeNull()
    await act(async () =>
      host.querySelector<HTMLButtonElement>('.process-alert-back')!.click(),
    )
    expect(document.activeElement).toBe(row)
    expect(host.querySelector('.process-alert-show-detail')).toBeNull()
  })
})
