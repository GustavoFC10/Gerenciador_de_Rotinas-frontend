import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNotifications } from '../../hooks/useNotifications'
import { useProcessEntries } from '../../hooks/useProcessEntries'
import { processQueryKeys } from '../../query/processQueryKeys'
import type { OrganizationQueryScope } from '../../query/queryKeys'
import { isApiError, type ApiResponse } from '../../services/httpClient'
import { processService } from '../../services/processService'
import { getErrorPresentation } from '../../utils/apiErrors'
import type {
  ProcessCatalog,
  ProcessCatalogType,
  ProcessCreateInput,
  ProcessEntry,
  ProcessField,
  ProcessResource,
  ProcessStatus,
  ProcessTask,
} from '../../types/processes'
import {
  formatProcessDate,
  monthLabel,
  PROCESS_SECTORS,
  processStatus,
} from '../../utils/processPresentation'
import ProcessFields from './ProcessFields'
import ProcessIcon from './ProcessIcon'
import ProcessTypeBadge from './ProcessTypeBadge'
import '../../styles/process-detail-sections.css'
import {
  DIRECT_LOSS_TYPES,
  isProcessFeeAdjustment,
  PROCESS_ALTERATIONS,
  PROCESS_PAYERS,
  PROCESS_REASONS,
  PROCESS_REGIMES,
  PROCESS_COMPETENCE_FIELDS,
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
  scope: OrganizationQueryScope
  process: ProcessResource
  catalog: ProcessCatalog
  onChange: (process: ProcessResource) => void
  onClose: () => void
  onEdit: () => void
  onDelete: () => Promise<void>
  onUnavailable?: (error: unknown) => void
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
      await onSave(patch)
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
  descricaoProcesso: 'Descrição do processo',
  valorProcesso: 'Valor do processo',
  departamentoSolicitado: 'Departamento solicitado',
  acionarLeggacy: 'Acionar a Leggacy',
  custo: 'Custo do processo',
  pagador: 'Quem paga',
  parcelas: 'Parcelas',
  honorario: 'Honorário contábil',
  honCobranca: 'Cobrança do honorário',
  competenciaInicioAtividade: 'Competência de início da atividade',
  competenciaInicioInatividade: 'Competência de início da inatividade',
  ultimaCompetenciaTrabalho: 'Última competência de trabalho',
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
    [
      'custo',
      'honorario',
      'trabValor',
      'honAnterior',
      'honPerdido',
      'valorProcesso',
    ].includes(name)
  )
    return processMoney(String(value))
  if (name === 'regime')
    return (
      PROCESS_REGIMES[value as keyof typeof PROCESS_REGIMES] ?? String(value)
    )
  if (name === 'departamentoSolicitado')
    return (
      PROCESS_SECTORS[value as keyof typeof PROCESS_SECTORS] ?? String(value)
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

const PROCESS_PRIORITY_FIELDS = {
  abertura: ['taxRegime', 'cost', 'monthlyFee'],
  mei: ['taxRegime', 'cost', 'monthlyFee'],
  outro: ['taxRegime', 'monthlyFee'],
  outros: ['request', 'requestedSector'],
  alteracao: ['alterations', 'cost'],
  inatividade: ['start', 'lostFee'],
  inativa: ['start', 'feeLoss'],
  reativacao: ['commercialRegistry', 'monthlyFee'],
  baixa: ['competence', 'lostFee'],
  saida: ['newAccountant', 'lostFee'],
  exclusao: ['competence', 'reason', 'lostFee'],
  aumento_honorarios: ['adjustedFee', 'newChargeDate'],
  reducao_honorarios: ['adjustedFee', 'newChargeDate'],
} as const satisfies Record<ProcessResource['tipo'], readonly string[]>

type ProcessPriorityField =
  (typeof PROCESS_PRIORITY_FIELDS)[ProcessResource['tipo']][number]

interface ProcessDataItem {
  id?: ProcessPriorityField
  label: string
  value?: string | null
  detail?: string
  full?: boolean
}

function ProcessDataGroup({
  title,
  fields,
  primary = false,
}: {
  title: string
  fields: ProcessDataItem[]
  primary?: boolean
}) {
  if (!fields.length) return null
  return (
    <section
      className={`process-data-group${primary ? ' process-data-group--primary' : ''}`}
    >
      <h3 className="app-component-title">{title}</h3>
      <dl className="fields">
        {fields.map(({ label, value, detail, full }) => (
          <div
            className={`field process-data-field${full ? ' full' : ''}`}
            key={label}
          >
            <dt className="app-caption">{label}</dt>
            <dd className={`vv${value ? '' : ' muted'}`}>
              {value || 'Não informado'}
              {detail && <span className="app-caption">{detail}</span>}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function ProcessData({
  process,
  type,
  date,
}: {
  process: ProcessResource
  type?: ProcessCatalogType
  date: (value: string | null | undefined) => string
}) {
  const financial = process.permissions.viewFinancial
  const competenceField = PROCESS_COMPETENCE_FIELDS[process.tipo]
  const startLabel = PROCESS_START_LABELS[process.tipo]
  const hasCost = processHasCost(type)
  const hasFees = processHasField(type, 'honorario')
  const hasDirectLoss = DIRECT_LOSS_TYPES.includes(process.tipo)
  const feeAdjustment = isProcessFeeAdjustment(process.tipo)
  const inactive = process.tipo === 'inativa'
  const general: ProcessDataItem[] = [
    {
      id: 'start',
      label: startLabel ?? 'Prazo',
      value: startLabel
        ? process.inicioInat && date(process.inicioInat)
        : process.prazo
          ? date(process.prazo)
          : 'Sem prazo',
    },
  ]
  if (competenceField) {
    const competence = process[competenceField.key]
    general.push({
      id: 'competence',
      label: competenceField.label,
      value: competence ? monthLabel(competence) : undefined,
    })
  }
  general.push({ label: 'Aberto por', value: process.autorAbertura })
  if (process.tipo === 'alteracao') {
    general.push({
      id: 'alterations',
      label: 'O que será alterado',
      value: process.altItens
        ?.map((item) => PROCESS_ALTERATIONS[item])
        .join(', '),
      full: true,
    })
    if (financial)
      general.push({
        label: 'Dados que serão alterados',
        value: process.altDesc,
        full: true,
      })
  }
  if (process.motivo)
    general.push({
      id: 'reason',
      label: 'Motivo',
      value: PROCESS_REASONS[process.motivo],
      full: true,
    })
  if (financial && process.motivoObs)
    general.push({
      label: 'Detalhes do motivo',
      value: process.motivoObs,
      full: true,
    })
  if (process.tipo === 'saida')
    general.push({
      id: 'newAccountant',
      label: 'Nova contabilidade',
      value: process.novoContador
        ? process.contadorNome || 'Dados conhecidos'
        : 'A solicitar ao cliente',
      detail: process.novoContador
        ? financial
          ? process.contadorContato || 'Contato não informado'
          : 'Contato reservado à Diretoria e ao Financeiro'
        : 'A Regularidade pede os dados do novo contador',
      full: true,
    })
  if (process.tipo === 'reativacao')
    general.push({
      id: 'commercialRegistry',
      label: 'Junta Comercial',
      value:
        process.reatJunta !== false
          ? 'Reativar na Junta'
          : 'Sem reativação na Junta',
      detail:
        process.reatJunta !== false
          ? 'Etapa com a Leggacy aberta'
          : 'Etapa da Leggacy não se aplica',
      full: true,
    })
  if (processHasMeeting(type, 'alinhamento'))
    general.push({
      label: 'Reunião de alinhamento',
      value: process.reunAlinh !== false ? 'Sim' : 'Não',
    })
  if (processHasMeeting(type, 'acompanhamento'))
    general.push({
      label: 'Reunião de acompanhamento (4º mês)',
      value: process.reunAcomp !== false ? 'Sim' : 'Não',
    })

  const request: ProcessDataItem[] = []
  if (process.tipo === 'outros') {
    request.push(
      {
        id: 'request',
        label: 'Descrição do processo',
        value: process.descricaoProcesso,
        full: true,
      },
      {
        id: 'requestedSector',
        label: 'Departamento solicitado',
        value:
          process.departamentoSolicitado &&
          PROCESS_SECTORS[process.departamentoSolicitado],
      },
      {
        label: 'Acionar a Leggacy',
        value:
          process.acionarLeggacy === undefined
            ? undefined
            : process.acionarLeggacy
              ? 'Sim'
              : 'Não',
      },
    )
    if (financial && process.valorProcesso !== undefined)
      request.push({
        label: 'Valor do processo',
        value: processMoney(process.valorProcesso),
        detail: 'Valor pontual',
      })
  }

  const definitions: ProcessDataItem[] = []
  if (processHasField(type, 'regime')) {
    definitions.push({
      id: 'taxRegime',
      label: 'Regime tributário',
      value: process.regime ? PROCESS_REGIMES[process.regime] : 'A definir',
    })
    if (financial && process.regimeObs)
      definitions.push({
        label: 'Detalhes do regime tributário',
        value: process.regimeObs,
        full: true,
      })
  }
  if (!financial && (hasCost || hasFees || hasDirectLoss))
    definitions.push({
      label: 'Valores financeiros',
      value: 'Restritos',
      detail: 'Visíveis para a Diretoria e o Financeiro',
      full: true,
    })
  if (financial && hasCost) {
    const installment = processInstallmentValue(process.custo, process.parcelas)
    definitions.push(
      {
        id: 'cost',
        label: 'Custo do processo',
        value: processMoney(process.custo),
      },
      {
        label: 'Quem paga',
        value: process.pagador ? PROCESS_PAYERS[process.pagador] : 'A definir',
      },
      {
        label: 'Pagamento',
        value:
          process.parcelas === 1
            ? 'À vista'
            : process.parcelas
              ? `${process.parcelas} parcelas${installment === null ? '' : ` de ${processMoney(installment)}`}`
              : 'A definir',
      },
    )
  }
  if (financial && hasDirectLoss)
    definitions.push({
      id: 'lostFee',
      label: 'Honorário perdido',
      value:
        process.honPerdido == null
          ? 'A definir'
          : `− ${processMoney(process.honPerdido)} /mês`,
    })
  if (financial && inactive) {
    const loss = processInactivityLoss(process)
    definitions.push(
      { label: 'Honorário anterior', value: processMoney(process.honAnterior) },
      {
        id: 'feeLoss',
        label: 'Perda de honorário',
        value: loss == null ? 'A definir' : `− ${processMoney(loss)} /mês`,
      },
    )
  }
  if (financial && feeAdjustment)
    definitions.push(
      { label: 'Honorário anterior', value: processMoney(process.honAnterior) },
      {
        id: 'adjustedFee',
        label: 'Novo honorário contábil',
        value: processMoney(process.honorario),
      },
      {
        id: 'newChargeDate',
        label: 'Data da nova cobrança',
        value: date(process.honCobranca),
      },
      {
        label:
          process.tipo === 'aumento_honorarios'
            ? 'Aumento de honorários'
            : 'Redução de honorários',
        value:
          process.honVariacao === undefined
            ? 'A definir'
            : `${processMoney(process.honVariacao.replace(/^-/, ''))} /mês`,
      },
    )
  if (financial && !feeAdjustment && (hasFees || inactive)) {
    definitions.push({
      id: 'monthlyFee',
      label: 'Novo honorário mensal',
      value:
        process.honorario == null
          ? 'A definir'
          : `${processMoney(processMonthlyTotal(process))} /mês`,
    })
    if (hasFees)
      definitions.push({
        label: inactive ? 'Data da nova cobrança' : 'Cobrança do 1º honorário',
        value: date(process.honCobranca),
      })
    if (hasFees && process.trab && process.honorario != null)
      definitions.push(
        { label: 'Honorário contábil', value: processMoney(process.honorario) },
        {
          label: 'Honorário trabalhista',
          value: `${process.trabQtd ?? 0} funcionários × ${processMoney(process.trabValor)}`,
        },
      )
  }

  const priorities: readonly ProcessPriorityField[] =
    PROCESS_PRIORITY_FIELDS[process.tipo]
  const fields = [...general, ...request, ...definitions]
  const primary = priorities
    .map((id) => fields.find((field) => field.id === id))
    .filter((field) => field !== undefined)
  const remaining = (items: ProcessDataItem[]) =>
    items.filter((field) => !field.id || !priorities.includes(field.id))

  return (
    <>
      <ProcessDataGroup title="Dados principais" fields={primary} primary />
      <ProcessDataGroup
        title="Informações gerais"
        fields={remaining(general)}
      />
      <ProcessDataGroup
        title="Dados da solicitação"
        fields={remaining(request)}
      />
      <ProcessDataGroup
        title="Definições da Diretoria"
        fields={remaining(definitions)}
      />
    </>
  )
}

function ProcessSideSection({
  title,
  children,
  action,
  defaultOpen = false,
  loadOnOpen = false,
}: {
  title: string
  children: ReactNode
  action?: ReactNode
  defaultOpen?: boolean
  loadOnOpen?: boolean
}) {
  const contentId = useId()
  const [open, setOpen] = useState(defaultOpen)

  return (
    <section className="panel process-detail-section">
      <div className="panel-h">
        <h2>
          <button
            className="process-detail-section-toggle"
            type="button"
            aria-expanded={open}
            aria-controls={contentId}
            onClick={() => setOpen((value) => !value)}
          >
            {title}
            <ProcessIcon name="chev" size={16} />
          </button>
        </h2>
        {action}
      </div>
      <div
        className="process-detail-section-body"
        id={contentId}
        hidden={!open}
      >
        {(open || !loadOnOpen) && children}
      </div>
    </section>
  )
}

export default function ProcessDetails({
  scope,
  process,
  catalog,
  onChange,
  onClose,
  onEdit,
  onDelete,
  onUnavailable,
  timeZone = 'America/Sao_Paulo',
}: ProcessDetailsProps) {
  const id = useId()
  const queryClient = useQueryClient()
  const { notify } = useNotifications()
  const [expanded, setExpanded] = useState<Set<number>>(
    () => new Set([process.analysis.currentStage ?? 0]),
  )
  const [saving, setBusy] = useState(false)
  const [coolingDown, setCoolingDown] = useState(false)
  const active = useRef(true)
  const cooldownTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  )
  const busy = saving || coolingDown
  useEffect(() => {
    active.current = true
    return () => {
      active.current = false
      clearTimeout(cooldownTimer.current)
    }
  }, [])
  const busyRef = useRef(false)
  const [error, setError] = useState('')
  const [confirmation, setConfirmation] = useState<
    'delete' | 'cancel' | string | null
  >(null)
  const [unavailable, setUnavailable] = useState(false)
  const [openedAt] = useState(() => Date.now())
  const type = catalog.types.find((type) => type.id === process.tipo)
  const taskNames = Object.fromEntries(
    [...(type?.etapas ?? []), ...process.etapas].flatMap((stage) =>
      stage.tasks.map((task) => [task.id, task.txt]),
    ),
  )
  const a = process.analysis
  const status = processStatus(process)
  const isOpen = ['andamento', 'agendado', 'atrasado'].includes(process.status)
  const executable =
    process.status === 'andamento' || process.status === 'atrasado'
  function revokeAccess(error: unknown) {
    active.current = false
    setUnavailable(true)
    onUnavailable?.(error)
    for (const queryKey of [
      processQueryKeys.detail(scope, process.id),
      processQueryKeys.entries(scope, process.id),
      processQueryKeys.list(scope),
      processQueryKeys.indicators(scope),
      processQueryKeys.report(scope, '').slice(0, -1),
      processQueryKeys.followUps(scope),
      processQueryKeys.followUp(scope, '').slice(0, -1),
      processQueryKeys.alerts(scope),
      processQueryKeys.alert(scope, '').slice(0, -1),
      processQueryKeys.alertRecipients(scope),
    ]) {
      void queryClient.cancelQueries({ queryKey })
      queryClient.removeQueries({ queryKey })
    }
  }
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
    if (busyRef.current || coolingDown) return false
    busyRef.current = true
    setBusy(true)
    setError('')
    try {
      const response = await action()
      if (!active.current) return false
      onChange(response.data)
      void queryClient.invalidateQueries(
        { queryKey: processQueryKeys.entries(scope, process.id) },
        { cancelRefetch: false },
      )
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
      const presentation = getErrorPresentation(error)
      if (
        isApiError(error) &&
        (error.status === 429 || error.status === 503) &&
        presentation.retryAfterSeconds
      ) {
        setCoolingDown(true)
        clearTimeout(cooldownTimer.current)
        cooldownTimer.current = setTimeout(
          () => setCoolingDown(false),
          presentation.retryAfterSeconds * 1000,
        )
      }
      if (isApiError(error) && (error.status === 403 || error.status === 404)) {
        revokeAccess(error)
      } else if (isApiError(error) && error.status === 409) {
        let refreshed = false
        try {
          const current = (await processService.get(process.id)).data
          if (!active.current) return false
          onChange(current)
          refreshed = true
        } catch (refreshError) {
          if (
            isApiError(refreshError) &&
            (refreshError.status === 403 || refreshError.status === 404)
          )
            revokeAccess(refreshError)
          /* Preserve the conflict notice when refreshing also fails. */
        }
        setError(
          `${error.message} ${refreshed ? 'Os dados foram atualizados. Confira o estado atual antes de tentar novamente.' : 'Não foi possível recarregar os dados. Atualize o processo antes de tentar novamente.'}`,
        )
      } else
        setError(
          [presentation.message, presentation.supportReference]
            .filter(Boolean)
            .join(' '),
        )
      return false
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }
  async function remove() {
    if (busyRef.current || coolingDown) return
    busyRef.current = true
    setBusy(true)
    setError('')
    try {
      await onDelete()
    } catch (error) {
      if (isApiError(error) && (error.status === 403 || error.status === 404)) {
        revokeAccess(error)
      } else if (isApiError(error) && error.status === 409) {
        try {
          const current = (await processService.get(process.id)).data
          if (!active.current) return
          onChange(current)
        } catch (refreshError) {
          if (
            isApiError(refreshError) &&
            (refreshError.status === 403 || refreshError.status === 404)
          )
            revokeAccess(refreshError)
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
  function taskView(task: ProcessTask, locked: boolean) {
    const state = process.tarefas[task.id]
    const done = !!state?.s
    const canExecute = process.permissions.executeSectors.includes(task.d)
    const automatic = task.auto || state?.auto
    const canTransition =
      !automatic &&
      canExecute &&
      ((done && process.status !== 'cancelado') ||
        (!locked && executable) ||
        (process.permissions.edit && !done && executable))
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
                      Object.keys(patch).length
                        ? processService.update(process.id, {
                            ...patch,
                            version: process.version,
                          })
                        : processService.transitionTask(
                            process.id,
                            task.id,
                            process.version,
                            'feito',
                          ),
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
          {task.opt && !done && !locked && canExecute && executable && (
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
  if (unavailable)
    return (
      <div className="panel empty" role="alert">
        <h1>Processo indisponível</h1>
        <p>
          Seu acesso a este processo não está disponível. O conteúdo foi
          removido.
        </p>
        <button className="btn" onClick={onClose}>
          Voltar para processos
        </button>
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
        {!isOpen && (
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
            <ProcessTypeBadge catalog={catalog} tipo={process.tipo} />
          </div>
          <h1>{process.empresa}</h1>
          <div className="row2">
            <span className={`badge ${status.tone}`}>{status.label}</span>
            {process.responsibleSectors.length > 0 && (
              <span>
                Responsável:{' '}
                {process.responsibleSectors
                  .map((sector) => catalog.sectors[sector])
                  .join(' e ')}
              </span>
            )}
            <span>
              Código interno <b>{process.codigo}</b>
            </span>
            <span>
              Aberto em {date(process.criadoEm)} · {age}{' '}
              {age === 1 ? 'dia' : 'dias'}
            </span>
            {process.prazo && (
              <span className={process.status === 'atrasado' ? 'late' : ''}>
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
                  ? `Etapa ${a.currentStage + 1} de ${process.etapas.length} · ${process.etapas[a.currentStage]?.t ?? ''}${process.status === 'agendado' ? ` · libera em ${date(a.releaseDate)}` : ''}`
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
              const waiting =
                index === a.currentStage && process.status === 'agendado'
              const locked =
                !executable ||
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
                  ? `Fica disponível em ${date(a.releaseDate)}${stage.espera ? `, ${stage.espera} meses após a etapa anterior` : ''}`
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
          {(process.leggacy ?? []).some(
            (tracking) => tracking.awaitingReturn,
          ) && (
            <section className="panel" aria-label="Acompanhamento da Leggacy">
              <div className="panel-h">
                <h2>Acompanhamento da Leggacy</h2>
              </div>
              {process.leggacy
                .filter((tracking) => tracking.awaitingReturn)
                .map((tracking) => (
                  <div
                    className="process-leggacy-tracking"
                    key={`${tracking.sendTaskId}:${tracking.sentAt}`}
                  >
                    <p>
                      <ProcessIcon name="clock" size={16} /> Aguardando retorno
                      há {tracking.daysWaiting}{' '}
                      {tracking.daysWaiting === 1 ? 'dia' : 'dias'}
                    </p>
                    <p>
                      {taskNames[tracking.returnTaskId] ?? 'Retorno da Leggacy'}
                    </p>
                    <small>Envio em {timestamp(tracking.sentAt)}</small>
                  </div>
                ))}
            </section>
          )}
          <section className="panel">
            <div className="panel-h">
              <h2>Histórico</h2>
            </div>
            <ProcessEntries
              kind="event"
              scope={scope}
              processId={process.id}
              timestamp={timestamp}
              taskNames={taskNames}
              statuses={catalog.statuses}
              onUnavailable={revokeAccess}
            />
          </section>
        </div>
        <div className="col-side">
          <ProcessSideSection title="Dados da empresa" defaultOpen>
            <div className="fields">
              {readonlyField('Empresa ou cliente', process.empresa, true)}
              {readonlyField('CNPJ', process.cnpj)}
              {readonlyField('Contato do cliente', process.contato)}
            </div>
          </ProcessSideSection>
          <ProcessSideSection
            title="Dados do processo"
            action={
              process.permissions.edit &&
              process.status !== 'cancelado' && (
                <button
                  className="btn sm"
                  type="button"
                  disabled={busy}
                  onClick={onEdit}
                >
                  <ProcessIcon name="pen" size={15} />
                  Editar
                </button>
              )
            }
          >
            <ProcessData process={process} type={type} date={date} />
          </ProcessSideSection>
          <ProcessSideSection title="Observações" loadOnOpen>
            <ProcessEntries
              kind="note"
              scope={scope}
              processId={process.id}
              sectors={catalog.sectors}
              legacyNote={process.obs?.trim()}
              onUnavailable={revokeAccess}
            />
          </ProcessSideSection>
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
                  {isOpen && process.permissions.cancel && (
                    <button
                      className="btn"
                      disabled={busy}
                      onClick={() => setConfirmation('cancel')}
                    >
                      Cancelar processo
                    </button>
                  )}
                  {!isOpen && process.permissions.reopen && (
                    <button
                      className="btn"
                      disabled={busy}
                      onClick={() =>
                        void mutate(
                          () =>
                            processService.reopen(process.id, process.version),
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

type ProcessEntriesContent =
  | {
      kind: 'event'
      timestamp: (date: string) => string
      taskNames: Record<string, string>
      statuses: ProcessCatalog['statuses']
    }
  | {
      kind: 'note'
      sectors: ProcessCatalog['sectors']
      legacyNote?: string
    }

function ProcessEntries({
  scope,
  processId,
  onUnavailable,
  ...content
}: {
  scope: OrganizationQueryScope
  processId: string
  onUnavailable: (error: unknown) => void
} & ProcessEntriesContent) {
  const [page, setPage] = useState(1)
  const query = useProcessEntries(scope, processId, {
    kind: content.kind,
    page,
    pageSize: 50,
  })
  const isNotes = content.kind === 'note'
  const legacyNote = isNotes && page === 1 ? content.legacyNote : undefined
  const noteEntries = isNotes && !query.error ? (query.data?.results ?? []) : []
  const presentation = query.error ? getErrorPresentation(query.error) : null
  const [retryReady, setRetryReady] = useState(true)
  const inaccessible =
    isApiError(query.error) &&
    (query.error.status === 403 || query.error.status === 404)
  useEffect(() => {
    if (inaccessible) onUnavailable(query.error)
  }, [inaccessible, onUnavailable, query.error])
  useEffect(() => {
    const seconds = presentation?.retryAfterSeconds
    if (seconds == null || seconds === 0) {
      setRetryReady(true)
      return
    }
    setRetryReady(false)
    const timer = setTimeout(() => setRetryReady(true), seconds * 1000)
    return () => clearTimeout(timer)
  }, [query.errorUpdatedAt, presentation?.retryAfterSeconds])
  if (inaccessible) return null
  return (
    <div className="process-entries" aria-busy={query.isFetching}>
      {isNotes && (legacyNote || noteEntries.length > 0) && (
        <ul className="process-observation-list">
          {legacyNote && (
            <li>
              <p>{legacyNote}</p>
            </li>
          )}
          {noteEntries.map((entry) => (
            <ProcessObservation
              key={entry.id}
              entry={entry}
              sectors={content.sectors}
            />
          ))}
        </ul>
      )}
      {query.isPending ? (
        <p role="status">
          {isNotes ? 'Carregando observações…' : 'Carregando registros…'}
        </p>
      ) : presentation ? (
        <div className="err-msg" role="alert">
          <p>{presentation.message}</p>
          {presentation.supportReference && (
            <p>{presentation.supportReference}</p>
          )}
          <button
            className="btn sm"
            type="button"
            disabled={query.isFetching || !retryReady}
            onClick={() => {
              setRetryReady(false)
              void query.refetch().then(() => setRetryReady(true))
            }}
          >
            {isNotes
              ? 'Tentar carregar observações novamente'
              : 'Tentar carregar registros novamente'}
          </button>
        </div>
      ) : query.data ? (
        <>
          {query.isFetching && (
            <p role="status">
              {isNotes ? 'Atualizando observações…' : 'Atualizando registros…'}
            </p>
          )}
          {isNotes ? (
            !legacyNote &&
            noteEntries.length === 0 && (
              <p className="process-observation-empty">Nenhuma observação.</p>
            )
          ) : (
            <div className="feed">
              {query.data.results.length > 0 ? (
                query.data.results.map((entry) => (
                  <HistoryEntry
                    key={entry.id}
                    entry={entry}
                    timestamp={content.timestamp}
                    taskNames={content.taskNames}
                    statuses={content.statuses}
                  />
                ))
              ) : (
                <p>Sem eventos ainda.</p>
              )}
            </div>
          )}
          {(!isNotes || query.data.previous || query.data.next) && (
            <nav
              className="process-actions"
              aria-label={
                isNotes
                  ? 'Paginação das observações'
                  : 'Paginação dos registros'
              }
            >
              <button
                className="btn sm"
                disabled={query.isFetching || !query.data.previous}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
              >
                Anterior
              </button>
              <span>
                Página {page} · {query.data.count}{' '}
                {isNotes ? 'observações' : 'registros'}
              </span>
              <button
                className="btn sm"
                disabled={query.isFetching || !query.data.next}
                onClick={() => setPage((value) => value + 1)}
              >
                Próxima
              </button>
            </nav>
          )}
        </>
      ) : null}
    </div>
  )
}

function ProcessObservation({
  entry,
  sectors,
}: {
  entry: ProcessEntry
  sectors: ProcessCatalog['sectors']
}) {
  return (
    <li>
      <p>{entry.text}</p>
      {!!entry.visibleToSectors?.length && (
        <div className="process-observation-visibility">
          <span>Visível para</span>
          {entry.visibleToSectors.map((sector) => (
            <span className="pill" key={sector}>
              <span className={`dot ${sector}`} aria-hidden="true" />
              {sectors[sector]}
            </span>
          ))}
        </div>
      )}
    </li>
  )
}

function HistoryEntry({
  entry,
  timestamp,
  taskNames,
  statuses,
}: {
  entry: ProcessEntry
  timestamp: (date: string) => string
  taskNames: Record<string, string>
  statuses: ProcessCatalog['statuses']
}) {
  const details =
    entry.details != null && typeof entry.details === 'object'
      ? (entry.details as Record<string, unknown>)
      : null
  const statusChange = entry.kind === 'status_changed' && details
  const automatic =
    (statusChange &&
      ['clock', 'migration', 'migration_reverse'].includes(
        String(details.trigger),
      )) ||
    (['followup_created', 'followup_closed', 'alert_created'].includes(
      entry.kind,
    ) &&
      details?.trigger === 'clock')
  const author = automatic ? 'Sistema' : entry.autor || 'Equipe'
  const action = statusChange
    ? `alterou a situação de ${statuses[details.from as ProcessStatus]} para ${statuses[details.to as ProcessStatus]}`
    : ((
        {
          restored: 'restaurou o processo',
          company_unlinked:
            'desvinculou o cadastro central, preservando a identificação do processo',
        } as Record<string, string>
      )[entry.kind] ?? entry.text)
  const initials = author
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
        <b>{author}</b> {action} ·{' '}
        <time dateTime={entry.em}>{timestamp(entry.em)}</time>
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
