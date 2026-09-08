import type {
  Department,
  RoutineControlData,
  Task,
  TaskRelations,
} from '../types/domain'

export function buildTaskRelations(
  task: Task,
  data: RoutineControlData,
  fallbackDepartment: Department | null = null,
): TaskRelations {
  const clientsById = new Map(data.clients.map((client) => [client.id, client]))
  const routinesById = new Map(
    data.routines.map((routine) => [routine.id, routine]),
  )
  const employeesById = new Map(
    data.employees.map((employee) => [employee.id, employee]),
  )
  const departmentsById = new Map(
    data.departments.map((department) => [department.id, department]),
  )

  return {
    client: task.clientId ? clientsById.get(task.clientId) : undefined,
    routine: task.routineId ? routinesById.get(task.routineId) : undefined,
    department:
      departmentsById.get(task.departmentId) ?? fallbackDepartment ?? undefined,
    assignee: task.assigneeId ? employeesById.get(task.assigneeId) : undefined,
    employees: data.employees,
  }
}
