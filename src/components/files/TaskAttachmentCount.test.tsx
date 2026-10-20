import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import TaskAttachmentCount from './TaskAttachmentCount'
import RoutineClosedCardCompact from '../routine-control/spreadsheet/RoutineClosedCardCompact'
import type { Task } from '../../types/domain'

describe('task attachment count', () => {
  it('hides empty counters and identifies a positive count for readers', () => {
    expect(renderToStaticMarkup(<TaskAttachmentCount count={0} />)).toBe('')
    expect(renderToStaticMarkup(<TaskAttachmentCount count={-1} />)).toBe('')
    expect(renderToStaticMarkup(<TaskAttachmentCount count={2} />)).toContain(
      'aria-label="2 anexos"',
    )
    expect(renderToStaticMarkup(<TaskAttachmentCount count={1} />)).toContain(
      'aria-label="1 anexo"',
    )
  })
  it('shows the counter in a closed spreadsheet card without attachment permissions', () => {
    const task: Task = {
      id: 'task',
      kind: 'ad_hoc',
      clientId: null,
      routineId: null,
      departmentId: 'fiscal',
      assigneeId: null,
      status: 'pending',
      period: '2026-10',
      dueDate: '2026-10-20',
      completedAt: null,
      indicators: { attachments: 3 },
    }
    const markup = renderToStaticMarkup(
      <RoutineClosedCardCompact task={task} label="Documento mensal" />,
    )
    expect(markup).toContain('3 anexos')
    expect(markup).not.toContain('Anexar arquivo')
  })
})
