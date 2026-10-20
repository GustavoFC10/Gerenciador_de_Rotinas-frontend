import { useFileUploads } from '../../hooks/useFileUploads'
import { isUploadActive } from '../../types/fileUploads'
import Button from '../ui/Button'

export default function UploadsTrigger() {
  const uploads = useFileUploads()
  if (!uploads.isAvailable) return null
  const attention = uploads.jobs.filter(
    (job) => isUploadActive(job) || job.state === 'error',
  ).length
  return (
    <Button
      size="sm"
      tone="neutral"
      className="relative h-8 min-w-8 gap-1.5 max-xl:w-8 max-xl:px-0"
      aria-label={
        attention
          ? `Envios: ${attention} em andamento ou com pendências`
          : 'Abrir painel de envios'
      }
      aria-haspopup="dialog"
      aria-expanded={uploads.panelOpen}
      onClick={uploads.openPanel}
      title="Envios"
    >
      <svg
        viewBox="0 0 24 24"
        className="size-4 shrink-0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 16V3m-5 5 5-5 5 5M4 15v5h16v-5" />
      </svg>
      <span className="hidden xl:inline">Envios</span>
      {attention > 0 && (
        <span
          aria-hidden="true"
          className="absolute -top-1.5 -right-1.5 grid min-w-4 place-items-center rounded-full bg-[var(--color-brand)] px-1 text-[9px] leading-4 font-bold text-[var(--color-button-primary-text)] xl:static"
        >
          {attention}
        </span>
      )}
    </Button>
  )
}
