import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'

import {
  markRoutineInactiveInOperationalContexts,
  replaceTaskInOperationalContext,
  upsertClientInOperationalContexts,
} from './routineControlCache'
import { queryKeys } from './queryKeys'
import type { RoutineControlResponse, Task } from '../types/domain'

const scope = { organizationId: 'organization-1', membershipId: 'member-1' }

describe('routineControlCache', () => {
  it('propaga um catálogo de clientes para todas as competências em cache', () => {
    const queryClient = new QueryClient()
    queryClient.setQueryData(
      queryKeys.routineControl(scope, '2026-08'),
      createResponse('2026-08'),
    )
    queryClient.setQueryData(
      queryKeys.routineControl(scope, '2026-09'),
      createResponse('2026-09'),
    )

    upsertClientInOperationalContexts(queryClient, scope, {
      id: 'client-1',
      code: '001',
      name: 'Empresa atualizada',
      active: true,
    })

    expect(getResponse(queryClient, '2026-08').data.clients[0]?.name).toBe(
      'Empresa atualizada',
    )
    expect(getResponse(queryClient, '2026-09').data.clients[0]?.name).toBe(
      'Empresa atualizada',
    )
  })

  it('substitui uma tarefa somente na competência afetada', () => {
    const queryClient = new QueryClient()
    const august = createResponse('2026-08')
    const september = createResponse('2026-09')
    queryClient.setQueryData(queryKeys.routineControl(scope, '2026-08'), august)
    queryClient.setQueryData(
      queryKeys.routineControl(scope, '2026-09'),
      september,
    )

    replaceTaskInOperationalContext({
      queryClient,
      scope,
      period: '2026-08',
      task: { ...createTask('2026-08'), status: 'completed' },
    })

    expect(getResponse(queryClient, '2026-08').data.tasks[0]?.status).toBe(
      'completed',
    )
    expect(getResponse(queryClient, '2026-09').data.tasks[0]?.status).toBe(
      'pending',
    )
  })

  it('remove a rotina arquivada das telas e projeções em cache', () => {
    const queryClient = new QueryClient()
    const response = createResponse('2026-08')
    response.data.routines = [
      {
        id: 'routine-1',
        departmentId: 'department-1',
        name: 'Apuração mensal',
        shortName: 'Apuração',
        active: true,
      },
    ]
    response.data.screens = [
      {
        id: 'screen-1',
        name: 'Fiscal',
        type: 'spreadsheet',
        departmentId: 'department-1',
        departmentName: 'Fiscal',
        position: 1,
        version: 1,
        archivedAt: null,
        createdAt: '2026-08-01T00:00:00Z',
        updatedAt: '2026-08-01T00:00:00Z',
        companies: [],
        routines: [
          {
            id: 'routine-1',
            name: 'Apuração mensal',
            shotname: 'Apuração',
            departmentId: 'department-1',
            position: 1,
          },
        ],
      },
    ]
    response.data.spreadsheetProjections = [
      {
        type: 'spreadsheet',
        competenceId: 'competence-1',
        period: '2026-08',
        screen: {
          id: 'screen-1',
          name: 'Fiscal',
          type: 'spreadsheet',
          departmentId: 'department-1',
          departmentName: 'Fiscal',
          position: 1,
          version: 1,
          archivedAt: null,
          createdAt: '2026-08-01T00:00:00Z',
          updatedAt: '2026-08-01T00:00:00Z',
        },
        rows: [],
        columns: [
          {
            id: 'routine-1',
            name: 'Apuração mensal',
            shotname: 'Apuração',
            departmentId: 'department-1',
            position: 1,
          },
        ],
        cells: [{ companyId: 'client-1', routineId: 'routine-1', tasks: [] }],
      },
    ]
    queryClient.setQueryData(
      queryKeys.routineControl(scope, '2026-08'),
      response,
    )
    queryClient.setQueryData(
      queryKeys.companyRoutineAssignments(scope, 'client-1'),
      [{ id: 'assignment-1', routineId: 'routine-1' }],
    )

    markRoutineInactiveInOperationalContexts(queryClient, scope, 'routine-1')

    const updated = getResponse(queryClient, '2026-08').data
    expect(updated.routines[0]?.active).toBe(false)
    expect(updated.screens[0]?.routines).toEqual([])
    expect(updated.spreadsheetProjections[0]?.columns).toEqual([])
    expect(updated.spreadsheetProjections[0]?.cells).toEqual([])
    expect(
      queryClient.getQueryData(
        queryKeys.companyRoutineAssignments(scope, 'client-1'),
      ),
    ).toEqual([])
  })
})

function getResponse(queryClient: QueryClient, period: string) {
  const response = queryClient.getQueryData<RoutineControlResponse>(
    queryKeys.routineControl(scope, period),
  )

  if (!response) throw new Error('Resposta operacional ausente no teste.')
  return response
}

function createResponse(period: string): RoutineControlResponse {
  return {
    data: {
      departments: [],
      clients: [
        {
          id: 'client-1',
          code: '001',
          name: 'Empresa original',
          active: true,
        },
      ],
      routines: [],
      employees: [],
      screens: [],
      spreadsheetProjections: [],
      tasks: [createTask(period)],
    },
    meta: { period, generatedAt: '2026-08-01T00:00:00Z' },
  }
}

function createTask(period: string): Task {
  return {
    id: 'task-1',
    taskId: 'task-1',
    competenceId: 'competence-1',
    kind: 'ad_hoc',
    clientId: 'client-1',
    routineId: null,
    departmentId: 'department-1',
    assigneeId: null,
    status: 'pending',
    period,
    dueDate: period + '-10',
    completedAt: null,
    indicators: { attachments: 0 },
  }
}
