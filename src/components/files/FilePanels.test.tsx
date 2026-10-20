/** @vitest-environment happy-dom */
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ImageEditor from './ImageEditor'
import TaskAttachmentsPanel from './TaskAttachmentsPanel'
import {
  AuthContext,
  type AuthContextValue,
} from '../../contexts/authContextDefinition'
import { queryKeys } from '../../query/queryKeys'
import { fileOwnerPath, taskFileTarget } from '../../services/fileService'
import { ApiError, httpClient } from '../../services/httpClient'
import type { AppUser, Task } from '../../types/domain'
import type { AttachmentResource } from '../../types/files'
import type { UploadJob } from '../../types/fileUploads'

const uploads = vi.hoisted(() => ({
  jobs: [] as UploadJob[],
  isAvailable: true,
  enqueue: vi.fn(),
  openPanel: vi.fn(),
  dismiss: vi.fn(),
}))
const notifications = vi.hoisted(() => ({ notify: vi.fn() }))
vi.mock('../../hooks/useFileUploads', () => ({ useFileUploads: () => uploads }))
vi.mock('../../hooks/useNotifications', () => ({
  useNotifications: () => notifications,
}))
afterEach(() => {
  uploads.jobs = []
  vi.clearAllMocks()
})

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
const scope = { organizationId: 'org-1', membershipId: 'member-1' }
const user: AppUser = {
  id: 'user-1',
  membershipId: 'member-1',
  name: 'Pessoa',
  email: 'person@example.com',
  role: 'member',
  departmentAccesses: [{ departmentId: 'dept-1', role: 'contributor' }],
  avatarUrl: '',
}
const task: Task = {
  id: 'occ-1',
  occurrenceKey: 'occ-1',
  taskId: 'task-1',
  persistence: 'materialized',
  kind: 'scheduled',
  clientId: null,
  routineId: null,
  departmentId: 'dept-1',
  assigneeId: 'member-1',
  status: 'pending',
  period: '2026-10',
  dueDate: '2026-10-15',
  completedAt: null,
  indicators: { attachments: 0 },
}
const attachments = ['member-1', 'member-2'].map(
  (createdByMemberId, index) => ({
    attachmentId: `attachment-${index}`,
    createdByMemberId,
    createdAt: '',
    file: {
      fileId: `file-${index}`,
      state: 'available',
      originalName: `arquivo-${index}.pdf`,
      sizeBytes: 1024,
    },
  }),
) as AttachmentResource[]
function renderTask(
  currentUser: AppUser,
  competenceStatus: 'projected' | 'finalized' = 'projected',
  items: AttachmentResource[] = attachments,
  currentTask: Task = task,
) {
  const client = new QueryClient()
  client.setQueryData(
    [
      ...queryKeys.scope(scope),
      'attachments',
      fileOwnerPath(taskFileTarget(currentTask)),
    ],
    items,
  )
  const markup = renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <TaskAttachmentsPanel
        task={currentTask}
        scope={scope}
        user={currentUser}
        competenceStatus={competenceStatus}
      />
    </QueryClientProvider>,
  )
  client.clear()
  return markup
}
function renderImage(currentUser: AppUser, memberId: string, hasImage = true) {
  const client = new QueryClient()
  client.setQueryData(
    [
      ...queryKeys.scope(scope),
      'image-slot',
      `/api/v1/organization-members/${memberId}/avatar/`,
    ],
    {
      version: 1,
      file: hasImage ? { fileId: 'image-1', variants: [{ kind: '64' }] } : null,
    },
  )
  const auth = {
    user: currentUser,
    activeMembership: { id: 'member-1', organization: { id: 'org-1' } },
  } as AuthContextValue
  const markup = renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <AuthContext.Provider value={auth}>
        <ImageEditor
          destination={{ purpose: 'member_avatar', target: { memberId } }}
          label="Pessoa"
        />
      </AuthContext.Provider>
    </QueryClientProvider>,
  )
  client.clear()
  return markup
}
describe('painéis de arquivos', () => {
  it('sem foto mostra apenas a ação de adicionar, sem avatar duplicado ou formulário visível', () => {
    const host = document.createElement('div')
    host.innerHTML = renderImage(user, 'member-1', false)
    expect(host.textContent).toBe('Adicionar foto')
    expect(host.querySelector('input')?.hidden).toBe(true)
    expect(host.querySelector('[role="img"]')).toBeNull()
    expect(host.querySelector('img')).toBeNull()
    expect(renderImage(user, 'member-2', false)).toBe('')
  })

  it('tarefa vazia mostra apenas o cabeçalho compacto e a ação permitida', () => {
    const host = document.createElement('div')
    host.innerHTML = renderTask(user, 'projected', [])
    expect(host.textContent).toContain('Anexar arquivo')
    expect(host.textContent).not.toContain('Nenhum arquivo')
    expect(host.textContent).not.toContain('MiB')
    expect(host.textContent).not.toContain('(0)')
    expect(host.querySelector('input')?.hidden).toBe(true)
    expect(host.querySelector('ul')).toBeNull()
    expect(
      renderTask(
        {
          ...user,
          departmentAccesses: [{ departmentId: 'dept-1', role: 'viewer' }],
        },
        'projected',
        [],
      ),
    ).toBe('')
  })

  it('consulta uma ocorrência virtual sem fabricar anexos e permite seleção apenas a quem pode materializá-la', () => {
    const virtual: Task = {
      ...task,
      persistence: 'virtual',
      taskId: null,
      competenceId: null,
      indicators: { attachments: 0 },
    }
    const host = document.createElement('div')
    host.innerHTML = renderTask(
      { ...user, role: 'admin' },
      'projected',
      [],
      virtual,
    )
    expect(
      host.querySelector('input[type="file"]')?.hasAttribute('multiple'),
    ).toBe(true)
    expect(host.querySelector('ul')).toBeNull()
    expect(renderTask(user, 'projected', [], virtual)).toBe('')
  })

  it.each(['avatar', 'department', 'attachments'] as const)(
    'não renderiza editor nem mensagens automáticas quando %s retorna 501',
    async (kind) => {
      const get = vi.spyOn(httpClient, 'get').mockRejectedValue(
        new ApiError({
          problem: { type: 'about:blank', title: 'Disabled', status: 501 },
          requestId: null,
          response: new Response(null, { status: 501 }),
        }),
      )
      const client = new QueryClient()
      const host = document.createElement('div')
      const root = createRoot(host)
      const auth = {
        user: { ...user, role: 'admin' },
        activeMembership: { id: 'member-1', organization: { id: 'org-1' } },
      } as AuthContextValue
      try {
        await act(async () =>
          root.render(
            <QueryClientProvider client={client}>
              <AuthContext.Provider value={auth}>
                {kind === 'attachments' ? (
                  <TaskAttachmentsPanel
                    task={task}
                    scope={scope}
                    user={user}
                    competenceStatus="projected"
                  />
                ) : (
                  <ImageEditor
                    destination={
                      kind === 'avatar'
                        ? {
                            purpose: 'member_avatar',
                            target: { memberId: 'member-1' },
                          }
                        : {
                            purpose: 'department_image',
                            target: { departmentId: 'dept-1' },
                          }
                    }
                    label="Pessoa"
                  />
                )}
              </AuthContext.Provider>
            </QueryClientProvider>,
          ),
        )
        await act(async () => {
          await new Promise((resolve) => setTimeout(resolve, 25))
        })
        expect(get).toHaveBeenCalledOnce()
        expect(host.innerHTML).toBe('')
        expect(host.querySelector('input')).toBeNull()
      } finally {
        await act(async () => root.unmount())
        client.clear()
        vi.restoreAllMocks()
      }
    },
  )

  it('mostra falhas de leitura compactas e libera a ação após uma nova consulta bem-sucedida', async () => {
    const get = vi
      .spyOn(httpClient, 'get')
      .mockRejectedValueOnce(new Error('network failed'))
      .mockResolvedValue({
        data: { version: 1, file: null },
        status: 200,
        etag: '"1"',
        requestId: null,
        headers: new Headers(),
      })
    const client = new QueryClient()
    const host = document.createElement('div')
    const root = createRoot(host)
    const auth = {
      user,
      activeMembership: { id: 'member-1', organization: { id: 'org-1' } },
    } as AuthContextValue
    try {
      await act(async () =>
        root.render(
          <QueryClientProvider client={client}>
            <AuthContext.Provider value={auth}>
              <ImageEditor
                destination={{
                  purpose: 'member_avatar',
                  target: { memberId: 'member-1' },
                }}
                label="Pessoa"
              />
            </AuthContext.Provider>
          </QueryClientProvider>,
        ),
      )
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 25))
      })
      expect(host.textContent).toBe('Tentar novamente')
      expect(host.querySelector('button')?.title).toBe('Foto indisponível')
      expect(host.querySelector('[role="alert"]')).toBeNull()
      expect(host.textContent).not.toContain('network failed')
      expect(host.querySelector('input')).toBeNull()
      await act(async () => host.querySelector('button')!.click())
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 25))
      })
      expect(get).toHaveBeenCalledTimes(2)
      expect(host.textContent).toBe('Adicionar foto')
      expect(host.querySelector('input')?.hidden).toBe(true)
    } finally {
      await act(async () => root.unmount())
      client.clear()
      vi.restoreAllMocks()
    }
  })

  it('exibe anexos reais, download e remoção somente dos próprios para contributor', () => {
    const markup = renderTask(user)
    expect(markup).toContain('Anexos (2)')
    expect(markup).toContain('Baixar arquivo-0.pdf')
    expect(markup).toContain('Remover arquivo-0.pdf')
    expect(markup).not.toContain('Remover arquivo-1.pdf')
    expect(markup).toContain('type="file"')
    expect(markup).not.toContain('Documento da execução')
    expect(markup).toContain('data-attachment-layout="single-row"')
    expect(markup.match(/data-attachment-kind="document"/g)).toHaveLength(2)
    expect(markup).toContain('Documento: arquivo-0.pdf')
    expect(markup).toContain('multiple=""')
  })

  it('mostra progresso por arquivo sem contar uploads pendentes como anexos', () => {
    uploads.jobs = [
      {
        id: 'sending',
        batchId: 'batch',
        destination: taskFileTarget(task),
        label: 'Tarefa',
        fileName: 'enviando.pdf',
        sizeBytes: 1000,
        state: 'uploading',
        progress: 68,
      },
      {
        id: 'checking',
        batchId: 'batch',
        destination: taskFileTarget(task),
        label: 'Tarefa',
        fileName: 'verificando.pdf',
        sizeBytes: 1000,
        state: 'verifying',
        progress: null,
      },
      {
        id: 'failed',
        batchId: 'batch',
        destination: taskFileTarget(task),
        label: 'Tarefa',
        fileName: 'falha.pdf',
        sizeBytes: 1000,
        state: 'error',
        progress: null,
        error: 'Conexão interrompida',
      },
    ]
    const host = document.createElement('div')
    host.innerHTML = renderTask(user)
    expect(host.querySelector('h3')?.getAttribute('aria-label')).toBe(
      'Anexos (2)',
    )
    expect(host.querySelectorAll('li')).toHaveLength(5)
    expect(
      host
        .querySelector('[aria-label="Envio de enviando.pdf"]')
        ?.getAttribute('aria-valuenow'),
    ).toBe('68')
    expect(
      host
        .querySelector('[aria-label="Envio de verificando.pdf"]')
        ?.hasAttribute('aria-valuenow'),
    ).toBe(false)
    expect(host.textContent).toContain('Enviando · 68%')
    expect(host.textContent).toContain('Verificando')
    expect(host.textContent).toContain('Falha no envio')
    expect(host.textContent).not.toContain('Conexão interrompida')
  })

  it('mantém o arquivo concluído enquanto a coleção ainda carrega e elimina a duplicação após a leitura', () => {
    uploads.jobs = [
      {
        id: 'done',
        batchId: 'batch',
        destination: taskFileTarget(task),
        label: 'Tarefa',
        fileName: attachments[0].file.originalName,
        sizeBytes: 1000,
        state: 'completed',
        progress: 100,
        attachment: attachments[0],
      },
    ]
    const host = document.createElement('div')
    host.innerHTML = renderTask(user, 'projected', [])
    expect(host.querySelectorAll('li')).toHaveLength(1)
    expect(host.textContent).toContain(attachments[0].file.originalName)
    host.innerHTML = renderTask(user)
    expect(host.querySelectorAll('li')).toHaveLength(2)
    uploads.jobs[0].reconciled = true
    host.innerHTML = renderTask(user, 'projected', [])
    expect(host.querySelectorAll('li')).toHaveLength(0)
  })

  it('envia a seleção múltipla à fila com o destino original e abre detalhes da falha', async () => {
    uploads.jobs = [
      {
        id: 'failed',
        batchId: 'batch',
        destination: taskFileTarget(task),
        label: 'Tarefa',
        fileName: 'falha.pdf',
        sizeBytes: 1000,
        state: 'error',
        progress: null,
        error: 'Conexão interrompida',
      },
    ]
    const client = new QueryClient({
      defaultOptions: { queries: { staleTime: Infinity } },
    })
    client.setQueryData(
      queryKeys.taskAttachments(scope, fileOwnerPath(taskFileTarget(task))),
      [],
    )
    const host = document.createElement('div')
    const root = createRoot(host)
    const files = [new File(['a'], 'a.pdf'), new File(['b'], 'b.csv')]
    try {
      await act(async () =>
        root.render(
          <QueryClientProvider client={client}>
            <TaskAttachmentsPanel
              task={task}
              scope={scope}
              user={user}
              competenceStatus="projected"
            />
          </QueryClientProvider>,
        ),
      )
      const input = host.querySelector<HTMLInputElement>('input[type="file"]')!
      Object.defineProperty(input, 'files', {
        configurable: true,
        value: files,
      })
      await act(async () =>
        input.dispatchEvent(new Event('change', { bubbles: true })),
      )
      expect(uploads.enqueue).toHaveBeenCalledWith(
        files,
        taskFileTarget(task),
        'Anexos da tarefa',
      )
      expect(input.value).toBe('')
      await act(async () =>
        host
          .querySelector<HTMLButtonElement>(
            '[aria-label="Falha no envio: falha.pdf. Abrir envios"]',
          )!
          .click(),
      )
      expect(uploads.openPanel).toHaveBeenCalledOnce()
      expect(host.querySelector('[role="alert"]')).toBeNull()
    } finally {
      await act(async () => root.unmount())
      client.clear()
    }
  })

  it('remove um vínculo, atualiza contagem e descarta o fallback concluído sem avisos dentro do card', async () => {
    const { fileService } = await import('../../services/fileService')
    vi.spyOn(fileService, 'remove').mockResolvedValue({
      data: undefined,
      status: 204,
      etag: '"3"',
      requestId: null,
      headers: new Headers(),
    })
    vi.spyOn(fileService, 'listAttachments').mockResolvedValue([attachments[1]])
    uploads.jobs = [
      {
        id: 'done',
        batchId: 'batch',
        destination: taskFileTarget(task),
        label: 'Tarefa',
        fileName: attachments[0].file.originalName,
        sizeBytes: 1000,
        state: 'completed',
        progress: 100,
        attachment: attachments[0],
        reconciled: true,
      },
    ]
    const client = new QueryClient({
      defaultOptions: { queries: { staleTime: Infinity } },
    })
    client.setQueryData(
      queryKeys.taskAttachments(scope, fileOwnerPath(taskFileTarget(task))),
      attachments,
    )
    client.setQueryData(queryKeys.routineControl(scope, task.period), {
      data: {
        tasks: [{ ...task, indicators: { attachments: 2 } }],
        spreadsheetProjections: [],
        screens: [],
      },
    })
    const host = document.createElement('div')
    const root = createRoot(host)
    try {
      await act(async () =>
        root.render(
          <QueryClientProvider client={client}>
            <TaskAttachmentsPanel
              task={task}
              scope={scope}
              user={user}
              competenceStatus="projected"
            />
          </QueryClientProvider>,
        ),
      )
      await act(async () =>
        host
          .querySelector<HTMLButtonElement>(
            '[aria-label="Remover arquivo-0.pdf"]',
          )!
          .click(),
      )
      expect(host.querySelector('h3')?.getAttribute('aria-label')).toBe(
        'Anexos (1)',
      )
      expect(host.querySelector('[role="alert"]')).toBeNull()
      expect(uploads.dismiss).toHaveBeenCalledWith('done')
      expect(notifications.notify).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Anexo removido', tone: 'success' }),
      )
      expect(
        client.getQueryData<{ data: { tasks: Task[] } }>(
          queryKeys.routineControl(scope, task.period),
        )?.data.tasks[0].indicators.attachments,
      ).toBe(1)
    } finally {
      await act(async () => root.unmount())
      client.clear()
      vi.restoreAllMocks()
    }
  })

  it('preserva a coleção quando a remoção falha e registra o erro na notificação', async () => {
    const { fileService } = await import('../../services/fileService')
    vi.spyOn(fileService, 'remove').mockRejectedValue(
      new Error('Conexão interrompida'),
    )
    vi.spyOn(fileService, 'listAttachments').mockResolvedValue(attachments)
    const client = new QueryClient({
      defaultOptions: { queries: { staleTime: Infinity } },
    })
    client.setQueryData(
      queryKeys.taskAttachments(scope, fileOwnerPath(taskFileTarget(task))),
      attachments,
    )
    const host = document.createElement('div')
    const root = createRoot(host)
    try {
      await act(async () =>
        root.render(
          <QueryClientProvider client={client}>
            <TaskAttachmentsPanel
              task={task}
              scope={scope}
              user={user}
              competenceStatus="projected"
            />
          </QueryClientProvider>,
        ),
      )
      await act(async () =>
        host
          .querySelector<HTMLButtonElement>(
            '[aria-label="Remover arquivo-0.pdf"]',
          )!
          .click(),
      )
      expect(
        host.querySelectorAll('[data-attachment-kind="document"]'),
      ).toHaveLength(2)
      expect(host.querySelector('[role="alert"]')).toBeNull()
      expect(notifications.notify).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Não foi possível remover o anexo',
          tone: 'error',
        }),
      )
      expect(
        host.querySelector<HTMLButtonElement>(
          '[aria-label="Remover arquivo-0.pdf"]',
        )?.disabled,
      ).toBe(false)
    } finally {
      await act(async () => root.unmount())
      client.clear()
      vi.restoreAllMocks()
    }
  })
  it('permite leitura sem mutações para viewer e para competência finalizada', () => {
    for (const markup of [
      renderTask({
        ...user,
        departmentAccesses: [{ departmentId: 'dept-1', role: 'viewer' }],
      }),
      renderTask({ ...user, role: 'admin' }, 'finalized'),
    ]) {
      expect(markup).toContain('Baixar arquivo-0.pdf')
      expect(markup).not.toContain('Remover arquivo-')
      expect(markup).not.toContain('type="file"')
    }
  })
  it('admin remove foto de outro membro sem poder substituí-la; membro altera a própria', () => {
    const admin = renderImage({ ...user, role: 'admin' }, 'member-2')
    expect(admin).toContain('Remover foto')
    expect(admin).not.toContain('type="file"')
    const own = renderImage(user, 'member-1')
    expect(own).toContain('type="file"')
    expect(own).toContain('Remover foto')
    const other = renderImage(user, 'member-2')
    expect(other).not.toContain('Remover foto')
    expect(other).not.toContain('type="file"')
  })
  it('consulta todas as páginas da coleção antes de exibir os anexos', async () => {
    const get = vi
      .spyOn(httpClient, 'get')
      .mockResolvedValueOnce({
        data: {
          results: [attachments[0]],
          next: 'http://localhost:3000/api/v1/next/?page=2',
        },
        etag: '"1"',
        status: 200,
        requestId: null,
        headers: new Headers(),
      })
      .mockResolvedValueOnce({
        data: { results: [attachments[1]], next: null },
        etag: '"1"',
        status: 200,
        requestId: null,
        headers: new Headers(),
      })
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const host = document.createElement('div')
    const root = createRoot(host)
    try {
      await act(async () => {
        root.render(
          <QueryClientProvider client={client}>
            <TaskAttachmentsPanel
              task={task}
              scope={scope}
              user={user}
              competenceStatus="projected"
            />
          </QueryClientProvider>,
        )
        await new Promise((resolve) => setTimeout(resolve, 20))
      })
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 20))
      })
      expect(host.querySelector('h3')?.getAttribute('aria-label')).toBe(
        'Anexos (2)',
      )
      expect(host.textContent).toContain('arquivo-0.pdf')
      expect(host.textContent).toContain('arquivo-1.pdf')
      expect(get).toHaveBeenCalledTimes(2)
      expect(get.mock.calls[1]![0]).toContain('?page=2')
    } finally {
      await act(async () => root.unmount())
      client.clear()
      vi.restoreAllMocks()
    }
  })

  it('identifica a linha em download e impede ações concorrentes até concluir', async () => {
    const { fileService } = await import('../../services/fileService')
    let finishDownload:
      ((result: { url: string; expiresIn: number }) => void) | undefined
    vi.spyOn(fileService, 'download').mockImplementation(
      () =>
        new Promise((resolve) => {
          finishDownload = resolve
        }),
    )
    const anchorClick = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined)
    const client = new QueryClient({
      defaultOptions: { queries: { staleTime: Infinity } },
    })
    client.setQueryData(
      queryKeys.taskAttachments(scope, fileOwnerPath(taskFileTarget(task))),
      attachments,
    )
    const host = document.createElement('div')
    const root = createRoot(host)
    try {
      await act(async () =>
        root.render(
          <QueryClientProvider client={client}>
            <TaskAttachmentsPanel
              task={task}
              scope={scope}
              user={user}
              competenceStatus="projected"
            />
          </QueryClientProvider>,
        ),
      )
      await act(async () =>
        host
          .querySelector<HTMLButtonElement>(
            '[aria-label="Baixar arquivo-0.pdf"]',
          )!
          .click(),
      )
      expect(host.querySelector('[role="status"]')?.textContent).toBe(
        'Preparando download…',
      )
      expect(
        host.querySelector<HTMLButtonElement>(
          '[aria-label="Remover arquivo-0.pdf"]',
        )?.disabled,
      ).toBe(true)
      expect(
        host.querySelector<HTMLInputElement>('input[type="file"]')?.disabled,
      ).toBe(true)
      await act(async () =>
        finishDownload?.({
          url: 'https://storage.example.com/download',
          expiresIn: 60,
        }),
      )
      expect(anchorClick).toHaveBeenCalledOnce()
      expect(host.querySelector('[role="status"]')).toBeNull()
      expect(
        host.querySelector<HTMLButtonElement>(
          '[aria-label="Baixar arquivo-1.pdf"]',
        )?.disabled,
      ).toBe(false)
    } finally {
      await act(async () => root.unmount())
      client.clear()
      vi.restoreAllMocks()
    }
  })
})
