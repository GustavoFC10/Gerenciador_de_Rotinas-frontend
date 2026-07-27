import type { RoutineListItem } from '../../../types/domain'

function RoutineListNoteField({
  item,
  onChange,
  placeholder = 'Observacao...',
  rows = 1,
  className = '',
}: {
  item: RoutineListItem
  onChange?: (item: RoutineListItem, notes: string) => void
  placeholder?: string
  rows?: number
  className?: string
}) {
  return (
    <textarea
      value={item.notes}
      rows={rows}
      placeholder={placeholder}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
      onChange={(event) => onChange?.(item, event.target.value)}
      className={`w-full resize-none rounded-[var(--radius-control)] border px-2.5 py-2 text-sm text-[var(--color-control-text)] outline-none transition placeholder:text-[var(--color-control-placeholder)] focus:ring-2 ${className}`}
      aria-label={`Observacao de ${item.companyName}`}
    />
  )
}

export default RoutineListNoteField
