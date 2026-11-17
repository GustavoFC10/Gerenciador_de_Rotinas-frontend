export function isValidCnpj(value: string) {
  if (!/^[A-Z0-9]{12}\d{2}$/.test(value) || /^(\d)\1{13}$/.test(value))
    return false
  const digit = (base: string, weights: number[]) => {
    const sum = [...base].reduce(
      (total, number, index) =>
        total + (number.charCodeAt(0) - 48) * weights[index]!,
      0,
    )
    const remainder = sum % 11
    return remainder < 2 ? 0 : 11 - remainder
  }
  const first = digit(value.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
  const second = digit(
    value.slice(0, 12) + first,
    [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
  )
  return value.endsWith(`${first}${second}`)
}

export function formatCnpj(value: string) {
  const digits = value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 14)
  return digits
    .replace(/^([A-Z0-9]{2})([A-Z0-9])/, '$1.$2')
    .replace(/^([A-Z0-9]{2})\.([A-Z0-9]{3})([A-Z0-9])/, '$1.$2.$3')
    .replace(/\.([A-Z0-9]{3})([A-Z0-9])/, '.$1/$2')
    .replace(/([A-Z0-9]{4})([A-Z0-9])/, '$1-$2')
}
