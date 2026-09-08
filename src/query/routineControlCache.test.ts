import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'

import {
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
