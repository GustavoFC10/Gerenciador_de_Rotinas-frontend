import { describe, expect, it, vi } from 'vitest'

import { CompanyService } from './companyService'
import { DepartmentService } from './departmentService'
import { HttpClient } from './httpClient'
import { OrganizationMemberService } from './organizationMemberService'
import { RoutineService } from './routineService'
import { ScreenService } from './screenService'
import { TaskService } from './taskService'

describe('write services', () => {
  it('cria empresa sem enviar código quando ele não foi informado', async () => {
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ id: 'company-1', name: 'Sem código' }))
    const client = createClient(fetchImplementation)

    await new CompanyService(client).create({ name: 'Sem código' })

    expect(fetchImplementation).toHaveBeenCalledWith(
      'https://api.example.com/api/v1/client-companies/',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'Sem código' }),
      }),
    )
  })

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

  it('desarquiva empresa com CSRF e If-Match', async () => {
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ id: 'company-1', archivedAt: null }))
    const client = createClient(fetchImplementation)

    await new CompanyService(client).restore('company-1', '"4"')

    expect(fetchImplementation).toHaveBeenCalledWith(
      'https://api.example.com/api/v1/client-companies/company-1/restore/',
      expect.objectContaining({ method: 'POST', body: '{}' }),
    )
    const headers = new Headers(fetchImplementation.mock.calls[0]?.[1]?.headers)
    expect(headers.get('X-CSRFToken')).toBe('csrf-token')
    expect(headers.get('If-Match')).toBe('"4"')
  })

  it('remove definitivamente o vínculo entre empresa e rotina', async () => {
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(null, { status: 204 }))
    const client = createClient(fetchImplementation)

    await new CompanyService(client).removeRoutineAssignment(
      'company-1',
      'assignment-1',
      '"5"',
    )

    expect(fetchImplementation).toHaveBeenCalledWith(
      'https://api.example.com/api/v1/client-companies/company-1/routine-assignments/assignment-1/',
      expect.objectContaining({ method: 'DELETE' }),
    )
    const headers = new Headers(fetchImplementation.mock.calls[0]?.[1]?.headers)
    expect(headers.get('X-CSRFToken')).toBe('csrf-token')
    expect(headers.get('If-Match')).toBe('"5"')
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

  it('arquiva e restaura rotina com CSRF e If-Match', async () => {
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(
        jsonResponse({ id: 'routine-1', archivedAt: null }),
      )
    const client = createClient(fetchImplementation)
    const service = new RoutineService(client)

    await service.archive('routine-1', '"7"')
    await service.restore('routine-1', '"8"')

    expect(fetchImplementation.mock.calls.map(([url]) => url)).toEqual([
      'https://api.example.com/api/v1/routines/routine-1/',
      'https://api.example.com/api/v1/routines/routine-1/restore/',
    ])
    expect(fetchImplementation.mock.calls[0]?.[1]).toMatchObject({
      method: 'DELETE',
    })
    expect(fetchImplementation.mock.calls[1]?.[1]).toMatchObject({
      method: 'POST',
      body: '{}',
    })
    expect(
      new Headers(fetchImplementation.mock.calls[0]?.[1]?.headers).get(
        'If-Match',
      ),
    ).toBe('"7"')
    expect(
      new Headers(fetchImplementation.mock.calls[1]?.[1]?.headers).get(
        'If-Match',
      ),
    ).toBe('"8"')
  })

  it('lista todas as rotinas, incluindo as arquivadas quando solicitado', async () => {
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({
          next: 'https://api.example.com/api/v1/routines/?page=2',
          results: [{ id: 'routine-1' }],
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ next: null, results: [{ id: 'routine-2' }] }),
      )
    const client = createClient(fetchImplementation)

    await expect(new RoutineService(client).listAll(true)).resolves.toEqual([
      { id: 'routine-1' },
      { id: 'routine-2' },
    ])
    expect(fetchImplementation.mock.calls.map(([url]) => url)).toEqual([
      'https://api.example.com/api/v1/routines/?includeArchived=true',
      'https://api.example.com/api/v1/routines/?page=2',
    ])
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

  it('envia convite de colaborador pela rota de membership invitations', async () => {
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ id: 'invitation-1' }, 201))
    const client = createClient(fetchImplementation)

    await new OrganizationMemberService(client).invite({
      email: 'novo@example.com',
      displayName: 'Novo colaborador',
      role: 'member',
    })

    expect(fetchImplementation.mock.calls[0]?.[0]).toBe(
      'https://api.example.com/api/v1/membership-invitations/',
    )
    expect(fetchImplementation.mock.calls[0]?.[1]).toMatchObject({
      method: 'POST',
      body: JSON.stringify({
        email: 'novo@example.com',
        displayName: 'Novo colaborador',
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
