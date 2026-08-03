import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'

import EntityEditModal from '../components/entities/EntityEditModal'
import RoutineListComparison from '../components/routine-control/list/RoutineListComparison'
import Button from '../components/ui/Button'
import {
  getClientTaxRegimeLabel,
  getRoutineRecurrenceLabel,
} from '../constants/entityOptions'
import { ROUTES } from '../constants/routes'
import { useAppState } from '../hooks/useAppState'
import WorkspaceBar from '../layouts/WorkspaceBar'
import type {
  Client,
  EntityId,
  Routine,
  RoutineConfigurationUpdateInput,
  RoutineControlData,
  RoutineListInteractionProps,
  UpdateClientInput,
} from '../types/domain'
import { canAccessDepartment, isLeader } from '../utils/permissions'
import {
  ROUTINE_LIST_MODE,
  buildRoutineListViewData,
} from '../utils/routineListItems'
import { formatRoutineSchedule } from '../utils/routineSchedule'

type EntityType = 'client' | 'routine'

interface EntityDetailPageProps extends Omit<
  RoutineListInteractionProps,
  'data'
> {
  type: EntityType
  data: RoutineControlData
  spreadsheetId: EntityId
  spreadsheetName: string
  spreadsheetDepartmentId: EntityId
  spreadsheetDivisionId: EntityId
  spreadsheetDivisionName: string
  onClientUpdate?: (clientId: EntityId, changes: UpdateClientInput) => void
  onRoutineUpdate?: (
    routineId: EntityId,
    changes: RoutineConfigurationUpdateInput,
  ) => void
}

function EntityDetailPage({
  type,
  data,
  spreadsheetId,
  spreadsheetName,
  spreadsheetDepartmentId,
  spreadsheetDivisionId,
  spreadsheetDivisionName,
  onClientUpdate,
  onRoutineUpdate,
  onItemOpen,
  onItemQuickAction,
  onItemNoteChange,
  onItemStatusChange,
}: EntityDetailPageProps) {
  const params = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { competence, formattedCompetence, user } = useAppState()
  const [isEditing, setIsEditing] = useState(false)
  const [savedMessage, setSavedMessage] = useState('')
  const entityId =
    type === 'client' ? (params.clientId ?? '') : (params.routineId ?? '')
  const client =
    type === 'client'
      ? data.clients.find((item) => item.id === entityId)
      : undefined
  const routine =
    type === 'routine'
      ? data.routines.find((item) => item.id === entityId)
      : undefined
  const entity = client ?? routine
  const departmentId = routine?.departmentId ?? spreadsheetDepartmentId
  const canEdit = isLeader(user) && canAccessDepartment(user, departmentId)
  const wasOpenedFromCatalog =
    new URLSearchParams(location.search).get('source') === 'catalog'
  const wasOpenedFromSpreadsheet = Boolean(
    (location.state as { fromSpreadsheet?: boolean } | null)?.fromSpreadsheet,
  )
  const spreadsheetPath = `${ROUTES.SPREADSHEET}?sheetId=${encodeURIComponent(
    spreadsheetId,
  )}&divisionId=${encodeURIComponent(spreadsheetDivisionId)}`

  const listViewData = useMemo(() => {
    const view = buildRoutineListViewData({
      data,
      filter: {
        type:
          type === 'client'
            ? ROUTINE_LIST_MODE.CLIENT
            : ROUTINE_LIST_MODE.ROUTINE,
        id: entityId,
      },
    })

    return {
      ...view,
      items: view.items.filter((item) => item.period === competence),
    }
  }, [competence, data, entityId, type])

  useEffect(() => {
    setIsEditing(false)
    setSavedMessage('')
  }, [entityId, type])

  if (!entity) {
    return (
      <div className="grid min-h-[24rem] place-items-center">
        <div className="max-w-md rounded-[var(--radius-panel)] border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] p-6 text-center shadow-[var(--shadow-panel)]">
          <h1 className="text-lg font-black text-[var(--color-text-strong)]">
            {type === 'client'
              ? 'Empresa não encontrada'
              : 'Rotina não encontrada'}
          </h1>
          <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">
            O cadastro pode ter sido removido ou não pertencer a esta planilha.
          </p>
          <Link
            to={spreadsheetPath}
            className="mt-5 inline-flex min-h-9 items-center rounded-[var(--radius-control)] bg-[var(--color-button-primary-bg)] px-3 text-sm font-bold text-[var(--color-button-primary-text)] hover:bg-[var(--color-button-primary-hover-bg)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-control-focus)]"
          >
            Voltar para a planilha
          </Link>
        </div>
      </div>
    )
  }

  function handleClientSave(changes: UpdateClientInput) {
    if (!client) return
    onClientUpdate?.(client.id, changes)

    const nextDivisionId = changes.divisionAssignments.find(
      (assignment) => assignment.departmentId === spreadsheetDepartmentId,
    )?.divisionId

    if (
      !wasOpenedFromCatalog &&
      nextDivisionId &&
      nextDivisionId !== spreadsheetDivisionId
    ) {
      navigate(
        `${ROUTES.COMPANIES}/${encodeURIComponent(
          client.id,
        )}?sheetId=${encodeURIComponent(
          spreadsheetId,
        )}&divisionId=${encodeURIComponent(nextDivisionId)}`,
        { replace: true, state: { fromSpreadsheet: true } },
      )
    }

    setIsEditing(false)
    setSavedMessage('Dados da empresa atualizados nesta sessão.')
  }

  function handleRoutineSave(changes: RoutineConfigurationUpdateInput) {
    if (!routine) return
    onRoutineUpdate?.(routine.id, changes)
    setIsEditing(false)
    setSavedMessage('Configuração da rotina atualizada nesta sessão.')
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <WorkspaceBar
        context={{
          label: wasOpenedFromCatalog
            ? type === 'client'
              ? 'Todas as empresas'
              : 'Todas as rotinas'
            : `Planilha ${spreadsheetName} · ${spreadsheetDivisionName}`,
          to: wasOpenedFromCatalog
            ? type === 'client'
              ? ROUTES.COMPANIES
              : ROUTES.ROUTINES
            : spreadsheetPath,
          onBack:
            !wasOpenedFromCatalog && wasOpenedFromSpreadsheet
              ? () => navigate(-1)
              : undefined,
        }}
        title={entity.name}
        meta={
          <div className="flex items-center gap-2">
            <EntityStatus active={entity.active !== false} />
            {!canEdit && (
              <span className="rounded-full border border-[var(--color-divider)] bg-[var(--color-panel-soft-bg)] px-2.5 py-1 text-xs font-bold text-[var(--color-text-muted)]">
                Somente leitura
              </span>
            )}
          </div>
        }
        actions={
          canEdit ? (
            <Button tone="neutral" onClick={() => setIsEditing(true)}>
              <EditIcon />
              Editar dados
            </Button>
          ) : undefined
        }
      />

      {savedMessage && (
        <p
          className="mb-3 rounded-[var(--radius-control)] border border-[var(--status-completed-border)] bg-[var(--status-completed-bg)] px-3 py-2 text-sm font-semibold text-[var(--status-completed-text)]"
          role="status"
        >
          {savedMessage}
        </p>
      )}

      <EntitySummary
        type={type}
        client={client}
        routine={routine}
        data={data}
        spreadsheetDepartmentId={spreadsheetDepartmentId}
      />

      <section
        className="mt-5 min-h-0 flex-1"
        aria-labelledby="entity-task-list-title"
      >
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2
            id="entity-task-list-title"
            className="mr-auto text-base font-black tracking-tight text-[var(--color-text-strong)] sm:text-lg"
          >
            {type === 'client'
              ? 'Rotinas desta empresa'
              : 'Empresas desta rotina'}
          </h2>
          <span className="text-xs font-bold text-[var(--color-text-muted)]">
            {formattedCompetence}
          </span>
          <span className="rounded-full border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] px-2.5 py-1 text-xs font-bold text-[var(--color-text-muted)]">
            {listViewData.items.length}{' '}
            {listViewData.items.length === 1 ? 'tarefa' : 'tarefas'}
          </span>
        </div>

        <RoutineListComparison
          key={`${type}:${entityId}`}
          items={listViewData.items}
          onItemOpen={onItemOpen}
          onItemQuickAction={onItemQuickAction}
          onItemNoteChange={onItemNoteChange}
          onItemStatusChange={onItemStatusChange}
          showHeader={false}
        />
      </section>

      {isEditing && client && (
        <EntityEditModal
          type="client"
          entity={client}
          data={data}
          onClose={() => setIsEditing(false)}
          onSave={handleClientSave}
        />
      )}

      {isEditing && routine && (
        <EntityEditModal
          type="routine"
          entity={routine}
          data={data}
          onClose={() => setIsEditing(false)}
          onSave={handleRoutineSave}
        />
      )}
    </div>
  )
}

function EntitySummary({
  type,
  client,
  routine,
  data,
  spreadsheetDepartmentId,
}: {
  type: EntityType
  client?: Client
  routine?: Routine
  data: RoutineControlData
  spreadsheetDepartmentId: EntityId
}) {
  const applicableRoutineCount = client
    ? new Set(
        data.clientRoutineLinks
          .filter((link) => link.clientId === client.id)
          .map((link) => link.routineId),
      ).size
    : 0
  const linkedClientCount = routine
    ? new Set(
        data.clientRoutineLinks
          .filter((link) => link.routineId === routine.id)
          .map((link) => link.clientId),
      ).size
    : 0
  const department = routine
    ? data.departments.find((item) => item.id === routine.departmentId)
    : undefined
  const clientDivision = client
    ? data.divisions?.find(
        (division) =>
          division.id ===
          client.divisionAssignments?.find(
            (assignment) => assignment.departmentId === spreadsheetDepartmentId,
          )?.divisionId,
      )
    : undefined
  const clientDepartment = client
    ? data.departments.find((item) => item.id === spreadsheetDepartmentId)
    : undefined

  return (
    <section className="rounded-[var(--radius-panel)] border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] shadow-[var(--shadow-panel)]">
      <dl
        className={`grid sm:grid-cols-2 ${
          client ? 'xl:grid-cols-4' : 'xl:grid-cols-4'
        }`}
      >
        {type === 'client' && client ? (
          <>
            <SummaryField label="Código interno" value={client.code} />
            <SummaryField
              label="Razão social"
              value={client.legalName || client.name}
            />
            <SummaryField
              label="Regime tributário"
              value={getClientTaxRegimeLabel(client.taxRegime)}
            />
            <SummaryField
              label={`Divisão ${
                clientDepartment?.name.toLocaleLowerCase('pt-BR') ??
                'operacional'
              }`}
              value={clientDivision?.name ?? 'Não informada'}
            />
            <SummaryField
              label="CNPJ"
              value={client.document || 'Não informado'}
            />
            <SummaryField
              label="E-mail"
              value={client.email || 'Não informado'}
            />
            <SummaryField
              label="Telefone"
              value={client.phone || 'Não informado'}
            />
            <SummaryField
              label="Rotinas aplicáveis"
              value={`${applicableRoutineCount} vinculada${applicableRoutineCount === 1 ? '' : 's'}`}
            />
          </>
        ) : routine ? (
          <>
            <SummaryField
              label="Departamento"
              value={department?.name ?? 'Não informado'}
            />
            <SummaryField
              label="Recorrência"
              value={getRoutineRecurrenceLabel(routine.recurrence)}
            />
            <SummaryField
              label="Prazo padrão"
              value={getRoutineDueLabel(routine)}
            />
            <SummaryField
              label="Empresas vinculadas"
              value={`${linkedClientCount} empresa${linkedClientCount === 1 ? '' : 's'}`}
            />
            <SummaryField
              label="Descrição"
              value={routine.description || 'Sem descrição'}
              className="sm:col-span-2 xl:col-span-4"
            />
          </>
        ) : null}
      </dl>
    </section>
  )
}

function getRoutineDueLabel(routine: Routine): string {
  return formatRoutineSchedule(routine)
}

function SummaryField({
  label,
  value,
  className = '',
}: {
  label: string
  value: ReactNode
  className?: string
}) {
  return (
    <div
      className={`border-b border-r border-[var(--color-divider)] px-4 py-3 sm:[&:nth-child(even)]:border-r-0 xl:[&:nth-child(even)]:border-r xl:[&:nth-child(4n)]:border-r-0 ${className}`}
    >
      <dt className="text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--color-text-subtle)]">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-extrabold text-[var(--color-text-strong)]">
        {value}
      </dd>
    </div>
  )
}

function EntityStatus({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${
        active
          ? 'border-[var(--status-completed-border)] bg-[var(--status-completed-bg)] text-[var(--status-completed-text)]'
          : 'border-[var(--color-panel-border)] bg-[var(--color-panel-soft-bg)] text-[var(--color-text-muted)]'
      }`}
    >
      <span
        className={`size-1.5 rounded-full ${
          active
            ? 'bg-[var(--status-completed-dot)]'
            : 'bg-[var(--color-text-subtle)]'
        }`}
      />
      {active ? 'Ativa' : 'Inativa'}
    </span>
  )
}

function EditIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="mr-2 size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
    </svg>
  )
}

export default EntityDetailPage
