import { describe, expect, it } from 'vitest'
import openapi from '../../openapi.yml?raw'
import {
  makeProcessTestResource,
  processTestCatalog,
} from '../components/processes/processTestFixtures'
import {
  normalizeProcessFilters,
  parseProcessCatalog,
  parseProcessDetail,
  parseProcessEntriesPage,
  parseProcessIndicators,
  parseProcessPage,
  parseProcessSummary,
  ProcessContractError,
} from './processContract'

// Read the actual generated OpenAPI sections: the required field sets and enum
// cases below change with the checked-in backend artifact, not a handwritten copy.
function schemaBlock(name: string): string {
  const block = openapi.match(
    new RegExp(
      `^    ${name}:\\r?\\n([\\s\\S]*?)(?=^    [A-Za-z0-9_]+:|$(?![\\s\\S]))`,
      'm',
    ),
  )?.[1]
  if (!block) throw new Error(`Missing generated OpenAPI schema: ${name}`)
  return block
}
function requiredFields(name: string): string[] {
  const block = schemaBlock(name).match(
    /^ {6}required:\r?\n((?: {6}- [^\r\n]+\r?\n)+)/m,
  )?.[1]
  if (!block) throw new Error(`Missing required fields: ${name}`)
  return [...block.matchAll(/^ {6}- (.+)$/gm)].map((match) => match[1].trim())
}
function enumValues(name: string): string[] {
  return [...schemaBlock(name).matchAll(/^ {6}- (.+)$/gm)].map((match) =>
    match[1].trim(),
  )
}
function summaryFixture(): Record<string, unknown> {
  const detail = makeProcessTestResource()
  return Object.fromEntries(
    requiredFields('ProcessSummary').map((field) => [
      field,
      detail[field as keyof typeof detail],
    ]),
  )
}

describe('Processos generated OpenAPI revision 2', () => {
  it('declara resumo paginado e histórico separado no endpoint v1', () => {
    expect(schemaBlock('PaginatedProcessSummaryList')).toContain(
      "$ref: '#/components/schemas/ProcessSummary'",
    )
    expect(schemaBlock('PaginatedProcessEntryList')).toContain(
      "$ref: '#/components/schemas/ProcessEntry'",
    )
    expect(openapi).toContain('  /api/v1/processes/{id}/entries/:')
    expect(schemaBlock('ProcessResponse')).not.toMatch(
      /^ {8}(?:notas|historico):/m,
    )
    expect(schemaBlock('ProcessSummary')).not.toMatch(
      /^ {8}(?:tarefas|etapas|honorario|notas|historico):/m,
    )
  })

  it('aceita todos os estados e setores definidos no artefato gerado', () => {
    const summary = summaryFixture()
    expect(enumValues('ProcessStatusEnum')).toHaveLength(5)
    for (const status of enumValues('ProcessStatusEnum')) {
      expect(parseProcessSummary({ ...summary, status }).status).toBe(status)
    }
    for (const sector of enumValues('ProcessSectorEnum')) {
      expect(
        parseProcessSummary({ ...summary, responsibleSectors: [sector] })
          .responsibleSectors,
      ).toEqual([sector])
    }
  })

  it('exige cada campo obrigatório do resumo definido pelo backend', () => {
    const summary = summaryFixture()
    expect(parseProcessSummary(summary)).toEqual(summary)
    for (const field of requiredFields('ProcessSummary')) {
      const incomplete = { ...summary }
      delete incomplete[field]
      expect(() => parseProcessSummary(incomplete), field).toThrow(
        ProcessContractError,
      )
    }
  })

  it('exige cada campo obrigatório do detalhe e catálogo gerados', () => {
    const detail = makeProcessTestResource()
    expect(parseProcessDetail(detail)).toEqual(detail)
    for (const field of requiredFields('ProcessResponse')) {
      const incomplete = { ...detail } as Record<string, unknown>
      delete incomplete[field]
      expect(() => parseProcessDetail(incomplete), field).toThrow(
        ProcessContractError,
      )
    }
    for (const field of requiredFields('CatalogResponse')) {
      const incomplete = { ...processTestCatalog } as Record<string, unknown>
      delete incomplete[field]
      expect(() => parseProcessCatalog(incomplete), field).toThrow(
        ProcessContractError,
      )
    }
  })

  it('não aceita recursos completos em listas resumidas nem auditoria ilimitada', () => {
    const detail = makeProcessTestResource()
    expect(() =>
      parseProcessPage({
        count: 1,
        next: null,
        previous: null,
        results: [detail],
      }),
    ).toThrow(ProcessContractError)
    for (const field of ['notas', 'historico']) {
      expect(() => parseProcessDetail({ ...detail, [field]: [] })).toThrow(
        ProcessContractError,
      )
    }
  })

  it('preserva omissão financeira e recusa vazamento antes de produzir o modelo', () => {
    const detail = makeProcessTestResource({
      permissions: {
        ...processTestCatalog.permissions,
        viewFinancial: false,
        create: false,
      },
    })
    const result = parseProcessDetail(detail)
    expect(result).not.toHaveProperty('honorario')
    expect(result).not.toHaveProperty('obs')
    expect(() => parseProcessDetail({ ...detail, honorario: '0.00' })).toThrow(
      'conteúdo confidencial',
    )
    expect(() => parseProcessDetail({ ...detail, obs: 'Privado' })).toThrow(
      'conteúdo confidencial',
    )
  })

  it('não inventa estados a partir de análise, datas ou relógio do navegador', () => {
    const dto = {
      ...summaryFixture(),
      status: 'agendado',
      prazo: '2000-01-01',
      analysis: {
        ...makeProcessTestResource().analysis,
        waiting: false,
        late: true,
        completedTasks: 4,
        totalTasks: 4,
      },
    }
    const model = parseProcessSummary(dto)
    expect(model.status).toBe('agendado')
    expect(model.analysis).toEqual(dto.analysis)
    expect(model).not.toBe(dto)
    expect(model.analysis).not.toBe(dto.analysis)
  })

  it('recusa catálogo incompatível, enums desconhecidos e dados malformados com request ID', () => {
    for (const value of [
      null,
      [],
      {},
      { ...processTestCatalog, contractVersion: 1 },
      { ...processTestCatalog, workflowVersion: 3 },
      { ...processTestCatalog, openStatuses: ['andamento'] },
    ]) {
      expect(() => parseProcessCatalog(value, 'request-contract')).toThrow(
        ProcessContractError,
      )
    }
    try {
      parseProcessSummary(
        { ...summaryFixture(), status: 'novo' },
        'request-contract',
      )
    } catch (error) {
      expect(error).toMatchObject({
        requestId: 'request-contract',
        field: 'response.status',
      })
    }
    expect(() =>
      parseProcessSummary({ ...summaryFixture(), prazo: '2026-02-31' }),
    ).toThrow(ProcessContractError)
    expect(() =>
      parseProcessPage({ count: 0, next: null, previous: null, results: null }),
    ).toThrow(ProcessContractError)
    expect(
      parseProcessPage({ count: 0, next: null, previous: null, results: [] })
        .results,
    ).toEqual([])
  })

  it('valida entradas e todos os cinco contadores sem completar payload antigo', () => {
    const fields = requiredFields('ProcessEntry')
    const entry = {
      id: 'entry-1',
      por: 'member-1',
      autor: 'Ana',
      em: '2026-10-26T12:00:00Z',
      kind: 'status_changed',
      financial: false,
      text: '',
      details: { from: 'agendado', to: 'andamento', trigger: 'clock' },
    }
    for (const field of fields) {
      const incomplete = { ...entry } as Record<string, unknown>
      delete incomplete[field]
      expect(
        () =>
          parseProcessEntriesPage({
            count: 1,
            next: null,
            previous: null,
            results: [incomplete],
          }),
        field,
      ).toThrow(ProcessContractError)
    }
    expect(() =>
      parseProcessIndicators({
        total: 0,
        active: 0,
        completed: 0,
        cancelled: 0,
        late: 0,
        waiting: 0,
        bySector: {},
        byType: {},
      }),
    ).toThrow(ProcessContractError)
  })

  it('normaliza status como conjunto e rejeita consultas ambíguas', () => {
    expect(
      normalizeProcessFilters({
        status: ['atrasado', 'agendado', 'atrasado'],
        q: '  Empresa  ',
      }),
    ).toEqual({
      status: ['agendado', 'atrasado'],
      q: 'Empresa',
      page: 1,
      pageSize: 50,
    })
    expect(() => normalizeProcessFilters({ status: [] })).toThrow('status')
    expect(() => normalizeProcessFilters({ pageSize: 101 })).toThrow('pageSize')
    expect(() => normalizeProcessFilters({ month: '2026-13' })).toThrow('month')
  })
})
