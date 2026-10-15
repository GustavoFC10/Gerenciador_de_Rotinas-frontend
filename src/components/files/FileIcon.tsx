type FileIconName =
  | 'attachment'
  | 'image'
  | 'download'
  | 'remove'
  | 'retry'
  | 'close'
  | 'progress'
  | 'success'

const paths: Record<FileIconName, string> = {
  attachment:
    'm8 12.5 6.8-6.8a3 3 0 1 1 4.2 4.2l-8.5 8.5a5 5 0 0 1-7.1-7.1l8.1-8.1',
  image:
    'M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Zm0 12 5-5 4 4 2-2 4 4M8 8h.01',
  download: 'M12 3v12m-4-4 4 4 4-4M5 16v4h14v-4',
  remove: 'M4 7h16M10 3h4l1 4M6 7l1 14h10l1-14M10 11v6M14 11v6',
  retry:
    'M20 7v5h-5M4 17v-5h5M6.1 7a7 7 0 0 1 11.6-2L20 8M4 16l2.3 3A7 7 0 0 0 18 17',
  close: 'm7 7 10 10M17 7 7 17',
  progress: 'M20 12a8 8 0 1 1-8-8',
  success: 'm5 12 4 4L19 6',
}

export default function FileIcon({
  name,
  className = 'size-4',
}: {
  name: FileIconName
  className?: string
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`shrink-0 ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  )
}
