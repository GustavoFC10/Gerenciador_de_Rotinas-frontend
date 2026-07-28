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

  it('models non-applicability as an absent client-routine link, not a task status', () => {
    const { clientRoutineLinks, tasks } = routineControlMock.data
    const absentPairs = [
      ['client-007', 'routine-efd-reinf'],
      ['client-018', 'routine-efd-reinf'],
    ]

    expect(
      tasks.every((task) => String(task.status) !== 'not_applicable'),
    ).toBe(true)

    absentPairs.forEach(([clientId, routineId]) => {
      expect(
        clientRoutineLinks.some(
          (link) =>
            link.clientId === clientId && link.routineId === routineId,
        ),
      ).toBe(false)
      expect(
        tasks.some(
          (task) =>
            task.clientId === clientId && task.routineId === routineId,
        ),
      ).toBe(false)
    })
  })
})
