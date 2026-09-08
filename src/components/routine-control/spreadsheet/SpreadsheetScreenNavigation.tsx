import { Link, useNavigate } from 'react-router'

import type { EntityId } from '../../../types/domain'
import type { ScreenNavigationItem } from '../../../types/navigation'

interface SpreadsheetScreenNavigationProps {
  items: readonly ScreenNavigationItem[]
  activeScreenId: EntityId | null
  ariaLabel?: string
  selectLabel?: string
  className?: string
}

/**
 * Mantém a composição visual das antigas abas de subdivisão, agora ligada
 * diretamente às telas do backend.
 */
function SpreadsheetScreenNavigation({
  items,
  activeScreenId,
  ariaLabel = 'Telas da planilha',
  selectLabel = 'Tela operacional',
  className = '',
}: SpreadsheetScreenNavigationProps) {
  const navigate = useNavigate()
  const activeItem = items.find((item) => item.id === activeScreenId)

  if (items.length === 0) return null

  function handleMobileChange(value: EntityId) {
    const selectedItem = items.find((item) => item.id === value)

    if (selectedItem && selectedItem.id !== activeScreenId) {
      void navigate(selectedItem.to)
    }
  }

  return (
    <nav
      className={['spreadsheet-screen-navigation', className]
        .filter(Boolean)
        .join(' ')}
      aria-label={ariaLabel}
      data-spreadsheet-screen-navigation
    >
      <ul className="spreadsheet-screen-navigation__desktop">
        {items.map((item) => {
          const isActive = item.id === activeScreenId

          return (
            <li key={item.id}>
              <Link
                to={item.to}
                className="spreadsheet-screen-navigation__link"
                aria-current={isActive ? 'page' : undefined}
              >
                <span className="spreadsheet-screen-navigation__name">
                  {item.name}
                </span>
                {item.description && (
                  <span className="spreadsheet-screen-navigation__description">
                    {item.description}
                  </span>
                )}
              </Link>
            </li>
          )
        })}
      </ul>

      <label className="spreadsheet-screen-navigation__mobile">
        <span className="spreadsheet-screen-navigation__mobile-label">
          {selectLabel}
        </span>
        <span className="spreadsheet-screen-navigation__select-wrapper">
          <select
            value={activeItem?.id ?? ''}
            onChange={(event) => handleMobileChange(event.currentTarget.value)}
          >
            {!activeItem && (
              <option value="" disabled>
                Selecione uma tela
              </option>
            )}
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
            <path d="m5 7.5 5 5 5-5" />
          </svg>
        </span>
      </label>
    </nav>
  )
}

export type { SpreadsheetScreenNavigationProps }
export default SpreadsheetScreenNavigation
