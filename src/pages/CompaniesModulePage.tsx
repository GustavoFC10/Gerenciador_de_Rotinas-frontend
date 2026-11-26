import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import TextField from '../components/ui/TextField'
import LoadingState from '../components/common/LoadingState'
import CompanyModuleSummary from '../components/catalog/CompanyModuleSummary'
import {
  DirectoryEmpty,
  DirectoryHeading,
  DirectoryPager,
  DirectoryPanel,
  DirectoryStatus,
  DirectoryToolbar,
  RecordDatum,
  useDirectoryQuery,
} from '../components/catalog/Directory'
import { focusRing } from '../constants/designTokens'
import { ROUTES } from '../constants/routes'
import { useAuth } from '../hooks/useAuth'
import { useModuleAccess } from '../hooks/useModuleAccess'
import { confirmDiscard, useUnsavedChanges } from '../hooks/useUnsavedChanges'
import { useDirectoryScroll } from '../hooks/useDirectoryScroll'
import DirectoryWorkspaceLayout from '../layouts/DirectoryWorkspaceLayout'
import { queryKeys, type OrganizationQueryScope } from '../query/queryKeys'
import { invalidateCompanyQueries } from '../query/companyCache'
import {
  companyService,
  type ClientCompanyResource,
  type CompanyPermissions,
} from '../services/companyService'
import type { ModuleSummary } from '../types/modules'
import {
  companyEditConflictMessage,
  companyRegistrationInput,
  companyRegistrationPatch,
  companyRegistrationValues,
  formatCnpj,
  validateCompanyRegistration,
} from '../utils/companyIdentity'
import { clientTaxRegimeOptions } from '../constants/entityOptions'
import { isApiError } from '../services/httpClient'

export default function CompaniesModulePage() {
  const { activeMembership } = useAuth()
  const access = useModuleAccess()
  if (!activeMembership) return <Navigate to={ROUTES.HUB} replace />
  if (access.isLoading) return <LoadingState message="Carregando acessos…" />
  if (access.error)
    return (
      <QueryError
        message="Não foi possível atualizar seus acessos."
        retry={() => void access.refetch()}
      />
    )
  const companies = access.getModule('companies')
  if (!companies?.actions.includes('read'))
    return <Navigate to={ROUTES.HUB} replace />
  return (
    <DirectoryWorkspaceLayout module="companies">
      <CompaniesWorkspace access={companies} />
    </DirectoryWorkspaceLayout>
  )
}

function CompaniesWorkspace({ access }: { access: ModuleSummary }) {
  const { activeMembership } = useAuth()
  const scope = {
    organizationId: activeMembership!.organization.id,
    membershipId: activeMembership!.id,
  }
  const catalog = useQuery({
    queryKey: [...queryKeys.scope(scope), 'company-catalog'],
    queryFn: () => companyService.catalog(),
  })
  if (catalog.isPending) return <LoadingState message="Carregando empresas…" />
  if (catalog.error)
    return (
      <QueryError
        message="Não foi possível carregar o cadastro de empresas."
        retry={() => void catalog.refetch()}
      />
    )
  if (!catalog.data.data.permissions.read)
    return <p role="alert">Você não tem acesso ao cadastro de empresas.</p>
  const permissions = Object.fromEntries(
    Object.entries(catalog.data.data.permissions).map(([key, value]) => [
      key,
      typeof value === 'boolean'
        ? value && (key === 'read' || access.actions.includes(key))
        : value,
    ]),
  ) as unknown as CompanyPermissions
  const baseKey = queryKeys.companies(scope)
  return (
    <Routes>
      <Route
        path={ROUTES.COMPANY_REGISTRY}
        element={
          <CompanyRegistry baseKey={baseKey} permissions={permissions} />
        }
      />
      <Route
        path={ROUTES.COMPANY_REGISTRY_CREATE}
        element={
          permissions.create ? (
            <CompanyRecord scope={scope} permissions={permissions} creating />
          ) : (
            <Navigate to={ROUTES.COMPANY_REGISTRY} replace />
          )
        }
      />
      <Route
        path={ROUTES.COMPANY_REGISTRY_DETAILS}
        element={<CompanyRecord scope={scope} permissions={permissions} />}
      />
      <Route
        path="*"
        element={<Navigate to={ROUTES.COMPANY_REGISTRY} replace />}
      />
    </Routes>
  )
}

function CompanyRegistry({
  baseKey,
  permissions,
}: {
  baseKey: readonly unknown[]
  permissions: CompanyPermissions
}) {
  const state = useDirectoryQuery('active')
  const location = useLocation()
  const status =
    permissions.readArchived && ['archived', 'all'].includes(state.status)
      ? state.status
      : 'active'
  const filters = {
    search: state.query,
    status:
      status === 'all'
        ? (['active', 'archived'] as const)
        : ([status] as Array<'active' | 'archived'>),
    page: state.page,
    pageSize: 20,
    ordering: 'name' as const,
  }
  const companies = useQuery({
    queryKey: [...baseKey, 'list', filters],
    queryFn: () =>
      companyService.list({ ...filters, status: [...filters.status] }),
  })
  const data = companies.data?.data
  useDirectoryScroll(JSON.stringify([baseKey, state.search]), !!data)
  useEffect(() => {
    const maxPage = data ? Math.max(1, Math.ceil(data.count / 20)) : undefined
    if (maxPage && state.page > maxPage)
      state.change({ pagina: String(maxPage) })
  }, [data, state])
  useEffect(() => {
    const focusId = location.state?.focusCompany as string | undefined
    if (!data || !focusId) return
    const frame = requestAnimationFrame(() =>
      [...document.querySelectorAll<HTMLAnchorElement>('a[data-company-id]')]
        .find((anchor) => anchor.dataset.companyId === focusId)
        ?.focus({ preventScroll: true }),
    )
    return () => cancelAnimationFrame(frame)
  }, [data, location.state])
  return (
    <>
      <DirectoryHeading
        title="Empresas"
        count={data ? `${data.count} empresas` : undefined}
        action={
          permissions.create ? (
            <Link
              to={ROUTES.COMPANY_REGISTRY_CREATE + state.search}
              className={`ui-button ui-button--md border border-transparent bg-[var(--color-button-primary-bg)] text-[var(--color-button-primary-text)] hover:bg-[var(--color-button-primary-hover-bg)] ${focusRing}`}
            >
              Adicionar empresa
            </Link>
          ) : undefined
        }
      />
      <DirectoryPanel label="Diretório de empresas">
        <DirectoryToolbar
          searchLabel="Buscar empresa"
          placeholder="Nome, código, CNPJ ou e-mail"
          query={state.query}
          onQuery={(q) => state.change({ q, pagina: '' })}
          status={status}
          statuses={[
            { value: 'active', label: 'Ativas' },
            ...(permissions.readArchived
              ? [
                  { value: 'archived', label: 'Arquivadas' },
                  { value: 'all', label: 'Todas' },
                ]
              : []),
          ]}
          onStatus={(situacao) => state.change({ situacao, pagina: '' })}
          count={data?.count}
        />
        {companies.isPending ? (
          <LoadingState message="Carregando empresas…" />
        ) : companies.error ? (
          <QueryError
            message="Não foi possível carregar as empresas."
            retry={() => void companies.refetch()}
          />
        ) : !data?.results.length ? (
          <DirectoryEmpty
            noun="empresa"
            filtered={!!state.query || status !== 'active'}
            onClear={() =>
              state.change({ q: '', situacao: 'active', pagina: '' })
            }
          />
        ) : (
          <table className="directory-table">
            <thead>
              <tr>
                <th style={{ width: '35%' }}>Empresa</th>
                <th className="directory-hide-small" style={{ width: '10%' }}>
                  Código
                </th>
                <th className="directory-hide-small" style={{ width: '20%' }}>
                  CNPJ
                </th>
                <th className="directory-hide-medium" style={{ width: '25%' }}>
                  E-mail
                </th>
                <th style={{ width: '10%' }}>Situação</th>
              </tr>
            </thead>
            <tbody>
              {data.results.map((company) => (
                <tr key={company.id}>
                  <td>
                    <Link
                      className={`directory-identity ${focusRing}`}
                      data-company-id={company.id}
                      to={`${ROUTES.COMPANY_REGISTRY}/${encodeURIComponent(company.id)}${state.search}`}
                    >
                      <span>
                        <strong>{company.name}</strong>
                        <small>
                          {company.legalName || 'Razão social não informada'}
                        </small>
                        <span className="directory-mobile-meta app-caption mt-1">
                          {[
                            company.code && `Código ${company.code}`,
                            company.cnpj,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                      </span>
                    </Link>
                  </td>
                  <td className="directory-hide-small tabular-nums">
                    {company.code || '—'}
                  </td>
                  <td className="directory-hide-small tabular-nums">
                    {company.cnpj || '—'}
                  </td>
                  <td className="directory-hide-medium">
                    {company.email || '—'}
                  </td>
                  <td>
                    <DirectoryStatus status={company.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {data && (
          <DirectoryPager
            page={state.page}
            count={data.count}
            busy={companies.isFetching}
            onPage={(page) => state.change({ pagina: String(page) })}
          />
        )}
      </DirectoryPanel>
    </>
  )
}

type CompanyStatusConfirmation = Pick<ClientCompanyResource, 'id' | 'name' | 'status'> & {
  etag?: string | null
}

function CompanyRecord({
  scope,
  permissions,
  creating = false,
}: {
  scope: OrganizationQueryScope
  permissions: CompanyPermissions
  creating?: boolean
}) {
  const { companyId = '' } = useParams()
  const query = useQuery({
    queryKey: queryKeys.companyRecord(scope, companyId),
    queryFn: () => companyService.get(companyId),
    enabled: !creating && !!companyId,
    refetchOnWindowFocus: false,
  })
  if (!creating && query.isPending)
    return <LoadingState message="Carregando empresa…" />
  if (
    !creating &&
    query.error &&
    (!query.data ||
      (isApiError(query.error) && [401, 403].includes(query.error.status)))
  )
    return (
      <QueryError
        message="Não foi possível consultar esta empresa."
        retry={() => void query.refetch()}
      />
    )
  const company = creating ? undefined : query.data?.data
  if (company?.permissions && !company.permissions.read)
    return <p role="alert">Você não tem acesso a esta empresa.</p>
  if (!creating && !company) return <p role="alert">Empresa não encontrada.</p>
  return (
    <CompanyRecordContent
      key={creating ? 'new' : companyId}
      scope={scope}
      company={company}
      etag={query.data?.etag}
      permissions={permissions}
      onRefresh={() => query.refetch()}
    />
  )
}

function CompanyRecordContent({
  scope,
  company,
  etag,
  permissions,
  onRefresh,
}: {
  scope: OrganizationQueryScope
  company?: ClientCompanyResource
  etag?: string | null
  permissions: CompanyPermissions
  onRefresh: () => Promise<unknown>
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const client = useQueryClient()
  const [editing, setEditing] = useState(!company)
  const [values, setValues] = useState(() => companyRegistrationValues(company))
  const [editSnapshot, setEditSnapshot] = useState<{
    values: typeof values
    etag?: string | null
  } | null>(null)
  const [error, setError] = useState('')
  const [statusConfirmation, setStatusConfirmation] =
    useState<CompanyStatusConfirmation | null>(null)
  const pendingCreation = useRef<{ fingerprint: string; key: string } | null>(
    null,
  )
  const titleRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
    titleRef.current?.focus()
  }, [company?.id])
  const baseline = editSnapshot?.values ?? companyRegistrationValues(company)
  const dirty = editing && JSON.stringify(values) !== JSON.stringify(baseline)
  useUnsavedChanges(dirty)
  const canEdit =
    permissions.edit &&
    (company?.permissions?.edit ?? true) &&
    company?.status !== 'archived'
  const canArchive =
    permissions.archive && (company?.permissions?.archive ?? true)
  const canRestore =
    permissions.restore && (company?.permissions?.restore ?? true)
  const save = useMutation({
    mutationFn: async () => {
      if (!company) {
        const input = companyRegistrationInput(values)
        const fingerprint = JSON.stringify(input)
        if (pendingCreation.current?.fingerprint !== fingerprint)
          pendingCreation.current = { fingerprint, key: crypto.randomUUID() }
        const response = await companyService.create(
          input,
          pendingCreation.current.key,
        )
        pendingCreation.current = null
        return response
      }
      if (!editSnapshot?.etag)
        throw new Error(
          'A API não informou a versão atual da empresa. Recarregue a ficha.',
        )
      return companyService.update(
        company.id,
        companyRegistrationPatch(values, baseline),
        editSnapshot.etag,
      )
    },
  })
  const archive = useMutation({
    mutationFn: async (request: CompanyStatusConfirmation) => {
      if (!request.etag)
        throw new Error(
          'Recarregue a ficha para obter a versão atual da empresa.',
        )
      return request.status === 'archived'
        ? companyService.restore(request.id, request.etag)
        : companyService.archive(request.id, request.etag)
    },
  })
  const busy = save.isPending || archive.isPending
  function back() {
    if (!busy && confirmDiscard(dirty))
      navigate(ROUTES.COMPANY_REGISTRY + location.search, {
        state: { focusCompany: company?.id },
      })
  }
  function cancel() {
    if (!busy && confirmDiscard(dirty)) {
      if (!company) navigate(ROUTES.COMPANY_REGISTRY + location.search)
      else {
        setValues(companyRegistrationValues(company))
        setEditing(false)
        setEditSnapshot(null)
        setError('')
      }
    }
  }
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (
      !editing ||
      !dirty ||
      busy ||
      (company ? !canEdit : !permissions.create)
    )
      return
    const [validationError] = Object.values(
      validateCompanyRegistration(values, editSnapshot?.values),
    )
    if (validationError) {
      setError(validationError)
      return
    }
    setError('')
    try {
      const result = await save.mutateAsync()
      if (result.etag)
        client.setQueryData(
          queryKeys.companyRecord(scope, result.data.id),
          result,
        )
      setValues(companyRegistrationValues(result.data))
      setEditing(false)
      setEditSnapshot(null)
      void invalidateCompanyQueries(client, scope)
      if (!company)
        navigate(
          `${ROUTES.COMPANY_REGISTRY}/${encodeURIComponent(result.data.id)}${location.search}`,
          { replace: true },
        )
    } catch (caught) {
      if (isApiError(caught) && caught.status === 412) void onRefresh()
      setError(
        isApiError(caught) && caught.status === 412
          ? companyEditConflictMessage
          : caught instanceof Error
            ? caught.message
            : 'Não foi possível salvar a empresa.',
      )
    }
  }
  async function changeStatus(request: CompanyStatusConfirmation) {
    if (
      company?.id !== request.id || company.status !== request.status ||
      busy ||
      (company.status === 'archived' ? !canRestore : !canArchive)
    )
      throw new Error('A ficha mudou. Feche a confirmação e revise a situação da empresa.')
    setError('')
    await archive.mutateAsync(request)
    await invalidateCompanyQueries(client, scope)
    if (!permissions.readArchived && request.status === 'active') {
      navigate(ROUTES.COMPANY_REGISTRY + location.search)
      return
    }
    await onRefresh()
  }
  const restoring = statusConfirmation?.status === 'archived'
  return (
    <Card>
      <div className="px-4 pt-4 sm:px-6">
        <Button onClick={back} disabled={busy}>
          ← Voltar às empresas
        </Button>
      </div>
      <header className="border-b border-[var(--color-divider)] px-4 py-5 sm:px-6">
        <h1
          ref={titleRef}
          tabIndex={-1}
          className="app-page-title outline-none"
        >
          {company?.name ?? 'Adicionar empresa'}
        </h1>
        {company && (
          <p className="app-description mt-2">
            Código {company.code || 'não informado'} ·{' '}
            {company.status === 'archived' ? 'Arquivada' : 'Ativa'}
          </p>
        )}
      </header>
      <form
        id="company-record-form"
        onSubmit={(event) => void submit(event)}
        className="p-4 sm:p-6"
        noValidate
      >
        {error && (
          <p
            className="mb-5 text-sm text-[var(--status-error-text)]"
            role="alert"
          >
            {error}
          </p>
        )}
        {editing ? (
          <>
            <section className="record-section">
              <h2>Identificação</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  label="Nome fantasia"
                  required
                  value={values.name}
                  maxLength={160}
                  disabled={busy}
                  className="sm:col-span-2"
                  onChange={(e) =>
                    setValues((v) => ({ ...v, name: e.target.value }))
                  }
                />
                <TextField
                  label="Razão social"
                  value={values.legalName}
                  maxLength={200}
                  disabled={busy}
                  className="sm:col-span-2"
                  onChange={(e) =>
                    setValues((v) => ({ ...v, legalName: e.target.value }))
                  }
                />
                <TextField
                  label="Código"
                  inputMode="numeric"
                  value={values.code}
                  maxLength={32}
                  disabled={busy}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, code: e.target.value }))
                  }
                />
                <TextField
                  label="CNPJ"
                  value={values.cnpj}
                  maxLength={18}
                  disabled={busy}
                  onChange={(e) =>
                    setValues((v) => ({
                      ...v,
                      cnpj: formatCnpj(e.target.value),
                    }))
                  }
                />
                <TextField
                  label="Regime tributário"
                  list="company-record-tax-regimes"
                  maxLength={80}
                  value={values.taxRegime}
                  disabled={busy}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, taxRegime: e.target.value }))
                  }
                />
                <datalist id="company-record-tax-regimes">
                  {clientTaxRegimeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </datalist>
              </div>
            </section>
            <section className="record-section">
              <h2>Contato</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  type="email"
                  label="E-mail"
                  value={values.email}
                  maxLength={254}
                  disabled={busy}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, email: e.target.value }))
                  }
                />
                <TextField
                  type="tel"
                  label="Telefone"
                  value={values.mobilePhone}
                  maxLength={32}
                  disabled={busy}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, mobilePhone: e.target.value }))
                  }
                />
              </div>
            </section>
          </>
        ) : (
          company && (
            <>
              <section className="record-section">
                <h2>Identificação</h2>
                <dl className="record-data">
                  <RecordDatum label="Nome fantasia" wide>
                    {company.name}
                  </RecordDatum>
                  <RecordDatum label="Razão social" wide>
                    {company.legalName}
                  </RecordDatum>
                  <RecordDatum label="Código">{company.code}</RecordDatum>
                  <RecordDatum label="CNPJ">{company.cnpj}</RecordDatum>
                  <RecordDatum label="Regime tributário">
                    {company.taxRegime}
                  </RecordDatum>
                  <RecordDatum label="Situação">
                    <DirectoryStatus status={company.status} />
                  </RecordDatum>
                </dl>
              </section>
              <section className="record-section">
                <h2>Contato</h2>
                <dl className="record-data">
                  <RecordDatum label="E-mail">{company.email}</RecordDatum>
                  <RecordDatum label="Telefone">
                    {company.mobilePhone}
                  </RecordDatum>
                </dl>
              </section>
              <CompanyModuleSummary company={company} />
            </>
          )
        )}
      </form>
      <footer className="record-actions">
        <span className="app-caption" role="status">
          {editing
            ? dirty
              ? 'Alterações não salvas'
              : 'Nenhuma alteração pendente'
            : 'Consulta'}
        </span>
        <div className="flex flex-wrap gap-2">
          {editing ? (
            <>
              <Button disabled={busy} onClick={cancel}>
                Cancelar
              </Button>
              <Button
                tone="primary"
                type="submit"
                form="company-record-form"
                disabled={busy || !dirty}
              >
                {busy
                  ? 'Salvando…'
                  : company
                    ? 'Salvar alterações'
                    : 'Cadastrar empresa'}
              </Button>
            </>
          ) : (
            <>
              {company &&
                (company.status === 'archived' ? canRestore : canArchive) && (
                  <Button
                    tone="ghost"
                    disabled={busy}
                    onClick={() => setStatusConfirmation({
                      id: company.id,
                      name: company.name,
                      status: company.status,
                      etag,
                    })}
                  >
                    {company.status === 'archived' ? 'Restaurar' : 'Arquivar'}
                  </Button>
                )}
              <Button onClick={back}>Voltar à lista</Button>
              {canEdit && (
                <Button
                  tone="primary"
                  onClick={() => {
                    const initialValues = companyRegistrationValues(company)
                    setEditSnapshot({ values: initialValues, etag })
                    setValues(initialValues)
                    setEditing(true)
                  }}
                >
                  Editar
                </Button>
              )}
            </>
          )}
        </div>
      </footer>
      {statusConfirmation && (
        <ConfirmDialog
          open
          title={`${restoring ? 'Restaurar' : 'Arquivar'} ${statusConfirmation.name}?`}
          description={restoring
            ? 'A empresa volta à operação ativa. Os vínculos antigos de rotinas não serão reabertos automaticamente.'
            : 'A empresa deixará de aparecer nas operações ativas. O histórico será preservado.'}
          cancelLabel={restoring ? 'Manter arquivada' : 'Manter empresa'}
          confirmLabel={restoring ? 'Restaurar empresa' : 'Arquivar empresa'}
          pendingLabel={restoring ? 'Restaurando…' : 'Arquivando…'}
          errorFallback="Não foi possível alterar a situação da empresa."
          intent={restoring ? 'neutral' : 'warning'}
          onClose={() => setStatusConfirmation(null)}
          onConfirm={() => changeStatus(statusConfirmation)}
        />
      )}
    </Card>
  )
}

function QueryError({
  message,
  retry,
}: {
  message: string
  retry: () => void
}) {
  return (
    <div className="space-y-3 p-4" role="alert">
      <p>{message}</p>
      <Button onClick={retry}>Tentar novamente</Button>
    </div>
  )
}
