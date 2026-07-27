import { describe, expect, it } from 'vitest'

import { routineControlMock } from './routineControl.mock'

describe('routineControlMock attachments', () => {
  it('stores varied files with metadata instead of attachment counts only', () => {
    const tasks = routineControlMock.data.tasks
    const attachments = tasks.flatMap((task) => task.attachments ?? [])
    const previewTypes = new Set(
      attachments.map((attachment) => attachment.previewType),
    )

    expect(attachments.length).toBeGreaterThan(0)
    expect(previewTypes).toEqual(
      new Set(['spreadsheet', 'xml', 'pdf', 'image', 'document']),
    )
    expect(
      attachments.every(
        (attachment) =>
          attachment.id &&
          attachment.name &&
          attachment.mimeType &&
          attachment.sizeLabel,
      ),
    ).toBe(true)
    expect(
      tasks.every(
        (task) =>
          (task.attachments?.length ?? 0) ===
          (Number(task.indicators?.attachments) || 0),
      ),
    ).toBe(true)
  })
})
