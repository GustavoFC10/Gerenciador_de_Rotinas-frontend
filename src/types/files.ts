export interface ImageReference {
  fileId: string
  version: number
  variants: string[]
}

export type FileState =
  'pending' | 'quarantined' | 'scanning' | 'available' | 'rejected' | 'deleted'
export type FilePurpose =
  'task_attachment' | 'member_avatar' | 'department_image'
export type FileTarget =
  | {
      purpose: 'task_attachment'
      target:
        | { competenceId: string; taskId: string }
        | { referenceMonth: string; occurrenceKey: string }
    }
  | { purpose: 'member_avatar'; target: { memberId: string } }
  | { purpose: 'department_image'; target: { departmentId: string } }

export interface PrivateFile {
  fileId: string
  purpose: FilePurpose
  state: FileState
  originalName: string
  sizeBytes: number
  contentType: string
  rejectionReason: string
  createdAt: string
  expiresAt: string | null
  variants: {
    kind: string
    width: number
    height: number
    contentType: string
  }[]
}

export interface UploadIntent {
  intentId: string
  fileId: string
  expiresAt: string
  upload: { url: string; fields: Record<string, string> }
}

export interface AttachmentResource {
  attachmentId: string
  createdByMemberId: string
  createdAt: string
  file: PrivateFile
}

export interface ImageSlot {
  version: number
  file: PrivateFile | null
}
