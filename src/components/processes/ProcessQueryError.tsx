import { useEffect, useState } from 'react'

import { getErrorPresentation } from '../../utils/apiErrors'

interface Props {
  error: unknown
  retry: () => void
  clear?: () => void
  title?: string
}

export default function ProcessQueryError({
  error,
  retry,
  clear,
  title = 'Não foi possível carregar Processos',
}: Props) {
  const presentation = getErrorPresentation(error)
  const [remaining, setRemaining] = useState(
    presentation.retryAfterSeconds ?? 0,
  )
  useEffect(() => {
    const seconds = getErrorPresentation(error).retryAfterSeconds ?? 0
    setRemaining(seconds)
    if (seconds <= 0) return
    const deadline = Date.now() + seconds * 1000
    const timer = setInterval(() => {
      const next = Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
      setRemaining(next)
      if (next === 0) clearInterval(timer)
    }, 1000)
    return () => clearInterval(timer)
  }, [error])
  return (
    <div className="panel empty" role="alert">
      <h1>{title}</h1>
      <p>{presentation.message}</p>
      {presentation.supportReference && <p>{presentation.supportReference}</p>}
      {clear ? (
        <button className="btn" onClick={clear}>
          Remover filtros inválidos
        </button>
      ) : (
        <button
          className="btn primary"
          disabled={remaining > 0}
          onClick={retry}
        >
          {remaining > 0 ? `Aguarde ${remaining}s` : 'Tentar novamente'}
        </button>
      )}
    </div>
  )
}
