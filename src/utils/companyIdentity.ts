import type {
  ClientCompanyInput,
  ClientCompanyPatch,
} from '../services/companyService'

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
  const digits = normalizeCnpj(value).slice(0, 14)
  return digits
    .replace(/^([A-Z0-9]{2})([A-Z0-9])/, '$1.$2')
    .replace(/^([A-Z0-9]{2})\.([A-Z0-9]{3})([A-Z0-9])/, '$1.$2.$3')
    .replace(/\.([A-Z0-9]{3})([A-Z0-9])/, '.$1/$2')
    .replace(/([A-Z0-9]{4})([A-Z0-9])/, '$1-$2')
}
export type CompanyRegistration = {
  [Field in keyof Required<ClientCompanyInput>]: string
}

export const companyEditConflictMessage =
  'Outra pessoa alterou esta empresa. Seu rascunho foi preservado. Reabra a edição para consultar a versão atual.'

function normalizeCnpj(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

export function validateCompanyRegistration(
  values: Pick<CompanyRegistration, 'name' | 'code' | 'cnpj' | 'email'>,
  baseline?: CompanyRegistration,
) {
  const errors: Partial<Record<'name' | 'code' | 'cnpj' | 'email', string>> = {}
  const code = values.code.trim()
  const cnpj = normalizeCnpj(values.cnpj)
  const email = values.email.trim()

  if (!values.name.trim()) errors.name = 'Informe o nome fantasia.'
  if (code && code !== baseline?.code.trim() && !/^\d{1,32}$/.test(code)) {
    errors.code = 'Use um código numérico com até 32 dígitos.'
  }
  if (
    cnpj &&
    cnpj !== normalizeCnpj(baseline?.cnpj ?? '') &&
    !isValidCnpj(cnpj)
  ) {
    errors.cnpj = 'Informe um CNPJ válido, com dígitos verificadores.'
  }
  if (
    email &&
    email !== baseline?.email.trim() &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    errors.email = 'Informe um e-mail válido.'
  }
  return errors
}

export function companyRegistrationValues(
  company?: ClientCompanyInput,
): CompanyRegistration {
  return {
    name: company?.name ?? '',
    legalName: company?.legalName ?? '',
    code: company?.code ?? '',
    cnpj: company?.cnpj ?? '',
    email: company?.email ?? '',
    mobilePhone: company?.mobilePhone ?? '',
    taxRegime: company?.taxRegime ?? '',
  }
}

export function companyRegistrationInput(
  values: CompanyRegistration,
): ClientCompanyInput {
  return {
    name: values.name.trim(),
    code: values.code.trim() || null,
    legalName: values.legalName.trim(),
    cnpj: formatCnpj(values.cnpj),
    email: values.email.trim(),
    mobilePhone: values.mobilePhone.trim(),
    taxRegime: values.taxRegime.trim(),
  }
}

export function companyRegistrationPatch(
  values: CompanyRegistration,
  baseline: CompanyRegistration,
): ClientCompanyPatch {
  const input = companyRegistrationInput(values)
  const original = companyRegistrationInput(baseline)
  return Object.fromEntries(
    Object.entries(input).filter(
      ([field, value]) => value !== original[field as keyof ClientCompanyInput],
    ),
  )
}
