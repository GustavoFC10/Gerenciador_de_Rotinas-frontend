import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { runInNewContext } from 'node:vm'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { processTestCatalog } from '../components/processes/processTestFixtures'
import type { ProcessMonthlyReport } from '../types/processes'
import {
  downloadProcessReportPdf,
  formatProcessReportMoney,
  processReportSummary,
} from './processReportPdf'

afterEach(() => vi.unstubAllGlobals())

describe('relatório PDF de Processos', () => {
  it('preserva cada centavo dos totais decimais, inclusive acima do limite de precisão de Number', () => {
    expect(formatProcessReportMoney('9999999999999999999999.99')).toBe(
      'R$\u00a09.999.999.999.999.999.999.999,99',
    )
    expect(formatProcessReportMoney('-1050.07')).toBe('− R$\u00a01.050,07')
    expect(formatProcessReportMoney('0.00')).toBe('R$\u00a00,00')
    expect(() => formatProcessReportMoney('não informado')).toThrow(
      'O valor monetário informado é inválido.',
    )
  })

  it('descreve ganhos, perdas e comparação com o mês anterior sem contar valores ausentes como zero', () => {
    const report = makeReport()
    report.entries = [
      {
        processId: 'new-1',
        empresa: 'Empresa',
        tipo: 'abertura',
        value: '1200.00',
      },
      { processId: 'new-2', empresa: 'Indefinida', tipo: 'outro', value: null },
    ]
    report.exits = [
      { processId: 'exit-1', empresa: 'Saída', tipo: 'saida', value: '250.00' },
    ]
    report.missingValues = 1

    const summary = processReportSummary(report)

    expect(summary).toContain(
      'Em outubro de 2026, a Jaralcon iniciou 2 novos contratos',
    )
    expect(summary).toContain('somando R$\u00a01.200,00')
    expect(summary).toContain('1 empresa reduziu ou encerrou')
    expect(summary).toContain(
      '+ R$\u00a0950,00 por mês, frente a − R$\u00a0100,00 no mês anterior',
    )
    expect(report.entries[1]?.value).toBeNull()
  })

  it('mantém um resumo natural quando não há movimentação', () => {
    const report = makeReport()
    report.gain =
      report.loss =
      report.balance =
      report.previousMonth.balance =
        '0.00'

    const summary = processReportSummary(report)

    expect(summary).toContain('não houve início de novos contratos')
    expect(summary).toContain('Não houve perda de honorários no período')
    expect(summary).not.toContain('mês anterior')
  })

  it('gera um PDF real com marca, gráfico, nomes completos, várias páginas e avisos de valores ausentes', async () => {
    interface GeneratedPdf {
      output(): string
      getNumberOfPages(): number
      save(filename: string): void
    }
    type Library = {
      jsPDF: new (options: { unit: string; format: string }) => GeneratedPdf
    }
    const pdfContext = {
      TextEncoder,
      TextDecoder,
      Uint8Array,
      Uint32Array,
      ArrayBuffer,
      atob,
      btoa,
      setTimeout,
      clearTimeout,
      console,
    } as Record<string, unknown> & { jspdf?: Library }
    runInNewContext(
      readFileSync(resolve('public/vendor/jspdf-4.2.1.umd.min.js'), 'utf8'),
      pdfContext,
    )
    const library = pdfContext.jspdf!
    let generated: GeneratedPdf | undefined
    let filename = ''
    vi.stubGlobal('window', {
      jspdf: {
        jsPDF: function (options: { unit: string; format: string }) {
          generated = new library.jsPDF(options)
          generated.save = (name) => {
            filename = name
          }
          return generated
        },
      },
    })
    const originalLogo = `data:image/png;base64,${readFileSync(resolve('src/assets/jaralcon-report-logo.png')).toString('base64')}`
    class Logo {
      nodeType = 1
      nodeName = 'IMG'
      onload?: () => void
      hasAttribute(name: string) {
        return name === 'src'
      }
      getAttribute(name: string) {
        return name === 'src' ? originalLogo : null
      }
      get src() {
        return originalLogo
      }
      set src(_url: string) {
        queueMicrotask(() => this.onload?.())
      }
    }
    vi.stubGlobal('Image', Logo)
    const report = makeReport()
    report.entries = Array.from({ length: 65 }, (_, index) => ({
      processId: `new-${index}`,
      empresa: `EMPRESA ${index} NOME COMPLETO SOCIEDADE DE CONSULTORIA CONTABIL LIMITADA`,
      tipo: 'abertura',
      value: index === 64 ? null : '1200.00',
    }))
    report.exits = [
      {
        processId: 'exit-1',
        empresa: 'EMPRESA QUE ENCERROU',
        tipo: 'saida',
        value: '250.00',
      },
    ]
    report.lossesByType = { saida: '250.00' }
    report.missingValues = 1

    await downloadProcessReportPdf(report, processTestCatalog, 'Ana Silva')

    expect(filename).toBe('Movimentacoes-Empresariais-2026-10.pdf')
    expect(generated?.getNumberOfPages()).toBeGreaterThan(3)
    const pdf = generated!.output()
    expect(pdf.startsWith('%PDF-')).toBe(true)
    for (const content of [
      '/Subtype /Image',
      'EMPRESA 64 NOME COMPLETO',
      'SOCIEDADE DE CONSULTORIA',
      'Ana Silva',
      'Não informado',
      'sem valor informado',
      'outubro de 2026',
    ]) {
      expect(pdf.includes(content), content).toBe(true)
    }
  })
})

function makeReport(): ProcessMonthlyReport {
  const month = {
    month: '2026-10',
    gain: '1200.00',
    loss: '250.00',
    balance: '950.00',
    missingValues: 0,
    entries: [],
    exits: [],
    lossesByType: {},
  }
  return {
    ...month,
    previousMonth: { ...month, month: '2026-09', balance: '-100.00' },
    history: Array.from({ length: 12 }, (_, index) => ({
      ...month,
      month:
        index < 10
          ? `2026-${String(index + 1).padStart(2, '0')}`
          : `2025-${index + 1}`,
    })),
  }
}
