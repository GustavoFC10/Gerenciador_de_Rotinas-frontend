import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState, type FormEvent } from 'react'
import {
  Link,
  NavLink,
  Navigate,
  Route,
  Routes,
  useNavigate,
  useParams,
} from 'react-router'
import Button from '../components/ui/Button'
import LoadingState from '../components/common/LoadingState'
import { focusRing } from '../constants/designTokens'
import { ROUTES } from '../constants/routes'
import { useAuth } from '../hooks/useAuth'
import ModuleWorkspaceLayout from '../layouts/ModuleWorkspaceLayout'
import { queryKeys } from '../query/queryKeys'
import {
  companyService,
  type ClientCompanyInput,
  type ClientCompanyResource,
} from '../services/companyService'
import { normalizeSearch } from '../utils/normalizeSearch'

const fields: {
  key: keyof ClientCompanyInput
  label: string
  type?: string
  required?: boolean
}[] = [
  { key: 'name', label: 'Nome fantasia', required: true },
  { key: 'legalName', label: 'Razão social' },
  { key: 'code', label: 'Código' },
  { key: 'cnpj', label: 'CNPJ' },
  { key: 'email', label: 'E-mail', type: 'email' },
  { key: 'mobilePhone', label: 'Telefone' },
  { key: 'taxRegime', label: 'Regime tributário' },
]

export default function CompaniesModulePage() {
  const { activeMembership } = useAuth()
  if (!activeMembership || !['owner', 'admin'].includes(activeMembership.role))
    return <Navigate to={ROUTES.HUB} replace />
  return <CompaniesWorkspace />
}

function CompaniesWorkspace() {
  const { activeMembership } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const scope = {
    organizationId: activeMembership!.organization.id,
    membershipId: activeMembership!.id,
  }
  const companiesKey = [...queryKeys.scope(scope), 'general-companies']
  const companies = useQuery({
    queryKey: companiesKey,
    queryFn: () => companyService.listAll(),
  })
  const create = useMutation({
    mutationFn: (input: ClientCompanyInput) => companyService.create(input),
    onSuccess: async () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: companiesKey }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.routineControlRoot(scope),
        }),
      ]),
  })
  const update = useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string
      input: ClientCompanyInput
    }) => {
      const current = await companyService.get(id)
      if (!current.etag)
        throw new Error('A API não informou a versão atual da empresa.')
      return companyService.update(id, input, current.etag)
    },
    onSuccess: async () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: companiesKey }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.routineControlRoot(scope),
        }),
      ]),
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
        aria-label="Navegação de Empresas"
        className="my-6 flex flex-wrap gap-2 border-b border-[var(--color-divider)] pb-4"
      >
        {[
          { to: ROUTES.COMPANY_REGISTRY, label: 'Cadastro geral', end: true },
          { to: ROUTES.COMPANY_REGISTRY_CREATE, label: 'Adicionar empresa' },
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
      {companies.isPending ? (
        <LoadingState message="Carregando empresas…" />
      ) : companies.error ? (
        <div
          role="alert"
          className="space-y-3 text-sm text-[var(--status-error-text)]"
        >
          <p>
            Não foi possível carregar as empresas. {companies.error.message}
          </p>
          <Button onClick={() => void companies.refetch()}>
            Tentar novamente
          </Button>
        </div>
      ) : (
        <Routes>
          <Route
            path={ROUTES.COMPANY_REGISTRY}
            element={
              <CompanyRegistry
                companies={companies.data}
                onCreate={() => navigate(ROUTES.COMPANY_REGISTRY_CREATE)}
              />
            }
          />
          <Route
            path={ROUTES.COMPANY_REGISTRY_CREATE}
            element={
              <CompanyEditor
                busy={create.isPending}
                error={create.error}
                onSave={async (input) => {
                  const result = await create.mutateAsync(input)
                  navigate(
                    `${ROUTES.COMPANY_REGISTRY}/${encodeURIComponent(result.data.id)}`,
                    { replace: true },
                  )
                }}
                onCancel={() => navigate(ROUTES.COMPANY_REGISTRY)}
              />
            }
          />
          <Route
            path={ROUTES.COMPANY_REGISTRY_DETAILS}
            element={
              <CompanyDetails
                companies={companies.data}
                busy={update.isPending}
                error={update.error}
                onSave={async (id, input) => {
                  await update.mutateAsync({ id, input })
                  await companies.refetch()
                }}
                onCancel={() => navigate(ROUTES.COMPANY_REGISTRY)}
              />
            }
          />
          <Route
            path="*"
            element={<Navigate to={ROUTES.COMPANY_REGISTRY} replace />}
          />
        </Routes>
      )}
    </ModuleWorkspaceLayout>
  )
}

function CompanyRegistry({
  companies,
  onCreate,
}: {
  companies: ClientCompanyResource[]
  onCreate: () => void
}) {
  const [search, setSearch] = useState('')
  const filtered = useMemo(() => {
    const query = normalizeSearch(search)
    return companies.filter((company) =>
      normalizeSearch(
        [
          company.code,
          company.name,
          company.legalName,
          company.cnpj,
          company.email,
        ].join(' '),
      ).includes(query),
    )
  }, [companies, search])

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--color-brand)]">
            Cadastro principal
          </p>
          <h1 className="mt-2 text-3xl font-black text-[var(--color-text-strong)]">
            Empresas
          </h1>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">
            Cadastre e mantenha os dados gerais usados pelos módulos.
          </p>
        </div>
        <Button onClick={onCreate}>Adicionar empresa</Button>
      </header>
      <div className="rounded-[var(--radius-panel)] border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] p-4 shadow-[var(--shadow-panel)] sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-bold text-[var(--color-text-muted)]">
            {filtered.length} de {companies.length} empresas
          </p>
          <label className="w-full sm:max-w-sm">
            <span className="sr-only">Buscar empresas</span>
            <input
              className="w-full rounded-[var(--radius-control)] border border-[var(--color-control-border)] bg-[var(--color-control-bg)] px-3 py-2 text-sm text-[var(--color-text-main)]"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nome, código, CNPJ ou e-mail"
            />
          </label>
        </div>
        <div className="divide-y divide-[var(--color-divider)]">
          {filtered.map((company) => (
            <Link
              key={company.id}
              to={`${ROUTES.COMPANY_REGISTRY}/${encodeURIComponent(company.id)}`}
              className={`grid gap-2 rounded-[var(--radius-control)] px-3 py-4 hover:bg-[var(--color-control-hover-bg)] sm:grid-cols-[minmax(0,1.4fr)_minmax(9rem,1fr)_minmax(9rem,1fr)] sm:items-center ${focusRing}`}
            >
              <span className="min-w-0">
                <span className="block truncate font-bold text-[var(--color-text-strong)]">
                  {company.name}
                </span>
                <span className="block truncate text-xs text-[var(--color-text-muted)]">
                  {company.legalName || company.code || 'Sem razão social'}
                </span>
              </span>
              <span className="text-sm text-[var(--color-text-muted)]">
                {company.code || 'Sem código'}
              </span>
              <span className="text-sm text-[var(--color-text-muted)]">
                {company.cnpj || 'CNPJ não informado'}
              </span>
            </Link>
          ))}
          {filtered.length === 0 && (
            <p className="py-10 text-center text-sm text-[var(--color-text-muted)]">
              {search
                ? `Nenhuma empresa encontrada para “${search}”.`
                : 'Nenhuma empresa cadastrada.'}
            </p>
          )}
        </div>
      </div>
    </section>
  )
}

function CompanyDetails({
  companies,
  busy,
  error,
  onSave,
  onCancel,
}: {
  companies: ClientCompanyResource[]
  busy: boolean
  error: Error | null
  onSave: (id: string, input: ClientCompanyInput) => Promise<void>
  onCancel: () => void
}) {
  const { companyId = '' } = useParams()
  const company = companies.find((item) => item.id === companyId)
  if (!company)
    return (
      <div role="alert" className="space-y-3">
        <p>Empresa não encontrada nesta organização.</p>
        <Button onClick={onCancel}>Voltar para empresas</Button>
      </div>
    )
  return (
    <CompanyEditor
      company={company}
      busy={busy}
      error={error}
      onSave={(input) => onSave(company.id, input)}
      onCancel={onCancel}
    />
  )
}

function CompanyEditor({
  company,
  busy,
  error,
  onSave,
  onCancel,
}: {
  company?: ClientCompanyResource
  busy: boolean
  error: Error | null
  onSave: (input: ClientCompanyInput) => Promise<void>
  onCancel: () => void
}) {
  const [values, setValues] = useState<ClientCompanyInput>(() => ({
    name: company?.name ?? '',
    legalName: company?.legalName ?? '',
    code: company?.code ?? '',
    cnpj: company?.cnpj ?? '',
    email: company?.email ?? '',
    mobilePhone: company?.mobilePhone ?? '',
    taxRegime: company?.taxRegime ?? '',
  }))
  const [saveError, setSaveError] = useState('')
  async function submit(event: FormEvent) {
    event.preventDefault()
    setSaveError('')
    const cnpj = values.cnpj?.replace(/\D/g, '') ?? ''
    if (cnpj && !isValidCnpj(cnpj)) {
      setSaveError('Informe um CNPJ válido com 14 dígitos.')
      return
    }
    try {
      await onSave(
        Object.fromEntries(
          Object.entries(values).map(([key, value]) => [
            key,
            key === 'cnpj'
              ? formatCnpj(String(value ?? ''))
              : typeof value === 'string'
                ? value.trim()
                : value,
          ]),
        ) as ClientCompanyInput,
      )
    } catch (caught) {
      setSaveError(
        caught instanceof Error
          ? caught.message
          : 'Não foi possível salvar os dados da empresa.',
      )
    }
  }
  return (
    <section className="mx-auto max-w-3xl space-y-5">
      <header>
        <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--color-brand)]">
          {company ? 'Dados gerais' : 'Novo cadastro'}
        </p>
        <h1 className="mt-2 text-3xl font-black text-[var(--color-text-strong)]">
          {company ? `Editar ${company.name}` : 'Adicionar empresa'}
        </h1>
      </header>
      <form
        onSubmit={(event) => void submit(event)}
        className="grid gap-4 rounded-[var(--radius-panel)] border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] p-5 shadow-[var(--shadow-panel)] sm:grid-cols-2 sm:p-7"
      >
        {fields.map(({ key, label, type, required }) => (
          <label key={key} className="block space-y-1.5">
            <span className="text-sm font-bold text-[var(--color-text-strong)]">
              {label}
              {required && (
                <span className="text-[var(--status-error-text)]"> *</span>
              )}
            </span>
            <input
              className="w-full rounded-[var(--radius-control)] border border-[var(--color-control-border)] bg-[var(--color-control-bg)] px-3 py-2.5 text-sm text-[var(--color-text-main)]"
              type={type ?? 'text'}
              value={values[key] ?? ''}
              required={required}
              inputMode={key === 'cnpj' ? 'numeric' : undefined}
              maxLength={
                key === 'name' || key === 'legalName'
                  ? 200
                  : key === 'cnpj'
                    ? 18
                    : 254
              }
              disabled={busy}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  [key]:
                    key === 'cnpj'
                      ? formatCnpj(event.target.value)
                      : event.target.value,
                }))
              }
            />
          </label>
        ))}
        {(saveError || error) && (
          <p
            role="alert"
            className="sm:col-span-2 text-sm text-[var(--status-error-text)]"
          >
            {saveError || error?.message}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-3 sm:col-span-2">
          <Button type="button" onClick={onCancel} disabled={busy}>
            Cancelar
          </Button>
          <Button type="submit" disabled={busy}>
            {busy
              ? 'Salvando…'
              : company
                ? 'Salvar alterações'
                : 'Cadastrar empresa'}
          </Button>
        </div>
      </form>
    </section>
  )
}

function isValidCnpj(value: string) {
  if (!/^\d{14}$/.test(value) || /^(\d)\1{13}$/.test(value)) return false
  const digit = (base: string, weights: number[]) => {
    const sum = [...base].reduce(
      (total, number, index) => total + Number(number) * weights[index]!,
      0,
    )
    const remainder = sum % 11
    return remainder < 2 ? 0 : 11 - remainder
  }
  const first = digit(value.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
  const second = digit(
    value.slice(0, 12) + first,
    [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
  )
  return value.endsWith(`${first}${second}`)
}

function formatCnpj(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 14)
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}
