import { routineStatusConfig } from '../../../constants/routineStatus.js'

function StatusOptions({ task, onStatusChange, dark = false }) {
  return (
    <div
      className="grid grid-cols-4 gap-1.5"
      aria-label="Alterar estado"
    >
      {Object.entries(routineStatusConfig).map(([value, config]) => {
        const isSelected = task.status === value

        return (
          <button
            key={value}
            type="button"
            onClick={() => onStatusChange?.(task.id, value)}
            className={`flex min-h-9 items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 transition ${
              isSelected
                ? dark
                  ? 'border-white bg-white/10 text-white'
                  : 'border-slate-500 bg-slate-100 text-slate-900 shadow-sm'
                : dark
                  ? 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-500'
                  : 'border-slate-200 bg-white text-slate-500 hover:border-slate-400'
            }`}
          >
            <span
              className={`size-2.5 shrink-0 rounded-full ${config.dotClass}`}
            />
            <span className="text-[8px] font-bold uppercase tracking-tight sm:text-[9px]">
              {config.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function PaperclipIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor">
      <path
        d="m8 12.5 6.8-6.8a3 3 0 1 1 4.2 4.2l-8.5 8.5a5 5 0 0 1-7.1-7.1l8.1-8.1"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

function RoutineCardActions({
  task,
  onStatusChange,
  variant = 'document',
  className = '',
}) {
  const dark = variant === 'compact'
  const textareaClass = dark
    ? 'border-slate-700 bg-slate-950/40 text-white placeholder:text-slate-600'
    : 'border-slate-300 bg-white text-slate-700 placeholder:text-slate-400'
  const utilityButtonClass = dark
    ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
    : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900'

  if (variant === 'compact') {
    return (
      <div className={className}>
        <div className="overflow-hidden rounded-lg border border-slate-700 bg-slate-950/40">
          <div className="flex items-center justify-between border-b border-slate-700 px-3 py-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Observação
            </span>
            <button
              type="button"
              className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-semibold ${utilityButtonClass}`}
              aria-label="Anexar arquivo"
              title="Anexar arquivo"
            >
              <PaperclipIcon />
              Anexar
            </button>
          </div>
          <textarea
            defaultValue={task.notes}
            rows={3}
            placeholder="Observação..."
            aria-label="Observação"
            className="w-full resize-y border-0 bg-transparent px-3 py-2 text-sm text-white outline-none placeholder:text-slate-600"
          />
        </div>

        <div className="mt-4 border-t border-slate-800 pt-4">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Alterar estado
          </p>
          <StatusOptions task={task} onStatusChange={onStatusChange} dark />
        </div>
      </div>
    )
  }

  if (variant === 'panel') {
    return (
      <div className={className}>
        <div className="rounded-2xl bg-slate-50 p-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Observação
            </span>
            <button
              type="button"
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${utilityButtonClass}`}
              aria-label="Anexar arquivo"
              title="Anexar arquivo"
            >
              <PaperclipIcon />
              Anexar
            </button>
          </div>
          <label>
            <textarea
              defaultValue={task.notes}
              rows={3}
              placeholder="Adicione uma observação..."
              className={`mt-2 w-full resize-y rounded-xl border px-3 py-2 text-sm normal-case tracking-normal outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 ${textareaClass}`}
            />
          </label>
        </div>

        <div className="mt-4 border-t border-slate-100 pt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Alterar estado
          </p>
          <StatusOptions task={task} onStatusChange={onStatusChange} />
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      <div>
        <div className="mb-1.5 flex items-center justify-between gap-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Observação
          </span>
          <button
            type="button"
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${utilityButtonClass}`}
            aria-label="Anexar arquivo"
            title="Anexar arquivo"
          >
            <PaperclipIcon />
            Anexar
          </button>
        </div>
        <textarea
          defaultValue={task.notes}
          rows={3}
          aria-label="Observação"
          placeholder="Escreva uma observação sobre esta rotina..."
          className={`w-full resize-y rounded-lg border px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 ${textareaClass}`}
        />
      </div>

      <div className="mt-4 border-t border-slate-100 pt-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Alterar estado
        </p>
        <StatusOptions task={task} onStatusChange={onStatusChange} />
      </div>
    </div>
  )
}

export default RoutineCardActions
