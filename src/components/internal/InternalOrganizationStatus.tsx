export function InternalOrganizationStatusBadge({
  status,
}: {
  status: string
}) {
  const isActive = status === 'active'

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${
        isActive
          ? 'border-[var(--status-completed-border)] bg-[var(--status-completed-bg)] text-[var(--status-completed-text)]'
          : 'border-[var(--color-divider)] bg-[var(--color-panel-soft-bg)] text-[var(--color-text-muted)]'
      }`}
    >
      <span
        className={`size-1.5 rounded-full ${
          isActive
            ? 'bg-[var(--status-completed-dot)]'
            : 'bg-[var(--color-text-subtle)]'
        }`}
        aria-hidden="true"
      />
      {isActive ? 'Ativa' : status === 'inactive' ? 'Inativa' : status}
    </span>
  )
}

export function InternalInvitationStatusBadge({ status }: { status: string }) {
  const detail = getInvitationStatusDetail(status)

  return (
    <span
      className={`inline-flex min-h-6 items-center rounded-full border px-2 text-xs font-bold ${detail.className}`}
    >
      {detail.label}
    </span>
  )
}

function getInvitationStatusDetail(status: string): {
  label: string
  className: string
} {
  if (status === 'accepted') {
    return {
      label: 'Convite aceito',
      className:
        'border-[var(--status-completed-border)] bg-[var(--status-completed-bg)] text-[var(--status-completed-text)]',
    }
  }

  if (status === 'pending') {
    return {
      label: 'Convite pendente',
      className:
        'border-[var(--status-progress-border)] bg-[var(--status-progress-bg)] text-[var(--status-progress-text)]',
    }
  }

  if (status === 'expired') {
    return {
      label: 'Convite expirado',
      className:
        'border-[var(--status-error-border)] bg-[var(--status-error-bg)] text-[var(--status-error-text)]',
    }
  }

  if (status === 'delivery_failed') {
    return {
      label: 'Entrega pendente',
      className:
        'border-[var(--status-error-border)] bg-[var(--status-error-bg)] text-[var(--status-error-text)]',
    }
  }

  return {
    label: status || 'Status indisponivel',
    className:
      'border-[var(--color-divider)] bg-[var(--color-panel-soft-bg)] text-[var(--color-text-muted)]',
  }
}
