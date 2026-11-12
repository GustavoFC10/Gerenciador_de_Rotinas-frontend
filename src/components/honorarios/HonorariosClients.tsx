import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router'
import Button from '../ui/Button'
import Select from '../ui/Select'
import TextField from '../ui/TextField'
import Textarea from '../ui/Textarea'
import EmptyState from '../common/EmptyState'
import { honorariosService } from '../../services/honorariosService'
import { isApiError } from '../../services/httpClient'
import type {
  HonorariosAdjustmentMode,
  HonorariosClient,
  HonorariosClientFilters,
  HonorariosClientInput,
  HonorariosCompanyOption,
  HonorariosConfiguration,
} from '../../types/honorarios'
import { getErrorPresentation } from '../../utils/apiErrors'
import {
  date,
  defaultProfile,
  downloadText,
  money,
  regimeNames,
} from '../../utils/honorariosPresentation'
import {
  parseHonorariosFile,
  resolveHonorariosImportCompany,
  type HonorariosImportRow,
} from '../../utils/honorariosImport'
import {
  CompanyPicker,
  History,
  Notice,
  Pagination,
  Panel,
  ProfileFields,
} from './HonorariosShared'

interface Props {
  configuration: HonorariosConfiguration
  canEdit: boolean
  canManage: boolean
  scopeKey: readonly unknown[]
  onDenied?: (error: unknown) => void
}

const alignmentNames = {
  abaixo: 'Abaixo da tabela',
  alinhado: 'Alinhado à tabela',
  acima: 'Acima da tabela',
}

export default function HonorariosClients(props: Props) {
  const { scopeKey, onDenied, canEdit, configuration } = props
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [regime, setRegime] = useState('')
  const [alignment, setAlignment] = useState('')
  const [archived, setArchived] = useState(false)
  const [page, setPage] = useState(1)
  const [searchParams, setSearchParams] = useSearchParams()
  const selected = searchParams.get('cliente') ?? ''
  function setSelected(id: string) {
    const next = new URLSearchParams(searchParams)
    if (id) next.set('cliente', id)
    else next.delete('cliente')
    setSearchParams(next)
  }
  const [creating, setCreating] = useState(false)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [exporting, setExporting] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search)
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])
  const filters: HonorariosClientFilters = {
    q: query,
    archived,
    page,
    pageSize: 20,
    ...(regime ? { regime: regime as HonorariosClientFilters['regime'] } : {}),
    ...(alignment
      ? { alignment: alignment as HonorariosClientFilters['alignment'] }
      : {}),
  }
  const clients = useQuery({
    queryKey: [...scopeKey, 'clients', filters],
    queryFn: ({ signal }) => honorariosService.clients(filters, signal),
    retry: false,
  })
  useEffect(() => {
    if (clients.error) onDenied?.(clients.error)
  }, [clients.error, onDenied])
  async function refresh(client?: HonorariosClient) {
    if (client) {
      setSelected(client.id)
      setCreating(false)
      setMessage('Perfil salvo com sucesso.')
    }
    await queryClient.invalidateQueries({ queryKey: scopeKey })
  }
  async function exportCsv() {
    setExporting(true)
    setError('')
    try {
      const csv = await honorariosService.exportClients({
        q: query,
        archived,
        ...(regime
          ? { regime: regime as HonorariosClientFilters['regime'] }
          : {}),
        ...(alignment
          ? { alignment: alignment as HonorariosClientFilters['alignment'] }
          : {}),
      })
      downloadText(csv, 'carteira-honorarios.csv', 'text/csv;charset=utf-8')
    } catch (caught) {
      onDenied?.(caught)
      setError(getErrorPresentation(caught).message)
    } finally {
      setExporting(false)
    }
  }
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-black">Carteira de clientes</h2>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Compare os honorários atuais com a tabela e acompanhe os reajustes.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void exportCsv()} disabled={exporting}>
            {exporting ? 'Exportando…' : 'Exportar CSV'}
          </Button>
          {canEdit && (
            <>
              <Button
                onClick={() => {
                  setImporting(!importing)
                  setCreating(false)
                  setSelected('')
                }}
              >
                {importing ? 'Fechar importação' : 'Importar carteira'}
              </Button>
              <Button
                tone="primary"
                onClick={() => {
                  setCreating(true)
                  setSelected('')
                  setImporting(false)
                  setMessage('')
                }}
              >
                Novo cliente
              </Button>
            </>
          )}
        </div>
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      {message && <Notice tone="success">{message}</Notice>}
      {importing && canEdit && (
        <ClientImport
          {...props}
          onImported={() => {
            setMessage('Importação concluída.')
            void refresh()
          }}
        />
      )}
      {creating && canEdit && (
        <ClientForm
          {...props}
          onCancel={() => setCreating(false)}
          onSaved={(client) => void refresh(client)}
        />
      )}
      {selected && (
        <ClientDetails
          key={selected}
          {...props}
          id={selected}
          onClose={() => setSelected('')}
          onChanged={() => void refresh()}
        />
      )}
      <Panel title="Clientes vinculados">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <TextField
            label="Buscar cliente"
            placeholder="Nome, CNPJ ou contato"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <Select
            label="Regime tributário"
            value={regime}
            onChange={(event) => {
              setRegime(event.target.value)
              setPage(1)
            }}
          >
            <option value="">Todos os regimes</option>
            {Object.entries(regimeNames).map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </Select>
          <Select
            label="Comparação com a tabela"
            value={alignment}
            onChange={(event) => {
              setAlignment(event.target.value)
              setPage(1)
            }}
          >
            <option value="">Todas as situações</option>
            {Object.entries(alignmentNames).map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </Select>
          <Select
            label="Situação do perfil"
            value={archived ? 'true' : 'false'}
            onChange={(event) => {
              setArchived(event.target.value === 'true')
              setPage(1)
            }}
          >
            <option value="false">Ativos</option>
            <option value="true">Arquivados</option>
          </Select>
        </div>
        {clients.isPending && (
          <p role="status" className="py-8 text-sm">
            Carregando carteira…
          </p>
        )}
        {clients.error && (
          <Notice tone="error">
            {getErrorPresentation(clients.error).message}
            <Button size="sm" onClick={() => void clients.refetch()}>
              Tentar novamente
            </Button>
          </Notice>
        )}
        {clients.data && !clients.data.results.length && (
          <div className="mt-5">
            <EmptyState
              title="Nenhum cliente encontrado"
              description="Cadastre um perfil de honorários para uma empresa existente ou ajuste os filtros."
            />
          </div>
        )}
        {clients.data && clients.data.results.length > 0 && (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-180 text-left text-sm">
              <thead className="border-b border-[var(--color-panel-border)] text-xs text-[var(--color-text-muted)]">
                <tr>
                  {[
                    'Empresa',
                    'Honorário atual',
                    'Tabela',
                    'Diferença',
                    'Situação',
                    'Reajuste',
                    '',
                  ].map((title, index) => (
                    <th
                      key={index}
                      scope="col"
                      className="px-3 py-3 font-semibold"
                    >
                      {title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {clients.data.results.map((client) => (
                  <tr
                    key={client.id}
                    className="border-b border-[var(--color-panel-border)]"
                  >
                    <td className="px-3 py-4">
                      <p className="font-bold text-[var(--color-text-strong)]">
                        {client.company.name}
                      </p>
                      <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                        {client.company.cnpj || 'CNPJ não informado'} ·{' '}
                        {regimeNames[client.profile.regime]}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 font-semibold">
                      {money(client.currentFee)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4">
                      {money(client.calculation.total)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4">
                      {money(client.difference)}
                    </td>
                    <td className="px-3 py-4">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${client.alignment === 'abaixo' ? 'bg-[var(--status-pending-bg)] text-[var(--status-pending-text)]' : 'bg-[var(--color-brand-soft)] text-[var(--color-brand)]'}`}
                      >
                        {alignmentNames[client.alignment]}
                      </span>
                    </td>
                    <td className="px-3 py-4">
                      {client.adjustment?.notice ? (
                        <span className="font-semibold text-[var(--status-pending-text)]">
                          {(client.adjustment.days ?? 0) < 0
                            ? 'Vencido'
                            : 'Próximo'}{' '}
                          · {date(client.adjustment.dueDate)}
                        </span>
                      ) : (
                        date(client.adjustment?.dueDate)
                      )}
                    </td>
                    <td className="px-3 py-4">
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelected(client.id)
                          setCreating(false)
                          setImporting(false)
                          setMessage('')
                        }}
                      >
                        Ver perfil
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {clients.data && (
          <Pagination
            page={page}
            count={clients.data.count}
            onChange={setPage}
          />
        )}
        <p className="mt-3 text-xs text-[var(--color-text-muted)]">
          Diferença = honorário atual menos o valor sugerido. Tabela versão{' '}
          {configuration.version}.
        </p>
      </Panel>
    </div>
  )
}

function ClientForm({
  configuration,
  canEdit,
  onDenied,
  client,
  onSaved,
  onCancel,
}: Props & {
  client?: HonorariosClient
  onSaved: (client: HonorariosClient) => void
  onCancel: () => void
}) {
  const [company, setCompany] = useState<HonorariosCompanyOption | null>(
    client?.company ?? null,
  )
  const [profile, setProfile] = useState(() =>
    structuredClone(client?.profile ?? defaultProfile(configuration.params)),
  )
  const [currentFee, setCurrentFee] = useState(client?.currentFee ?? '0.00')
  const [adjustmentDate, setAdjustmentDate] = useState(
    client?.adjustmentDate ?? '',
  )
  const [contact, setContact] = useState(client?.contact ?? '')
  const [notes, setNotes] = useState(client?.notes ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [conflict, setConflict] = useState(false)
  const request = useRef<AbortController | null>(null)
  useEffect(() => () => request.current?.abort(), [])
  async function save(event: FormEvent) {
    event.preventDefault()
    if (!canEdit || busy || conflict) return
    if (!company) {
      setError('Selecione uma empresa existente.')
      return
    }
    setBusy(true)
    setError('')
    const abort = new AbortController()
    request.current = abort
    const input: HonorariosClientInput = {
      companyId: company.id,
      profile,
      currentFee: Number(currentFee).toFixed(2),
      adjustmentDate: adjustmentDate || null,
      contact,
      notes,
    }
    try {
      const result = client
        ? await honorariosService.updateClient(
            client.id,
            {
              version: client.version,
              profile: input.profile,
              currentFee: input.currentFee,
              adjustmentDate: input.adjustmentDate,
              contact,
              notes,
            },
            abort.signal,
          )
        : await honorariosService.createClient(input, abort.signal)
      if (!abort.signal.aborted) onSaved(result)
    } catch (caught) {
      if (!abort.signal.aborted) {
        onDenied?.(caught)
        setError(getErrorPresentation(caught).message)
        if (isApiError(caught) && caught.status === 409) setConflict(true)
      }
    } finally {
      if (!abort.signal.aborted) setBusy(false)
    }
  }
  return (
    <Panel
      title={
        client ? 'Editar perfil de honorários' : 'Novo perfil de honorários'
      }
      actions={
        <Button onClick={onCancel} disabled={busy}>
          Cancelar
        </Button>
      }
    >
      <form className="space-y-5" onSubmit={(event) => void save(event)}>
        {error && <Notice tone="error">{error}</Notice>}
        {conflict && (
          <Notice tone="error">
            O registro mudou ou não pode ser editado no estado atual. Feche a
            edição e consulte novamente o perfil antes de tentar salvar.
          </Notice>
        )}
        <fieldset disabled={busy || conflict} className="space-y-5">
          {client ? (
            <div className="rounded-[var(--radius-control)] bg-[var(--color-panel-soft-bg)] p-4 text-sm">
              <strong>{client.company.name}</strong>
              <p className="mt-1 text-[var(--color-text-muted)]">
                CNPJ: {client.company.cnpj || 'Não informado'} · Empresa
                vinculada, sem alteração do cadastro central.
              </p>
            </div>
          ) : (
            <CompanyPicker
              value={company}
              onChange={setCompany}
              onDenied={onDenied}
            />
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Honorário atual (R$)"
              type="number"
              min="0"
              step="0.01"
              required
              value={currentFee}
              onChange={(event) => setCurrentFee(event.target.value)}
            />
            <TextField
              label="Data-base de reajuste"
              type="date"
              max="9998-12-31"
              value={adjustmentDate}
              onChange={(event) => setAdjustmentDate(event.target.value)}
            />
            <TextField
              label="Contato financeiro"
              maxLength={500}
              value={contact}
              onChange={(event) => setContact(event.target.value)}
            />
            <Textarea
              label="Observações internas"
              maxLength={5000}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>
          <ProfileFields
            params={configuration.params}
            profile={profile}
            onChange={setProfile}
          />
        </fieldset>
        <div className="flex justify-end">
          <Button
            tone="primary"
            type="submit"
            disabled={busy || conflict || !company}
          >
            {busy ? 'Salvando…' : 'Salvar perfil'}
          </Button>
        </div>
      </form>
    </Panel>
  )
}

function ClientDetails(
  props: Props & { id: string; onClose: () => void; onChanged: () => void },
) {
  const {
    id,
    scopeKey,
    onDenied,
    onClose,
    onChanged,
    configuration,
    canEdit,
    canManage,
  } = props
  const queryClient = useQueryClient()
  const detail = useQuery({
    queryKey: [...scopeKey, 'client', id],
    queryFn: ({ signal }) => honorariosService.client(id, signal),
    retry: false,
  })
  const [editing, setEditing] = useState(false)
  const [history, setHistory] = useState(false)
  const [action, setAction] = useState<'adjust' | 'archive' | 'restore' | null>(
    null,
  )
  const [mode, setMode] = useState<HonorariosAdjustmentMode>('indice')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const request = useRef<AbortController | null>(null)
  useEffect(() => () => request.current?.abort(), [])
  useEffect(() => {
    if (detail.error) onDenied?.(detail.error)
  }, [detail.error, onDenied])
  async function saved(client: HonorariosClient) {
    queryClient.setQueryData([...scopeKey, 'client', id], client)
    setEditing(false)
    setMessage('Perfil atualizado.')
    onChanged()
  }
  async function commit() {
    const client = detail.data
    if (
      !client ||
      !action ||
      busy ||
      (action === 'adjust'
        ? configuration.permissions.applyAdjustment !== true ||
          !!client.archivedAt ||
          !client.adjustment?.notice
        : !canManage)
    )
      return
    setBusy(true)
    setError('')
    setMessage('')
    const abort = new AbortController()
    request.current = abort
    try {
      const result =
        action === 'adjust'
          ? await honorariosService.adjustClient(
              id,
              {
                version: client.version,
                paramsVersion: client.paramsVersion,
                mode,
              },
              abort.signal,
            )
          : action === 'archive'
            ? await honorariosService.archiveClient(
                id,
                client.version,
                abort.signal,
              )
            : await honorariosService.restoreClient(
                id,
                client.version,
                abort.signal,
              )
      if (abort.signal.aborted) return
      queryClient.setQueryData([...scopeKey, 'client', id], result)
      setAction(null)
      setMessage(
        action === 'adjust'
          ? 'Reajuste confirmado.'
          : action === 'archive'
            ? 'Perfil arquivado.'
            : 'Perfil restaurado.',
      )
      onChanged()
    } catch (caught) {
      if (!abort.signal.aborted) {
        onDenied?.(caught)
        setError(getErrorPresentation(caught).message)
        if (isApiError(caught) && caught.status === 409) {
          setAction(null)
          const refreshed = await detail.refetch()
          setMessage(
            refreshed.error
              ? 'A prévia não pôde ser recarregada. Tente carregar o perfil novamente.'
              : 'A prévia foi recarregada. Confira os valores e inicie uma nova confirmação.',
          )
        }
      }
    } finally {
      if (!abort.signal.aborted) setBusy(false)
    }
  }
  if (detail.isPending)
    return (
      <Panel>
        <p role="status">Carregando perfil…</p>
      </Panel>
    )
  if (detail.error)
    return (
      <Panel
        title="Perfil indisponível"
        actions={<Button onClick={onClose}>Fechar</Button>}
      >
        <Notice tone="error">
          {getErrorPresentation(detail.error).message}
          <Button onClick={() => void detail.refetch()}>
            Tentar novamente
          </Button>
        </Notice>
      </Panel>
    )
  const client = detail.data
  if (!client) return null
  const adjustment = client.adjustment
  const canAdjust =
    configuration.permissions.applyAdjustment === true &&
    !client.archivedAt &&
    !!adjustment?.notice
  if (editing && canEdit)
    return (
      <ClientForm
        key={`${id}:${client.version}`}
        {...props}
        client={client}
        onCancel={() => {
          setEditing(false)
          void detail.refetch()
        }}
        onSaved={(result) => void saved(result)}
      />
    )
  return (
    <Panel
      title={client.company.name}
      actions={
        <Button onClick={onClose} disabled={busy}>
          Fechar perfil
        </Button>
      }
    >
      <div className="space-y-5">
        {error && <Notice tone="error">{error}</Notice>}
        {message && <Notice tone="info">{message}</Notice>}
        {client.archivedAt && (
          <Notice>
            Perfil arquivado em {date(client.archivedAt)}. Restaure o perfil
            para editar ou aplicar reajustes.
          </Notice>
        )}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['CNPJ', client.company.cnpj || 'Não informado'],
            ['Honorário atual', money(client.currentFee)],
            ['Valor da tabela', money(client.calculation.total)],
            ['Situação', alignmentNames[client.alignment]],
            ['Data-base', date(client.adjustmentDate)],
            ['Contato', client.contact || 'Não informado'],
            ['Regime', regimeNames[client.profile.regime]],
            [
              'Versões',
              `Perfil ${client.version} · Tabela ${client.paramsVersion}`,
            ],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-xs text-[var(--color-text-muted)]">{label}</p>
              <p className="mt-1 break-words text-sm font-semibold">{value}</p>
            </div>
          ))}
        </div>
        {client.notes && (
          <div>
            <p className="text-xs text-[var(--color-text-muted)]">
              Observações internas
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm">{client.notes}</p>
          </div>
        )}
        <details className="rounded-[var(--radius-control)] border border-[var(--color-panel-border)] p-4">
          <summary className="cursor-pointer text-sm font-semibold">
            Perfil e composição do cálculo
          </summary>
          <div className="mt-4 space-y-4">
            <ProfileFields
              profile={client.profile}
              params={configuration.params}
              onChange={() => undefined}
              disabled
            />
            <dl className="space-y-2">
              {client.calculation.linhas.map((line, index) => (
                <div key={index} className="flex justify-between gap-4 text-sm">
                  <dt>{line.label}</dt>
                  <dd>{money(line.value)}</dd>
                </div>
              ))}
            </dl>
          </div>
        </details>
        {adjustment ? (
          <div className="space-y-3 rounded-[var(--radius-control)] border border-[var(--color-panel-border)] bg-[var(--color-panel-soft-bg)] p-4">
            <h3 className="text-sm font-bold">Prévia do reajuste anual</h3>
            <p className="text-sm">
              Vencimento: {date(adjustment.dueDate)} ·{' '}
              {(adjustment.days ?? 0) < 0
                ? `${Math.abs(adjustment.days ?? 0)} dia(s) de atraso`
                : `Em ${adjustment.days} dia(s)`}{' '}
              · {adjustment.index.nome}: {adjustment.index.pct}%
            </p>
            <div className="grid gap-3 text-sm sm:grid-cols-3">
              <p>
                Pelo índice: <strong>{money(adjustment.full)}</strong>
              </p>
              <p>
                Tabela: <strong>{money(adjustment.table)}</strong>
              </p>
              <p>
                Após limites: <strong>{money(adjustment.value)}</strong>
              </p>
            </div>
            {adjustment.blocked && (
              <Notice>
                O contrato já está na tabela ou acima dela. O teto mantém o
                valor atual e não reduz o honorário.
              </Notice>
            )}
            {adjustment.limited && (
              <Notice>
                O reajuste pelo índice foi limitado ao valor da tabela.
              </Notice>
            )}
            <p className="text-xs text-[var(--color-text-muted)]">
              {configuration.params.indices.periodicidade === 'janeiro'
                ? `Reajuste em janeiro. Carência configurada a partir do mês ${configuration.params.indices.carencia} (0 = desligada).`
                : 'Reajuste no aniversário da data-base.'}{' '}
              O índice é informado manualmente. A confirmação fica disponível a
              partir de 30 dias antes do vencimento.
            </p>
          </div>
        ) : (
          <Notice>
            Informe a data-base no perfil para acompanhar o reajuste anual.
          </Notice>
        )}
        <div className="flex flex-wrap gap-2">
          {canEdit && !client.archivedAt && (
            <Button
              onClick={() => {
                setEditing(true)
                setMessage('')
                setError('')
              }}
              disabled={busy}
            >
              Editar perfil
            </Button>
          )}
          {canAdjust && (
            <Button
              tone="primary"
              onClick={() => {
                setAction('adjust')
                setMode('indice')
              }}
              disabled={busy}
            >
              Aplicar reajuste
            </Button>
          )}
          {canManage && (
            <Button
              onClick={() =>
                setAction(client.archivedAt ? 'restore' : 'archive')
              }
              disabled={busy}
            >
              {client.archivedAt ? 'Restaurar perfil' : 'Arquivar perfil'}
            </Button>
          )}
          <Button onClick={() => setHistory(!history)}>
            {history ? 'Fechar histórico' : 'Ver histórico'}
          </Button>
        </div>
        {action && (action === 'adjust' ? canAdjust : canManage) && (
          <div
            role="region"
            aria-label="Confirmação da alteração"
            className="space-y-4 rounded-[var(--radius-control)] border border-[var(--color-brand)] p-4"
          >
            <h3 className="font-bold">
              {action === 'adjust'
                ? 'Confirmar reajuste'
                : action === 'archive'
                  ? 'Arquivar perfil de honorários?'
                  : 'Restaurar perfil de honorários?'}
            </h3>
            {action === 'adjust' ? (
              <>
                <Select
                  label="Forma de reajuste"
                  value={mode}
                  onChange={(event) =>
                    setMode(event.target.value as HonorariosAdjustmentMode)
                  }
                  disabled={busy}
                >
                  <option value="indice">
                    Pelo índice, respeitando o teto · {money(adjustment?.value)}
                  </option>
                  <option
                    value="parametro"
                    disabled={
                      Number(adjustment?.table ?? 0) <=
                      Number(client.currentFee)
                    }
                  >
                    Atualizar para a tabela · {money(adjustment?.table)}
                  </option>
                  <option value="manter">
                    Manter valor atual · {money(client.currentFee)}
                  </option>
                </Select>
                <p className="text-sm text-[var(--color-text-muted)]">
                  A confirmação registra o valor e uma nova data-base no
                  histórico. O servidor confere a tabela e as versões antes de
                  aplicar.
                </p>
              </>
            ) : (
              <p className="text-sm text-[var(--color-text-muted)]">
                A alteração afeta somente o perfil de Honorários desta empresa.
                O histórico permanece disponível.
              </p>
            )}
            <div className="flex gap-2">
              <Button disabled={busy} onClick={() => setAction(null)}>
                Cancelar
              </Button>
              <Button
                tone="primary"
                disabled={busy}
                onClick={() => void commit()}
              >
                {busy ? 'Confirmando…' : 'Confirmar'}
              </Button>
            </div>
          </div>
        )}
        {history && (
          <History
            key={client.version}
            scopeKey={[...scopeKey, 'client', id]}
            onDenied={onDenied}
            load={(page, signal) =>
              honorariosService.clientHistory(
                id,
                { page, pageSize: 20 },
                signal,
              )
            }
          />
        )}
      </div>
    </Panel>
  )
}

function ClientImport({
  configuration,
  scopeKey,
  onDenied,
  onImported,
}: Props & { onImported: () => void }) {
  const queryClient = useQueryClient()
  const [rows, setRows] = useState<HonorariosImportRow[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [results, setResults] = useState<string[]>([])
  const [previewPage, setPreviewPage] = useState(1)
  const [resolved, setResolved] = useState<
    Record<number, HonorariosCompanyOption>
  >({})
  const [completed, setCompleted] = useState<number[]>([])
  const [uncertain, setUncertain] = useState(false)
  const controller = useRef<AbortController | null>(null)
  useEffect(() => () => controller.current?.abort(), [])
  async function read(file?: File) {
    if (!file) return
    controller.current?.abort()
    const abort = new AbortController()
    controller.current = abort
    setBusy(true)
    setError('')
    setResults([])
    setCompleted([])
    setRows([])
    setResolved({})
    setPreviewPage(1)
    try {
      const parsed = await parseHonorariosFile(file, configuration.params)
      if (abort.signal.aborted) return
      const companies: HonorariosCompanyOption[] = []
      let page = 1
      for (;;) {
        const options = await honorariosService.companyOptions(
          '',
          abort.signal,
          { page, pageSize: 100 },
        )
        companies.push(...options.results)
        if (!options.next) break
        page++
      }
      if (abort.signal.aborted) return
      const matches: Record<number, HonorariosCompanyOption> = {}
      parsed.forEach((row, index) => {
        const match = resolveHonorariosImportCompany(row, companies)
        if (match) matches[index] = match
      })
      setRows(parsed)
      setResolved(matches)
      if (!parsed.length) setError('O arquivo não contém linhas de clientes.')
    } catch (caught) {
      if (!abort.signal.aborted) {
        onDenied?.(caught)
        setError(getErrorPresentation(caught).message)
      }
    } finally {
      if (!abort.signal.aborted) setBusy(false)
    }
  }
  const unresolved = rows.filter(
    (row, index) =>
      !completed.includes(index) &&
      (!row.input || row.errors.length > 0 || !resolved[index]),
  ).length
  const pending = rows
    .map((row, index) => ({ row, index }))
    .filter(({ index }) => !completed.includes(index))
  const duplicateIds = pending
    .map(({ index }) => resolved[index]?.id)
    .filter(Boolean)
  const duplicate = duplicateIds.length !== new Set(duplicateIds).size
  async function submit() {
    if (unresolved || duplicate || !pending.length || uncertain) return
    setBusy(true)
    setError('')
    const abort = new AbortController()
    controller.current = abort
    try {
      for (let offset = 0; offset < pending.length; offset += 1000) {
        const batch = pending.slice(offset, offset + 1000)
        const inputs = batch.map(({ row, index }) => ({
          ...row.input!,
          companyId: resolved[index].id,
        }))
        await honorariosService.importClients(inputs, abort.signal)
        if (abort.signal.aborted) return
        setCompleted((current) => [
          ...current,
          ...batch.map(({ index }) => index),
        ])
        setResults((current) => [
          ...current,
          `Lote ${Math.floor((completed.length + offset) / 1000) + 1}: ${batch.length} perfil(is) importado(s).`,
        ])
      }
      if (!abort.signal.aborted) {
        await queryClient.invalidateQueries({ queryKey: scopeKey })
        onImported()
      }
    } catch (caught) {
      if (!abort.signal.aborted) {
        onDenied?.(caught)
        const rejected =
          isApiError(caught) &&
          [400, 401, 403, 404, 409, 422].includes(caught.status)
        setUncertain(!rejected)
        setError(
          rejected
            ? `O lote em processamento não foi importado. ${getErrorPresentation(caught).message}`
            : `Não foi possível confirmar o resultado deste lote; confira a carteira antes de reenviar. ${getErrorPresentation(caught).message}`,
        )
        setResults((current) => [
          ...current,
          'A importação foi interrompida; os lotes já confirmados estão indicados acima.',
        ])
      }
    } finally {
      if (!abort.signal.aborted) setBusy(false)
    }
  }
  function template() {
    downloadText(
      '\uFEFFcompanyId;nome;cnpj;codigo;currentFee;adjustmentDate;contact;notes;profile\r\n;;;;300.00;2026-01-15;Contato financeiro;;"' +
        JSON.stringify(defaultProfile(configuration.params)).replaceAll(
          '"',
          '""',
        ) +
        '"\r\n',
      'modelo-honorarios.csv',
      'text/csv;charset=utf-8',
    )
  }
  return (
    <Panel
      title="Importar carteira"
      actions={
        <Button onClick={template} disabled={busy}>
          Baixar modelo CSV
        </Button>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-[var(--color-text-muted)]">
          Selecione um arquivo CSV ou Excel (.xlsx). Cada linha deve ser
          vinculada a uma empresa existente por ID, CNPJ ou código conferido.
          Nomes não são usados para associação automática. O arquivo exportado
          preserva o perfil completo.
        </p>
        <TextField
          label="Planilha da carteira"
          type="file"
          accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          disabled={busy || uncertain}
          onChange={(event) => void read(event.target.files?.[0])}
        />
        {busy && (
          <p role="status" className="text-sm">
            Processando arquivo ou lote…
          </p>
        )}
        {error && <Notice tone="error">{error}</Notice>}
        {uncertain && (
          <Notice>
            O reenvio desta prévia está bloqueado até a conferência. Atualize a
            carteira abaixo e identifique os registros que ainda precisam ser
            importados.
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                onClick={() =>
                  void queryClient.invalidateQueries({
                    queryKey: [...scopeKey, 'clients'],
                  })
                }
              >
                Atualizar carteira para conferência
              </Button>
              <Button
                onClick={() => {
                  setRows([])
                  setCompleted([])
                  setResolved({})
                  setResults([])
                  setError('')
                  setUncertain(false)
                }}
              >
                Já conferi a carteira; limpar prévia
              </Button>
            </div>
          </Notice>
        )}
        {results.map((result, index) => (
          <Notice key={index}>{result}</Notice>
        ))}
        {rows.length > 0 && (
          <>
            <Notice>
              {rows.length} linha(s) na prévia · {unresolved} pendência(s) ·{' '}
              {completed.length} já importada(s). Cada lote de até 1.000 linhas
              é confirmado por inteiro.
            </Notice>
            {duplicate && (
              <Notice tone="error">
                Há empresas repetidas na prévia. Corrija os vínculos ou o
                arquivo antes de importar.
              </Notice>
            )}
            <div className="space-y-3">
              {rows
                .slice((previewPage - 1) * 10, previewPage * 10)
                .map((row, offset) => {
                  const index = (previewPage - 1) * 10 + offset
                  const company = resolved[index]
                  const done = completed.includes(index)
                  return (
                    <div
                      key={index}
                      className="space-y-3 rounded-[var(--radius-control)] border border-[var(--color-panel-border)] p-4"
                    >
                      <div className="flex flex-wrap justify-between gap-2 text-sm">
                        <strong>
                          Linha {row.line}:{' '}
                          {row.companyName ||
                            row.cnpj ||
                            row.companyId ||
                            'Empresa sem identificação'}
                        </strong>
                        <span>
                          {row.input
                            ? money(row.input.currentFee)
                            : 'Valor inválido'}
                          {done ? ' · Importada' : ''}
                        </span>
                      </div>
                      {row.errors.length > 0 && (
                        <Notice tone="error">{row.errors.join(' ')}</Notice>
                      )}
                      {company ? (
                        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                          <span>
                            Vínculo: <strong>{company.name}</strong> · CNPJ{' '}
                            {company.cnpj || 'não informado'} · Código{' '}
                            {company.code || 'não informado'}
                          </span>
                          {!done && (
                            <Button
                              size="sm"
                              disabled={busy}
                              onClick={() =>
                                setResolved((current) => {
                                  const next = { ...current }
                                  delete next[index]
                                  return next
                                })
                              }
                            >
                              Alterar empresa
                            </Button>
                          )}
                        </div>
                      ) : (
                        <CompanyPicker
                          value={null}
                          onChange={(value) => {
                            if (value)
                              setResolved((current) => ({
                                ...current,
                                [index]: value,
                              }))
                          }}
                          disabled={busy || done || uncertain}
                          onDenied={onDenied}
                        />
                      )}
                    </div>
                  )
                })}
            </div>
            <Pagination
              page={previewPage}
              count={rows.length}
              pageSize={10}
              onChange={setPreviewPage}
            />
            <div className="flex justify-end">
              <Button
                tone="primary"
                disabled={
                  busy ||
                  uncertain ||
                  !!unresolved ||
                  duplicate ||
                  !pending.length
                }
                onClick={() => void submit()}
              >
                {busy
                  ? 'Importando…'
                  : `Confirmar importação de ${pending.length} perfil(is)`}
              </Button>
            </div>
          </>
        )}
      </div>
    </Panel>
  )
}
