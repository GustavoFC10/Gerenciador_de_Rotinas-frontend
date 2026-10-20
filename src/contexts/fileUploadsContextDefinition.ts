import { createContext } from 'react'

import type { FileTarget } from '../types/files'
import type { UploadJob } from '../types/fileUploads'

export interface FileUploadsContextValue {
  jobs: UploadJob[]
  isAvailable: boolean
  panelOpen: boolean
  enqueue: (files: File[], destination: FileTarget, label: string) => void
  openPanel: () => void
  closePanel: () => void
  retry: (id: string) => void
  cancel: (id: string) => Promise<void>
  dismiss: (id: string) => void
}

const noop = () => undefined
export const FileUploadsContext = createContext<FileUploadsContextValue>({
  jobs: [],
  isAvailable: false,
  panelOpen: false,
  enqueue: noop,
  openPanel: noop,
  closePanel: noop,
  retry: noop,
  cancel: async () => undefined,
  dismiss: noop,
})
