import { buttonTone, focusRing } from '../../constants/designTokens'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  label: string
  tone?: keyof typeof buttonTone
}

function IconButton({
  children,
  label,
  type = 'button',
  tone = 'neutral',
  className = '',
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={`grid size-8 place-items-center rounded-[var(--radius-control)] transition ${buttonTone[tone]} ${focusRing} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export default IconButton
