import type { UploadJob } from '../../types/fileUploads'
import { fileUploadStateLabel } from '../../utils/fileUploadPresentation'

export default function FileUploadProgress({
  state,
  progress,
  label,
}: Pick<UploadJob, 'state' | 'progress'> & { label: string }) {
  const determinate =
    state === 'completed' || (state === 'uploading' && progress !== null)
  const waiting =
    state === 'queued' || state === 'error' || state === 'cancelled'
  const value =
    state === 'completed'
      ? 100
      : determinate && progress !== null
        ? Math.min(100, Math.max(0, progress))
        : undefined
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
      aria-valuetext={fileUploadStateLabel({ state, progress })}
      className="h-1 shrink-0 overflow-hidden rounded-full bg-[var(--color-divider)]"
    >
      <div
        className={`h-full rounded-full ${state === 'error' ? 'bg-[var(--status-error-text)]' : 'bg-[var(--color-brand)]'} ${!determinate && !waiting ? 'animate-pulse motion-reduce:animate-none' : ''}`}
        style={{
          width: waiting
            ? state === 'error'
              ? '100%'
              : '0%'
            : value === undefined
              ? '40%'
              : `${value}%`,
        }}
      />
    </div>
  )
}
