import { describe, expect, it, vi } from 'vitest'

import { CompanyService } from './companyService'
import { DepartmentService } from './departmentService'
import { HttpClient } from './httpClient'
import { OrganizationMemberService } from './organizationMemberService'
import { RoutineService } from './routineService'
import { ScreenService } from './screenService'
import { TaskService } from './taskService'

describe('write services', () => {
  it('envia alterações de empresa com CSRF e If-Match', async () => {
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ id: 'company-1', name: 'Atualizada' }))
    const client = createClient(fetchImplementation)

    await new CompanyService(client).update(
      'company-1',
      { name: 'Atualizada' },
      '"3"',
    )

    expect(fetchImplementation).toHaveBeenCalledWith(
      'https://api.example.com/api/v1/client-companies/company-1/',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ name: 'Atualizada' }),
      }),
    )
    const headers = new Headers(fetchImplementation.mock.calls[0]?.[1]?.headers)
    expect(headers.get('X-CSRFToken')).toBe('csrf-token')
    expect(headers.get('If-Match')).toBe('"3"')
  })

  it('publica uma nova versão de rotina no endpoint específico', async () => {
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ id: 'routine-1' }))
    const client = createClient(fetchImplementation)

    await new RoutineService(client).publishVersion(
      'routine-1',
      {
        description: 'Nova regra',
        recurrence: 'quarterly',
        defaultDueDays: 10,
        recurrenceMonths: [1, 4, 7, 10],
      },
      '"4"',
    )

    expect(fetchImplementation.mock.calls[0]?.[0]).toBe(
      'https://api.example.com/api/v1/routines/routine-1/versions/',
    )
    expect(fetchImplementation.mock.calls[0]?.[1]).toMatchObject({
      method: 'POST',
      body: JSON.stringify({
        description: 'Nova regra',
        recurrence: 'quarterly',
        defaultDueDays: 10,
        recurrenceMonths: [1, 4, 7, 10],
      }),
    })
    expect(
      new Headers(fetchImplementation.mock.calls[0]?.[1]?.headers).get(
        'If-Match',
      ),
    ).toBe('"4"')
  })

  it('usa occurrenceKey e ETag para transicionar uma ocorrência recorrente', async () => {
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ occurrenceKey: 'occurrence-1' }))
    const client = createClient(fetchImplementation)

    await new TaskService(client).transitionOccurrence(
      '2026-08',
      'occurrence-1',
      { targetStatus: 'completed' },
      'virtual:revision-1',
    )

    expect(fetchImplementation.mock.calls[0]?.[0]).toBe(
      'https://api.example.com/api/v1/competences/by-period/2026-08/task-occurrences/occurrence-1/transition/',
    )
    expect(fetchImplementation.mock.calls[0]?.[1]).toMatchObject({
      method: 'POST',
      body: JSON.stringify({ targetStatus: 'completed' }),
    })
    expect(
      new Headers(fetchImplementation.mock.calls[0]?.[1]?.headers).get(
        'If-Match',
      ),
    ).toBe('virtual:revision-1')
  })

  it('cria tarefa avulsa com chave de idempotência', async () => {
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ id: 'task-1' }, 201))
    const client = createClient(fetchImplementation)

    await new TaskService(client).createAdHoc(
      'competence-1',
      { title: 'Revisar pendência', departmentId: 'department-1' },
      'ad-hoc-competence-1-task-1',
    )

    expect(fetchImplementation.mock.calls[0]?.[0]).toBe(
      'https://api.example.com/api/v1/competences/competence-1/tasks/',
    )
    expect(
      new Headers(fetchImplementation.mock.calls[0]?.[1]?.headers).get(
        'Idempotency-Key',
      ),
    ).toBe('ad-hoc-competence-1-task-1')
  })

  it('envia convite de funcionário pela rota de membership invitations', async () => {
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ id: 'invitation-1' }, 201))
    const client = createClient(fetchImplementation)

    await new OrganizationMemberService(client).invite({
      email: 'novo@example.com',
      displayName: 'Novo membro',
      role: 'member',
    })

    expect(fetchImplementation.mock.calls[0]?.[0]).toBe(
      'https://api.example.com/api/v1/membership-invitations/',
    )
    expect(fetchImplementation.mock.calls[0]?.[1]).toMatchObject({
      method: 'POST',
      body: JSON.stringify({
        email: 'novo@example.com',
        displayName: 'Novo membro',
        role: 'member',
      }),
    })
  })

  it('cria departamento e atualiza tela com ETag', async () => {
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ id: 'department-1' }, 201))
      .mockResolvedValueOnce(jsonResponse({ id: 'screen-1' }))
    const client = createClient(fetchImplementation)

    await new DepartmentService(client).create({
      name: 'Fiscal',
      description: 'Obrigações fiscais',
    })
    await new ScreenService(client).update(
      'screen-1',
      { name: 'Fiscal mensal', companyIds: ['company-2', 'company-1'] },
      '"2"',
    )

    expect(fetchImplementation.mock.calls[0]?.[0]).toBe(
      'https://api.example.com/api/v1/departments/',
    )
    expect(fetchImplementation.mock.calls[1]?.[0]).toBe(
      'https://api.example.com/api/v1/screens/screen-1/',
    )
    expect(
      new Headers(fetchImplementation.mock.calls[1]?.[1]?.headers).get(
        'If-Match',
      ),
    ).toBe('"2"')
  })

  it('lista todas as telas visÃ­veis para a navegaÃ§Ã£o', async () => {
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({
          next: 'https://api.example.com/api/v1/screens/?page=2',
          results: [{ id: 'screen-1', name: 'Fiscal' }],
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          next: null,
          results: [{ id: 'screen-2', name: 'Pessoal' }],
        }),
      )
    const client = createClient(fetchImplementation)

    const screens = await new ScreenService(client).listVisible()

    expect(screens).toEqual([
      { id: 'screen-1', name: 'Fiscal' },
      { id: 'screen-2', name: 'Pessoal' },
    ])
    expect(fetchImplementation.mock.calls.map(([url]) => url)).toEqual([
      'https://api.example.com/api/v1/screens/?includeArchived=false',
      'https://api.example.com/api/v1/screens/?page=2',
    ])
  })
})

function createClient(fetchImplementation: typeof fetch): HttpClient {
  const client = new HttpClient({
    baseUrl: 'https://api.example.com',
    fetchImplementation,
    requestIdFactory: () => 'request-id',
  })
  client.setCsrfToken('csrf-token')
  return client
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
