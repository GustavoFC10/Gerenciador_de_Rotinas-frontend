import { useRef } from 'react'
import { useFileUploads } from '../../hooks/useFileUploads'
import { attachmentAccept } from '../../services/fileService'
import type { FileTarget } from '../../types/files'
import Button from '../ui/Button'
import FileIcon from './FileIcon'

export default function TaskAttachmentPicker({
  destination,
  label,
  disabled = false,
}: {
  destination: FileTarget
  label: string
  disabled?: boolean
}) {
  const input = useRef<HTMLInputElement | null>(null)
  const { enqueue, isAvailable } = useFileUploads()
  return (
    <>
      <input
        ref={input}
        type="file"
        accept={attachmentAccept}
        multiple
        hidden
        disabled={disabled || !isAvailable}
        tabIndex={-1}
        aria-label="Selecionar anexos"
        onChange={(event) => {
          const files = Array.from(event.currentTarget.files ?? [])
          event.currentTarget.value = ''
          if (files.length) enqueue(files, destination, label)
        }}
      />
      <Button
        size="sm"
        tone="neutral"
        className="gap-1.5"
        disabled={disabled || !isAvailable}
        aria-label="Anexar arquivo"
        onClick={() => input.current?.click()}
      >
        <FileIcon name="attachment" />
        <span>
          Anexar<span className="hidden sm:inline"> arquivo</span>
        </span>
      </Button>
    </>
  )
}
