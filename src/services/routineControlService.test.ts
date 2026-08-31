import { describe, expect, it, vi } from 'vitest'

import { HttpClient } from './httpClient'
import { RoutineControlService } from './routineControlService'

describe('RoutineControlService', () => {
  it('adapta telas de planilha e sua projeção mensal para o formato da aplicação', async () => {
    const fetchImplementation = vi.fn(
      async (input: RequestInfo | URL): Promise<Response> => {
        const url = new URL(String(input))

        if (url.pathname === '/api/v1/departments/') {
          return jsonResponse({
            next: null,
            results: [{ id: 'department-1', name: 'Fiscal' }],
          })
        }

        if (url.pathname === '/api/v1/client-companies/') {
          return jsonResponse({
            next: null,
            results: [
              {
                id: 'company-1',
                code: '001',
                name: 'Empresa exemplo',
                legalName: 'Empresa exemplo LTDA',
                cnpj: '12.345.678/0001-90',
                email: 'contato@example.com',
                mobilePhone: '11999999999',
                taxRegime: 'Simples Nacional',
                archivedAt: null,
                createdAt: '2026-01-01T00:00:00Z',
              },
            ],
          })
        }

        if (url.pathname === '/api/v1/routines/') {
          return jsonResponse({
            next: null,
            results: [
              {
                id: 'routine-1',
                departmentId: 'department-1',
                name: 'Apuração mensal',
                shotname: 'APM',
                currentVersion: {
                  description: 'Apurar impostos mensais.',
                  recurrence: 'monthly',
                  defaultDueDays: 10,
                  recurrenceMonths: [],
                },
                archivedAt: null,
                createdAt: '2026-01-01T00:00:00Z',
              },
            ],
          })
        }

        if (url.pathname === '/api/v1/screens/') {
          return jsonResponse({
            next: null,
            results: [
              {
                id: 'screen-1',
                name: 'Fiscal mensal',
                type: 'spreadsheet',
                departmentId: 'department-1',
                position: 1,
                archivedAt: null,
              },
            ],
          })
        }

        if (url.pathname === '/api/v1/competences/by-period/2026-08/') {
          return jsonResponse({
            id: 'competence-1',
            period: '2026-08',
            status: 'open',
            persistence: 'persisted',
            version: 1,
            taskOccurrenceCount: 1,
            scheduleRevision: 1,
            warning: null,
          })
        }

        if (
          url.pathname ===
          '/api/v1/competences/by-period/2026-08/task-occurrences/'
        ) {
          expect(url.searchParams.get('pageSize')).toBe('100')
          return jsonResponse({ next: null, results: [] })
        }

        if (url.pathname === '/api/v1/screens/screen-1/') {
          return jsonResponse({
            id: 'screen-1',
            name: 'Fiscal mensal',
            type: 'spreadsheet',
            departmentId: 'department-1',
            position: 1,
            archivedAt: null,
            companies: [
              {
                id: 'company-1',
                code: '001',
                name: 'Empresa exemplo',
                legalName: 'Empresa exemplo LTDA',
                position: 1,
              },
            ],
            routines: [
              {
                id: 'routine-1',
                shotname: 'APM',
                name: 'Apuração mensal',
                departmentId: 'department-1',
                position: 1,
              },
            ],
          })
        }

        if (url.pathname === '/api/v1/screens/screen-1/projection/') {
          expect(url.searchParams.get('period')).toBe('2026-08')

          return jsonResponse({
            type: 'spreadsheet',
            period: '2026-08',
            competenceId: null,
            screen: { id: 'screen-1' },
            rows: [],
            columns: [],
            cells: [
              {
                companyId: 'company-1',
                routineId: 'routine-1',
                tasks: [
                  {
                    occurrenceKey: 'occurrence-1',
                    taskId: null,
                    etag: 'virtual:occurrence-1',
                    persistence: 'virtual',
                    referenceMonth: '2026-08-01',
                    departmentId: 'department-1',
                    clientCompanyId: 'company-1',
                    routineId: 'routine-1',
                    title: 'Apuração mensal',
                    description: 'Apurar impostos mensais.',
                    observation: '',
                    links: [],
                    dueDate: '2026-08-10',
                    status: 'pending',
                    assignee: {
                      id: 'member-1',
                      displayName: 'Analista Fiscal',
                    },
                    createdAt: null,
                    updatedAt: null,
                  },
                ],
              },
            ],
          })
        }

        if (url.pathname === '/api/v1/competences/competence-1/tasks/') {
          expect(url.searchParams.get('kind')).toBe('ad_hoc')

          return jsonResponse({
            next: null,
            previous: null,
            results: [
              {
                id: 'task-1',
                occurrenceKey: null,
                competenceId: 'competence-1',
                competence: '2026-08',
                kind: 'ad_hoc',
                status: 'in_progress',
                title: 'Conferir pendência',
                description: 'Validar documento recebido.',
                observation: '',
                departmentId: 'department-1',
                departmentName: 'Fiscal',
                clientCompanyId: 'company-1',
                routineId: null,
                dueDate: '2026-08-15',
                assignee: {
                  id: 'member-2',
                  displayName: 'Coordenadora Fiscal',
                },
                links: [],
                version: 1,
                archivedAt: null,
                createdAt: '2026-08-01T08:00:00Z',
                updatedAt: '2026-08-01T08:00:00Z',
              },
            ],
          })
        }

        throw new Error(`Rota não esperada: ${url}`)
      },
    ) as unknown as typeof fetch
    const service = new RoutineControlService(
      new HttpClient({
        baseUrl: 'https://api.example.com',
        fetchImplementation,
        requestIdFactory: () => 'request-id',
      }),
    )

    const response = await service.get('2026-08')

    expect(response.meta.period).toBe('2026-08')
    expect(response.data.screens).toEqual([
      expect.objectContaining({
        id: 'screen-1',
        departmentId: 'department-1',
        name: 'Fiscal mensal',
      }),
    ])
    expect(response.data.clients[0]).toMatchObject({
      id: 'company-1',
      taxRegime: 'Simples Nacional',
    })
    expect(response.data.routines[0]).toMatchObject({
      id: 'routine-1',
      shortName: 'APM',
      recurrence: 'monthly',
    })
    expect(response.data.spreadsheetProjections).toEqual([
      expect.objectContaining({
        screen: { id: 'screen-1' },
        competenceId: null,
        rows: [],
        columns: [],
        cells: [
          expect.objectContaining({
            companyId: 'company-1',
            routineId: 'routine-1',
            tasks: [
              expect.objectContaining({
                occurrenceKey: 'occurrence-1',
                etag: 'virtual:occurrence-1',
              }),
            ],
          }),
        ],
      }),
    ])
    expect(response.data.tasks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'occurrence-1',
          etag: 'virtual:occurrence-1',
          assigneeId: 'member-1',
          period: '2026-08',
          status: 'pending',
        }),
        expect.objectContaining({
          id: 'task-1',
          taskId: 'task-1',
          competenceId: 'competence-1',
          kind: 'ad_hoc',
          status: 'in_progress',
        }),
      ]),
    )
    expect(response.data.employees).toEqual(
      expect.arrayContaining([
        { id: 'member-1', name: 'Analista Fiscal', active: true },
        { id: 'member-2', name: 'Coordenadora Fiscal', active: true },
      ]),
    )
  })
})

function jsonResponse(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
  })
}
