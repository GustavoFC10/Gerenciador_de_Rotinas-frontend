import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'

import { buttonTone, focusRing } from '../../constants/designTokens'
import './primitives.css'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  label: string
  tone?: keyof typeof buttonTone
}

const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    {
      children,
      label,
      type = 'button',
      tone = 'neutral',
      className = '',
      ...props
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        aria-label={label}
        title={label}
        className={`ui-icon-button ${buttonTone[tone]} ${focusRing} ${className}`}
        {...props}
      >
        {children}
      </button>
    )
  },
)

IconButton.displayName = 'IconButton'

export default IconButton
