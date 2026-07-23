import { ROUTINE_STATUS } from '../constants/routineStatus.js'

const terminalStatuses = new Set([
  ROUTINE_STATUS.COMPLETED,
  ROUTINE_STATUS.NO_MOVEMENT,
  ROUTINE_STATUS.NOT_APPLICABLE,
])

export function removeAttachmentFromTask(task, attachmentId) {
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

export function useTaskUpdates({ setResponse, setSelectedTask }) {
  function updateTask(taskId, changes) {
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

  function createLooseTask(task) {
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
    updateStatus: (taskId, status, statusDetail = null) =>
      updateTask(taskId, (task) => ({
        status,
        statusDetail,
        completedAt: terminalStatuses.has(status)
          ? (task.completedAt ?? new Date().toISOString())
          : null,
      })),
    updateAssignee: (taskId, assigneeId) => updateTask(taskId, { assigneeId }),
    updateDueDate: (taskId, dueDate) => updateTask(taskId, { dueDate }),
    updateNotes: (taskId, notes) => updateTask(taskId, { notes }),
    incrementAttachments: (task) =>
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
    removeAttachment: (taskId, attachmentId) =>
      updateTask(taskId, (task) =>
        removeAttachmentFromTask(task, attachmentId),
      ),
  }
}
