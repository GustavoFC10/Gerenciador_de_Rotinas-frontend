export const APP_THEME = {
  LIGHT: 'light',
  DARK: 'dark',
  JARAL: 'jaral',
}

export const appThemeOptions = [
  { value: APP_THEME.LIGHT, label: 'Claro' },
  { value: APP_THEME.DARK, label: 'Escuro' },
  { value: APP_THEME.JARAL, label: 'Jaral' },
]

export const appThemeClass = {
  shell: 'bg-[var(--color-app-bg)] text-[var(--color-text-main)]',
  sidebar:
    'border-[var(--color-nav-group-border)] bg-[var(--color-sidebar-bg)] text-[var(--color-text-main)]',
  topbar:
    'border-[var(--color-divider)] bg-[var(--color-topbar-bg)] text-[var(--color-text-main)]',
  pageHeader: 'border-[var(--color-page-header-border)]',
  panel:
    'border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] shadow-[var(--shadow-panel)]',
  mutedText: 'text-[var(--color-text-muted)]',
  strongText: 'text-[var(--color-text-strong)]',
  brandText: 'text-[var(--color-brand)]',
}

export const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-control-focus)]'

export const controlSize = {
  sm: 'min-h-8 px-2.5 text-xs',
  md: 'min-h-9 px-3 text-sm',
  lg: 'min-h-10 px-4 text-sm',
}

export const buttonTone = {
  primary:
    'bg-[var(--color-button-primary-bg)] text-[var(--color-button-primary-text)] hover:bg-[var(--color-button-primary-hover-bg)] disabled:opacity-60',
  neutral:
    'border border-[var(--color-button-neutral-border)] bg-[var(--color-button-neutral-bg)] text-[var(--color-button-neutral-text)] hover:bg-[var(--color-button-neutral-hover-bg)]',
  selected:
    'bg-[var(--color-brand-soft)] text-[var(--color-brand)] ring-1 ring-[var(--color-accent)]',
  ghost:
    'text-[var(--color-text-muted)] hover:bg-[var(--color-panel-soft-bg)] hover:text-[var(--color-text-strong)]',
}

export const statusTone = {
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
    dot: 'bg-[var(--color-brand)]',
    surface:
      'border-[var(--color-brand)] bg-[var(--color-brand-soft)] text-[var(--color-brand)]',
    card: 'border-[var(--color-brand)] bg-[var(--color-brand-soft)] hover:bg-[var(--color-accent-soft)]',
    accent: 'bg-[var(--color-brand)]',
    border: 'border-l-[var(--color-brand)]',
    code: 'bg-[var(--color-accent-soft)] text-[var(--color-brand)]',
    field:
      'border-[var(--color-brand)] bg-[var(--color-list-field-bg)] focus:border-[var(--color-brand)] focus:ring-[var(--color-focus-ring)]',
  },
  not_applicable: {
    label: 'Não se aplica',
    dot: 'bg-[var(--color-text-subtle)]',
    surface:
      'border-[var(--color-text-subtle)] bg-[var(--color-panel-soft-bg)] text-[var(--color-text-muted)]',
    card: 'border-[var(--color-text-subtle)] bg-[var(--color-panel-soft-bg)] hover:bg-[var(--color-control-hover-bg)]',
    accent: 'bg-[var(--color-text-subtle)]',
    border: 'border-l-[var(--color-text-subtle)]',
    code: 'bg-[var(--color-list-muted-bg)] text-[var(--color-text-muted)]',
    field:
      'border-[var(--color-text-subtle)] bg-[var(--color-list-field-bg)] focus:border-[var(--color-text-subtle)] focus:ring-[var(--color-focus-ring)]',
  },
}
