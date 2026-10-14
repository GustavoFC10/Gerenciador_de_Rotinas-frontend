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
import { httpClient } from '../../services/httpClient'
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
) {
  const client = new QueryClient()
  client.setQueryData(
    [
      ...queryKeys.scope(scope),
      'attachments',
      fileOwnerPath(taskFileTarget(task)),
    ],
    attachments,
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
function renderImage(currentUser: AppUser, memberId: string) {
  const client = new QueryClient()
  client.setQueryData(
    [
      ...queryKeys.scope(scope),
      'image-slot',
      `/api/v1/organization-members/${memberId}/avatar/`,
    ],
    { version: 1, file: { fileId: 'image-1', variants: [{ kind: '64' }] } },
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
    expect(admin).toContain('Remover imagem')
    expect(admin).not.toContain('type="file"')
    const own = renderImage(user, 'member-1')
    expect(own).toContain('type="file"')
    expect(own).toContain('Remover imagem')
    const other = renderImage(user, 'member-2')
    expect(other).not.toContain('Remover imagem')
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
      expect(host.textContent).toContain('Anexos (2)')
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
})
