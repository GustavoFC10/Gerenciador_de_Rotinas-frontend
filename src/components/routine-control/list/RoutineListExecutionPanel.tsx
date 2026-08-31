import type { ReactNode } from 'react'

import { RoutineStatusControl } from '../shared/RoutineCardActions'
import RoutineListQuickActions from './RoutineListQuickActions'
import type { RoutineListItem, RoutineStatus } from '../../../types/domain'

function RoutineListExecutionPanel({
  item,
  onStatusChange,
  allowedStatusChanges,
  onQuickAction,
  className = '',
}: {
  item: RoutineListItem
  onStatusChange?: (item: RoutineListItem, status: RoutineStatus) => void
  allowedStatusChanges?: readonly RoutineStatus[]
  onQuickAction?: (item: RoutineListItem, action: 'attach') => void
  className?: string
}) {
  return (
    <PanelShell className={className}>
      <div className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
        <div className="min-w-0">
          <RoutineStatusControl
            task={item.task}
            onStatusChange={(_, status) => onStatusChange?.(item, status)}
            allowedStatusChanges={allowedStatusChanges}
            variant="menu"
          />
        </div>

        <PanelActions item={item} onQuickAction={onQuickAction} />
      </div>
    </PanelShell>
  )
}

function PanelShell({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
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
  onQuickAction,
}: {
  item: RoutineListItem
  onQuickAction?: (item: RoutineListItem, action: 'attach') => void
}) {
  return (
    <div className="flex shrink-0 items-center justify-end gap-1.5">
      <RoutineListQuickActions
        item={item}
        actions={['attach']}
        onAction={onQuickAction}
        showCounts
      />
    </div>
  )
}

export default RoutineListExecutionPanel
