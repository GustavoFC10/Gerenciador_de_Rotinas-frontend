import { useEffect, useMemo, useState } from 'react'

import RoutineControlTable from './components/routines/RoutineControlTable.jsx'
import RoutineDetailsCard from './components/routines/RoutineDetailsCard.jsx'
import RoutineDetailsCardCompact from './components/routines/RoutineDetailsCardCompact.jsx'
import RoutineDetailsCardPanel from './components/routines/RoutineDetailsCardPanel.jsx'
import { routineStatusConfig } from './constants/routineStatus.js'
import { getRoutineControl } from './services/routineControlService.js'

const detailsCardByDepartment = {
  'dept-fiscal': RoutineDetailsCard,
  'dept-accounting': RoutineDetailsCardCompact,
  'dept-personnel': RoutineDetailsCardPanel,
}

const comparisonOptions = [
  { id: 'dept-fiscal', name: 'Opção 1' },
  { id: 'dept-accounting', name: 'Opção 2' },
  { id: 'dept-personnel', name: 'Opção 3' },
]

function App() {
  const [response, setResponse] = useState(null)
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('dept-fiscal')
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
      departments: comparisonOptions,
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

    const { clients, routines, employees } = response.data

    return {
      client: clients.find((item) => item.id === selectedTask.clientId),
      routine: routines.find((item) => item.id === selectedTask.routineId),
      department: comparisonOptions.find(
        (item) => item.id === selectedTask.departmentId,
      ),
      assignee: employees.find((item) => item.id === selectedTask.assigneeId),
      employees,
    }
  }, [response, selectedTask])

  function updateTask(taskId, changes) {
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

  if (!visibleData) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50">
        <p className="text-sm font-medium text-slate-500">Carregando rotinas…</p>
      </main>
    )
  }

  const selectedDepartment = visibleData.departments.find(
    (department) => department.id === selectedDepartmentId,
  )
  const SelectedDetailsCard =
    detailsCardByDepartment[selectedTask?.departmentId] ?? RoutineDetailsCard

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
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
              Base reutilizável da visualização em planilha. Compare três
              modelos usando as mesmas rotinas do Fiscal.
            </p>
          </div>

          <label className="text-sm font-medium text-slate-600">
            Visualização
            <select
              value={selectedDepartmentId}
              onChange={(event) => {
                setSelectedDepartmentId(event.target.value)
                setSelectedTask(null)
              }}
              className="ml-3 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              {comparisonOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </label>
        </header>

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

        <RoutineControlTable
          title={selectedDepartment?.name ?? 'Opção 1'}
          description="Clientes nas linhas e rotinas nas colunas"
          clients={visibleData.clients}
          routines={visibleData.routines}
          tasks={visibleData.tasks}
          onTaskOpen={setSelectedTask}
        />
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
