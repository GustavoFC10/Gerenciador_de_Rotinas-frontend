import { useEffect, useMemo, useRef, useState } from 'react'
import { Route, Routes, useNavigate } from 'react-router-dom'

import ErrorState from './components/common/ErrorState.jsx'
import LoadingState from './components/common/LoadingState.jsx'
import RoutineDetailsCard from './components/routine-control/details/RoutineDetailsCard.jsx'
import { ROUTES } from './constants/routes.js'
import AppLayout from './layouts/AppLayout.jsx'
import HomePage from './pages/HomePage.jsx'
import ListPage from './pages/ListPage.jsx'
import MyTasksPage from './pages/MyTasksPage.jsx'
import PlaceholderPage from './pages/PlaceholderPage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'
import SpreadsheetPage from './pages/SpreadsheetPage.jsx'
import TasksPage from './pages/TasksPage.jsx'
import { useRoutineControl } from './hooks/useRoutineControl.js'
import { useTaskUpdates } from './hooks/useTaskUpdates.js'
import { buildTaskRelations } from './utils/routineRelations.js'

const selectedSpreadsheetPresentation = {
  id: 'dept-accounting',
  name: 'Planilha operacional',
}

function App() {
  const navigate = useNavigate()
  const { response, setResponse, data, isLoading, error } = useRoutineControl()
  const [selectedTask, setSelectedTask] = useState(null)
  const dialogRef = useRef(null)
  const returnFocusRef = useRef(null)
  const taskUpdates = useTaskUpdates({ setResponse, setSelectedTask })
  const selectedTaskId = selectedTask?.id

  useEffect(() => {
    if (!selectedTaskId || !dialogRef.current) return undefined

    const dialog = dialogRef.current
    const returnFocusTarget = returnFocusRef.current ?? document.activeElement
    returnFocusRef.current = returnFocusTarget
    const focusableSelector = [
      'button:not([disabled])',
      'select:not([disabled])',
      'input:not([disabled])',
      'textarea:not([disabled])',
      'summary',
      '[href]',
      '[tabindex]:not([tabindex="-1"])',
    ].join(',')

    function getFocusableElements() {
      return [...dialog.querySelectorAll(focusableSelector)].filter(
        (element) =>
          element.getClientRects().length > 0 &&
          (!element.matches('input[type="radio"]') || element.checked),
      )
    }

    function handleDialogKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault()
        setSelectedTask(null)
        return
      }

      if (event.key !== 'Tab') return

      const focusableElements = getFocusableElements()

      if (focusableElements.length === 0) {
        event.preventDefault()
        dialog.focus()
        return
      }

      const firstElement = focusableElements[0]
      const lastElement = focusableElements.at(-1)

      if (!dialog.contains(document.activeElement)) {
        event.preventDefault()
        const nextElement = event.shiftKey ? lastElement : firstElement
        nextElement.focus()
      } else if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault()
        lastElement.focus()
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus()
      }
    }

    const initialFocus =
      dialog.querySelector('[data-dialog-close]') ??
      getFocusableElements()[0] ??
      dialog
    initialFocus.focus()
    document.addEventListener('keydown', handleDialogKeyDown)

    return () => {
      document.removeEventListener('keydown', handleDialogKeyDown)
      if (returnFocusTarget?.isConnected) {
        returnFocusTarget.focus()
      }
      returnFocusRef.current = null
    }
  }, [selectedTaskId])

  const visibleData = useMemo(() => {
    if (!data) return null

    const fiscalRoutines = data.routines.filter(
      (routine) => routine.departmentId === 'dept-fiscal',
    )
    const fiscalTasks = data.tasks.filter(
      (task) => task.departmentId === 'dept-fiscal',
    )
    const visibleRoutines = fiscalRoutines.map((routine) => ({
      ...routine,
      departmentId: selectedSpreadsheetPresentation.id,
    }))
    const visibleTasks = fiscalTasks.map((task) => ({
      ...task,
      departmentId: selectedSpreadsheetPresentation.id,
    }))
    const visibleClientIds = new Set(visibleTasks.map((task) => task.clientId))

    return {
      departments: [selectedSpreadsheetPresentation],
      employees: data.employees,
      routines: visibleRoutines,
      tasks: visibleTasks,
      clients: data.clients.filter((client) => visibleClientIds.has(client.id)),
    }
  }, [data])

  const selectedRelations = useMemo(() => {
    if (!selectedTask || !data) return {}

    const relations = buildTaskRelations(
      selectedTask,
      data,
      selectedTask.departmentId === selectedSpreadsheetPresentation.id
        ? selectedSpreadsheetPresentation
        : null,
    )

    if (!selectedTask.isLoose) {
      return relations
    }

    return {
      ...relations,
      client: relations.client ?? {
        code: 'AV',
        name: 'Tarefa avulsa',
      },
      routine: relations.routine ?? {
        name: selectedTask.title,
        description: selectedTask.description ?? selectedTask.notes,
      },
    }
  }, [data, selectedTask])

  const pageSurfaceClass = ''

  function handleRoutineListOpen(routine) {
    setSelectedTask(null)
    navigate(`${ROUTES.LIST}?type=routine&id=${routine.id}`)
  }

  function handleClientListOpen(client) {
    setSelectedTask(null)
    navigate(`${ROUTES.LIST}?type=client&id=${client.id}`)
  }

  function handleListItemOpen(item) {
    returnFocusRef.current = document.activeElement
    setSelectedTask(item.task)
  }

  function handleListItemQuickAction(item, action) {
    if (action === 'attach') {
      taskUpdates.incrementAttachments(item.task)
    }
  }

  function handleListItemNoteChange(item, notes) {
    taskUpdates.updateNotes(item.task.id, notes)
  }

  function handleListItemStatusChange(item, change) {
    if (typeof change === 'string') {
      taskUpdates.updateStatus(item.task.id, change)
      return
    }

    taskUpdates.updateStatus(
      item.task.id,
      change.status,
      change.statusDetail ?? null,
    )
  }

  function handleLooseTaskCreate(task) {
    taskUpdates.createLooseTask(task)
  }

  if (isLoading) {
    return <LoadingState message="Carregando rotinas..." />
  }

  if (error || !response || !data || !visibleData) {
    return (
      <ErrorState
        title="Nao foi possivel carregar os dados"
        description="Confira o mock ou a futura integracao de API."
      />
    )
  }

  return (
    <>
      <Routes>
        <Route element={<AppLayout pageSurfaceClass={pageSurfaceClass} />}>
          <Route index element={<HomePage data={data} />} />
          <Route
            path={ROUTES.SPREADSHEET}
            element={
              <SpreadsheetPage
                visibleData={visibleData}
                onClientOpen={handleClientListOpen}
                onRoutineOpen={handleRoutineListOpen}
                onTaskOpen={setSelectedTask}
              />
            }
          />
          <Route
            path={ROUTES.LIST}
            element={
              <ListPage
                data={data}
                onItemOpen={handleListItemOpen}
                onItemQuickAction={handleListItemQuickAction}
                onItemNoteChange={handleListItemNoteChange}
                onItemStatusChange={handleListItemStatusChange}
              />
            }
          />
          <Route
            path={ROUTES.TASKS}
            element={
              <TasksPage
                data={visibleData}
                onItemOpen={handleListItemOpen}
                onItemQuickAction={handleListItemQuickAction}
                onItemNoteChange={handleListItemNoteChange}
                onItemStatusChange={handleListItemStatusChange}
              />
            }
          />
          <Route
            path={ROUTES.MY_TASKS}
            element={
              <MyTasksPage
                data={data}
                onItemOpen={handleListItemOpen}
                onItemQuickAction={handleListItemQuickAction}
                onItemNoteChange={handleListItemNoteChange}
                onItemStatusChange={handleListItemStatusChange}
                onLooseTaskCreate={handleLooseTaskCreate}
              />
            }
          />
          <Route path={ROUTES.PROFILE} element={<ProfilePage />} />
          <Route
            path={ROUTES.DEPARTMENT_DASHBOARD}
            element={
              <PlaceholderPage
                title="Dashboard do departamento"
                description="Visao simples de progresso, gargalos e prazos do departamento."
              />
            }
          />
          <Route
            path={ROUTES.MANAGER_DASHBOARD}
            element={
              <PlaceholderPage
                title="Dashboard geral"
                description="Visao consolidada por departamentos, empresas, rotinas e responsaveis."
              />
            }
          />
          <Route
            path={ROUTES.ROUTINES}
            element={
              <PlaceholderPage
                title="Rotinas"
                description="Cadastro, visualizacao e manutencao das rotinas operacionais."
              />
            }
          />
          <Route
            path={ROUTES.COMPANIES}
            element={
              <PlaceholderPage
                title="Empresas"
                description="Cadastro e consulta das empresas atendidas."
              />
            }
          />
          <Route
            path={ROUTES.EMPLOYEES}
            element={
              <PlaceholderPage
                title="Funcionarios"
                description="Listagem e manutencao dos usuarios operacionais."
              />
            }
          />
          <Route
            path={ROUTES.ROLES}
            element={
              <PlaceholderPage
                title="Cargos"
                description="Gerenciamento de permissoes e responsabilidades."
              />
            }
          />
        </Route>
      </Routes>

      {selectedTask && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-[var(--color-overlay-bg)] p-4 backdrop-blur-[2px]"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedTask(null)
            }
          }}
        >
          <div
            ref={dialogRef}
            className="max-h-[calc(100vh-2rem)] w-full max-w-5xl overflow-y-auto overscroll-contain rounded-[var(--radius-panel)]"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`routine-details-title-${selectedTask.id}`}
            tabIndex={-1}
          >
            <RoutineDetailsCard
              task={selectedTask}
              {...selectedRelations}
              onStatusChange={taskUpdates.updateStatus}
              onAssigneeChange={taskUpdates.updateAssignee}
              onDueDateChange={taskUpdates.updateDueDate}
              onAttachmentAdd={taskUpdates.incrementAttachments}
              onAttachmentRemove={taskUpdates.removeAttachment}
              onNotesChange={taskUpdates.updateNotes}
              onClose={() => setSelectedTask(null)}
            />
          </div>
        </div>
      )}
    </>
  )
}

export default App
