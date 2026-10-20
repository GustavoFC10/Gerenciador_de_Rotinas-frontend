import FileIcon from './FileIcon'

export default function TaskAttachmentCount({
  count,
  uploadingCount = 0,
  className = '',
}: {
  count: number
  uploadingCount?: number
  className?: string
}) {
  const attachments = Number.isInteger(count) && count > 0 ? count : 0
  const uploading =
    Number.isInteger(uploadingCount) && uploadingCount > 0 ? uploadingCount : 0
  if (!attachments && !uploading) return null

  const label = [
    attachments && `${attachments} ${attachments === 1 ? 'anexo' : 'anexos'}`,
    uploading &&
      `${uploading} ${uploading === 1 ? 'anexo' : 'anexos'} em envio`,
  ]
    .filter(Boolean)
    .join('; ')
  return (
    <span
      aria-label={label}
      aria-busy={uploading > 0 || undefined}
      title={label}
      className={`inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap text-[10px] font-bold tabular-nums ${className}`}
    >
      <FileIcon name="attachment" className="size-3" />
      {attachments > 0 && <span aria-hidden="true">{attachments}</span>}
      {uploading > 0 && (
        <FileIcon name="progress" className="size-3 motion-safe:animate-spin" />
      )}
    </span>
  )
}
