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
      className={`w-full resize-none rounded-lg border px-2.5 py-2 text-sm text-slate-700 outline-none transition focus:ring-2 ${className}`}
      aria-label={`Observacao de ${item.companyName}`}
    />
  )
}

export default RoutineListNoteField
