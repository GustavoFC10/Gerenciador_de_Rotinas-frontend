function ErrorState({
  title = 'Nao foi possivel carregar',
  description,
  error,
}: {
  title?: string
  description?: string
  error?: Error | null
}) {
  return (
    <main className="grid min-h-screen place-items-center bg-[var(--color-app-bg)] px-4">
      <div className="rounded-[var(--radius-panel)] border border-[var(--status-error-border)] bg-[var(--status-error-bg)] p-5 text-center shadow-[var(--shadow-panel)]">
        <h1 className="text-sm font-bold text-[var(--status-error-text)]">
          {title}
        </h1>
        {description && (
          <p className="mt-2 text-sm text-[var(--status-error-text)]">
            {description}
          </p>
        )}
        {error && (
          <p className="mt-2 text-sm text-[var(--status-error-text)]">
            {error.message}
          </p>
        )}
      </div>
    </main>
  )
}

export default ErrorState
