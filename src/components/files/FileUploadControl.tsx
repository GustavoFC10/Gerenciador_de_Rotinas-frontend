import { useEffect, useRef } from 'react'

import { useFileUpload } from '../../hooks/useFileUpload'
import { attachmentAccept, imageAccept } from '../../services/fileService'
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
  const upload = useFileUpload({ destination, disabled, onChanged })
  useEffect(() => {
    onBusyChange?.(upload.busy)
    return () => onBusyChange?.(false)
  }, [onBusyChange, upload.busy])
  const isAttachment = destination.purpose === 'task_attachment'
  const uploadLabel =
    label ?? (isAttachment ? 'Anexar arquivo' : 'Selecionar imagem')
  const formats = isAttachment
    ? 'PDF, TXT, CSV, JPEG, PNG ou WebP, até 20 MiB.'
    : 'JPEG, PNG ou WebP, até 5 MiB e 16 megapixels. Recorte quadrado central.'

  return (
    <div className="min-w-0 max-w-sm space-y-2" aria-busy={upload.busy}>
      <input
        ref={inputRef}
        type="file"
        hidden
        aria-label={uploadLabel}
        accept={isAttachment ? attachmentAccept : imageAccept}
        disabled={disabled || upload.busy || upload.hasPending}
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (file) void upload.run(file)
        }}
      />
      {!upload.hasPending && !upload.busy && (
        <Button
          size="sm"
          tone="neutral"
          disabled={disabled}
          title={formats}
          onClick={() => inputRef.current?.click()}
          className="gap-1.5"
        >
          <FileIcon name={isAttachment ? 'attachment' : 'image'} />
          {uploadLabel}
        </Button>
      )}
      <FileUploadFeedback upload={upload} />
    </div>
  )
}
