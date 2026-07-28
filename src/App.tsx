import { useEffect, useMemo, useRef, useState } from 'react'
import { Route, Routes, useNavigate } from 'react-router'

import ErrorState from './components/common/ErrorState'
import LoadingState from './components/common/LoadingState'
import RoutineDetailsCard from './components/routine-control/details/RoutineDetailsCard'
import { ROUTES } from './constants/routes'
import AppLayout from './layouts/AppLayout'
import HomePage from './pages/HomePage'
import ListPage from './pages/ListPage'
import MyTasksPage from './pages/MyTasksPage'
import PlaceholderPage from './pages/PlaceholderPage'
import ProfilePage from './pages/ProfilePage'
import SpreadsheetPage from './pages/SpreadsheetPage'
import TasksPage from './pages/TasksPage'
import { useRoutineControl } from './hooks/useRoutineControl'
import { useTaskUpdates } from './hooks/useTaskUpdates'
import { buildTaskRelations } from './utils/routineRelations'
import type {
  Client,
  Department,
  PendingStatusChange,
  Routine,
  RoutineControlData,
  RoutineListItem,
  RoutineStatus,
  Task,
  TaskRelations,
} from './types/domain'
import type { SpreadsheetNavigationItem } from './types/navigation'

const selectedSpreadsheetPresentation: Department = {
  id: 'dept-fiscal',
  name: 'Fiscal',
}

const selectedSpreadsheetId = 'fiscal'

const spreadsheetNavigationItems: SpreadsheetNavigationItem[] = [
  {
    id: selectedSpreadsheetId,
    departmentId: selectedSpreadsheetPresentation.id,
    name: 'Fiscal',
    description: 'Clientes e rotinas',
    to: `${ROUTES.SPREADSHEET}?sheetId=${selectedSpreadsheetId}`,
  },
]

function App() {
  const navigate = useNavigate()
  const { response, setResponse, data, isLoading, error } = useRoutineControl()
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)
  const taskUpdates = useTaskUpdates({ setResponse, setSelectedTask })
  const selectedTaskId = selectedTask?.id

  useEffect(() => {
    if (!selectedTaskId || !dialogRef.current) return undefined

    const dialog = dialogRef.current
    const returnFocusTarget =
      returnFocusRef.current ??
      (document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null)
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

    function getFocusableElements(): HTMLElement[] {
      return [
        ...dialog.querySelectorAll<HTMLElement>(focusableSelector),
      ].filter(
        (element) =>
          element.getClientRects().length > 0 &&
          (!element.matches('input[type="radio"]') ||
            !(element instanceof HTMLInputElement) ||
            element.checked),
      )
    }

    function handleDialogKeyDown(event: KeyboardEvent) {
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

      const firstElement = focusableElements[0]!
      const lastElement = focusableElements.at(-1)!

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
      dialog.querySelector<HTMLElement>('[data-dialog-close]') ??
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

  const visibleData = useMemo<RoutineControlData | null>(() => {
    if (!data) return null

    const fiscalRoutines = data.routines.filter(
      (routine) => routine.departmentId === 'dept-fiscal',
    )
    const fiscalRoutineIds = new Set(
      fiscalRoutines.map((routine) => routine.id),
    )
    const fiscalClientRoutineLinks = data.clientRoutineLinks.filter((link) =>
      fiscalRoutineIds.has(link.routineId),
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
    const visibleClientIds = new Set(
      fiscalClientRoutineLinks.map((link) => link.clientId),
    )

    return {
      departments: [selectedSpreadsheetPresentation],
      employees: data.employees,
      routines: visibleRoutines,
      clientRoutineLinks: fiscalClientRoutineLinks,
      tasks: visibleTasks,
      clients: data.clients.filter((client) => visibleClientIds.has(client.id)),
    }
  }, [data])

  const selectedRelations = useMemo<TaskRelations>(() => {
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
  }, [data, selectedTask])

  function handleRoutineListOpen(routine: Routine) {
    setSelectedTask(null)
    const searchParams = new URLSearchParams({
      sheetId: selectedSpreadsheetId,
      type: 'routine',
      id: routine.id,
    })
    navigate(`${ROUTES.LIST}?${searchParams.toString()}`, {
      state: { fromSpreadsheet: true },
    })
  }

  function handleClientListOpen(client: Client) {
    setSelectedTask(null)
    const searchParams = new URLSearchParams({
      sheetId: selectedSpreadsheetId,
      type: 'client',
      id: client.id,
    })
    navigate(`${ROUTES.LIST}?${searchParams.toString()}`, {
      state: { fromSpreadsheet: true },
    })
  }

  function handleListItemOpen(item: RoutineListItem) {
    returnFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
    setSelectedTask(item.task)
  }

  function handleListItemQuickAction(item: RoutineListItem, action: 'attach') {
    if (action === 'attach') {
      taskUpdates.incrementAttachments(item.task)
    }
  }

  function handleListItemNoteChange(item: RoutineListItem, notes: string) {
    taskUpdates.updateNotes(item.task.id, notes)
  }

  function handleListItemStatusChange(
    item: RoutineListItem,
    change: PendingStatusChange | RoutineStatus,
  ) {
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

  function handleLooseTaskCreate(task: Task) {
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
        <Route
          element={<AppLayout spreadsheets={spreadsheetNavigationItems} />}
        >
          <Route
            index
            element={
              <HomePage
                data={data}
                spreadsheets={spreadsheetNavigationItems}
                generatedAt={response.meta.generatedAt}
                onTaskOpen={setSelectedTask}
              />
            }
          />
          <Route
            path={ROUTES.SPREADSHEET}
            element={
              <SpreadsheetPage
                spreadsheetName={selectedSpreadsheetPresentation.name}
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
                data={visibleData}
                spreadsheetName={selectedSpreadsheetPresentation.name}
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
                spreadsheetId={selectedSpreadsheetId}
                spreadsheetName={selectedSpreadsheetPresentation.name}
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
