import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Link,
  NavLink,
  Navigate,
  Route,
  Routes,
  useNavigate,
} from 'react-router'
import Button from '../components/ui/Button'
import LoadingState from '../components/common/LoadingState'
import { focusRing } from '../constants/designTokens'
import { ROUTES } from '../constants/routes'
import { useAuth } from '../hooks/useAuth'
import ModuleWorkspaceLayout from '../layouts/ModuleWorkspaceLayout'
import { queryKeys } from '../query/queryKeys'
import { departmentService } from '../services/departmentService'
import {
  organizationMemberService,
  type MembershipInvitationInput,
} from '../services/organizationMemberService'
import CreateEmployeePage from './CreateEmployeePage'
import EmployeesPage from './EmployeesPage'
import ModuleAccessSettingsPage from './settings/ModuleAccessSettingsPage'

export default function TeamModulePage() {
  const { activeMembership } = useAuth()
  if (activeMembership?.role !== 'owner')
    return <Navigate to={ROUTES.HUB} replace />
  return <TeamWorkspace />
}

function TeamWorkspace() {
  const { activeMembership } = useAuth()
  const navigate = useNavigate()
  const client = useQueryClient()
  const scope = {
    organizationId: activeMembership!.organization.id,
    membershipId: activeMembership!.id,
  }
  const departments = useQuery({
    queryKey: [...queryKeys.scope(scope), 'module-access-departments'],
    queryFn: () => departmentService.listAll(),
  })
  const invite = useMutation({
    mutationFn: (input: MembershipInvitationInput) =>
      organizationMemberService.invite(input),
    onSuccess: () =>
      client.invalidateQueries({ queryKey: queryKeys.members(scope) }),
  })
  return (
    <ModuleWorkspaceLayout>
      <Link
        to={ROUTES.HUB}
        className={`text-sm font-bold text-[var(--color-brand)] hover:underline ${focusRing}`}
      >
        ← Trocar módulo
      </Link>
      <nav
        aria-label="Navegação de Equipe"
        className="my-6 flex flex-wrap gap-2 border-b border-[var(--color-divider)] pb-4"
      >
        {[
          { to: ROUTES.EMPLOYEES, label: 'Equipe', end: true },
          { to: ROUTES.EMPLOYEE_CREATE, label: 'Adicionar colaborador' },
          { to: ROUTES.TEAM_ACCESS, label: 'Cargos e acessos' },
        ].map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `rounded-[var(--radius-control)] px-3 py-2 text-sm font-bold ${focusRing} ${isActive ? 'bg-[var(--color-brand-soft)] text-[var(--color-brand)]' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-control-hover-bg)]'}`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
      {departments.isPending ? (
        <LoadingState message="Carregando os departamentos…" />
      ) : departments.error ? (
        <div
          role="alert"
          className="space-y-3 text-sm text-[var(--status-error-text)]"
        >
          <p>
            Não foi possível carregar os departamentos.{' '}
            {departments.error.message}
          </p>
          <Button onClick={() => void departments.refetch()}>
            Tentar novamente
          </Button>
        </div>
      ) : (
        <Routes>
          <Route
            path={ROUTES.EMPLOYEES}
            element={<EmployeesPage departments={departments.data} />}
          />
          <Route
            path={ROUTES.EMPLOYEE_CREATE}
            element={
              <CreateEmployeePage
                departments={departments.data}
                onInvite={async (input) =>
                  (await invite.mutateAsync(input)).data
                }
                onCancel={() => navigate(ROUTES.EMPLOYEES)}
              />
            }
          />
          <Route
            path={ROUTES.TEAM_ACCESS}
            element={<ModuleAccessSettingsPage />}
          />
          <Route
            path="*"
            element={<Navigate to={ROUTES.EMPLOYEES} replace />}
          />
        </Routes>
      )}
    </ModuleWorkspaceLayout>
  )
}
