const cardVariantClass = {
  panel:
    'rounded-[var(--radius-panel)] border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] shadow-[var(--shadow-panel)]',
  metric:
    'rounded-[var(--radius-panel)] border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] shadow-[var(--shadow-panel)]',
  flat:
    'border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)]',
  quiet: 'bg-transparent',
}

function Card({ children, className = '', variant = 'panel' }) {
  return (
    <section
      className={`overflow-hidden ${cardVariantClass[variant] ?? cardVariantClass.panel} ${className}`}
    >
      {children}
    </section>
  )
}

export default Card
