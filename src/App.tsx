import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import ErrorState from './components/common/ErrorState'
import LoadingState from './components/common/LoadingState'
import RequirePermission from './components/auth/RequirePermission'
import RoutineDetailsCard from './components/routine-control/details/RoutineDetailsCard'
import { ROUTES } from './constants/routes'
import AppLayout from './layouts/AppLayout'
import AgendaPage from './pages/AgendaPage'
import EntityDetailPage, {
  type RoutineEditInput,
} from './pages/EntityDetailPage'
import CompaniesPage from './pages/CompaniesPage'
import CreateCompanyPage from './pages/CreateCompanyPage'
import CreateEmployeePage from './pages/CreateEmployeePage'
import CreateRoutinePage from './pages/CreateRoutinePage'
import CreateScreenPage from './pages/CreateScreenPage'
import EmployeesPage from './pages/EmployeesPage'
import HomePage from './pages/HomePage'
import ListPage from './pages/ListPage'
import LoginPage from './pages/LoginPage'
import MembershipSelectionPage from './pages/MembershipSelectionPage'
import MyTasksPage from './pages/MyTasksPage'
import PlaceholderPage from './pages/PlaceholderPage'
import ProfilePage from './pages/ProfilePage'
import RoutinesPage from './pages/RoutinesPage'
import SettingsRoutes from './pages/settings/SettingsRoutes'
import ScreensPage from './pages/ScreensPage'
import SpreadsheetPage from './pages/SpreadsheetPage'
import TasksPage from './pages/TasksPage'
import { useCompanyMutations } from './hooks/mutations/useCompanyMutations'
import { useCompetenceMutations } from './hooks/mutations/useCompetenceMutations'
import { useDepartmentMutations } from './hooks/mutations/useDepartmentMutations'
import { useRoutineMutations } from './hooks/mutations/useRoutineMutations'
import { useScreenMutations } from './hooks/mutations/useScreenMutations'
import { useTaskMutations } from './hooks/mutations/useTaskMutations'
import { useNavigationScreens } from './hooks/useNavigationScreens'
import { useRoutineControl } from './hooks/useRoutineControl'
import { useAuth } from './hooks/useAuth'
import { useAppState } from './hooks/useAppState'
import { queryKeys } from './query/queryKeys'
import { departmentService } from './services/departmentService'
import { organizationMemberService } from './services/organizationMemberService'
import type { MembershipInvitationResource } from './services/organizationMemberService'
import type { RoutineInput, RoutineResource } from './services/routineService'
import type { ClientCompanyPatch } from './services/companyService'
import type { TaskPatchInput } from './services/taskService'
import type {
  CompanySetupInput,
  CreateCompanyResult,
} from './types/companySetup'
import { selectScreenData } from './utils/routineControlScope'
import {
  APP_PERMISSION,
  canAssignTask,
  canTransitionTask,
  getAllowedTaskTransitionStatuses,
  isOrganizationAdmin,
} from './utils/permissions'
import { buildTaskRelations } from './utils/routineRelations'
import {
  buildSpreadsheetContextQuery,
  buildAgendaNavigationItems,
  buildSpreadsheetNavigationItems,
  resolveSpreadsheetSelection,
} from './utils/spreadsheetNavigation'
import type {
  Client,
  Employee,
  Routine,
  RoutineControlData,
  RoutineListItem,
  RoutineStatus,
  Screen,
  Task,
  TaskRelations,
} from './types/domain'

function App() {
  const { activeMembership, isAuthenticated, isInitializing } = useAuth()
  const location = useLocation()

  if (isInitializing) {
    return <LoadingState message="Restaurando sessão..." />
  }

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

  if (!activeMembership) {
    return <MembershipSelectionPage />
  }

  if (location.pathname === ROUTES.LOGIN) {
    return <LoginPage />
  }

  return <AuthenticatedApp />
}

function AuthenticatedApp() {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const { competence, user } = useAppState()
  const { activeMembership } = useAuth()
  const scope = useMemo(
    () => ({
      organizationId: activeMembership!.organization.id,
      membershipId: activeMembership!.id,
    }),
    [activeMembership],
  )
  const { response, data, isInitialLoading, isRefreshing, error } =
    useRoutineControl(scope, competence)
  const { data: navigationScreens } = useNavigationScreens(scope)
  const { updateTask, transitionTask, createAdHocTask, isTransitioning } =
    useTaskMutations({ ...scope, period: competence })
  const { createCompany, updateCompany, archiveCompany } = useCompanyMutations({
    ...scope,
    period: competence,
  })
  const { createRoutine, updateRoutine } = useRoutineMutations(scope)
  const { createDepartment } = useDepartmentMutations(scope)
  const { createScreen, updateScreen } = useScreenMutations({
    ...scope,
    period: competence,
  })
  const { finalizeCompetence, isFinalizingCompetence } = useCompetenceMutations(
    {
      ...scope,
      period: competence,
    },
  )
  const inviteEmployeeMutation = useMutation({
    mutationFn: (
      input: Parameters<typeof organizationMemberService.invite>[0],
    ) => organizationMemberService.invite(input),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.members(scope),
        exact: true,
      }),
  })
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const selectedTask =
    data?.tasks.find((task) => task.id === selectedTaskId) ?? null
  const [transitionError, setTransitionError] = useState<string | null>(null)
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)
  const competenceStatus = response?.meta.competenceStatus
  const isProjectedCompetence = competenceStatus === 'projected'
  const canOperateTasks =
    isProjectedCompetence || competenceStatus === 'finalized'
  const canCreateAdHocTask = isProjectedCompetence
  const spreadsheetNavigationItems = useMemo(
    () =>
      buildSpreadsheetNavigationItems({
        screens: navigationScreens ?? data?.screens ?? [],
      }),
    [data?.screens, navigationScreens],
  )
  const agendaNavigationItems = useMemo(
    () =>
      buildAgendaNavigationItems({
        screens: navigationScreens ?? data?.screens ?? [],
      }),
    [data?.screens, navigationScreens],
  )
  const spreadsheetSelection = useMemo(
    () =>
      resolveSpreadsheetSelection(spreadsheetNavigationItems, location.search),
    [location.search, spreadsheetNavigationItems],
  )
  const selectedDepartmentGroup = spreadsheetSelection.department
  const selectedScreen = data?.screens.find(
    (screen) => screen.id === spreadsheetSelection.screenId,
  )
  const selectedProjection = data?.spreadsheetProjections.find(
    (projection) => projection.screen.id === spreadsheetSelection.screenId,
  )
  const selectedDepartment = data?.departments.find(
    (department) => department.id === spreadsheetSelection.departmentId,
  )
  const spreadsheetContextQuery = buildSpreadsheetContextQuery({
    screenId: spreadsheetSelection.screenId,
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
        setSelectedTaskId(null)
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
    if (!data || !spreadsheetSelection.screenId) {
      return null
    }

    return selectScreenData(data, spreadsheetSelection.screenId)
  }, [data, spreadsheetSelection.screenId])

  useEffect(() => {
    if (
      !spreadsheetSelection.isFallback ||
      !spreadsheetSelection.screenId ||
      !isSpreadsheetContextRoute(location.pathname, location.search)
    ) {
      return
    }

    const nextSearch = buildSpreadsheetContextQuery(
      {
        screenId: spreadsheetSelection.screenId,
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
    spreadsheetSelection.isFallback,
    spreadsheetSelection.screenId,
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

    if (selectedTask.kind !== 'ad_hoc') {
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

  function canOperateTask(task: Task): boolean {
    return (
      canOperateTasks && (isProjectedCompetence || hasMaterializedTask(task))
    )
  }

  const canEditSelectedTask = Boolean(
    selectedTask &&
    canOperateTask(selectedTask) &&
    canAssignTask(user, selectedTask),
  )
  const selectedTaskStatusChanges =
    selectedTask && canOperateTask(selectedTask)
      ? getAllowedTaskTransitionStatuses(user, selectedTask)
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
    enabled: Boolean(selectedTask && canAssignTask(user, selectedTask)),
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

  const selectedTaskEmployees = useMemo(() => {
    const employees = new Map<string, Employee>()
    const taskEmployees = [
      ...(selectedRelations.employees ?? []),
      ...taskAssignees,
    ]

    taskEmployees.forEach((employee) => employees.set(employee.id, employee))

    return [...employees.values()]
  }, [selectedRelations.employees, taskAssignees])

  function handleRoutineListOpen(routine: Routine) {
    setSelectedTaskId(null)
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
    setSelectedTaskId(null)
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
    setSelectedTaskId(item.task.id)
  }

  async function requestTaskTransition(taskId: string, status: RoutineStatus) {
    const task = data?.tasks.find((item) => item.id === taskId)

    if (
      !task ||
      !canOperateTask(task) ||
      !canTransitionTask(user, task, status) ||
      isTransitioning
    ) {
      return
    }

    const needsReason =
      status === 'no_movement' ||
      status === 'error' ||
      (status === 'pending' && task.status !== 'pending')
    const reason = needsReason
      ? window.prompt('Informe a justificativa para esta alteração de estado.')
      : undefined

    if (needsReason && !reason?.trim()) return

    setTransitionError(null)

    try {
      await transitionTask(taskId, status, reason?.trim())
    } catch (caughtError) {
      setTransitionError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Não foi possível alterar o estado da tarefa.',
      )
    }
  }

  function getTaskForUpdate(taskId: string): Task {
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
  }

  async function updateTaskDetails(
    taskId: string,
    input: TaskPatchInput,
  ): Promise<void> {
    const task = getTaskForUpdate(taskId)

    if (!canOperateTask(task)) {
      throw new Error('A competência atual não permite alterar esta tarefa.')
    }

    await updateTask(taskId, input)
  }

  async function handleTaskAssigneeChange(
    taskId: string,
    assigneeId: string | null,
  ): Promise<void> {
    const task = getTaskForUpdate(taskId)

    if (task.assigneeId === assigneeId) return

    await updateTaskDetails(taskId, { assigneeMemberId: assigneeId })
  }

  async function handleTaskDueDateChange(
    taskId: string,
    dueDate: string,
  ): Promise<void> {
    if (!dueDate) {
      throw new Error('Informe uma data de prazo válida.')
    }

    const task = getTaskForUpdate(taskId)

    if (task.dueDate === dueDate) return

    await updateTaskDetails(taskId, { dueDate })
  }

  async function handleTaskContentChange(
    taskId: string,
    content: { title: string; description: string },
  ): Promise<void> {
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
  }

  async function handleTaskNotesChange(
    taskId: string,
    notes: string,
  ): Promise<void> {
    if (notes.length > 5000) {
      throw new Error('A observação deve ter no máximo 5.000 caracteres.')
    }

    const task = getTaskForUpdate(taskId)

    if ((task.notes ?? '') === notes) return

    await updateTaskDetails(taskId, { observation: notes })
  }

  async function handleCompanyCreate(
    input: CompanySetupInput,
  ): Promise<CreateCompanyResult> {
    return createCompany(input)
  }

  async function handleRoutineCreate(
    input: RoutineInput,
  ): Promise<RoutineResource> {
    return createRoutine(input)
  }

  async function handleCompanyUpdate(
    companyId: string,
    changes: ClientCompanyPatch,
  ): Promise<void> {
    await updateCompany(companyId, changes)
  }

  async function handleCompanyArchive(companyId: string): Promise<void> {
    await archiveCompany(companyId)
    navigate(ROUTES.COMPANIES, { replace: true })
  }

  async function handleRoutineUpdate(
    routineId: string,
    changes: RoutineEditInput,
  ): Promise<void> {
    await updateRoutine(routineId, changes)
  }

  async function handleEmployeeInvite(
    input: Parameters<typeof organizationMemberService.invite>[0],
  ): Promise<MembershipInvitationResource> {
    const { data: invitation } = await inviteEmployeeMutation.mutateAsync(input)
    return invitation
  }

  async function handleScreenCreate(
    input: Parameters<typeof createScreen>[0],
  ): Promise<Screen> {
    return createScreen(input)
  }

  async function handleAdHocTaskCreate(
    input: Parameters<typeof createAdHocTask>[0],
  ) {
    await createAdHocTask(input)
  }

  async function handleCompetenceFinalize(): Promise<void> {
    if (!isOrganizationAdmin(user)) {
      throw new Error(
        'Somente proprietário ou administrador pode finalizar a competência.',
      )
    }

    await finalizeCompetence()
  }

  if (!response || !data) {
    return (
      <Routes>
        <Route
          element={
            <AppLayout
              spreadsheets={spreadsheetNavigationItems}
              agendas={agendaNavigationItems}
            />
          }
        >
          <Route
            path="*"
            element={
              <main
                className="grid min-h-[24rem] place-items-center px-4"
                aria-busy={isInitialLoading || undefined}
              >
                {error ? (
                  <div
                    role="alert"
                    className="max-w-md rounded-[var(--radius-panel)] border border-[var(--status-error-border)] bg-[var(--status-error-bg)] p-5 text-center text-sm font-semibold text-[var(--status-error-text)]"
                  >
                    {error.message}
                  </div>
                ) : (
                  <p
                    role="status"
                    className="text-sm font-semibold text-[var(--color-text-muted)]"
                  >
                    Carregando dados operacionais…
                  </p>
                )}
              </main>
            }
          />
        </Route>
      </Routes>
    )
  }

  const hasSpreadsheetContext = Boolean(
    selectedDepartmentGroup &&
    selectedScreen &&
    selectedProjection &&
    selectedDepartment &&
    visibleData,
  )
  const spreadsheetContextError = (
    <ErrorState
      title="Planilha não encontrada"
      description="Não foi possível determinar a planilha e o departamento selecionados."
    />
  )

  return (
    <>
      {(isRefreshing || isFinalizingCompetence) && (
        <p
          role="status"
          className="fixed bottom-4 right-4 z-40 rounded-[var(--radius-control)] border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] px-3 py-2 text-sm font-semibold text-[var(--color-text-muted)] shadow-[var(--shadow-floating)]"
        >
          {isFinalizingCompetence
            ? 'Finalizando competência…'
            : 'Atualizando dados operacionais…'}
        </p>
      )}
      <Routes>
        <Route
          element={
            <AppLayout
              spreadsheets={spreadsheetNavigationItems}
              agendas={agendaNavigationItems}
            />
          }
        >
          <Route
            index
            element={
              <HomePage
                data={data}
                spreadsheets={spreadsheetNavigationItems}
                generatedAt={response.meta.generatedAt}
                onTaskOpen={(task) => setSelectedTaskId(task.id)}
                competenceStatus={response.meta.competenceStatus}
                onCompetenceFinalize={handleCompetenceFinalize}
              />
            }
          />
          <Route
            path={ROUTES.SPREADSHEET}
            element={
              hasSpreadsheetContext ? (
                <SpreadsheetPage
                  departmentName={selectedDepartmentGroup!.name}
                  screens={selectedDepartmentGroup!.screens}
                  selectedScreenId={spreadsheetSelection.screenId}
                  screen={selectedScreen!}
                  projection={selectedProjection!}
                  visibleData={visibleData!}
                  onClientOpen={handleClientListOpen}
                  onRoutineOpen={handleRoutineListOpen}
                  onTaskOpen={(task) => setSelectedTaskId(task.id)}
                  onTaskStatusChange={requestTaskTransition}
                  getAllowedTaskStatusChanges={(task) =>
                    canOperateTask(task)
                      ? getAllowedTaskTransitionStatuses(user, task)
                      : []
                  }
                />
              ) : (
                spreadsheetContextError
              )
            }
          />
          <Route path={ROUTES.AGENDA} element={<AgendaPage />} />
          <Route path={ROUTES.LIST} element={<ListPage />} />
          <Route
            path={ROUTES.COMPANY_DETAILS}
            element={
              <EntityDetailPage
                type="client"
                data={data}
                screenId={selectedScreen?.id}
                screenName={selectedScreen?.name}
                screenDepartmentId={selectedDepartment?.id}
                onClientUpdate={handleCompanyUpdate}
                onClientArchive={handleCompanyArchive}
                onItemOpen={handleListItemOpen}
                onItemStatusChange={(item, status) =>
                  requestTaskTransition(item.task.id, status)
                }
                getAllowedStatusChanges={(item) =>
                  canOperateTask(item.task)
                    ? getAllowedTaskTransitionStatuses(user, item.task)
                    : []
                }
              />
            }
          />
          <Route
            path={ROUTES.ROUTINE_DETAILS}
            element={
              <EntityDetailPage
                type="routine"
                data={data}
                screenId={selectedScreen?.id}
                screenName={selectedScreen?.name}
                screenDepartmentId={selectedDepartment?.id}
                onRoutineUpdate={handleRoutineUpdate}
                onItemOpen={handleListItemOpen}
                onItemStatusChange={(item, status) =>
                  requestTaskTransition(item.task.id, status)
                }
                getAllowedStatusChanges={(item) =>
                  canOperateTask(item.task)
                    ? getAllowedTaskTransitionStatuses(user, item.task)
                    : []
                }
              />
            }
          />
          <Route
            path={ROUTES.TASKS}
            element={
              <TasksPage
                data={data}
                screenId={selectedScreen?.id}
                screenName={selectedScreen?.name}
                onItemOpen={handleListItemOpen}
                onItemStatusChange={(item, status) =>
                  requestTaskTransition(item.task.id, status)
                }
                getAllowedStatusChanges={(item) =>
                  canOperateTask(item.task)
                    ? getAllowedTaskTransitionStatuses(user, item.task)
                    : []
                }
              />
            }
          />
          <Route
            path={ROUTES.MY_TASKS}
            element={
              <MyTasksPage
                data={data}
                onItemOpen={handleListItemOpen}
                onItemStatusChange={(item, status) =>
                  requestTaskTransition(item.task.id, status)
                }
                getAllowedStatusChanges={(item) =>
                  canOperateTask(item.task)
                    ? getAllowedTaskTransitionStatuses(user, item.task)
                    : []
                }
                onLooseTaskCreate={
                  canCreateAdHocTask ? handleAdHocTaskCreate : undefined
                }
              />
            }
          />
          <Route path={ROUTES.PROFILE} element={<ProfilePage />} />
          <Route
            path={`${ROUTES.SETTINGS}/*`}
            element={
              <RequirePermission
                permission={APP_PERMISSION.MANAGE_ORGANIZATION}
              >
                <SettingsRoutes
                  data={data}
                  onDepartmentCreate={createDepartment}
                  onScreenCreate={createScreen}
                  onScreenUpdate={updateScreen}
                />
              </RequirePermission>
            }
          />
          <Route
            path={ROUTES.ROUTINE_CREATE}
            element={
              <RequirePermission permission={APP_PERMISSION.CREATE_ROUTINE}>
                <CreateRoutinePage
                  departments={data.departments}
                  period={competence}
                  onCreate={handleRoutineCreate}
                  onCancel={() => navigate(ROUTES.ROUTINES)}
                />
              </RequirePermission>
            }
          />
          <Route
            path={ROUTES.COMPANY_CREATE}
            element={
              <RequirePermission permission={APP_PERMISSION.CREATE_COMPANY}>
                <CreateCompanyPage
                  screens={data.screens}
                  routines={data.routines}
                  period={competence}
                  onCreate={handleCompanyCreate}
                  onCancel={() => navigate(ROUTES.COMPANIES)}
                />
              </RequirePermission>
            }
          />
          <Route
            path={ROUTES.EMPLOYEE_CREATE}
            element={
              <RequirePermission permission={APP_PERMISSION.CREATE_EMPLOYEE}>
                <CreateEmployeePage
                  onInvite={handleEmployeeInvite}
                  onCancel={() => navigate(ROUTES.EMPLOYEES)}
                />
              </RequirePermission>
            }
          />
          <Route
            path={ROUTES.SCREEN_CREATE}
            element={
              <RequirePermission permission={APP_PERMISSION.MANAGE_SCREENS}>
                <CreateScreenPage
                  departments={data.departments}
                  clients={data.clients}
                  routines={data.routines}
                  onCreate={handleScreenCreate}
                  onCancel={() => navigate(ROUTES.SETTINGS)}
                />
              </RequirePermission>
            }
          />
          <Route
            path={ROUTES.SCREENS}
            element={
              <RequirePermission permission={APP_PERMISSION.MANAGE_SCREENS}>
                <ScreensPage
                  screens={data.screens}
                  departments={data.departments}
                  clients={data.clients}
                  routines={data.routines}
                  onScreenSave={updateScreen}
                />
              </RequirePermission>
            }
          />
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
            path={ROUTES.ORGANIZATION_DASHBOARD}
            element={
              <PlaceholderPage
                title="Dashboard geral"
                description="Visao consolidada por departamentos, empresas, rotinas e responsaveis."
              />
            }
          />
          <Route
            path={ROUTES.ROUTINES}
            element={<RoutinesPage data={data} />}
          />
          <Route
            path={ROUTES.COMPANIES}
            element={<CompaniesPage data={data} />}
          />
          <Route
            path={ROUTES.EMPLOYEES}
            element={
              <RequirePermission permission={APP_PERMISSION.VIEW_EMPLOYEES}>
                <EmployeesPage departments={data.departments} />
              </RequirePermission>
            }
          />
          <Route
            path={ROUTES.ROLES}
            element={
              <RequirePermission permission={APP_PERMISSION.VIEW_EMPLOYEES}>
                <PlaceholderPage
                  title="Cargos"
                  description="Gerenciamento de permissoes e responsabilidades."
                />
              </RequirePermission>
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
              setSelectedTaskId(null)
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
              employees={selectedTaskEmployees}
              onStatusChange={requestTaskTransition}
              allowedStatusChanges={selectedTaskStatusChanges}
              onAssigneeChange={
                canEditSelectedTask ? handleTaskAssigneeChange : undefined
              }
              onDueDateChange={
                canEditSelectedTask ? handleTaskDueDateChange : undefined
              }
              onContentChange={
                canEditSelectedTask ? handleTaskContentChange : undefined
              }
              onNotesChange={
                canEditSelectedTask ? handleTaskNotesChange : undefined
              }
              onClose={() => setSelectedTaskId(null)}
            />
          </div>
        </div>
      )}

      {transitionError && (
        <p
          role="alert"
          className="fixed right-4 bottom-4 z-[110] max-w-md rounded-[var(--radius-control)] border border-[var(--status-error-border)] bg-[var(--status-error-bg)] px-3 py-2 text-sm font-semibold text-[var(--status-error-text)] shadow-[var(--shadow-floating)]"
        >
          {transitionError}
        </p>
      )}
    </>
  )
}

function hasMaterializedTask(
  task: Task,
): task is Task & { taskId: string; competenceId: string } {
  return Boolean(task.taskId && task.competenceId)
}

function isSpreadsheetContextRoute(pathname: string, search = ''): boolean {
  if (new URLSearchParams(search).get('source') === 'catalog') {
    return false
  }

  if (
    pathname === ROUTES.COMPANY_CREATE ||
    pathname === ROUTES.ROUTINE_CREATE ||
    pathname === ROUTES.EMPLOYEE_CREATE
  ) {
    return false
  }

  return (
    pathname === ROUTES.SPREADSHEET ||
    pathname === ROUTES.LIST ||
    pathname === ROUTES.TASKS ||
    pathname.startsWith(`${ROUTES.COMPANIES}/`) ||
    pathname.startsWith(`${ROUTES.ROUTINES}/`)
  )
}

export default App
