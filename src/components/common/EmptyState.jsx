function EmptyState({ title = 'Nada encontrado', description = '' }) {
  return (
    <div className="rounded-[var(--radius-panel)] border border-dashed border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] px-5 py-8 text-center">
      <h2 className="text-sm font-bold text-[var(--color-text-strong)]">
        {title}
      </h2>
      {description && (
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          {description}
        </p>
      )}
    </div>
  )
}

export default EmptyState
