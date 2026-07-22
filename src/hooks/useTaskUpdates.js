import { ROUTINE_STATUS } from '../constants/routineStatus.js'

const terminalStatuses = new Set([
  ROUTINE_STATUS.COMPLETED,
  ROUTINE_STATUS.NO_MOVEMENT,
  ROUTINE_STATUS.NOT_APPLICABLE,
])

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
      updateTask(task.id, {
        indicators: {
          ...task.indicators,
          attachments: (task.indicators?.attachments ?? 0) + 1,
        },
      }),
  }
}
