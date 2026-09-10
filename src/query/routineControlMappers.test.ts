import { describe, expect, it } from 'vitest'

import type { ClientCompanyResource } from '../services/companyService'
import { toClientFromResource } from './routineControlMappers'

describe('toClientFromResource', () => {
  it('normalizes a null company code to an absent optional value', () => {
    const resource: ClientCompanyResource = {
      id: 'company-1',
      code: null,
      name: 'Empresa sem código',
      legalName: '',
      cnpj: '',
      email: '',
      mobilePhone: '',
      taxRegime: '',
      version: 1,
      archivedAt: null,
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    }

    const client = toClientFromResource(resource)

    expect(client.code).toBeUndefined()
  })
})
