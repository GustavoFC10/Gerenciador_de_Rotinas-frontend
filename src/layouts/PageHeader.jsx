import { appThemeClass } from '../constants/designTokens.js'

const sizeClass = {
  compact: {
    header: 'mb-4 min-h-16 pb-4',
    title: 'mt-2 text-2xl sm:text-3xl',
    description: 'mt-2',
  },
  default: {
    header: 'mb-5 min-h-24 pb-5',
    title: 'mt-3 text-3xl sm:text-4xl',
    description: 'mt-3',
  },
  workspace: {
    header: 'mb-5 min-h-28 pb-5',
    title: 'mt-3 text-3xl sm:text-4xl',
    description: 'mt-3',
  },
}

function PageHeader({
  eyebrow = 'Controle operacional',
  title,
  description,
  actions,
  size = 'default',
}) {
  const styles = sizeClass[size] ?? sizeClass.default

  return (
    <header className={`flex flex-wrap items-end justify-between gap-4 border-b ${styles.header} ${appThemeClass.pageHeader}`}>
      <div>
        {eyebrow && (
          <p className={`text-xs font-bold uppercase tracking-[0.18em] ${appThemeClass.brandText}`}>
            {eyebrow}
          </p>
        )}
        <h1 className={`font-black tracking-tight ${styles.title} ${appThemeClass.strongText}`}>
          {title}
        </h1>
        {description && (
          <p className={`max-w-4xl text-sm leading-6 ${styles.description} ${appThemeClass.mutedText}`}>
            {description}
          </p>
        )}
      </div>
      {actions}
    </header>
  )
}

export default PageHeader
