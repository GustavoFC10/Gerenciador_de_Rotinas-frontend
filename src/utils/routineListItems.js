import { filterTasksByClient, filterTasksByRoutine } from './routineFilters.js'
import { normalizeRoutineData } from './normalizeRoutineData.js'

export const ROUTINE_LIST_MODE = {
  CLIENT: 'client',
  ROUTINE: 'routine',
  GLOBAL: 'global',
  MY_TASKS: 'my_tasks',
  SEARCH: 'search',
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

  if (filter.type === ROUTINE_LIST_MODE.SEARCH) {
    return 'Busca'
  }

  return 'Lista global'
}

function getListDescription(filter) {
  if (filter.type === ROUTINE_LIST_MODE.CLIENT) return 'Todas as rotinas desta empresa.'
  if (filter.type === ROUTINE_LIST_MODE.ROUTINE) return 'Todas as empresas vinculadas a esta rotina.'
  if (filter.type === ROUTINE_LIST_MODE.MY_TASKS) return 'Tarefas sem rotina ou empresa obrigatoria.'
  if (filter.type === ROUTINE_LIST_MODE.SEARCH) return 'Resultados exibidos no mesmo formato da lista operacional.'
  return 'Todas as tarefas acessiveis ao usuario.'
}

function buildRoutineListItem(task, filter, relations) {
  const client = relations.clientsById.get(task.clientId)
  const routine = relations.routinesById.get(task.routineId)
  const employee = relations.employeesById.get(task.assigneeId)
  const department = relations.departmentsById.get(task.departmentId)
  const isClientMode = filter.type === ROUTINE_LIST_MODE.CLIENT
  const isLooseTask = Boolean(task.isLoose)
  const looseTitle = task.title ?? 'Tarefa avulsa'

  return {
    id: task.id,
    task,
    client,
    routine,
    department,
    title: isLooseTask
      ? looseTitle
      : isClientMode
        ? routine?.name ?? 'Sem rotina'
        : client?.name ?? 'Sem empresa',
    companyCode: isLooseTask ? 'AV' : client?.code ?? '--',
    companyName: isLooseTask
      ? looseTitle
      : isClientMode
        ? routine?.name ?? 'Sem rotina'
        : client?.name ?? 'Sem empresa',
    routineName: isLooseTask ? 'Tarefa avulsa' : routine?.name ?? 'Sem rotina',
    departmentName: department?.name ?? 'Sem departamento',
    period: task.period,
    status: task.status,
    dueDate: task.dueDate,
    assigneeName: employee?.name ?? 'Nao atribuido',
    notes: task.notes,
    indicators: task.indicators,
  }
}
