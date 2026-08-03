import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { ROUTINE_STATUS } from '../../../constants/routineStatus'
import RoutineControlTable from './RoutineControlTable'
import type { Task } from '../../../types/domain'

const clients = [{ id: 'client-1', code: '001', name: 'Empresa Alpha' }]

const routines = [
  {
    id: 'routine-1',
    name: 'Apurar impostos',
    shortName: 'Impostos',
    departmentId: 'dept-accounting',
  },
  {
    id: 'routine-2',
    name: 'Fechar balancete',
    shortName: 'Balancete',
    departmentId: 'dept-accounting',
  },
]

const tasks: Task[] = [
  {
    id: 'task-1',
    clientId: 'client-1',
    routineId: 'routine-1',
    departmentId: 'dept-accounting',
    assigneeId: null,
    status: ROUTINE_STATUS.IN_PROGRESS,
    period: '2026-06',
    dueDate: '2026-06-20',
    completedAt: null,
    indicators: { attachments: 0 },
  },
]

function renderTable(
  clientRoutineLinks = [
    {
      id: 'link-1',
      clientId: 'client-1',
      routineId: 'routine-1',
    },
  ],
) {
  return renderToStaticMarkup(
    <RoutineControlTable
      clients={clients}
      routines={routines}
      clientRoutineLinks={clientRoutineLinks}
      tasks={tasks}
      showHeader={false}
      onTaskStatusChange={() => undefined}
      onTaskAttachmentAdd={() => undefined}
    />,
  )
}

describe('RoutineControlTable presentations', () => {
  it('keeps the selected icon-only grid', () => {
    const markup = renderTable()

    expect(markup).toContain('data-spreadsheet-variant="round"')
    expect(markup).toContain('Abrir página da empresa Empresa Alpha')
    expect(markup).toContain('Abrir página da rotina Apurar impostos')
    expect(markup).toContain('aria-haspopup="menu"')
    expect(markup).toContain('aria-keyshortcuts="Shift+F10"')
    expect(markup).toContain(
      'Abrir Apurar impostos de Empresa Alpha. Status: Em andamento',
    )
    expect(markup).toContain('Botão direito ou Shift+F10 para ações')
    expect(markup).toContain('Não se aplica: rotina não vinculada à empresa')
    expect(markup).not.toContain('Abrir Fechar balancete de Empresa Alpha')
    expect(markup).toContain('data-routine-applicability="not-applicable"')
    const inactiveCell =
      markup.match(
        /<td[^>]*data-routine-applicability="not-applicable"[^>]*>/,
      )?.[0] ?? ''

    expect(inactiveCell).not.toMatch(/group-hover:|hover:|focus-visible:/)
    expect(inactiveCell).not.toContain('task-context-trigger')
  })

  it('distinguishes a linked routine without an execution from non-applicability', () => {
    const markup = renderTable([
      {
        id: 'link-1',
        clientId: 'client-1',
        routineId: 'routine-1',
      },
      {
        id: 'link-2',
        clientId: 'client-1',
        routineId: 'routine-2',
      },
    ])

    expect(markup).toContain('Execução ainda não disponível')
    expect(markup).not.toContain(
      'Não se aplica: rotina não vinculada à empresa',
    )
  })

  it('uses a slightly grayer background for non-applicable cells', () => {
    const markup = renderTable()
    const inactiveCell =
      markup.match(
        /<td[^>]*data-routine-applicability="not-applicable"[^>]*>/,
      )?.[0] ?? ''

    expect(inactiveCell).toContain('bg-[var(--color-table-not-applicable-bg)]')
    expect(inactiveCell).not.toMatch(/group-hover:|hover:|focus-visible:/)
  })
})
