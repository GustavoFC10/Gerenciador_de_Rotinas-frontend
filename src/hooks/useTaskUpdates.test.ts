import { describe, expect, it } from 'vitest'

import { removeAttachmentFromTask } from './useTaskUpdates'

describe('removeAttachmentFromTask', () => {
  it('removes a saved file and keeps its indicator synchronized', () => {
    const result = removeAttachmentFromTask(
      {
        attachments: [{ id: 'file-1' }, { id: 'file-2' }],
        indicators: { attachments: 2, comments: 1 },
      },
      'file-1',
    )

    expect(result.attachments).toEqual([{ id: 'file-2' }])
    expect(result.indicators).toEqual({ attachments: 1, comments: 1 })
  })

  it('also removes a generated placeholder by decrementing the count', () => {
    const result = removeAttachmentFromTask(
      {
        attachments: [{ id: 'file-1' }],
        indicators: { attachments: 3 },
      },
      'task-attachment-2',
    )

    expect(result.attachments).toEqual([{ id: 'file-1' }])
    expect(result.indicators.attachments).toBe(2)
  })
})
