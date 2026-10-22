/** Lê os decimais da API sem arredondar centavos em ponto flutuante. */
export function decimalToCents(value: string | number): bigint {
  const text =
    typeof value === 'number' && Number.isFinite(value)
      ? new Intl.NumberFormat('en-US', {
          useGrouping: false,
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(value)
      : String(value)
  const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(text)
  if (!match) throw new Error('O valor monetário informado é inválido.')
  const cents =
    BigInt(match[2]) * 100n + BigInt((match[3] ?? '').padEnd(2, '0'))
  return match[1] ? -cents : cents
}

export function centsToDecimal(value: bigint): string {
  const absolute = value < 0n ? -value : value
  return `${value < 0n ? '-' : ''}${absolute / 100n}.${String(absolute % 100n).padStart(2, '0')}`
}

export function formatProcessMoney(value: string | number): string {
  const amount = decimalToCents(value)
  const absolute = amount < 0n ? -amount : amount
  return `${amount < 0n ? '− ' : ''}R$\u00a0${(absolute / 100n).toLocaleString('pt-BR')},${String(absolute % 100n).padStart(2, '0')}`
}
