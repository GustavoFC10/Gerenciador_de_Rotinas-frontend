import { describe, expect, it } from 'vitest'

import { getRoutineAttachments } from './routineDetailsUtils'

describe('getRoutineAttachments', () => {
  it('preserves file metadata without fabricating resources from the count', () => {
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

    expect(attachments).toHaveLength(1)
    expect(attachments[0]).toMatchObject({
      id: 'task-1-attachment-1',
      name: 'guia.pdf',
      mimeType: 'application/pdf',
      previewType: 'pdf',
      sizeLabel: '120 KB',
    })
  })

  it('does not turn an attachment count into a fictional gallery', () => {
    expect(
      getRoutineAttachments({ id: 'task', indicators: { attachments: 3 } }),
    ).toEqual([])
  })

  it('does not create placeholders when every saved file is known', () => {
    const attachments = getRoutineAttachments({
      id: 'task-2',
      attachments: [
        { id: 'file-1', name: 'planilha.csv' },
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
