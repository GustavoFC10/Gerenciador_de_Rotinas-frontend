import type { ReactNode, TextareaHTMLAttributes } from 'react'
import './primitives.css'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: ReactNode
}

function Textarea({ label, className = '', ...props }: TextareaProps) {
  return (
    <label className={`ui-field ${className}`}>
      {label && <span className="ui-field-label">{label}</span>}
      <textarea className="ui-control ui-textarea" {...props} />
    </label>
  )
}

export default Textarea
