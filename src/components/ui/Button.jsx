import { buttonTone, controlSize, focusRing } from '../../constants/designTokens.js'

function Button({
  children,
  type = 'button',
  tone = 'neutral',
  size = 'md',
  className = '',
  ...props
}) {
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
