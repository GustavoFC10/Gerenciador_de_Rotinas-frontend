/** @vitest-environment happy-dom */

import { act, StrictMode, useEffect } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import TaskDetailsDialog from '../components/routine-control/details/TaskDetailsDialog'
import { useFileUploads } from '../hooks/useFileUploads'
import { queryKeys, type OrganizationQueryScope } from '../query/queryKeys'
import { fileOwnerPath, fileService } from '../services/fileService'
import type { ApiResponse } from '../services/httpClient'
import { taskService, type TaskResource } from '../services/taskService'
import type {
  RoutineControlResponse,
  ScheduledOccurrence,
  Task,
} from '../types/domain'
import type {
  AttachmentResource,
  FileTarget,
  PrivateFile,
  UploadIntent,
} from '../types/files'
import { FileUploadsProvider } from './FileUploadsContext'
import type { FileUploadsContextValue } from './fileUploadsContextDefinition'
import { NotificationsProvider } from './NotificationsContext'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

const scope = { organizationId: 'organization-1', membershipId: 'member-1' }
const destination: FileTarget = {
  purpose: 'task_attachment',
  target: { referenceMonth: '2026-10', occurrenceKey: 'occurrence-1' },
}
const intent: UploadIntent = {
  intentId: 'intent-1',
  fileId: 'file-1',
  expiresAt: '2099-01-01T00:00:00Z',
  upload: {
    url: 'https://storage.example.com/',
    method: 'POST',
    enctype: 'multipart/form-data',
    fields: {},
  },
}
const file: PrivateFile = {
  fileId: 'file-1',
  purpose: 'task_attachment',
  state: 'available',
  originalName: 'comprovante.pdf',
  sizeBytes: 7,
  contentType: 'application/pdf',
  rejectionReason: '',
  createdAt: '',
  expiresAt: null,
  variants: [],
}
const attachment: AttachmentResource = {
  attachmentId: 'attachment-1',
  createdByMemberId: 'member-1',
  createdAt: '',
  file,
}
const task: Task = {
  id: 'occurrence-1',
  occurrenceKey: 'occurrence-1',
  taskId: 'task-1',
  competenceId: 'competence-1',
  kind: 'scheduled',
  persistence: 'materialized',
  clientId: null,
  routineId: null,
  departmentId: 'department-1',
  assigneeId: null,
  status: 'pending',
  period: '2026-10',
  dueDate: '2026-10-31',
  completedAt: null,
  title: 'Conferir documentos',
  indicators: { attachments: 0 },
}
function occurrence(
  overrides: Partial<ScheduledOccurrence> = {},
): ScheduledOccurrence {
  return {
    attachmentCount: 1,
    occurrenceKey: 'occurrence-1',
    taskId: 'task-1',
    etag: '"9"',
    persistence: 'materialized',
    referenceMonth: '2026-10',
    kind: 'scheduled',
    departmentId: 'department-1',
    departmentName: 'Fiscal',
    clientCompanyId: 'client-1',
    companyCode: '001',
    companyName: 'Empresa',
    companyLegalName: '',
    routineId: 'routine-1',
    routineVersionId: 'routine-version-1',
    sourceAssignmentId: 'assignment-1',
    routineShotname: 'DOC',
    routineName: 'Documentos',
    routineVersionNumber: 1,
    routineDescription: '',
    title: 'Conferir documentos',
    description: '',
    observation: '',
    links: [],
    dueDate: '2026-10-31',
    status: 'pending',
    assignee: null,
    sourceRevision: 1,
    version: 9,
    materializationReason: 'attachment',
    materializedAt: '2026-10-19T12:00:00Z',
    archivedAt: null,
    createdAt: '2026-10-19T12:00:00Z',
    updatedAt: '2026-10-19T12:01:00Z',
    isOverdue: false,
    ...overrides,
  }
}
function response<T>(data: T): ApiResponse<T> {
  return {
    data,
    status: 200,
    etag: '"1"',
    requestId: null,
    headers: new Headers(),
  }
}
function deferred<T = void>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}
function operationalResponse(period: string): RoutineControlResponse {
  return {
    data: {
      departments: [],
      clients: [],
      routines: [],
      employees: [],
      screens: [],
      spreadsheetProjections: [],
      tasks: [{ ...task, period, indicators: { attachments: 0 } }],
    },
    meta: { period, generatedAt: '' },
  }
}
let root: Root
let host: HTMLDivElement
let client: QueryClient
let uploads: FileUploadsContextValue
let mounted: boolean
let screenUnmounted: ReturnType<typeof vi.fn<() => void>>

function Probe() {
  const context = useFileUploads()
  useEffect(() => {
    uploads = context
  }, [context])
  return (
    <button type="button" onClick={context.openPanel}>
      Acompanhar envios
    </button>
  )
}
function Screen({ period }: { period: string }) {
  useEffect(
    () => () => {
      screenUnmounted()
    },
    [],
  )
  return <p>Tela da competência {period}</p>
}
function UploadShortcut() {
  const context = useFileUploads()
  return (
    <button type="button" onClick={context.openPanel}>
      Ver envios da tarefa
    </button>
  )
}
function renderTree(
  period = '2026-10',
  currentScope: OrganizationQueryScope = scope,
  dialogClose?: () => void,
) {
  return (
    <StrictMode>
      <QueryClientProvider client={client}>
        <NotificationsProvider>
          <FileUploadsProvider
            key={`${currentScope.organizationId}:${currentScope.membershipId}`}
            scope={currentScope}
            paceMs={0}
          >
            <Probe />
            <Screen key={period} period={period} />
            {dialogClose && (
              <TaskDetailsDialog
                task={task}
                onClose={dialogClose}
                attachmentsPanel={<UploadShortcut />}
              />
            )}
          </FileUploadsProvider>
        </NotificationsProvider>
      </QueryClientProvider>
    </StrictMode>
  )
}
async function settle() {
  await act(async () => {
    for (let index = 0; index < 60; index++) await Promise.resolve()
  })
}
async function start() {
  await act(async () =>
    uploads.enqueue(
      [new File(['content'], 'comprovante.pdf', { type: 'application/pdf' })],
      destination,
      'Empresa · Outubro',
    ),
  )
  await settle()
}
function attachmentCount(period = '2026-10') {
  return client.getQueryData<RoutineControlResponse>(
    queryKeys.routineControl(scope, period),
  )!.data.tasks[0]!.indicators.attachments
}
beforeEach(() => {
  host = document.createElement('div')
  host.id = 'root'
  document.body.append(host)
  root = createRoot(host)
  mounted = true
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  })
  screenUnmounted = vi.fn()
  client.setQueryData(
    queryKeys.routineControl(scope, '2026-10'),
    operationalResponse('2026-10'),
  )
  client.setQueryData(
    queryKeys.routineControl(scope, '2026-11'),
    operationalResponse('2026-11'),
  )
  vi.spyOn(fileService, 'createIntent').mockResolvedValue(response(intent))
  vi.spyOn(fileService, 'upload').mockResolvedValue()
  vi.spyOn(fileService, 'confirm').mockResolvedValue(response(file))
  vi.spyOn(fileService, 'waitUntilAvailable').mockResolvedValue(file)
  // An old idempotency receipt must not override the collection's fresh count.
  vi.spyOn(fileService, 'link').mockResolvedValue(
    response({
      fileId: file.fileId,
      attachmentId: attachment.attachmentId,
      attachmentCount: 0,
    }),
  )
  vi.spyOn(fileService, 'listAttachments').mockResolvedValue([attachment])
  vi.spyOn(fileService, 'cancel').mockResolvedValue(response(undefined))
  vi.spyOn(taskService, 'getOccurrence').mockResolvedValue({
    ...response(occurrence()),
    etag: '"9"',
  })
  vi.spyOn(taskService, 'get').mockResolvedValue(response({} as TaskResource))
})
afterEach(async () => {
  if (mounted) await act(async () => root.unmount())
  client.clear()
  host.remove()
  document.body.innerHTML = ''
  document.body.style.overflow = ''
  vi.restoreAllMocks()
})

describe('FileUploadsProvider', () => {
  it('materialização atualiza tarefa e ETag fresco antes de terminar os outros arquivos do lote', async () => {
    const virtual = operationalResponse('2026-10')
    virtual.data.tasks[0] = {
      ...virtual.data.tasks[0]!,
      taskId: null,
      persistence: 'virtual',
      etag: '"virtual-old"',
    }
    client.setQueryData(queryKeys.routineControl(scope, '2026-10'), virtual)
    const invalidate = vi.spyOn(client, 'invalidateQueries')
    const verification = deferred<PrivateFile>()
    vi.mocked(fileService.createIntent)
      .mockResolvedValueOnce(response(intent))
      .mockResolvedValueOnce(
        response({ ...intent, intentId: 'intent-2', fileId: 'file-2' }),
      )
    vi.mocked(fileService.waitUntilAvailable).mockImplementation((fileId) =>
      fileId === 'file-2' ? verification.promise : Promise.resolve(file),
    )
    vi.mocked(fileService.link).mockResolvedValue(
      response({
        fileId: 'file-1',
        attachmentId: 'attachment-1',
        taskId: 'old-replay-task',
        version: 1,
        etag: '"1"',
        attachmentCount: 0,
      }),
    )
    vi.mocked(taskService.getOccurrence).mockResolvedValue({
      ...response(
        occurrence({ taskId: 'new-materialized-task', etag: '"metadata-9"' }),
      ),
      etag: '"header-10"',
    })
    await act(async () => root.render(renderTree()))
    await act(async () =>
      uploads.enqueue(
        [
          new File(['first'], 'primeiro.pdf', { type: 'application/pdf' }),
          new File(['second'], 'segundo.pdf', { type: 'application/pdf' }),
        ],
        destination,
        'Empresa · Outubro',
      ),
    )
    await settle()
    expect(uploads.jobs.map((job) => job.state)).toEqual([
      'completed',
      'verifying',
    ])
    expect(
      client.getQueryData<RoutineControlResponse>(
        queryKeys.routineControl(scope, '2026-10'),
      )!.data.tasks[0],
    ).toMatchObject({
      occurrenceKey: 'occurrence-1',
      taskId: 'new-materialized-task',
      persistence: 'materialized',
      competenceId: 'competence-1',
      etag: '"header-10"',
      indicators: { attachments: 1 },
    })
    expect(taskService.getOccurrence).toHaveBeenCalledExactlyOnceWith(
      '2026-10',
      'occurrence-1',
      expect.any(AbortSignal),
    )
    expect(invalidate).not.toHaveBeenCalledWith({
      queryKey: queryKeys.routineControlRoot(scope),
    })
    expect(document.body.textContent).not.toContain('anexo adicionado')
  })

  it('tarefa avulsa recebe metadados e contagem do detalhe mais recente, sem aplicar recibo antigo', async () => {
    const adHocTarget: FileTarget = {
      purpose: 'task_attachment',
      target: { competenceId: 'competence-1', taskId: 'ad-hoc-1' },
    }
    const current = operationalResponse('2026-10')
    current.data.tasks = [
      {
        ...task,
        id: 'ad-hoc-1',
        occurrenceKey: undefined,
        taskId: 'ad-hoc-1',
        kind: 'ad_hoc',
        etag: '"old"',
      },
    ]
    client.setQueryData(queryKeys.routineControl(scope, '2026-10'), current)
    const fresh: TaskResource = {
      attachmentCount: 3,
      id: 'ad-hoc-1',
      occurrenceKey: null,
      competenceId: 'competence-1',
      competence: '2026-10',
      kind: 'ad_hoc',
      status: 'in_progress',
      title: 'Nome atualizado',
      description: '',
      observation: '',
      departmentId: 'department-1',
      departmentName: 'Fiscal',
      clientCompanyId: null,
      routineId: null,
      dueDate: '2026-10-31',
      assignee: null,
      links: [],
      version: 12,
      archivedAt: null,
      createdAt: '',
      updatedAt: '2026-10-19T12:05:00Z',
    }
    vi.mocked(taskService.get).mockResolvedValue({
      ...response(fresh),
      etag: '"12"',
    })
    await act(async () => root.render(renderTree()))
    await act(async () =>
      uploads.enqueue(
        [new File(['content'], 'comprovante.pdf', { type: 'application/pdf' })],
        adHocTarget,
        'Tarefa avulsa',
      ),
    )
    await settle()
    expect(taskService.get).toHaveBeenCalledExactlyOnceWith(
      'competence-1',
      'ad-hoc-1',
      expect.any(AbortSignal),
    )
    expect(taskService.getOccurrence).not.toHaveBeenCalled()
    expect(
      client.getQueryData<RoutineControlResponse>(
        queryKeys.routineControl(scope, '2026-10'),
      )!.data.tasks[0],
    ).toMatchObject({
      taskId: 'ad-hoc-1',
      title: 'Nome atualizado',
      status: 'in_progress',
      etag: '"12"',
      indicators: { attachments: 3 },
    })
  })

  it('não inicia consulta de detalhe se a coleção retorna após sair do contexto', async () => {
    const collection = deferred<AttachmentResource[]>()
    vi.mocked(fileService.listAttachments).mockReturnValue(collection.promise)
    await act(async () => root.render(renderTree()))
    await start()
    expect(fileService.listAttachments).toHaveBeenCalledOnce()
    await act(async () => root.unmount())
    mounted = false
    await act(async () => collection.resolve([attachment]))
    await settle()
    expect(taskService.getOccurrence).not.toHaveBeenCalled()
    expect(taskService.get).not.toHaveBeenCalled()
    expect(attachmentCount()).toBe(0)
  })

  it('funciona em StrictMode e continua após desmontar a tela e trocar competência', async () => {
    const transfer = deferred()
    vi.mocked(fileService.upload).mockReturnValue(transfer.promise)
    await act(async () => root.render(renderTree()))
    await start()
    expect(uploads.jobs[0]!.state).toBe('uploading')
    const originalSignal = vi.mocked(fileService.upload).mock.calls[0]![2]!
    const originalId = uploads.jobs[0]!.id
    const unmountsBeforeNavigation = screenUnmounted.mock.calls.length
    await act(async () => root.render(renderTree('2026-11')))
    expect(screenUnmounted.mock.calls.length).toBeGreaterThan(
      unmountsBeforeNavigation,
    )
    expect(document.body.textContent).toContain('Tela da competência 2026-11')
    expect(uploads.jobs[0]!.id).toBe(originalId)
    expect(originalSignal.aborted).toBe(false)
    await act(async () => transfer.resolve())
    await settle()
    expect(uploads.jobs[0]!.state).toBe('completed')
    expect(fileService.createIntent).toHaveBeenCalledOnce()
    expect(fileService.link).toHaveBeenCalledWith(
      destination,
      'file-1',
      expect.any(String),
      expect.any(AbortSignal),
    )
    expect(fileService.cancel).not.toHaveBeenCalled()
    expect(attachmentCount('2026-10')).toBe(1)
    expect(attachmentCount('2026-11')).toBe(0)
    expect(document.body.textContent).toContain('1 anexo adicionado')
  })

  it('mantém a contagem durante envio/verificação e reconcilia apenas após o vínculo', async () => {
    const transfer = deferred()
    const verification = deferred<PrivateFile>()
    const link = deferred<Awaited<ReturnType<typeof fileService.link>>>()
    vi.mocked(fileService.upload).mockReturnValue(transfer.promise)
    vi.mocked(fileService.waitUntilAvailable).mockReturnValue(
      verification.promise,
    )
    vi.mocked(fileService.link).mockReturnValue(link.promise)
    await act(async () => root.render(renderTree()))
    await start()
    expect(attachmentCount()).toBe(0)
    expect(fileService.listAttachments).not.toHaveBeenCalled()
    await act(async () => transfer.resolve())
    await settle()
    expect(uploads.jobs[0]!.state).toBe('verifying')
    expect(attachmentCount()).toBe(0)
    await act(async () => verification.resolve(file))
    await settle()
    expect(uploads.jobs[0]!.state).toBe('linking')
    expect(attachmentCount()).toBe(0)
    await act(async () =>
      link.resolve(
        response({
          fileId: file.fileId,
          attachmentId: attachment.attachmentId,
          attachmentCount: 99,
        }),
      ),
    )
    await settle()
    expect(uploads.jobs[0]!.state).toBe('completed')
    expect(attachmentCount()).toBe(1)
    expect(
      client.getQueryData(
        queryKeys.taskAttachments(scope, fileOwnerPath(destination)),
      ),
    ).toEqual([attachment])
    expect(fileService.listAttachments).toHaveBeenCalledWith(
      destination,
      expect.any(AbortSignal),
    )
  })

  it('Escape recolhe somente os envios sobre os detalhes e devolve foco ao atalho', async () => {
    const closeTask = vi.fn()
    await act(async () => root.render(renderTree('2026-10', scope, closeTask)))
    const taskDialog = document.querySelector<HTMLElement>('[role="dialog"]')!
    const shortcut = [...taskDialog.querySelectorAll('button')].find(
      (button) => button.textContent === 'Ver envios da tarefa',
    )!
    shortcut.focus()
    await act(async () => shortcut.click())
    expect(document.querySelectorAll('[role="dialog"]')).toHaveLength(2)
    expect(taskDialog.inert).toBe(true)
    expect(document.activeElement?.getAttribute('aria-label')).toBe(
      'Recolher painel de envios',
    )
    await act(async () =>
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      ),
    )
    expect(document.querySelector('[data-overlay-dialog="uploads"]')).toBeNull()
    expect(document.querySelectorAll('[role="dialog"]')).toHaveLength(1)
    expect(closeTask).not.toHaveBeenCalled()
    expect(taskDialog.inert).toBe(false)
    expect(host.inert).toBe(true)
    expect(document.activeElement).toBe(shortcut)
    await act(async () =>
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      ),
    )
    expect(closeTask).toHaveBeenCalledOnce()
  })

  it('trocar membership interrompe o contexto anterior sem limpar pela API da nova sessão', async () => {
    const transfer = deferred()
    vi.mocked(fileService.upload).mockReturnValue(transfer.promise)
    await act(async () => root.render(renderTree()))
    await start()
    const oldSignal = vi.mocked(fileService.upload).mock.calls[0]![2]!
    await act(async () =>
      root.render(
        renderTree('2026-10', {
          organizationId: 'other-organization',
          membershipId: 'other-member',
        }),
      ),
    )
    expect(oldSignal.aborted).toBe(true)
    expect(uploads.jobs).toEqual([])
    await act(async () => transfer.resolve())
    await settle()
    expect(fileService.cancel).not.toHaveBeenCalled()
    expect(fileService.confirm).not.toHaveBeenCalled()
    expect(fileService.link).not.toHaveBeenCalled()
    expect(fileService.listAttachments).not.toHaveBeenCalled()
    expect(attachmentCount()).toBe(0)
    expect(document.body.textContent).not.toContain('anexo adicionado')
  })

  it('desmontar a aplicação aborta requests e ignora resposta tardia sem mutações novas', async () => {
    const creation = deferred<ApiResponse<UploadIntent>>()
    vi.mocked(fileService.createIntent).mockReturnValue(creation.promise)
    await act(async () => root.render(renderTree()))
    await start()
    const signal = vi.mocked(fileService.createIntent).mock.calls[0]![3]!
    await act(async () => root.unmount())
    mounted = false
    expect(signal.aborted).toBe(true)
    await act(async () => creation.resolve(response(intent)))
    await settle()
    expect(fileService.upload).not.toHaveBeenCalled()
    expect(fileService.cancel).not.toHaveBeenCalled()
    expect(fileService.confirm).not.toHaveBeenCalled()
    expect(fileService.link).not.toHaveBeenCalled()
    expect(fileService.listAttachments).not.toHaveBeenCalled()
  })
})
