function LoadingState({ message = 'Carregando...' }) {
  return (
    <main className="grid min-h-screen place-items-center bg-[var(--color-app-bg)]">
      <p className="text-sm font-medium text-[var(--color-text-muted)]">
        {message}
      </p>
    </main>
  )
}

export default LoadingState
