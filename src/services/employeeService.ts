import { routineControlMock } from '../mocks/routineControl.mock'
import type { Employee, EntityId } from '../types/domain'

const wait = (milliseconds: number) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds))

export async function listEmployees(
  filters: { departmentId?: EntityId } = {},
): Promise<Employee[]> {
  await wait(150)

  let employees = structuredClone(routineControlMock.data.employees)
  const departmentId = filters.departmentId

  if (departmentId) {
    employees = employees.filter((employee) =>
      employee.departmentIds?.includes(departmentId),
    )
  }

  return employees
}

export async function getEmployee(
  employeeId: EntityId,
): Promise<Employee | null> {
  const employees = await listEmployees()

  return employees.find((employee) => employee.id === employeeId) ?? null
}

export async function saveEmployee(
  employee: Omit<Employee, 'id'> & { id?: EntityId },
): Promise<Employee> {
  await wait(150)

  return {
    id: employee.id ?? `employee-${Date.now()}`,
    ...employee,
  }
}
