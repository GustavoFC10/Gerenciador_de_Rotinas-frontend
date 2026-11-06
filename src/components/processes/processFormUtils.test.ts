import { describe, expect, it } from 'vitest'
import {
  changedProcessFields,
  normalizeProcessInput,
  normalizeProcessMoney,
  processInputFromResource,
  processDraftForType,
} from './processFormUtils'
import {
  makeProcessTestResource,
  processTestCatalog,
} from './processTestFixtures'

describe('process form contract', () => {
  it.each(['fin', 'reg'] as const)('keeps zero and false for Outros in %s and drops residual fields', departamentoSolicitado => {
    const type = processTestCatalog.types.find(type => type.id === 'outros')!
    for (const acionarLeggacy of [true, false]) {
      expect(normalizeProcessInput({ tipo: 'outros', empresa: ' Empresa ', descricaoProcesso: ' Atividade ',
        valorProcesso: '0', departamentoSolicitado, acionarLeggacy, cnpj: '123', honorario: '150', parcelas: 3, regime: 'simples',
      }, type)).toEqual({ tipo: 'outros', empresa: 'Empresa', descricaoProcesso: 'Atividade', valorProcesso: '0.00', departamentoSolicitado, acionarLeggacy })
    }
  })

  it('requires explicit Outros fields and never fills an omitted financial value in PATCH', () => {
    const type = processTestCatalog.types.find(type => type.id === 'outros')!
    const input = { tipo: 'outros' as const, empresa: 'Empresa', descricaoProcesso: 'Atividade', valorProcesso: '0', departamentoSolicitado: 'reg' as const, acionarLeggacy: false }
    for (const field of ['empresa', 'descricaoProcesso', 'valorProcesso', 'departamentoSolicitado', 'acionarLeggacy']) {
      const missing = { ...input, [field]: undefined }
      expect(() => normalizeProcessInput(missing, type)).toThrow()
    }
    const resource = makeProcessTestResource({ tipo: 'outros', descricaoProcesso: 'Atividade', departamentoSolicitado: 'reg', acionarLeggacy: false })
    const normalized = normalizeProcessInput({ ...processInputFromResource(resource), empresa: 'Corrigida' }, type, { allowOmittedValue: true })
    expect(normalized).not.toHaveProperty('valorProcesso')
    expect(changedProcessFields(normalized, resource)).toEqual({ empresa: 'Corrigida' })
    expect(() => normalizeProcessInput({ ...input, descricaoProcesso: 'x'.repeat(3001) }, type)).toThrow('3000')
    expect(() => normalizeProcessInput({ ...input, empresa: 'x'.repeat(201) }, type)).toThrow('200')
  })

  it('retains compatible identity and definitions and removes fields that do not apply to a new type', () => {
    const opening = processTestCatalog.types.find(type => type.id === 'abertura')!
    const departure = processTestCatalog.types.find(type => type.id === 'saida')!
    const others = processTestCatalog.types.find(type => type.id === 'outros')!
    const input = { tipo: 'mei' as const, empresa: 'Empresa', cnpj: '00.ABC.123/0001-00', honorario: '100.00', regime: 'simples' as const }
    expect(processDraftForType(input, opening)).toMatchObject({ empresa: input.empresa, cnpj: input.cnpj, honorario: '100.00', regime: 'simples' })
    expect(processDraftForType(input, departure)).toEqual({ tipo: 'saida', empresa: input.empresa, cnpj: input.cnpj })
    expect(processDraftForType(input, others)).toEqual({ tipo: 'outros', empresa: input.empresa })
  })

  it('normalizes BRL without dropping cents, undefined values or defined zero', () => {
    expect(normalizeProcessMoney('1.234,56')).toBe('1234.56')
    expect(normalizeProcessMoney('1234.5')).toBe('1234.50')
    expect(normalizeProcessMoney('0')).toBe('0.00')
    expect(normalizeProcessMoney('')).toBeNull()
    expect(normalizeProcessMoney('999999999999.99')).toBe('999999999999.99')
    expect(() => normalizeProcessMoney('-10')).toThrow()
    expect(() => normalizeProcessMoney('10.999')).toThrow()
    expect(() => normalizeProcessMoney('abc')).toThrow()
  })

  it('sends only applicable fields when changing a new process type', () => {
    const type = processTestCatalog.types.find(
      (type) => type.id === 'inatividade',
    )!
    expect(
      normalizeProcessInput(
        {
          tipo: 'inatividade',
          empresa: ' Empresa ',
          prazo: '2026-11-01',
          inicioInat: '2026-10-01',
          honorario: '500',
          regime: 'simples',
          honPerdido: '0',
        },
        type,
      ),
    ).toEqual({
      tipo: 'inatividade',
      empresa: 'Empresa',
      cnpj: '',
      protocolo: '',
      obs: '',
      inicioInat: '2026-10-01',
      honPerdido: '0.00',
      motivo: null,
      motivoObs: '',
    })
  })

  it('requires alteration definitions and the amount lost for departures', () => {
    const alteration = processTestCatalog.types.find(
      (type) => type.id === 'alteracao',
    )!
    expect(() =>
      normalizeProcessInput(
        { tipo: 'alteracao', empresa: 'Empresa' },
        alteration,
      ),
    ).toThrow('Selecione')
    expect(() =>
      normalizeProcessInput(
        {
          tipo: 'alteracao',
          empresa: 'Empresa',
          altItens: ['capital'],
          altDesc: 'Novo capital',
        },
        alteration,
      ),
    ).toThrow('custo')
    const departure = processTestCatalog.types.find(
      (type) => type.id === 'saida',
    )!
    expect(() =>
      normalizeProcessInput({ tipo: 'saida', empresa: 'Empresa' }, departure),
    ).toThrow('honorário')
    expect(() =>
      normalizeProcessInput(
        {
          tipo: 'saida',
          empresa: 'Empresa',
          honPerdido: '100',
          novoContador: true,
        },
        departure,
      ),
    ).toThrow('contador')
  })

  it('keeps API snapshots out of PATCH payloads and sends only edited data', () => {
    const process = makeProcessTestResource({
      custo: '500.00',
      obs: 'Original',
    })
    const input = processInputFromResource(process)
    expect(
      changedProcessFields(
        {
          tipo: input.tipo,
          empresa: input.empresa,
          custo: '500.00',
          obs: 'Alterada',
        },
        process,
      ),
    ).toEqual({ obs: 'Alterada' })
    expect(
      normalizeProcessInput(
        {
          tipo: 'reativacao',
          empresa: 'Empresa',
          reatJunta: false,
          reunAlinh: false,
          reunAcomp: false,
          trab: true,
          trabQtd: 2,
          trabValor: '10,50',
          honorario: '100,50',
        },
        processTestCatalog.types.find((type) => type.id === 'reativacao')!,
      ),
    ).toMatchObject({
      reatJunta: false,
      reunAlinh: false,
      reunAcomp: false,
      trab: true,
      trabQtd: 2,
      trabValor: '10.50',
      honorario: '100.50',
    })
  })
})
