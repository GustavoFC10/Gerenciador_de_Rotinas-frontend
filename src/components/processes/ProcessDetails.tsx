import { useId, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useNotifications } from '../../hooks/useNotifications'
import { isApiError, type ApiResponse } from '../../services/httpClient'
import { processService } from '../../services/processService'
import type {
  ProcessCatalog,
  ProcessCatalogType,
  ProcessCreateInput,
  ProcessEntry,
  ProcessField,
  ProcessResource,
  ProcessTask,
} from '../../types/processes'
import {
  formatProcessDate,
  processStatus,
} from '../../utils/processPresentation'
import ProcessFields from './ProcessFields'
import ProcessIcon from './ProcessIcon'
import {
  DIRECT_LOSS_TYPES,
  PROCESS_ALTERATIONS,
  PROCESS_PAYERS,
  PROCESS_REASONS,
  PROCESS_REGIMES,
  PROCESS_START_LABELS,
  normalizeProcessMoney,
  processHasCost,
  processHasField,
  processHasMeeting,
  processInactivityLoss,
  processInputFromResource,
  processInstallmentValue,
  processMonthlyTotal,
  processMoney,
} from './processFormUtils'

export interface ProcessDetailsProps {
  process: ProcessResource
  catalog: ProcessCatalog
  onChange: (process: ProcessResource) => void
  onClose: () => void
  onEdit: () => void
  onDelete: () => Promise<void>
  timeZone?: string
}

const definitionKeys: Record<ProcessField, (keyof ProcessCreateInput)[]> = {
  custo: ['custo', 'pagador', 'parcelas'],
  honorario: [
    'honorario',
    'honCobranca',
    'trab',
    'trabQtd',
    'trabValor',
    'honAnterior',
  ],
  regime: ['regime', 'regimeObs'],
  altdef: ['custo', 'pagador', 'parcelas'],
}

function DefinitionEditor({
  process,
  type,
  task,
  disabled,
  onSave,
  onEdit,
}: {
  process: ProcessResource
  type: ProcessCatalogType
  task: ProcessTask
  disabled: boolean
  onSave: (patch: Partial<ProcessCreateInput>) => Promise<boolean>
  onEdit: () => void
}) {
  const [value, setValue] = useState(() => processInputFromResource(process))
  const [error, setError] = useState('')
  async function save(event: FormEvent) {
    event.preventDefault()
    setError('')
    try {
      const patch: Partial<ProcessCreateInput> = {}
      for (const key of definitionKeys[task.campo!]) {
        if (key === 'honAnterior' && process.tipo !== 'inativa') continue
        let field = value[key]
        if (['custo', 'honorario', 'trabValor', 'honAnterior'].includes(key))
          field = normalizeProcessMoney(field as string | null | undefined)
        if (!value.trab && ['trabQtd', 'trabValor'].includes(key)) field = null
        if (
          JSON.stringify(field ?? null) !==
          JSON.stringify(process[key as keyof ProcessResource] ?? null)
        )
          Object.assign(patch, { [key]: field })
      }
      if (Object.keys(patch).length) await onSave(patch)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Revise as definições.')
    }
  }
  return (
    <form className="process-definition" onSubmit={(event) => void save(event)}>
      <ProcessFields
        value={value}
        type={type}
        only={task.campo}
        onChange={(patch) =>
          setValue((previous) => ({ ...previous, ...patch }))
        }
        disabled={disabled}
      />
      {task.campo === 'altdef' && (
        <p className="need">
          Itens e descrição da alteração:{' '}
          <button
            className="btn sm"
            type="button"
            disabled={disabled}
            onClick={onEdit}
          >
            Editar dados do processo
          </button>
        </p>
      )}
      {error && (
        <div className="err-msg" role="alert">
          {error}
        </div>
      )}
      <button className="btn sm primary" type="submit" disabled={disabled}>
        Salvar definição
      </button>
    </form>
  )
}

const fieldLabels: Record<string, string> = {
  custo: 'Custo do processo',
  pagador: 'Quem paga',
  parcelas: 'Parcelas',
  honorario: 'Honorário contábil',
  honCobranca: 'Cobrança do honorário',
  trab: 'Honorário trabalhista',
  trabQtd: 'Funcionários',
  trabValor: 'Valor por funcionário',
  honAnterior: 'Honorário anterior',
  honPerdido: 'Honorário perdido',
  empresa: 'Empresa',
  cnpj: 'CNPJ',
  prazo: 'Prazo',
  inicioInat: 'Início',
  obs: 'Observações',
  altItens: 'Itens da alteração',
  altDesc: 'Dados da alteração',
  regime: 'Regime',
  regimeObs: 'Observações tributárias',
  motivo: 'Motivo',
  motivoObs: 'Detalhes do motivo',
  contato: 'Contato',
  contadorNome: 'Novo contador',
  contadorContato: 'Contato do contador',
  previous: 'Antes',
  current: 'Agora',
  old: 'Antes',
  new: 'Depois',
  before: 'Antes',
  after: 'Depois',
  from: 'Antes',
  to: 'Depois',
  fields: 'Campos',
  changes: 'Alterações',
  definitions: 'Definições',
  taskId: 'Tarefa',
  task: 'Tarefa',
  state: 'Estado',
  resetTasks: 'Tarefas reabertas por dependência',
  changedFields: 'Campos alterados',
  reatJunta: 'Reativar na Junta Comercial',
  reunAlinh: 'Reunião de alinhamento',
  reunAcomp: 'Reunião de acompanhamento',
  novoContador: 'Dados do novo contador conhecidos',
}

function HistoryValue({
  value,
  name = '',
  taskNames = {},
}: {
  value: unknown
  name?: string
  taskNames?: Record<string, string>
}): ReactNode {
  if (value == null) return 'Não definido'
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não'
  if (
    Array.isArray(value) &&
    value.some((item) => typeof item === 'object' && item !== null)
  )
    return (
      <ul>
        {value.map((item, index) => (
          <li key={index}>
            <HistoryValue value={item} name={name} taskNames={taskNames} />
          </li>
        ))}
      </ul>
    )
  if (Array.isArray(value))
    return value
      .map((item) =>
        typeof item === 'string'
          ? (PROCESS_ALTERATIONS[item as keyof typeof PROCESS_ALTERATIONS] ??
            fieldLabels[item] ??
            taskNames[item] ??
            item)
          : String(item),
      )
      .join(', ')
  if (typeof value === 'object')
    return (
      <dl>
        {Object.entries(value).map(([key, entry]) => (
          <div key={key}>
            <dt>{fieldLabels[key] ?? key}</dt>
            <dd>
              <HistoryValue
                value={entry}
                taskNames={taskNames}
                name={
                  [
                    'before',
                    'after',
                    'old',
                    'new',
                    'from',
                    'to',
                    'previous',
                    'current',
                  ].includes(key)
                    ? name
                    : key
                }
              />
            </dd>
          </div>
        ))}
      </dl>
    )
  if (
    ['custo', 'honorario', 'trabValor', 'honAnterior', 'honPerdido'].includes(
      name,
    )
  )
    return processMoney(String(value))
  if (name === 'regime')
    return (
      PROCESS_REGIMES[value as keyof typeof PROCESS_REGIMES] ?? String(value)
    )
  if (name === 'pagador')
    return PROCESS_PAYERS[value as keyof typeof PROCESS_PAYERS] ?? String(value)
  if (name === 'motivo')
    return (
      PROCESS_REASONS[value as keyof typeof PROCESS_REASONS] ?? String(value)
    )
  if (name === 'taskId' || name === 'task')
    return taskNames[String(value)] ?? String(value)
  if (name === 'state' || name === 's')
    return (
      (
        {
          feito: 'Concluída',
          na: 'Não se aplica',
          pending: 'Pendente',
        } as Record<string, string>
      )[String(value)] ?? String(value)
    )
  return String(value)
}

function ProcessValues({
  process,
  type,
  date,
}: {
  process: ProcessResource
  type?: ProcessCatalogType
  date: (value: string | null | undefined) => string
}) {
  const financial = process.permissions.viewFinancial
  const total = processMonthlyTotal(process)
  const inactivityLoss = processInactivityLoss(process)
  const valueBox = (
    label: string,
    value: ReactNode,
    children?: ReactNode,
    undefinedValue = false,
  ) => (
    <div className={`vbox ${undefinedValue ? 'empty-v' : ''}`}>
      <span>{label}</span>
      <b>{value}</b>
      {children}
    </div>
  )
  const financialApplicable =
    processHasCost(type) ||
    processHasField(type, 'honorario') ||
    DIRECT_LOSS_TYPES.includes(process.tipo)
  return (
    <div className="vals">
      {process.tipo === 'saida' &&
        valueBox(
          'Nova contabilidade',
          process.novoContador
            ? process.contadorNome || 'Dados conhecidos'
            : 'A solicitar ao cliente',
          <small>
            {process.novoContador && financial
              ? process.contadorContato || 'Contato não informado'
              : process.novoContador
                ? 'Contato reservado à Diretoria e ao Financeiro'
                : 'A Regularidade pede os dados do novo contador'}
          </small>,
        )}
      {process.tipo === 'reativacao' &&
        valueBox(
          'Junta Comercial',
          process.reatJunta !== false
            ? 'Reativar na Junta'
            : 'Sem reativação na Junta',
          <small>
            {process.reatJunta !== false
              ? 'Etapa com a Leggacy aberta'
              : 'Etapa da Leggacy não se aplica'}
          </small>,
        )}
      {processHasMeeting(type) &&
        valueBox(
          'Reuniões com o cliente',
          '',
          <>
            {processHasMeeting(type, 'alinhamento') && (
              <small>
                Alinhamento:{' '}
                <strong>{process.reunAlinh !== false ? 'Sim' : 'Não'}</strong>
              </small>
            )}
            {processHasMeeting(type, 'acompanhamento') && (
              <small>
                Acompanhamento no 4º mês:{' '}
                <strong>{process.reunAcomp !== false ? 'Sim' : 'Não'}</strong>
              </small>
            )}
          </>,
        )}
      {!financial &&
        financialApplicable &&
        valueBox(
          'Valores financeiros',
          <>
            <ProcessIcon name="lock" size={14} /> Restritos
          </>,
          <small>Visíveis para a Diretoria e o Financeiro</small>,
          true,
        )}
      {financial &&
        DIRECT_LOSS_TYPES.includes(process.tipo) &&
        valueBox(
          'Honorário perdido',
          process.honPerdido == null
            ? 'A definir'
            : `− ${processMoney(process.honPerdido)} /mês`,
          <small>Honorário mensal que deixa de ser cobrado</small>,
          process.honPerdido == null,
        )}
      {financial &&
        process.tipo === 'inativa' &&
        valueBox(
          'Perda de honorário',
          inactivityLoss != null
            ? `− ${processMoney(inactivityLoss)} /mês`
            : 'A definir',
          <small>
            Antes: {processMoney(process.honAnterior)} → durante a inatividade:{' '}
            {process.honorario == null ? 'A definir' : processMoney(total)}
          </small>,
          process.honAnterior == null || process.honorario == null,
        )}
      {processHasField(type, 'regime') &&
        valueBox(
          'Regime tributário',
          process.regime ? PROCESS_REGIMES[process.regime] : 'A definir',
          financial && process.regimeObs ? (
            <div className="obs-t">{process.regimeObs}</div>
          ) : (
            <small>
              {process.regime ? 'Sem observações' : 'Definido pela Diretoria'}
            </small>
          ),
          !process.regime,
        )}
      {financial &&
        processHasCost(type) &&
        valueBox(
          'Custo do processo',
          processMoney(process.custo),
          <>
            <small>
              {process.pagador ? (
                <>
                  Pago por{' '}
                  <span className={`payer ${process.pagador}`}>
                    {PROCESS_PAYERS[process.pagador]}
                  </span>
                </>
              ) : (
                'Quem paga: a definir'
              )}
            </small>
            <small>
              {process.parcelas
                ? process.parcelas === 1
                  ? 'À vista'
                  : `${process.parcelas} parcelas${process.custo != null ? ` de ${processMoney(processInstallmentValue(process.custo, process.parcelas))}` : ''}`
                : 'Pagamento a definir'}
            </small>
          </>,
          process.custo == null,
        )}
      {financial &&
        processHasField(type, 'honorario') &&
        valueBox(
          'Novo honorário mensal',
          process.honorario != null
            ? `${processMoney(total)} /mês`
            : 'A definir',
          <>
            {process.trab && process.honorario != null && (
              <>
                <small>Contábil: {processMoney(process.honorario)}</small>
                <small>
                  Trabalhista: {process.trabQtd ?? 0} funcionários ×{' '}
                  {processMoney(process.trabValor)}
                </small>
              </>
            )}
            <small>
              {process.tipo === 'inativa'
                ? 'Data da nova cobrança'
                : 'Cobrança do 1º honorário'}
              : {date(process.honCobranca)}
            </small>
          </>,
          process.honorario == null,
        )}
    </div>
  )
}

export default function ProcessDetails({
  process,
  catalog,
  onChange,
  onClose,
  onEdit,
  onDelete,
  timeZone = 'America/Sao_Paulo',
}: ProcessDetailsProps) {
  const id = useId()
  const { notify } = useNotifications()
  const [expanded, setExpanded] = useState<Set<number>>(
    () => new Set([process.analysis.currentStage ?? 0]),
  )
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)
  const [error, setError] = useState('')
  const [comment, setComment] = useState('')
  const [confirmation, setConfirmation] = useState<
    'delete' | 'cancel' | string | null
  >(null)
  const [feedLimit, setFeedLimit] = useState(40)
  const [openedAt] = useState(() => Date.now())
  const type = catalog.types.find((type) => type.id === process.tipo)
  const taskNames = Object.fromEntries(
    [...(type?.etapas ?? []), ...process.etapas].flatMap((stage) =>
      stage.tasks.map((task) => [task.id, task.txt]),
    ),
  )
  const a = process.analysis
  const status = processStatus(process)
  const date = (value: string | null | undefined) =>
    value ? formatProcessDate(value, timeZone) : 'A definir'
  const timestamp = (value: string | null | undefined) =>
    value
      ? new Date(value).toLocaleString('pt-BR', {
          timeZone,
          dateStyle: 'short',
          timeStyle: 'short',
        })
      : 'Data não informada'
  const age = Math.max(
    0,
    Math.floor(
      (new Date(process.concluidoEm ?? openedAt).getTime() -
        new Date(process.criadoEm).getTime()) /
        86400000,
    ),
  )
  const percentage = a.totalTasks
    ? Math.round((a.completedTasks / a.totalTasks) * 100)
    : 0
  async function mutate(
    action: () => Promise<ApiResponse<ProcessResource>>,
    message?: string,
  ) {
    if (busyRef.current) return false
    busyRef.current = true
    setBusy(true)
    setError('')
    try {
      const response = await action()
      onChange(response.data)
      if (response.data.analysis.currentStage !== a.currentStage)
        setExpanded(
          new Set([
            response.data.analysis.currentStage ??
              Math.max(0, response.data.etapas.length - 1),
          ]),
        )
      if (message) notify({ title: message, tone: 'success' })
      return true
    } catch (error) {
      if (isApiError(error) && error.status === 409) {
        let refreshed = false
        try {
          onChange((await processService.get(process.id)).data)
          refreshed = true
        } catch {
          /* Preserve the conflict notice when refreshing also fails. */
        }
        setError(
          `${error.message} ${refreshed ? 'Os dados foram atualizados. Confira o estado atual antes de tentar novamente.' : 'Não foi possível recarregar os dados. Atualize o processo antes de tentar novamente.'}`,
        )
      } else
        setError(
          error instanceof Error
            ? error.message
            : 'Não foi possível salvar. Tente novamente.',
        )
      return false
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }
  async function remove() {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)
    setError('')
    try {
      await onDelete()
    } catch (error) {
      if (isApiError(error) && error.status === 409) {
        try {
          onChange((await processService.get(process.id)).data)
        } catch {
          /* The original server message remains actionable. */
        }
      }
      setError(
        error instanceof Error
          ? error.message
          : 'Não foi possível excluir o processo.',
      )
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }
  async function submitNote(event: FormEvent) {
    event.preventDefault()
    const text = comment.trim()
    if (!text) return
    if (
      await mutate(
        () => processService.addNote(process.id, process.version, text),
        'Comentário enviado',
      )
    )
      setComment('')
  }
  const feed = [
    ...process.notas.map((entry) => ({ ...entry, isNote: true })),
    ...process.historico.map((entry) => ({ ...entry, isNote: false })),
  ]
    .filter((entry) => !entry.financial || process.permissions.viewFinancial)
    .sort((left, right) => right.em.localeCompare(left.em))
  function taskView(task: ProcessTask, locked: boolean) {
    const state = process.tarefas[task.id]
    const done = !!state?.s
    const canExecute = process.permissions.executeSectors.includes(task.d)
    const automatic = task.auto || state?.auto
    const canTransition =
      !automatic && canExecute && !locked && process.status !== 'cancelado'
    const fieldHidden =
      task.campo &&
      task.campo !== 'regime' &&
      !process.permissions.viewFinancial
    return (
      <div
        key={task.id}
        className={`task ${state?.s === 'feito' ? 'done' : state?.s === 'na' ? 'skipped' : ''} ${locked && !done ? 'locked' : ''} ${!done && !locked && canExecute ? 'my-turn' : ''} ${task.campo ? 'has-campo' : ''}`}
      >
        {done && (
          <span className={`tk ${state.s === 'na' ? 'na' : 'ok'}`}>
            <ProcessIcon name={state.s === 'na' ? 'x' : 'tick'} size={14} />
          </span>
        )}
        <div className="tx">
          {!done && !locked && canExecute && (
            <span className="turn-mini">Aguardando ação</span>
          )}
          <b>{task.txt}</b>
          <small>
            <span className={`dot ${task.d}`} />
            {catalog.sectors[task.d]}
            {automatic
              ? ` · registrada na abertura por ${process.autorAbertura} · ${timestamp(process.criadoEm)}`
              : done
                ? ` · ${state.s === 'na' ? 'marcada' : 'concluída'} por ${state.autor || 'membro da equipe'} · ${timestamp(state.em)}`
                : ''}
          </small>
          {task.campo &&
            !done &&
            (fieldHidden ? (
              <div className="vv muted">
                <ProcessIcon name="lock" size={13} /> Valores visíveis para a
                Diretoria e o Financeiro
              </div>
            ) : type && process.permissions.edit && !locked ? (
              <DefinitionEditor
                key={`${task.id}-${process.version}`}
                process={process}
                type={type}
                task={task}
                disabled={busy}
                onSave={(patch) =>
                  mutate(
                    () =>
                      processService.update(process.id, {
                        ...patch,
                        version: process.version,
                      }),
                    'Definição salva',
                  )
                }
                onEdit={onEdit}
              />
            ) : (
              <p className="need">
                {locked
                  ? 'Aguardando a etapa anterior'
                  : 'A Diretoria deve preencher as definições para concluir.'}
              </p>
            ))}
          {confirmation === `task:${task.id}` && (
            <div className="confirm">
              <span>
                Reabrir esta tarefa também remove confirmações das etapas
                seguintes.
              </span>
              <button
                className="btn sm"
                disabled={busy}
                onClick={() => setConfirmation(null)}
              >
                Manter
              </button>
              <button
                className="btn sm primary"
                disabled={busy}
                onClick={() => {
                  setConfirmation(null)
                  void mutate(
                    () =>
                      processService.transitionTask(
                        process.id,
                        task.id,
                        process.version,
                        'pending',
                      ),
                    'Tarefa reaberta',
                  )
                }}
              >
                Reabrir tarefa
              </button>
            </div>
          )}
        </div>
        <div className="tbtns">
          {task.opt && !done && !locked && canExecute && (
            <button
              className="sbtn nabtn"
              disabled={busy}
              onClick={() =>
                void mutate(
                  () =>
                    processService.transitionTask(
                      process.id,
                      task.id,
                      process.version,
                      'na',
                    ),
                  'Marcada como não se aplica',
                )
              }
            >
              <ProcessIcon name="x" size={14} />
              Não se aplica
            </button>
          )}
          <button
            className={`sbtn ${state?.s === 'feito' ? 'ok' : state?.s === 'na' ? 'na' : ''}`}
            disabled={busy || !canTransition || (!done && !!task.campo)}
            aria-pressed={done}
            title={
              automatic
                ? 'Registrada automaticamente na abertura'
                : !canExecute
                  ? `Somente ${catalog.sectors[task.d]} ou Diretoria`
                  : done
                    ? 'Clique para reabrir'
                    : task.campo
                      ? 'Preencha e salve a definição para concluir'
                      : 'Clique para concluir'
            }
            onClick={() =>
              done
                ? setConfirmation(`task:${task.id}`)
                : void mutate(
                    () =>
                      processService.transitionTask(
                        process.id,
                        task.id,
                        process.version,
                        'feito',
                      ),
                    'Tarefa concluída',
                  )
            }
          >
            {state?.s === 'feito' ? (
              <>
                <ProcessIcon name="tick" size={15} />
                Concluída
              </>
            ) : state?.s === 'na' ? (
              'Não se aplica'
            ) : locked ? (
              <>
                <ProcessIcon name="lock" size={13} />
                Aguardando
              </>
            ) : (
              <>
                <span className="dot" />
                Concluir
              </>
            )}
          </button>
        </div>
      </div>
    )
  }
  const readonlyField = (label: string, value: ReactNode, full = false) => (
    <div className={`field ${full ? 'full' : ''}`}>
      <label>{label}</label>
      <div
        className={`vv ${value ? '' : 'muted'}`}
        style={{ whiteSpace: 'pre-wrap' }}
      >
        {value || 'Não informado'}
      </div>
    </div>
  )
  return (
    <div id="procPage" aria-busy={busy}>
      <button className="back" type="button" onClick={onClose}>
        <span style={{ transform: 'rotate(180deg)', display: 'inline-flex' }}>
          <ProcessIcon name="arrow" size={16} />
        </span>
        Voltar para processos
      </button>
      {error && (
        <div className="err-msg" role="alert">
          {error}
        </div>
      )}
      <section
        className={`panel phead ${process.status === 'concluido' ? 'is-done' : process.status === 'cancelado' ? 'is-closed' : ''}`}
      >
        {process.status !== 'andamento' && (
          <div
            className={`pbanner ${process.status === 'concluido' ? 'ok' : 'can'}`}
          >
            <ProcessIcon
              name={process.status === 'concluido' ? 'check' : 'x'}
              size={20}
            />
            <div>
              <b>
                {process.status === 'concluido'
                  ? 'Processo concluído'
                  : 'Processo cancelado'}
              </b>
              <span>
                {process.status === 'concluido'
                  ? `Finalizado em ${timestamp(process.concluidoEm)} · ${age} ${age === 1 ? 'dia' : 'dias'} do início ao fim · todas as ${a.totalTasks} tarefas concluídas`
                  : 'Pode ser reaberto em Dados do processo'}
              </span>
            </div>
          </div>
        )}
        <div className="info">
          <div className="kicker">
            <ProcessIcon name={type?.icon ?? 'list'} size={16} />
            {type?.nome ?? process.tipo}
          </div>
          <h1>{process.empresa}</h1>
          <div className="row2">
            <span className={`badge ${status.tone}`}>{status.label}</span>
            <span>
              Protocolo <b>{process.codigo}</b>
            </span>
            <span>
              Aberto em {date(process.criadoEm)} · {age}{' '}
              {age === 1 ? 'dia' : 'dias'}
            </span>
            {process.prazo && (
              <span className={a.late ? 'late' : ''}>
                Prazo {date(process.prazo)}
              </span>
            )}
            {process.inicioInat && PROCESS_START_LABELS[process.tipo] && (
              <span>
                {PROCESS_START_LABELS[process.tipo]} {date(process.inicioInat)}
              </span>
            )}
          </div>
        </div>
        <div className="prog">
          <span className="lab">Progresso</span>
          <div className="pbig">
            <b className="num">{a.completedTasks}</b>
            <span>de {a.totalTasks} tarefas</span>
            <em>{percentage}%</em>
          </div>
          <div
            className="bar"
            role="progressbar"
            aria-label="Progresso do processo"
            aria-valuenow={percentage}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <i style={{ width: `${percentage}%` }} />
          </div>
          <small>
            {process.status === 'concluido'
              ? 'Todas as etapas concluídas'
              : process.status === 'cancelado'
                ? 'Processo cancelado'
                : a.currentStage != null
                  ? `Etapa ${a.currentStage + 1} de ${process.etapas.length} · ${process.etapas[a.currentStage]?.t ?? ''}${a.waiting ? ` · libera em ${date(a.releaseDate)}` : ''}`
                  : 'Atualizando as etapas'}
          </small>
        </div>
      </section>
      <div className="proc-grid">
        <div className="col-main">
          <section className="panel">
            <div className="panel-h">
              <h2>Etapas</h2>
              <span className="pill">
                {a.completedTasks} de {a.totalTasks} tarefas
              </span>
            </div>
            {process.etapas.map((stage, index) => {
              const completed =
                stage.completed ??
                stage.tasks.every((task) => !!process.tarefas[task.id]?.s)
              const waiting = index === a.currentStage && a.waiting
              const locked =
                process.status === 'cancelado' ||
                (a.currentStage != null && index > a.currentStage) ||
                waiting
              const current = index === a.currentStage && !locked
              const open = expanded.has(index)
              const count = stage.tasks.filter(
                (task) => !!process.tarefas[task.id]?.s,
              ).length
              const lastTime = stage.tasks
                .map((task) => process.tarefas[task.id]?.em)
                .filter((time): time is string => !!time)
                .sort()
                .at(-1)
              const sectors = [
                ...new Set(stage.tasks.map((task) => catalog.sectors[task.d])),
              ]
              const sub = completed
                ? `Concluída${lastTime ? ` em ${timestamp(lastTime)}` : ''}`
                : waiting
                  ? `Fica disponível em ${date(a.releaseDate)}, ${stage.espera ?? 4} meses após a etapa anterior`
                  : stage.espera
                    ? `Disponível ${stage.espera} meses após a conclusão da etapa anterior`
                    : locked
                      ? process.status === 'cancelado'
                        ? 'Processo cancelado'
                        : 'Aguardando a etapa anterior'
                      : `${sectors.join(' e ')}${sectors.length > 1 ? ' em paralelo' : ''}`
              return (
                <div
                  key={stage.index ?? index}
                  className={`stage ${completed ? 'done' : ''} ${current ? 'cur' : ''} ${locked && !completed ? 'locked' : ''} ${waiting ? 'waiting' : ''} ${open ? 'open' : ''}`}
                >
                  <button
                    type="button"
                    className="stage-h"
                    aria-expanded={open}
                    aria-controls={`${id}-stage-${index}`}
                    onClick={() =>
                      setExpanded((previous) => {
                        const next = new Set(previous)
                        if (next.has(index)) next.delete(index)
                        else next.add(index)
                        return next
                      })
                    }
                  >
                    <span className="snum">
                      {completed ? (
                        <ProcessIcon name="tick" size={16} />
                      ) : waiting ? (
                        <ProcessIcon name="clock" size={14} />
                      ) : locked ? (
                        <ProcessIcon name="lock" size={13} />
                      ) : (
                        index + 1
                      )}
                    </span>
                    <span className="tt">
                      <b>{stage.t}</b>
                      <small>{sub}</small>
                    </span>
                    {waiting ? (
                      <span className="stag wt">
                        <ProcessIcon name="clock" size={13} />
                        Libera em {date(a.releaseDate)}
                      </span>
                    ) : completed ? (
                      <span className="stag ok">
                        <ProcessIcon name="tick" size={13} />
                        {count} de {stage.tasks.length}
                      </span>
                    ) : current ? (
                      <span className="stag cur">
                        Etapa atual · {count} de {stage.tasks.length}
                      </span>
                    ) : locked ? (
                      <span className="stag lk">
                        <ProcessIcon name="lock" size={12} />
                        Bloqueada
                      </span>
                    ) : null}
                    <span className="cv">
                      <ProcessIcon name="chev" />
                    </span>
                  </button>
                  {open && (
                    <div id={`${id}-stage-${index}`} className="stage-b">
                      {stage.note && <div className="note">{stage.note}</div>}
                      {stage.tasks.map((task) => taskView(task, locked))}
                    </div>
                  )}
                </div>
              )
            })}
          </section>
          <section className="panel">
            <div className="panel-h">
              <h2>Comentários e histórico</h2>
            </div>
            {process.permissions.note && (
              <form
                className="composer"
                onSubmit={(event) => void submitNote(event)}
              >
                <textarea
                  className="input"
                  rows={2}
                  placeholder="Escreva um comentário para a equipe"
                  aria-label="Comentário"
                  maxLength={5000}
                  required
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  disabled={busy}
                />
                <button
                  className="btn primary"
                  type="submit"
                  disabled={busy || !comment.trim()}
                >
                  Enviar
                </button>
              </form>
            )}
            {process.permissions.note && process.permissions.viewFinancial && (
              <p className="note">
                Seus comentários são visíveis para a Diretoria e o Financeiro.
              </p>
            )}
            <div className="feed">
              {feed.length ? (
                feed
                  .slice(0, feedLimit)
                  .map((entry) => (
                    <HistoryEntry
                      key={entry.id}
                      entry={entry}
                      isNote={entry.isNote}
                      timestamp={timestamp}
                      taskNames={taskNames}
                    />
                  ))
              ) : (
                <div className="ev">
                  <div className="c">Sem registros ainda.</div>
                </div>
              )}
            </div>
            {feedLimit < feed.length && (
              <button
                className="btn sm"
                onClick={() => setFeedLimit((previous) => previous + 40)}
              >
                Mostrar mais registros
              </button>
            )}
          </section>
        </div>
        <div className="col-side">
          <section className="panel">
            <div className="panel-h">
              <h2>Dados do processo</h2>
              {process.permissions.edit && process.status !== 'cancelado' && (
                <button className="btn sm" disabled={busy} onClick={onEdit}>
                  <ProcessIcon name="pen" size={15} />
                  Editar
                </button>
              )}
            </div>
            <div className="fields">
              {readonlyField('Empresa ou cliente', process.empresa, true)}
              {readonlyField('CNPJ', process.cnpj)}
              {readonlyField(
                PROCESS_START_LABELS[process.tipo] ?? 'Prazo',
                PROCESS_START_LABELS[process.tipo]
                  ? process.inicioInat
                    ? date(process.inicioInat)
                    : 'Não informado'
                  : process.prazo
                    ? date(process.prazo)
                    : 'Sem prazo',
              )}
              {process.protocolo &&
                readonlyField('Protocolo externo', process.protocolo)}
              {process.tipo === 'saida' &&
                process.permissions.viewFinancial &&
                readonlyField('Contato do cliente', process.contato)}
              {readonlyField('Aberto por', process.autorAbertura)}
              <div className="field full">
                <label>Definições da Diretoria</label>
                <ProcessValues process={process} type={type} date={date} />
              </div>
              {process.tipo === 'alteracao' && (
                <>
                  {readonlyField(
                    'O que será alterado',
                    <div className="chk-chips">
                      {process.altItens?.map((item) => (
                        <span key={item} className="chk ro" aria-pressed="true">
                          <span className="box">
                            <ProcessIcon name="tick" size={11} />
                          </span>
                          {PROCESS_ALTERATIONS[item]}
                        </span>
                      ))}
                    </div>,
                    true,
                  )}
                  {process.permissions.viewFinancial &&
                    readonlyField(
                      'Dados que serão alterados',
                      process.altDesc,
                      true,
                    )}
                </>
              )}
              {process.motivo &&
                readonlyField('Motivo', PROCESS_REASONS[process.motivo], true)}
              {process.permissions.viewFinancial &&
                process.motivoObs &&
                readonlyField('Detalhes do motivo', process.motivoObs, true)}
              {process.permissions.viewFinancial &&
                readonlyField(
                  'Observações',
                  process.obs || 'Nenhuma observação',
                  true,
                )}
            </div>
          </section>
          {process.notifications && (
            <section className="panel">
              <div className="panel-h">
                <h2>E-mails de abertura</h2>
                <button
                  type="button"
                  className="btn sm"
                  disabled={busy}
                  aria-label="Atualizar estados dos e-mails"
                  onClick={() =>
                    void mutate(() => processService.get(process.id))
                  }
                >
                  <ProcessIcon name="refresh" size={14} />
                </button>
              </div>
              <div className="fields">
                <div className="field full">
                  <div className="vals">
                    {Object.entries({
                      pending: 'Aguardando envio',
                      sending: 'Em envio',
                      sent: 'Aceitos pelo provedor',
                      failed: 'Falha de preparação',
                      uncertain: 'Entrega não confirmada',
                      skipped: 'Ignorados por acesso revogado',
                    }).map(([key, label]) => (
                      <div className="vbox" key={key}>
                        <span>{label}</span>
                        <b>
                          {process.notifications?.[
                            key as keyof NonNullable<
                              ProcessResource['notifications']
                            >
                          ] ?? 0}
                        </b>
                      </div>
                    ))}
                  </div>
                  {(process.notifications.uncertain ?? 0) > 0 && (
                    <p className="note">
                      Entregas não confirmadas precisam de conferência no
                      provedor de e-mail e não são reenviadas automaticamente.
                    </p>
                  )}
                  <p className="note">
                    O aceite pelo provedor não confirma recebimento. Uma nova
                    tentativa envia apenas mensagens pendentes ou com falha de
                    preparação.
                  </p>
                  {(process.notifications.pending ?? 0) +
                    (process.notifications.failed ?? 0) >
                    0 && (
                    <button
                      className="btn"
                      disabled={busy}
                      onClick={() =>
                        void mutate(
                          () =>
                            processService.retryNotifications(
                              process.id,
                              process.version,
                            ),
                          'Tentativa de envio finalizada',
                        )
                      }
                    >
                      Tentar envios pendentes
                    </button>
                  )}
                </div>
              </div>
            </section>
          )}
          {(process.permissions.cancel ||
            process.permissions.reopen ||
            process.permissions.delete) && (
            <div className="d-actions">
              {confirmation === 'delete' ? (
                <div className="confirm">
                  <span>
                    Excluir o processo de {process.empresa}? Ele deixará de
                    aparecer nas listagens; o histórico será preservado.
                  </span>
                  <button
                    className="btn sm"
                    disabled={busy}
                    onClick={() => setConfirmation(null)}
                  >
                    Manter
                  </button>
                  <button
                    className="btn sm danger"
                    disabled={busy}
                    onClick={() => void remove()}
                  >
                    Excluir processo
                  </button>
                </div>
              ) : confirmation === 'cancel' ? (
                <div className="confirm">
                  <span>
                    Cancelar este processo? Você poderá reabri-lo depois.
                  </span>
                  <button
                    className="btn sm"
                    disabled={busy}
                    onClick={() => setConfirmation(null)}
                  >
                    Manter
                  </button>
                  <button
                    className="btn sm danger"
                    disabled={busy}
                    onClick={() => {
                      setConfirmation(null)
                      void mutate(
                        () =>
                          processService.cancel(process.id, process.version),
                        'Processo cancelado',
                      )
                    }}
                  >
                    Confirmar cancelamento
                  </button>
                </div>
              ) : (
                <>
                  {process.status === 'andamento' &&
                    process.permissions.cancel && (
                      <button
                        className="btn"
                        disabled={busy}
                        onClick={() => setConfirmation('cancel')}
                      >
                        Cancelar processo
                      </button>
                    )}
                  {process.status !== 'andamento' &&
                    process.permissions.reopen && (
                      <button
                        className="btn"
                        disabled={busy}
                        onClick={() =>
                          void mutate(
                            () =>
                              processService.reopen(
                                process.id,
                                process.version,
                              ),
                            'Processo reaberto',
                          )
                        }
                      >
                        Reabrir processo
                      </button>
                    )}
                  {process.permissions.delete && (
                    <button
                      className="btn danger"
                      disabled={busy}
                      onClick={() => setConfirmation('delete')}
                    >
                      Excluir
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function HistoryEntry({
  entry,
  isNote,
  timestamp,
  taskNames,
}: {
  entry: ProcessEntry
  isNote: boolean
  timestamp: (date: string) => string
  taskNames: Record<string, string>
}) {
  const initials = (entry.autor || 'Equipe')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
  return (
    <div className="ev">
      <span className="avatar" aria-hidden="true">
        {initials}
      </span>
      <div className="c">
        <b>{entry.autor || 'Equipe'}</b> {isNote ? 'comentou' : entry.text} ·{' '}
        <time dateTime={entry.em}>{timestamp(entry.em)}</time>
        {isNote && <p style={{ whiteSpace: 'pre-wrap' }}>{entry.text}</p>}
        {entry.details != null &&
          typeof entry.details === 'object' &&
          Object.keys(entry.details).length > 0 && (
            <details className="process-history-details">
              <summary>
                {entry.financial
                  ? 'Ver definições registradas'
                  : 'Ver alterações registradas'}
              </summary>
              <HistoryValue value={entry.details} taskNames={taskNames} />
            </details>
          )}
      </div>
    </div>
  )
}
