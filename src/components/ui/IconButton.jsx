import { buttonTone, focusRing } from '../../constants/designTokens.js'

function IconButton({
  children,
  label,
  type = 'button',
  tone = 'neutral',
  className = '',
  ...props
}) {
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
