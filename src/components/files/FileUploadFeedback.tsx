import type { useFileUpload } from '../../hooks/useFileUpload'
import Button from '../ui/Button'
import FileIcon from './FileIcon'

// Resultados e mensagens longas pertencem ao sistema global de avisos.
export default function FileUploadFeedback({
  upload,
}: {
  upload: ReturnType<typeof useFileUpload>
  onDismiss?: () => void
}) {
  const { busy, hasPending, cancelling, progress, phase, status, error } =
    upload
  if (!busy && !hasPending) return null
  return (
    <div className="flex min-w-0 items-center gap-2">
      {busy && (
        <div className="min-w-0 flex-1" role="status">
          <p className="truncate text-xs font-semibold text-[var(--color-text-muted)]">
            {status}
            {phase === 'uploading' && progress !== null ? ` ${progress}%` : ''}
          </p>
          <div
            role="progressbar"
            aria-label={
              phase === 'uploading'
                ? 'Envio do arquivo'
                : 'Verificação do arquivo'
            }
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={
              phase === 'uploading' && progress !== null ? progress : undefined
            }
            className="mt-1 h-0.5 overflow-hidden rounded-full bg-[var(--color-panel-border)]"
          >
            <div
              className={`h-full rounded-full bg-[var(--color-brand)] ${phase === 'uploading' && progress !== null ? '' : 'w-1/3 animate-pulse motion-reduce:animate-none'}`}
              style={
                phase === 'uploading' && progress !== null
                  ? { width: `${progress}%` }
                  : undefined
              }
            />
          </div>
        </div>
      )}
      {!busy && hasPending && (
        <Button
          tone="neutral"
          size="sm"
          title={error}
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
  )
}
