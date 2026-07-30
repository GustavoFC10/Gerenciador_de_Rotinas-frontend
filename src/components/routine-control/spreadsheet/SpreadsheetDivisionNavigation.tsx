import { Link, useNavigate } from 'react-router'

import type { EntityId } from '../../../types/domain'
import type { SpreadsheetDivisionNavigationItem } from '../../../types/navigation'

interface SpreadsheetDivisionNavigationProps {
  items: readonly SpreadsheetDivisionNavigationItem[]
  activeDivisionId: EntityId | null
  ariaLabel?: string
  selectLabel?: string
  className?: string
}

function SpreadsheetDivisionNavigation({
  items,
  activeDivisionId,
  ariaLabel = 'Divisões da planilha',
  selectLabel = 'Divisão operacional',
  className = '',
}: SpreadsheetDivisionNavigationProps) {
  const navigate = useNavigate()
  const activeItem = items.find((item) => item.id === activeDivisionId)

  if (items.length === 0) return null

  function handleMobileChange(value: EntityId) {
    const selectedItem = items.find((item) => item.id === value)

    if (selectedItem && selectedItem.id !== activeDivisionId) {
      void navigate(selectedItem.to)
    }
  }

  return (
    <nav
      className={`spreadsheet-division-navigation ${className}`.trim()}
      aria-label={ariaLabel}
      data-spreadsheet-division-navigation
    >
      <ul className="spreadsheet-division-navigation__desktop">
        {items.map((item) => {
          const isActive = item.id === activeDivisionId

          return (
            <li key={item.id}>
              <Link
                to={item.to}
                className="spreadsheet-division-navigation__link"
                aria-current={isActive ? 'page' : undefined}
              >
                <span className="spreadsheet-division-navigation__name">
                  {item.name}
                </span>
                {item.description && (
                  <span className="spreadsheet-division-navigation__description">
                    {item.description}
                  </span>
                )}
              </Link>
            </li>
          )
        })}
      </ul>

      <label className="spreadsheet-division-navigation__mobile">
        <span className="spreadsheet-division-navigation__mobile-label">
          {selectLabel}
        </span>
        <span className="spreadsheet-division-navigation__select-wrapper">
          <select
            value={activeItem?.id ?? ''}
            onChange={(event) => handleMobileChange(event.currentTarget.value)}
          >
            {!activeItem && (
              <option value="" disabled>
                Selecione uma divisão
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

export type { SpreadsheetDivisionNavigationProps }
export default SpreadsheetDivisionNavigation
