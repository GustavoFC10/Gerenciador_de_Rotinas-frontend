import { useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  appendTaskToOperationalContext,
  replaceTaskInOperationalContext,
} from '../../query/routineControlCache'
import { queryKeys, type OrganizationQueryScope } from '../../query/queryKeys'
import {
  toTaskAssignee,
  toTaskFromResource,
  toTaskFromScheduledOccurrence,
} from '../../query/routineControlMappers'
import { isApiError } from '../../services/httpClient'
import { competenceService } from '../../services/competenceService'
import {
  taskService,
  type AdHocTaskInput,
  type TaskPatchInput,
} from '../../services/taskService'
import type {
  RoutineControlResponse,
  RoutineStatus,
  Task,
} from '../../types/domain'

interface TaskMutationScope extends OrganizationQueryScope {
  period: string
}

interface TaskTransitionVariables {
  taskId: string
  status: RoutineStatus
  reason?: string
}

export function useTaskMutations({
  organizationId,
  membershipId,
  period,
}: TaskMutationScope) {
  const queryClient = useQueryClient()
  const scope = { organizationId, membershipId }

  const updateMutation = useMutation({
    mutationFn: async ({
      taskId,
      input,
    }: {
      taskId: string
      input: TaskPatchInput
    }) => {
      const task = getTask(queryClient, scope, period, taskId)

      try {
        if (isMaterializedTask(task)) {
          const etag = await getMaterializedTaskEtag(task)
          const response = await taskService.update(
            task.competenceId,
            task.taskId,
            input,
            etag,
          )
          const updatedTask = toTaskFromResource(
            response.data,
            response.etag ?? etag,
          )

          replaceTaskInOperationalContext({
            queryClient,
            scope,
            period,
            task: updatedTask,
            assignee: toTaskAssignee(response.data.assignee),
          })
          return updatedTask
        }

        if (!task.occurrenceKey || !task.etag) {
          throw new Error(
            'A tarefa nao contem a versao exigida pela API para salvar a alteracao.',
          )
        }

        const response = await taskService.updateOccurrence(
          task.period,
          task.occurrenceKey,
          input,
          task.etag,
        )
        const competenceId = await resolveScheduledTaskCompetenceId(
          task,
          response.data.taskId,
        )
        const updatedTask = toTaskFromScheduledOccurrence(
          response.data,
          response.etag ?? response.data.etag,
          competenceId,
        )

        replaceTaskInOperationalContext({
          queryClient,
          scope,
          period,
          task: updatedTask,
          assignee: toTaskAssignee(response.data.assignee),
        })
        return updatedTask
      } catch (error) {
        const refreshedAfterConflict = await refreshTaskAfterConflict({
          error,
          queryClient,
          scope,
          period,
          task,
        })
        if (refreshedAfterConflict) {
          throw new Error(
            'Esta tarefa foi alterada por outra pessoa. Os dados mais recentes foram carregados.',
            { cause: error },
          )
        }
        throw error
      }
    },
  })

  const transitionMutation = useMutation({
    mutationFn: async ({ taskId, status, reason }: TaskTransitionVariables) => {
      const task = getTask(queryClient, scope, period, taskId)
      const input = {
        targetStatus: status,
        ...(reason ? { reason } : {}),
      }

      try {
        if (isMaterializedTask(task)) {
          const etag = await getMaterializedTaskEtag(task)
          const response = await taskService.transition(
            task.competenceId,
            task.taskId,
            input,
            etag,
          )
          const updatedTask = toTaskFromResource(
            response.data,
            response.etag ?? etag,
          )

          replaceTaskInOperationalContext({
            queryClient,
            scope,
            period,
            task: updatedTask,
            assignee: toTaskAssignee(response.data.assignee),
          })
          return updatedTask
        }

        if (!task.occurrenceKey || !task.etag) {
          throw new Error(
            'A tarefa nao contem os identificadores exigidos pela API.',
          )
        }

        const response = await taskService.transitionOccurrence(
          task.period,
          task.occurrenceKey,
          input,
          task.etag,
        )
        const competenceId = await resolveScheduledTaskCompetenceId(
          task,
          response.data.taskId,
        )
        const updatedTask = toTaskFromScheduledOccurrence(
          response.data,
          response.etag ?? response.data.etag,
          competenceId,
        )

        replaceTaskInOperationalContext({
          queryClient,
          scope,
          period,
          task: updatedTask,
          assignee: toTaskAssignee(response.data.assignee),
        })
        return updatedTask
      } catch (error) {
        const refreshedAfterConflict = await refreshTaskAfterConflict({
          error,
          queryClient,
          scope,
          period,
          task,
        })
        if (refreshedAfterConflict) {
          throw new Error(
            'Esta tarefa foi alterada por outra pessoa. Os dados mais recentes foram carregados.',
            { cause: error },
          )
        }
        throw error
      }
    },
  })

  const createAdHocMutation = useMutation({
    mutationFn: async (input: AdHocTaskInput) => {
      const competenceResponse = await competenceService.getByPeriod(period)
      const projection = competenceResponse.data

      if (projection.status !== 'projected') {
        throw new Error('A competencia atual nao aceita novas tarefas.')
      }

      const createdCompetence = projection.id
        ? null
        : await competenceService.create(period)
      const competenceId = projection.id ?? createdCompetence?.data.id

      if (
        !competenceId ||
        (createdCompetence && createdCompetence.data.status !== 'projected')
      ) {
        throw new Error(
          'Nao foi possivel preparar a competencia para a nova tarefa.',
        )
      }

      const response = await taskService.createAdHoc(
        competenceId,
        input,
        `ad-hoc-${globalThis.crypto.randomUUID()}`,
      )
      const task = toTaskFromResource(response.data, response.etag)

      appendTaskToOperationalContext({
        queryClient,
        scope,
        period,
        task,
        assignee: toTaskAssignee(response.data.assignee),
      })
      return task
    },
  })

  return {
    updateTask: useCallback(
      (taskId: string, input: TaskPatchInput) =>
        updateMutation.mutateAsync({ taskId, input }),
      [updateMutation],
    ),
    transitionTask: useCallback(
      (taskId: string, status: RoutineStatus, reason?: string) =>
        transitionMutation.mutateAsync({ taskId, status, reason }),
      [transitionMutation],
    ),
    createAdHocTask: createAdHocMutation.mutateAsync,
    isTransitioning: transitionMutation.isPending,
  }
}

function getTask(
  queryClient: ReturnType<typeof useQueryClient>,
  scope: OrganizationQueryScope,
  period: string,
  taskId: string,
): Task {
  const response = queryClient.getQueryData<RoutineControlResponse>(
    queryKeys.routineControl(scope, period),
  )
  const task = response?.data.tasks.find((item) => item.id === taskId)

  if (!task) {
    throw new Error(
      'Nao foi possivel localizar a tarefa para salvar a alteracao.',
    )
  }

  return task
}

function isMaterializedTask(
  task: Task,
): task is Task & { taskId: string; competenceId: string } {
  return Boolean(task.taskId && task.competenceId)
}

async function getMaterializedTaskEtag(
  task: Task & { taskId: string; competenceId: string },
): Promise<string> {
  if (task.etag) return task.etag

  const currentTask = await taskService.get(task.competenceId, task.taskId)

  if (!currentTask.etag) {
    throw new Error('A API nao informou a versao atual da tarefa para salvar.')
  }

  return currentTask.etag
}

async function resolveScheduledTaskCompetenceId(
  task: Task,
  responseTaskId: string | null,
): Promise<string | null> {
  if (task.competenceId || !responseTaskId) return task.competenceId ?? null

  const response = await competenceService.getByPeriod(task.period)
  return response.data.id
}

async function refreshTaskAfterConflict({
  error,
  queryClient,
  scope,
  period,
  task,
}: {
  error: unknown
  queryClient: ReturnType<typeof useQueryClient>
  scope: OrganizationQueryScope
  period: string
  task: Task
}): Promise<boolean> {
  if (!isApiError(error) || error.status !== 412) return false

  if (isMaterializedTask(task)) {
    const response = await taskService.get(task.competenceId, task.taskId)
    replaceTaskInOperationalContext({
      queryClient,
      scope,
      period,
      task: toTaskFromResource(response.data, response.etag),
      assignee: toTaskAssignee(response.data.assignee),
    })
    return true
  }

  if (!task.occurrenceKey) return false

  const response = await taskService.getOccurrence(
    task.period,
    task.occurrenceKey,
  )
  replaceTaskInOperationalContext({
    queryClient,
    scope,
    period,
    task: toTaskFromScheduledOccurrence(
      response.data,
      response.etag ?? response.data.etag,
      task.competenceId ?? null,
    ),
    assignee: toTaskAssignee(response.data.assignee),
  })
  return true
}
