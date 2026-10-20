import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { useFileUploads } from '../../hooks/useFileUploads'
import { useOverlayDialog } from '../../hooks/useOverlayDialog'
import { isUploadActive } from '../../types/fileUploads'
import Button from '../ui/Button'
import IconButton from '../ui/IconButton'
import FileIcon from './FileIcon'
import FileUploadProgress from './FileUploadProgress'
import { fileUploadStateLabel } from '../../utils/fileUploadPresentation'

export default function UploadsPanel() {
  const uploads = useFileUploads()
  const dialogRef = useRef<HTMLElement | null>(null)
  const [now, setNow] = useState(Date.now)
  useOverlayDialog(dialogRef, uploads.closePanel)
  useEffect(() => {
    if (!uploads.jobs.some((job) => job.retryAt && job.retryAt > now)) return
    const timer = setTimeout(() => setNow(Date.now()), 1000)
    return () => clearTimeout(timer)
  }, [now, uploads.jobs])
  const completed = uploads.jobs.filter(
    (job) => job.state === 'completed',
  ).length
  const active = uploads.jobs.filter(isUploadActive).length
  const failed = uploads.jobs.filter((job) => job.state === 'error').length
  return createPortal(
    <div
      className="fixed inset-0 z-[150] flex justify-end bg-[var(--color-overlay-bg)] backdrop-blur-[2px]"
      data-overlay-dialog="uploads"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) uploads.closePanel()
      }}
    >
      <aside
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="uploads-panel-title"
        tabIndex={-1}
        className="flex h-dvh w-full max-w-md flex-col border-l border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] text-[var(--color-text-strong)] shadow-[var(--shadow-floating)] outline-none"
      >
        <header className="flex items-start justify-between gap-3 border-b border-[var(--color-divider)] p-4 sm:p-5">
          <div className="min-w-0">
            <h2 id="uploads-panel-title" className="text-base font-extrabold">
              Envios
            </h2>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              {active
                ? `${active} em andamento`
                : `${completed} ${completed === 1 ? 'concluído' : 'concluídos'}`}
              {failed ? ` · ${failed} com pendência` : ''}
            </p>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              Você pode continuar navegando pelo site.
            </p>
          </div>
          <IconButton
            label="Recolher painel de envios"
            tone="ghost"
            onClick={uploads.closePanel}
            data-overlay-close
          >
            <FileIcon name="close" />
          </IconButton>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {!uploads.jobs.length && (
            <p className="p-5 text-sm text-[var(--color-text-muted)]">
              Nenhum envio nesta sessão.
            </p>
          )}
          <ul className="divide-y divide-[var(--color-divider)]">
            {uploads.jobs.map((job) => (
              <li key={job.id} className="space-y-2 p-4 sm:px-5">
                <div className="flex items-center gap-2">
                  <span
                    className={`shrink-0 ${job.state === 'error' ? 'text-[var(--status-error-text)]' : job.state === 'completed' ? 'text-[var(--status-completed-text)]' : 'text-[var(--color-text-muted)]'}`}
                  >
                    <FileIcon
                      name={
                        job.state === 'completed' ? 'success' : 'attachment'
                      }
                    />
                  </span>
                  <span
                    className="min-w-0 flex-1 truncate text-xs font-bold"
                    title={job.fileName}
                  >
                    {job.fileName}
                  </span>
                  {['completed', 'cancelled'].includes(job.state) ? (
                    <IconButton
                      label={`Dispensar ${job.fileName}`}
                      tone="ghost"
                      onClick={() => uploads.dismiss(job.id)}
                    >
                      <FileIcon name="close" />
                    </IconButton>
                  ) : (
                    <IconButton
                      label={`Cancelar envio de ${job.fileName}`}
                      tone="ghost"
                      disabled={
                        job.state === 'cancelling' || job.state === 'linking'
                      }
                      onClick={() => void uploads.cancel(job.id)}
                    >
                      <FileIcon name="close" />
                    </IconButton>
                  )}
                </div>
                <p
                  className="truncate text-xs text-[var(--color-text-muted)]"
                  title={job.label}
                >
                  {job.label}
                </p>
                <p
                  role="status"
                  className={`text-xs ${job.state === 'error' ? 'text-[var(--status-error-text)]' : 'text-[var(--color-text-muted)]'}`}
                >
                  {fileUploadStateLabel(job)}
                </p>
                {isUploadActive(job) && (
                  <FileUploadProgress
                    state={job.state}
                    progress={job.progress}
                    label={`Progresso de ${job.fileName}`}
                  />
                )}
                {job.state === 'error' && (
                  <>
                    <p className="text-xs leading-relaxed break-words text-[var(--color-text-muted)]">
                      {job.error}
                    </p>
                    {job.canRetry !== false && (
                      <Button
                        size="sm"
                        tone="neutral"
                        className="gap-1.5"
                        disabled={Boolean(job.retryAt && job.retryAt > now)}
                        onClick={() => uploads.retry(job.id)}
                      >
                        <FileIcon name="retry" />
                        {job.retryAt && job.retryAt > now
                          ? 'Aguarde para tentar novamente'
                          : job.cancelFailed
                            ? 'Tentar cancelar'
                            : 'Tentar novamente'}
                      </Button>
                    )}
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
        <footer className="shrink-0 border-t border-[var(--color-divider)] bg-[var(--color-panel-soft-bg)] px-4 py-3 text-xs leading-relaxed text-[var(--color-text-muted)] sm:px-5">
          Recolher este painel mantém os envios em andamento. Recarregar ou
          fechar a página interrompe os envios neste navegador.
        </footer>
      </aside>
    </div>,
    document.body,
  )
}
