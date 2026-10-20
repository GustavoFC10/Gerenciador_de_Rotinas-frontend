import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { isApiError } from '../../services/httpClient'
import { useTaskAttachments } from '../../hooks/useFileQueries'
import { useFileUploads } from '../../hooks/useFileUploads'
import { useNotifications } from '../../hooks/useNotifications'
import {
  fileErrorMessage,
  fileOwnerPath,
  fileService,
  taskFileTarget,
} from '../../services/fileService'
import { queryKeys, type OrganizationQueryScope } from '../../query/queryKeys'
import { updateTaskAttachmentCount } from '../../query/routineControlCache'
import type { AppUser, CompetenceStatus, Task } from '../../types/domain'
import type { AttachmentResource } from '../../types/files'
import type { UploadJob } from '../../types/fileUploads'
import {
  canAddTaskAttachment,
  canRemoveTaskAttachment,
} from '../../utils/permissions'
import Button from '../ui/Button'
import IconButton from '../ui/IconButton'
import DocumentPreview from './DocumentPreview'
import FileIcon from './FileIcon'
import FileUploadProgress from './FileUploadProgress'
import { fileUploadStateLabel } from '../../utils/fileUploadPresentation'
import TaskAttachmentPicker from './TaskAttachmentPicker'

const tileClass =
  'flex h-44 w-40 shrink-0 flex-col overflow-hidden rounded-[var(--radius-control)] border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)]'

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
  const { jobs, openPanel, dismiss } = useFileUploads()
  const { notify } = useNotifications()
  const destination = taskFileTarget(task)
  const path = fileOwnerPath(destination)
  const key = queryKeys.taskAttachments(scope, path)
  const [operation, setOperation] = useState<{
    attachmentId: string
    remove: boolean
  } | null>(null)
  const active = useRef<AbortController | null>(null)
  useEffect(() => () => active.current?.abort(), [])
  const query = useTaskAttachments(scope, destination)
  const ownerJobs = jobs.filter(
    (job) => fileOwnerPath(job.destination) === path,
  )
  const pendingJobs = ownerJobs.filter(
    (job) =>
      job.state !== 'cancelled' &&
      job.state !== 'completed' &&
      !query.data?.some(
        (item) => item.file.fileId === job.attachment?.file.fileId,
      ),
  )
  const attachments = [
    ...(query.data ?? []),
    ...ownerJobs.flatMap((job) =>
      job.state === 'completed' &&
      !job.reconciled &&
      job.attachment &&
      !query.data?.some(
        (item) => item.file.fileId === job.attachment?.file.fileId,
      )
        ? [job.attachment]
        : [],
    ),
  ]
  const busy = operation !== null
  async function refresh() {
    await Promise.all([
      client.invalidateQueries({ queryKey: key }),
      client.invalidateQueries({
        queryKey: queryKeys.routineControlRoot(scope),
      }),
      client.invalidateQueries({
        queryKey: [...queryKeys.scope(scope), 'agenda-projection'],
      }),
    ])
  }
  async function operate(attachment: AttachmentResource, remove: boolean) {
    if (active.current) return
    const controller = new AbortController()
    active.current = controller
    setOperation({ attachmentId: attachment.attachmentId, remove })
    try {
      if (remove) {
        await fileService.remove(
          destination,
          attachment.attachmentId,
          controller.signal,
        )
        ownerJobs
          .filter(
            (job) =>
              job.state === 'completed' &&
              job.attachment?.file.fileId === attachment.file.fileId,
          )
          .forEach((job) => dismiss(job.id))
        await client.cancelQueries({ queryKey: key })
        client.setQueryData<AttachmentResource[]>(key, (current) =>
          current?.filter(
            (item) => item.attachmentId !== attachment.attachmentId,
          ),
        )
        const remaining = client.getQueryData<AttachmentResource[]>(key)
        if (remaining)
          updateTaskAttachmentCount(
            client,
            scope,
            destination,
            remaining.length,
          )
        notify({
          title: 'Anexo removido',
          tone: 'success',
          dedupeKey: `attachment-removed:${path}`,
        })
        await refresh()
      } else {
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
        notify({
          title: remove
            ? 'Não foi possível remover o anexo'
            : 'Não foi possível baixar o arquivo',
          message: fileErrorMessage(caught),
          tone: 'error',
          dedupeKey: `attachment-action:${path}`,
        })
      }
      // A cancelled response may still correspond to a committed deletion.
      if (remove) await refresh().catch(() => undefined)
    } finally {
      active.current = null
      if (!controller.signal.aborted) setOperation(null)
    }
  }
  const canAdd = canAddTaskAttachment(user, task, competenceStatus)
  if (isApiError(query.error) && query.error.status === 501) return null
  if (
    query.data?.length === 0 &&
    !canAdd &&
    !query.error &&
    !attachments.length &&
    !pendingJobs.length
  )
    return null
  const hasTiles = attachments.length > 0 || pendingJobs.length > 0
  return (
    <section aria-label="Anexos da tarefa" className="min-w-0 space-y-3 p-3">
      <header className="flex min-h-8 flex-wrap items-center justify-between gap-2">
        <div className="flex min-h-8 items-center gap-2 text-[var(--color-text-muted)]">
          <FileIcon name="attachment" />
          <h3
            className="text-sm font-bold text-[var(--color-text-strong)]"
            aria-label={
              attachments.length ? `Anexos (${attachments.length})` : 'Anexos'
            }
          >
            Anexos
          </h3>
          {attachments.length > 0 && (
            <span
              aria-hidden="true"
              className="rounded-full bg-[var(--color-panel-soft-bg)] px-2 py-0.5 text-[10px] font-bold text-[var(--color-text-muted)] ring-1 ring-[var(--color-panel-border)]"
            >
              {attachments.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {ownerJobs.length > 0 && (
            <IconButton tone="ghost" label="Ver envios" onClick={openPanel}>
              <svg
                viewBox="0 0 24 24"
                className="size-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 16V3m-4 4 4-4 4 4M5 15v5h14v-5" />
              </svg>
            </IconButton>
          )}
          {canAdd && query.isSuccess && (
            <TaskAttachmentPicker
              destination={destination}
              label={task.title || 'Anexos da tarefa'}
              disabled={busy}
            />
          )}
        </div>
      </header>
      {(hasTiles || query.isPending || query.error) && (
        <div
          className="h-52 overflow-x-auto overflow-y-hidden overscroll-x-contain pb-4"
          data-attachment-layout="single-row"
          tabIndex={0}
          aria-label="Documentos da tarefa"
        >
          <ul className="flex min-w-max gap-2">
            {query.isPending && !hasTiles && (
              <li
                aria-label="Carregando anexos"
                role="status"
                className={`${tileClass} animate-pulse bg-[var(--color-panel-soft-bg)] motion-reduce:animate-none`}
              />
            )}
            {attachments.map((attachment) => {
              const current =
                operation?.attachmentId === attachment.attachmentId
              const status = current
                ? operation.remove
                  ? 'Removendo…'
                  : 'Preparando download…'
                : formatFileSize(attachment.file.sizeBytes)
              return (
                <li
                  key={attachment.attachmentId}
                  className={tileClass}
                  data-attachment-kind="document"
                >
                  <DocumentPreview name={attachment.file.originalName} />
                  <div aria-hidden="true" className="h-1 shrink-0" />
                  <div className="flex min-h-0 flex-1 flex-col justify-between gap-1 p-2">
                    <span
                      className="line-clamp-2 h-8 break-words text-xs leading-4 font-semibold text-[var(--color-text-strong)]"
                      title={attachment.file.originalName}
                    >
                      {attachment.file.originalName}
                    </span>
                    <div className="flex min-h-8 items-center justify-between gap-1">
                      <span
                        role={current ? 'status' : undefined}
                        title={status}
                        className="min-w-0 truncate text-[10px] text-[var(--color-text-muted)]"
                      >
                        {status}
                      </span>
                      <div className="flex shrink-0 items-center gap-0.5">
                        <IconButton
                          tone="ghost"
                          disabled={
                            busy || attachment.file.state !== 'available'
                          }
                          onClick={() => void operate(attachment, false)}
                          label={`Baixar ${attachment.file.originalName}`}
                          className="size-7 min-h-7 p-1"
                        >
                          <FileIcon
                            name={
                              current && !operation.remove
                                ? 'progress'
                                : 'download'
                            }
                            className={`size-3.5 ${current && !operation.remove ? 'animate-spin motion-reduce:animate-none' : ''}`}
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
                            disabled={busy}
                            onClick={() => void operate(attachment, true)}
                            label={`Remover ${attachment.file.originalName}`}
                            className="size-7 min-h-7 p-1 hover:bg-[var(--status-error-bg)] hover:text-[var(--status-error-text)]"
                          >
                            <FileIcon
                              name={
                                current && operation.remove
                                  ? 'progress'
                                  : 'remove'
                              }
                              className={`size-3.5 ${current && operation.remove ? 'animate-spin motion-reduce:animate-none' : ''}`}
                            />
                          </IconButton>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              )
            })}
            {pendingJobs.map((job) => (
              <UploadTile key={job.id} job={job} onDetails={openPanel} />
            ))}
            {query.error && (
              <li
                className={`${tileClass} justify-center gap-2 p-3 text-center`}
              >
                <p className="line-clamp-2 text-xs text-[var(--color-text-muted)]">
                  Não foi possível carregar os anexos.
                </p>
                <Button
                  size="sm"
                  tone="neutral"
                  onClick={() => void query.refetch()}
                >
                  Tentar novamente
                </Button>
              </li>
            )}
          </ul>
        </div>
      )}
    </section>
  )
}

function UploadTile({
  job,
  onDetails,
}: {
  job: UploadJob
  onDetails: () => void
}) {
  const failed = job.state === 'error'
  return (
    <li className={tileClass} data-upload-state={job.state} aria-busy={!failed}>
      <DocumentPreview name={job.fileName} />
      <FileUploadProgress
        state={job.state}
        progress={job.progress}
        label={`Envio de ${job.fileName}`}
      />
      <div className="flex min-h-0 flex-1 flex-col justify-between gap-1 p-2">
        <span
          className="line-clamp-2 h-8 break-words text-xs leading-4 font-semibold text-[var(--color-text-strong)]"
          title={job.fileName}
        >
          {job.fileName}
        </span>
        <button
          type="button"
          onClick={onDetails}
          className={`min-h-7 truncate rounded text-left text-[10px] font-semibold focus-visible:outline-2 focus-visible:outline-[var(--color-control-focus)] ${failed ? 'text-[var(--status-error-text)]' : 'text-[var(--color-text-muted)]'}`}
          aria-label={`${fileUploadStateLabel(job)}: ${job.fileName}. Abrir envios`}
          title={failed ? job.error : 'Abrir painel de envios'}
        >
          {failed && <span aria-hidden="true">! </span>}
          {fileUploadStateLabel(job)}
        </button>
      </div>
    </li>
  )
}

function formatFileSize(bytes: number): string {
  return bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(1)} KiB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MiB`
}
