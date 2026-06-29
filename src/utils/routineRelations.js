export function buildTaskRelations(task, data, fallbackDepartment = null) {
  const clientsById = new Map(data.clients.map((client) => [client.id, client]))
  const routinesById = new Map(data.routines.map((routine) => [routine.id, routine]))
  const employeesById = new Map(
    data.employees.map((employee) => [employee.id, employee]),
  )
  const departmentsById = new Map(
    data.departments.map((department) => [department.id, department]),
  )

  return {
    client: clientsById.get(task.clientId),
    routine: routinesById.get(task.routineId),
    department: departmentsById.get(task.departmentId) ?? fallbackDepartment,
    assignee: employeesById.get(task.assigneeId),
    employees: data.employees,
  }
}
