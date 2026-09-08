import { useMemo } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import LoadingState from './components/common/LoadingState'
import TaskDetailsDialog from './components/routine-control/details/TaskDetailsDialog'
import { isInternalRoute, ROUTES } from './constants/routes'
import { useAppState } from './hooks/useAppState'
import { useAuth } from './hooks/useAuth'
import { useCompanyMutations } from './hooks/mutations/useCompanyMutations'
import { useCompetenceMutations } from './hooks/mutations/useCompetenceMutations'
import { useDepartmentMutations } from './hooks/mutations/useDepartmentMutations'
import { useRoutineMutations } from './hooks/mutations/useRoutineMutations'
import { useScreenMutations } from './hooks/mutations/useScreenMutations'
import { useNavigationScreens } from './hooks/useNavigationScreens'
import { useRoutineControl } from './hooks/useRoutineControl'
import { useSpreadsheetContext } from './hooks/useSpreadsheetContext'
import { useTaskDetailsController } from './hooks/useTaskDetailsController'
import AcceptInvitationPage from './pages/AcceptInvitationPage'
import LoginPage from './pages/LoginPage'
import MembershipSelectionPage from './pages/MembershipSelectionPage'
import InternalAccessDeniedPage from './pages/internal/InternalAccessDeniedPage'
import { queryKeys } from './query/queryKeys'
import AuthenticatedRoutes from './routes/AuthenticatedRoutes'
import InternalAdminRoutes from './routes/InternalAdminRoutes'
import type { MembershipSummary } from './services/authService'
import { organizationMemberService } from './services/organizationMemberService'
import type { MembershipInvitationResource } from './services/organizationMemberService'
import { isOrganizationAdmin } from './utils/permissions'

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

  if (!activeMembership) {
    return <MembershipSelectionPage />
  }

  if (location.pathname === ROUTES.LOGIN) {
    return <LoginPage />
  }

  return <AuthenticatedApp activeMembership={activeMembership} />
}

function AuthenticatedApp({
  activeMembership,
}: {
  activeMembership: MembershipSummary
}) {
  const queryClient = useQueryClient()
  const { competence, user } = useAppState()
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

  async function handleEmployeeInvite(
    input: Parameters<typeof organizationMemberService.invite>[0],
  ): Promise<MembershipInvitationResource> {
    const { data: invitation } = await inviteEmployeeMutation.mutateAsync(input)
    return invitation
  }

  async function handleCompetenceFinalize(): Promise<void> {
    if (!isOrganizationAdmin(user)) {
      throw new Error(
        'Somente propriet\u00e1rio ou administrador pode finalizar a compet\u00eancia.',
      )
    }

    await finalizeCompetence()
  }

  return (
    <>
      {(isRefreshing || isFinalizingCompetence) && (
        <p
          role="status"
          className="fixed bottom-4 right-4 z-40 rounded-[var(--radius-control)] border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] px-3 py-2 text-sm font-semibold text-[var(--color-text-muted)] shadow-[var(--shadow-floating)]"
        >
          {isFinalizingCompetence
            ? 'Finalizando compet\u00eancia\u2026'
            : 'Atualizando dados operacionais\u2026'}
        </p>
      )}

      <AuthenticatedRoutes
        data={data}
        generatedAt={response?.meta.generatedAt}
        competence={competence}
        competenceStatus={response?.meta.competenceStatus}
        spreadsheetContext={spreadsheetContext}
        taskDetails={taskDetails}
        isOperationalDataLoading={isInitialLoading}
        operationalDataError={error}
        onRetryOperationalData={() => void refetch()}
        onCompetenceFinalize={handleCompetenceFinalize}
        onCompanyCreate={createCompany}
        onCompanyUpdate={updateCompany}
        onCompanyArchive={archiveCompany}
        onRoutineCreate={createRoutine}
        onRoutineUpdate={updateRoutine}
        onEmployeeInvite={handleEmployeeInvite}
        onDepartmentCreate={createDepartment}
        onScreenCreate={createScreen}
        onScreenUpdate={updateScreen}
      />

      {taskDetails.selectedTask && (
        <TaskDetailsDialog
          task={taskDetails.selectedTask}
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

      {taskDetails.transitionError && (
        <div
          role="alert"
          className="fixed right-4 bottom-4 z-[110] flex max-w-md items-center gap-3 rounded-[var(--radius-control)] border border-[var(--status-error-border)] bg-[var(--status-error-bg)] px-3 py-2 text-sm font-semibold text-[var(--status-error-text)] shadow-[var(--shadow-floating)]"
        >
          <span>{taskDetails.transitionError}</span>
          <button
            type="button"
            onClick={taskDetails.dismissTransitionError}
            className="grid size-7 shrink-0 place-items-center rounded-[var(--radius-control)] hover:bg-black/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-control-focus)]"
            aria-label="Fechar alerta"
          >
            {'\u00d7'}
          </button>
        </div>
      )}
    </>
  )
}

export default App
