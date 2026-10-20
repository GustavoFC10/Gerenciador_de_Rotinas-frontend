import { useContext } from 'react'

import { FileUploadsContext } from '../contexts/fileUploadsContextDefinition'

export function useFileUploads() {
  return useContext(FileUploadsContext)
}
