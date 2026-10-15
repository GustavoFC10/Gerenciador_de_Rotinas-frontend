import { useQuery } from '@tanstack/react-query'

import { queryKeys, type OrganizationQueryScope } from '../query/queryKeys'
import { fileOwnerPath, fileService } from '../services/fileService'
import type { FileTarget } from '../types/files'

export function useTaskAttachments(
  scope: OrganizationQueryScope,
  destination: FileTarget,
) {
  return useQuery({
    queryKey: queryKeys.taskAttachments(scope, fileOwnerPath(destination)),
    retry: false,
    queryFn: ({ signal }) => fileService.listAttachments(destination, signal),
  })
}

export function useImageSlot(
  scope: OrganizationQueryScope,
  destination: FileTarget,
) {
  return useQuery({
    queryKey: queryKeys.imageSlot(scope, fileOwnerPath(destination)),
    retry: false,
    queryFn: async ({ signal }) =>
      (await fileService.getImageSlot(destination, signal)).data,
  })
}
