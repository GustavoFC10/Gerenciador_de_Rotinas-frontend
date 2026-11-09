import { describe, expect, it } from 'vitest'
import { processQueryKeys } from './processQueryKeys'

describe('processQueryKeys', () => {
  const scope = { organizationId: 'org-1', membershipId: 'member-1' }
  it('isola organização, vínculo e revisão do contrato', () => {
    expect(processQueryKeys.root(scope)).toEqual([
      'organization',
      'org-1',
      'membership',
      'member-1',
      'processes',
      2,
    ])
    expect(processQueryKeys.list(scope, {})).not.toEqual(
      processQueryKeys.list({ ...scope, organizationId: 'org-2' }, {}),
    )
    expect(processQueryKeys.list(scope, {})).not.toEqual(
      processQueryKeys.list({ ...scope, membershipId: 'member-2' }, {}),
    )
  })
  it('normaliza ordem e repetição dos status, preservando filtros e página', () => {
    expect(
      processQueryKeys.list(scope, { status: ['agendado', 'andamento'] }),
    ).toEqual(
      processQueryKeys.list(scope, {
        status: ['andamento', 'agendado', 'agendado'],
      }),
    )
    expect(processQueryKeys.list(scope, { queueSector: 'fin' })).not.toEqual(
      processQueryKeys.list(scope, { responsibleSector: 'fin' }),
    )
    expect(processQueryKeys.list(scope, { page: 1 })).not.toEqual(
      processQueryKeys.list(scope, { page: 2 }),
    )
    expect(processQueryKeys.list(scope, { pageSize: 10 })).not.toEqual(
      processQueryKeys.list(scope, { pageSize: 50 }),
    )
  })
  it('oferece prefixos separados para invalidar listas, indicadores e entradas', () => {
    expect(processQueryKeys.list(scope, {}).slice(0, -1)).toEqual(
      processQueryKeys.list(scope),
    )
    expect(processQueryKeys.indicators(scope, {}).slice(0, -1)).toEqual(
      processQueryKeys.indicators(scope),
    )
    expect(
      processQueryKeys.entries(scope, 'p1', { kind: 'note' }).slice(0, -1),
    ).toEqual(processQueryKeys.entries(scope, 'p1'))
    expect(
      processQueryKeys.entries(scope, 'p1', { kind: 'note', page: 1 }),
    ).not.toEqual(
      processQueryKeys.entries(scope, 'p1', { kind: 'event', page: 1 }),
    )
    expect(
      processQueryKeys.entries(scope, 'p1', { kind: 'note', page: 1 }),
    ).not.toEqual(
      processQueryKeys.entries(scope, 'p1', { kind: 'note', page: 2 }),
    )
  })

  it('separates ordering, task projections, other sectors and global Leggacy metrics', () => {
    for (const filters of [
      { ordering: 'urgency' },
      { taskSector: 'fin' },
      { otherSector: 'fin' },
    ] as const)
      expect(processQueryKeys.list(scope, filters)).not.toEqual(
        processQueryKeys.list(scope, {}),
      )
    expect(processQueryKeys.list(scope, { taskSector: 'fin' })).not.toEqual(
      processQueryKeys.list(scope, { taskSector: 'reg' }),
    )
    expect(processQueryKeys.list(scope, {})).toEqual(
      processQueryKeys.list(scope, { ordering: 'recent' }),
    )
    expect(processQueryKeys.leggacyMetrics(scope)).not.toEqual(
      processQueryKeys.leggacyMetrics({ ...scope, membershipId: 'member-2' }),
    )
    expect(
      processQueryKeys.leggacyMetrics(scope, { responsibleSector: 'fin' }),
    ).not.toEqual(processQueryKeys.leggacyMetrics(scope))
  })

  it('isola avisos, cobranças e destinatários por tenant, vínculo, filtros e página', () => {
    for (const key of [
      processQueryKeys.followUps,
      processQueryKeys.alerts,
      processQueryKeys.alertRecipients,
    ]) {
      expect(key(scope, {})).not.toEqual(
        key({ ...scope, organizationId: 'org-2' }, {}),
      )
      expect(key(scope, {})).not.toEqual(
        key({ ...scope, membershipId: 'member-2' }, {}),
      )
      expect(key(scope, { page: 1 })).not.toEqual(key(scope, { page: 2 }))
      expect(key(scope, { pageSize: 1 })).not.toEqual(
        key(scope, { pageSize: 50 }),
      )
      expect(key(scope, {}).slice(0, -1)).toEqual(key(scope))
    }
    expect(processQueryKeys.alerts(scope, { status: 'pending' })).not.toEqual(
      processQueryKeys.alerts(scope, { status: 'sent' }),
    )
    expect(processQueryKeys.followUps(scope, { state: 'pending' })).not.toEqual(
      processQueryKeys.followUps(scope, { state: 'resolved' }),
    )
    expect(
      processQueryKeys.alertRecipients(scope, { sector: 'fin', q: 'Ana' }),
    ).not.toEqual(
      processQueryKeys.alertRecipients(scope, { sector: 'reg', q: 'Ana' }),
    )
  })
})
