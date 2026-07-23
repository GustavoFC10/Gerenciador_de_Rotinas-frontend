import {
  ROUTINE_STATUS,
  routineStatusConfig,
} from '../../../constants/routineStatus.js'

import RoutineListQuickActions from './RoutineListQuickActions.jsx'

const selectableStatusOrder = [
  ROUTINE_STATUS.PENDING,
  ROUTINE_STATUS.IN_PROGRESS,
  ROUTINE_STATUS.ERROR,
  ROUTINE_STATUS.NO_MOVEMENT,
  ROUTINE_STATUS.COMPLETED,
]

const selectableStatusEntries = selectableStatusOrder.map((status) => [
  status,
  routineStatusConfig[status],
])

function RoutineListExecutionPanel({
  item,
  onStatusChange,
  onStatusConfirm,
  onQuickAction,
  className = '',
}) {
  const selectedStatus = item.pendingChange?.status ?? item.status
  const selectedStatusConfig =
    routineStatusConfig[selectedStatus] ?? routineStatusConfig[item.status]
  const hasPendingChange = hasStatusChange(item)

  function selectStatus(status) {
    onStatusChange?.(item, {
      status,
      statusDetail: null,
    })
  }

  return (
    <PanelShell className={className}>
      <div className="grid w-full grid-cols-[minmax(0,1fr)_7.75rem] items-center gap-2">
        <div className="min-w-0">
          <StatusSelector
            selectedStatus={selectedStatus}
            onSelect={selectStatus}
          />
        </div>

        <PanelActions
          item={item}
          hasPendingChange={hasPendingChange}
          selectedStatusConfig={selectedStatusConfig}
          onStatusConfirm={onStatusConfirm}
          onQuickAction={onQuickAction}
        />
      </div>
    </PanelShell>
  )
}

function PanelShell({ children, className = '' }) {
  return (
    <div
      className={`flex flex-col items-start gap-2 px-0 py-0 ${className}`}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      {children}
    </div>
  )
}

function PanelActions({
  item,
  hasPendingChange,
  selectedStatusConfig,
  onStatusConfirm,
  onQuickAction,
}) {
  return (
    <div className="flex w-[7.75rem] shrink-0 items-center justify-end gap-1.5">
      {hasPendingChange && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onStatusConfirm?.(item)
          }}
          className={`min-h-7 rounded-[var(--radius-control)] border px-2.5 text-[10px] font-bold uppercase transition hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-control-focus)] ${selectedStatusConfig.surfaceClass}`}
          aria-label="Confirmar estado"
          title="Confirmar estado"
        >
          Confirmar
        </button>
      )}

      <RoutineListQuickActions
        item={item}
        actions={['attach']}
        onAction={onQuickAction}
        showCounts
      />
    </div>
  )
}

function StatusSelector({ selectedStatus, onSelect }) {
  return (
    <div
      className="inline-flex items-center gap-1 rounded-full border border-[var(--color-list-border)] bg-[var(--color-list-panel-bg)] px-1 py-1"
      aria-label="Alterar estado"
    >
      {selectableStatusEntries.map(([value, config]) => (
        <StatusDotButton
          key={value}
          value={value}
          config={config}
          isSelected={selectedStatus === value}
          onSelect={onSelect}
        />
      ))}
    </div>
  )
}

function StatusDotButton({ value, config, isSelected, onSelect }) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation()
        onSelect?.(value)
      }}
      className={`grid size-6 place-items-center rounded-full transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-control-focus)] ${
        isSelected
          ? 'bg-[var(--color-list-muted-bg)] ring-2 ring-[var(--color-text-strong)]'
          : 'hover:bg-[var(--color-control-hover-bg)]'
      }`}
      aria-label={`Alterar para ${config.label}`}
      title={config.label}
    >
      <span
        className={`size-3.5 rounded-full ${config.dotClass}`}
        aria-hidden="true"
      />
    </button>
  )
}

function hasStatusChange(item) {
  if (!item.pendingChange) return false

  return (
    item.pendingChange.status !== item.status ||
    normalizeDetail(item.pendingChange.statusDetail) !==
      normalizeDetail(item.statusDetail)
  )
}

function normalizeDetail(detail) {
  return detail ?? ''
}

export default RoutineListExecutionPanel
