import { useEffect, useImperativeHandle, useRef, type Ref } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { useFileUpload } from '../../hooks/useFileUpload'
import { queryKeys, type OrganizationQueryScope } from '../../query/queryKeys'
import {
  attachmentAccept,
  fileOwnerPath,
  taskFileTarget,
} from '../../services/fileService'
import type { AppUser, CompetenceStatus, Task } from '../../types/domain'
import { canAddTaskAttachment } from '../../utils/permissions'
import FileUploadFeedback from './FileUploadFeedback'

export interface TaskAttachmentUploadHandle {
  open: (task: Task) => void
}

interface TaskAttachmentUploadProps {
  ref: Ref<TaskAttachmentUploadHandle>
  scope: OrganizationQueryScope
  user: AppUser
  competenceStatus?: CompetenceStatus
  onAvailabilityChange?: (available: boolean) => void
}

export default function TaskAttachmentUpload({
  ref,
  scope,
  user,
  competenceStatus,
  onAvailabilityChange,
}: TaskAttachmentUploadProps) {
  const client = useQueryClient()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const selectedTask = useRef<Task | null>(null)
  const upload = useFileUpload({
    destination: null,
    onChanged: async () => {
      const task = selectedTask.current
      if (!task) return

      await Promise.all([
        client.invalidateQueries({
          queryKey: queryKeys.taskAttachments(
            scope,
            fileOwnerPath(taskFileTarget(task)),
          ),
        }),
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
    },
  })
  const isAvailable = !upload.busy && !upload.hasPending

  useEffect(() => {
    onAvailabilityChange?.(isAvailable)
  }, [isAvailable, onAvailabilityChange])

  useImperativeHandle(ref, () => ({
    open(task) {
      if (
        !isAvailable ||
        !canAddTaskAttachment(user, task, competenceStatus) ||
        !(task.occurrenceKey || (task.taskId && task.competenceId))
      ) {
        return
      }

      selectedTask.current = task
      // O seletor precisa abrir no mesmo evento do menu para manter a ativação
      // do usuário. O destino fica na ref antes de qualquer nova renderização.
      inputRef.current?.click()
    },
  }))

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        hidden
        className="hidden"
        aria-label="Anexar arquivo à tarefa"
        accept={attachmentAccept}
        disabled={!isAvailable}
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          const task = selectedTask.current
          if (
            file &&
            task &&
            isAvailable &&
            canAddTaskAttachment(user, task, competenceStatus)
          ) {
            void upload.run(file, taskFileTarget(task))
          }
        }}
      />
      {(upload.status || upload.error || upload.hasPending) && (
        <div
          className="fixed right-4 bottom-4 z-[130] w-[calc(100vw-2rem)] max-w-sm rounded-[var(--radius-control)] bg-[var(--color-panel-bg)] shadow-[var(--shadow-floating)]"
          aria-label="Envio de anexo"
        >
          <FileUploadFeedback upload={upload} />
        </div>
      )}
    </>
  )
}
