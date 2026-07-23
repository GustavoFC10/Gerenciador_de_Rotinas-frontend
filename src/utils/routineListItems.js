import { filterTasksByClient, filterTasksByRoutine } from './routineFilters.js'
import { normalizeRoutineData } from './normalizeRoutineData.js'
import { getRoutineStatusDetailLabel } from '../constants/routineStatus.js'

export const ROUTINE_LIST_MODE = {
  CLIENT: 'client',
  ROUTINE: 'routine',
  GLOBAL: 'global',
  MY_TASKS: 'my_tasks',
}

export function buildRoutineListViewData({ data, filter }) {
  const relations = normalizeRoutineData(data)
  const tasks = selectTasks(data.tasks, filter)
  const selectedClient = relations.clientsById.get(filter.id)
  const selectedRoutine = relations.routinesById.get(filter.id)

  return {
    title: getListTitle(filter, selectedClient, selectedRoutine),
    description: getListDescription(filter),
    items: tasks.map((task) => buildRoutineListItem(task, filter, relations)),
  }
}

function selectTasks(tasks, filter) {
  if (filter.type === ROUTINE_LIST_MODE.CLIENT) {
    return filterTasksByClient(tasks, filter.id)
  }

  if (filter.type === ROUTINE_LIST_MODE.ROUTINE) {
    return filterTasksByRoutine(tasks, filter.id)
  }

  if (filter.type === ROUTINE_LIST_MODE.MY_TASKS) {
    return tasks.filter(
      (task) => task.isLoose && task.assigneeId === filter.assigneeId,
    )
  }

  return tasks
}

function getListTitle(filter, selectedClient, selectedRoutine) {
  if (filter.type === ROUTINE_LIST_MODE.CLIENT) {
    return selectedClient?.name ?? 'Rotinas da empresa'
  }

  if (filter.type === ROUTINE_LIST_MODE.ROUTINE) {
    return selectedRoutine?.name ?? 'Empresas da rotina'
  }

  if (filter.type === ROUTINE_LIST_MODE.MY_TASKS) {
    return 'Minhas tarefas avulsas'
  }

  return 'Tarefas - Fiscal'
}

function getListDescription(filter) {
  if (filter.type === ROUTINE_LIST_MODE.CLIENT)
    return 'Todas as rotinas desta empresa.'
  if (filter.type === ROUTINE_LIST_MODE.ROUTINE)
    return 'Todas as empresas vinculadas a esta rotina.'
  if (filter.type === ROUTINE_LIST_MODE.MY_TASKS)
    return 'Tarefas sem rotina ou empresa obrigatoria.'
  return 'Todas as tarefas fiscais acessiveis ao usuario.'
}

function buildRoutineListItem(task, filter, relations) {
  const client = relations.clientsById.get(task.clientId)
  const routine = relations.routinesById.get(task.routineId)
  const employee = relations.employeesById.get(task.assigneeId)
  const department = relations.departmentsById.get(task.departmentId)
  const isClientMode = filter.type === ROUTINE_LIST_MODE.CLIENT
  const isRoutineMode = filter.type === ROUTINE_LIST_MODE.ROUTINE
  const isLooseTask = Boolean(task.isLoose)
  const looseTitle = task.title ?? 'Tarefa avulsa'
  const clientName = client?.name ?? 'Sem empresa'
  const routineName = routine?.name ?? 'Sem rotina'
  const looseContextLabel =
    [client?.name, routine?.name].filter(Boolean).join(' - ') || 'Tarefa avulsa'
  const statusDetailLabel = getRoutineStatusDetailLabel(
    task.status,
    task.statusDetail,
  )
  const primaryLabel = isLooseTask
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
    companyCode: isLooseTask ? (client?.code ?? 'AV') : (client?.code ?? '--'),
    companyName: primaryLabel,
    routineName: isLooseTask ? looseContextLabel : routineName,
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
