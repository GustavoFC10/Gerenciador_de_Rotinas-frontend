import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { ROUTINE_STATUS } from '../../../constants/routineStatus.js'
import RoutineControlTable from './RoutineControlTable.jsx'

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

const tasks = [
  {
    id: 'task-1',
    clientId: 'client-1',
    routineId: 'routine-1',
    status: ROUTINE_STATUS.IN_PROGRESS,
  },
]

function renderTable(variant) {
  return renderToStaticMarkup(
    <RoutineControlTable
      clients={clients}
      routines={routines}
      tasks={tasks}
      variant={variant}
      showHeader={false}
    />,
  )
}

describe('RoutineControlTable presentations', () => {
  it('keeps the comfortable textual cells as the default option', () => {
    const markup = renderTable('label')

    expect(markup).toContain('data-spreadsheet-variant="label"')
    expect(markup).toContain('data-cell-variant="label"')
    expect(markup).toContain('Em andamento')
  })

  it('keeps the icon-only grid as option two', () => {
    const markup = renderTable('round')

    expect(markup).toContain('data-spreadsheet-variant="round"')
    expect(markup).toContain(
      'Abrir Apurar impostos de Empresa Alpha. Status: Em andamento',
    )
  })

  it('renders compact textual cells and marginal totals in option three', () => {
    const markup = renderTable('dense')

    expect(markup).toContain('data-spreadsheet-variant="dense"')
    expect(markup).toContain('data-cell-variant="dense"')
    expect(markup).toContain('Em andamento')
    expect(markup).toContain('Nao se aplica')
    expect(markup).toContain('0/1 encerr.')
  })
})
