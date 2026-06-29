function RoutineListNoteField({
  item,
  onChange,
  placeholder = 'Observacao...',
  rows = 1,
  className = '',
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
