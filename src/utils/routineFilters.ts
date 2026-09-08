import type { EntityId } from '../types/domain'

export function filterTasksByClient<
  TaskItem extends { clientId: EntityId | null },
>(tasks: TaskItem[], clientId?: EntityId | null): TaskItem[] {
  return tasks.filter((task) => task.clientId === clientId)
}

export function filterTasksByRoutine<
  TaskItem extends { routineId: EntityId | null },
>(tasks: TaskItem[], routineId?: EntityId | null): TaskItem[] {
  return tasks.filter((task) => task.routineId === routineId)
}

export function filterTasksByDepartment<
  TaskItem extends { departmentId: EntityId },
>(tasks: TaskItem[], departmentId: EntityId): TaskItem[] {
  return tasks.filter((task) => task.departmentId === departmentId)
}

export function filterTasksByAssignee<
  TaskItem extends { assigneeId: EntityId | null },
>(tasks: TaskItem[], assigneeId: EntityId): TaskItem[] {
  return tasks.filter((task) => task.assigneeId === assigneeId)
}

interface SearchableTask {
  clientId: EntityId | null
  routineId: EntityId | null
  assigneeId: EntityId | null
  title?: string
  description?: string
  notes?: string
  status: string
}

interface SearchRelations {
  clientsById: Map<EntityId, { code?: string; name?: string }>
  routinesById: Map<EntityId, { name?: string }>
  employeesById: Map<EntityId, { name?: string }>
}

export function searchTasks<TaskItem extends SearchableTask>(
  tasks: TaskItem[],
  term: string,
  relations: SearchRelations,
): TaskItem[] {
  const normalizedTerm = term.trim().toLowerCase()

  if (!normalizedTerm) return tasks

  return tasks.filter((task) => {
    const client = task.clientId
      ? relations.clientsById.get(task.clientId)
      : undefined
    const routine = task.routineId
      ? relations.routinesById.get(task.routineId)
      : undefined
    const employee = task.assigneeId
      ? relations.employeesById.get(task.assigneeId)
      : undefined

    return [
      client?.code,
      client?.name,
      routine?.name,
      employee?.name,
      task.title,
      task.description,
      task.notes,
      task.status,
    ].some((value) =>
      String(value ?? '')
        .toLowerCase()
        .includes(normalizedTerm),
    )
  })
}
