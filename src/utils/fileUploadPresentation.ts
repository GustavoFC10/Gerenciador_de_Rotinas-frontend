import type { UploadJob } from '../types/fileUploads'

export function fileUploadStateLabel(
  job: Pick<UploadJob, 'state' | 'progress'> &
    Pick<Partial<UploadJob>, 'cancelFailed'>,
): string {
  switch (job.state) {
    case 'queued':
      return 'Na fila'
    case 'preparing':
      return 'Preparando'
    case 'uploading':
      return job.progress === null
        ? 'Enviando'
        : `Enviando · ${Math.floor(Math.min(100, Math.max(0, job.progress)))}%`
    case 'verifying':
      return 'Verificando'
    case 'linking':
      return 'Finalizando'
    case 'cancelling':
      return 'Cancelando'
    case 'cancelled':
      return 'Cancelado'
    case 'error':
      return job.cancelFailed ? 'Falha ao cancelar' : 'Falha no envio'
    case 'completed':
      return 'Concluído'
  }
}
