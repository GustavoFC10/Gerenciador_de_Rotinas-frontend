import {
  Navigate,
  Route,
  Routes,
  useNavigate,
  type NavigateFunction,
} from 'react-router'

import RequirePermission from '../components/auth/RequirePermission'
import ErrorState from '../components/common/ErrorState'
import { ROUTES } from '../constants/routes'
import { useTaskDetailsController } from '../hooks/useTaskDetailsController'
import AppLayout from '../layouts/AppLayout'
import AgendaPage from '../pages/AgendaPage'
import CompaniesPage from '../pages/CompaniesPage'
import CreateCompanyPage from '../pages/CreateCompanyPage'
import CreateEmployeePage from '../pages/CreateEmployeePage'
import CreateRoutinePage from '../pages/CreateRoutinePage'
import CreateScreenPage from '../pages/CreateScreenPage'
import EmployeesPage from '../pages/EmployeesPage'
import EntityDetailPage from '../pages/EntityDetailPage'
import HomePage from '../pages/HomePage'
import ListPage from '../pages/ListPage'
import MyTasksPage from '../pages/MyTasksPage'
import PlaceholderPage from '../pages/PlaceholderPage'
import ProfilePage from '../pages/ProfilePage'
import RoutinesPage from '../pages/RoutinesPage'
import ScreensPage from '../pages/ScreensPage'
import SettingsRoutes from '../pages/settings/SettingsRoutes'
import SpreadsheetPage from '../pages/SpreadsheetPage'
import TasksPage from '../pages/TasksPage'
import type { SpreadsheetContext } from '../hooks/useSpreadsheetContext'
import type { ClientCompanyPatch } from '../services/companyService'
import type { DepartmentInput } from '../services/departmentService'
import type { ScreenInput, ScreenPatch } from '../services/screenService'
import type {
  CompanySetupInput,
  CreateCompanyResult,
} from '../types/companySetup'
import type {
  CompetenceStatus,
  Client,
  Department,
  RoutineControlData,
  Screen,
} from '../types/domain'
import type {
  MembershipInvitationInput,
  MembershipInvitationResource,
} from '../services/organizationMemberService'
import type { RoutineEditInput } from '../types/routine'
import type { RoutineInput, RoutineResource } from '../services/routineService'
import { getErrorPresentation } from '../utils/apiErrors'
import { APP_PERMISSION } from '../utils/permissions'

type TaskDetailsController = ReturnType<typeof useTaskDetailsController>

interface AuthenticatedRoutesProps {
  data: RoutineControlData | null
  generatedAt?: string
  competence: string
  competenceStatus?: CompetenceStatus
  spreadsheetContext: SpreadsheetContext
  taskDetails: TaskDetailsController
  isOperationalDataLoading: boolean
  operationalDataError: Error | null
  onRetryOperationalData: () => void
  onCompetenceFinalize: () => Promise<void>
  onCompanyCreate: (input: CompanySetupInput) => Promise<CreateCompanyResult>
  onCompanyUpdate: (
    companyId: string,
    changes: ClientCompanyPatch,
  ) => Promise<Client>
  onCompanyArchive: (companyId: string) => Promise<void>
  onCompanyRestore: (companyId: string) => Promise<Client>
  onRoutineCreate: (input: RoutineInput) => Promise<RoutineResource>
  onRoutineUpdate: (
    routineId: string,
    changes: RoutineEditInput,
  ) => Promise<RoutineResource>
  onRoutineArchive: (routineId: string) => Promise<void>
  onRoutineRestore: (routineId: string) => Promise<RoutineResource>
  onEmployeeInvite: (
    input: MembershipInvitationInput,
  ) => Promise<MembershipInvitationResource>
  onDepartmentCreate: (input: DepartmentInput) => Promise<Department>
  onScreenCreate: (input: ScreenInput) => Promise<Screen>
  onScreenUpdate: (
    screenId: string,
    changes: ScreenPatch,
    etag: string,
  ) => Promise<Screen>
}

function AuthenticatedRoutes({
  data,
  generatedAt,
  competence,
  competenceStatus,
  spreadsheetContext,
  taskDetails,
  isOperationalDataLoading,
  operationalDataError,
  onRetryOperationalData,
  onCompetenceFinalize,
  onCompanyCreate,
  onCompanyUpdate,
  onCompanyArchive,
  onCompanyRestore,
  onRoutineCreate,
  onRoutineUpdate,
  onRoutineArchive,
  onRoutineRestore,
  onEmployeeInvite,
  onDepartmentCreate,
  onScreenCreate,
  onScreenUpdate,
}: AuthenticatedRoutesProps) {
  const navigate = useNavigate()

  return (
    <Routes>
      <Route
        element={
          <AppLayout
            spreadsheets={spreadsheetContext.spreadsheetNavigationItems}
            agendas={spreadsheetContext.agendaNavigationItems}
          />
        }
      >
        <Route path={ROUTES.AGENDA} element={<AgendaPage />} />
        <Route path={ROUTES.PROFILE} element={<ProfilePage />} />
        {data ? (
          renderOperationalRoutes({
            data,
            generatedAt: generatedAt ?? new Date().toISOString(),
            competence,
            competenceStatus,
            spreadsheetContext,
            taskDetails,
            onCompetenceFinalize,
            onCompanyCreate,
            onCompanyUpdate,
            onCompanyArchive,
            onCompanyRestore,
            onRoutineCreate,
            onRoutineUpdate,
            onRoutineArchive,
            onRoutineRestore,
            onEmployeeInvite,
            onDepartmentCreate,
            onScreenCreate,
            onScreenUpdate,
            navigate,
          })
        ) : (
          <Route
            path="*"
            element={
              <OperationalDataState
                isLoading={isOperationalDataLoading}
                error={operationalDataError}
                onRetry={onRetryOperationalData}
              />
            }
          />
        )}
      </Route>
    </Routes>
  )
}

interface OperationalRoutesProps extends Omit<
  AuthenticatedRoutesProps,
  | 'data'
  | 'isOperationalDataLoading'
  | 'operationalDataError'
  | 'onRetryOperationalData'
> {
  data: RoutineControlData
  generatedAt: string
  navigate: NavigateFunction
}

function renderOperationalRoutes({
  data,
  generatedAt,
  competence,
  competenceStatus,
  spreadsheetContext,
  taskDetails,
  onCompetenceFinalize,
  onCompanyCreate,
  onCompanyUpdate,
  onCompanyArchive,
  onCompanyRestore,
  onRoutineCreate,
  onRoutineUpdate,
  onRoutineArchive,
  onRoutineRestore,
  onEmployeeInvite,
  onDepartmentCreate,
  onScreenCreate,
  onScreenUpdate,
  navigate,
}: OperationalRoutesProps) {
  const canCreateAdHocTask = competenceStatus === 'projected'
  const spreadsheetContextError = (
    <ErrorState
      title={'Planilha n\u00e3o encontrada'}
      description={
        'N\u00e3o foi poss\u00edvel determinar a planilha e o departamento selecionados.'
      }
    />
  )

  function handleRoutineListOpen(routineId: string) {
    taskDetails.closeTask()
    navigate(
      `${ROUTES.ROUTINES}/${encodeURIComponent(routineId)}${spreadsheetContext.spreadsheetContextQuery}`,
      { state: { fromSpreadsheet: true } },
    )
  }

  function handleClientListOpen(clientId: string) {
    taskDetails.closeTask()
    navigate(
      `${ROUTES.COMPANIES}/${encodeURIComponent(clientId)}${spreadsheetContext.spreadsheetContextQuery}`,
      { state: { fromSpreadsheet: true } },
    )
  }

  async function handleCompanyArchive(companyId: string) {
    await onCompanyArchive(companyId)
    navigate(ROUTES.COMPANIES, { replace: true })
  }

  async function handleCompanyUpdate(
    companyId: string,
    changes: ClientCompanyPatch,
  ): Promise<void> {
    await onCompanyUpdate(companyId, changes)
  }

  async function handleRoutineUpdate(
    routineId: string,
    changes: RoutineEditInput,
  ): Promise<void> {
    await onRoutineUpdate(routineId, changes)
  }

  async function handleRoutineArchive(routineId: string): Promise<void> {
    await onRoutineArchive(routineId)
    navigate(ROUTES.ROUTINES, { replace: true })
  }

  async function handleAdHocTaskCreate(
    input: Parameters<TaskDetailsController['createAdHocTask']>[0],
  ): Promise<void> {
    await taskDetails.createAdHocTask(input)
  }

  return (
    <>
      <Route
        index
        element={
          <HomePage
            data={data}
            spreadsheets={spreadsheetContext.spreadsheetNavigationItems}
            generatedAt={generatedAt}
            onTaskOpen={(task) => taskDetails.openTask(task.id)}
            competenceStatus={competenceStatus}
            onCompetenceFinalize={onCompetenceFinalize}
          />
        }
      />
      <Route
        path={ROUTES.SPREADSHEET}
        element={
          spreadsheetContext.hasSpreadsheetContext ? (
            <SpreadsheetPage
              departmentName={spreadsheetContext.selectedDepartmentGroup!.name}
              screens={spreadsheetContext.selectedDepartmentGroup!.screens}
              selectedScreenId={
                spreadsheetContext.spreadsheetSelection.screenId
              }
              screen={spreadsheetContext.selectedScreen!}
              projection={spreadsheetContext.selectedProjection!}
              visibleData={spreadsheetContext.visibleData!}
              onClientOpen={(client) => handleClientListOpen(client.id)}
              onRoutineOpen={(routine) => handleRoutineListOpen(routine.id)}
              onTaskOpen={(task) => taskDetails.openTask(task.id)}
              onTaskStatusChange={taskDetails.requestTaskTransition}
              getAllowedTaskStatusChanges={taskDetails.getAllowedStatusChanges}
            />
          ) : (
            spreadsheetContextError
          )
        }
      />
      <Route path={ROUTES.LIST} element={<ListPage />} />
      <Route
        path={ROUTES.COMPANY_DETAILS}
        element={
          <EntityDetailPage
            type="client"
            data={data}
            screenId={spreadsheetContext.selectedScreen?.id}
            screenName={spreadsheetContext.selectedScreen?.name}
            screenDepartmentId={spreadsheetContext.selectedDepartment?.id}
            onClientUpdate={handleCompanyUpdate}
            onClientArchive={handleCompanyArchive}
            onItemOpen={(item) => taskDetails.openTask(item.task.id)}
            onItemStatusChange={(item, status) =>
              taskDetails.requestTaskTransition(item.task.id, status)
            }
            getAllowedStatusChanges={(item) =>
              taskDetails.getAllowedStatusChanges(item.task)
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
            screenId={spreadsheetContext.selectedScreen?.id}
            screenName={spreadsheetContext.selectedScreen?.name}
            screenDepartmentId={spreadsheetContext.selectedDepartment?.id}
            onRoutineUpdate={handleRoutineUpdate}
            onRoutineArchive={handleRoutineArchive}
            onItemOpen={(item) => taskDetails.openTask(item.task.id)}
            onItemStatusChange={(item, status) =>
              taskDetails.requestTaskTransition(item.task.id, status)
            }
            getAllowedStatusChanges={(item) =>
              taskDetails.getAllowedStatusChanges(item.task)
            }
          />
        }
      />
      <Route
        path={ROUTES.TASKS}
        element={
          <TasksPage
            data={data}
            screenId={spreadsheetContext.selectedScreen?.id}
            screenName={spreadsheetContext.selectedScreen?.name}
            onItemOpen={(item) => taskDetails.openTask(item.task.id)}
            onItemStatusChange={(item, status) =>
              taskDetails.requestTaskTransition(item.task.id, status)
            }
            getAllowedStatusChanges={(item) =>
              taskDetails.getAllowedStatusChanges(item.task)
            }
          />
        }
      />
      <Route
        path={ROUTES.MY_TASKS}
        element={
          <MyTasksPage
            data={data}
            onItemOpen={(item) => taskDetails.openTask(item.task.id)}
            onItemStatusChange={(item, status) =>
              taskDetails.requestTaskTransition(item.task.id, status)
            }
            getAllowedStatusChanges={(item) =>
              taskDetails.getAllowedStatusChanges(item.task)
            }
            onLooseTaskCreate={
              canCreateAdHocTask ? handleAdHocTaskCreate : undefined
            }
          />
        }
      />
      <Route
        path={`${ROUTES.SETTINGS}/*`}
        element={
          <RequirePermission permission={APP_PERMISSION.MANAGE_ORGANIZATION}>
            <SettingsRoutes
              data={data}
              onCompanyRestore={onCompanyRestore}
              onRoutineRestore={onRoutineRestore}
              onDepartmentCreate={onDepartmentCreate}
              onScreenCreate={onScreenCreate}
              onScreenUpdate={onScreenUpdate}
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
              onCreate={onRoutineCreate}
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
              onCreate={onCompanyCreate}
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
              onInvite={onEmployeeInvite}
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
              onCreate={onScreenCreate}
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
              onScreenSave={onScreenUpdate}
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
      <Route path={ROUTES.ROUTINES} element={<RoutinesPage data={data} />} />
      <Route path={ROUTES.COMPANIES} element={<CompaniesPage data={data} />} />
      <Route
        path={ROUTES.EMPLOYEES}
        element={
          <RequirePermission permission={APP_PERMISSION.VIEW_EMPLOYEES}>
            <EmployeesPage departments={data.departments} />
          </RequirePermission>
        }
      />
      <Route
        path="/funcionarios"
        element={<Navigate to={ROUTES.EMPLOYEES} replace />}
      />
      <Route
        path="/funcionarios/novo"
        element={<Navigate to={ROUTES.EMPLOYEE_CREATE} replace />}
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
      <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
    </>
  )
}

function OperationalDataState({
  isLoading,
  error,
  onRetry,
}: {
  isLoading: boolean
  error: Error | null
  onRetry: () => void
}) {
  const presentation = error ? getErrorPresentation(error) : null

  return (
    <main
      className="grid min-h-[24rem] place-items-center px-4"
      aria-busy={isLoading || undefined}
    >
      {presentation ? (
        <div
          role="alert"
          className="max-w-md rounded-[var(--radius-panel)] border border-[var(--status-error-border)] bg-[var(--status-error-bg)] p-5 text-center text-sm font-semibold text-[var(--status-error-text)]"
        >
          <p>{presentation.message}</p>
          {presentation.supportReference && (
            <p className="mt-2 text-xs font-semibold">
              {presentation.supportReference}
            </p>
          )}
          <button
            type="button"
            onClick={onRetry}
            className="mt-4 min-h-9 rounded-[var(--radius-control)] border border-current px-3 text-sm font-bold hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-control-focus)]"
          >
            Tentar novamente
          </button>
        </div>
      ) : (
        <p
          role="status"
          className="text-sm font-semibold text-[var(--color-text-muted)]"
        >
          {'Carregando dados operacionais\u2026'}
        </p>
      )}
    </main>
  )
}

export default AuthenticatedRoutes
