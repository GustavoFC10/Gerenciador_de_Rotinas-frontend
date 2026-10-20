import FileIcon from './FileIcon'

export default function TaskAttachmentCount({
  count,
  className = '',
}: {
  count: number
  className?: string
}) {
  if (!Number.isInteger(count) || count <= 0) return null

  const label = `${count} ${count === 1 ? 'anexo' : 'anexos'}`
  return (
    <span
      aria-label={label}
      title={label}
      className={`inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap text-[10px] font-bold tabular-nums ${className}`}
    >
      <FileIcon name="attachment" className="size-3" />
      <span aria-hidden="true">{count}</span>
    </span>
  )
}
