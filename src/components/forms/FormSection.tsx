import type { ReactNode } from 'react'

function FormSection({
  title,
  description,
  children,
  className = '',
}: {
  title?: string
  description?: string
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`space-y-3 ${className}`}>
      {(title || description) && (
        <div>
          {title && <h3 className="app-component-title">{title}</h3>}
          {description && <p className="app-description mt-1">{description}</p>}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  )
}

export default FormSection
