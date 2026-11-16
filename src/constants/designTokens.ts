import type { AppTheme, RoutineStatus } from '../types/domain'

export const APP_THEME = {
  LIGHT: 'light',
  DARK: 'dark',
} as const satisfies Record<string, AppTheme>

export const appThemeOptions: Array<{ value: AppTheme; label: string }> = [
  { value: APP_THEME.LIGHT, label: 'Claro' },
  { value: APP_THEME.DARK, label: 'Escuro' },
]

export const appThemeClass = {
  shell: 'bg-[var(--color-app-bg)] text-[var(--color-text-main)]',
  sidebar:
    'border-[var(--color-sidebar-border)] bg-[var(--color-sidebar-bg)] text-[var(--color-text-main)]',
  topbar:
    'border-[var(--color-divider)] bg-[var(--color-topbar-bg)] text-[var(--color-text-main)]',
  panel:
    'border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] shadow-[var(--shadow-panel)]',
  mutedText: 'text-[var(--color-text-muted)]',
  strongText: 'text-[var(--color-text-strong)]',
  brandText: 'text-[var(--color-brand)]',
}

export const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-control-focus)]'

export const controlSize = {
  sm: 'ui-button--sm',
  md: 'ui-button--md',
  lg: 'ui-button--lg',
}

export const buttonTone = {
  primary:
    'border border-transparent bg-[var(--color-button-primary-bg)] text-[var(--color-button-primary-text)] hover:bg-[var(--color-button-primary-hover-bg)] disabled:opacity-60',
  neutral:
    'border border-[var(--color-button-neutral-border)] bg-[var(--color-button-neutral-bg)] text-[var(--color-button-neutral-text)] hover:bg-[var(--color-button-neutral-hover-bg)]',
  selected:
    'border border-[var(--color-brand-border)] bg-[var(--color-brand-soft)] text-[var(--color-brand)]',
  ghost:
    'border border-transparent text-[var(--color-text-muted)] hover:bg-[var(--color-panel-soft-bg)] hover:text-[var(--color-text-strong)]',
}

interface StatusToneDefinition {
  label: string
  dot: string
  surface: string
  card: string
  accent: string
  border: string
  code: string
  field: string
}

export const statusTone: Record<RoutineStatus, StatusToneDefinition> = {
  pending: {
    label: 'Pendente',
    dot: 'border border-[var(--status-pending-border)] bg-[var(--status-pending-dot)]',
    surface:
      'border-[var(--status-pending-border)] bg-[var(--status-pending-bg)] text-[var(--status-pending-text)]',
    card: 'border-[var(--status-pending-border)] bg-[var(--status-pending-bg)] hover:bg-[var(--status-pending-hover-bg)]',
    accent: 'bg-[var(--status-pending-dot)]',
    border: 'border-l-[var(--status-pending-border)]',
    code: 'bg-[var(--status-pending-soft-bg)] text-[var(--status-pending-text)]',
    field:
      'border-[var(--status-pending-border)] bg-[var(--color-list-field-bg)] focus:border-[var(--color-control-focus)] focus:ring-[var(--color-focus-ring)]',
  },
  in_progress: {
    label: 'Em andamento',
    dot: 'bg-[var(--status-progress-dot)]',
    surface:
      'border-[var(--status-progress-border)] bg-[var(--status-progress-bg)] text-[var(--status-progress-text)]',
    card: 'border-[var(--status-progress-border)] bg-[var(--status-progress-bg)] hover:bg-[var(--status-progress-hover-bg)]',
    accent: 'bg-[var(--status-progress-dot)]',
    border: 'border-l-[var(--status-progress-dot)]',
    code: 'bg-[var(--status-progress-soft-bg)] text-[var(--status-progress-text)]',
    field:
      'border-[var(--status-progress-border)] bg-[var(--color-list-field-bg)] focus:border-[var(--status-progress-dot)] focus:ring-[var(--color-focus-ring)]',
  },
  error: {
    label: 'Erro',
    dot: 'bg-[var(--status-error-dot)]',
    surface:
      'border-[var(--status-error-border)] bg-[var(--status-error-bg)] text-[var(--status-error-text)]',
    card: 'border-[var(--status-error-border)] bg-[var(--status-error-bg)] hover:bg-[var(--status-error-hover-bg)]',
    accent: 'bg-[var(--status-error-dot)]',
    border: 'border-l-[var(--status-error-dot)]',
    code: 'bg-[var(--status-error-soft-bg)] text-[var(--status-error-text)]',
    field:
      'border-[var(--status-error-border)] bg-[var(--color-list-field-bg)] focus:border-[var(--status-error-dot)] focus:ring-[var(--color-focus-ring)]',
  },
  completed: {
    label: 'Concluido',
    dot: 'bg-[var(--status-completed-dot)]',
    surface:
      'border-[var(--status-completed-border)] bg-[var(--status-completed-bg)] text-[var(--status-completed-text)]',
    card: 'border-[var(--status-completed-border)] bg-[var(--status-completed-bg)] hover:bg-[var(--status-completed-hover-bg)]',
    accent: 'bg-[var(--status-completed-dot)]',
    border: 'border-l-[var(--status-completed-dot)]',
    code: 'bg-[var(--status-completed-soft-bg)] text-[var(--status-completed-text)]',
    field:
      'border-[var(--status-completed-border)] bg-[var(--color-list-field-bg)] focus:border-[var(--status-completed-dot)] focus:ring-[var(--color-focus-ring)]',
  },
  no_movement: {
    label: 'Sem movimento',
    dot: 'bg-[var(--status-no-movement-strong-bg)]',
    surface:
      'border-[var(--status-no-movement-border)] bg-[var(--status-no-movement-bg)] text-[var(--status-no-movement-text)]',
    card: 'border-[var(--status-no-movement-border)] bg-[var(--status-no-movement-bg)] hover:bg-[var(--status-no-movement-hover-bg)]',
    accent: 'bg-[var(--status-no-movement-strong-bg)]',
    border: 'border-l-[var(--status-no-movement-border)]',
    code: 'bg-[var(--status-no-movement-code-bg)] text-[var(--status-no-movement-text)]',
    field:
      'border-[var(--status-no-movement-border)] bg-[var(--color-list-field-bg)] focus:border-[var(--status-no-movement-border)] focus:ring-[var(--color-focus-ring)]',
  },
}

/** Commercial fee comparison; these tones do not represent execution status. */
export const feeAlignmentTone = {
  abaixo:
    'border-[var(--color-fee-below-border)] bg-[var(--color-fee-below-bg)] text-[var(--color-fee-below)]',
  alinhado:
    'border-[var(--color-fee-aligned-border)] bg-[var(--color-fee-aligned-bg)] text-[var(--color-fee-aligned)]',
  acima:
    'border-[var(--color-fee-above-border)] bg-[var(--color-fee-above-bg)] text-[var(--color-fee-above)]',
} as const
