import { useEffect, useState } from 'react'

import { useFileUploads } from '../../hooks/useFileUploads'
import { isUploadActive } from '../../types/fileUploads'
import Button from '../ui/Button'
import Drawer from '../ui/Drawer'
import IconButton from '../ui/IconButton'
import FileIcon from './FileIcon'
import FileUploadProgress from './FileUploadProgress'
import { fileUploadStateLabel } from '../../utils/fileUploadPresentation'

export default function UploadsPanel() {
  const uploads = useFileUploads()
  const [now, setNow] = useState(Date.now)
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
  return (
    <Drawer
      open
      title="Envios"
      titleId="uploads-panel-title"
      description={
        <>
          <p>
            {active
              ? `${active} em andamento`
              : `${completed} ${completed === 1 ? 'concluído' : 'concluídos'}`}
            {failed ? ` · ${failed} com pendência` : ''}
          </p>
          <p className="mt-1">Você pode continuar navegando pelo site.</p>
        </>
      }
      onClose={uploads.closePanel}
      closeLabel="Recolher painel de envios"
      size="sm"
      overlayId="uploads"
      overlayClassName="z-[150]"
      bodyClassName="p-0"
      footer="Recolher este painel mantém os envios em andamento. Recarregar ou fechar a página interrompe os envios neste navegador."
      footerClassName="justify-start px-4 py-3 text-xs leading-relaxed text-[var(--color-text-muted)] sm:px-5"
    >
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
                  name={job.state === 'completed' ? 'success' : 'attachment'}
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
    </Drawer>
  )
}
