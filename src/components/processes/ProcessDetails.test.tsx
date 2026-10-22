/** @vitest-environment happy-dom */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, type ApiResponse } from '../../services/httpClient'
import { processService } from '../../services/processService'
import type { ProcessResource } from '../../types/processes'
import ProcessDetails from './ProcessDetails'
import {
  makeProcessTestResource,
  processTestCatalog,
} from './processTestFixtures'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
const response = (data: ProcessResource): ApiResponse<ProcessResource> => ({
  data,
  status: 200,
  headers: new Headers(),
  etag: null,
  requestId: null,
})
let host: HTMLDivElement
let root: Root
afterEach(async () => {
  if (root) await act(async () => root.unmount())
  host?.remove()
  vi.restoreAllMocks()
})

async function render(process: ProcessResource, onChange = vi.fn()) {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () =>
    root.render(
      <ProcessDetails
        process={process}
        catalog={processTestCatalog}
        onChange={onChange}
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
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
  it('uses server waiting analysis to lock the four month stage', async () => {
    const transition = vi.spyOn(processService, 'transitionTask')
    const process = makeProcessTestResource({
      etapas: [processTestCatalog.types[0]!.etapas[3]!],
      analysis: {
        currentStage: 0,
        completedTasks: 0,
        totalTasks: 1,
        releaseDate: '2027-02-28',
        waiting: true,
        late: false,
        pendingSectors: [],
      },
    })
    await render(process)
    expect(host.textContent).toContain('28/02/2027')
    expect(
      [...host.querySelectorAll<HTMLButtonElement>('button')].find((button) =>
        button.textContent?.includes('Aguardando'),
      )?.disabled,
    ).toBe(true)
    expect(transition).not.toHaveBeenCalled()
  })

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
        <ProcessDetails
          process={{
            ...process,
            notifications: { ...process.notifications, pending: 1 },
          }}
          catalog={processTestCatalog}
          onChange={vi.fn()}
          onClose={vi.fn()}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />,
      ),
    )
    await act(async () => button('Tentar envios pendentes').click())
    expect(retry).toHaveBeenCalledWith('process-1', 4)
  })

  it('does not render private values or financial notes for Regularidade even if present', async () => {
    const process = makeProcessTestResource({
      custo: '12345.00',
      obs: 'Segredo financeiro',
      notas: [
        {
          id: 'private',
          por: 'member-1',
          autor: 'Ana',
          em: '2026-10-22T12:00:00Z',
          kind: 'note',
          financial: true,
          text: 'Nota privada',
          details: {},
        },
      ],
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
})
