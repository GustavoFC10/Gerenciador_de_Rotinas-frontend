import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'

import EntityEditModal, {
  type RoutineEditInput,
} from '../components/entities/EntityEditModal'
import RoutineListComparison from '../components/routine-control/list/RoutineListComparison'
import Button from '../components/ui/Button'
import {
  getClientTaxRegimeLabel,
  getRoutineRecurrenceLabel,
} from '../constants/entityOptions'
import { ROUTES } from '../constants/routes'
import { useAppState } from '../hooks/useAppState'
import WorkspaceBar from '../layouts/WorkspaceBar'
import type { ClientCompanyPatch } from '../services/companyService'
import type {
  Client,
  EntityId,
  Routine,
  RoutineControlData,
  RoutineListInteractionProps,
  Screen,
} from '../types/domain'
import { isOrganizationAdmin } from '../utils/permissions'
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
  screenId?: EntityId | null
  screenName?: string | null
  screenDepartmentId?: EntityId | null
  onClientUpdate?: (
    clientId: EntityId,
    changes: ClientCompanyPatch,
  ) => Promise<void>
  onRoutineUpdate?: (
    routineId: EntityId,
    changes: RoutineEditInput,
  ) => Promise<void>
  onClientArchive?: (clientId: EntityId) => Promise<void>
}

function EntityDetailPage({
  type,
  data,
  screenId,
  screenName,
  screenDepartmentId,
  onClientUpdate,
  onRoutineUpdate,
  onClientArchive,
  onItemOpen,
  onItemStatusChange,
  getAllowedStatusChanges,
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
  const catalogPath = type === 'client' ? ROUTES.COMPANIES : ROUTES.ROUTINES
  const wasOpenedFromCatalog =
    new URLSearchParams(location.search).get('source') === 'catalog'
  const wasOpenedFromSpreadsheet = Boolean(
    (location.state as { fromSpreadsheet?: boolean } | null)?.fromSpreadsheet,
  )
  const screenPath = screenId
    ? ROUTES.SPREADSHEET + '?screenId=' + encodeURIComponent(screenId)
    : catalogPath
  const contextLabel = wasOpenedFromCatalog
    ? type === 'client'
      ? 'Todas as empresas'
      : 'Todas as rotinas'
    : screenName
      ? 'Tela ' + screenName
      : type === 'client'
        ? 'Empresas'
        : 'Rotinas'

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
            O cadastro pode ter sido arquivado, removido da tela atual ou não
            estar disponível para seu acesso.
          </p>
          <Link
            to={screenPath}
            className="mt-5 inline-flex min-h-9 items-center rounded-[var(--radius-control)] bg-[var(--color-button-primary-bg)] px-3 text-sm font-bold text-[var(--color-button-primary-text)] hover:bg-[var(--color-button-primary-hover-bg)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-control-focus)]"
          >
            Voltar
          </Link>
        </div>
      </div>
    )
  }

  const canEdit =
    isOrganizationAdmin(user) &&
    (type === 'client' ? Boolean(onClientUpdate) : Boolean(onRoutineUpdate))

  async function handleClientSave(changes: ClientCompanyPatch) {
    if (!client || !onClientUpdate) return
    await onClientUpdate(client.id, changes)
    setSavedMessage('Dados da empresa atualizados.')
  }

  async function handleRoutineSave(changes: RoutineEditInput) {
    if (!routine || !onRoutineUpdate) return
    await onRoutineUpdate(routine.id, changes)
    setSavedMessage('Identidade e nova versão da rotina foram publicadas.')
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <WorkspaceBar
        context={{
          label: contextLabel,
          to: wasOpenedFromCatalog ? catalogPath : screenPath,
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
              <SettingsIcon />
              Configurações
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
        itemCount={listViewData.items.length}
        fallbackDepartmentId={screenDepartmentId}
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
              ? 'Tarefas desta empresa'
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
          key={type + ':' + entityId}
          items={listViewData.items}
          onItemOpen={onItemOpen}
          onItemStatusChange={onItemStatusChange}
          getAllowedStatusChanges={getAllowedStatusChanges}
          showHeader={false}
        />
      </section>

      {isEditing && client && onClientUpdate && (
        <EntityEditModal
          type="client"
          entity={client}
          onClose={() => setIsEditing(false)}
          onSave={handleClientSave}
          onArchive={
            onClientArchive
              ? () => onClientArchive(client.id)
              : undefined
          }
          routines={data.routines}
          period={competence}
        />
      )}

      {isEditing && routine && onRoutineUpdate && (
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
  itemCount,
  fallbackDepartmentId,
}: {
  type: EntityType
  client?: Client
  routine?: Routine
  data: RoutineControlData
  itemCount: number
  fallbackDepartmentId?: EntityId | null
}) {
  const department = data.departments.find(
    (item) => item.id === (routine?.departmentId ?? fallbackDepartmentId),
  )
  const screens = getEntityScreens(data.screens, client, routine)
  const screenLabel = screens.length
    ? screens.map((screen) => screen.name).join(', ')
    : 'Não exibida em nenhuma tela'
  const assigneeName = routine?.defaultAssigneeMemberId
    ? (data.employees.find(
        (employee) => employee.id === routine.defaultAssigneeMemberId,
      )?.name ?? 'Responsável configurado')
    : 'Não definido'

  return (
    <section className="rounded-[var(--radius-panel)] border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] shadow-[var(--shadow-panel)]">
      <dl className="grid sm:grid-cols-2 xl:grid-cols-4">
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
            <SummaryField label="CNPJ" value={client.document || 'Não informado'} />
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
              value={formatRoutineSchedule(routine)}
            />
            <SummaryField label="Responsável padrão" value={assigneeName} />
            <SummaryField
              label="Telas"
              value={String(screens.length) + ' configurada' + (screens.length === 1 ? '' : 's')}
            />
            <SummaryField
              label="Tarefas na competência"
              value={String(itemCount) + ' tarefa' + (itemCount === 1 ? '' : 's')}
            />
            <SummaryField
              label="Exibição nas telas"
              value={screenLabel}
              className="sm:col-span-2"
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

function getEntityScreens(
  screens: Screen[],
  client?: Client,
  routine?: Routine,
): Screen[] {
  if (client) {
    return screens.filter((screen) =>
      screen.companies.some((company) => company.id === client.id),
    )
  }

  if (routine) {
    return screens.filter((screen) =>
      screen.routines.some((item) => item.id === routine.id),
    )
  }

  return []
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
      className={
        'border-b border-r border-[var(--color-divider)] px-4 py-3 sm:[&:nth-child(even)]:border-r-0 xl:[&:nth-child(even)]:border-r xl:[&:nth-child(4n)]:border-r-0 ' +
        className
      }
    >
      <dt className="text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--color-text-subtle)]">
        {label}
      </dt>
      <dd className="mt-1 break-words text-sm font-extrabold text-[var(--color-text-strong)]">
        {value}
      </dd>
    </div>
  )
}

function EntityStatus({ active }: { active: boolean }) {
  return (
    <span
      className={
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ' +
        (active
          ? 'border-[var(--status-completed-border)] bg-[var(--status-completed-bg)] text-[var(--status-completed-text)]'
          : 'border-[var(--color-panel-border)] bg-[var(--color-panel-soft-bg)] text-[var(--color-text-muted)]')
      }
    >
      <span
        className={
          'size-1.5 rounded-full ' +
          (active
            ? 'bg-[var(--status-completed-dot)]'
            : 'bg-[var(--color-text-subtle)]')
        }
      />
      {active ? 'Ativa' : 'Inativa'}
    </span>
  )
}

function SettingsIcon() {
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
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.12 2.12-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56v.08h-3v-.08A1.7 1.7 0 0 0 10.68 18.66a1.7 1.7 0 0 0-1.88.34l-.06.06-2.12-2.12.06-.06A1.7 1.7 0 0 0 7.02 15a1.7 1.7 0 0 0-1.56-1.03h-.08v-3h.08A1.7 1.7 0 0 0 7.02 9.94a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.12-2.12.06.06a1.7 1.7 0 0 0 1.88.34 1.7 1.7 0 0 0 1.03-1.56v-.08h3v.08a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.88-.34l.06-.06L19.8 8l-.06.06a1.7 1.7 0 0 0-.34 1.88 1.7 1.7 0 0 0 1.56 1.03h.08v3h-.08A1.7 1.7 0 0 0 19.4 15Z" />
    </svg>
  )
}

export type { RoutineEditInput }
export default EntityDetailPage
