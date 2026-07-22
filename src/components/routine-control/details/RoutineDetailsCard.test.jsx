import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import RoutineDetailsCard from './RoutineDetailsCard.jsx'

const task = {
  id: 'task-001-enviar-das',
  clientId: 'client-001',
  routineId: 'routine-enviar-das',
  departmentId: 'dept-fiscal',
  assigneeId: 'employee-001',
  status: 'in_progress',
  period: '2026-06',
  dueDate: '2026-06-24',
  completedAt: null,
  notes: 'Aguardando conferência final.',
  indicators: { attachments: 2, comments: 1, alerts: 0 },
}

const sharedProps = {
  task,
  client: { id: 'client-001', code: '001', name: 'Aurora Comércio' },
  routine: {
    id: 'routine-enviar-das',
    name: 'Enviar DAS',
    description: 'Enviar a guia mensal após a conferência.',
  },
  department: { id: 'dept-fiscal', name: 'Fiscal' },
  employees: [{ id: 'employee-001', name: 'Ana Souza' }],
}

function renderVariant(variant) {
  return renderToStaticMarkup(
    <RoutineDetailsCard
      {...sharedProps}
      variant={variant}
      viewMode={variant}
    />,
  )
}

describe('RoutineDetailsCard layouts', () => {
  it('renders the Jira-like issue layout with metadata in a details sidebar', () => {
    const markup = renderVariant('document')

    expect(markup).toContain('data-details-view="document"')
    expect(markup).toContain('Descrição')
    expect(markup).toContain('Atividade')
    expect(markup).toContain('Detalhes')
    expect(markup.indexOf('Atividade')).toBeLessThan(markup.indexOf('Detalhes'))
    expect(markup.indexOf('Detalhes')).toBeLessThan(
      markup.indexOf('Responsável'),
    )
  })

  it('renders the context workspace with ownership above operations', () => {
    const markup = renderVariant('compact')

    expect(markup).toContain('data-details-view="compact"')
    expect(markup).toContain('Responsabilidade')
    expect(markup).toContain('Contexto')
    expect(markup).toContain('Fluxo da execução')
    expect(markup.indexOf('Responsabilidade')).toBeLessThan(
      markup.indexOf('Contexto', markup.indexOf('</header>')),
    )
  })

  it('renders the flow layout with status, evidence and ownership columns', () => {
    const markup = renderVariant('panel')

    expect(markup).toContain('data-details-view="panel"')
    expect(markup).toContain('Exceções')
    expect(markup).toContain('Área principal')
    expect(markup).toContain('Galeria de anexos')
    expect(markup).toContain('Responsabilidade')
    expect(markup.indexOf('Exceções')).toBeLessThan(
      markup.indexOf('Galeria de anexos'),
    )
    expect(markup.indexOf('Galeria de anexos')).toBeLessThan(
      markup.indexOf('Responsabilidade'),
    )
  })
})
