import type { useFileUpload } from '../../hooks/useFileUpload'
import Button from '../ui/Button'
import IconButton from '../ui/IconButton'
import FileIcon from './FileIcon'

export default function FileUploadFeedback({
  upload,
  onDismiss,
}: {
  upload: ReturnType<typeof useFileUpload>
  onDismiss?: () => void
}) {
  const { status, error, busy, hasPending, cancelling, fileName } = upload
  if (!status && !error) return null
  const tone = error
    ? 'border-[var(--status-error-border)] bg-[var(--status-error-bg)] text-[var(--status-error-text)]'
    : busy
      ? 'border-[var(--status-progress-border)] bg-[var(--status-progress-bg)] text-[var(--status-progress-text)]'
      : 'border-[var(--color-panel-border)] bg-[var(--color-panel-soft-bg)] text-[var(--color-text-muted)]'
  return (
    <div
      className={`flex min-w-0 items-start gap-2 rounded-[var(--radius-control)] border px-3 py-2 ${tone}`}
    >
      <span className="pt-0.5">
        <FileIcon
          name={
            busy
              ? 'progress'
              : error
                ? 'attachment'
                : status === 'Arquivo salvo.'
                  ? 'success'
                  : 'close'
          }
          className={`size-4 ${busy ? 'animate-spin motion-reduce:animate-none' : ''}`}
        />
      </span>
      <div className="min-w-0 flex-1">
        {fileName && (
          <p className="truncate text-xs font-bold" title={fileName}>
            {fileName}
          </p>
        )}
        <p
          role={error ? 'alert' : 'status'}
          className="text-xs font-semibold leading-5"
        >
          {error || status}
        </p>
        {(hasPending || busy) && (
          <div className="mt-2 flex flex-wrap gap-2">
            {!busy && hasPending && (
              <Button
                tone="neutral"
                size="sm"
                onClick={() => void upload.run()}
                className="gap-1.5"
              >
                <FileIcon name="retry" />
                Retomar
              </Button>
            )}
            <Button
              tone="ghost"
              size="sm"
              disabled={cancelling}
              onClick={() => void upload.cancel()}
            >
              {cancelling ? 'Cancelando…' : 'Cancelar envio'}
            </Button>
          </div>
        )}
      </div>
      {!busy && !hasPending && (
        <IconButton
          label="Fechar aviso de arquivo"
          tone="ghost"
          className="shrink-0"
          onClick={() => {
            upload.dismiss()
            onDismiss?.()
          }}
        >
          <FileIcon name="close" />
        </IconButton>
      )}
    </div>
  )
}
