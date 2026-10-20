import { useEffect, useRef } from 'react'

import { useFileUpload } from '../../hooks/useFileUpload'
import { useFileUploads } from '../../hooks/useFileUploads'
import {
  attachmentAccept,
  fileOwnerPath,
  imageAccept,
} from '../../services/fileService'
import type { FileTarget } from '../../types/files'
import Button from '../ui/Button'
import FileIcon from './FileIcon'
import FileUploadFeedback from './FileUploadFeedback'

interface FileUploadControlProps {
  destination: FileTarget
  disabled?: boolean
  label?: string
  onChanged: () => Promise<void>
  onBusyChange?: (busy: boolean) => void
}

export default function FileUploadControl({
  destination,
  disabled,
  label,
  onChanged,
  onBusyChange,
}: FileUploadControlProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const queue = useFileUploads()
  const upload = useFileUpload({ destination, disabled, onChanged })
  const ownJobs = queue.jobs.filter(
    (job) => fileOwnerPath(job.destination) === fileOwnerPath(destination),
  )
  const activeJobs = ownJobs.filter(
    (job) => !['completed', 'cancelled', 'error'].includes(job.state),
  )
  const pendingJobs = ownJobs.filter(
    (job) => !['completed', 'cancelled'].includes(job.state),
  )
  const busy = queue.isAvailable ? activeJobs.length > 0 : upload.busy
  useEffect(() => {
    onBusyChange?.(busy)
    return () => onBusyChange?.(false)
  }, [onBusyChange, busy])
  const isAttachment = destination.purpose === 'task_attachment'
  const uploadLabel =
    label ?? (isAttachment ? 'Anexar arquivo' : 'Selecionar imagem')
  const formats = isAttachment
    ? 'PDF, TXT, CSV, JPEG, PNG ou WebP, até 20 MiB.'
    : 'JPEG, PNG ou WebP, até 5 MiB e 16 megapixels. Recorte quadrado central.'

  return (
    <div
      className="flex min-h-8 min-w-0 max-w-sm items-center gap-2"
      aria-busy={busy}
    >
      <input
        ref={inputRef}
        type="file"
        hidden
        aria-label={uploadLabel}
        accept={isAttachment ? attachmentAccept : imageAccept}
        disabled={disabled || busy || (!queue.isAvailable && upload.hasPending)}
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (!file) return
          if (queue.isAvailable) queue.enqueue([file], destination, uploadLabel)
          else void upload.run(file)
        }}
      />
      {(queue.isAvailable || (!upload.hasPending && !upload.busy)) && (
        <Button
          size="sm"
          tone="neutral"
          disabled={disabled || busy}
          title={formats}
          onClick={() => inputRef.current?.click()}
          className="gap-1.5"
        >
          <FileIcon name={isAttachment ? 'attachment' : 'image'} />
          {uploadLabel}
        </Button>
      )}
      {queue.isAvailable ? (
        pendingJobs.length > 0 && (
          <Button
            size="sm"
            tone="ghost"
            className="shrink-0 gap-1.5"
            onClick={queue.openPanel}
          >
            <FileIcon
              name={busy ? 'progress' : 'retry'}
              className={`size-4 ${busy ? 'animate-spin motion-reduce:animate-none' : ''}`}
            />
            Envios
          </Button>
        )
      ) : (
        <FileUploadFeedback upload={upload} />
      )}
    </div>
  )
}
