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

describe('RoutineDetailsCard', () => {
  it('keeps the selected document layout', () => {
    const markup = renderToStaticMarkup(<RoutineDetailsCard {...sharedProps} />)

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
    expect(markup).not.toContain('Trocar visualização do card')
  })
})
