import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import type { Task } from '../../../types/domain'
import { normalizeTaskLinkUrl } from '../../../utils/taskLinks'
import TaskLinksPanel from './TaskLinksPanel'

const task: Task = {
  id: 'task-links',
  kind: 'scheduled',
  clientId: 'client-0001',
  routineId: 'routine-importar',
  departmentId: 'dept-fiscal',
  assigneeId: 'employee-001',
  status: 'in_progress',
  period: '2026-06',
  dueDate: '2026-06-20',
  completedAt: null,
  links: [
    {
      id: 'link-portal',
      label: 'Portal de importação',
      url: 'https://importacao.exemplo.com/notas',
    },
  ],
  indicators: { attachments: 0 },
}

describe('TaskLinksPanel', () => {
  it('renders saved links as safe new-tab navigation', () => {
    const markup = renderToStaticMarkup(
      <TaskLinksPanel task={task} onLinkRemove={() => undefined} />,
    )

    expect(markup).toContain('Portal de importação')
    expect(markup).toContain('importacao.exemplo.com')
    expect(markup).toContain('target="_blank"')
    expect(markup).toContain('rel="noopener noreferrer"')
    expect(markup).toContain('Remover link Portal de importação')
  })

  it('accepts web links and rejects unsafe or malformed protocols', () => {
    expect(normalizeTaskLinkUrl('https://exemplo.com/notas')).toBe(
      'https://exemplo.com/notas',
    )
    expect(normalizeTaskLinkUrl('http://localhost:3000/importar')).toBe(
      'http://localhost:3000/importar',
    )
    expect(normalizeTaskLinkUrl('javascript:alert(1)')).toBeNull()
    expect(normalizeTaskLinkUrl('portal sem protocolo')).toBeNull()
  })
})
