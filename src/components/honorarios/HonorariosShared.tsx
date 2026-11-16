import CurrencyField from './CurrencyField'
import { Link } from 'react-router'
import { AuthContext } from '../../contexts/authContextDefinition'
import {
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useQuery } from '@tanstack/react-query'
import Button from '../ui/Button'
import Card from '../ui/Card'
import Combobox from '../ui/Combobox'
import './honorarios.css'
import TextField from '../ui/TextField'
import Select from '../ui/Select'
import { honorariosService } from '../../services/honorariosService'
import type {
  HonorariosCompanyOption,
  HonorariosHistoryEvent,
  HonorariosPage,
  HonorariosParams,
  HonorariosProfile,
} from '../../types/honorarios'
import { date, regimeNames } from '../../utils/honorariosPresentation'
import { getErrorPresentation } from '../../utils/apiErrors'

export function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="space-y-1.5 text-sm">
      <span className="font-medium text-[var(--color-text-muted)]">
        {label}
      </span>
      {children}
    </div>
  )
}

export function Notice({
  children,
  tone = 'info',
}: {
  children: ReactNode
  tone?: 'error' | 'success' | 'info'
}) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`rounded-[var(--radius-control)] border px-4 py-3 text-sm ${tone === 'error' ? 'border-[var(--status-error-border)] bg-[var(--status-error-bg)] text-[var(--status-error-text)]' : tone === 'success' ? 'border-[var(--status-completed-border)] bg-[var(--status-completed-bg)] text-[var(--status-completed-text)]' : 'border-[var(--color-panel-border)] bg-[var(--color-panel-soft-bg)] text-[var(--color-text-muted)]'}`}
    >
      {children}
    </div>
  )
}

export function Panel({
  title,
  children,
  actions,
}: {
  title?: string
  children: ReactNode
  actions?: ReactNode
}) {
  return (
    <Card className="honorarios-panel p-5 sm:p-6">
      {(title || actions) && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-bold text-[var(--color-text-strong)]">
            {title}
          </h2>
          {actions}
        </div>
      )}
      {children}
    </Card>
  )
}

export function Pagination({
  page,
  count,
  pageSize = 20,
  onChange,
}: {
  page: number
  count: number
  pageSize?: number
  onChange: (page: number) => void
}) {
  const pages = Math.max(1, Math.ceil(count / pageSize))
  return (
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-[var(--color-text-muted)]">
      <span>
        {count} registro(s) · Página {page} de {pages}
      </span>
      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          Anterior
        </Button>
        <Button
          size="sm"
          disabled={page >= pages}
          onClick={() => onChange(page + 1)}
        >
          Próxima
        </Button>
      </div>
    </div>
  )
}

export function ProfileFields({
  profile,
  params,
  onChange,
  disabled,
}: {
  profile: HonorariosProfile
  params: HonorariosParams
  onChange: (profile: HonorariosProfile) => void
  disabled?: boolean
}) {
  const extraDraft = useRef({
    servicos: [...profile.servicos],
    anomalias: [...profile.anomalias],
  })
  const [servicesOpen, setServicesOpen] = useState(profile.servicos.length > 0)
  const [exceptionsOpen, setExceptionsOpen] = useState(
    profile.anomalias.length > 0,
  )
  function set<K extends keyof HonorariosProfile>(
    key: K,
    value: HonorariosProfile[K],
  ) {
    onChange({ ...profile, [key]: value })
  }
  const count = (
    key:
      | 'funcionarios'
      | 'socios'
      | 'xml'
      | 'notas'
      | 'filiais'
      | 'filiaisInativas',
    label: string,
  ) => (
    <TextField
      label={label}
      type="number"
      min="0"
      step="1"
      required
      value={profile[key]}
      onChange={(e) => set(key, Number(e.target.value))}
    />
  )
  const toggle = (key: 'inativa' | 'emiteNF' | 'usarHoras', label: string) => (
    <label className="hon-toggle">
      <input
        type="checkbox"
        role="switch"
        checked={profile[key]}
        onChange={(e) => set(key, e.target.checked)}
      />
      <span>{label}</span>
    </label>
  )
  return (
    <fieldset
      disabled={disabled}
      className="hon-profile-fields disabled:opacity-70"
    >
      <legend className="sr-only">Perfil de cálculo</legend>
      <section>
        <h3>Empresa</h3>
        <div className="hon-field-grid">
          <Select
            label="Segmento"
            value={profile.segmento}
            onChange={(e) => set('segmento', e.target.value)}
          >
            {params.segmentos.map((item) => (
              <option key={item.id} value={item.id}>
                {item.nome}
              </option>
            ))}
          </Select>
          <fieldset className="hon-regimes">
            <legend>Regime tributário</legend>
            <div>
              {Object.entries(regimeNames).map(([id, name]) => (
                <label key={id}>
                  <input
                    type="radio"
                    name={`regime-${profile.segmento}`}
                    value={id}
                    checked={profile.regime === id}
                    onChange={() =>
                      set('regime', id as HonorariosProfile['regime'])
                    }
                  />
                  <span>{name}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <CurrencyField
            label="Faturamento mensal (R$)"
            required
            value={profile.faturamento}
            onValueChange={(value) => set('faturamento', value)}
          />
        </div>
        {toggle('inativa', 'Empresa inativa')}
      </section>
      {!profile.inativa && (
        <>
          <section>
            <h3>Departamento pessoal</h3>
            <div className="hon-field-grid">
              {count('funcionarios', 'Funcionários')}
              {params.socios.ativo && count('socios', 'Sócios')}
            </div>
          </section>
          <section>
            <h3>Fiscal</h3>
            <div className="hon-field-grid">
              {params.xml.ativo && count('xml', 'XMLs por mês')}
            </div>
            {toggle('emiteNF', 'Escritório emite notas')}
            {profile.emiteNF && count('notas', 'Notas por mês')}
          </section>
          <section>
            <h3>Filiais</h3>
            <div className="hon-field-grid">
              {count('filiais', 'Filiais ativas')}
              {count('filiaisInativas', 'Filiais inativas')}
            </div>
          </section>
        </>
      )}
      <section>
        <h3>Ajustes do honorário</h3>
        {toggle('usarHoras', 'Comparar custo por horas')}
        {profile.usarHoras && (
          <TextField
            label="Horas mensais estimadas"
            type="number"
            min="0"
            step="0.01"
            required
            value={profile.horas}
            onChange={(e) => set('horas', e.target.value)}
          />
        )}
      </section>
      {(['servicos', 'anomalias'] as const).map((key) => (
        <section key={key}>
          <label className="hon-toggle">
            <input
              type="checkbox"
              role="switch"
              checked={key === 'servicos' ? servicesOpen : exceptionsOpen}
              onChange={(event) => {
                const enabled = event.target.checked
                if (!enabled) extraDraft.current[key] = [...profile[key]]
                set(key, enabled ? extraDraft.current[key] : [])
                if (key === 'servicos') setServicesOpen(enabled)
                else setExceptionsOpen(enabled)
              }}
            />
            <span>
              {key === 'servicos' ? 'Serviços adicionais' : 'Taxa de exceção'}
            </span>
          </label>
          <div hidden={!(key === 'servicos' ? servicesOpen : exceptionsOpen)}>
            <div className="hon-field-grid">
              {params[key].map((item) => (
                <label className="hon-option" key={item.id}>
                  <input
                    type="checkbox"
                    checked={profile[key].includes(item.id)}
                    onChange={(e) =>
                      set(
                        key,
                        e.target.checked
                          ? [...profile[key], item.id]
                          : profile[key].filter((id) => id !== item.id),
                      )
                    }
                  />
                  <span>{item.nome}</span>
                </label>
              ))}
            </div>
          </div>
        </section>
      ))}
    </fieldset>
  )
}

export function CompanyPicker({
  value,
  onChange,
  disabled,
  onDenied,
}: {
  value: HonorariosCompanyOption | null
  onChange: (value: HonorariosCompanyOption | null) => void
  disabled?: boolean
  onDenied?: (error: unknown) => void
}) {
  const auth = useContext(AuthContext)
  const getModule = (module: string) =>
    auth?.activeMembership?.modules?.find((item) => item.module === module)
  const [search, setSearch] = useState('')
  const [options, setOptions] = useState<HonorariosCompanyOption[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const id = useId()
  useEffect(() => {
    if (disabled) return
    const controller = new AbortController()
    const timer = setTimeout(() => {
      setLoading(true)
      setError(null)
      void honorariosService
        .companyOptions(search, controller.signal)
        .then((result) => {
          if (!controller.signal.aborted) setOptions(result.results)
        })
        .catch((caught) => {
          if (!controller.signal.aborted) {
            setError(caught)
            onDenied?.(caught)
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false)
        })
    }, 300)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [search, disabled, onDenied])
  return (
    <div className="space-y-3">
      <Combobox
        id={id}
        label="Empresa do cadastro central"
        placeholder="Nome, código ou CNPJ"
        disabled={disabled}
        value={value?.id ?? null}
        options={[
          ...(value && !options.some((item) => item.id === value.id)
            ? [value]
            : []),
          ...options,
        ].map((item) => ({
          value: item.id,
          label: item.name,
          description: [item.cnpj, item.code].filter(Boolean).join(' · '),
          keywords: [item.code ?? '', item.cnpj.replace(/\D/g, '')],
        }))}
        onValueChange={(id) =>
          onChange(
            options.find((item) => item.id === id) ??
              (value?.id === id ? value : null),
          )
        }
        onSearchChange={setSearch}
      />
      {loading && <p role="status">Buscando empresas…</p>}
      {error ? (
        <Notice tone="error">{getErrorPresentation(error).message}</Notice>
      ) : null}
      {!loading && !error && search && !options.length && (
        <p className="text-xs text-[var(--color-text-muted)]">
          Nenhuma empresa ativa encontrada.
        </p>
      )}
      {value && (
        <p className="text-xs text-[var(--color-text-muted)]">
          CNPJ: {value.cnpj || 'Não informado'} · Nome e CNPJ vêm do cadastro
          central.
        </p>
      )}
      {value && getModule('companies')?.actions.includes('read') && (
        <Link
          className="inline-flex min-h-10 items-center text-sm font-semibold text-[var(--color-brand)] underline"
          to={`/cadastro-empresas/${encodeURIComponent(value.id)}`}
        >
          Cadastro geral da empresa ↗
        </Link>
      )}
      {!value && getModule('companies')?.actions.includes('create') && (
        <Link
          className="inline-flex min-h-10 items-center text-sm font-semibold text-[var(--color-brand)] underline"
          to="/cadastro-empresas/nova"
        >
          Cadastrar empresa no catálogo geral ↗
        </Link>
      )}
    </div>
  )
}

const historyNames: Record<string, string> = {
  client_created: 'Perfil criado',
  client_updated: 'Perfil atualizado',
  adjustment_applied: 'Reajuste aplicado',
  client_archived: 'Perfil arquivado',
  client_restored: 'Perfil restaurado',
  quote_created: 'Orçamento criado',
  quote_status: 'Status alterado',
  quote_converted: 'Convertido em cliente',
  quote_archived: 'Orçamento arquivado',
  quote_restored: 'Orçamento restaurado',
  configuration_updated: 'Parâmetros atualizados',
}

export function History({
  load,
  scopeKey = [],
  onDenied,
}: {
  load: (
    page: number,
    signal: AbortSignal,
  ) => Promise<HonorariosPage<HonorariosHistoryEvent>>
  scopeKey?: readonly unknown[]
  onDenied?: (error: unknown) => void
}) {
  const [page, setPage] = useState(1)
  const query = useQuery({
    queryKey: [...scopeKey, 'history', page],
    queryFn: ({ signal }) => load(page, signal),
    retry: false,
  })
  useEffect(() => {
    if (query.error) onDenied?.(query.error)
  }, [query.error, onDenied])
  return (
    <div className="space-y-3">
      {query.isPending && <p role="status">Carregando histórico…</p>}
      {query.error && (
        <Notice tone="error">
          {getErrorPresentation(query.error).message}
          <Button size="sm" onClick={() => void query.refetch()}>
            Tentar novamente
          </Button>
        </Notice>
      )}
      {query.data?.results.map((event) => (
        <article
          key={event.id}
          className="rounded-[var(--radius-control)] border border-[var(--color-panel-border)] p-3 text-sm"
        >
          <p className="font-semibold">
            {historyNames[event.kind] ?? event.kind} · {date(event.createdAt)}
          </p>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            Responsável: {event.actorId || 'Sistema'}
          </p>
          <details className="mt-2">
            <summary className="cursor-pointer text-[var(--color-brand)]">
              Detalhes do evento
            </summary>
            <pre className="mt-2 overflow-auto whitespace-pre-wrap text-xs">
              {JSON.stringify(event.details, null, 2)}
            </pre>
          </details>
        </article>
      ))}
      {query.data && !query.data.count && (
        <p className="text-sm text-[var(--color-text-muted)]">
          Nenhum evento registrado.
        </p>
      )}
      {query.data && (
        <Pagination page={page} count={query.data.count} onChange={setPage} />
      )}
    </div>
  )
}
