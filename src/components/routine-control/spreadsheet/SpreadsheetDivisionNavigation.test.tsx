/** @vitest-environment happy-dom */

import { act } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter, useLocation } from 'react-router'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import SpreadsheetDivisionNavigation from './SpreadsheetDivisionNavigation'
import type { SpreadsheetDivisionNavigationItem } from '../../../types/navigation'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

const divisions: SpreadsheetDivisionNavigationItem[] = [
  {
    id: 'division-mei',
    departmentId: 'dept-fiscal',
    name: 'MEI',
    description: 'Microempreendedores individuais',
    to: '/planilha?sheetId=fiscal&divisionId=division-mei',
  },
  {
    id: 'division-simples',
    departmentId: 'dept-fiscal',
    name: 'Simples Nacional',
    description: 'Empresas optantes pelo Simples',
    to: '/planilha?sheetId=fiscal&divisionId=division-simples',
  },
  {
    id: 'division-presumido',
    departmentId: 'dept-fiscal',
    name: 'Lucro Presumido',
    description: 'Empresas de lucro presumido',
    to: '/planilha?sheetId=fiscal&divisionId=division-presumido',
  },
]

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => {
    root.unmount()
  })
  document.body.innerHTML = ''
})

describe('SpreadsheetDivisionNavigation', () => {
  it('renders real links with one current page and no tab semantics', () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <SpreadsheetDivisionNavigation
          items={divisions}
          activeDivisionId="division-simples"
          ariaLabel="Divisões do departamento Fiscal"
        />
      </MemoryRouter>,
    )

    expect(markup).toContain('aria-label="Divisões do departamento Fiscal"')
    expect(markup).toContain(
      'href="/planilha?sheetId=fiscal&amp;divisionId=division-mei"',
    )
    expect(markup).toContain(
      'href="/planilha?sheetId=fiscal&amp;divisionId=division-presumido"',
    )
    expect(markup.match(/aria-current="page"/g)).toHaveLength(1)
    expect(
      markup.match(/<a[^>]*aria-current="page"[^>]*>/)?.[0] ?? '',
    ).toContain('divisionId=division-simples')
    expect(markup).not.toContain('role="tab"')
    expect(markup).not.toContain('role="tablist"')
  })

  it('exposes the fiscal division label and all choices on mobile', () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <SpreadsheetDivisionNavigation
          items={divisions}
          activeDivisionId="division-mei"
          selectLabel="Divisão fiscal"
        />
      </MemoryRouter>,
    )

    expect(markup).toContain('Divisão fiscal')
    expect(markup).toContain('<option value="division-mei" selected="">MEI')
    expect(markup).toContain('>Simples Nacional</option>')
    expect(markup).toContain('>Lucro Presumido</option>')
  })

  it('uses a department-neutral mobile label by default', () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <SpreadsheetDivisionNavigation
          items={divisions}
          activeDivisionId="division-mei"
        />
      </MemoryRouter>,
    )

    expect(markup).toContain('Divisão operacional')
    expect(markup).not.toContain('Divisão fiscal')
  })

  it('navigates to the selected division from the mobile control', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter
          initialEntries={['/planilha?sheetId=fiscal&divisionId=division-mei']}
        >
          <SpreadsheetDivisionNavigation
            items={divisions}
            activeDivisionId="division-mei"
          />
          <LocationProbe />
        </MemoryRouter>,
      )
    })

    const select = host.querySelector('select')
    if (!select) throw new Error('Mobile division select not found')

    await act(async () => {
      select.value = 'division-presumido'
      select.dispatchEvent(new Event('change', { bubbles: true }))
    })

    expect(host.querySelector('[data-location]')?.textContent).toBe(
      '/planilha?sheetId=fiscal&divisionId=division-presumido',
    )
  })

  it('renders nothing when there are no divisions', () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <SpreadsheetDivisionNavigation items={[]} activeDivisionId={null} />
      </MemoryRouter>,
    )

    expect(markup).toBe('')
  })
})

function LocationProbe() {
  const location = useLocation()

  return (
    <output data-location>
      {location.pathname}
      {location.search}
    </output>
  )
}
