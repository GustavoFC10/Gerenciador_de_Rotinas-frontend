import type {
  ProcessCatalogType,
  ProcessCreateInput as ProcessInput,
  ProcessResource,
} from '../../types/processes'
import {
  centsToDecimal,
  decimalToCents,
  formatProcessMoney,
} from '../../utils/processMoney'

export const PROCESS_REGIMES = {
  simples: 'Simples Nacional',
  presumido: 'Lucro Presumido',
  real: 'Lucro Real',
}
export const PROCESS_PAYERS = { cliente: 'Cliente', jaralcon: 'Jaralcon' }
export const PROCESS_ALTERATIONS = {
  societario: 'Quadro societário',
  capital: 'Capital social',
  bens: 'Incorporação de bens',
  endereco: 'Endereço',
  razao: 'Razão social',
  atividades: 'Atividades',
  outros: 'Outros',
}
export const PROCESS_REASONS = {
  encerramento: 'Encerramento das atividades',
  honorarios: 'Valor dos honorários',
  atendimento: 'Insatisfação com o atendimento',
  concorrente: 'Mudança para outra contabilidade',
  inadimplencia: 'Inadimplência',
  venda: 'Venda ou fusão da empresa',
  reducao: 'Redução de atividade',
  outros: 'Outros',
}
export const DIRECT_LOSS_TYPES = ['baixa', 'saida', 'exclusao', 'inatividade']
export const LOSS_TYPES = [...DIRECT_LOSS_TYPES, 'inativa']
export const PROCESS_START_LABELS: Record<string, string> = {
  inatividade: 'Início da paralisação',
  inativa: 'Início da inatividade',
}

export const isProcessFeeAdjustment = (tipo: string) =>
  tipo === 'aumento_honorarios' || tipo === 'reducao_honorarios'

export function processFeeVariation(
  input: Pick<ProcessInput, 'honAnterior' | 'honorario'>,
): string | null {
  const previous = previewCents(input.honAnterior)
  const current = previewCents(input.honorario)
  return previous == null || current == null
    ? null
    : centsToDecimal(current - previous)
}

export const processHasField = (
  type: ProcessCatalogType | undefined,
  field: string,
) =>
  (field === 'honorario' && !!type && isProcessFeeAdjustment(type.id)) ||
  !!type?.etapas.some((stage) =>
    stage.tasks.some((task) => task.campo === field),
  )
export const processHasMeeting = (
  type: ProcessCatalogType | undefined,
  meeting?: string,
) =>
  !!type?.etapas.some((stage) =>
    stage.tasks.some(
      (task) => task.reuniao && (!meeting || task.reuniao === meeting),
    ),
  )
export const processHasCost = (type: ProcessCatalogType | undefined) =>
  type?.id === 'alteracao' || processHasField(type, 'custo')

export function processMoney(value: string | number | null | undefined) {
  return value == null || value === '' ? 'A definir' : formatProcessMoney(value)
}

/** Monetary request values retain every cent without passing through floating point. */
export function normalizeProcessMoney(
  value: string | null | undefined,
): string | null {
  if (value == null || !value.trim()) return null
  let text = value
    .trim()
    .replace(/^R\$\s*/, '')
    .replace(/\s/g, '')
  if (text.includes(',')) {
    if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+),\d{0,2}$/.test(text))
      throw new Error(
        'Informe os valores em reais, com até duas casas decimais.',
      )
    text = text.replace(/\./g, '').replace(',', '.')
  }
  if (!/^\d{1,12}(?:\.\d{0,2})?$/.test(text))
    throw new Error(
      'Informe valores positivos com até 12 dígitos e duas casas decimais.',
    )
  const [integer = '0', cents = ''] = text.split('.')
  return `${integer.replace(/^0+(?=\d)/, '')}.${cents.padEnd(2, '0')}`
}

export function processMonthlyTotal(
  input: Pick<ProcessInput, 'honorario' | 'trab' | 'trabQtd' | 'trabValor'>,
) {
  return centsToDecimal(
    (previewCents(input.honorario) ?? 0n) +
      decimalToCents(processPayrollTotal(input)),
  )
}

export function processPayrollTotal(
  input: Pick<ProcessInput, 'trab' | 'trabQtd' | 'trabValor'>,
): string {
  const quantity = input.trabQtd ?? 0
  if (!input.trab || !Number.isSafeInteger(quantity) || quantity < 1)
    return '0.00'
  return centsToDecimal(
    (previewCents(input.trabValor) ?? 0n) * BigInt(quantity),
  )
}

export function processInactivityLoss(
  input: Pick<
    ProcessInput,
    'honAnterior' | 'honorario' | 'trab' | 'trabQtd' | 'trabValor'
  >,
): string | null {
  const previous = previewCents(input.honAnterior)
  if (previous == null || previewCents(input.honorario) == null) return null
  const loss = previous - decimalToCents(processMonthlyTotal(input))
  return centsToDecimal(loss > 0n ? loss : 0n)
}

export function processInstallmentValue(
  cost: string | null | undefined,
  installments: number | null | undefined,
): string | null {
  const cents = previewCents(cost)
  if (
    cents == null ||
    !installments ||
    !Number.isSafeInteger(installments) ||
    installments < 1
  )
    return null
  const count = BigInt(installments)
  return centsToDecimal((cents + count / 2n) / count)
}

function previewCents(value: string | null | undefined): bigint | null {
  try {
    const normalized = normalizeProcessMoney(value)
    return normalized == null ? null : decimalToCents(normalized)
  } catch {
    return null
  }
}

export function processInputFromResource(
  process: ProcessResource,
): ProcessInput {
  return {
    tipo: process.tipo,
    empresa: process.empresa,
    descricaoProcesso: process.descricaoProcesso,
    valorProcesso: process.valorProcesso,
    departamentoSolicitado: process.departamentoSolicitado,
    acionarLeggacy: process.acionarLeggacy,
    cnpj: process.cnpj ?? '',
    protocolo: process.protocolo ?? '',
    prazo: process.prazo ?? null,
    inicioInat: process.inicioInat ?? null,
    obs: process.obs ?? '',
    custo: process.custo ?? null,
    pagador: process.pagador ?? null,
    parcelas: process.parcelas ?? null,
    honorario: process.honorario ?? null,
    honCobranca: process.honCobranca ?? null,
    trab: process.trab ?? false,
    trabQtd: process.trabQtd ?? null,
    trabValor: process.trabValor ?? null,
    honAnterior: process.honAnterior ?? null,
    honPerdido: process.honPerdido ?? null,
    altItens: process.altItens ?? [],
    altDesc: process.altDesc ?? '',
    motivo: process.motivo ?? null,
    motivoObs: process.motivoObs ?? '',
    regime: process.regime ?? null,
    regimeObs: process.regimeObs ?? '',
    contato: process.contato ?? '',
    novoContador: process.novoContador ?? false,
    contadorNome: process.contadorNome ?? '',
    contadorContato: process.contadorContato ?? '',
    reatJunta: process.reatJunta !== false,
    reunAlinh: process.reunAlinh !== false,
    reunAcomp: process.reunAcomp !== false,
  }
}

export function processDraftForType(
  input: ProcessInput,
  type: ProcessCatalogType,
): ProcessInput {
  const keys = isProcessFeeAdjustment(type.id)
    ? ['empresa', 'cnpj', 'contato', 'honAnterior', 'honorario']
    : type.id === 'outros'
      ? [
          'empresa',
          'contato',
          'descricaoProcesso',
          'valorProcesso',
          'departamentoSolicitado',
          'acionarLeggacy',
        ]
      : [
          'empresa',
          'contato',
          'cnpj',
          'protocolo',
          'obs',
          PROCESS_START_LABELS[type.id] ? 'inicioInat' : 'prazo',
          ...(processHasCost(type) ? ['custo', 'pagador', 'parcelas'] : []),
          ...(processHasField(type, 'honorario')
            ? ['honorario', 'honCobranca', 'trab', 'trabQtd', 'trabValor']
            : []),
          ...(processHasField(type, 'regime') ? ['regime', 'regimeObs'] : []),
          ...(type.id === 'inativa' ? ['honAnterior'] : []),
          ...(DIRECT_LOSS_TYPES.includes(type.id) ? ['honPerdido'] : []),
          ...(LOSS_TYPES.includes(type.id) ? ['motivo', 'motivoObs'] : []),
          ...(type.id === 'alteracao' ? ['altItens', 'altDesc'] : []),
          ...(type.id === 'saida'
            ? ['novoContador', 'contadorNome', 'contadorContato']
            : []),
          ...(type.id === 'reativacao' ? ['reatJunta'] : []),
          ...(processHasMeeting(type, 'alinhamento') ? ['reunAlinh'] : []),
          ...(processHasMeeting(type, 'acompanhamento') ? ['reunAcomp'] : []),
        ]
  return {
    ...Object.fromEntries(
      Object.entries(input).filter(([key]) => keys.includes(key)),
    ),
    tipo: type.id,
    empresa: input.empresa,
  }
}

export function normalizeProcessInput(
  input: ProcessInput,
  type: ProcessCatalogType,
  { allowOmittedValue = false }: { allowOmittedValue?: boolean } = {},
): ProcessInput {
  const empresa = input.empresa.trim()
  if (!empresa || empresa.length > 200)
    throw new Error('Informe o nome da empresa com até 200 caracteres.')
  const contato = input.contato?.trim() ?? ''
  if (contato.length > 500)
    throw new Error('Informe o contato do cliente com até 500 caracteres.')
  const contactFields = input.contato === undefined ? {} : { contato }
  if (isProcessFeeAdjustment(type.id)) {
    const honAnterior = normalizeProcessMoney(input.honAnterior)
    const honorario = normalizeProcessMoney(input.honorario)
    if (honAnterior === null || honorario === null)
      throw new Error(
        'Informe o honorário anterior e o novo honorário contábil, inclusive quando for zero.',
      )
    const difference = decimalToCents(honorario) - decimalToCents(honAnterior)
    if (difference === 0n)
      throw new Error('O novo honorário deve ser diferente do anterior.')
    if (type.id === 'aumento_honorarios' ? difference < 0n : difference > 0n)
      throw new Error(
        type.id === 'aumento_honorarios'
          ? 'No aumento, o novo honorário deve ser maior que o anterior.'
          : 'Na redução, o novo honorário deve ser menor que o anterior.',
      )
    return {
      tipo: type.id,
      empresa,
      cnpj: input.cnpj?.trim() ?? '',
      ...contactFields,
      honAnterior,
      honorario,
    }
  }
  if (type.id === 'outros') {
    const descricaoProcesso = input.descricaoProcesso?.trim() ?? ''
    if (!descricaoProcesso || descricaoProcesso.length > 3000)
      throw new Error(
        'Informe a descrição do processo com até 3000 caracteres.',
      )
    if (!['fin', 'reg'].includes(input.departamentoSolicitado ?? ''))
      throw new Error('Selecione o departamento solicitado.')
    if (typeof input.acionarLeggacy !== 'boolean')
      throw new Error('Informe se deseja acionar a Leggacy: Sim ou Não.')
    const valorProcesso = normalizeProcessMoney(input.valorProcesso)
    if (valorProcesso === null && !allowOmittedValue)
      throw new Error('Informe o valor do processo, inclusive quando for zero.')
    return {
      tipo: 'outros',
      empresa,
      ...contactFields,
      descricaoProcesso,
      departamentoSolicitado: input.departamentoSolicitado,
      acionarLeggacy: input.acionarLeggacy,
      ...(valorProcesso !== null ? { valorProcesso } : {}),
    }
  }
  const result: ProcessInput = {
    tipo: type.id,
    empresa,
    ...contactFields,
    cnpj: input.cnpj?.trim() ?? '',
    protocolo: input.protocolo?.trim() ?? '',
    obs: input.obs?.trim() ?? '',
  }
  if (!result.empresa) throw new Error('Informe a empresa ou o cliente.')
  if (PROCESS_START_LABELS[type.id])
    result.inicioInat = input.inicioInat || null
  else result.prazo = input.prazo || null
  if (processHasCost(type))
    Object.assign(result, {
      custo: normalizeProcessMoney(input.custo),
      pagador: input.pagador ?? null,
      parcelas: input.parcelas ?? null,
    })
  if (processHasField(type, 'honorario'))
    Object.assign(result, {
      honorario: normalizeProcessMoney(input.honorario),
      honCobranca: input.honCobranca || null,
      trab: !!input.trab,
      trabQtd: input.trab ? (input.trabQtd ?? null) : null,
      trabValor: input.trab ? normalizeProcessMoney(input.trabValor) : null,
    })
  if (processHasField(type, 'regime'))
    Object.assign(result, {
      regime: input.regime ?? null,
      regimeObs: input.regimeObs?.trim() ?? '',
    })
  if (type.id === 'inativa')
    result.honAnterior = normalizeProcessMoney(input.honAnterior)
  if (DIRECT_LOSS_TYPES.includes(type.id)) {
    result.honPerdido = normalizeProcessMoney(input.honPerdido)
    if (result.honPerdido == null)
      throw new Error('Informe o honorário mensal que deixa de ser cobrado.')
  }
  if (LOSS_TYPES.includes(type.id))
    Object.assign(result, {
      motivo: input.motivo ?? null,
      motivoObs: input.motivoObs?.trim() ?? '',
    })
  if (type.id === 'alteracao') {
    result.altItens = [...new Set(input.altItens ?? [])]
    result.altDesc = input.altDesc?.trim() ?? ''
    if (!result.altItens.length)
      throw new Error('Selecione o que será alterado.')
    if (!result.altDesc)
      throw new Error('Descreva os dados que serão alterados.')
    if (result.custo == null || !result.pagador || !result.parcelas)
      throw new Error(
        'Informe o custo da alteração, quem paga e a forma de pagamento.',
      )
  }
  if (type.id === 'saida') {
    Object.assign(result, {
      novoContador: !!input.novoContador,
      contadorNome: input.novoContador
        ? (input.contadorNome?.trim() ?? '')
        : '',
      contadorContato: input.novoContador
        ? (input.contadorContato?.trim() ?? '')
        : '',
    })
    if (
      result.novoContador &&
      (!result.contadorNome || !result.contadorContato)
    )
      throw new Error('Informe o nome e o contato do novo contador.')
  }
  if (type.id === 'reativacao') result.reatJunta = input.reatJunta !== false
  if (processHasMeeting(type, 'alinhamento'))
    result.reunAlinh = input.reunAlinh !== false
  if (processHasMeeting(type, 'acompanhamento'))
    result.reunAcomp = input.reunAcomp !== false
  return result
}

export function changedProcessFields(
  input: ProcessInput,
  process: ProcessResource,
) {
  const baseline = processInputFromResource(process)
  return Object.fromEntries(
    Object.entries(input).filter(
      ([key, value]) =>
        key !== 'tipo' &&
        key !== 'companyId' &&
        !(key === 'valorProcesso' && process.valorProcesso === undefined) &&
        JSON.stringify(value ?? null) !==
          JSON.stringify(
            baseline[key as keyof ProcessInput] ??
              (typeof value === 'string' ? '' : null),
          ),
    ),
  )
}
