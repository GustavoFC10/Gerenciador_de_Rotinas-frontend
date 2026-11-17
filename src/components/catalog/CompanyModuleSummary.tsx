import { useQuery } from '@tanstack/react-query'
import { Link, useLocation } from 'react-router'
import Button from '../ui/Button'
import { ROUTES } from '../../constants/routes'
import { focusRing } from '../../constants/designTokens'
import { useAuth } from '../../hooks/useAuth'
import { useModuleAccess } from '../../hooks/useModuleAccess'
import { queryKeys } from '../../query/queryKeys'
import {
  companyService,
  type ClientCompanyResource,
} from '../../services/companyService'
import { honorariosService } from '../../services/honorariosService'

export default function CompanyModuleSummary({
  company,
}: {
  company: ClientCompanyResource
}) {
  const { activeMembership } = useAuth()
  const { getModule } = useModuleAccess()
  const location = useLocation()
  const scope = {
    organizationId: activeMembership!.organization.id,
    membershipId: activeMembership!.id,
  }
  const routinesAccess = !!getModule('routines')?.actions.includes('read')
  const financialAccess = getModule('honorarios')
  const canReadFinancial = !!financialAccess?.actions.includes('read')
  const archived = company.status === 'archived'
  const routines = useQuery({
    queryKey: queryKeys.companyRoutineAssignments(scope, company.id),
    queryFn: () => companyService.listRoutineAssignments(company.id),
    enabled: routinesAccess && !archived,
    retry: false,
  })
  const financial = useQuery({
    queryKey: [
      ...queryKeys.scope(scope),
      'honorarios',
      'company-summary',
      company.id,
    ],
    enabled: canReadFinancial && !archived,
    retry: false,
    queryFn: async ({ signal }) => {
      let page = 1
      for (;;) {
        const result = await honorariosService.clientCompanies(
          {
            q: company.cnpj || company.code || company.name,
            profile: 'all',
            page,
            pageSize: 20,
          },
          signal,
        )
        const match = result.results.find((item) => item.id === company.id)
        if (match) return match
        if (!result.next || !result.results.length) return null
        page++
      }
    },
  })
  if (!routinesAccess && !canReadFinancial) return null
  const returning = location.pathname + location.search
  const active = (routines.data ?? []).filter(
    (assignment) => !assignment.cancelledAt && !assignment.endsOn,
  )
  const departments = new Set(
    active.map((assignment) => assignment.departmentId),
  )
  const profile = financial.data?.financialProfile
  const financialParams = new URLSearchParams({
    retorno: returning,
    q: company.cnpj || company.code || company.name,
  })
  if (profile) financialParams.set('cliente', profile.id)
  else if (financial.data) financialParams.set('empresa', company.id)
  return (
    <section className="record-section">
      <h2>Dados nos módulos</h2>
      <div className="space-y-3">
        {routinesAccess && (
          <div className="rounded-[var(--radius-control)] border border-[var(--color-divider)] p-4">
            <h3 className="app-component-title">Rotinas</h3>
            <p className="app-description mt-1">
              {archived
                ? 'Empresa arquivada'
                : routines.isPending
                  ? 'Carregando vínculos…'
                  : routines.error
                    ? 'Não foi possível consultar os vínculos.'
                    : active.length
                      ? `${departments.size} departamento${departments.size === 1 ? '' : 's'} · ${active.length} vínculo${active.length === 1 ? '' : 's'} de rotina`
                      : 'Sem configuração de rotinas'}
            </p>
            {routines.error ? (
              <Button className="mt-3" onClick={() => void routines.refetch()}>
                Tentar novamente
              </Button>
            ) : (
              !archived &&
              !routines.isPending && (
                <Link
                  className={`mt-3 inline-block text-sm font-semibold text-[var(--color-brand)] ${focusRing}`}
                  to={`${active.length ? `${ROUTES.COMPANIES}/${encodeURIComponent(company.id)}` : ROUTES.COMPANIES}?${new URLSearchParams({ retorno: returning, source: 'catalog' })}`}
                >
                  {active.length
                    ? 'Consultar configuração'
                    : 'Configurar Rotinas'}{' '}
                  →
                </Link>
              )
            )}
          </div>
        )}
        {canReadFinancial && (
          <div className="rounded-[var(--radius-control)] border border-[var(--color-divider)] p-4">
            <h3 className="app-component-title">Honorários</h3>
            <p className="app-description mt-1">
              {archived
                ? 'Empresa arquivada'
                : financial.isPending
                  ? 'Consultando perfil financeiro…'
                  : financial.error
                    ? 'Não foi possível consultar o perfil financeiro.'
                    : financial.data
                      ? profile
                        ? 'Perfil financeiro cadastrado'
                        : 'Sem dados financeiros cadastrados'
                      : 'Empresa não disponível nesta carteira'}
            </p>
            {financial.error ? (
              <Button className="mt-3" onClick={() => void financial.refetch()}>
                Tentar novamente
              </Button>
            ) : (
              !archived &&
              financial.data && (
                <Link
                  className={`mt-3 inline-block text-sm font-semibold text-[var(--color-brand)] ${focusRing}`}
                  to={`${ROUTES.HONORARIOS}/clientes?${financialParams}`}
                >
                  {profile
                    ? 'Consultar perfil'
                    : financialAccess?.actions.includes('create') ||
                        financialAccess?.actions.includes('edit')
                      ? 'Configurar honorários'
                      : 'Consultar em Honorários'}{' '}
                  →
                </Link>
              )
            )}
          </div>
        )}
      </div>
    </section>
  )
}
