import { routineControlMock } from '../mocks/routineControl.mock.js'

const wait = (milliseconds) =>
  new Promise((resolve) => window.setTimeout(resolve, milliseconds))

export async function listCompanies() {
  await wait(150)

  return structuredClone(routineControlMock.data.clients)
}

export async function getCompany(companyId) {
  const companies = await listCompanies()

  return companies.find((company) => company.id === companyId) ?? null
}

export async function saveCompany(company) {
  await wait(150)

  return {
    id: company.id ?? `client-${Date.now()}`,
    ...company,
  }
}
