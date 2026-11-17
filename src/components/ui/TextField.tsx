import type { InputHTMLAttributes, ReactNode, Ref } from 'react'
import './primitives.css'

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode
  ref?: Ref<HTMLInputElement>
}

function TextField({ label, className = '', ...props }: TextFieldProps) {
  return (
    <label className={`ui-field ${className}`}>
      {label && <span className="ui-field-label">{label}</span>}
      <input className="ui-control" {...props} />
    </label>
  )
}

export default TextField
