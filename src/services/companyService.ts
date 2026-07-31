import { routineControlMock } from '../mocks/routineControl.mock'
import type { Client, EntityId } from '../types/domain'

const wait = (milliseconds: number) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds))

export async function listCompanies(): Promise<Client[]> {
  await wait(150)

  return structuredClone(routineControlMock.data.clients)
}

export async function getCompany(companyId: EntityId): Promise<Client | null> {
  const companies = await listCompanies()

  return companies.find((company) => company.id === companyId) ?? null
}

export async function saveCompany(
  company: Omit<Client, 'id'> & { id?: EntityId },
): Promise<Client> {
  await wait(150)

  return {
    id: company.id ?? `client-${Date.now()}`,
    ...company,
  }
}
