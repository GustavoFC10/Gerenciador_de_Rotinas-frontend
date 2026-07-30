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
  RoutineControlData,
  RoutineListInteractionProps,
  UpdateClientInput,
  UpdateRoutineInput,
} from '../types/domain'
import { canAccessDepartment, isLeader } from '../utils/permissions'
import {
  ROUTINE_LIST_MODE,
  buildRoutineListViewData,
} from '../utils/routineListItems'

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
  onRoutineUpdate?: (routineId: EntityId, changes: UpdateRoutineInput) => void
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

    if (nextDivisionId && nextDivisionId !== spreadsheetDivisionId) {
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

  function handleRoutineSave(changes: UpdateRoutineInput) {
    if (!routine) return
    onRoutineUpdate?.(routine.id, changes)
    setIsEditing(false)
    setSavedMessage('Configuração da rotina atualizada nesta sessão.')
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <WorkspaceBar
        context={{
          label: `Planilha ${spreadsheetName} · ${spreadsheetDivisionName}`,
          to: spreadsheetPath,
          onBack: wasOpenedFromSpreadsheet ? () => navigate(-1) : undefined,
        }}
        label={type === 'client' ? 'Empresa' : 'Rotina'}
        title={entity.name}
        meta={<EntityStatus active={entity.active !== false} />}
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
        canEdit={canEdit}
        onEdit={() => setIsEditing(true)}
      />

      <section
        className="mt-5 min-h-0 flex-1"
        aria-labelledby="entity-task-list-title"
      >
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2
              id="entity-task-list-title"
              className="text-lg font-black tracking-tight text-[var(--color-text-strong)]"
            >
              {type === 'client'
                ? 'Rotinas desta empresa'
                : 'Empresas desta rotina'}
            </h2>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              Tarefas da competência {formattedCompetence}.
            </p>
          </div>
          <span className="rounded-full border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] px-3 py-1.5 text-xs font-bold text-[var(--color-text-muted)]">
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
          departments={data.departments}
          divisions={data.divisions ?? []}
          onClose={() => setIsEditing(false)}
          onSave={handleClientSave}
        />
      )}

      {isEditing && routine && (
        <EntityEditModal
          type="routine"
          entity={routine}
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
  canEdit,
  onEdit,
}: {
  type: EntityType
  client?: Client
  routine?: Routine
  data: RoutineControlData
  spreadsheetDepartmentId: EntityId
  canEdit: boolean
  onEdit: () => void
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
      <div className="flex flex-wrap items-start justify-between gap-4 px-4 py-4 sm:px-5">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-[var(--radius-control)] bg-[var(--color-brand-soft)] text-[var(--color-brand)]">
            {type === 'client' ? <BuildingIcon /> : <RoutineIcon />}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-black text-[var(--color-text-strong)]">
              {type === 'client'
                ? client?.legalName || client?.name
                : routine?.shortName}
            </p>
            <p className="mt-1 max-w-3xl text-sm leading-5 text-[var(--color-text-muted)]">
              {type === 'client'
                ? 'Cadastro usado para identificar a empresa e organizar suas rotinas aplicáveis.'
                : routine?.description ||
                  'Rotina operacional vinculada às empresas desta planilha.'}
            </p>
          </div>
        </div>

        {!canEdit && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-panel-soft-bg)] px-2.5 py-1 text-xs font-bold text-[var(--color-text-muted)] ring-1 ring-[var(--color-divider)]">
            <LockIcon />
            Somente leitura
          </span>
        )}
      </div>

      <dl
        className={`grid border-t border-[var(--color-divider)] sm:grid-cols-2 ${
          client ? 'xl:grid-cols-6' : 'xl:grid-cols-4'
        }`}
      >
        {type === 'client' && client ? (
          <>
            <SummaryField label="Código interno" value={client.code} />
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
              value={`Dia ${routine.defaultDueDay ?? 20}`}
            />
            <SummaryField
              label="Empresas vinculadas"
              value={`${linkedClientCount} empresa${linkedClientCount === 1 ? '' : 's'}`}
            />
          </>
        ) : null}
      </dl>

      {canEdit && (
        <div className="flex items-center justify-between gap-3 border-t border-[var(--color-divider)] bg-[var(--color-panel-soft-bg)] px-4 py-2.5 sm:px-5">
          <p className="text-xs leading-5 text-[var(--color-text-muted)]">
            Dados, configuração e inativação ficam centralizados nesta página.
          </p>
          <button
            type="button"
            onClick={onEdit}
            className="shrink-0 text-xs font-extrabold text-[var(--color-brand)] hover:text-[var(--color-brand-strong)] focus-visible:underline"
          >
            Abrir edição
          </button>
        </div>
      )}
    </section>
  )
}

function SummaryField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="border-b border-[var(--color-divider)] px-4 py-3 last:border-b-0 sm:border-r sm:[&:nth-child(even)]:border-r-0 xl:border-b-0 xl:[&:nth-child(even)]:border-r xl:last:border-r-0">
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

function BuildingIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 21V4h11v17M15 9h5v12M2 21h20" />
      <path d="M8 8h3M8 12h3M8 16h3M18 13h.01M18 17h.01" />
    </svg>
  )
}

function RoutineIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m17 2 4 4-4 4" />
      <path d="M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4" />
      <path d="M21 13v2a3 3 0 0 1-3 3H3" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-3"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="5" y="10" width="14" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  )
}

export default EntityDetailPage
