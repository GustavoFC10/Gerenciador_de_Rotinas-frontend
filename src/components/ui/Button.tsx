import {
  buttonTone,
  controlSize,
  focusRing,
} from '../../constants/designTokens'
import type { ButtonHTMLAttributes } from 'react'

type ButtonTone = keyof typeof buttonTone
type ButtonSize = keyof typeof controlSize

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: ButtonTone
  size?: ButtonSize
}

function Button({
  children,
  type = 'button',
  tone = 'neutral',
  size = 'md',
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center rounded-[var(--radius-control)] font-bold transition ${controlSize[size]} ${buttonTone[tone]} ${focusRing} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export default Button
