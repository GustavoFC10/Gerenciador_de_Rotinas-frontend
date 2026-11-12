import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import Button from '../ui/Button'
import TextField from '../ui/TextField'
import Select from '../ui/Select'
import Badge from '../ui/Badge'
import {
  CompanyPicker,
  History,
  Notice,
  Pagination,
  Panel,
  ProfileFields,
} from './HonorariosShared'
import { honorariosService } from '../../services/honorariosService'
import { isApiError } from '../../services/httpClient'
import { useHonorariosCalculation } from '../../hooks/useHonorariosCalculation'
import type {
  HonorariosCompanyOption,
  HonorariosConfiguration,
  HonorariosQuote,
  HonorariosQuoteInput,
  HonorariosQuoteStatus,
} from '../../types/honorarios'
import {
  date,
  defaultProfile,
  downloadText,
  money,
  quoteStatusNames,
  regimeNames,
} from '../../utils/honorariosPresentation'
import {
  buildProposalHtml,
  printProposal,
  proposalMessage,
} from '../../utils/honorariosProposal'
import { getErrorPresentation } from '../../utils/apiErrors'

interface Props {
  configuration: HonorariosConfiguration
  canEdit: boolean
  canManage: boolean
  scopeKey: readonly unknown[]
  onDenied: (error: unknown) => void
}
const pageSize = 20
const detailKey = (scopeKey: readonly unknown[], id: string) => [
  ...scopeKey,
  'proposal',
  id,
]

function quotePrice(quote: HonorariosQuote): string {
  const chosen = quote.snapshot.plans.find(
    (plan) => plan.id === quote.selectedPlan,
  )
  if (chosen) return money(chosen.value)
  if (quote.snapshot.plans.length)
    return `A partir de ${money(Math.min(...quote.snapshot.plans.map((plan) => Number(plan.value))))}`
  return money(quote.snapshot.value)
}

function useLatestQuote(
  quote: HonorariosQuote | undefined,
  scopeKey: readonly unknown[],
) {
  return useQuery({
    queryKey: [...scopeKey, 'latest-quote', quote?.number],
    enabled: !!quote,
    retry: false,
    queryFn: async ({ signal }) => {
      const responses = await Promise.all(
        [false, true].map((archived) =>
          honorariosService.quotes(
            { q: quote!.number, archived, pageSize: 100 },
            signal,
          ),
        ),
      )
      const entries = responses
        .flatMap((result) => result.results)
        .filter((item) => item.number === quote!.number)
      if (!entries.length)
        throw new Error(
          'Não foi possível confirmar a revisão atual. Atualize a consulta antes de continuar.',
        )
      return entries.reduce((latest, item) =>
        item.revision > latest.revision ? item : latest,
      )
    },
  })
}

export function HonorariosQuotes({ scopeKey, onDenied }: Props) {
  const [searchParams, setSearchParams] = useSearchParams()
  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const search = searchParams.get('q') ?? ''
  const rawStatus = searchParams.get('status') ?? ''
  const status = Object.hasOwn(quoteStatusNames, rawStatus)
    ? (rawStatus as HonorariosQuoteStatus)
    : undefined
  const archived = searchParams.get('archived') === 'true'
  const allRevisions = searchParams.get('allRevisions') === 'true'
  const filters = { q: search, status, archived, allRevisions, page, pageSize }
  const query = useQuery({
    queryKey: [...scopeKey, 'quotes', filters],
    queryFn: ({ signal }) => honorariosService.quotes(filters, signal),
    retry: false,
  })
  useEffect(() => {
    if (query.error) onDenied(query.error)
  }, [query.error, onDenied])
  function filter(key: string, value: string) {
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous)
      if (value) next.set(key, value)
      else next.delete(key)
      next.delete('page')
      return next
    })
  }
  return (
    <Panel
      title="Orçamentos"
      actions={
        <Link
          to="/honorarios/novo"
          className="text-sm font-bold text-[var(--color-brand)]"
        >
          Abrir calculadora →
        </Link>
      }
    >
      <div className="mb-5 grid items-end gap-4 sm:grid-cols-3">
        <TextField
          label="Buscar proposta"
          placeholder="Número ou nome do prospect"
          value={search}
          onChange={(e) => filter('q', e.target.value)}
        />
        <Select
          label="Status"
          value={status ?? ''}
          onChange={(e) => filter('status', e.target.value)}
        >
          <option value="">Todos os status</option>
          {Object.entries(quoteStatusNames).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <Select
          label="Exibir"
          value={archived ? 'true' : 'false'}
          onChange={(e) => filter('archived', e.target.value)}
        >
          <option value="false">Ativos</option>
          <option value="true">Arquivados</option>
        </Select>
      </div>
      <label className="mb-5 flex gap-2 text-sm">
        <input
          type="checkbox"
          checked={allRevisions}
          onChange={(e) => filter('allRevisions', String(e.target.checked))}
        />
        Incluir revisões anteriores
      </label>
      {query.isPending && <p role="status">Carregando propostas…</p>}
      {query.error && (
        <Notice tone="error">
          {getErrorPresentation(query.error).message}
          <Button onClick={() => void query.refetch()}>Tentar novamente</Button>
        </Notice>
      )}
      {query.data && (
        <>
          {!query.data.count ? (
            <div className="py-12 text-center">
              <p className="font-semibold">Nenhum orçamento encontrado</p>
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                Crie uma proposta pela calculadora ou ajuste os filtros.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-[var(--color-text-muted)]">
                  <tr>
                    {[
                      'Proposta',
                      'Empresa ou prospect',
                      'Valor mensal',
                      'Status',
                      'Validade',
                      '',
                    ].map((label, i) => (
                      <th className="px-3 py-3" key={i}>
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {query.data.results.map((quote) => (
                    <tr
                      key={quote.id}
                      className="border-t border-[var(--color-panel-border)]"
                    >
                      <td className="px-3 py-4 font-semibold">
                        {quote.number}
                        <span className="mt-1 block text-xs font-normal text-[var(--color-text-muted)]">
                          Revisão {quote.revision}
                        </span>
                      </td>
                      <td className="px-3 py-4">
                        {quote.snapshot.prospect}
                        <span className="mt-1 block text-xs text-[var(--color-text-muted)]">
                          {quote.snapshot.contact}
                        </span>
                      </td>
                      <td className="px-3 py-4">{quotePrice(quote)}</td>
                      <td className="px-3 py-4">
                        <Badge>{quoteStatusNames[quote.status]}</Badge>
                        {quote.convertedClientId && (
                          <span className="mt-1 block text-xs">Convertida</span>
                        )}
                      </td>
                      <td className="px-3 py-4">
                        {date(quote.snapshot.validUntil)}
                      </td>
                      <td className="px-3 py-4">
                        <Link
                          className="font-bold text-[var(--color-brand)]"
                          to={`/honorarios/orcamentos/${quote.id}`}
                        >
                          Abrir
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Pagination
            page={page}
            count={query.data.count}
            pageSize={pageSize}
            onChange={(next) =>
              setSearchParams((previous) => {
                const params = new URLSearchParams(previous)
                params.set('page', String(next))
                return params
              })
            }
          />
        </>
      )}
    </Panel>
  )
}

export function HonorariosQuoteForm(props: Props) {
  const { quoteId } = useParams()
  const source = useQuery({
    queryKey: [...props.scopeKey, 'revision-source', quoteId],
    enabled: !!quoteId,
    queryFn: ({ signal }) => honorariosService.quote(quoteId!, signal),
    retry: false,
  })
  const latest = useLatestQuote(source.data, props.scopeKey)
  useEffect(() => {
    if (source.error || latest.error)
      props.onDenied(source.error || latest.error)
  }, [source.error, latest.error, props])
  if (quoteId && (source.isPending || latest.isPending))
    return <p role="status">Carregando revisão…</p>
  if (quoteId && (source.error || latest.error))
    return (
      <Notice tone="error">
        {getErrorPresentation(source.error || latest.error).message}
      </Notice>
    )
  if (
    quoteId &&
    (source.data?.archivedAt ||
      source.data?.convertedClientId ||
      source.data?.id !== latest.data?.id)
  )
    return (
      <Notice>
        Esta proposta está arquivada, convertida ou foi superada por uma nova
        revisão.{' '}
        <Link className="underline" to={`/honorarios/orcamentos/${quoteId}`}>
          Consultar proposta
        </Link>
      </Notice>
    )
  return <QuoteEditor key={quoteId ?? 'new'} {...props} source={source.data} />
}

function QuoteEditor({
  configuration,
  canEdit,
  scopeKey,
  onDenied,
  source,
}: Props & { source?: HonorariosQuote }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const saved = source?.snapshot
  const [profile, setProfile] = useState(
    () => saved?.profile ?? defaultProfile(configuration.params),
  )
  const [company, setCompany] = useState<HonorariosCompanyOption | null>(
    () => saved?.company ?? null,
  )
  const [prospect, setProspect] = useState(saved?.prospect ?? '')
  const [contact, setContact] = useState(saved?.contact ?? '')
  const [value, setValue] = useState<string>(saved?.value ?? '')
  const [validityDays, setValidityDays] = useState(
    configuration.office.validadeDias,
  )
  const [decimo, setDecimo] = useState(
    saved?.decimoTerceiro ?? configuration.params.decimoTerceiro,
  )
  const [start, setStart] = useState(saved?.inicioCobranca ?? 1)
  const [opening, setOpening] = useState(saved?.aberturaValor ?? '0.00')
  const [installments, setInstallments] = useState(saved?.aberturaParcelas ?? 1)
  const [offerPlans, setOfferPlans] = useState(!!saved?.plans.length)
  const [planValues, setPlanValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(saved?.plans.map((plan) => [plan.id, plan.value]) ?? []),
  )
  const [requestId] = useState(() => crypto.randomUUID())
  const pendingBody = useRef<HonorariosQuoteInput | null>(null)
  const request = useRef<AbortController | null>(null)
  useEffect(() => () => request.current?.abort(), [])
  const [locked, setLocked] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const calculation = useHonorariosCalculation(
    profile,
    configuration.version,
    onDenied,
  )
  const total = calculation.data?.calculation.total
  const finalValue = value === '' ? (total ?? '') : value
  const discount =
    Number(total) > 0 ? (1 - Number(finalValue) / Number(total)) * 100 : 0
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!canEdit || saving || !calculation.data) return
    const body: HonorariosQuoteInput = pendingBody.current ?? {
      requestId,
      prospect: prospect.trim(),
      companyId: company?.id ?? null,
      contact,
      profile,
      value: Number(finalValue).toFixed(2),
      validityDays,
      decimoTerceiro: decimo,
      inicioCobranca: start,
      aberturaValor: Number(opening).toFixed(2),
      aberturaParcelas: installments,
      offerPlans,
      planValues: offerPlans
        ? Object.fromEntries(
            calculation.data.plans.map((plan) => [
              plan.id,
              Number(planValues[plan.id] ?? plan.value).toFixed(2),
            ]),
          )
        : {},
      ...(source
        ? { revisionOf: source.id, sourceVersion: source.version }
        : {}),
    }
    pendingBody.current = body
    setLocked(true)
    setSaving(true)
    setError(null)
    const controller = new AbortController()
    request.current = controller
    try {
      const quote = await honorariosService.createQuote(body, controller.signal)
      if (controller.signal.aborted) return
      queryClient.setQueryData(detailKey(scopeKey, quote.id), quote)
      void queryClient.invalidateQueries({ queryKey: scopeKey })
      navigate(`/honorarios/orcamentos/${quote.id}`, {
        replace: true,
        state: { saved: true },
      })
    } catch (caught) {
      if (controller.signal.aborted) return
      setError(caught)
      onDenied(caught)
      if (isApiError(caught) && [400, 422].includes(caught.status)) {
        pendingBody.current = null
        setLocked(false)
      }
    } finally {
      if (!controller.signal.aborted) setSaving(false)
    }
  }
  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">
            {source ? `Nova revisão de ${source.number}` : 'Novo orçamento'}
          </h2>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Defina o perfil e confira a composição antes de preparar a proposta.
          </p>
        </div>
        {source && (
          <Link
            to={`/honorarios/orcamentos/${source.id}`}
            className="text-sm font-semibold text-[var(--color-brand)]"
          >
            Voltar à proposta
          </Link>
        )}
      </div>
      {!canEdit && (
        <Notice>
          Modo consulta. Você pode simular valores; criar e revisar propostas
          exige permissão de operação.
        </Notice>
      )}
      {source && (
        <Notice>
          A revisão utilizará os parâmetros atuais. A proposta anterior
          continuará disponível.
        </Notice>
      )}
      <div className="grid items-start gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Panel title="Perfil da empresa">
          <ProfileFields
            profile={profile}
            params={configuration.params}
            onChange={setProfile}
            disabled={locked}
          />
        </Panel>
        <div className="space-y-6">
          <Panel title="Composição do honorário">
            {calculation.isPending && (
              <p
                role="status"
                className="text-sm text-[var(--color-text-muted)]"
              >
                Atualizando cálculo…
              </p>
            )}
            {calculation.error ? (
              <Notice tone="error">
                {getErrorPresentation(calculation.error).message}
                <Button size="sm" className="ml-3" onClick={calculation.retry}>
                  Tentar novamente
                </Button>
              </Notice>
            ) : null}
            {calculation.data && (
              <>
                <div className="mb-5 rounded-[var(--radius-control)] bg-[var(--color-brand-soft)] p-5">
                  <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-brand)]">
                    Mensalidade sugerida
                  </p>
                  <p className="mt-2 text-3xl font-black text-[var(--color-brand)]">
                    {money(total)}
                  </p>
                  <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                    {money(calculation.data.calculation.anual)} por ano · Tabela
                    v{calculation.data.paramsVersion}
                  </p>
                </div>
                <dl className="space-y-3 text-sm">
                  {calculation.data.calculation.linhas.map((line, index) => (
                    <div key={index} className="flex justify-between gap-3">
                      <dt className="text-[var(--color-text-muted)]">
                        {line.label}
                      </dt>
                      <dd className="shrink-0 font-semibold">
                        {money(line.value)}
                      </dd>
                    </div>
                  ))}
                </dl>
                {profile.usarHoras && (
                  <p className="mt-4 border-t border-[var(--color-panel-border)] pt-3 text-xs text-[var(--color-text-muted)]">
                    Custo: {money(calculation.data.calculation.custo)} · Valor
                    por horas: {money(calculation.data.calculation.valorHoras)}
                  </p>
                )}
              </>
            )}
          </Panel>
          <Panel title="Valor da proposta">
            <TextField
              label="Honorário mensal negociado (R$)"
              type="number"
              min="0"
              step="0.01"
              required
              value={finalValue}
              disabled={locked || !canEdit}
              onChange={(e) => setValue(e.target.value)}
            />
            {discount > configuration.params.descontoMax && (
              <div className="mt-3">
                <Notice>
                  Desconto de {discount.toFixed(1)}% acima da referência de{' '}
                  {configuration.params.descontoMax}%. A proposta pode ser salva
                  normalmente.
                </Notice>
              </div>
            )}
            {calculation.data?.plans.length ? (
              <div className="mt-5 space-y-3">
                <label className="flex gap-2 text-sm font-semibold">
                  <input
                    type="checkbox"
                    disabled={locked || !canEdit}
                    checked={offerPlans}
                    onChange={(e) => setOfferPlans(e.target.checked)}
                  />
                  Ofertar planos
                </label>
                {calculation.data.plans.map((plan) => (
                  <div
                    key={plan.id}
                    className="rounded-[var(--radius-control)] border border-[var(--color-panel-border)] p-3"
                  >
                    <p className="text-sm font-bold">
                      {plan.nome}{' '}
                      {plan.destaque && (
                        <Badge variant="brand">Recomendado</Badge>
                      )}
                    </p>
                    <p className="my-2 text-xs text-[var(--color-text-muted)]">
                      {plan.descricao} · Sugerido {money(plan.value)}
                    </p>
                    {offerPlans && (
                      <TextField
                        label={`Valor mensal — ${plan.nome} (R$)`}
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        disabled={locked || !canEdit}
                        value={planValues[plan.id] ?? plan.value}
                        onChange={(e) =>
                          setPlanValues({
                            ...planValues,
                            [plan.id]: e.target.value,
                          })
                        }
                      />
                    )}
                    {offerPlans &&
                      Number(planValues[plan.id] ?? plan.value) <
                        Number(plan.value) *
                          (1 - configuration.params.descontoMax / 100) && (
                        <p className="mt-2 text-xs text-[var(--status-pending-text)]">
                          Desconto acima da referência; salvamento permitido.
                        </p>
                      )}
                  </div>
                ))}
              </div>
            ) : null}
          </Panel>
        </div>
      </div>
      <Panel title="Destinatário e condições comerciais">
        <fieldset disabled={locked || !canEdit} className="space-y-5">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <TextField
                label="Empresa ou pessoa interessada"
                required
                maxLength={200}
                value={prospect}
                onChange={(e) => setProspect(e.target.value)}
              />
              <TextField
                label="Contato da negociação"
                maxLength={500}
                value={contact}
                onChange={(e) => setContact(e.target.value)}
              />
              <details>
                <summary className="cursor-pointer text-sm font-semibold text-[var(--color-brand)]">
                  Vincular a uma empresa existente (opcional)
                </summary>
                <div className="mt-3">
                  <CompanyPicker
                    value={company}
                    onChange={(next) => {
                      setCompany(next)
                      if (next && !prospect) setProspect(next.name)
                    }}
                    disabled={locked || !canEdit}
                    onDenied={onDenied}
                  />
                  {company && (
                    <Button
                      size="sm"
                      className="mt-2"
                      onClick={() => setCompany(null)}
                    >
                      Remover vínculo
                    </Button>
                  )}
                </div>
              </details>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label="Validade (dias)"
                type="number"
                min="1"
                max="365"
                required
                value={validityDays}
                onChange={(e) => setValidityDays(Number(e.target.value))}
              />
              <Select
                label="Início da cobrança"
                value={start}
                onChange={(e) => setStart(Number(e.target.value))}
              >
                <option value="0">No ato</option>
                <option value="1">1ª competência</option>
                <option value="2">2ª competência · benefício</option>
                <option value="3">3ª competência · benefício</option>
              </Select>
              <TextField
                label="Abertura de empresa (R$)"
                type="number"
                min="0"
                step="0.01"
                required
                value={opening}
                onChange={(e) => setOpening(e.target.value)}
              />
              <TextField
                label="Parcelas da abertura"
                type="number"
                min="1"
                max="12"
                required
                value={installments}
                onChange={(e) => setInstallments(Number(e.target.value))}
              />
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <input
                  type="checkbox"
                  checked={decimo}
                  onChange={(e) => setDecimo(e.target.checked)}
                />
                Honorário adicional anual (13 cobranças)
              </label>
            </div>
          </div>
        </fieldset>
      </Panel>
      {error ? (
        <Notice tone="error">
          {getErrorPresentation(error).message}
          {isApiError(error) &&
            error.status === 409 &&
            ' Recarregue a revisão e confira os dados antes de tentar novamente.'}
        </Notice>
      ) : null}
      {locked && !saving && (
        <Notice>
          A tentativa foi preservada para reenviar os mesmos dados sem duplicar
          a proposta.{' '}
          <a
            href={
              source
                ? `/honorarios/orcamentos/${source.id}/revisar`
                : '/honorarios/novo'
            }
            className="underline"
          >
            Descartar tentativa e iniciar nova criação
          </a>
        </Notice>
      )}
      {canEdit && (
        <div className="flex flex-wrap items-center justify-end gap-3">
          <p className="text-xs text-[var(--color-text-muted)]">
            A proposta salva será exibida para conferência.
          </p>
          <Button
            tone="primary"
            type="submit"
            disabled={saving || calculation.isPending || !calculation.data}
          >
            {saving
              ? 'Salvando…'
              : locked
                ? 'Reenviar tentativa'
                : source
                  ? 'Salvar nova revisão'
                  : 'Salvar proposta'}
          </Button>
        </div>
      )}
    </form>
  )
}

export function HonorariosQuoteDetail(props: Props) {
  const { quoteId = '' } = useParams()
  const [conflict, setConflict] = useState(false)
  const query = useQuery({
    queryKey: detailKey(props.scopeKey, quoteId),
    queryFn: ({ signal }) => honorariosService.proposal(quoteId, signal),
    retry: false,
  })
  const latest = useLatestQuote(query.data, props.scopeKey)
  useEffect(() => {
    if (query.error || latest.error) props.onDenied(query.error || latest.error)
  }, [query.error, latest.error, props])
  if (query.isPending) return <p role="status">Carregando proposta salva…</p>
  if (query.error)
    return (
      <Notice tone="error">
        {getErrorPresentation(query.error).message}
        <Button onClick={() => void query.refetch()}>Tentar novamente</Button>
      </Notice>
    )
  return (
    <>
      {conflict && (
        <div className="mb-5">
          <Notice tone="error">
            A proposta foi alterada por outra pessoa. Os dados foram
            recarregados; confira a versão atual antes de confirmar novamente.
          </Notice>
        </div>
      )}
      <QuoteDocument
        key={`${query.data.id}:${query.data.version}`}
        {...props}
        quote={query.data}
        isLatest={latest.data?.id === query.data.id && !latest.error}
        latestPending={latest.isPending}
        latestError={latest.error}
        onConflict={() => setConflict(true)}
      />
    </>
  )
}

function QuoteDocument({
  quote,
  isLatest,
  latestPending,
  latestError,
  canEdit,
  canManage,
  scopeKey,
  onDenied,
  onConflict,
}: Props & {
  quote: HonorariosQuote
  isLatest: boolean
  latestPending: boolean
  latestError: unknown
  onConflict: () => void
}) {
  const queryClient = useQueryClient()
  const [selectedPlan, setSelectedPlan] = useState(quote.selectedPlan ?? '')
  const [company, setCompany] = useState<HonorariosCompanyOption | null>(
    quote.snapshot.company,
  )
  const [command, setCommand] = useState<
    'enviado' | 'aceito' | 'recusado' | 'convert' | 'archive' | 'restore' | null
  >(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [feedback, setFeedback] = useState('')
  const request = useRef<AbortController | null>(null)
  useEffect(() => () => request.current?.abort(), [])
  const actionable = isLatest && !quote.archivedAt && !quote.convertedClientId
  const selected = quote.snapshot.plans.find(
    (plan) => plan.id === quote.selectedPlan,
  )
  const leastExpensivePlan = quote.snapshot.plans.reduce<
    (typeof quote.snapshot.plans)[number] | undefined
  >(
    (lowest, plan) =>
      !lowest || Number(plan.value) < Number(lowest.value) ? plan : lowest,
    undefined,
  )
  async function runCommand() {
    if (!command || busy) return
    if (command === 'archive' || command === 'restore') {
      if (!canManage) return
    } else if (!canEdit || !actionable) return
    if (command === 'convert' && quote.status !== 'aceito') return
    if (
      command === 'aceito' &&
      quote.snapshot.plans.length > 0 &&
      !selectedPlan
    )
      return
    setBusy(true)
    setError(null)
    const controller = new AbortController()
    request.current = controller
    try {
      if (command === 'convert') {
        if (!company)
          throw new Error(
            'Selecione a empresa existente que receberá este perfil.',
          )
        await honorariosService.convertQuote(
          quote.id,
          { version: quote.version, companyId: company.id },
          controller.signal,
        )
        if (controller.signal.aborted) return
        setFeedback(
          'Proposta convertida. O perfil da carteira recebeu os valores salvos na proposta.',
        )
      } else if (command === 'archive')
        await honorariosService.archiveQuote(
          quote.id,
          quote.version,
          controller.signal,
        )
      else if (command === 'restore')
        await honorariosService.restoreQuote(
          quote.id,
          quote.version,
          controller.signal,
        )
      else
        await honorariosService.changeQuoteState(
          quote.id,
          {
            version: quote.version,
            status: command,
            ...(quote.snapshot.plans.length ? { selectedPlan } : {}),
          },
          controller.signal,
        )
      if (controller.signal.aborted) return
      setCommand(null)
      await queryClient.invalidateQueries({ queryKey: scopeKey })
    } catch (caught) {
      if (controller.signal.aborted) return
      setError(caught)
      onDenied(caught)
      if (isApiError(caught) && caught.status === 409) {
        setCommand(null)
        onConflict()
        await queryClient.invalidateQueries({ queryKey: scopeKey })
      }
    } finally {
      if (!controller.signal.aborted) setBusy(false)
    }
  }
  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(proposalMessage(quote))
      setFeedback('Mensagem copiada. Cole no WhatsApp para compartilhar.')
    } catch {
      setFeedback(
        'Não foi possível copiar automaticamente. Selecione o texto da mensagem abaixo.',
      )
    }
  }
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            className="text-sm font-semibold text-[var(--color-brand)]"
            to="/honorarios/orcamentos"
          >
            ← Orçamentos
          </Link>
          <h2 className="mt-3 text-2xl font-black">Proposta {quote.number}</h2>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">
            Revisão {quote.revision} · Criada em {date(quote.createdAt)} ·
            Validade {date(quote.snapshot.validUntil)}
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="brand">{quoteStatusNames[quote.status]}</Badge>
          {quote.archivedAt && <Badge>Arquivada</Badge>}
          {quote.convertedClientId && <Badge>Convertida</Badge>}
        </div>
      </div>
      {!isLatest && !latestPending && !latestError && (
        <Notice>
          Esta é uma revisão anterior. Consulte a revisão atual para continuar a
          negociação.
        </Notice>
      )}
      {latestError ? (
        <Notice tone="error">
          {getErrorPresentation(latestError).message}
        </Notice>
      ) : null}
      {feedback && <Notice tone="success">{feedback}</Notice>}
      {quote.snapshot.warnings.length > 0 && (
        <Notice>
          Há desconto acima do limite de referência
          {quote.snapshot.warnings.length > 1 ? ' em um ou mais planos' : ''}.
          Este aviso permite continuar a negociação.
        </Notice>
      )}
      <Panel
        title={quote.snapshot.prospect}
        actions={<Badge>Tabela v{quote.snapshot.paramsVersion}</Badge>}
      >
        <div className="grid gap-5 sm:grid-cols-3">
          <div>
            <p className="text-xs text-[var(--color-text-muted)]">
              Honorário mensal{' '}
              {selected
                ? `· ${selected.nome}`
                : quote.snapshot.plans.length
                  ? '· planos a partir de'
                  : ''}
            </p>
            <p className="mt-2 text-2xl font-black">
              {money(
                selected?.value ??
                  leastExpensivePlan?.value ??
                  quote.snapshot.value,
              )}
            </p>
          </div>
          <div>
            <p className="text-xs text-[var(--color-text-muted)]">
              Honorários anuais
            </p>
            <p className="mt-2 text-xl font-bold">
              {money(
                selected?.annualValue ??
                  leastExpensivePlan?.annualValue ??
                  quote.snapshot.annualValue,
              )}
            </p>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              {quote.snapshot.decimoTerceiro ? 13 : 12} cobranças
            </p>
          </div>
          <div>
            <p className="text-xs text-[var(--color-text-muted)]">Perfil</p>
            <p className="mt-2 text-sm font-bold">
              {regimeNames[quote.snapshot.profile.regime]}
            </p>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              {quote.snapshot.contact || 'Contato não informado'}
            </p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button
            onClick={() =>
              downloadText(
                buildProposalHtml(quote),
                `proposta-${quote.number}-r${quote.revision}.html`,
              )
            }
          >
            Baixar HTML
          </Button>
          <Button
            onClick={() => {
              try {
                printProposal(quote)
              } catch (caught) {
                setError(caught)
              }
            }}
          >
            Imprimir / salvar PDF
          </Button>
          <Button onClick={() => void copyMessage()}>
            Copiar mensagem WhatsApp
          </Button>
        </div>
        <details className="mt-4 text-sm">
          <summary className="cursor-pointer text-[var(--color-brand)]">
            Mensagem para compartilhar
          </summary>
          <pre className="mt-3 select-text whitespace-pre-wrap rounded bg-[var(--color-panel-soft-bg)] p-4 font-sans">
            {proposalMessage(quote)}
          </pre>
        </details>
      </Panel>
      <Panel title="Proposta comercial">
        <iframe
          title={`Proposta comercial ${quote.number}`}
          srcDoc={buildProposalHtml(quote)}
          sandbox=""
          referrerPolicy="no-referrer"
          className="h-[800px] w-full rounded-[var(--radius-control)] border border-[var(--color-panel-border)] bg-white"
        />
      </Panel>
      {canEdit && actionable && (
        <Panel title="Negociação">
          <div className="flex flex-wrap gap-2">
            {quote.status === 'rascunho' && (
              <Button onClick={() => setCommand('enviado')}>
                Marcar como enviada
              </Button>
            )}
            {['rascunho', 'enviado', 'recusado'].includes(quote.status) && (
              <Button tone="primary" onClick={() => setCommand('aceito')}>
                Registrar aceite
              </Button>
            )}
            {['rascunho', 'enviado', 'aceito'].includes(quote.status) && (
              <Button onClick={() => setCommand('recusado')}>
                Registrar recusa
              </Button>
            )}
            {quote.status === 'aceito' && (
              <Button tone="primary" onClick={() => setCommand('convert')}>
                Converter em cliente
              </Button>
            )}
            <Link
              className="inline-flex items-center px-3 text-sm font-bold text-[var(--color-brand)]"
              to={`/honorarios/orcamentos/${quote.id}/revisar`}
            >
              Criar nova revisão
            </Link>
          </div>
        </Panel>
      )}
      {canManage && (
        <Panel title="Arquivamento">
          <Button
            disabled={busy}
            onClick={() => setCommand(quote.archivedAt ? 'restore' : 'archive')}
          >
            {quote.archivedAt ? 'Restaurar proposta' : 'Arquivar proposta'}
          </Button>
        </Panel>
      )}
      {command &&
        (['archive', 'restore'].includes(command)
          ? canManage
          : canEdit && actionable) && (
          <Panel
            title={
              command === 'convert'
                ? 'Confirmar conversão'
                : command === 'aceito'
                  ? 'Confirmar aceite'
                  : command === 'archive'
                    ? 'Confirmar arquivamento'
                    : command === 'restore'
                      ? 'Confirmar restauração'
                      : 'Confirmar alteração de status'
            }
          >
            <div className="space-y-4">
              {command === 'aceito' && quote.snapshot.plans.length > 0 && (
                <Select
                  label="Plano escolhido pelo cliente"
                  value={selectedPlan}
                  onChange={(e) => setSelectedPlan(e.target.value)}
                >
                  <option value="">Selecione o plano aceito</option>
                  {quote.snapshot.plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.nome} · {money(plan.value)}/mês
                    </option>
                  ))}
                </Select>
              )}
              {command === 'convert' ? (
                <>
                  <p className="text-sm">
                    A empresa receberá o perfil e o honorário mensal de{' '}
                    <strong>
                      {money(selected?.value ?? quote.snapshot.value)}
                    </strong>{' '}
                    preservados nesta proposta. Se já houver perfil ativo, os
                    dados financeiros serão atualizados.
                  </p>
                  <CompanyPicker
                    value={company}
                    onChange={setCompany}
                    disabled={!!quote.companyId}
                    onDenied={onDenied}
                  />
                </>
              ) : (
                <p className="text-sm">
                  {command === 'archive'
                    ? 'A proposta ficará disponível no filtro de arquivados.'
                    : command === 'restore'
                      ? 'A proposta voltará a ficar disponível nos registros ativos.'
                      : `O status será alterado para ${quoteStatusNames[command]}.`}
                </p>
              )}
              <div className="flex gap-2">
                <Button
                  tone="primary"
                  disabled={
                    busy ||
                    (command === 'aceito' &&
                      quote.snapshot.plans.length > 0 &&
                      !selectedPlan) ||
                    (command === 'convert' && !company)
                  }
                  onClick={() => void runCommand()}
                >
                  {busy ? 'Confirmando…' : 'Confirmar'}
                </Button>
                <Button disabled={busy} onClick={() => setCommand(null)}>
                  Cancelar
                </Button>
              </div>
            </div>
          </Panel>
        )}
      {error ? (
        <Notice tone="error">
          {getErrorPresentation(error).message}
          {isApiError(error) &&
            error.status === 409 &&
            ' Os dados foram recarregados. Confira a versão atual antes de confirmar novamente.'}
        </Notice>
      ) : null}
      <Panel title="Histórico da proposta">
        <History
          scopeKey={[...scopeKey, 'quote-history', quote.id, quote.version]}
          load={(page, signal) =>
            honorariosService.quoteHistory(quote.id, { page, pageSize }, signal)
          }
          onDenied={onDenied}
        />
      </Panel>
      <Link
        className="inline-block text-sm font-semibold text-[var(--color-brand)]"
        to={`/honorarios/orcamentos?q=${encodeURIComponent(quote.number)}&allRevisions=true`}
      >
        Consultar todas as revisões desta proposta →
      </Link>
    </div>
  )
}
