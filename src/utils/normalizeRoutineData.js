export function normalizeRoutineData(data) {
  return {
    clientsById: new Map(data.clients.map((client) => [client.id, client])),
    routinesById: new Map(
      data.routines.map((routine) => [routine.id, routine]),
    ),
    employeesById: new Map(
      data.employees.map((employee) => [employee.id, employee]),
    ),
    departmentsById: new Map(
      data.departments.map((department) => [department.id, department]),
    ),
  }
}
