/** @vitest-environment happy-dom */
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
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
) {
  const client = new QueryClient()
  client.setQueryData(
    [
      ...queryKeys.scope(scope),
      'attachments',
      fileOwnerPath(taskFileTarget(task)),
    ],
    items,
  )
  const markup = renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <TaskAttachmentsPanel
        task={task}
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
      expect(host.textContent).toContain('Foto indisponível.')
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
