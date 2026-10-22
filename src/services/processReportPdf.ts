import reportLogoUrl from '../assets/jaralcon-report-logo.png'
import type {
  ProcessCatalog,
  ProcessMonthlyReport,
  ProcessMovementItem,
} from '../types/processes'
import { monthLabel, processTypeName } from '../utils/processPresentation'
import {
  decimalToCents as decimalCents,
  formatProcessMoney,
} from '../utils/processMoney'

type Color = [number, number, number]
type PdfTextOptions = {
  align?: 'left' | 'right' | 'center'
  lineHeightFactor?: number
  charSpace?: number
}

interface PdfDocument {
  setFillColor(...color: Color): void
  setDrawColor(...color: Color): void
  setTextColor(...color: Color): void
  setLineWidth(width: number): void
  setFont(name: string, style: string): void
  setFontSize(size: number): void
  setProperties(properties: {
    title: string
    author: string
    subject: string
  }): void
  text(
    text: string | string[],
    x: number,
    y: number,
    options?: PdfTextOptions,
  ): void
  splitTextToSize(text: string, width: number): string[]
  rect(x: number, y: number, width: number, height: number, style: string): void
  roundedRect(
    x: number,
    y: number,
    width: number,
    height: number,
    rx: number,
    ry: number,
    style: string,
  ): void
  line(x1: number, y1: number, x2: number, y2: number): void
  lines(lines: number[][], x: number, y: number): void
  addImage(
    image: HTMLImageElement,
    format: string,
    x: number,
    y: number,
    width: number,
    height: number,
  ): void
  addPage(): void
  getNumberOfPages(): number
  setPage(page: number): void
  save(filename: string): void
}

type PdfConstructor = new (options: {
  unit: string
  format: string
}) => PdfDocument
type PdfWindow = Window & { jspdf?: { jsPDF: PdfConstructor } }

const COLORS = {
  navy: [3, 0, 41] as Color,
  gold: [222, 172, 41] as Color,
  ink: [15, 23, 42] as Color,
  muted: [100, 116, 139] as Color,
  line: [226, 232, 240] as Color,
  green: [5, 150, 105] as Color,
  red: [220, 38, 38] as Color,
  soft: [248, 250, 252] as Color,
  white: [255, 255, 255] as Color,
}

let pdfLibrary: Promise<PdfConstructor> | undefined

/** Formata os centavos sem converter os totais decimais da API em ponto flutuante. */
export function formatProcessReportMoney(value: string): string {
  return formatProcessMoney(value)
}

export function processReportSummary(report: ProcessMonthlyReport): string {
  const month = monthLabel(report.month).toLowerCase()
  const entries = report.entries.length
  const exits = report.exits.length
  const opening = entries
    ? `Em ${month}, a Jaralcon iniciou ${entries} ${entries === 1 ? 'novo contrato' : 'novos contratos'}, somando ${formatProcessReportMoney(report.gain)} em honorários mensais.`
    : `Em ${month}, não houve início de novos contratos.`
  const losses = exits
    ? ` No mesmo período, ${exits} ${exits === 1 ? 'empresa reduziu ou encerrou' : 'empresas reduziram ou encerraram'} seus honorários, totalizando ${formatProcessReportMoney(report.loss)} por mês.`
    : ' Não houve perda de honorários no período.'
  const previous = decimalCents(report.previousMonth.balance)
  const balance = decimalCents(report.balance)
  const change =
    previous !== 0n || balance !== 0n
      ? `, frente a ${signedMoney(report.previousMonth.balance)} no mês anterior`
      : ''
  return `${opening}${losses} O saldo da receita recorrente foi de ${signedMoney(report.balance)} por mês${change}.`
}

/** Gera um PDF vetorial com a marca e o conteúdo do relatório original. */
export async function downloadProcessReportPdf(
  report: ProcessMonthlyReport,
  catalog: ProcessCatalog,
  authorName = '',
): Promise<void> {
  const [JsPdf, logo] = await Promise.all([loadPdfLibrary(), loadLogo()])
  const doc = new JsPdf({ unit: 'mm', format: 'a4' })
  const width = 210
  const height = 297
  const margin = 18
  const contentWidth = width - margin * 2
  let y = 0
  const fill = (color: Color) => doc.setFillColor(...color)
  const ink = (color: Color) => doc.setTextColor(...color)
  const draw = (color: Color) => doc.setDrawColor(...color)
  const write = (
    value: string | string[],
    x: number,
    top: number,
    options?: PdfTextOptions,
  ) =>
    doc.text(
      Array.isArray(value) ? value.map(pdfText) : pdfText(value),
      x,
      top,
      options,
    )
  const money = (value: string) => pdfText(formatProcessReportMoney(value))
  const typeName = (type: string) => pdfText(processTypeName(catalog, type))
  const newPage = () => {
    doc.addPage()
    fill(COLORS.navy)
    doc.rect(0, 0, width, 14, 'F')
    doc.addImage(logo, 'PNG', margin, 3.2, 23, 7.4)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    ink(COLORS.white)
    write(
      `Movimentações Empresariais · ${monthLabel(report.month)}`,
      width - margin,
      8.8,
      { align: 'right' },
    )
    y = 26
  }
  const ensure = (space: number) => {
    if (y + space > height - 24) newPage()
  }
  const title = (value: string) => {
    ensure(16)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    ink(COLORS.ink)
    write(value, margin, y)
    y += 7
  }

  doc.setProperties({
    title: `Movimentações Empresariais - ${monthLabel(report.month)}`,
    author: authorName || 'Jaralcon Assessoria Contábil',
    subject: 'Novos honorários mensais e honorários perdidos no mês',
  })

  fill(COLORS.navy)
  doc.rect(0, 0, width, 78, 'F')
  doc.addImage(logo, 'PNG', margin, 14, 40, 12.9)
  ink(COLORS.gold)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  write(
    `RELATÓRIO MENSAL · ${monthLabel(report.month).toUpperCase()}`,
    margin,
    42,
    { charSpace: 0.6 },
  )
  ink(COLORS.white)
  doc.setFontSize(24)
  write('Movimentações Empresariais', margin, 54)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  ink([205, 205, 225])
  write('Novos honorários mensais e honorários perdidos no mês', margin, 61.5)
  draw(COLORS.gold)
  doc.setLineWidth(0.7)
  doc.lines(
    [
      [30, -9, 60, -9, 92, 0],
      [30, 9, 62, 9, 94, 0],
      [12, -4, 24, -5, 38, -2],
    ],
    -2,
    74,
  )

  const balancePositive = decimalCents(report.balance) >= 0n
  const kpis: {
    label: string
    value: string
    caption: string
    color: Color
  }[] = [
    {
      label: 'NOVOS HONORÁRIOS',
      value: `+ ${money(report.gain)}`,
      caption: `${report.entries.length} contrato(s) no mês`,
      color: COLORS.green,
    },
    {
      label: 'HONORÁRIOS PERDIDOS',
      value: `- ${money(report.loss)}`,
      caption: `${report.exits.length} empresa(s) no mês`,
      color: COLORS.red,
    },
    {
      label: 'SALDO MENSAL',
      value: signedMoney(report.balance),
      caption: `Mês anterior: ${signedMoney(report.previousMonth.balance)}`,
      color: balancePositive ? COLORS.green : COLORS.red,
    },
  ]
  y = 70
  const kpiWidth = (contentWidth - 10) / 3
  kpis.forEach((kpi, index) => {
    const x = margin + index * (kpiWidth + 5)
    fill(COLORS.white)
    draw(COLORS.line)
    doc.setLineWidth(0.3)
    doc.roundedRect(x, y, kpiWidth, 30, 3, 3, 'FD')
    fill(kpi.color)
    doc.roundedRect(x, y, kpiWidth, 1.6, 0.8, 0.8, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    ink(COLORS.muted)
    write(kpi.label, x + 5, y + 9, { charSpace: 0.4 })
    doc.setFontSize(Math.min(15, (kpiWidth - 10) / (kpi.value.length * 0.19)))
    ink(kpi.color)
    write(kpi.value, x + 5, y + 19)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    ink(COLORS.muted)
    const caption = doc.splitTextToSize(pdfText(kpi.caption), kpiWidth - 10)
    write(caption, x + 5, y + 25.5, { lineHeightFactor: 1 })
  })

  y = 112
  title('Resultado do mês')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  ink([51, 65, 85])
  const summary = doc.splitTextToSize(
    pdfText(processReportSummary(report)),
    contentWidth,
  )
  write(summary, margin, y, { lineHeightFactor: 1.5 })
  y += summary.length * 5.4 + 8

  ensure(85)
  const history = report.history
    .slice()
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-6)
  title(`Evolução nos últimos ${history.length || 6} meses`)
  const chartHeight = 42
  const base = y + chartHeight
  const highest = history.reduce((max, item) => {
    const gain = decimalCents(item.gain)
    const loss = decimalCents(item.loss)
    return [max, gain, loss].reduce((a, b) => (a > b ? a : b))
  }, 1n)
  fill(COLORS.soft)
  draw(COLORS.line)
  doc.roundedRect(margin, y, contentWidth, chartHeight + 12, 3, 3, 'FD')
  const slot = (contentWidth - 10) / Math.max(1, history.length)
  const barWidth = 7
  history.forEach((item, index) => {
    const center = margin + 5 + slot * index + slot / 2
    const gainHeight =
      (Number(decimalCents(item.gain)) / Number(highest)) * (chartHeight - 10)
    const lossHeight =
      (Number(decimalCents(item.loss)) / Number(highest)) * (chartHeight - 10)
    const current = item.month === report.month
    if (current) {
      fill([235, 236, 248])
      doc.roundedRect(
        center - slot / 2 + 2,
        y + 3,
        slot - 4,
        chartHeight + 6,
        2,
        2,
        'F',
      )
    }
    fill(COLORS.green)
    if (gainHeight > 0)
      doc.rect(
        center - barWidth - 0.6,
        base - gainHeight,
        barWidth,
        gainHeight,
        'F',
      )
    fill(COLORS.red)
    if (lossHeight > 0)
      doc.rect(center + 0.6, base - lossHeight, barWidth, lossHeight, 'F')
    doc.setFont('helvetica', current ? 'bold' : 'normal')
    doc.setFontSize(8)
    ink(current ? COLORS.navy : COLORS.muted)
    const label = new Date(`${item.month}-01T12:00:00`)
      .toLocaleDateString('pt-BR', { month: 'short' })
      .replace('.', '')
    write(`${label}/${item.month.slice(2, 4)}`, center, base + 6, {
      align: 'center',
    })
  })
  draw(COLORS.line)
  doc.line(margin + 5, base, margin + contentWidth - 5, base)
  y = base + 18
  doc.setFontSize(8)
  fill(COLORS.green)
  doc.rect(margin, y - 2.6, 3, 3, 'F')
  ink(COLORS.muted)
  doc.setFont('helvetica', 'normal')
  write('Novos honorários', margin + 5, y)
  fill(COLORS.red)
  doc.rect(margin + 40, y - 2.6, 3, 3, 'F')
  write('Honorários perdidos', margin + 45, y)
  y += 12

  const list = (
    heading: string,
    items: ProcessMovementItem[],
    sign: 1 | -1,
    total: string,
    color: Color,
  ) => {
    ensure(26)
    title(heading)
    doc.setFontSize(10)
    ink(color)
    write(`${sign > 0 ? '+' : '-'} ${money(total)}`, width - margin, y - 7, {
      align: 'right',
    })
    draw(COLORS.navy)
    doc.setLineWidth(0.5)
    doc.line(margin, y - 3, width - margin, y - 3)
    if (!items.length) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9.5)
      ink(COLORS.muted)
      write(
        sign > 0 ? 'Nenhum contrato novo no mês.' : 'Nenhuma perda no mês.',
        margin,
        y + 6,
      )
      y += 20
      return
    }
    const sorted = items.slice().sort((a, b) => {
      if (a.value == null) return b.value == null ? 0 : 1
      if (b.value == null) return -1
      const difference = decimalCents(b.value) - decimalCents(a.value)
      return difference < 0n ? -1 : difference > 0n ? 1 : 0
    })
    sorted.forEach((item) => {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      const company = doc.splitTextToSize(
        pdfText(item.empresa.toUpperCase()),
        contentWidth - 62,
      )
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.5)
      const type = doc.splitTextToSize(typeName(item.tipo), contentWidth - 62)
      const rowHeight = Math.max(15, company.length * 4.4 + type.length * 4 + 6)
      ensure(rowHeight)
      y += 5
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      ink(COLORS.ink)
      write(company, margin, y, { lineHeightFactor: 1.2 })
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.5)
      ink(COLORS.muted)
      write(type, margin, y + company.length * 4.4, { lineHeightFactor: 1.2 })
      doc.setFont('helvetica', 'bold')
      const value =
        item.value == null
          ? 'Não informado'
          : `${sign > 0 ? '+' : '-'} ${money(item.value)}`
      doc.setFontSize(Math.min(10, 58 / (value.length * 0.19)))
      ink(item.value == null ? COLORS.muted : color)
      write(value, width - margin, y + 1.5, { align: 'right' })
      y += rowHeight - 5
      draw(COLORS.line)
      doc.setLineWidth(0.25)
      doc.line(margin, y, width - margin, y)
    })
    y += 12
  }
  list('Novos contratos', report.entries, 1, report.gain, COLORS.green)
  list('Honorários perdidos', report.exits, -1, report.loss, COLORS.red)

  const losses = Object.entries(report.lossesByType).filter(
    (entry): entry is [string, string] => entry[1] !== undefined,
  )
  if (losses.length) {
    title('Perdas por tipo de processo')
    const maximum = losses.reduce(
      (max, [, value]) =>
        decimalCents(value) > max ? decimalCents(value) : max,
      1n,
    )
    const total = decimalCents(report.loss)
    losses.forEach(([type, value]) => {
      ensure(14)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      ink(COLORS.ink)
      const label = doc.splitTextToSize(typeName(type), 58)
      const count = report.exits.filter((entry) => entry.tipo === type).length
      write(label, margin, y + 3, { lineHeightFactor: 1.1 })
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      ink(COLORS.muted)
      write(`${count} empresa(s)`, margin, y + label.length * 3.5 + 4)
      const barStart = margin + 62
      const available = contentWidth - 62 - 52
      fill(COLORS.soft)
      doc.rect(barStart, y, available, 4, 'F')
      fill(COLORS.red)
      const cents = decimalCents(value)
      if (cents > 0n)
        doc.rect(
          barStart,
          y,
          Math.max(0.5, (available * Number(cents)) / Number(maximum)),
          4,
          'F',
        )
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      ink(COLORS.ink)
      write(money(value), width - margin - 14, y + 3.4, { align: 'right' })
      doc.setFont('helvetica', 'normal')
      ink(COLORS.muted)
      const percentage = total > 0n ? (cents * 100n + total / 2n) / total : 0n
      write(`${percentage}%`, width - margin, y + 3.4, { align: 'right' })
      y += Math.max(12, label.length * 3.5 + 8)
    })
    y += 5
  }
  if (report.missingValues) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(8.5)
    ink(COLORS.muted)
    const missing = doc.splitTextToSize(
      `${report.missingValues} processo(s) sem valor informado não entram nos totais.`,
      contentWidth,
    )
    ensure(missing.length * 4 + 5)
    write(missing, margin, y)
  }

  const pages = doc.getNumberOfPages()
  const generated = new Date().toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
  })
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page)
    draw(COLORS.navy)
    doc.setLineWidth(0.4)
    doc.line(margin, height - 16, width - margin, height - 16)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    ink(COLORS.muted)
    write('Jaralcon Assessoria Contábil · jaralcon.com.br', margin, height - 10)
    const generatedBy = `Gerado em ${generated}${authorName ? ` por ${authorName}` : ''}`
    const authorLines = doc.splitTextToSize(pdfText(generatedBy), 88)
    write(authorLines, width - margin, height - 11.5, {
      align: 'right',
      lineHeightFactor: 1,
    })
    write(`Página ${page} de ${pages}`, width - margin, height - 6.5, {
      align: 'right',
    })
  }
  doc.save(`Movimentacoes-Empresariais-${report.month}.pdf`)
}

function signedMoney(value: string): string {
  return `${decimalCents(value) < 0n ? '−' : '+'} ${formatProcessReportMoney(value.replace(/^-/, ''))}`
}

function pdfText(value: string): string {
  return value
    .replace(/\u00a0/g, ' ')
    .replace(/[−–—]/g, '-')
    .replace(/→/g, '->')
}

function loadPdfLibrary(): Promise<PdfConstructor> {
  const loaded = (window as PdfWindow).jspdf?.jsPDF
  if (loaded) return Promise.resolve(loaded)
  if (pdfLibrary) return pdfLibrary
  pdfLibrary = new Promise<PdfConstructor>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `${import.meta.env.BASE_URL}vendor/jspdf-4.2.1.umd.min.js`
    script.async = true
    const fail = () => {
      script.remove()
      pdfLibrary = undefined
      reject(
        new Error(
          'Não foi possível carregar o gerador de PDF. Tente novamente.',
        ),
      )
    }
    const timeout = window.setTimeout(fail, 15_000)
    script.onload = () => {
      window.clearTimeout(timeout)
      const constructor = (window as PdfWindow).jspdf?.jsPDF
      if (constructor) resolve(constructor)
      else fail()
    }
    script.onerror = () => {
      window.clearTimeout(timeout)
      fail()
    }
    document.head.appendChild(script)
  })
  return pdfLibrary
}

function loadLogo(): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const logo = new Image()
    logo.onload = () => resolve(logo)
    logo.onerror = () =>
      reject(new Error('Não foi possível carregar a marca do relatório.'))
    logo.src = reportLogoUrl
  })
}
