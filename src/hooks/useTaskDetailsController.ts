import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { useTaskMutations } from './mutations/useTaskMutations'
import { queryKeys, type OrganizationQueryScope } from '../query/queryKeys'
import { departmentService } from '../services/departmentService'
import type { TaskPatchInput } from '../services/taskService'
import type {
  AppUser,
  CompetenceStatus,
  Department,
  Employee,
  RoutineControlData,
  RoutineStatus,
  Task,
  TaskRelations,
} from '../types/domain'
import {
  canAssignTask,
  canTransitionTask,
  getAllowedTaskTransitionStatuses,
} from '../utils/permissions'
import { buildTaskRelations } from '../utils/routineRelations'

interface UseTaskDetailsControllerOptions {
  scope: OrganizationQueryScope
  period: string
  data: RoutineControlData | null
  user: AppUser
  competenceStatus?: CompetenceStatus
  selectedDepartment: Department | null
}

export function useTaskDetailsController({
  scope,
  period,
  data,
  user,
  competenceStatus,
  selectedDepartment,
}: UseTaskDetailsControllerOptions) {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [transitionError, setTransitionError] = useState<string | null>(null)
  const selectedTask =
    data?.tasks.find((task) => task.id === selectedTaskId) ?? null
  const isProjectedCompetence = competenceStatus === 'projected'
  const canOperateTasks =
    isProjectedCompetence || competenceStatus === 'finalized'
  const { updateTask, transitionTask, createAdHocTask, isTransitioning } =
    useTaskMutations({ ...scope, period })

  useEffect(() => {
    if (selectedTaskId && !selectedTask) setSelectedTaskId(null)
  }, [selectedTask, selectedTaskId])

  const canOperateTask = useCallback(
    (task: Task): boolean =>
      canOperateTasks && (isProjectedCompetence || hasMaterializedTask(task)),
    [canOperateTasks, isProjectedCompetence],
  )
  const canEditSelectedTask = Boolean(
    selectedTask &&
    canOperateTask(selectedTask) &&
    canAssignTask(user, selectedTask),
  )
  const getAllowedStatusChanges = useCallback(
    (task: Task): readonly RoutineStatus[] =>
      canOperateTask(task) ? getAllowedTaskTransitionStatuses(user, task) : [],
    [canOperateTask, user],
  )
  const selectedTaskStatusChanges = selectedTask
    ? getAllowedStatusChanges(selectedTask)
    : []
  const taskAssigneesQuery = useQuery({
    queryKey: selectedTask
      ? queryKeys.taskAssignees(scope, selectedTask.departmentId)
      : (['task-assignees', 'unavailable'] as const),
    queryFn: ({ signal }) => {
      if (!selectedTask) {
        throw new Error('Selecione uma tarefa para carregar responsáveis.')
      }

      return departmentService.getTaskAssignees(
        selectedTask.departmentId,
        signal,
      )
    },
    enabled: canEditSelectedTask,
  })
  const taskAssignees = useMemo(
    () =>
      (taskAssigneesQuery.data?.data ?? []).map((assignee) => ({
        id: assignee.id,
        name: assignee.displayName,
        role: assignee.organizationRole,
        departmentAccesses:
          assignee.departmentRole && selectedTask
            ? [
                {
                  departmentId: selectedTask.departmentId,
                  role: assignee.departmentRole,
                },
              ]
            : [],
        active: true,
      })),
    [selectedTask, taskAssigneesQuery.data],
  )
  const selectedRelations = useMemo<TaskRelations>(() => {
    if (!selectedTask || !data) return {}

    const relations = buildTaskRelations(
      selectedTask,
      data,
      selectedTask.departmentId === selectedDepartment?.id
        ? selectedDepartment
        : null,
    )

    if (selectedTask.kind !== 'ad_hoc') return relations

    return {
      ...relations,
      client: relations.client ?? {
        id: 'loose-client',
        code: 'AV',
        name: 'Tarefa avulsa',
      },
      routine: relations.routine ?? {
        id: 'loose-routine',
        departmentId: selectedTask.departmentId,
        name: selectedTask.title ?? 'Tarefa avulsa',
        shortName: selectedTask.title ?? 'Tarefa avulsa',
        description: selectedTask.description ?? selectedTask.notes,
      },
    }
  }, [data, selectedDepartment, selectedTask])
  const selectedTaskEmployees = useMemo(() => {
    const employees = new Map<string, Employee>()
    const taskEmployees = [
      ...(selectedRelations.employees ?? []),
      ...taskAssignees,
    ]

    taskEmployees.forEach((employee) => employees.set(employee.id, employee))

    return [...employees.values()]
  }, [selectedRelations.employees, taskAssignees])
  const openTask = useCallback((taskId: string) => {
    setTransitionError(null)
    setSelectedTaskId(taskId)
  }, [])
  const closeTask = useCallback(() => setSelectedTaskId(null), [])
  const getTaskForUpdate = useCallback(
    (taskId: string): Task => {
      const task =
        selectedTask?.id === taskId
          ? selectedTask
          : data?.tasks.find((item) => item.id === taskId)

      if (!task) {
        throw new Error(
          'Não foi possível localizar a tarefa para salvar a alteração.',
        )
      }

      return task
    },
    [data, selectedTask],
  )
  const updateTaskDetails = useCallback(
    async (taskId: string, input: TaskPatchInput): Promise<void> => {
      const task = getTaskForUpdate(taskId)

      if (!canOperateTask(task)) {
        throw new Error('A competência atual não permite alterar esta tarefa.')
      }

      await updateTask(taskId, input)
    },
    [canOperateTask, getTaskForUpdate, updateTask],
  )
  const handleTaskAssigneeChange = useCallback(
    async (taskId: string, assigneeId: string | null): Promise<void> => {
      const task = getTaskForUpdate(taskId)

      if (!canAssignTask(user, task)) {
        throw new Error('Você não tem permissão para alterar o responsável.')
      }

      if (task.assigneeId === assigneeId) return

      await updateTaskDetails(taskId, { assigneeMemberId: assigneeId })
    },
    [getTaskForUpdate, updateTaskDetails, user],
  )
  const handleTaskDueDateChange = useCallback(
    async (taskId: string, dueDate: string): Promise<void> => {
      if (!dueDate) throw new Error('Informe uma data de prazo válida.')

      const task = getTaskForUpdate(taskId)
      if (task.dueDate === dueDate) return

      await updateTaskDetails(taskId, { dueDate })
    },
    [getTaskForUpdate, updateTaskDetails],
  )
  const handleTaskContentChange = useCallback(
    async (
      taskId: string,
      content: { title: string; description: string },
    ): Promise<void> => {
      if (content.title.length > 200) {
        throw new Error('O título pode ter no máximo 200 caracteres.')
      }

      if (content.description.length > 5000) {
        throw new Error('A descrição pode ter no máximo 5.000 caracteres.')
      }

      const task = getTaskForUpdate(taskId)
      if (
        (task.title ?? '') === content.title &&
        (task.description ?? '') === content.description
      ) {
        return
      }

      await updateTaskDetails(taskId, content)
    },
    [getTaskForUpdate, updateTaskDetails],
  )
  const handleTaskNotesChange = useCallback(
    async (taskId: string, notes: string): Promise<void> => {
      if (notes.length > 5000) {
        throw new Error('A observação deve ter no máximo 5.000 caracteres.')
      }

      const task = getTaskForUpdate(taskId)
      if ((task.notes ?? '') === notes) return

      await updateTaskDetails(taskId, { observation: notes })
    },
    [getTaskForUpdate, updateTaskDetails],
  )
  const requestTaskTransition = useCallback(
    async (taskId: string, status: RoutineStatus) => {
      const task = data?.tasks.find((item) => item.id === taskId)

      if (
        !task ||
        !canOperateTask(task) ||
        !canTransitionTask(user, task, status) ||
        isTransitioning
      ) {
        return
      }

      setTransitionError(null)

      try {
        await transitionTask(taskId, status)
      } catch {
        setTransitionError(
          'N\u00e3o foi poss\u00edvel alterar o estado da tarefa. Tente novamente.',
        )
      }
    },
    [canOperateTask, data?.tasks, isTransitioning, transitionTask, user],
  )

  return {
    selectedTask,
    selectedRelations,
    selectedTaskEmployees,
    selectedTaskStatusChanges,
    canEditSelectedTask,
    canOperateTask,
    getAllowedStatusChanges,
    openTask,
    closeTask,
    requestTaskTransition,
    handleTaskAssigneeChange,
    handleTaskDueDateChange,
    handleTaskContentChange,
    handleTaskNotesChange,
    createAdHocTask,
    transitionError,
    dismissTransitionError: () => setTransitionError(null),
  }
}

function hasMaterializedTask(
  task: Task,
): task is Task & { taskId: string; competenceId: string } {
  return Boolean(task.taskId && task.competenceId)
}
