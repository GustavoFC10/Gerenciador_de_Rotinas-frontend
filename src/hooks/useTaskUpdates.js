export function useTaskUpdates({ setResponse, setSelectedTask }) {
  function updateTask(taskId, changes) {
    setResponse((currentResponse) => {
      if (!currentResponse) return currentResponse

      return {
        ...currentResponse,
        data: {
          ...currentResponse.data,
          tasks: currentResponse.data.tasks.map((task) =>
            task.id === taskId ? { ...task, ...changes } : task,
          ),
        },
      }
    })

    setSelectedTask?.((currentTask) =>
      currentTask?.id === taskId
        ? { ...currentTask, ...changes }
        : currentTask,
    )
  }

  return {
    updateTask,
    updateStatus: (taskId, status) => updateTask(taskId, { status }),
    updateAssignee: (taskId, assigneeId) => updateTask(taskId, { assigneeId }),
    updateDueDate: (taskId, dueDate) => updateTask(taskId, { dueDate }),
    updateNotes: (taskId, notes) => updateTask(taskId, { notes }),
    incrementAttachments: (task) =>
      updateTask(task.id, {
        indicators: {
          ...task.indicators,
          attachments: task.indicators.attachments + 1,
        },
      }),
  }
}
