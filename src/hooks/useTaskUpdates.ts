import { isTerminalRoutineStatus } from '../constants/routineStatus'
import type { Dispatch, SetStateAction } from 'react'
import type { EntityId, RoutineControlResponse, Task } from '../types/domain'
import type { RoutineStatus } from '../types/domain'

type AttachmentTaskShape = Pick<Task, 'attachments' | 'indicators'>
type TaskChanges = Partial<Task> | ((task: Task) => Partial<Task>)

export function removeAttachmentFromTask(
  task: AttachmentTaskShape,
  attachmentId: EntityId,
): AttachmentTaskShape {
  const attachments = Array.isArray(task.attachments) ? task.attachments : []
  const nextAttachments = attachments.filter(
    (attachment) => attachment.id !== attachmentId,
  )
  const currentCount = Math.max(
    attachments.length,
    Number(task.indicators?.attachments) || 0,
  )

  return {
    attachments: nextAttachments,
    indicators: {
      ...task.indicators,
      attachments: Math.max(nextAttachments.length, currentCount - 1),
    },
  }
}

export function useTaskUpdates({
  setResponse,
  setSelectedTask,
}: {
  setResponse: Dispatch<SetStateAction<RoutineControlResponse | null>>
  setSelectedTask?: Dispatch<SetStateAction<Task | null>>
}) {
  function updateTask(taskId: EntityId, changes: TaskChanges) {
    setResponse((currentResponse) => {
      if (!currentResponse) return currentResponse

      return {
        ...currentResponse,
        data: {
          ...currentResponse.data,
          tasks: currentResponse.data.tasks.map((task) => {
            if (task.id !== taskId) return task
            const resolvedChanges =
              typeof changes === 'function' ? changes(task) : changes
            return { ...task, ...resolvedChanges }
          }),
        },
      }
    })

    setSelectedTask?.((currentTask) => {
      if (currentTask?.id !== taskId) return currentTask
      const resolvedChanges =
        typeof changes === 'function' ? changes(currentTask) : changes
      return { ...currentTask, ...resolvedChanges }
    })
  }

  function createLooseTask(task: Task) {
    setResponse((currentResponse) => {
      if (!currentResponse) return currentResponse

      return {
        ...currentResponse,
        data: {
          ...currentResponse.data,
          tasks: [task, ...currentResponse.data.tasks],
        },
      }
    })
  }

  return {
    updateTask,
    createLooseTask,
    updateStatus: (
      taskId: EntityId,
      status: RoutineStatus,
      statusDetail: string | null = null,
    ) =>
      updateTask(taskId, (task) => ({
        status,
        statusDetail,
        completedAt: isTerminalRoutineStatus(status)
          ? (task.completedAt ?? new Date().toISOString())
          : null,
      })),
    updateAssignee: (taskId: EntityId, assigneeId: EntityId | null) =>
      updateTask(taskId, { assigneeId }),
    updateDueDate: (taskId: EntityId, dueDate: string) =>
      updateTask(taskId, { dueDate }),
    updateNotes: (taskId: EntityId, notes: string) =>
      updateTask(taskId, { notes }),
    incrementAttachments: (task: Task) =>
      updateTask(task.id, (currentTask) => {
        const attachments = Array.isArray(currentTask.attachments)
          ? currentTask.attachments
          : []
        const nextIndex =
          Math.max(
            attachments.length,
            Number(currentTask.indicators?.attachments) || 0,
          ) + 1

        return {
          attachments: [
            ...attachments,
            {
              id: `${currentTask.id}-uploaded-${nextIndex}`,
              name: `novo-anexo-${String(nextIndex).padStart(2, '0')}.pdf`,
              mimeType: 'application/pdf',
              sizeLabel: 'Novo arquivo',
              previewType: 'pdf',
              previewTitle: 'Arquivo adicionado',
              uploadedAt: new Date().toISOString(),
            },
          ],
          indicators: {
            ...currentTask.indicators,
            attachments: nextIndex,
          },
        }
      }),
    removeAttachment: (taskId: EntityId, attachmentId: EntityId) =>
      updateTask(taskId, (task) =>
        removeAttachmentFromTask(task, attachmentId),
      ),
  }
}
