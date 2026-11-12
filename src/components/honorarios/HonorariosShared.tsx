import { useEffect, useId, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import Button from '../ui/Button'
import Card from '../ui/Card'
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
      className={`rounded-[var(--radius-control)] border px-4 py-3 text-sm ${tone === 'error' ? 'border-[var(--status-error-border)] bg-[var(--status-error-bg)] text-[var(--status-error-text)]' : tone === 'success' ? 'border-[var(--status-done-border)] bg-[var(--status-done-bg)] text-[var(--status-done-text)]' : 'border-[var(--color-panel-border)] bg-[var(--color-panel-soft-bg)] text-[var(--color-text-muted)]'}`}
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
    <Card className="p-5 sm:p-6">
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
  function set<K extends keyof HonorariosProfile>(
    key: K,
    value: HonorariosProfile[K],
  ) {
    onChange({ ...profile, [key]: value })
  }
  const counts = [
    ['funcionarios', 'Funcionários'],
    ['socios', 'Sócios'],
    ['xml', 'XMLs por mês'],
    ['notas', 'Notas por mês'],
    ['filiais', 'Filiais ativas'],
    ['filiaisInativas', 'Filiais inativas'],
  ] as const
  return (
    <fieldset disabled={disabled} className="space-y-5 disabled:opacity-70">
      <legend className="sr-only">Perfil de cálculo</legend>
      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          label="Regime tributário"
          value={profile.regime}
          onChange={(e) =>
            set('regime', e.target.value as HonorariosProfile['regime'])
          }
        >
          {Object.entries(regimeNames).map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </Select>
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
        <TextField
          label="Faturamento mensal (R$)"
          type="number"
          min="0"
          step="0.01"
          required
          value={profile.faturamento}
          onChange={(e) => set('faturamento', e.target.value)}
        />
        {counts.map(([key, label]) => (
          <TextField
            key={key}
            label={label}
            type="number"
            min="0"
            step="1"
            required
            value={profile[key]}
            onChange={(e) => set(key, Number(e.target.value))}
          />
        ))}
        <TextField
          label="Horas mensais estimadas"
          type="number"
          min="0"
          step="0.01"
          required
          value={profile.horas}
          onChange={(e) => set('horas', e.target.value)}
        />
      </div>
      <div className="flex flex-wrap gap-4 text-sm">
        {(
          [
            ['inativa', 'Empresa inativa'],
            ['emiteNF', 'Escritório emite notas'],
            ['usarHoras', 'Comparar custo por horas'],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={profile[key]}
              onChange={(e) => set(key, e.target.checked)}
            />
            {label}
          </label>
        ))}
      </div>
      {(
        [
          ['servicos', 'Serviços adicionais'],
          ['anomalias', 'Exceções do atendimento'],
        ] as const
      ).map(([key, label]) => (
        <fieldset key={key}>
          <legend className="mb-2 text-sm font-semibold text-[var(--color-text-strong)]">
            {label}
          </legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {params[key].map((item) => (
              <label
                key={item.id}
                className="flex items-start gap-2 rounded-[var(--radius-control)] bg-[var(--color-panel-soft-bg)] p-3 text-sm"
              >
                <input
                  className="mt-1"
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
                {item.nome}
              </label>
            ))}
          </div>
        </fieldset>
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
      <TextField
        label="Buscar empresa por nome, CNPJ ou código"
        value={search}
        disabled={disabled}
        onChange={(e) => {
          setSearch(e.target.value)
          setOptions([])
        }}
        aria-controls={id}
      />
      <Select
        id={id}
        label="Empresa do cadastro central"
        value={value?.id ?? ''}
        disabled={disabled || loading}
        onChange={(e) =>
          onChange(
            options.find((item) => item.id === e.target.value) ??
              (e.target.value === value?.id ? value : null),
          )
        }
      >
        <option value="">
          {loading
            ? 'Consultando empresas…'
            : 'Selecione uma empresa existente'}
        </option>
        {value && !options.some((item) => item.id === value.id) && (
          <option value={value.id}>
            {value.name} · {value.cnpj || 'Sem CNPJ'}
          </option>
        )}
        {options.map((item) => (
          <option key={item.id} value={item.id}>
            {item.code ? `${item.code} · ` : ''}
            {item.name} · {item.cnpj || 'Sem CNPJ'}
          </option>
        ))}
      </Select>
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
