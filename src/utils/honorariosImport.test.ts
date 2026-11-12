// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import paramsJson from '../../docs/honorarios_base/config-params.json'
import type { HonorariosParams } from '../types/honorarios'
import {
  parseHonorariosCsv,
  parseHonorariosFile,
  readHonorariosCsv,
  resolveHonorariosImportCompany,
} from './honorariosImport'

const params = paramsJson as HonorariosParams
const companyId = '443ef5da-7357-41c1-a789-38531fca78ee'
const profile = {
  regime: 'simples',
  segmento: 'servicos',
  funcionarios: 8,
  socios: 2,
  xml: 100,
  notas: 20,
  filiais: 1,
  filiaisInativas: 0,
  faturamento: '50000.00',
  horas: '2.00',
  usarHoras: true,
  emiteNF: true,
  inativa: false,
  servicos: ['consultoria'],
  anomalias: ['atraso'],
}
const quote = (value: string) => `"${value.replace(/"/g, '""')}"`

describe('Honorários portfolio import', () => {
  it('parses exported profile JSON, quoted separators and multiline contacts without losing profile data', () => {
    const csv = `\uFEFFcompanyId;nome;cnpj;contato;honorario_atual;data_reajuste;valor_parametro;profile\r\n${companyId};${quote('Empresa; Silva')};12.345.678/0001-90;${quote('Maria\n(41) 99999-9999')};850.25;2025-11-10;900.00;${quote(JSON.stringify(profile))}\r\n`
    const [row] = parseHonorariosCsv(csv, params)
    expect(row.errors).toEqual([])
    expect(row.companyName).toBe('Empresa; Silva')
    expect(row.input).toEqual({
      companyId,
      currentFee: '850.25',
      adjustmentDate: '2025-11-10',
      contact: 'Maria\n(41) 99999-9999',
      notes: '',
      profile,
    })
  })
  it('accepts Brazilian decimals, dates, regime labels and exact configured segments', () => {
    const [row] = parseHonorariosCsv(
      'nome;cnpj;regime;segmento;honorario_atual;data_reajuste;funcionarios;emitênf\nEmpresa;12345678000190;Lucro Presumido;Comércio;1.250,90;15/10/2025;4;sim',
      params,
    )
    expect(row.input).toMatchObject({
      currentFee: '1250.90',
      adjustmentDate: '2025-10-15',
      profile: { regime: 'presumido', segmento: 'comercio', funcionarios: 4 },
    })
  })
  it('does not silently fix invalid money, dates, profile JSON or repeated IDs', () => {
    for (const [value, expected] of [
      ['-1.00', 'não negativo'],
      ['12.001', 'duas casas'],
    ] as const) {
      const [row] = parseHonorariosCsv(
        `nome;regime;segmento;honorario_atual\nEmpresa;simples;servicos;${value}`,
        params,
      )
      expect(row.input).toBeNull()
      expect(row.errors.join()).toContain(expected)
    }
    const [date] = parseHonorariosCsv(
      'nome;regime;segmento;honorario_atual;data_reajuste\nEmpresa;simples;servicos;1;31/02/2025',
      params,
    )
    expect(date.errors.join()).toContain('Data')
    const [ids] = parseHonorariosCsv(
      `nome;honorario_atual;profile\nEmpresa;1;${quote(JSON.stringify({ ...profile, servicos: ['consultoria', 'consultoria'] }))}`,
      params,
    )
    expect(ids.errors.join()).toContain('repetidos')
    const [json] = parseHonorariosCsv(
      'nome;honorario_atual;profile\nEmpresa;1;{',
      params,
    )
    expect(json.input).toBeNull()
  })
  it('requires exact unique identifiers and never resolves approximate or repeated names', () => {
    const options = [
      {
        id: companyId,
        name: 'Empresa',
        cnpj: '12.345.678/0001-90',
        code: '001',
      },
      { id: 'id-2', name: 'Empresa', cnpj: '98.765.432/0001-10', code: '002' },
    ]
    const base = { line: 2, input: null, errors: [], companyName: 'Empresa' }
    expect(resolveHonorariosImportCompany(base, options)).toBeUndefined()
    expect(
      resolveHonorariosImportCompany(
        { ...base, cnpj: '12345678000190' },
        options,
      ),
    ).toEqual(options[0])
    expect(
      resolveHonorariosImportCompany({ ...base, code: '001' }, options),
    ).toEqual(options[0])
    expect(
      resolveHonorariosImportCompany(
        { ...base, companyId, cnpj: options[1].cnpj },
        options,
      ),
    ).toBeUndefined()
    expect(
      resolveHonorariosImportCompany({ ...base, cnpj: options[0].cnpj }, [
        options[0],
        { ...options[0], id: 'duplicate' },
      ]),
    ).toBeUndefined()
  })
  it('supports comma and tab separators and reports unclosed quotes', () => {
    expect(readHonorariosCsv('name,profile\nEmpresa,"{""x"":1}"')).toEqual([
      ['name', 'profile'],
      ['Empresa', '{"x":1}'],
    ])
    expect(readHonorariosCsv('nome\thonorario_atual\nEmpresa\t1')).toEqual([
      ['nome', 'honorario_atual'],
      ['Empresa', '1'],
    ])
    expect(() =>
      readHonorariosCsv('nome;campo\nEmpresa;"sem fechamento'),
    ).toThrow('aspas')
  })
  it('reads XLSX ZIP/XML with shared strings and a cached numeric fee entirely locally', async () => {
    const workbook =
      '<workbook xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Clientes" sheetId="1" r:id="rId1"/></sheets></workbook>'
    const rels =
      '<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>'
    const shared =
      '<sst><si><t>nome</t></si><si><t>regime</t></si><si><t>segmento</t></si><si><t>honorario_atual</t></si><si><t>Empresa</t></si><si><t>simples</t></si><si><t>servicos</t></si></sst>'
    const sheet =
      '<worksheet><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="C1" t="s"><v>2</v></c><c r="D1" t="s"><v>3</v></c></row><row r="2"><c r="A2" t="s"><v>4</v></c><c r="B2" t="s"><v>5</v></c><c r="C2" t="s"><v>6</v></c><c r="D2"><v>850.25</v></c></row></sheetData></worksheet>'
    const buffer = storedZip({
      'xl/workbook.xml': workbook,
      'xl/_rels/workbook.xml.rels': rels,
      'xl/sharedStrings.xml': shared,
      'xl/worksheets/sheet1.xml': sheet,
    })
    const [row] = await parseHonorariosFile(
      new File([buffer], 'carteira.xlsx'),
      params,
    )
    expect(row.errors).toEqual([])
    expect(row.input).toMatchObject({
      currentFee: '850.25',
      profile: { regime: 'simples', segmento: 'servicos' },
    })
  })
  it('reads a deflate-compressed XLSX sheet with inline strings', async () => {
    const workbook =
      '<workbook xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Clientes" sheetId="1" r:id="rId1"/></sheets></workbook>'
    const rels =
      '<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>'
    const sheet =
      '<worksheet><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>nome</t></is></c><c r="B1" t="inlineStr"><is><t>regime</t></is></c><c r="C1" t="inlineStr"><is><t>segmento</t></is></c><c r="D1" t="inlineStr"><is><t>honorario_atual</t></is></c></row><row r="2"><c r="A2" t="inlineStr"><is><t>Empresa</t></is></c><c r="B2" t="inlineStr"><is><t>simples</t></is></c><c r="C2" t="inlineStr"><is><t>servicos</t></is></c><c r="D2"><v>850.25</v></c></row></sheetData></worksheet>'
    const compressed = new Uint8Array([
      117, 145, 81, 10, 131, 48, 12, 134, 175, 34, 61, 192, 58, 5, 97, 15, 177,
      176, 205, 157, 96, 7, 24, 69, 130, 150, 217, 70, 210, 76, 175, 63, 28,
      195, 57, 104, 159, 146, 192, 255, 133, 124, 4, 22, 226, 103, 28, 16, 197,
      192, 167, 180, 86, 172, 1, 166, 165, 224, 70, 149, 202, 64, 183, 54, 231,
      82, 21, 210, 40, 23, 70, 23, 240, 46, 172, 12, 184, 104, 64, 76, 32, 143,
      160, 197, 128, 94, 103, 221, 125, 243, 151, 92, 158, 177, 119, 73, 226,
      154, 35, 34, 246, 30, 131, 80, 130, 105, 115, 204, 64, 129, 216, 178, 163,
      135, 149, 151, 29, 255, 81, 205, 180, 108, 134, 213, 102, 88, 101, 118,
      221, 252, 196, 24, 109, 74, 50, 135, 68, 231, 167, 17, 99, 202, 50, 139,
      32, 207, 174, 163, 20, 211, 174, 55, 206, 230, 84, 31, 15, 85, 13, 122,
      222, 91, 232, 221, 207, 244, 239, 149, 111,
    ])
    const buffer = storedZip(
      {
        'xl/workbook.xml': workbook,
        'xl/_rels/workbook.xml.rels': rels,
        'xl/worksheets/sheet1.xml': sheet,
      },
      { 'xl/worksheets/sheet1.xml': compressed },
    )
    const [row] = await parseHonorariosFile(
      new File([buffer], 'compactado.xlsx'),
      params,
    )
    expect(row.errors).toEqual([])
    expect(row.input?.currentFee).toBe('850.25')
  })
})

/** A stored ZIP fixture exercises the real ZIP directory and XML readers. */
function storedZip(
  files: Record<string, string>,
  deflated: Record<string, Uint8Array> = {},
): ArrayBuffer {
  const encoder = new TextEncoder(),
    chunks: Uint8Array[] = [],
    central: Uint8Array[] = []
  let offset = 0,
    size = 0
  for (const [path, text] of Object.entries(files)) {
    const name = encoder.encode(path),
      original = encoder.encode(text),
      contents = deflated[path] ?? original
    const local = new Uint8Array(30 + name.length + contents.length),
      view = new DataView(local.buffer)
    view.setUint32(0, 0x04034b50, true)
    view.setUint16(8, deflated[path] ? 8 : 0, true)
    view.setUint32(18, contents.length, true)
    view.setUint32(22, original.length, true)
    view.setUint16(26, name.length, true)
    local.set(name, 30)
    local.set(contents, 30 + name.length)
    chunks.push(local)
    const entry = new Uint8Array(46 + name.length),
      directory = new DataView(entry.buffer)
    directory.setUint32(0, 0x02014b50, true)
    directory.setUint16(10, deflated[path] ? 8 : 0, true)
    directory.setUint32(20, contents.length, true)
    directory.setUint32(24, original.length, true)
    directory.setUint16(28, name.length, true)
    directory.setUint32(42, offset, true)
    entry.set(name, 46)
    central.push(entry)
    offset += local.length
    size += entry.length
  }
  const end = new Uint8Array(22),
    view = new DataView(end.buffer)
  view.setUint32(0, 0x06054b50, true)
  view.setUint16(10, central.length, true)
  view.setUint32(12, size, true)
  view.setUint32(16, offset, true)
  const result = new Uint8Array(offset + size + 22)
  let index = 0
  for (const chunk of [...chunks, ...central, end]) {
    result.set(chunk, index)
    index += chunk.length
  }
  return result.buffer
}
