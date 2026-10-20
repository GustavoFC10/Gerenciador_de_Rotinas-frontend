import { useEffect, useImperativeHandle, useRef, type Ref } from 'react'

import { useFileUploads } from '../../hooks/useFileUploads'
import type { OrganizationQueryScope } from '../../query/queryKeys'
import { attachmentAccept, taskFileTarget } from '../../services/fileService'
import type { AppUser, CompetenceStatus, Task } from '../../types/domain'
import { canAddTaskAttachment } from '../../utils/permissions'

export interface TaskAttachmentUploadHandle {
  open: (task: Task) => void
}

interface TaskAttachmentUploadProps {
  ref?: Ref<TaskAttachmentUploadHandle>
  scope: OrganizationQueryScope
  user: AppUser
  competenceStatus?: CompetenceStatus
  onAvailabilityChange?: (available: boolean) => void
}

export default function TaskAttachmentUpload({
  ref,
  user,
  competenceStatus,
  onAvailabilityChange,
}: TaskAttachmentUploadProps) {
  const uploads = useFileUploads()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const selectedTask = useRef<{
    task: Task
    competenceStatus?: CompetenceStatus
  } | null>(null)
  useEffect(() => {
    onAvailabilityChange?.(uploads.isAvailable)
  }, [onAvailabilityChange, uploads.isAvailable])
  useImperativeHandle(ref, () => ({
    open(task) {
      if (
        !uploads.isAvailable ||
        !canAddTaskAttachment(user, task, competenceStatus) ||
        !(task.occurrenceKey || (task.taskId && task.competenceId))
      )
        return
      selectedTask.current = { task: structuredClone(task), competenceStatus }
      inputRef.current?.click()
    },
  }))
  return (
    <input
      ref={inputRef}
      type="file"
      hidden
      className="hidden"
      multiple
      aria-label="Anexar arquivo à tarefa"
      accept={attachmentAccept}
      disabled={!uploads.isAvailable}
      onChange={(event) => {
        const files = Array.from(event.target.files ?? [])
        event.target.value = ''
        const selected = selectedTask.current
        selectedTask.current = null
        if (
          files.length &&
          selected &&
          canAddTaskAttachment(user, selected.task, selected.competenceStatus)
        ) {
          uploads.enqueue(
            files,
            taskFileTarget(selected.task),
            `${selected.task.title || 'Anexos da tarefa'} · ${selected.task.period}`,
          )
        }
      }}
    />
  )
}
