import type { AttachmentResource, FileTarget } from './files'

export type UploadJobState =
  | 'queued'
  | 'preparing'
  | 'uploading'
  | 'verifying'
  | 'linking'
  | 'completed'
  | 'error'
  | 'cancelling'
  | 'cancelled'

export interface UploadJob {
  id: string
  batchId: string
  destination: FileTarget
  label: string
  fileName: string
  sizeBytes: number
  state: UploadJobState
  progress: number | null
  error?: string
  retryAt?: number
  attachment?: AttachmentResource
  reconciled?: boolean
  canRetry?: boolean
  cancelFailed?: boolean
}

export interface UploadBatchResult {
  id: string
  label: string
  purpose: FileTarget['purpose']
  completed: number
  failed: number
  cancelled: number
}

export function isUploadActive(job: UploadJob): boolean {
  return !['completed', 'error', 'cancelled'].includes(job.state)
}
