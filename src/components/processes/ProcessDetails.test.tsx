/** @vitest-environment happy-dom */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, type ApiResponse } from '../../services/httpClient'
import { processService } from '../../services/processService'
import type { ProcessEntry, ProcessResource } from '../../types/processes'
import { processQueryKeys } from '../../query/processQueryKeys'
import ProcessDetails from './ProcessDetails'
import {
  makeProcessTestResource,
  processTestCatalog,
} from './processTestFixtures'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
const response = <T,>(data: T): ApiResponse<T> => ({
  data,
  status: 200,
  headers: new Headers(),
  etag: null,
  requestId: null,
})
let host: HTMLDivElement
let root: Root
let client: QueryClient
const scope = { organizationId: 'org-1', membershipId: 'member-1' }
beforeEach(() => {
  vi.spyOn(processService, 'followUps').mockResolvedValue(
    response({ count: 0, next: null, previous: null, results: [] }),
  )
  vi.spyOn(processService, 'entries').mockResolvedValue(
    response({
      count: 0,
      next: null,
      previous: null,
      results: [],
    }),
  )
})
afterEach(async () => {
  if (root) await act(async () => root.unmount())
  client?.clear()
  host?.remove()
  vi.restoreAllMocks()
})

async function render(process: ProcessResource, onChange = vi.fn()) {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  await act(async () =>
    root.render(
      <QueryClientProvider client={client}>
        <ProcessDetails
          scope={scope}
          process={process}
          catalog={processTestCatalog}
          onChange={onChange}
          onClose={vi.fn()}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />
      </QueryClientProvider>,
    ),
  )
  return {
    onChange,
    button: (label: string) =>
      [...host.querySelectorAll<HTMLButtonElement>('button')].find(
        (button) => button.textContent?.trim() === label,
      )!,
  }
}

describe('ProcessDetails', () => {
  it.each([
    ['fin', true],
    ['fin', false],
    ['reg', true],
    ['reg', false],
  ] as const)(
    'renders the received Outros workflow for %s/Leggacy %s and enforces Regularidade permissions',
    async (departamentoSolicitado, acionarLeggacy) => {
      const process = makeProcessTestResource({
        tipo: 'outros',
        descricaoProcesso: 'Descrição operacional da certidão',
        departamentoSolicitado,
        acionarLeggacy,
        etapas: [
          {
            t: 'Etapa enviada pela API',
            tasks: [
              {
                id: 'ot1',
                d: departamentoSolicitado,
                txt: acionarLeggacy
                  ? 'Comunicar atividade e orçamento à Leggacy'
                  : 'Executar a atividade interna',
              },
            ],
          },
          {
            t: 'Confirmação enviada pela API',
            tasks: [
              {
                id: 'ot2',
                d: departamentoSolicitado,
                txt: 'Confirmar conclusão',
              },
            ],
          },
        ],
        analysis: {
          currentStage: 0,
          completedTasks: 0,
          totalTasks: 2,
          releaseDate: null,
          waiting: false,
          late: false,
          pendingSectors: [departamentoSolicitado],
        },
        permissions: {
          ...processTestCatalog.permissions,
          create: false,
          edit: false,
          delete: false,
          viewFinancial: false,
          executeSectors: ['reg'],
        },
      })
      const transition = vi
        .spyOn(processService, 'transitionTask')
        .mockResolvedValue(response({ ...process, version: 5 }))
      await render(process)
      expect(host.textContent).toContain(process.descricaoProcesso)
      expect(host.textContent).toContain('Etapa enviada pela API')
      expect(host.textContent).not.toContain('Valor do processo')
      const complete = [
        ...host.querySelectorAll<HTMLButtonElement>('.tbtns button'),
      ].find((button) => button.textContent === 'Concluir')!
      expect(complete.disabled).toBe(departamentoSolicitado !== 'reg')
      await act(async () => complete.click())
      if (departamentoSolicitado === 'reg')
        expect(transition).toHaveBeenCalledWith(
          process.id,
          'ot1',
          process.version,
          'feito',
        )
      else expect(transition).not.toHaveBeenCalled()
      expect(host.querySelectorAll('.stage')).toHaveLength(2)
    },
  )

  it('displays an authorized zero Outros value as a one-time amount', async () => {
    await render(
      makeProcessTestResource({
        tipo: 'outros',
        valorProcesso: '0.00',
        descricaoProcesso: 'Certidão',
        departamentoSolicitado: 'fin',
        acionarLeggacy: false,
      }),
    )
    expect(host.textContent).toContain('Valor do processo')
    expect(host.textContent).toMatch(/R\$\s*0,00/)
    expect(host.textContent).toContain('Valor pontual')
    expect(host.textContent).not.toContain('Novo honorário mensal')
  })

  it.each([
    ['abertura', 'ab4', 'ab5'],
    ['mei', 'me4', 'me5'],
    ['alteracao', 'al3', 'al4'],
    ['reativacao', 're6', 're7'],
    ['baixa', 'ba6', 'ba7'],
  ] as const)(
    'shows server Leggacy tracking for %s without adding workflow tasks',
    async (tipo, sendTaskId, returnTaskId) => {
      const process = makeProcessTestResource({
        tipo,
        leggacy: [
          {
            sendTaskId,
            returnTaskId,
            sentAt: '2026-10-26T12:00:00Z',
            dueOn: '2026-11-02',
            daysWaiting: 8,
            awaitingReturn: true,
            followUpDue: true,
          },
        ],
      })
      await render(process)
      expect(host.textContent).toContain('Aguardando retorno há 8 dias')
      expect(host.textContent).toContain('Cobrança necessária')
      expect(
        host
          .querySelector('[role="progressbar"]')
          ?.getAttribute('aria-valuenow'),
      ).toBe('0')
      expect(host.querySelectorAll('.task')).toHaveLength(2)
      expect(host.textContent).toContain('de 4 tarefas')
    },
  )

  it('hides elapsed wait after the server closes the Leggacy tracking', async () => {
    await render(
      makeProcessTestResource({
        leggacy: [
          {
            sendTaskId: 'ab4',
            returnTaskId: 'ab5',
            sentAt: '2026-10-26T12:00:00Z',
            dueOn: '2026-11-02',
            daysWaiting: 8,
            awaitingReturn: false,
            followUpDue: false,
          },
        ],
      }),
    )
    expect(host.textContent).not.toContain('Aguardando retorno há')
    expect(host.textContent).not.toContain('Cobrança necessária')
  })
  it.each(['abertura', 'mei', 'outro', 'reativacao'] as const)(
    'locks the second visit of %s from persisted status even after the release date',
    async (tipo) => {
      const transition = vi.spyOn(processService, 'transitionTask')
      const process = makeProcessTestResource({
        tipo,
        status: 'agendado',
        etapas: [processTestCatalog.types[0]!.etapas[3]!],
        analysis: {
          currentStage: 0,
          completedTasks: 0,
          totalTasks: 1,
          releaseDate: '2020-02-28',
          waiting: true,
          late: false,
          pendingSectors: [],
        },
      })
      await render(process)
      expect(host.textContent).toContain('28/02/2020')
      expect(host.textContent).toContain('Aguardando liberação')
      expect(host.textContent).not.toContain('Processo cancelado')
      expect(
        [...host.querySelectorAll<HTMLButtonElement>('button')].find((button) =>
          button.textContent?.includes('Aguardando'),
        )?.disabled,
      ).toBe(true)
      expect(transition).not.toHaveBeenCalled()
    },
  )

  it('enforces task sectors, optional skipping and sends the current version', async () => {
    const process = makeProcessTestResource({
      permissions: {
        ...processTestCatalog.permissions,
        create: false,
        edit: false,
        delete: false,
        cancel: false,
        reopen: false,
        executeSectors: ['reg'],
        sectors: ['reg'],
        viewFinancial: false,
      },
    })
    const transition = vi
      .spyOn(processService, 'transitionTask')
      .mockResolvedValue(response({ ...process, version: 5 }))
    const { button, onChange } = await render(process)
    const concludes = [
      ...host.querySelectorAll<HTMLButtonElement>('button'),
    ].filter((button) => button.textContent?.trim() === 'Concluir')
    expect(concludes[0]?.disabled).toBe(true)
    expect(concludes[1]?.disabled).toBe(false)
    await act(async () => button('Não se aplica').click())
    expect(transition).toHaveBeenCalledWith('process-1', 'ab4', 4, 'na')
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ version: 5 }),
    )
  })

  it('keeps comments on save failures and reloads after a version conflict without replaying', async () => {
    const process = makeProcessTestResource()
    const conflict = new ApiError({
      problem: { type: 'conflict', title: 'Conflito', status: 409 },
      requestId: null,
      response: new Response(null, { status: 409 }),
    })
    const add = vi.spyOn(processService, 'addNote').mockRejectedValue(conflict)
    const get = vi
      .spyOn(processService, 'get')
      .mockResolvedValue(response({ ...process, version: 6 }))
    const { onChange } = await render(process)
    const textarea = host.querySelector('textarea')!
    await act(async () => {
      Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        'value',
      )!.set!.call(textarea, 'Comentário importante')
      textarea.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await act(async () =>
      host
        .querySelector('form.composer')!
        .dispatchEvent(
          new Event('submit', { bubbles: true, cancelable: true }),
        ),
    )
    expect(add).toHaveBeenCalledTimes(1)
    expect(add).toHaveBeenCalledWith('process-1', 4, 'Comentário importante')
    expect(get).toHaveBeenCalledWith('process-1')
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ version: 6 }),
    )
    expect(textarea.value).toBe('Comentário importante')
    expect(host.querySelector('[role="alert"]')?.textContent).toContain(
      'Os dados foram atualizados',
    )
  })

  it('requires an explicit reopening action before resetting later confirmations', async () => {
    const process = makeProcessTestResource({
      tarefas: {
        ab3: {
          s: 'feito',
          por: 'member-1',
          autor: 'Ana',
          em: '2026-10-22T12:00:00Z',
        },
      },
    })
    const transition = vi
      .spyOn(processService, 'transitionTask')
      .mockResolvedValue(response(process))
    const { button } = await render(process)
    await act(async () => button('Concluída').click())
    expect(transition).not.toHaveBeenCalled()
    expect(host.textContent).toContain(
      'remove confirmações das etapas seguintes',
    )
    await act(async () => button('Reabrir tarefa').click())
    expect(transition).toHaveBeenCalledWith('process-1', 'ab3', 4, 'pending')
  })

  it('shows uncertain email delivery accurately and retries only when eligible', async () => {
    const process = makeProcessTestResource({
      notifications: { sent: 2, uncertain: 1 },
    })
    const retry = vi
      .spyOn(processService, 'retryNotifications')
      .mockResolvedValue(response(process))
    const { button } = await render(process)
    expect(host.textContent).toContain('Aceitos pelo provedor')
    expect(host.textContent).toContain('não são reenviadas automaticamente')
    expect(button('Tentar envios pendentes')).toBeUndefined()
    await act(async () =>
      root.render(
        <QueryClientProvider client={client}>
          <ProcessDetails
            scope={scope}
            process={{
              ...process,
              notifications: { ...process.notifications, pending: 1 },
            }}
            catalog={processTestCatalog}
            onChange={vi.fn()}
            onClose={vi.fn()}
            onEdit={vi.fn()}
            onDelete={vi.fn()}
          />
        </QueryClientProvider>,
      ),
    )
    await act(async () => button('Tentar envios pendentes').click())
    expect(retry).toHaveBeenCalledWith('process-1', 4)
  })

  it('preserves financial omissions for Regularidade', async () => {
    const process = makeProcessTestResource({
      permissions: {
        ...processTestCatalog.permissions,
        viewFinancial: false,
        edit: false,
        create: false,
        delete: false,
        cancel: false,
        reopen: false,
        executeSectors: ['reg'],
        sectors: ['reg'],
      },
    })
    await render(process)
    expect(host.textContent).toContain('Restritos')
    expect(host.textContent).not.toContain('Segredo financeiro')
    expect(host.textContent).not.toContain('Nota privada')
    expect(host.textContent).not.toContain('12.345')
  })

  it('loads entries only when their type and page are requested', async () => {
    const note: ProcessEntry = {
      id: 'note-1',
      por: 'member-1',
      autor: 'Ana',
      em: '2026-10-22T12:00:00Z',
      kind: 'note',
      financial: false,
      text: 'Primeira página',
      details: {},
    }
    const entries = vi
      .mocked(processService.entries)
      .mockImplementation(async (_id, filters) =>
        response({
          count: 51,
          previous:
            filters?.page === 2
              ? '/api/v1/processes/process-1/entries/?page=1'
              : null,
          next:
            filters?.page === 2
              ? null
              : '/api/v1/processes/process-1/entries/?page=2',
          results: [
            {
              ...note,
              text: filters?.page === 2 ? 'Segunda página' : note.text,
            },
          ],
        }),
      )
    const { button } = await render(makeProcessTestResource())
    await settleQueries()
    expect(entries).toHaveBeenCalledTimes(1)
    expect(entries).toHaveBeenLastCalledWith(
      'process-1',
      { kind: 'note', page: 1, pageSize: 50 },
      expect.any(AbortSignal),
    )
    expect(host.textContent).toContain('Primeira página')
    await act(async () => button('Próxima').click())
    await settleQueries()
    expect(entries).toHaveBeenCalledTimes(2)
    expect(entries).toHaveBeenLastCalledWith(
      'process-1',
      { kind: 'note', page: 2, pageSize: 50 },
      expect.any(AbortSignal),
    )
    expect(host.textContent).toContain('Segunda página')
    expect(host.textContent).not.toContain('Primeira página')
    await act(async () => button('Histórico').click())
    await settleQueries()
    expect(entries).toHaveBeenLastCalledWith(
      'process-1',
      { kind: 'event', page: 1, pageSize: 50 },
      expect.any(AbortSignal),
    )
  })

  it.each(['clock', 'migration', 'migration_reverse', 'command'])(
    'presents status_changed triggered by %s with the correct actor',
    async (trigger) => {
      vi.mocked(processService.entries).mockImplementation(
        async (_id, filters) =>
          response({
            count: filters?.kind === 'event' ? 1 : 0,
            next: null,
            previous: null,
            results:
              filters?.kind === 'event'
                ? [
                    {
                      id: 'event-1',
                      por: 'member-1',
                      autor: 'Ana histórica',
                      em: '2026-10-22T12:00:00Z',
                      kind: 'status_changed',
                      financial: false,
                      text: 'Situação alterada',
                      details: { from: 'agendado', to: 'andamento', trigger },
                    },
                  ]
                : [],
          }),
      )
      const { button } = await render(makeProcessTestResource())
      await act(async () => button('Histórico').click())
      await settleQueries()
      expect(host.querySelector('.feed .ev b')?.textContent).toBe(
        trigger === 'command' ? 'Ana histórica' : 'Sistema',
      )
      expect(host.textContent).toContain(
        'alterou a situação de Aguardando liberação para Em andamento',
      )
    },
  )

  it.each([
    'followup_created',
    'followup_closed',
    'alert_created',
    'followup_done',
    'alert_sent',
  ])('preserves the actor of %s returned by the API', async (kind) => {
    const automatic = [
      'followup_created',
      'followup_closed',
      'alert_created',
    ].includes(kind)
    vi.mocked(processService.entries).mockImplementation(async (_id, filters) =>
      response({
        count: filters?.kind === 'event' ? 1 : 0,
        next: null,
        previous: null,
        results:
          filters?.kind === 'event'
            ? [
                {
                  id: 'event-followup',
                  por: 'member-1',
                  autor: 'Ana histórica',
                  em: '2026-11-03T12:00:00Z',
                  kind,
                  financial: false,
                  text: 'Acompanhamento registrado',
                  details: { trigger: automatic ? 'clock' : 'command' },
                },
              ]
            : [],
      }),
    )
    const { button } = await render(makeProcessTestResource())
    await act(async () => button('Histórico').click())
    await settleQueries()
    expect(host.querySelector('.feed .ev b')?.textContent).toBe(
      automatic ? 'Sistema' : 'Ana histórica',
    )
  })

  it('invalidates paginated entries after adding a note without reading audit arrays from the mutation response', async () => {
    const process = makeProcessTestResource()
    vi.spyOn(processService, 'addNote').mockResolvedValue(
      response({ ...process, version: 5 }),
    )
    await render(process)
    await settleQueries()
    const invalidate = vi.spyOn(client, 'invalidateQueries')
    await enterComment('Novo comentário')
    await act(async () =>
      host
        .querySelector('form.composer')!
        .dispatchEvent(
          new Event('submit', { bubbles: true, cancelable: true }),
        ),
    )
    expect(invalidate).toHaveBeenCalledWith(
      { queryKey: processQueryKeys.entries(scope, process.id) },
      { cancelRefetch: false },
    )
    expect(host.querySelector('textarea')?.value).toBe('')
  })

  it.each([400, 429, 503])(
    'shows an entries HTTP %i failure without presenting an empty successful collection',
    async (status) => {
      vi.mocked(processService.entries).mockRejectedValue(
        new ApiError({
          problem: {
            type: 'request-failed',
            title: 'Falha na consulta',
            status,
          },
          requestId: 'request-entries',
          response: new Response(null, {
            status,
            headers: { 'Retry-After': '30' },
          }),
        }),
      )
      await render(makeProcessTestResource())
      await settleQueries()
      expect(
        host.querySelector('.process-entries [role="alert"]')?.textContent,
      ).toContain('request-entries')
      expect(host.textContent).not.toContain('Sem comentários ainda')
      expect(processService.entries).toHaveBeenCalledTimes(1)
      if (status === 429 || status === 503)
        expect(
          [...host.querySelectorAll<HTMLButtonElement>('button')].find(
            (button) =>
              button.textContent?.includes('Tentar carregar registros'),
          )?.disabled,
        ).toBe(true)
    },
  )

  it.each([403, 404])(
    'removes detail content and cache when entry access returns %i',
    async (status) => {
      vi.mocked(processService.entries).mockRejectedValue(
        new ApiError({
          problem: {
            type: 'access-revoked',
            title: 'Processo indisponível',
            status,
          },
          requestId: null,
          response: new Response(null, { status }),
        }),
      )
      await render(makeProcessTestResource())
      await settleQueries()
      expect(host.textContent).toContain('Processo indisponível')
      expect(host.textContent).not.toContain('Empresa Exemplo')
      expect(
        client.getQueriesData({ queryKey: processQueryKeys.root(scope) }),
      ).toEqual([])
    },
  )

  it('does not repopulate revoked cache when an older command finishes', async () => {
    const process = makeProcessTestResource()
    let complete!: (value: ApiResponse<ProcessResource>) => void
    vi.spyOn(processService, 'transitionTask').mockReturnValue(
      new Promise((resolve) => {
        complete = resolve
      }),
    )
    const { button, onChange } = await render(process)
    await settleQueries()
    await act(async () => button('Concluir').click())
    vi.mocked(processService.entries).mockRejectedValue(
      new ApiError({
        problem: {
          type: 'access-revoked',
          title: 'Processo indisponível',
          status: 403,
        },
        requestId: null,
        response: new Response(null, { status: 403 }),
      }),
    )
    await act(async () => {
      await client.invalidateQueries({
        queryKey: processQueryKeys.entries(scope, process.id),
      })
    })
    await settleQueries()
    await act(async () => complete(response({ ...process, version: 5 })))
    expect(host.textContent).toContain('Processo indisponível')
    expect(onChange).not.toHaveBeenCalled()
    expect(
      client.getQueriesData({ queryKey: processQueryKeys.root(scope) }),
    ).toEqual([])
  })

  it('preserves the note and blocks immediate replay during Retry-After', async () => {
    const add = vi.spyOn(processService, 'addNote').mockRejectedValue(
      new ApiError({
        problem: {
          type: 'throttled',
          title: 'Muitas requisições',
          status: 429,
        },
        requestId: 'note-rate-limit',
        response: new Response(null, {
          status: 429,
          headers: { 'Retry-After': '30' },
        }),
      }),
    )
    const { button } = await render(makeProcessTestResource())
    await enterComment('Comentário preservado')
    const submit = () =>
      host
        .querySelector('form.composer')!
        .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await act(async () => {
      submit()
    })
    expect(button('Enviar').disabled).toBe(true)
    expect(host.querySelector('textarea')?.value).toBe('Comentário preservado')
    expect(host.textContent).toContain('note-rate-limit')
    await act(async () => {
      submit()
    })
    expect(add).toHaveBeenCalledTimes(1)
  })

  it.each(['agendado', 'concluido'] as const)(
    'allows an explicit pending command for a completed task of %s and preserves the returned status',
    async (status) => {
      const completed = {
        s: 'feito' as const,
        por: 'member-1',
        autor: 'Ana',
        em: '2026-10-22T12:00:00Z',
      }
      const process = makeProcessTestResource({
        status,
        concluidoEm: status === 'concluido' ? '2026-10-22T12:00:00Z' : null,
        etapas: [
          {
            t: 'Registro',
            completed: true,
            tasks: [{ id: 'ab3', d: 'fin', txt: 'Contatar cliente' }],
          },
          {
            t: 'Segunda visita',
            espera: 4,
            completed: status === 'concluido',
            tasks: [{ id: 'ab13', d: 'fin', txt: 'Agendar segunda visita' }],
          },
        ],
        tarefas:
          status === 'concluido'
            ? { ab3: completed, ab13: completed }
            : { ab3: completed },
        analysis: {
          currentStage: status === 'concluido' ? null : 1,
          completedTasks: status === 'concluido' ? 2 : 1,
          totalTasks: 2,
          releaseDate: status === 'agendado' ? '2027-02-28' : null,
          waiting: status === 'agendado',
          late: false,
          pendingSectors: [],
        },
        permissions: {
          ...processTestCatalog.permissions,
          reopen: false,
          executeSectors: ['fin'],
          sectors: ['fin'],
        },
      })
      const serverResponse: ProcessResource = {
        ...process,
        status: 'atrasado',
        concluidoEm: null,
        version: 5,
        tarefas: {},
        analysis: {
          ...process.analysis,
          currentStage: 0,
          completedTasks: 0,
          waiting: false,
          late: true,
          pendingSectors: ['fin'],
        },
      }
      const transition = vi
        .spyOn(processService, 'transitionTask')
        .mockResolvedValue(response(serverResponse))
      const { button, onChange } = await render(process)
      const firstStage = host.querySelector<HTMLButtonElement>('.stage-h')!
      if (firstStage.getAttribute('aria-expanded') !== 'true')
        await act(async () => firstStage.click())
      expect(button('Reabrir processo')).toBeUndefined()
      await act(async () => button('Concluída').click())
      expect(transition).not.toHaveBeenCalled()
      await act(async () => button('Reabrir tarefa').click())
      expect(transition).toHaveBeenCalledWith(
        process.id,
        'ab3',
        process.version,
        'pending',
      )
      expect(onChange).toHaveBeenCalledWith(serverResponse)
      expect(host.querySelector('.phead .badge')?.textContent).toBe(
        status === 'agendado' ? 'Aguardando liberação' : 'Concluído',
      )
      await act(async () =>
        root.render(
          <QueryClientProvider client={client}>
            <ProcessDetails
              scope={scope}
              process={serverResponse}
              catalog={processTestCatalog}
              onChange={onChange}
              onClose={vi.fn()}
              onEdit={vi.fn()}
              onDelete={vi.fn()}
            />
          </QueryClientProvider>,
        ),
      )
      expect(host.querySelector('.phead .badge')?.textContent).toBe('Atrasado')
    },
  )
})

async function settleQueries() {
  await act(async () => new Promise((resolve) => setTimeout(resolve, 10)))
}

async function enterComment(text: string) {
  const textarea = host.querySelector('textarea')!
  await act(async () => {
    Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      'value',
    )!.set!.call(textarea, text)
    textarea.dispatchEvent(new Event('input', { bubbles: true }))
  })
}
