import { useEffect, useMemo, useState } from 'react'

import RoutineDetailsCard from './components/routine-control/details/RoutineDetailsCard.jsx'
import RoutineDetailsCardCompact from './components/routine-control/details/RoutineDetailsCardCompact.jsx'
import RoutineDetailsCardPanel from './components/routine-control/details/RoutineDetailsCardPanel.jsx'
import RoutineListComparison from './components/routine-control/list/RoutineListComparison.jsx'
import { buildRoutineListSampleItems } from './components/routine-control/list/routineListSample.js'
import RoutineControlTable from './components/routine-control/spreadsheet/RoutineControlTable.jsx'
import { routineStatusConfig } from './constants/routineStatus.js'
import { getRoutineControl } from './services/routineControlService.js'

const detailsCardByDepartment = {
  'dept-fiscal': RoutineDetailsCard,
  'dept-accounting': RoutineDetailsCardCompact,
  'dept-personnel': RoutineDetailsCardPanel,
}

const spreadsheetComparisonOptions = [
  { id: 'dept-fiscal', name: 'Opcao 1' },
  { id: 'dept-personnel', name: 'Opcao 2' },
  { id: 'dept-accounting', name: 'Opcao 3' },
]

const pageOptions = [
  { id: 'spreadsheet', label: 'Planilha' },
  { id: 'list', label: 'Lista' },
]

const listPageSurfaceClass = {
  compact: 'bg-slate-100',
  cards: 'bg-blue-50',
  ledger: 'bg-zinc-100',
}

function App() {
  const [response, setResponse] = useState(null)
  const [selectedPageId, setSelectedPageId] = useState('spreadsheet')
  const [selectedDepartmentId, setSelectedDepartmentId] =
    useState('dept-fiscal')
  const [selectedListOptionId, setSelectedListOptionId] = useState('compact')
  const [listSampleItems, setListSampleItems] = useState(() =>
    buildRoutineListSampleItems(),
  )
  const [selectedTask, setSelectedTask] = useState(null)

  useEffect(() => {
    getRoutineControl().then(setResponse)
  }, [])

  const visibleData = useMemo(() => {
    if (!response) {
      return null
    }

    const { clients, routines, tasks, employees } = response.data
    const fiscalRoutines = routines.filter(
      (routine) => routine.departmentId === 'dept-fiscal',
    )
    const fiscalTasks = tasks.filter(
      (task) => task.departmentId === 'dept-fiscal',
    )
    const visibleRoutines = fiscalRoutines.map((routine) => ({
      ...routine,
      departmentId: selectedDepartmentId,
    }))
    const visibleTasks = fiscalTasks.map((task) => ({
      ...task,
      departmentId: selectedDepartmentId,
    }))
    const visibleClientIds = new Set(
      visibleTasks.map((task) => task.clientId),
    )

    return {
      departments: spreadsheetComparisonOptions,
      employees,
      routines: visibleRoutines,
      tasks: visibleTasks,
      clients: clients.filter((client) => visibleClientIds.has(client.id)),
    }
  }, [response, selectedDepartmentId])

  const selectedRelations = useMemo(() => {
    if (!selectedTask || !response) {
      return {}
    }

    const selectedListItem = listSampleItems.find(
      (item) => item.task.id === selectedTask.id,
    )

    if (selectedListItem) {
      return {
        client: selectedListItem.client,
        routine: selectedListItem.routine,
        department: selectedListItem.department,
        assignee: selectedListItem.employees.find(
          (item) => item.id === selectedTask.assigneeId,
        ),
        employees: selectedListItem.employees,
      }
    }

    const { clients, routines, employees } = response.data

    return {
      client: clients.find((item) => item.id === selectedTask.clientId),
      routine: routines.find((item) => item.id === selectedTask.routineId),
      department: spreadsheetComparisonOptions.find(
        (item) => item.id === selectedTask.departmentId,
      ),
      assignee: employees.find((item) => item.id === selectedTask.assigneeId),
      employees,
    }
  }, [listSampleItems, response, selectedTask])

  function updateTask(taskId, changes) {
    setListSampleItems((currentItems) =>
      currentItems.map((item) => {
        if (item.task.id !== taskId) return item

        const nextTask = { ...item.task, ...changes }
        const nextAssignee = item.employees.find(
          (employee) => employee.id === nextTask.assigneeId,
        )

        return {
          ...item,
          ...changes,
          assigneeName: nextAssignee?.name ?? 'Nao atribuido',
          dueDate: nextTask.dueDate,
          status: nextTask.status,
          task: nextTask,
        }
      }),
    )

    setResponse((currentResponse) => {
      if (!currentResponse) return currentResponse

      return {
        ...currentResponse,
        data: {
          ...currentResponse.data,
          tasks: currentResponse.data.tasks.map((task) =>
            task.id === taskId ? { ...task, ...changes } : task,
          ),
        },
      }
    })

    setSelectedTask((currentTask) =>
      currentTask?.id === taskId
        ? { ...currentTask, ...changes }
        : currentTask,
    )
  }

  function handleStatusChange(taskId, status) {
    updateTask(taskId, { status })
  }

  function handleAssigneeChange(taskId, assigneeId) {
    updateTask(taskId, { assigneeId })
  }

  function handleDueDateChange(taskId, dueDate) {
    updateTask(taskId, { dueDate })
  }

  function handleListItemOpen(item) {
    setSelectedTask(item.task)
  }

  function handleListItemQuickAction(item, action) {
    setListSampleItems((currentItems) =>
      currentItems.map((currentItem) => {
        if (currentItem.id !== item.id) return currentItem

        const nextIndicators = { ...currentItem.indicators }

        if (action === 'attach') {
          nextIndicators.attachments += 1
        }

        return {
          ...currentItem,
          indicators: nextIndicators,
          task: {
            ...currentItem.task,
            indicators: nextIndicators,
          },
        }
      }),
    )
  }

  function handleListItemNoteChange(item, notes) {
    setListSampleItems((currentItems) =>
      currentItems.map((currentItem) =>
        currentItem.id === item.id
          ? {
              ...currentItem,
              notes,
              task: {
                ...currentItem.task,
                notes,
              },
            }
          : currentItem,
      ),
    )
  }

  if (!visibleData) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50">
        <p className="text-sm font-medium text-slate-500">
          Carregando rotinas...
        </p>
      </main>
    )
  }

  const selectedDepartment = visibleData.departments.find(
    (department) => department.id === selectedDepartmentId,
  )
  const SelectedDetailsCard =
    detailsCardByDepartment[selectedTask?.departmentId] ?? RoutineDetailsCard
  const pageSurfaceClass =
    selectedPageId === 'list'
      ? listPageSurfaceClass[selectedListOptionId]
      : 'bg-slate-100'

  return (
    <main
      className={`min-h-screen px-4 py-8 text-slate-900 transition-colors sm:px-6 lg:px-8 ${pageSurfaceClass}`}
    >
      <div className="mx-auto max-w-7xl">
        <header className="mb-7 flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
              Controle operacional
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              Rotinas de junho
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Compare a visualizacao em planilha e a visualizacao em lista em
              paginas separadas.
            </p>
          </div>

          {selectedPageId === 'spreadsheet' && (
            <label className="text-sm font-medium text-slate-600">
              Visualizacao
              <select
                value={selectedDepartmentId}
                onChange={(event) => {
                  setSelectedDepartmentId(event.target.value)
                  setSelectedTask(null)
                }}
                className="ml-3 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                {spreadsheetComparisonOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </header>

        <div className="mb-5 inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          {pageOptions.map((page) => {
            const isSelected = selectedPageId === page.id

            return (
              <button
                key={page.id}
                type="button"
                onClick={() => {
                  setSelectedPageId(page.id)
                  setSelectedTask(null)
                }}
                className={`min-h-9 rounded-lg px-4 text-sm font-bold transition ${
                  isSelected
                    ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {page.label}
              </button>
            )
          })}
        </div>

        {selectedPageId === 'spreadsheet' && (
          <div className="mb-4 flex flex-wrap gap-x-5 gap-y-2">
            {Object.entries(routineStatusConfig).map(([status, config]) => (
              <div
                key={status}
                className="flex items-center gap-2 text-xs font-medium text-slate-500"
              >
                <span className={`size-2.5 rounded-full ${config.dotClass}`} />
                {config.label}
              </div>
            ))}
          </div>
        )}

        {selectedPageId === 'spreadsheet' ? (
          <RoutineControlTable
            title={selectedDepartment?.name ?? 'Opcao 1'}
            description="Clientes nas linhas e rotinas nas colunas"
            clients={visibleData.clients}
            routines={visibleData.routines}
            tasks={visibleData.tasks}
            onTaskOpen={setSelectedTask}
          />
        ) : (
          <RoutineListComparison
            selectedOptionId={selectedListOptionId}
            items={listSampleItems}
            onItemOpen={handleListItemOpen}
            onItemQuickAction={handleListItemQuickAction}
            onItemNoteChange={handleListItemNoteChange}
            onOptionChange={setSelectedListOptionId}
          />
        )}
      </div>

      {selectedTask && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/35 p-4 backdrop-blur-[2px]"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedTask(null)
            }
          }}
        >
          <div className="max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-3xl">
            <SelectedDetailsCard
              task={selectedTask}
              {...selectedRelations}
              onStatusChange={handleStatusChange}
              onAssigneeChange={handleAssigneeChange}
              onDueDateChange={handleDueDateChange}
              onClose={() => setSelectedTask(null)}
            />
          </div>
        </div>
      )}
    </main>
  )
}

export default App
