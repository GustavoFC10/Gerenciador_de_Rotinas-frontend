import { describe, expect, it } from 'vitest'

import type { ClientCompanyResource } from '../services/companyService'
import {
  toClientFromResource,
  toTaskFromResource,
  toTaskFromScheduledOccurrence,
} from './routineControlMappers'
import type { TaskResource } from '../services/taskService'
import type { ScheduledOccurrence } from '../types/domain'

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

describe('attachment counts from task resources', () => {
  it('preserves a task count after status and assignee mutations', () => {
    const resource: TaskResource = {
      id: 'task',
      occurrenceKey: null,
      competenceId: 'competence',
      competence: '2026-10',
      kind: 'ad_hoc',
      status: 'completed',
      title: 'Documento mensal',
      description: '',
      observation: '',
      departmentId: 'fiscal',
      departmentName: 'Fiscal',
      clientCompanyId: null,
      routineId: null,
      dueDate: '2026-10-20',
      assignee: { id: 'member', displayName: 'Pessoa' },
      links: [],
      version: 4,
      archivedAt: null,
      createdAt: '',
      updatedAt: '',
      attachmentCount: 3,
    }
    expect(toTaskFromResource(resource, '"4"')).toMatchObject({
      assigneeId: 'member',
      status: 'completed',
      indicators: { attachments: 3 },
    })
    const occurrence: ScheduledOccurrence = {
      ...resource,
      occurrenceKey: 'occurrence',
      taskId: 'task',
      etag: '"4"',
      persistence: 'materialized',
      referenceMonth: '2026-10',
      kind: 'scheduled',
      clientCompanyId: 'company',
      companyCode: '001',
      companyName: 'Empresa',
      companyLegalName: 'Empresa',
      routineId: 'routine',
      routineVersionId: 'version',
      sourceAssignmentId: 'assignment',
      routineShotname: 'DOC',
      routineName: 'Documento mensal',
      routineVersionNumber: 1,
      routineDescription: '',
      sourceRevision: 1,
      materializationReason: 'attachment',
      materializedAt: '',
      isOverdue: false,
    }
    expect(
      toTaskFromScheduledOccurrence(occurrence, '"4"', 'competence'),
    ).toMatchObject({
      occurrenceKey: 'occurrence',
      status: 'completed',
      indicators: { attachments: 3 },
    })
  })
})
