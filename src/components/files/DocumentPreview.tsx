export default function DocumentPreview({ name }: { name: string }) {
  return (
    <div
      role="img"
      aria-label={`Documento: ${name}`}
      className="flex h-20 shrink-0 flex-col items-center justify-center gap-1 bg-[var(--color-panel-soft-bg)] text-[var(--color-text-subtle)]"
    >
      <svg
        viewBox="0 0 40 48"
        className="h-10 w-9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M9 3h15l9 9v29a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4Z" />
        <path d="M24 3v10h9M12 23h14M12 29h14M12 35h9" />
      </svg>
      <span className="text-[10px] font-semibold">Documento</span>
    </div>
  )
}
