import { describe, expect, it } from 'vitest'

import { getRoutineAttachments } from './routineDetailsUtils.js'

describe('getRoutineAttachments', () => {
  it('preserves file metadata and only fills missing indicated attachments', () => {
    const attachments = getRoutineAttachments({
      id: 'task-1',
      attachments: [
        {
          name: 'guia.pdf',
          mimeType: 'application/pdf',
          previewType: 'pdf',
          sizeLabel: '120 KB',
        },
      ],
      indicators: { attachments: 2 },
    })

    expect(attachments).toHaveLength(2)
    expect(attachments[0]).toMatchObject({
      id: 'task-1-attachment-1',
      name: 'guia.pdf',
      mimeType: 'application/pdf',
      previewType: 'pdf',
      sizeLabel: '120 KB',
    })
    expect(attachments[1]).toEqual({ id: 'task-1-attachment-2' })
  })

  it('does not create placeholders when every saved file is known', () => {
    const attachments = getRoutineAttachments({
      id: 'task-2',
      attachments: [
        { id: 'file-1', name: 'planilha.xlsx' },
        { id: 'file-2', name: 'comprovante.png' },
      ],
      indicators: { attachments: 2 },
    })

    expect(attachments.map((attachment) => attachment.id)).toEqual([
      'file-1',
      'file-2',
    ])
  })
})
