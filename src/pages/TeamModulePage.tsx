import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Navigate,
  Route,
  Routes,
  useNavigate,
  useLocation,
  useSearchParams,
} from 'react-router'
import Button from '../components/ui/Button'
import LoadingState from '../components/common/LoadingState'
import { ROUTES } from '../constants/routes'
import { useAuth } from '../hooks/useAuth'
import DirectoryWorkspaceLayout from '../layouts/DirectoryWorkspaceLayout'
import { queryKeys } from '../query/queryKeys'
import { departmentService } from '../services/departmentService'
import {
  organizationMemberService,
  type MembershipInvitationInput,
} from '../services/organizationMemberService'
import CreateEmployeePage from './CreateEmployeePage'
import EmployeesPage from './EmployeesPage'

export default function TeamModulePage() {
  const { activeMembership } = useAuth()
  if (activeMembership?.role !== 'owner')
    return <Navigate to={ROUTES.HUB} replace />
  return <TeamWorkspace />
}

function TeamWorkspace() {
  const { activeMembership } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
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
    <DirectoryWorkspaceLayout module="team">
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
              <>
                <EmployeesPage departments={departments.data} />
                <CreateEmployeePage
                  departments={departments.data}
                  onInvite={async (input) =>
                    (await invite.mutateAsync(input)).data
                  }
                  onCancel={() => {
                    navigate(ROUTES.EMPLOYEES + location.search)
                    requestAnimationFrame(() =>
                      document
                        .querySelector<HTMLAnchorElement>(
                          'a[href^="/equipe/novo"]',
                        )
                        ?.focus(),
                    )
                  }}
                />
              </>
            }
          />
          <Route path={ROUTES.TEAM_ACCESS} element={<LegacyAccessRedirect />} />
          <Route
            path="*"
            element={<Navigate to={ROUTES.EMPLOYEES} replace />}
          />
        </Routes>
      )}
    </DirectoryWorkspaceLayout>
  )
}

function LegacyAccessRedirect() {
  const { activeMembership } = useAuth()
  const [params] = useSearchParams()
  const next = new URLSearchParams(params)
  next.set('member', params.get('member') ?? activeMembership!.id)
  next.set('aba', 'access')
  return <Navigate to={`${ROUTES.EMPLOYEES}?${next}`} replace />
}
