import { filterTasksByClient, filterTasksByRoutine } from './routineFilters'
import { normalizeRoutineData } from './normalizeRoutineData'
import { getRoutineStatusDetailLabel } from '../constants/routineStatus'
import type {
  Client,
  NormalizedRoutineData,
  Routine,
  RoutineControlData,
  RoutineListFilter,
  RoutineListItem,
  RoutineListMode,
  RoutineListViewData,
  Task,
} from '../types/domain'
import { getCompanyCodeLabel } from './companyCode'

export const ROUTINE_LIST_MODE = {
  CLIENT: 'client',
  ROUTINE: 'routine',
  GLOBAL: 'global',
  MY_TASKS: 'my_tasks',
} as const satisfies Record<string, RoutineListMode>

export function buildRoutineListViewData({
  data,
  filter,
}: {
  data: RoutineControlData
  filter: RoutineListFilter
}): RoutineListViewData {
  const relations = normalizeRoutineData(data)
  const tasks = selectTasks(data.tasks, filter)
  const selectedClient = filter.id
    ? relations.clientsById.get(filter.id)
    : undefined
  const selectedRoutine = filter.id
    ? relations.routinesById.get(filter.id)
    : undefined

  return {
    title: getListTitle(filter, selectedClient, selectedRoutine),
    description: getListDescription(filter),
    items: tasks.map((task) => buildRoutineListItem(task, filter, relations)),
  }
}

function selectTasks(tasks: Task[], filter: RoutineListFilter): Task[] {
  if (filter.type === ROUTINE_LIST_MODE.CLIENT) {
    return filterTasksByClient(tasks, filter.id)
  }

  if (filter.type === ROUTINE_LIST_MODE.ROUTINE) {
    return filterTasksByRoutine(tasks, filter.id)
  }

  if (filter.type === ROUTINE_LIST_MODE.MY_TASKS) {
    return tasks.filter(
      (task) => task.kind === 'ad_hoc' && task.assigneeId === filter.assigneeId,
    )
  }

  // Tarefas avulsas são pessoais e ficam exclusivamente em “Minhas tarefas”.
  return tasks.filter((task) => task.kind !== 'ad_hoc')
}

function getListTitle(
  filter: RoutineListFilter,
  selectedClient?: Client,
  selectedRoutine?: Routine,
): string {
  if (filter.type === ROUTINE_LIST_MODE.CLIENT) {
    return selectedClient?.name ?? 'Rotinas da empresa'
  }

  if (filter.type === ROUTINE_LIST_MODE.ROUTINE) {
    return selectedRoutine?.name ?? 'Empresas da rotina'
  }

  if (filter.type === ROUTINE_LIST_MODE.MY_TASKS) {
    return 'Minhas tarefas'
  }

  return 'Tarefas - Fiscal'
}

function getListDescription(filter: RoutineListFilter): string {
  if (filter.type === ROUTINE_LIST_MODE.CLIENT)
    return 'Todas as rotinas desta empresa.'
  if (filter.type === ROUTINE_LIST_MODE.ROUTINE)
    return 'Todas as empresas vinculadas a esta rotina.'
  if (filter.type === ROUTINE_LIST_MODE.MY_TASKS)
    return 'Tarefas avulsas criadas por você.'
  return 'Todas as tarefas recorrentes acessíveis ao usuário.'
}

function buildRoutineListItem(
  task: Task,
  filter: RoutineListFilter,
  relations: NormalizedRoutineData,
): RoutineListItem {
  const client = task.clientId
    ? relations.clientsById.get(task.clientId)
    : undefined
  const routine = task.routineId
    ? relations.routinesById.get(task.routineId)
    : undefined
  const employee = task.assigneeId
    ? relations.employeesById.get(task.assigneeId)
    : undefined
  const department = relations.departmentsById.get(task.departmentId)
  const isClientMode = filter.type === ROUTINE_LIST_MODE.CLIENT
  const isRoutineMode = filter.type === ROUTINE_LIST_MODE.ROUTINE
  const isAdHocTask = task.kind === 'ad_hoc'
  const looseTitle = task.title ?? 'Tarefa avulsa'
  const clientName = client?.name ?? 'Sem empresa'
  const routineName = routine?.name ?? 'Sem rotina'
  const looseContextLabel =
    [client?.name, routine?.name].filter(Boolean).join(' - ') || 'Tarefa avulsa'
  const statusDetailLabel = getRoutineStatusDetailLabel(
    task.status,
    task.statusDetail,
  )
  const primaryLabel = isAdHocTask
    ? looseTitle
    : isClientMode
      ? routineName
      : isRoutineMode
        ? clientName
        : `${clientName} - ${routineName}`

  return {
    id: task.id,
    task,
    client,
    routine,
    department,
    originType: filter.type,
    primaryLabel,
    title: primaryLabel,
    companyCode: client
      ? getCompanyCodeLabel(client.code)
      : isAdHocTask
        ? 'AV'
        : getCompanyCodeLabel(),
    companyName: primaryLabel,
    routineName: isAdHocTask ? looseContextLabel : routineName,
    departmentName: department?.name ?? 'Sem departamento',
    period: task.period,
    status: task.status,
    statusDetail: task.statusDetail,
    statusDetailLabel,
    dueDate: task.dueDate,
    assigneeId: task.assigneeId,
    assigneeName: employee?.name ?? 'Nao atribuido',
    notes: task.notes,
    indicators: task.indicators,
  }
}
