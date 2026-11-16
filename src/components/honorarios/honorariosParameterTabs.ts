/** Ordem e agrupamento comercial do protótipo de referência. */
export const HONORARIOS_PARAMETER_TABS = [
  { id: 'base', label: 'Valores base' },
  { id: 'adicionais', label: 'Adicionais' },
  { id: 'complexidade', label: 'Regime e horas' },
  { id: 'faixas', label: 'Faturamento' },
  { id: 'servicos', label: 'Serviços' },
  { id: 'anomalias', label: 'Exceções' },
  { id: 'planos', label: 'Planos' },
  { id: 'cobranca', label: 'Cobrança e reajuste' },
  { id: 'regras', label: 'Regras' },
] as const

export type HonorariosParameterSection =
  (typeof HONORARIOS_PARAMETER_TABS)[number]['id']
