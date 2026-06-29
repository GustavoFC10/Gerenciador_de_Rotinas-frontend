import { routineControlMock } from '../mocks/routineControl.mock.js'

const wait = (milliseconds) =>
  new Promise((resolve) => window.setTimeout(resolve, milliseconds))

export async function listEmployees(filters = {}) {
  await wait(150)

  let employees = structuredClone(routineControlMock.data.employees)

  if (filters.departmentId) {
    employees = employees.filter((employee) =>
      employee.departmentIds?.includes(filters.departmentId),
    )
  }

  return employees
}

export async function getEmployee(employeeId) {
  const employees = await listEmployees()

  return employees.find((employee) => employee.id === employeeId) ?? null
}

export async function saveEmployee(employee) {
  await wait(150)

  return {
    id: employee.id ?? `employee-${Date.now()}`,
    ...employee,
  }
}
