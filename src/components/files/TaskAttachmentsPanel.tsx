import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { isApiError } from '../../services/httpClient'
import { useTaskAttachments } from '../../hooks/useFileQueries'
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
import IconButton from '../ui/IconButton'
import FileIcon from './FileIcon'
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
  const key = queryKeys.taskAttachments(scope, path)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [operation, setOperation] = useState<{
    attachmentId: string
    remove: boolean
  } | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const active = useRef<AbortController | null>(null)
  useEffect(() => () => active.current?.abort(), [])
  const query = useTaskAttachments(scope, destination)
  async function refresh() {
    await Promise.all([
      client.invalidateQueries({ queryKey: key }),
      client.invalidateQueries({
        queryKey: queryKeys.routineControlRoot(scope),
      }),
    ])
  }
  async function operate(attachment: AttachmentResource, remove: boolean) {
    if (busy || isUploading) return
    const controller = new AbortController()
    active.current = controller
    setBusy(true)
    setOperation({ attachmentId: attachment.attachmentId, remove })
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
      if (!controller.signal.aborted) {
        setBusy(false)
        setOperation(null)
      }
    }
  }
  const canAdd = canAddTaskAttachment(user, task, competenceStatus)
  if (isApiError(query.error) && query.error.status === 501) return null
  if (query.data?.length === 0 && !canAdd && !query.error) return null
  return (
    <section aria-label="Anexos da tarefa" className="space-y-3 p-3">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-h-8 items-center gap-2 text-[var(--color-text-muted)]">
          <FileIcon name="attachment" />
          <h3
            className="text-sm font-bold text-[var(--color-text-strong)]"
            aria-label={
              query.data?.length ? `Anexos (${query.data.length})` : 'Anexos'
            }
          >
            Anexos
          </h3>
          {Boolean(query.data?.length) && (
            <span
              aria-hidden="true"
              className="rounded-full bg-[var(--color-panel-soft-bg)] px-2 py-0.5 text-[10px] font-bold text-[var(--color-text-muted)] ring-1 ring-[var(--color-panel-border)]"
            >
              {query.data?.length}
            </span>
          )}
        </div>
        {canAdd && query.isSuccess && (
          <FileUploadControl
            destination={destination}
            label="Anexar arquivo"
            disabled={busy}
            onChanged={refresh}
            onBusyChange={setIsUploading}
          />
        )}
      </header>
      {query.isPending && (
        <div
          role="status"
          aria-label="Carregando anexos"
          className="h-8 animate-pulse rounded-[var(--radius-control)] bg-[var(--color-panel-soft-bg)]"
        />
      )}
      {query.error && (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-muted)]"
        >
          <p>Não foi possível carregar os anexos.</p>
          <Button
            size="sm"
            tone="neutral"
            className="gap-1.5"
            onClick={() => void query.refetch()}
          >
            <FileIcon name="retry" />
            Tentar novamente
          </Button>
        </div>
      )}
      {Boolean(query.data?.length) && (
        <ul className="divide-y divide-[var(--color-divider)] rounded-[var(--radius-control)] border border-[var(--color-panel-border)]">
          {query.data?.map((attachment) => (
            <li
              key={attachment.attachmentId}
              className="flex min-w-0 items-center gap-3 px-3 py-2.5"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-[var(--radius-control)] bg-[var(--color-panel-soft-bg)] text-[var(--color-text-muted)]">
                <FileIcon
                  name={
                    attachment.file.contentType?.startsWith('image/')
                      ? 'image'
                      : 'attachment'
                  }
                />
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className="block truncate text-sm font-semibold text-[var(--color-text-strong)]"
                  title={attachment.file.originalName}
                >
                  {attachment.file.originalName}
                </span>
                <span
                  role={
                    operation?.attachmentId === attachment.attachmentId
                      ? 'status'
                      : undefined
                  }
                  className="block text-xs text-[var(--color-text-muted)]"
                >
                  {operation?.attachmentId === attachment.attachmentId
                    ? operation.remove
                      ? 'Removendo…'
                      : 'Preparando download…'
                    : formatFileSize(attachment.file.sizeBytes)}
                </span>
              </span>
              <div className="flex shrink-0 items-center gap-1">
                <IconButton
                  tone="neutral"
                  disabled={
                    busy || isUploading || attachment.file.state !== 'available'
                  }
                  onClick={() => void operate(attachment, false)}
                  label={`Baixar ${attachment.file.originalName}`}
                >
                  <FileIcon
                    name={
                      operation?.attachmentId === attachment.attachmentId &&
                      !operation.remove
                        ? 'progress'
                        : 'download'
                    }
                    className={`size-4 ${operation?.attachmentId === attachment.attachmentId && !operation.remove ? 'animate-spin motion-reduce:animate-none' : ''}`}
                  />
                </IconButton>
                {canRemoveTaskAttachment(
                  user,
                  task,
                  attachment.createdByMemberId,
                  competenceStatus,
                ) && (
                  <IconButton
                    tone="ghost"
                    disabled={busy || isUploading}
                    onClick={() => void operate(attachment, true)}
                    label={`Remover ${attachment.file.originalName}`}
                    className="hover:bg-[var(--status-error-bg)] hover:text-[var(--status-error-text)]"
                  >
                    <FileIcon
                      name={
                        operation?.attachmentId === attachment.attachmentId &&
                        operation.remove
                          ? 'progress'
                          : 'remove'
                      }
                      className={`size-4 ${operation?.attachmentId === attachment.attachmentId && operation.remove ? 'animate-spin motion-reduce:animate-none' : ''}`}
                    />
                  </IconButton>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {error && (
        <p
          role="alert"
          className="rounded-[var(--radius-control)] border border-[var(--status-error-border)] bg-[var(--status-error-bg)] px-3 py-2 text-xs font-semibold text-[var(--status-error-text)]"
        >
          {error}
        </p>
      )}
    </section>
  )
}

function formatFileSize(bytes: number): string {
  return bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(1)} KiB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MiB`
}
