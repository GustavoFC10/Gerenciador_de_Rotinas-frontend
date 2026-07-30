import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router'

import ErrorState from './components/common/ErrorState'
import LoadingState from './components/common/LoadingState'
import RoutineDetailsCard from './components/routine-control/details/RoutineDetailsCard'
import { ROUTES } from './constants/routes'
import AppLayout from './layouts/AppLayout'
import EntityDetailPage from './pages/EntityDetailPage'
import HomePage from './pages/HomePage'
import ListPage from './pages/ListPage'
import LoginPage from './pages/LoginPage'
import MyTasksPage from './pages/MyTasksPage'
import PlaceholderPage from './pages/PlaceholderPage'
import ProfilePage from './pages/ProfilePage'
import SpreadsheetPage from './pages/SpreadsheetPage'
import TasksPage from './pages/TasksPage'
import { useRoutineControl } from './hooks/useRoutineControl'
import { useAuth } from './hooks/useAuth'
import { useTaskUpdates } from './hooks/useTaskUpdates'
import { scopeRoutineControlData } from './utils/routineControlScope'
import { buildTaskRelations } from './utils/routineRelations'
import {
  buildSpreadsheetContextQuery,
  buildSpreadsheetNavigationItems,
  resolveSpreadsheetSelection,
} from './utils/spreadsheetNavigation'
import type {
  Client,
  PendingStatusChange,
  Routine,
  RoutineControlData,
  RoutineListItem,
  RoutineStatus,
  Task,
  TaskRelations,
  UpdateClientInput,
  UpdateRoutineInput,
} from './types/domain'

function App() {
  const { isAuthenticated } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    const requestedRoute = `${location.pathname}${location.search}${location.hash}`

    return (
      <Routes>
        <Route path={ROUTES.LOGIN} element={<LoginPage />} />
        <Route
          path="*"
          element={
            <Navigate
              to={ROUTES.LOGIN}
              replace
              state={{ from: requestedRoute }}
            />
          }
        />
      </Routes>
    )
  }

  if (location.pathname === ROUTES.LOGIN) {
    return <LoginPage />
  }

  return <AuthenticatedApp />
}

function AuthenticatedApp() {
  const navigate = useNavigate()
  const location = useLocation()
  const { response, setResponse, data, isLoading, error } = useRoutineControl()
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)
  const taskUpdates = useTaskUpdates({ setResponse, setSelectedTask })
  const selectedTaskId = selectedTask?.id
  const spreadsheetNavigationItems = useMemo(
    () => (data ? buildSpreadsheetNavigationItems(data) : []),
    [data],
  )
  const spreadsheetSelection = useMemo(
    () =>
      resolveSpreadsheetSelection(spreadsheetNavigationItems, location.search),
    [location.search, spreadsheetNavigationItems],
  )
  const selectedSpreadsheet = spreadsheetSelection.spreadsheet
  const selectedDivision = spreadsheetSelection.division
  const selectedDepartment = data?.departments.find(
    (department) => department.id === spreadsheetSelection.departmentId,
  )
  const spreadsheetContextQuery = buildSpreadsheetContextQuery({
    spreadsheetId: spreadsheetSelection.spreadsheetId,
    divisionId: spreadsheetSelection.divisionId,
  })

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
    if (
      !data ||
      !spreadsheetSelection.departmentId ||
      !spreadsheetSelection.divisionId
    ) {
      return null
    }

    return scopeRoutineControlData(data, {
      departmentId: spreadsheetSelection.departmentId,
      divisionId: spreadsheetSelection.divisionId,
    })
  }, [data, spreadsheetSelection.departmentId, spreadsheetSelection.divisionId])

  useEffect(() => {
    if (
      !spreadsheetSelection.isFallback ||
      !spreadsheetSelection.spreadsheetId ||
      !spreadsheetSelection.divisionId ||
      !isSpreadsheetContextRoute(location.pathname)
    ) {
      return
    }

    const nextSearch = buildSpreadsheetContextQuery(
      {
        spreadsheetId: spreadsheetSelection.spreadsheetId,
        divisionId: spreadsheetSelection.divisionId,
      },
      location.search,
    )

    navigate(
      {
        pathname: location.pathname,
        search: nextSearch,
        hash: location.hash,
      },
      { replace: true, state: location.state },
    )
  }, [
    location.hash,
    location.pathname,
    location.search,
    location.state,
    navigate,
    spreadsheetSelection.divisionId,
    spreadsheetSelection.isFallback,
    spreadsheetSelection.spreadsheetId,
  ])

  const selectedRelations = useMemo<TaskRelations>(() => {
    if (!selectedTask || !data) return {}

    const relations = buildTaskRelations(
      selectedTask,
      data,
      selectedTask.departmentId === selectedDepartment?.id
        ? selectedDepartment
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
  }, [data, selectedDepartment, selectedTask])

  function handleRoutineListOpen(routine: Routine) {
    setSelectedTask(null)
    navigate(
      `${ROUTES.ROUTINES}/${encodeURIComponent(
        routine.id,
      )}${spreadsheetContextQuery}`,
      {
        state: { fromSpreadsheet: true },
      },
    )
  }

  function handleClientListOpen(client: Client) {
    setSelectedTask(null)
    navigate(
      `${ROUTES.COMPANIES}/${encodeURIComponent(
        client.id,
      )}${spreadsheetContextQuery}`,
      {
        state: { fromSpreadsheet: true },
      },
    )
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

  function handleClientUpdate(clientId: string, changes: UpdateClientInput) {
    setResponse((currentResponse) => {
      if (!currentResponse) return currentResponse

      return {
        ...currentResponse,
        data: {
          ...currentResponse.data,
          clients: currentResponse.data.clients.map((client) =>
            client.id === clientId ? { ...client, ...changes } : client,
          ),
        },
      }
    })
  }

  function handleRoutineUpdate(routineId: string, changes: UpdateRoutineInput) {
    setResponse((currentResponse) => {
      if (!currentResponse) return currentResponse

      return {
        ...currentResponse,
        data: {
          ...currentResponse.data,
          routines: currentResponse.data.routines.map((routine) =>
            routine.id === routineId ? { ...routine, ...changes } : routine,
          ),
        },
      }
    })
  }

  if (isLoading) {
    return <LoadingState message="Carregando rotinas..." />
  }

  if (
    error ||
    !response ||
    !data ||
    !visibleData ||
    !selectedSpreadsheet ||
    !selectedDivision ||
    !selectedDepartment
  ) {
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
                spreadsheetName={selectedSpreadsheet.name}
                divisionName={selectedDivision.name}
                divisions={selectedSpreadsheet.divisions ?? []}
                selectedDivisionId={selectedDivision.id}
                visibleData={visibleData}
                onClientOpen={handleClientListOpen}
                onRoutineOpen={handleRoutineListOpen}
                onTaskOpen={setSelectedTask}
                onTaskStatusChange={taskUpdates.updateStatus}
                onTaskAttachmentAdd={taskUpdates.incrementAttachments}
              />
            }
          />
          <Route path={ROUTES.LIST} element={<ListPage />} />
          <Route
            path={ROUTES.COMPANY_DETAILS}
            element={
              <EntityDetailPage
                type="client"
                data={visibleData}
                spreadsheetId={selectedSpreadsheet.id}
                spreadsheetName={selectedSpreadsheet.name}
                spreadsheetDepartmentId={selectedDepartment.id}
                spreadsheetDivisionId={selectedDivision.id}
                spreadsheetDivisionName={selectedDivision.name}
                onClientUpdate={handleClientUpdate}
                onItemOpen={handleListItemOpen}
                onItemQuickAction={handleListItemQuickAction}
                onItemNoteChange={handleListItemNoteChange}
                onItemStatusChange={handleListItemStatusChange}
              />
            }
          />
          <Route
            path={ROUTES.ROUTINE_DETAILS}
            element={
              <EntityDetailPage
                type="routine"
                data={visibleData}
                spreadsheetId={selectedSpreadsheet.id}
                spreadsheetName={selectedSpreadsheet.name}
                spreadsheetDepartmentId={selectedDepartment.id}
                spreadsheetDivisionId={selectedDivision.id}
                spreadsheetDivisionName={selectedDivision.name}
                onRoutineUpdate={handleRoutineUpdate}
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
                spreadsheetId={selectedSpreadsheet.id}
                spreadsheetName={selectedSpreadsheet.name}
                spreadsheetDivisionId={selectedDivision.id}
                spreadsheetDivisionName={selectedDivision.name}
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
              onLinkAdd={taskUpdates.addLink}
              onLinkRemove={taskUpdates.removeLink}
              onClose={() => setSelectedTask(null)}
            />
          </div>
        </div>
      )}
    </>
  )
}

function isSpreadsheetContextRoute(pathname: string): boolean {
  return (
    pathname === ROUTES.SPREADSHEET ||
    pathname === ROUTES.LIST ||
    pathname === ROUTES.TASKS ||
    pathname.startsWith(`${ROUTES.COMPANIES}/`) ||
    pathname.startsWith(`${ROUTES.ROUTINES}/`)
  )
}

export default App
