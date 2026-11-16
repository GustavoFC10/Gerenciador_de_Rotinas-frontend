import type { ReactNode, SelectHTMLAttributes } from 'react'
import './primitives.css'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: ReactNode
  children: ReactNode
}

function Select({ label, className = '', children, ...props }: SelectProps) {
  return (
    <label className={`ui-field ${className}`}>
      {label && <span className="ui-field-label">{label}</span>}
      <select className="ui-control" {...props}>
        {children}
      </select>
    </label>
  )
}

export default Select
