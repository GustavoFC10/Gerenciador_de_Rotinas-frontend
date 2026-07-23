import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import ViewStyleSwitcher from './ViewStyleSwitcher.jsx'

const options = [
  {
    id: 'one',
    label: 'Opção 1',
  },
  {
    id: 'two',
    label: 'Opção 2',
  },
  {
    id: 'three',
    label: 'Opção 3',
  },
]

describe('ViewStyleSwitcher', () => {
  it('shows only the three concise style options', () => {
    const markup = renderToStaticMarkup(
      <ViewStyleSwitcher value="two" options={options} />,
    )

    expect(markup).toContain('Opção 1')
    expect(markup).toContain('Opção 2')
    expect(markup).toContain('Opção 3')
    expect(markup.match(/aria-current="true"/g)).toHaveLength(1)
  })
})
