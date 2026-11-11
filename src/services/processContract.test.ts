import { describe, expect, it } from 'vitest'
import openapi from '../../openapi.yml?raw'
import {
  makeProcessTestResource,
  processTestCatalog,
  processTestExtraIndicators,
  processTestLeggacyMetrics,
} from '../components/processes/processTestFixtures'
import {
  normalizeProcessFilters,
  parseProcessCatalog,
  parseProcessDetail,
  parseProcessEntriesPage,
  parseProcessIndicators,
  parseProcessLeggacyMetrics,
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
  it.each(['aumento_honorarios', 'reducao_honorarios'] as const)(
    'accepts %s detail and protects its financial fields',
    (tipo) => {
      const detail = makeProcessTestResource({
        tipo,
        contato: 'cliente@exemplo.com',
        honAnterior: '800.00',
        honorario: '700.00',
        honVariacao: '-100.00',
      })
      expect(parseProcessDetail(detail).honVariacao).toBe('-100.00')
      const restricted = makeProcessTestResource({
        tipo,
        contato: detail.contato,
        permissions: {
          ...detail.permissions,
          create: false,
          edit: false,
          viewFinancial: false,
          executeSectors: [],
        },
      })
      expect(parseProcessDetail(restricted).contato).toBe(detail.contato)
      for (const field of [
        'honAnterior',
        'honorario',
        'honVariacao',
        'contadorContato',
        'obs',
      ])
        expect(() =>
          parseProcessDetail({
            ...restricted,
            [field]:
              field === 'obs' || field === 'contadorContato'
                ? 'privado'
                : '0.00',
          }),
        ).toThrow('conteúdo confidencial')
      for (const field of ['contato', 'honVariacao'])
        expect(() =>
          parseProcessSummary({ ...summaryFixture(), [field]: '0.00' }),
        ).toThrow(ProcessContractError)
      expect(() => parseProcessDetail({ ...detail, tipo: 'abertura' })).toThrow(
        'tipo sem reajuste',
      )
      expect(normalizeProcessFilters({ tipo }).tipo).toBe(tipo)
    },
  )
  it('accepts thirteen types, keeping outro and outros distinct in revision 2', () => {
    const catalog = parseProcessCatalog(processTestCatalog)
    expect(catalog.types).toHaveLength(13)
    expect(catalog.types.find((type) => type.id === 'outros')?.sigla).toBe(
      'OTS',
    )
    expect(catalog.types.find((type) => type.id === 'outro')?.nome).not.toBe(
      'Outros',
    )
    for (const tipo of enumValues('ProcessCreateTipoEnum'))
      expect(parseProcessSummary({ ...summaryFixture(), tipo }).tipo).toBe(tipo)
  })

  it('requires task projections only when taskSector was requested, including null/zero', () => {
    const item = summaryFixture()
    const page = (record: object) => ({
      count: 1,
      next: null,
      previous: null,
      results: [record],
    })
    expect(parseProcessPage(page(item)).results[0]).not.toHaveProperty(
      'nextTask',
    )
    expect(() => parseProcessPage(page(item), null, 'fin')).toThrow('nextTask')
    const nextTask = {
      id: 'ot1',
      sector: 'fin',
      text: 'Executar atividade',
      stageTitle: 'Atividade',
    }
    expect(
      parseProcessPage(
        page({ ...item, nextTask, pendingTaskCount: 3 }),
        null,
        'fin',
      ).results[0]?.pendingTaskCount,
    ).toBe(3)
    expect(() =>
      parseProcessPage(page({ ...item, nextTask, pendingTaskCount: 3 })),
    ).toThrow('sem taskSector')
    expect(() =>
      parseProcessPage(
        page({ ...item, nextTask, pendingTaskCount: 3 }),
        null,
        'reg',
      ),
    ).toThrow()
    expect(() => parseProcessSummary({ ...item, nextTask })).toThrow(
      'pendingTaskCount',
    )
    expect(() =>
      parseProcessSummary({ ...item, nextTask: null, pendingTaskCount: 1 }),
    ).toThrow('pendingTaskCount')
    for (const status of ['agendado', 'concluido', 'cancelado']) {
      expect(
        parseProcessPage(
          page({ ...item, status, nextTask: null, pendingTaskCount: 0 }),
          null,
          'fin',
        ).results[0]?.nextTask,
      ).toBeNull()
      expect(() =>
        parseProcessPage(
          page({ ...item, status, nextTask, pendingTaskCount: 1 }),
          null,
          'fin',
        ),
      ).toThrow()
    }
  })

  it('keeps the operational description public while rejecting an unauthorized Outros value', () => {
    const detail = makeProcessTestResource({
      tipo: 'outros',
      descricaoProcesso: 'Atividade operacional',
      departamentoSolicitado: 'reg',
      acionarLeggacy: true,
      permissions: {
        ...processTestCatalog.permissions,
        viewFinancial: false,
        create: false,
      },
    })
    expect(parseProcessDetail(detail).descricaoProcesso).toBe(
      'Atividade operacional',
    )
    expect(parseProcessDetail(detail)).not.toHaveProperty('valorProcesso')
    expect(() =>
      parseProcessDetail({ ...detail, valorProcesso: '0.00' }),
    ).toThrow('conteúdo confidencial')
  })

  it('validates extra aggregate fields without converting null to zero or supplying missing fields', () => {
    const indicators = {
      ...processTestExtraIndicators,
      total: 0,
      active: 0,
      completed: 0,
      cancelled: 0,
      waiting: 0,
      late: 0,
      byStatus: {
        andamento: 0,
        atrasado: 0,
        agendado: 0,
        concluido: 0,
        cancelado: 0,
      },
      bySector: {},
      byType: { outros: 0 },
    }
    expect(parseProcessIndicators(indicators).averageCompletionDays).toBeNull()
    expect(
      parseProcessIndicators({ ...indicators, averageCompletionDays: 0 })
        .averageCompletionDays,
    ).toBe(0)
    for (const field of Object.keys(processTestExtraIndicators)) {
      const incomplete = { ...indicators } as Record<string, unknown>
      delete incomplete[field]
      expect(() => parseProcessIndicators(incomplete), field).toThrow(
        ProcessContractError,
      )
    }
    expect(
      parseProcessLeggacyMetrics(processTestLeggacyMetrics)[0]?.averageDays,
    ).toBeNull()
    expect(() =>
      parseProcessLeggacyMetrics([
        ...processTestLeggacyMetrics,
        { ...processTestLeggacyMetrics[0], tipo: 'outros' },
      ]),
    ).toThrow()
    expect(() =>
      parseProcessLeggacyMetrics(processTestLeggacyMetrics.slice(0, 2)),
    ).toThrow()
    expect(() =>
      parseProcessLeggacyMetrics(
        processTestLeggacyMetrics.map((item) => ({ ...item, averageDays: -1 })),
      ),
    ).toThrow()
  })

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
      // The generated response schema lists this conditional financial field as
      // required, but it is omitted outside fee adjustments and for restricted readers.
      if (field === 'honVariacao') continue
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
      ordering: 'recent',
      q: 'Empresa',
      page: 1,
      pageSize: 50,
    })
    expect(() => normalizeProcessFilters({ status: [] })).toThrow('status')
    expect(() => normalizeProcessFilters({ pageSize: 101 })).toThrow('pageSize')
    expect(() => normalizeProcessFilters({ month: '2026-13' })).toThrow('month')
  })
})
