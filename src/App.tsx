import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router'

import ErrorState from './components/common/ErrorState'
import LoadingState from './components/common/LoadingState'
import RequirePermission from './components/auth/RequirePermission'
import RoutineDetailsCard from './components/routine-control/details/RoutineDetailsCard'
import { routineStatusConfig } from './constants/routineStatus'
import { ROUTES } from './constants/routes'
import AppLayout from './layouts/AppLayout'
import AgendaPage from './pages/AgendaPage'
import EntityDetailPage, {
  type RoutineEditInput,
} from './pages/EntityDetailPage'
import CompaniesPage from './pages/CompaniesPage'
import CreateCompanyPage, {
  CompanySetupError,
  type CompanySetupInput,
  type CreateCompanyResult,
} from './pages/CreateCompanyPage'
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
import { useRoutineControl } from './hooks/useRoutineControl'
import { useAuth } from './hooks/useAuth'
import { useAppState } from './hooks/useAppState'
import {
  companyService,
  type ClientCompanyPatch,
} from './services/companyService'
import { competenceService } from './services/competenceService'
import { departmentService } from './services/departmentService'
import { organizationMemberService } from './services/organizationMemberService'
import { routineService } from './services/routineService'
import { screenService } from './services/screenService'
import {
  taskService,
  type TaskPatchInput,
  type TaskResource,
} from './services/taskService'
import type { MembershipInvitationResource } from './services/organizationMemberService'
import type { RoutineInput, RoutineResource } from './services/routineService'
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
  CreateTaskLinkInput,
  Employee,
  Routine,
  RoutineControlData,
  RoutineListItem,
  RoutineStatus,
  Screen,
  ScheduledOccurrence,
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
  const { competence, user } = useAppState()
  const { response, setResponse, data, isLoading, error, reload } =
    useRoutineControl(competence)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [taskAssignees, setTaskAssignees] = useState<Employee[]>([])
  const [pendingTaskTransition, setPendingTaskTransition] = useState<{
    task: Task
    status: RoutineStatus
  } | null>(null)
  const [transitionReason, setTransitionReason] = useState('')
  const [transitionError, setTransitionError] = useState<string | null>(null)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)
  const selectedTaskId = selectedTask?.id
  const competenceStatus = response?.meta.competenceStatus
  const isProjectedCompetence = competenceStatus === 'projected'
  const canOperateTasks =
    isProjectedCompetence || competenceStatus === 'finalized'
  const canCreateAdHocTask = isProjectedCompetence
  const spreadsheetNavigationItems = useMemo(
    () => (data ? buildSpreadsheetNavigationItems(data) : []),
    [data],
  )
  const agendaNavigationItems = useMemo(
    () => (data ? buildAgendaNavigationItems(data) : []),
    [data],
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
      canOperateTasks &&
      (isProjectedCompetence || hasMaterializedTask(task))
    )
  }

  const canEditSelectedTask = Boolean(
    selectedTask &&
      canOperateTask(selectedTask) &&
      canAssignTask(user, selectedTask),
  )
  const selectedTaskStatusChanges = selectedTask && canOperateTask(selectedTask)
    ? getAllowedTaskTransitionStatuses(user, selectedTask)
    : []

  useEffect(() => {
    if (!selectedTask || !canAssignTask(user, selectedTask)) {
      setTaskAssignees([])
      return undefined
    }

    let isCurrent = true

    void departmentService
      .getTaskAssignees(selectedTask.departmentId)
      .then(({ data: assignees }) => {
        if (!isCurrent) return

        setTaskAssignees(
          assignees.map((assignee) => ({
            id: assignee.id,
            name: assignee.displayName,
            role: assignee.organizationRole,
            departmentAccesses: assignee.departmentRole
              ? [
                  {
                    departmentId: selectedTask.departmentId,
                    role: assignee.departmentRole,
                  },
                ]
              : [],
            active: true,
          })),
        )
      })
      .catch(() => {
        if (isCurrent) setTaskAssignees([])
      })

    return () => {
      isCurrent = false
    }
  }, [selectedTask?.departmentId, selectedTask?.id, user])

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

  function requestTaskTransition(taskId: string, status: RoutineStatus) {
    const task = data?.tasks.find((item) => item.id === taskId)

    if (
      !task ||
      !canOperateTask(task) ||
      !canTransitionTask(user, task, status)
    ) {
      return
    }

    setPendingTaskTransition({ task, status })
    setTransitionReason('')
    setTransitionError(null)
  }

  function getTaskForUpdate(taskId: string): Task {
    const task =
      selectedTask?.id === taskId
        ? selectedTask
        : data?.tasks.find((item) => item.id === taskId)

    if (!task) {
      throw new Error('Não foi possível localizar a tarefa para salvar a alteração.')
    }

    return task
  }

  async function getMaterializedTaskEtag(task: Task): Promise<string> {
    if (!hasMaterializedTask(task)) {
      throw new Error(
        'A tarefa não contém os identificadores exigidos pela API para salvar a alteração.',
      )
    }

    if (task.etag) return task.etag

    const currentTask = await taskService.get(task.competenceId, task.taskId)

    if (!currentTask.etag) {
      throw new Error('A API não informou a versão atual da tarefa para salvar.')
    }

    return currentTask.etag
  }

  function applyTaskUpdate(task: Task, assignee: Employee | null) {
    setSelectedTask((current) => (current?.id === task.id ? task : current))
    setResponse((current) => {
      if (!current) return current

      const employees = assignee
        ? [
            ...current.data.employees.filter(
              (employee) => employee.id !== assignee.id,
            ),
            assignee,
          ]
        : current.data.employees

      return {
        ...current,
        data: {
          ...current.data,
          employees,
          tasks: current.data.tasks.map((item) =>
            item.id === task.id ? task : item,
          ),
        },
      }
    })
  }

  async function updateTaskDetails(
    taskId: string,
    input: TaskPatchInput,
  ): Promise<void> {
    const task = getTaskForUpdate(taskId)

    if (!canOperateTask(task)) {
      throw new Error(
        'A competência atual não permite alterar esta tarefa.',
      )
    }

    if (hasMaterializedTask(task)) {
      const etag = await getMaterializedTaskEtag(task)
      const response = await taskService.update(
        task.competenceId,
        task.taskId,
        input,
        etag,
      )
      const updatedTask = toTaskFromResource(
        response.data,
        response.etag ?? etag,
      )

      applyTaskUpdate(updatedTask, toTaskAssignee(response.data.assignee))
      return
    }

    if (!isProjectedCompetence || !task.occurrenceKey) {
      throw new Error(
        'Somente ocorrências recorrentes de uma competência projetada podem ser alteradas por este fluxo.',
      )
    }

    if (!task.etag) {
      throw new Error('A tarefa não informou a versão necessária para salvar.')
    }

    const response = await taskService.updateOccurrence(
      task.period,
      task.occurrenceKey,
      input,
      task.etag,
    )
    const materializedCompetence =
      response.data.taskId && !task.competenceId
        ? await competenceService.getByPeriod(task.period)
        : null
    const updatedTask = toTaskFromScheduledOccurrence(
      response.data,
      response.etag ?? response.data.etag,
      task.competenceId ?? materializedCompetence?.data.id ?? null,
    )

    applyTaskUpdate(updatedTask, toTaskAssignee(response.data.assignee))
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

  async function handleTaskLinkAdd(
    taskId: string,
    link: CreateTaskLinkInput,
  ): Promise<void> {
    const task = getTaskForUpdate(taskId)
    const links = task.links ?? []

    if (links.length >= 20) {
      throw new Error('Esta tarefa já atingiu o limite de 20 links.')
    }

    await updateTaskDetails(taskId, {
      links: [...links, link].map(({ label, url }) => ({ label, url })),
    })
  }

  async function handleTaskLinkRemove(
    taskId: string,
    linkId: string,
  ): Promise<void> {
    const task = getTaskForUpdate(taskId)
    const links = task.links ?? []
    const remainingLinks = links.filter((link) => link.id !== linkId)

    if (remainingLinks.length === links.length) {
      throw new Error('Não foi possível localizar o link para remover.')
    }

    await updateTaskDetails(taskId, {
      links: remainingLinks.map(({ label, url }) => ({ label, url })),
    })
  }

  async function confirmTaskTransition() {
    if (!pendingTaskTransition) return

    const { task, status } = pendingTaskTransition
    const reason = transitionReason.trim()

    if (transitionRequiresReason(task.status, status) && !reason) {
      setTransitionError('Informe a justificativa exigida para esta transição.')
      return
    }

    setIsTransitioning(true)
    setTransitionError(null)

    try {
      if (hasMaterializedTask(task)) {
        const etag = await getMaterializedTaskEtag(task)
        await taskService.transition(
          task.competenceId,
          task.taskId,
          { targetStatus: status, reason },
          etag,
        )
      } else if (isProjectedCompetence && task.occurrenceKey && task.etag) {
        await taskService.transitionOccurrence(
          task.period,
          task.occurrenceKey,
          { targetStatus: status, reason },
          task.etag,
        )
      } else {
        throw new Error(
          'A tarefa não contém os identificadores exigidos pela API.',
        )
      }

      setPendingTaskTransition(null)
      setSelectedTask(null)
      await reload()
    } catch (caughtError) {
      setTransitionError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Não foi possível alterar o estado da tarefa.',
      )
    } finally {
      setIsTransitioning(false)
    }
  }

  async function handleCompanyCreate(
    input: CompanySetupInput,
  ): Promise<CreateCompanyResult> {
    let company: { id: string; name: string } | null = null
    let linkedRoutineCount = 0
    let screenLinked = false
    let screenName: string | undefined

    try {
      const createdCompany = await companyService.create(input.company)
      company = {
        id: createdCompany.data.id,
        name: createdCompany.data.name,
      }

      for (const routineId of input.routineIds) {
        await companyService.createRoutineAssignment(company.id, {
          routineId,
          startsOn: input.startsOn,
          endsOn: null,
        })
        linkedRoutineCount += 1
      }

      if (input.screenId) {
        const screenSnapshot = await screenService.get(input.screenId)

        if (!screenSnapshot.etag) {
          throw new Error(
            'A API não informou a versão da tela para atualizar sua visualização.',
          )
        }

        screenName = screenSnapshot.data.name
        const companyIds = screenSnapshot.data.companies.map((item) => item.id)

        if (!companyIds.includes(company.id)) {
          await screenService.update(
            input.screenId,
            { companyIds: [...companyIds, company.id] },
            screenSnapshot.etag,
          )
        }
        screenLinked = true
      }

      await reload()

      return {
        company,
        linkedRoutineCount,
        screenName,
      }
    } catch (caughtError) {
      if (!company) throw caughtError

      try {
        await reload()
      } catch {
        // A falha principal continua sendo mais útil para orientar a recuperação.
      }

      const nextStep =
        linkedRoutineCount < input.routineIds.length
          ? 'Abra a empresa e conclua os vínculos de rotina restantes.'
          : input.screenId && !screenLinked
            ? 'Abra a tela escolhida e inclua a empresa na composição visual.'
            : 'Atualize a página para confirmar a operação concluída.'

      throw new CompanySetupError(
        caughtError instanceof Error
          ? caughtError.message
          : 'A sequência de configuração da empresa foi interrompida.',
        {
          company,
          linkedRoutineCount,
          requestedRoutineCount: input.routineIds.length,
          screenLinked,
          nextStep,
        },
      )
    }
  }

  async function handleRoutineCreate(
    input: RoutineInput,
  ): Promise<RoutineResource> {
    const { data: routine } = await routineService.create(input)
    await reload()
    return routine
  }

  async function handleCompanyUpdate(
    companyId: string,
    changes: ClientCompanyPatch,
  ): Promise<void> {
    const currentCompany = await companyService.get(companyId)

    if (!currentCompany.etag) {
      throw new Error(
        'Não foi possível obter a versão atual da empresa para salvar as alterações.',
      )
    }

    await companyService.update(companyId, changes, currentCompany.etag)
    await reload()
  }

  async function handleCompanyArchive(companyId: string): Promise<void> {
    const currentCompany = await companyService.get(companyId)

    if (!currentCompany.etag) {
      throw new Error(
        'Não foi possível obter a versão atual da empresa para arquivá-la.',
      )
    }

    await companyService.archive(companyId, currentCompany.etag)
    await reload()
    navigate(ROUTES.COMPANIES, { replace: true })
  }

  async function handleRoutineUpdate(
    routineId: string,
    changes: RoutineEditInput,
  ): Promise<void> {
    let currentRoutine = await routineService.get(routineId)

    if (!currentRoutine.etag) {
      throw new Error(
        'Não foi possível obter a versão atual da rotina para salvar as alterações.',
      )
    }

    const identityChanged =
      currentRoutine.data.name !== changes.name ||
      currentRoutine.data.shotname !== changes.shotname

    if (identityChanged) {
      currentRoutine = await routineService.updateIdentity(
        routineId,
        { name: changes.name, shotname: changes.shotname },
        currentRoutine.etag,
      )
    }

    const currentVersion = currentRoutine.data.currentVersion
    const versionChanged =
      currentVersion.description !== changes.description ||
      currentVersion.recurrence !== changes.recurrence ||
      currentVersion.defaultDueDays !== changes.defaultDueDays ||
      (currentVersion.defaultAssigneeMemberId ?? null) !==
        (changes.defaultAssigneeMemberId ?? null) ||
      currentVersion.recurrenceMonths.join(',') !==
        changes.recurrenceMonths.join(',')

    if (versionChanged) {
      if (!currentRoutine.etag) {
        throw new Error(
          'A API não informou a versão necessária para publicar a nova regra da rotina.',
        )
      }

      await routineService.publishVersion(
        routineId,
        {
          description: changes.description,
          recurrence: changes.recurrence,
          defaultDueDays: changes.defaultDueDays,
          recurrenceMonths: changes.recurrenceMonths,
          defaultAssigneeMemberId:
            changes.defaultAssigneeMemberId ?? null,
        },
        currentRoutine.etag,
      )
    }

    await reload()
  }

  async function handleEmployeeInvite(
    input: Parameters<typeof organizationMemberService.invite>[0],
  ): Promise<MembershipInvitationResource> {
    const { data: invitation } = await organizationMemberService.invite(input)
    return invitation
  }

  async function handleScreenCreate(
    input: Parameters<typeof screenService.create>[0],
  ): Promise<Screen> {
    const { data: screen } = await screenService.create(input)
    await reload()
    return screen
  }

  async function handleAdHocTaskCreate(
    input: Parameters<typeof taskService.createAdHoc>[1],
  ) {
    const competenceResponse = await competenceService.getByPeriod(competence)
    const projection = competenceResponse.data
    if (projection.status !== 'projected') {
      throw new Error('A competência atual não aceita novas tarefas.')
    }

    const createdCompetence = projection.id
      ? null
      : await competenceService.create(competence)
    const competenceId = projection.id ?? createdCompetence?.data.id

    if (
      !competenceId ||
      (createdCompetence && createdCompetence.data.status !== 'projected')
    ) {
      throw new Error('Não foi possível preparar a competência para a nova tarefa.')
    }

    await taskService.createAdHoc(
      competenceId,
      input,
      `ad-hoc-${globalThis.crypto.randomUUID()}`,
    )
    await reload()
  }

  async function handleCompetenceFinalize(): Promise<void> {
    if (!isOrganizationAdmin(user)) {
      throw new Error(
        'Somente proprietário ou administrador pode finalizar a competência.',
      )
    }

    const currentCompetence = await competenceService.getByPeriod(competence)

    if (currentCompetence.data.status !== 'projected') {
      await reload()
      return
    }

    if (currentCompetence.data.id && !currentCompetence.etag) {
      throw new Error(
        'A API não informou a versão atual da competência para finalizar o período.',
      )
    }

    await competenceService.finalizeByPeriod(
      competence,
      currentCompetence.data.id
        ? currentCompetence.etag ?? undefined
        : undefined,
    )
    await reload()
  }

  if (isLoading) {
    return <LoadingState message="Carregando rotinas..." />
  }

  if (error || !response || !data) {
    return (
      <ErrorState
        title="Nao foi possivel carregar os dados"
        description="Não foi possível carregar os dados da API."
      />
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
                onTaskOpen={setSelectedTask}
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
                  onTaskOpen={setSelectedTask}
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
                onClientRoutineAssignmentsChange={reload}
                onItemOpen={handleListItemOpen}
                onItemStatusChange={(item, change) =>
                  requestTaskTransition(item.task.id, change.status)
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
                onItemStatusChange={(item, change) =>
                  requestTaskTransition(item.task.id, change.status)
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
                onItemStatusChange={(item, change) =>
                  requestTaskTransition(item.task.id, change.status)
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
                onItemStatusChange={(item, change) =>
                  requestTaskTransition(item.task.id, change.status)
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
                <SettingsRoutes data={data} onReload={reload} />
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
                  onScreenUpdated={reload}
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
              onLinkAdd={canEditSelectedTask ? handleTaskLinkAdd : undefined}
              onLinkRemove={
                canEditSelectedTask ? handleTaskLinkRemove : undefined
              }
              onClose={() => setSelectedTask(null)}
            />
          </div>
        </div>
      )}

      {pendingTaskTransition && (
        <TaskTransitionDialog
          task={pendingTaskTransition.task}
          status={pendingTaskTransition.status}
          reason={transitionReason}
          error={transitionError}
          isSubmitting={isTransitioning}
          onReasonChange={setTransitionReason}
          onCancel={() => {
            if (!isTransitioning) setPendingTaskTransition(null)
          }}
          onConfirm={() => void confirmTaskTransition()}
        />
      )}
    </>
  )
}

function TaskTransitionDialog({
  task,
  status,
  reason,
  error,
  isSubmitting,
  onReasonChange,
  onCancel,
  onConfirm,
}: {
  task: Task
  status: RoutineStatus
  reason: string
  error: string | null
  isSubmitting: boolean
  onReasonChange: (value: string) => void
  onCancel: () => void
  onConfirm: () => void
}) {
  const requiresReason = transitionRequiresReason(task.status, status)
  const statusLabel = routineStatusConfig[status].label

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-[var(--color-overlay-bg)] p-4 backdrop-blur-[2px]"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSubmitting) onCancel()
      }}
    >
      <section
        className="w-full max-w-lg rounded-[var(--radius-panel)] border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] p-5 shadow-[var(--shadow-floating)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-transition-title"
      >
        <h2
          id="task-transition-title"
          className="text-lg font-extrabold text-[var(--color-text-strong)]"
        >
          Alterar para {statusLabel}
        </h2>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          {task.title ?? 'Esta tarefa'} será atualizada diretamente na API.
        </p>

        <label className="mt-4 grid gap-1.5 text-sm font-bold text-[var(--color-text-main)]">
          <span>Justificativa{requiresReason ? ' *' : ' (opcional)'}</span>
          <textarea
            value={reason}
            onChange={(event) => onReasonChange(event.currentTarget.value)}
            disabled={isSubmitting}
            required={requiresReason}
            maxLength={1000}
            rows={4}
            className="rounded-[var(--radius-control)] border border-[var(--color-control-border)] bg-[var(--color-control-bg)] p-3 text-[var(--color-control-text)]"
          />
        </label>
        {error && (
          <p
            role="alert"
            className="mt-3 text-sm font-semibold text-[var(--status-error-text)]"
          >
            {error}
          </p>
        )}
        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="min-h-10 rounded-[var(--radius-control)] border border-[var(--color-button-neutral-border)] px-4 text-sm font-bold disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="min-h-10 rounded-[var(--radius-control)] bg-[var(--color-button-primary-bg)] px-4 text-sm font-bold text-[var(--color-button-primary-text)] disabled:opacity-60"
          >
            {isSubmitting ? 'Salvando…' : 'Confirmar'}
          </button>
        </div>
      </section>
    </div>
  )
}

function transitionRequiresReason(
  currentStatus: RoutineStatus,
  nextStatus: RoutineStatus,
): boolean {
  return (
    nextStatus === 'error' ||
    nextStatus === 'no_movement' ||
    (nextStatus === 'pending' && currentStatus !== 'pending')
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

function toTaskFromScheduledOccurrence(
  occurrence: ScheduledOccurrence,
  etag: string | null,
  competenceId: string | null,
): Task {
  return {
    id: occurrence.occurrenceKey,
    occurrenceKey: occurrence.occurrenceKey,
    taskId: occurrence.taskId,
    competenceId,
    etag: etag ?? occurrence.etag,
    persistence: occurrence.persistence,
    kind: occurrence.kind,
    title: occurrence.title,
    description: occurrence.description,
    clientId: occurrence.clientCompanyId,
    routineId: occurrence.routineId,
    departmentId: occurrence.departmentId,
    assigneeId: occurrence.assignee?.id ?? null,
    status: occurrence.status,
    period: occurrence.referenceMonth.slice(0, 7),
    referenceMonth: occurrence.referenceMonth,
    dueDate: occurrence.dueDate,
    completedAt:
      occurrence.status === 'completed'
        ? (occurrence.updatedAt ?? occurrence.createdAt)
        : null,
    notes: occurrence.observation || undefined,
    links: toTaskLinks(occurrence.occurrenceKey, occurrence.links),
    createdAt: occurrence.createdAt ?? undefined,
    updatedAt: occurrence.updatedAt,
    indicators: { attachments: 0 },
  }
}

function toTaskFromResource(resource: TaskResource, etag: string | null): Task {
  const stableId = resource.occurrenceKey ?? resource.id

  return {
    id: stableId,
    occurrenceKey: resource.occurrenceKey ?? undefined,
    taskId: resource.id,
    competenceId: resource.competenceId,
    etag: etag ?? undefined,
    persistence: resource.occurrenceKey ? 'materialized' : undefined,
    kind: resource.kind,
    title: resource.title,
    description: resource.description,
    clientId: resource.clientCompanyId,
    routineId: resource.routineId,
    departmentId: resource.departmentId,
    assigneeId: resource.assignee?.id ?? null,
    status: resource.status,
    period: resource.competence.slice(0, 7),
    referenceMonth: resource.competence,
    dueDate: resource.dueDate,
    completedAt: resource.status === 'completed' ? resource.updatedAt : null,
    notes: resource.observation || undefined,
    links: toTaskLinks(stableId, resource.links),
    createdAt: resource.createdAt,
    updatedAt: resource.updatedAt,
    indicators: { attachments: 0 },
  }
}

function toTaskLinks(
  taskId: string,
  links: Array<{ label: string; url: string }>,
) {
  return links.map((link, index) => ({
    id: `${taskId}:link:${index}`,
    label: link.label,
    url: link.url,
  }))
}

function toTaskAssignee(
  assignee: { id: string; displayName: string } | null,
): Employee | null {
  return assignee
    ? { id: assignee.id, name: assignee.displayName, active: true }
    : null
}

export default App
