export function filterTasksByClient(tasks, clientId) {
  return tasks.filter((task) => task.clientId === clientId)
}

export function filterTasksByRoutine(tasks, routineId) {
  return tasks.filter((task) => task.routineId === routineId)
}

export function filterTasksByDepartment(tasks, departmentId) {
  return tasks.filter((task) => task.departmentId === departmentId)
}

export function filterTasksByAssignee(tasks, assigneeId) {
  return tasks.filter((task) => task.assigneeId === assigneeId)
}

export function searchTasks(tasks, term, relations) {
  const normalizedTerm = term.trim().toLowerCase()

  if (!normalizedTerm) return tasks

  return tasks.filter((task) => {
    const client = relations.clientsById.get(task.clientId)
    const routine = relations.routinesById.get(task.routineId)
    const employee = relations.employeesById.get(task.assigneeId)

    return [
      client?.code,
      client?.name,
      routine?.name,
      employee?.name,
      task.title,
      task.description,
      task.notes,
      task.status,
    ]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(normalizedTerm))
  })
}
