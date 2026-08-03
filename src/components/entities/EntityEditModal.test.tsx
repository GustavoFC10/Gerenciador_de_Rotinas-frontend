import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { routineControlMock } from '../../mocks/routineControl.mock'
import EntityEditModal from './EntityEditModal'

describe('EntityEditModal', () => {
  it('edits the Fiscal configuration and company routine links together', () => {
    const client = routineControlMock.data.clients[0]!
    const markup = renderToStaticMarkup(
      <EntityEditModal
        type="client"
        entity={client}
        data={routineControlMock.data}
        onClose={() => undefined}
        onSave={() => undefined}
      />,
    )

    expect(markup).toContain('Editar empresa')
    expect(markup).toContain('Divisão fiscal')
    expect(markup).toContain('Aplicar predefinição')
    expect(markup).toContain('Buscar rotina fiscal')
    expect(markup).toContain('rotinas vinculadas')
    expect(markup).not.toContain('Divisão operacional de cada departamento')
  })

  it('uses the same recurrence configuration in routine editing', () => {
    const routine = routineControlMock.data.routines.find(
      (item) => item.id === 'routine-dasn-simei',
    )!
    const markup = renderToStaticMarkup(
      <EntityEditModal
        type="routine"
        entity={routine}
        data={routineControlMock.data}
        onClose={() => undefined}
        onSave={() => undefined}
      />,
    )

    expect(markup).toContain('Editar rotina')
    expect(markup).toContain('Mês de execução')
    expect(markup).toContain('Dia do mês')
    expect(markup).toContain('Responsável padrão')
    expect(markup).toContain('Empresas vinculadas')
    expect(markup).toContain('Desvincular')
    expect(markup).toContain('permanecem no histórico')
    expect(markup).not.toContain('Personalizada')
  })
})
