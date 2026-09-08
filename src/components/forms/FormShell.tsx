import Card from '../ui/Card'
import type { FormHTMLAttributes, ReactNode } from 'react'

interface FormShellProps extends FormHTMLAttributes<HTMLFormElement> {
  title?: string
  description?: string
  error?: string | null
  children: ReactNode
}

function FormShell({
  title,
  description,
  error,
  children,
  className = '',
  ...props
}: FormShellProps) {
  return (
    <form className={`space-y-5 ${className}`} {...props}>
      <Card className="p-5">
        {(title || description || error) && (
          <header className="mb-5 border-b border-[var(--color-divider)] pb-4">
            {title && (
              <h2 className="text-lg font-bold text-[var(--color-text-strong)]">
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                {description}
              </p>
            )}
            {error && (
              <p className="mt-3 rounded-[var(--radius-control)] border border-[var(--status-error-border)] bg-[var(--status-error-bg)] px-3 py-2 text-sm font-medium text-[var(--status-error-text)]">
                {error}
              </p>
            )}
          </header>
        )}
        {children}
      </Card>
    </form>
  )
}

export default FormShell
