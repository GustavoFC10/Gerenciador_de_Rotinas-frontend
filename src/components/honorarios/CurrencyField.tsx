import TextField from '../ui/TextField'

export default function CurrencyField({
  label,
  value,
  onValueChange,
  disabled,
  required = true,
}: {
  label: string
  value: string | number
  onValueChange: (value: string) => void
  disabled?: boolean
  required?: boolean
}) {
  const amount = Number(value)
  return (
    <TextField
      className="hon-currency-field"
      label={label}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      required={required}
      disabled={disabled}
      value={
        value === ''
          ? ''
          : new Intl.NumberFormat('pt-BR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }).format(Number.isFinite(amount) ? amount : 0)
      }
      onChange={(event) => {
        const digits = event.target.value.replace(/\D/g, '')
        onValueChange(digits ? (Number(digits) / 100).toFixed(2) : '')
      }}
    />
  )
}
