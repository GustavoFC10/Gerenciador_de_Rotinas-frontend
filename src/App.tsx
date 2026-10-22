import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router'

import LoadingState from './components/common/LoadingState'
import TaskAttachmentsPanel from './components/files/TaskAttachmentsPanel'
import TaskAttachmentUpload, {
  type TaskAttachmentUploadHandle,
} from './components/files/TaskAttachmentUpload'
import TaskDetailsDialog from './components/routine-control/details/TaskDetailsDialog'
import { FileUploadsProvider } from './contexts/FileUploadsContext'
import { isInternalRoute, ROUTES } from './constants/routes'
import { useAppState } from './hooks/useAppState'
import { useAuth } from './hooks/useAuth'
import { useModuleAccess } from './hooks/useModuleAccess'
import { useCompanyMutations } from './hooks/mutations/useCompanyMutations'
import { useCompetenceMutations } from './hooks/mutations/useCompetenceMutations'
import { useDepartmentMutations } from './hooks/mutations/useDepartmentMutations'
import { useRoutineMutations } from './hooks/mutations/useRoutineMutations'
import { useScreenMutations } from './hooks/mutations/useScreenMutations'
import { useNavigationScreens } from './hooks/useNavigationScreens'
import { useNotifications } from './hooks/useNotifications'
import { useRoutineControl } from './hooks/useRoutineControl'
import { useSpreadsheetContext } from './hooks/useSpreadsheetContext'
import { useTaskDetailsController } from './hooks/useTaskDetailsController'
import AcceptInvitationPage from './pages/AcceptInvitationPage'
import LoginPage from './pages/LoginPage'
import HubPage from './pages/HubPage'
import ProfilePage from './pages/ProfilePage'
import ModuleWorkspaceLayout from './layouts/ModuleWorkspaceLayout'
import MembershipSelectionPage from './pages/MembershipSelectionPage'
import InternalAccessDeniedPage from './pages/internal/InternalAccessDeniedPage'
import AuthenticatedRoutes from './routes/AuthenticatedRoutes'
import InternalAdminRoutes from './routes/InternalAdminRoutes'
import type { MembershipSummary } from './services/authService'
import { isRoutinesAdmin } from './utils/permissions'

const TeamModulePage = lazy(() => import('./pages/TeamModulePage'))
const ProcessesPage = lazy(() => import('./pages/processes/ProcessesPage'))

function App() {
  const { activeMembership, isAuthenticated, isInitializing, session } =
    useAuth()
  const location = useLocation()

  if (location.pathname === ROUTES.ACCEPT_INVITATION) {
    return <AcceptInvitationPage />
  }

  if (isInitializing) {
    return <LoadingState message={'Restaurando sess\u00e3o...'} />
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

  // A area interna nao depende de uma organization ativa nem dos dados
  // operacionais carregados por AuthenticatedApp.
  if (isInternalRoute(location.pathname)) {
    if (!session?.user.isPlatformStaff) {
      return <InternalAccessDeniedPage />
    }

    return <InternalAdminRoutes />
  }

  // Contas Django is_staff usam exclusivamente a administração interna. Elas
  // podem não ter uma associação organizacional para selecionar.
  if (session?.user.isPlatformStaff) {
    return <Navigate to={ROUTES.INTERNAL_ORGANIZATIONS} replace />
  }

  if (!activeMembership) {
    return <MembershipSelectionPage />
  }

  if (location.pathname === ROUTES.LOGIN) {
    return <LoginPage />
  }

  return (
    <ModuleRouter
      key={`${activeMembership.organization.id}:${activeMembership.id}`}
      activeMembership={activeMembership}
    />
  )
}

function ModuleRouter({
  activeMembership,
}: {
  activeMembership: MembershipSummary
}) {
  const location = useLocation()
  const { canAccessModule, isLoading, error } = useModuleAccess()

  if (location.pathname === ROUTES.HUB) return <HubPage />
  if (location.pathname === ROUTES.HUB_PROFILE)
    return (
      <ModuleWorkspaceLayout>
        <ProfilePage />
      </ModuleWorkspaceLayout>
    )

  if (
    location.pathname === ROUTES.EMPLOYEES ||
    location.pathname.startsWith(ROUTES.EMPLOYEES + '/')
  ) {
    return activeMembership.role === 'owner' ? (
      <Suspense fallback={<LoadingState message="Carregando Equipe…" />}>
        <TeamModulePage />
      </Suspense>
    ) : (
      <Navigate to={ROUTES.HUB} replace />
    )
  }
  const legacyTeamPath =
    location.pathname === ROUTES.SETTINGS_MODULES ||
    location.pathname === ROUTES.ROLES
      ? ROUTES.TEAM_ACCESS
      : location.pathname === '/funcionarios'
        ? ROUTES.EMPLOYEES
        : location.pathname === '/funcionarios/novo'
          ? ROUTES.EMPLOYEE_CREATE
          : null
  if (legacyTeamPath)
    return (
      <Navigate
        to={
          activeMembership.role === 'owner'
            ? legacyTeamPath + location.search
            : ROUTES.HUB
        }
        replace
      />
    )

  if (isLoading) return <LoadingState message="Carregando seus acessos…" />
  if (error) return <Navigate to={ROUTES.HUB} replace />

  if (
    location.pathname === ROUTES.PROCESSES ||
    location.pathname.startsWith(`${ROUTES.PROCESSES}/`)
  ) {
    return canAccessModule('processes') ? (
      <Suspense fallback={<LoadingState message="Carregando Processos…" />}>
        <ProcessesPage />
      </Suspense>
    ) : (
      <Navigate to={ROUTES.HUB} replace />
    )
  }

  if (!canAccessModule('routines')) return <Navigate to={ROUTES.HUB} replace />

  return (
    <FileUploadsProvider
      key={`${activeMembership.organization.id}:${activeMembership.id}`}
      scope={{
        organizationId: activeMembership.organization.id,
        membershipId: activeMembership.id,
      }}
    >
      <AuthenticatedApp activeMembership={activeMembership} />
    </FileUploadsProvider>
  )
}

function AuthenticatedApp({
  activeMembership,
}: {
  activeMembership: MembershipSummary
}) {
  const { notify, setActivity } = useNotifications()
  const { competence, user } = useAppState()
  const attachmentUploadRef = useRef<TaskAttachmentUploadHandle | null>(null)
  const [canStartAttachmentUpload, setCanStartAttachmentUpload] = useState(true)
  const scope = useMemo(
    () => ({
      organizationId: activeMembership.organization.id,
      membershipId: activeMembership.id,
    }),
    [activeMembership.id, activeMembership.organization.id],
  )
  const { response, data, isInitialLoading, isRefreshing, error, refetch } =
    useRoutineControl(scope, competence)
  const { data: navigationScreens } = useNavigationScreens(scope)
  const spreadsheetContext = useSpreadsheetContext({
    data,
    navigationScreens,
  })
  const taskDetails = useTaskDetailsController({
    scope,
    period: competence,
    data,
    user,
    competenceStatus: response?.meta.competenceStatus,
    selectedDepartment: spreadsheetContext.selectedDepartment,
  })
  const { createCompany, updateCompany, archiveCompany, restoreCompany } =
    useCompanyMutations({
      ...scope,
      period: competence,
    })
  const { createRoutine, updateRoutine, archiveRoutine, restoreRoutine } =
    useRoutineMutations(scope)
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
  async function handleCompetenceFinalize(): Promise<void> {
    if (!isRoutinesAdmin(user)) {
      throw new Error(
        'Somente propriet\u00e1rio ou administrador pode finalizar a compet\u00eancia.',
      )
    }

    await finalizeCompetence()
  }

  useEffect(() => {
    setActivity(
      'operational-data',
      isFinalizingCompetence
        ? 'Finalizando competência…'
        : isRefreshing
          ? 'Atualizando dados operacionais…'
          : null,
    )
    return () => setActivity('operational-data', null)
  }, [isFinalizingCompetence, isRefreshing, setActivity])

  const { transitionError, dismissTransitionError } = taskDetails
  useEffect(() => {
    if (!transitionError) return
    notify({
      title: 'Não foi possível alterar a tarefa',
      message: transitionError,
      tone: 'error',
      dedupeKey: 'task-transition-error',
    })
    dismissTransitionError()
  }, [notify, transitionError, dismissTransitionError])

  return (
    <>
      <AuthenticatedRoutes
        data={data}
        generatedAt={response?.meta.generatedAt}
        competence={competence}
        competenceStatus={response?.meta.competenceStatus}
        spreadsheetContext={spreadsheetContext}
        taskDetails={taskDetails}
        onTaskAttachmentAdd={(task) => attachmentUploadRef.current?.open(task)}
        canTaskAttach={(task) =>
          canStartAttachmentUpload && taskDetails.canAttachTask(task)
        }
        isOperationalDataLoading={isInitialLoading}
        operationalDataError={error}
        onRetryOperationalData={() => void refetch()}
        onCompetenceFinalize={handleCompetenceFinalize}
        onCompanyCreate={createCompany}
        onCompanyUpdate={updateCompany}
        onCompanyArchive={archiveCompany}
        onCompanyRestore={restoreCompany}
        onRoutineCreate={createRoutine}
        onRoutineUpdate={updateRoutine}
        onRoutineArchive={archiveRoutine}
        onRoutineRestore={restoreRoutine}
        onDepartmentCreate={createDepartment}
        onScreenCreate={createScreen}
        onScreenUpdate={updateScreen}
      />

      <TaskAttachmentUpload
        key={`${scope.organizationId}:${scope.membershipId}`}
        ref={attachmentUploadRef}
        scope={scope}
        user={user}
        competenceStatus={response?.meta.competenceStatus}
        onAvailabilityChange={setCanStartAttachmentUpload}
      />

      {taskDetails.selectedTask && (
        <TaskDetailsDialog
          task={taskDetails.selectedTask}
          attachmentsPanel={
            <TaskAttachmentsPanel
              key={`${scope.organizationId}:${scope.membershipId}:${taskDetails.selectedTask.period}:${taskDetails.selectedTask.id}`}
              task={taskDetails.selectedTask}
              scope={scope}
              user={user}
              competenceStatus={response?.meta.competenceStatus}
            />
          }
          {...taskDetails.selectedRelations}
          employees={taskDetails.selectedTaskEmployees}
          onStatusChange={taskDetails.requestTaskTransition}
          allowedStatusChanges={taskDetails.selectedTaskStatusChanges}
          onAssigneeChange={
            taskDetails.canEditSelectedTask
              ? taskDetails.handleTaskAssigneeChange
              : undefined
          }
          onDueDateChange={
            taskDetails.canEditSelectedTask
              ? taskDetails.handleTaskDueDateChange
              : undefined
          }
          onContentChange={
            taskDetails.canEditSelectedTask
              ? taskDetails.handleTaskContentChange
              : undefined
          }
          onNotesChange={
            taskDetails.canEditSelectedTask
              ? taskDetails.handleTaskNotesChange
              : undefined
          }
          onClose={taskDetails.closeTask}
        />
      )}
    </>
  )
}

export default App
