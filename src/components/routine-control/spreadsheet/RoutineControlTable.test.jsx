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

function renderTable() {
  return renderToStaticMarkup(
    <RoutineControlTable
      clients={clients}
      routines={routines}
      tasks={tasks}
      showHeader={false}
    />,
  )
}

describe('RoutineControlTable presentations', () => {
  it('keeps the selected icon-only grid', () => {
    const markup = renderTable()

    expect(markup).toContain('data-spreadsheet-variant="round"')
    expect(markup).toContain(
      'Abrir Apurar impostos de Empresa Alpha. Status: Em andamento',
    )
    expect(markup).toContain('Nao se aplica')
  })
})
