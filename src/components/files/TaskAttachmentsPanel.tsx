import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { httpClient, type ApiResponse } from '../../services/httpClient'
import {
  fileErrorMessage,
  fileOwnerPath,
  fileService,
  taskFileTarget,
} from '../../services/fileService'
import { queryKeys, type OrganizationQueryScope } from '../../query/queryKeys'
import type { AppUser, CompetenceStatus, Task } from '../../types/domain'
import type { AttachmentResource } from '../../types/files'
import {
  canAddTaskAttachment,
  canRemoveTaskAttachment,
} from '../../utils/permissions'
import Button from '../ui/Button'
import FileUploadControl from './FileUploadControl'

export default function TaskAttachmentsPanel({
  task,
  scope,
  user,
  competenceStatus,
}: {
  task: Task
  scope: OrganizationQueryScope
  user: AppUser
  competenceStatus?: CompetenceStatus
}) {
  const client = useQueryClient()
  const destination = taskFileTarget(task)
  const path = fileOwnerPath(destination)
  const key = [...queryKeys.scope(scope), 'attachments', path]
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const active = useRef<AbortController | null>(null)
  useEffect(() => () => active.current?.abort(), [])
  const query = useQuery({
    queryKey: key,
    queryFn: async ({ signal }) => {
      const results: AttachmentResource[] = []
      let next: string | null = `${path}attachments/`
      while (next) {
        const response: ApiResponse<{
          results: AttachmentResource[]
          next: string | null
        }> = await httpClient.get(next, { signal })
        results.push(...response.data.results)
        next = response.data.next
      }
      return results
    },
  })
  async function refresh() {
    await Promise.all([
      client.invalidateQueries({ queryKey: key }),
      client.invalidateQueries({
        queryKey: queryKeys.routineControlRoot(scope),
      }),
    ])
  }
  async function operate(attachment: AttachmentResource, remove: boolean) {
    if (busy) return
    const controller = new AbortController()
    active.current = controller
    setBusy(true)
    setError('')
    try {
      if (remove) {
        await fileService.remove(
          destination,
          attachment.attachmentId,
          controller.signal,
        )
        await refresh()
      } else {
        // Uma nova autorização a cada clique evita reutilizar URLs expiradas.
        const { url } = await fileService.download(
          attachment.file.fileId,
          undefined,
          controller.signal,
        )
        const anchor = document.createElement('a')
        anchor.href = url
        anchor.rel = 'noopener noreferrer'
        anchor.referrerPolicy = 'no-referrer'
        anchor.download = attachment.file.originalName
        document.body.append(anchor)
        anchor.click()
        anchor.remove()
      }
    } catch (caught) {
      if (!controller.signal.aborted) {
        setError(fileErrorMessage(caught))
        if (remove) await refresh().catch(() => undefined)
      }
    } finally {
      if (!controller.signal.aborted) setBusy(false)
    }
  }
  return (
    <section aria-label="Anexos da tarefa" className="space-y-3">
      <h3 className="text-sm font-bold">
        Anexos {query.data ? `(${query.data.length})` : ''}
      </h3>
      {query.isPending && <p role="status">Carregando anexos…</p>}
      {query.error && (
        <div role="alert">
          <p>{fileErrorMessage(query.error)}</p>
          <Button tone="neutral" onClick={() => void query.refetch()}>
            Tentar novamente
          </Button>
        </div>
      )}
      {query.data?.length === 0 && (
        <p className="text-sm text-[var(--color-text-muted)]">
          Nenhum arquivo nesta execução.
        </p>
      )}
      <ul className="space-y-2">
        {query.data?.map((attachment) => (
          <li
            key={attachment.attachmentId}
            className="flex flex-wrap items-center gap-2 rounded-[var(--radius-control)] border border-[var(--color-divider)] p-3"
          >
            <span className="min-w-0 flex-1 break-words text-sm">
              {attachment.file.originalName}
              <span className="block text-xs text-[var(--color-text-muted)]">
                {formatFileSize(attachment.file.sizeBytes)}
              </span>
            </span>
            <Button
              tone="neutral"
              disabled={busy || attachment.file.state !== 'available'}
              onClick={() => void operate(attachment, false)}
              aria-label={`Baixar ${attachment.file.originalName}`}
            >
              Baixar
            </Button>
            {canRemoveTaskAttachment(
              user,
              task,
              attachment.createdByMemberId,
              competenceStatus,
            ) && (
              <Button
                tone="neutral"
                disabled={busy}
                onClick={() => void operate(attachment, true)}
                aria-label={`Remover ${attachment.file.originalName}`}
              >
                Remover
              </Button>
            )}
          </li>
        ))}
      </ul>
      {error && (
        <p role="alert" className="text-sm text-[var(--status-error-text)]">
          {error}
        </p>
      )}
      {canAddTaskAttachment(user, task, competenceStatus) && (
        <FileUploadControl
          destination={destination}
          disabled={busy || query.isPending || Boolean(query.error)}
          onChanged={refresh}
        />
      )}
    </section>
  )
}

function formatFileSize(bytes: number): string {
  return bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(1)} KiB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MiB`
}
