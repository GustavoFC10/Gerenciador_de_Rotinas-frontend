import type { TaskAttachment } from '../../../types/domain'

type AttachmentSource = Omit<TaskAttachment, 'id'> & { id?: string }

interface AttachmentTaskSource {
  id: string
  attachments?: AttachmentSource[]
  indicators?: {
    attachments?: number
  }
}

export function getRoutineAttachments(
  task: AttachmentTaskSource,
): TaskAttachment[] {
  if (Array.isArray(task.attachments)) {
    return task.attachments.map((attachment, index) => ({
      ...attachment,
      id: attachment.id ?? `${task.id}-attachment-${index + 1}`,
    }))
  }

  return []
}

export function formatDisplayDate(
  dateValue?: string | null,
  options: { long?: boolean } = {},
): string {
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
