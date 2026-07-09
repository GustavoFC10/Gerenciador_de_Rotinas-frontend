import { routineStatusConfig } from '../../../constants/routineStatus.js'

import RoutineListQuickActions from './RoutineListQuickActions.jsx'

const statusEntries = Object.entries(routineStatusConfig)

function RoutineListExecutionPanel({
  item,
  onStatusChange,
  onStatusConfirm,
  onQuickAction,
  className = '',
}) {
  const selectedStatus = item.pendingStatus ?? item.status
  const selectedStatusConfig =
    routineStatusConfig[selectedStatus] ?? routineStatusConfig[item.status]
  const hasPendingStatus = Boolean(
    item.pendingStatus && item.pendingStatus !== item.status,
  )

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-control)] border border-[var(--color-list-border)] bg-[var(--color-list-muted-bg)] px-2.5 py-2 ${className}`}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <div className="flex items-center gap-1.5">
        <div
          className="flex items-center gap-1 rounded-full border border-[var(--color-list-border)] bg-[var(--color-list-panel-bg)] px-1 py-1"
          aria-label="Alterar estado"
        >
          {statusEntries.map(([value, config]) => {
            const isSelected = selectedStatus === value

            return (
              <button
                key={value}
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  onStatusChange?.(item, value)
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
          })}
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        {hasPendingStatus && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              onStatusConfirm?.(item)
            }}
            className={`min-h-7 rounded-[var(--radius-control)] border px-2.5 text-[10px] font-bold uppercase transition hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-control-focus)] ${selectedStatusConfig.surfaceClass}`}
            aria-label="Atualizar estado"
            title="Atualizar estado"
          >
            Atualizar
          </button>
        )}

        <RoutineListQuickActions
          item={item}
          actions={['attach']}
          onAction={onQuickAction}
          showCounts
        />
      </div>
    </div>
  )
}

export default RoutineListExecutionPanel
