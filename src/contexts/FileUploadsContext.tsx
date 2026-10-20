import {
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import { useQueryClient } from '@tanstack/react-query'

import UploadsPanel from '../components/files/UploadsPanel'
import { useNotifications } from '../hooks/useNotifications'
import { queryKeys, type OrganizationQueryScope } from '../query/queryKeys'
import {
  replaceTaskInOperationalContext,
  updateTaskAttachmentCount,
} from '../query/routineControlCache'
import {
  toTaskAssignee,
  toTaskFromResource,
  toTaskFromScheduledOccurrence,
} from '../query/routineControlMappers'
import { fileOwnerPath, fileService } from '../services/fileService'
import { FileUploadQueue } from '../services/fileUploadQueue'
import { taskService } from '../services/taskService'
import type { RoutineControlResponse } from '../types/domain'
import type { UploadBatchResult, UploadJob } from '../types/fileUploads'
import { AuthContext } from './authContextDefinition'
import { FileUploadsContext } from './fileUploadsContextDefinition'

export function FileUploadsProvider({
  scope,
  children,
  paceMs,
}: {
  scope: OrganizationQueryScope
  children: ReactNode
  paceMs?: number
}) {
  const client = useQueryClient()
  const notifications = useNotifications()
  const auth = useContext(AuthContext)
  const [panelOpen, setPanelOpen] = useState(false)
  const callbacks = useRef({ notifications, auth })
  callbacks.current = { notifications, auth }
  const reconciliation = useRef(new Map<string, number>())
  const [queue] = useState(
    () =>
      new FileUploadQueue({
        membershipId: scope.membershipId,
        paceMs,
        onChanged: async (job: UploadJob, signal?: AbortSignal) => {
          signal?.throwIfAborted()
          const path = fileOwnerPath(job.destination)
          const revision = (reconciliation.current.get(path) ?? 0) + 1
          reconciliation.current.set(path, revision)
          if (job.destination.purpose === 'task_attachment') {
            // Read the collection: an idempotency replay can contain an older count.
            const attachments = await fileService.listAttachments(
              job.destination,
              signal,
            )
            signal?.throwIfAborted()
            if (reconciliation.current.get(path) !== revision) return
            client.setQueryData(
              queryKeys.taskAttachments(scope, path),
              attachments,
            )
            updateTaskAttachmentCount(
              client,
              scope,
              job.destination,
              attachments.length,
            )
            await client.invalidateQueries({
              queryKey: queryKeys.taskAttachments(scope, path),
            })
            signal?.throwIfAborted()
            if (reconciliation.current.get(path) !== revision) return
            const target = job.destination.target
            try {
              if ('occurrenceKey' in target) {
                const period = target.referenceMonth.slice(0, 7)
                const fresh = await taskService.getOccurrence(
                  period,
                  target.occurrenceKey,
                  signal,
                )
                signal?.throwIfAborted()
                if (reconciliation.current.get(path) !== revision) return
                const cachedTask = client
                  .getQueryData<RoutineControlResponse>(
                    queryKeys.routineControl(scope, period),
                  )
                  ?.data.tasks.find(
                    (item) => item.occurrenceKey === target.occurrenceKey,
                  )
                replaceTaskInOperationalContext({
                  queryClient: client,
                  scope,
                  period,
                  task: toTaskFromScheduledOccurrence(
                    fresh.data,
                    fresh.etag,
                    cachedTask?.competenceId ?? null,
                  ),
                  assignee: toTaskAssignee(fresh.data.assignee),
                })
              } else {
                const fresh = await taskService.get(
                  target.competenceId,
                  target.taskId,
                  signal,
                )
                signal?.throwIfAborted()
                if (reconciliation.current.get(path) !== revision) return
                const task = toTaskFromResource(fresh.data, fresh.etag)
                replaceTaskInOperationalContext({
                  queryClient: client,
                  scope,
                  period: task.period,
                  task,
                  assignee: toTaskAssignee(fresh.data.assignee),
                })
              }
            } catch {
              signal?.throwIfAborted()
              // The collection is already authoritative. A failed detail refresh
              // must not re-enable the optimistic attachment after a later removal.
              // The batch reconciliation will refresh the remaining metadata.
            }
          } else {
            await client.invalidateQueries({
              queryKey: queryKeys.imageSlot(scope, path),
            })
            signal?.throwIfAborted()
            await client.invalidateQueries({
              queryKey: queryKeys.members(scope),
            })
            if (job.destination.purpose === 'member_avatar') {
              await client.invalidateQueries({
                queryKey: queryKeys.member(
                  scope,
                  job.destination.target.memberId,
                ),
              })
              signal?.throwIfAborted()
              if (job.destination.target.memberId === scope.membershipId)
                await callbacks.current.auth?.refreshSession()
            }
          }
          return true
        },
        onBatch: (result: UploadBatchResult) => {
          void Promise.all([
            client.invalidateQueries({
              queryKey: queryKeys.routineControlRoot(scope),
            }),
            client.invalidateQueries({
              queryKey: [...queryKeys.scope(scope), 'screen-projection'],
            }),
            client.invalidateQueries({
              queryKey: [...queryKeys.scope(scope), 'agenda-projection'],
            }),
          ])
          if (result.cancelled && !result.completed && !result.failed) return
          const title = result.failed
            ? result.completed
              ? `${result.completed} ${result.completed === 1 ? 'arquivo adicionado' : 'arquivos adicionados'}; ${result.failed} ${result.failed === 1 ? 'precisa' : 'precisam'} de atenção`
              : `${result.failed === 1 ? 'Um arquivo precisa' : `${result.failed} arquivos precisam`} de atenção`
            : result.purpose === 'member_avatar'
              ? 'Foto atualizada'
              : result.purpose === 'department_image'
                ? 'Imagem do departamento atualizada'
                : `${result.completed} ${result.completed === 1 ? 'anexo adicionado' : 'anexos adicionados'}`
          callbacks.current.notifications.notify({
            title,
            message: result.label,
            tone: result.failed ? 'error' : 'success',
            category: 'uploads',
            dedupeKey: `upload-batch:${result.id}`,
            action: { label: 'Ver envios', onClick: () => setPanelOpen(true) },
          })
        },
      }),
  )
  const jobs = useSyncExternalStore(
    queue.subscribe,
    queue.getSnapshot,
    queue.getSnapshot,
  )
  useEffect(() => {
    queue.activate()
    return () => queue.dispose()
  }, [queue])

  return (
    <FileUploadsContext.Provider
      value={{
        jobs,
        isAvailable: true,
        panelOpen,
        enqueue: queue.enqueue,
        retry: queue.retry,
        cancel: queue.cancel,
        dismiss: queue.dismiss,
        openPanel: () => setPanelOpen(true),
        closePanel: () => setPanelOpen(false),
      }}
    >
      {children}
      {panelOpen && <UploadsPanel />}
    </FileUploadsContext.Provider>
  )
}
