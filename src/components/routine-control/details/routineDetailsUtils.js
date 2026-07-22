export function getRoutineAttachments(task) {
  if (Array.isArray(task.attachments)) {
    const knownAttachments = task.attachments.map((attachment, index) => ({
      ...attachment,
      id: attachment.id ?? `${task.id}-attachment-${index + 1}`,
    }))
    const indicatedCount = Math.max(
      0,
      Number(task.indicators?.attachments) || 0,
    )
    const placeholderCount = Math.max(
      0,
      indicatedCount - knownAttachments.length,
    )

    return [
      ...knownAttachments,
      ...Array.from({ length: placeholderCount }, (_, index) => ({
        id: `${task.id}-attachment-${knownAttachments.length + index + 1}`,
      })),
    ]
  }

  const count = Math.max(0, Number(task.indicators?.attachments) || 0)

  return Array.from({ length: count }, (_, index) => ({
    id: `${task.id}-attachment-${index + 1}`,
  }))
}

export function formatDisplayDate(dateValue, options = {}) {
  if (!dateValue) return 'Sem prazo'

  const [year, month, day] = dateValue.split('-').map(Number)
  const date = new Date(year, month - 1, day)

  if (Number.isNaN(date.getTime())) return dateValue

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: options.long ? 'long' : 'short',
    year: 'numeric',
  }).format(date)
}
