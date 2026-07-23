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
  attachments: [
    {
      id: 'attachment-das',
      name: 'DAS_06-2026.pdf',
      mimeType: 'application/pdf',
      sizeLabel: '184 KB',
      previewType: 'pdf',
      previewTitle: 'Documento de arrecadação',
    },
    {
      id: 'attachment-calculo',
      name: 'Memoria_de_calculo_junho.xlsx',
      mimeType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      sizeLabel: '118 KB',
      previewType: 'spreadsheet',
      previewTitle: 'Memória de cálculo',
    },
  ],
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
  onAttachmentRemove: () => {},
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
  it('combines attachment previews and the execution record in option one', () => {
    const markup = renderVariant('document')

    expect(markup).toContain('data-details-view="document"')
    expect(markup).toContain('Descrição')
    expect(markup).toContain('data-execution-context="combined"')
    expect(markup).toContain('DAS_06-2026.pdf')
    expect(markup).toContain('Memoria_de_calculo_junho.xlsx')
    expect(markup).toContain('Prévia de PDF')
    expect(markup).toContain('Prévia de planilha')
    expect(markup).toContain('data-attachment-layout="single-row"')
    expect(markup).toContain('aria-label="Excluir DAS_06-2026.pdf"')
    expect(markup).not.toContain('Anexar arquivo')
    expect(markup).not.toContain('1 comentários')
    expect(markup).toContain('Registro da execução')
    expect(markup).toContain('Detalhes')
    expect(markup.indexOf('DAS_06-2026.pdf')).toBeLessThan(
      markup.indexOf('Registro da execução'),
    )
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
    expect(markup).toContain('data-flow-main="true"')
    expect(markup).toContain('data-attachment-layout="vertical-two-rows"')
    expect(markup).toContain('data-scroll-owner="attachments"')
    expect(markup.indexOf('Exceções')).toBeLessThan(
      markup.indexOf('Galeria de anexos'),
    )
    expect(markup.indexOf('Galeria de anexos')).toBeLessThan(
      markup.indexOf('Responsabilidade'),
    )

    const mainStart = markup.indexOf('data-flow-main="true"')
    const mainEnd = markup.indexOf('</main>', mainStart)
    const mainMarkup = markup.slice(mainStart, mainEnd)

    expect(mainMarkup).toContain('Galeria de anexos')
    expect(mainMarkup).toContain('Nota de contexto')
  })
})
