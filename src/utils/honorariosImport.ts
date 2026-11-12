import type {
  HonorariosClientInput,
  HonorariosCompanyOption,
  HonorariosParams,
  HonorariosProfile,
  HonorariosRegime,
} from '../types/honorarios'

export interface HonorariosImportRow {
  line: number
  input: HonorariosClientInput | null
  companyId?: string
  companyName?: string
  cnpj?: string
  code?: string
  errors: string[]
}

export const HONORARIOS_IMPORT_HEADER =
  'companyId;nome;cnpj;codigo;honorario_atual;data_reajuste;contato;regime;segmento;funcionarios;socios;faturamento;profile'
const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[\s_-]+/g, '')
    .trim()
const digits = (value: string) => value.replace(/\D/g, '')
const uuid = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i

/** RFC 4180 quoting, including quoted separators and line breaks; no spreadsheet evaluation. */
export function readHonorariosCsv(text: string): string[][] {
  const input = text.replace(/^\uFEFF/, '')
  const firstLine = input.split(/\r?\n/, 1)[0] ?? ''
  const separators = [';', '\t', ',']
  const separator = separators.reduce(
    (best, item) =>
      firstLine.split(item).length > firstLine.split(best).length ? item : best,
    ';',
  )
  const rows: string[][] = []
  let row: string[] = [],
    cell = '',
    quoted = false
  for (let index = 0; index < input.length; index++) {
    const char = input[index]
    if (char === '"') {
      if (quoted && input[index + 1] === '"') {
        cell += '"'
        index++
      } else if (quoted || !cell.trim()) quoted = !quoted
      else cell += char
    } else if (!quoted && char === separator) {
      row.push(cell)
      cell = ''
    } else if (!quoted && (char === '\n' || char === '\r')) {
      if (char === '\r' && input[index + 1] === '\n') index++
      row.push(cell)
      if (row.some((value) => value.trim())) rows.push(row)
      row = []
      cell = ''
    } else cell += char
  }
  if (quoted)
    throw new Error('O arquivo contém uma célula com aspas sem fechamento.')
  row.push(cell)
  if (row.some((value) => value.trim())) rows.push(row)
  return rows
}

function decimal(value: unknown, label: string): string {
  let text = String(value ?? '')
    .trim()
    .replace(/^R\$\s*/, '')
    .replace(/\s/g, '')
  if (text.includes(',')) text = text.replace(/\./g, '').replace(',', '.')
  if (!/^\d+(?:\.\d{1,2})?$/.test(text) || !Number.isFinite(Number(text)))
    throw new Error(
      `${label}: informe um valor não negativo com até duas casas decimais.`,
    )
  const [whole, fraction = ''] = text.split('.')
  return `${whole.replace(/^0+(?=\d)/, '')}.${fraction.padEnd(2, '0')}`
}
function count(value: unknown, label: string): number {
  const result = Number(value)
  if (
    !/^\d+$/.test(String(value).trim()) ||
    !Number.isSafeInteger(result) ||
    result < 0
  )
    throw new Error(`${label}: informe um inteiro não negativo.`)
  return result
}
function boolean(value: unknown, label: string): boolean {
  if (typeof value === 'boolean') return value
  const text = normalize(String(value))
  if (['sim', 'true', '1', 's'].includes(text)) return true
  if (['nao', 'false', '0', 'n', ''].includes(text)) return false
  throw new Error(`${label}: use sim ou não.`)
}
function date(value: string): string | null {
  if (!value.trim()) return null
  const text = value.trim()
  const br = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text)
  const iso = br ? `${br[3]}-${br[2]}-${br[1]}` : text
  const parsed = new Date(`${iso}T12:00:00Z`)
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(iso) ||
    !Number.isFinite(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== iso
  )
    throw new Error('Data de reajuste inválida. Use AAAA-MM-DD ou DD/MM/AAAA.')
  return iso
}
const aliases: Record<string, string[]> = {
  companyId: ['companyid', 'empresaid', 'uuid'],
  companyName: ['nome', 'name', 'empresa', 'razaosocial'],
  cnpj: ['cnpj'],
  code: ['codigo', 'code', 'codempresa'],
  currentFee: [
    'honorarioatual',
    'currentfee',
    'atual',
    'honorario',
    'valorpago',
  ],
  adjustmentDate: ['datareajuste', 'adjustmentdate', 'database'],
  contact: ['contato', 'contact'],
  notes: ['observacoes', 'obs', 'notes'],
}
function profileFromRow(
  values: Record<string, string>,
  params: HonorariosParams,
): HonorariosProfile {
  let raw: Record<string, unknown> = values.profile
    ? (JSON.parse(values.profile) as Record<string, unknown>)
    : values
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    throw new Error('profile deve conter um objeto JSON.')
  // Exported profiles retain their original ids. Only exact ids/labels are mapped for sheets.
  raw = { ...raw }
  const regimeText = normalize(String(raw.regime ?? ''))
  const regimes: Record<string, HonorariosRegime> = {
    mei: 'mei',
    simples: 'simples',
    simplesnacional: 'simples',
    presumido: 'presumido',
    lucropresumido: 'presumido',
    real: 'real',
    lucroreal: 'real',
  }
  const regime = regimes[regimeText]
  if (!regime)
    throw new Error('Informe o regime: MEI, Simples, Presumido ou Real.')
  const segmentText = normalize(String(raw.segmento ?? ''))
  const segment = params.segmentos.find(
    (item) =>
      normalize(item.id) === segmentText ||
      normalize(item.nome) === segmentText,
  )
  if (!segment)
    throw new Error('Informe um segmento existente na tabela de parâmetros.')
  const result: HonorariosProfile = {
    regime,
    segmento: segment.id,
    inativa: false,
    funcionarios: 0,
    socios: 1,
    xml: 0,
    notas: 0,
    emiteNF: false,
    filiais: 0,
    filiaisInativas: 0,
    faturamento: '0.00',
    usarHoras: false,
    horas: '0.00',
    servicos: [],
    anomalias: [],
  }
  for (const key of [
    'funcionarios',
    'socios',
    'xml',
    'notas',
    'filiais',
    'filiaisInativas',
  ] as const) {
    const value = raw[key] ?? raw[normalize(key)]
    if (value !== undefined && value !== '') result[key] = count(value, key)
  }
  for (const key of ['inativa', 'emiteNF', 'usarHoras'] as const) {
    const value = raw[key] ?? raw[normalize(key)]
    if (value !== undefined && value !== '') result[key] = boolean(value, key)
  }
  for (const key of ['faturamento', 'horas'] as const)
    if (raw[key] !== undefined && raw[key] !== '')
      result[key] = decimal(raw[key], key)
  for (const key of ['servicos', 'anomalias'] as const) {
    const value = raw[key]
    const ids = Array.isArray(value)
      ? value
      : typeof value === 'string' && value
        ? value.split('|').map((item) => item.trim())
        : []
    if (
      ids.some(
        (id) =>
          typeof id !== 'string' || !params[key].some((item) => item.id === id),
      ) ||
      new Set(ids).size !== ids.length
    )
      throw new Error(`${key}: existem IDs inválidos ou repetidos.`)
    result[key] = ids as string[]
  }
  return result
}

export function parseHonorariosRows(
  rows: string[][],
  params: HonorariosParams,
): HonorariosImportRow[] {
  if (rows.length < 2)
    throw new Error('Inclua o cabeçalho e pelo menos uma linha de cliente.')
  if (rows.length > 10001)
    throw new Error(
      'Importe no máximo 10.000 linhas por arquivo, em lotes de até 1.000.',
    )
  const headers = rows[0].map(normalize)
  if (new Set(headers).size !== headers.length)
    throw new Error('O arquivo contém cabeçalhos repetidos.')
  return rows.slice(1).map((cells, index) => {
    const values = Object.fromEntries(
      headers.map((header, cell) => [header, cells[cell]?.trim() ?? '']),
    )
    const get = (key: string) =>
      (aliases[key] ?? [normalize(key)])
        .map((name) => values[name])
        .find((value) => value !== undefined && value !== '') ?? ''
    const result: HonorariosImportRow = {
      line: index + 2,
      companyId: get('companyId'),
      companyName: get('companyName'),
      cnpj: get('cnpj'),
      code: get('code'),
      input: null,
      errors: [],
    }
    try {
      if (result.companyId && !uuid.test(result.companyId))
        throw new Error(
          'companyId deve ser um UUID válido de uma empresa existente.',
        )
      if (
        !result.companyId &&
        !result.cnpj &&
        !result.code &&
        !result.companyName
      )
        throw new Error(
          'Informe uma empresa para resolver o vínculo na prévia.',
        )
      result.input = {
        companyId: result.companyId ?? '',
        profile: profileFromRow(values, params),
        currentFee: decimal(get('currentFee'), 'Honorário atual'),
        adjustmentDate: date(get('adjustmentDate')),
        contact: get('contact'),
        notes: get('notes'),
      }
      if (
        result.input.contact!.length > 500 ||
        result.input.notes!.length > 5000
      )
        throw new Error('Contato ou observações excedem o limite permitido.')
    } catch (error) {
      result.input = null
      result.errors.push(
        error instanceof Error ? error.message : 'Linha inválida.',
      )
    }
    return result
  })
}
export function parseHonorariosCsv(
  text: string,
  params: HonorariosParams,
): HonorariosImportRow[] {
  return parseHonorariosRows(readHonorariosCsv(text), params)
}

/** Matches only unique, exact identifiers. A company name is never treated as identity. */
export function resolveHonorariosImportCompany(
  row: HonorariosImportRow,
  options: HonorariosCompanyOption[],
): HonorariosCompanyOption | undefined {
  const matches = options.filter((option) =>
    row.companyId
      ? option.id.toLowerCase() === row.companyId.toLowerCase()
      : row.cnpj
        ? digits(option.cnpj) === digits(row.cnpj)
        : row.code
          ? String(option.code ?? '') === row.code
          : false,
  )
  if (matches.length !== 1) return undefined
  const match = matches[0]
  if (row.cnpj && digits(match.cnpj) !== digits(row.cnpj)) return undefined
  if (row.code && String(match.code ?? '') !== row.code) return undefined
  return match
}

/** Reads standard XLSX locally; ZIP/XML decoding never runs formulas or downloads executable code. */
export async function parseHonorariosFile(
  file: File,
  params: HonorariosParams,
): Promise<HonorariosImportRow[]> {
  if (file.size > 25 * 1024 * 1024)
    throw new Error('O arquivo deve ter até 25 MB.')
  if (/\.xlsx$/i.test(file.name))
    return parseHonorariosRows(await readXlsx(await file.arrayBuffer()), params)
  if (/\.(csv|txt)$/i.test(file.name))
    return parseHonorariosCsv(await file.text(), params)
  throw new Error(
    'Use um arquivo .xlsx ou .csv. Para arquivos .xls, salve uma cópia em .xlsx.',
  )
}

interface ZipEntry {
  offset: number
  compressed: number
  size: number
  method: number
}
async function readXlsx(buffer: ArrayBuffer): Promise<string[][]> {
  const data = new DataView(buffer),
    bytes = new Uint8Array(buffer),
    decoder = new TextDecoder()
  let end = -1
  for (
    let index = bytes.length - 22;
    index >= Math.max(0, bytes.length - 65557);
    index--
  ) {
    if (data.getUint32(index, true) === 0x06054b50) {
      end = index
      break
    }
  }
  if (end < 0) throw new Error('Arquivo XLSX inválido ou protegido por senha.')
  const entries = new Map<string, ZipEntry>()
  let cursor = data.getUint32(end + 16, true),
    total = 0
  for (let index = 0; index < data.getUint16(end + 10, true); index++) {
    if (
      cursor + 46 > bytes.length ||
      data.getUint32(cursor, true) !== 0x02014b50
    )
      throw new Error('Estrutura ZIP inválida no XLSX.')
    const length = data.getUint16(cursor + 28, true),
      extra = data.getUint16(cursor + 30, true),
      comment = data.getUint16(cursor + 32, true)
    if (
      cursor + 46 + length + extra + comment > bytes.length ||
      data.getUint16(cursor + 8, true) & 1
    )
      throw new Error('XLSX inválido ou criptografado.')
    const name = decoder.decode(bytes.slice(cursor + 46, cursor + 46 + length))
    const size = data.getUint32(cursor + 24, true)
    total += size
    if (total > 100 * 1024 * 1024)
      throw new Error('O conteúdo descompactado do XLSX excede 100 MB.')
    entries.set(name, {
      offset: data.getUint32(cursor + 42, true),
      compressed: data.getUint32(cursor + 20, true),
      size,
      method: data.getUint16(cursor + 10, true),
    })
    cursor += 46 + length + extra + comment
  }
  async function xml(path: string, optional = false): Promise<Document | null> {
    const entry = entries.get(path)
    if (!entry) {
      if (optional) return null
      throw new Error(`Planilha XLSX incompleta: ${path}.`)
    }
    if (
      entry.offset + 30 > bytes.length ||
      data.getUint32(entry.offset, true) !== 0x04034b50
    )
      throw new Error('Cabeçalho ZIP inválido.')
    const start =
      entry.offset +
      30 +
      data.getUint16(entry.offset + 26, true) +
      data.getUint16(entry.offset + 28, true)
    if (start + entry.compressed > bytes.length)
      throw new Error('Conteúdo ZIP incompleto.')
    let content = bytes.slice(start, start + entry.compressed)
    if (entry.method === 8) {
      if (typeof DecompressionStream === 'undefined')
        throw new Error(
          'Este navegador não lê XLSX. Use um CSV ou atualize o navegador.',
        )
      const decompressed = new Blob([content])
        .stream()
        .pipeThrough(new DecompressionStream('deflate-raw'))
      const reader = decompressed.getReader(),
        chunks: Uint8Array[] = []
      let size = 0
      try {
        while (true) {
          const next = await reader.read()
          if (next.done) break
          size += next.value.byteLength
          if (size > entry.size || size > 100 * 1024 * 1024)
            throw new Error(
              'O conteúdo descompactado do XLSX excede o tamanho declarado.',
            )
          chunks.push(next.value)
        }
      } finally {
        await reader.cancel()
        reader.releaseLock()
      }
      content = new Uint8Array(size)
      let position = 0
      for (const chunk of chunks) {
        content.set(chunk, position)
        position += chunk.length
      }
    } else if (entry.method !== 0)
      throw new Error('Compressão XLSX não suportada. Salve como CSV.')
    if (content.length !== entry.size)
      throw new Error('Tamanho do conteúdo XLSX inválido.')
    const parsed = new DOMParser().parseFromString(
      decoder.decode(content),
      'application/xml',
    )
    if (parsed.getElementsByTagName('parsererror').length)
      throw new Error('XML inválido no arquivo XLSX.')
    return parsed
  }
  const workbook = await xml('xl/workbook.xml')
  const relations = await xml('xl/_rels/workbook.xml.rels')
  const first = workbook!.getElementsByTagName('sheet')[0]
  const relation = [...relations!.getElementsByTagName('Relationship')].find(
    (item) => item.getAttribute('Id') === first?.getAttribute('r:id'),
  )
  const target = relation?.getAttribute('Target') ?? 'worksheets/sheet1.xml'
  const sheetPath = target.startsWith('/')
    ? target.slice(1)
    : `xl/${target}`.replace(/\/\.\//g, '/')
  if (sheetPath.includes('..'))
    throw new Error('Caminho de planilha XLSX inválido.')
  const shared = await xml('xl/sharedStrings.xml', true)
  const strings = [...(shared?.getElementsByTagName('si') ?? [])].map((item) =>
    [...item.getElementsByTagName('t')]
      .map((text) => text.textContent ?? '')
      .join(''),
  )
  const styles = await xml('xl/styles.xml', true)
  const customFormats = new Map(
    [...(styles?.getElementsByTagName('numFmt') ?? [])].map((item) => [
      item.getAttribute('numFmtId'),
      item.getAttribute('formatCode') ?? '',
    ]),
  )
  const dateStyles = [
    ...(styles?.getElementsByTagName('cellXfs')[0]?.children ?? []),
  ].map((item) => {
    const id = Number(item.getAttribute('numFmtId'))
    return (
      (id >= 14 && id <= 22) ||
      /[dy]/i.test(
        (customFormats.get(String(id)) ?? '').replace(
          /"[^"]*"|\[[^\]]*\]/g,
          '',
        ),
      )
    )
  })
  const sheet = await xml(sheetPath)
  const epoch =
    workbook!
      .getElementsByTagName('workbookPr')[0]
      ?.getAttribute('date1904') === '1'
      ? Date.UTC(1904, 0, 1)
      : Date.UTC(1899, 11, 30)
  const rows: string[][] = []
  for (const node of sheet!.getElementsByTagName('row')) {
    const row: string[] = []
    for (const cell of node.getElementsByTagName('c')) {
      const ref = cell.getAttribute('r') ?? ''
      const letters = /^[A-Z]+/.exec(ref)?.[0] ?? ''
      let index = 0
      for (const letter of letters)
        index = index * 26 + letter.charCodeAt(0) - 64
      if (index < 1 || index > 1000)
        throw new Error('A planilha contém colunas fora do limite suportado.')
      const type = cell.getAttribute('t'),
        value = cell.getElementsByTagName('v')[0]?.textContent ?? ''
      let text =
        type === 's'
          ? (strings[Number(value)] ?? '')
          : type === 'inlineStr'
            ? [...cell.getElementsByTagName('t')]
                .map((item) => item.textContent ?? '')
                .join('')
            : value
      if (type === 'b') text = value === '1' ? 'sim' : 'nao'
      if (
        (!type || type === 'n') &&
        value &&
        dateStyles[Number(cell.getAttribute('s'))]
      ) {
        const parsed = new Date(epoch + Number(value) * 86400000)
        if (Number.isFinite(parsed.getTime()))
          text = parsed.toISOString().slice(0, 10)
      }
      row[index - 1] = text
    }
    if (row.some((value) => value?.trim()))
      rows.push(Array.from(row, (value) => value ?? ''))
    if (rows.length > 10001)
      throw new Error('A planilha excede o limite de 10.000 linhas.')
  }
  return rows
}
