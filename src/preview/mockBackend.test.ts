import { afterEach, describe, expect, it, vi } from 'vitest'
import { PreviewBackend } from './mockBackend'
import {
  communicationFixtureIds as communicationIds,
  communicationMembers,
} from './processCommunicationsFixtures'
import {
  parseProcessCatalog,
  parseProcessCompanyOptionsPage,
  parsePreparedProcessAlert,
  parseProcessAlert,
  parseProcessAlertPage,
  parseProcessAlertRecipientPage,
  parseProcessDetail,
  parseProcessEntriesPage,
  parseProcessIndicators,
  parseProcessFollowUp,
  parseProcessFollowUpPage,
  parseProcessPage,
} from '../services/processContract'

const url = (path: string) => new URL(`http://preview.invalid/api/v1/${path}`)
const json = async (
  backend: PreviewBackend,
  path: string,
  method = 'GET',
  body = {},
) => (await backend.handle(url(path), method, body)).json()

describe('isolated feature preview', () => {
  afterEach(() => vi.useRealTimers())
  it('invites a process-only member and persists all profile fields and independent access', async () => {
    const backend = new PreviewBackend()
    const invitation = await json(backend, 'membership-invitations/', 'POST', {
      displayName: 'Nova pessoa',
      email: 'nova@example.com',
      role: 'member',
      moduleAccesses: [
        { module: 'routines', enabled: false },
        {
          module: 'processes',
          enabled: true,
          sectors: [{ sector: 'fin', role: 'fin', jobTitle: 'Analista' }],
        },
      ],
    })
    expect(invitation.memberId).toBeTruthy()
    const member = await json(
      backend,
      'organization-members/' + invitation.memberId + '/',
    )
    expect(member.status).toBe('pending')
    expect(member.moduleAccesses[1].sectors[0].jobTitle).toBe('Analista')
    const roster = await json(backend, 'organization-members/')
    expect(
      roster.results.some(
        (item: { id: string }) => item.id === invitation.memberId,
      ),
    ).toBe(true)
    const edited = await json(
      backend,
      'organization-members/' + invitation.memberId + '/',
      'PATCH',
      {
        displayName: 'Nome atualizado',
        role: 'admin',
        moduleAccesses: [
          { module: 'processes', enabled: false },
          { module: 'routines', enabled: true, role: 'admin' },
        ],
      },
    )
    expect(edited.displayName).toBe('Nome atualizado')
    expect(edited.role).toBe('admin')
    expect(
      backend.modules(invitation.memberId).map((item) => item.module),
    ).toEqual(['routines'])
  })
  it('creates and edits general company records through the module API', async () => {
    const backend = new PreviewBackend()
    const initial = await json(backend, 'client-companies/?status=active')
    expect(initial.results.length).toBeGreaterThan(0)
    const createdResponse = await backend.handle(
      url('client-companies/'),
      'POST',
      {
        name: 'Empresa do módulo',
        legalName: 'Empresa do módulo Ltda.',
        cnpj: '12345678000195',
      },
    )
    expect(createdResponse.status).toBe(201)
    const created = await createdResponse.json()
    const updatedResponse = await backend.handle(
      url(`client-companies/${created.id}/`),
      'PATCH',
      { name: 'Empresa atualizada' },
      new Headers({ 'If-Match': '"1"' }),
    )
    expect(updatedResponse.status).toBe(200)
    expect(await updatedResponse.json()).toMatchObject({
      id: created.id,
      name: 'Empresa atualizada',
      version: 2,
    })
    expect(
      (
        await backend.handle(url(`client-companies/${created.id}/`), 'PATCH', {
          name: 'Edição desatualizada',
        })
      ).status,
    ).toBe(409)
  })
  it('does not partially save an invalid profile and allows explicitly disabling Rotinas for an owner', async () => {
    const backend = new PreviewBackend()
    const before = await json(backend, 'organization-members/demo-diretoria/')
    const failed = await backend.handle(
      url('organization-members/demo-diretoria/'),
      'PATCH',
      {
        displayName: 'Should not be saved',
        moduleAccesses: [
          {
            module: 'routines',
            enabled: true,
            role: 'departments',
            sectors: [{ sector: 'other-tenant', role: 'lead' }],
          },
        ],
      },
    )
    expect(failed.status).toBe(400)
    expect(
      (await json(backend, 'organization-members/demo-diretoria/')).displayName,
    ).toBe(before.displayName)
    await json(backend, 'organization-members/demo-diretoria/', 'PATCH', {
      moduleAccesses: [{ module: 'routines', enabled: false }],
    })
    expect(backend.modules().map((item) => item.module)).toEqual([
      'companies',
      'processes',
    ])
  })

  it('seeds all ten workflows and useful operational states', async () => {
    const backend = new PreviewBackend()
    const catalog = await json(backend, 'processes/catalog/')
    const indicators = await json(backend, 'processes/indicators/')
    expect(catalog.types).toHaveLength(10)
    expect(catalog.contractVersion).toBe(2)
    expect(catalog.workflowVersion).toBe(2)
    expect(catalog.openStatuses).toEqual(['andamento', 'agendado', 'atrasado'])
    expect(Object.keys(catalog.statuses)).toHaveLength(5)
    expect(indicators.total).toBe(13)
    expect(indicators.late).toBeGreaterThan(0)
    expect(indicators.waiting).toBeGreaterThan(0)
    expect(indicators.completed).toBeGreaterThan(0)
    expect(indicators.cancelled).toBeGreaterThan(0)
    expect(indicators.active).toBe(
      indicators.byStatus.andamento +
        indicators.byStatus.agendado +
        indicators.byStatus.atrasado,
    )
  })
  it('serves searchable, paginated active company options with the process contract', async () => {
    const backend = new PreviewBackend()
    const first = parseProcessCompanyOptionsPage(
      await json(backend, 'processes/company-options/?pageSize=3'),
    )
    expect(first.count).toBeGreaterThan(3)
    expect(first.results).toHaveLength(3)
    expect(first.next).toContain('page=2')
    expect(first.results[0]?.status).toBe('active')
    const searched = parseProcessCompanyOptionsPage(
      await json(
        backend,
        'processes/company-options/?search=Clínica&page=1&pageSize=20',
      ),
    )
    expect(searched.count).toBe(1)
    expect(searched.results[0]?.name).toBe('Clínica Bem Viver')
    expect(
      (
        await backend.handle(
          url('processes/company-options/?search=invalid&unknown=true'),
        )
      ).status,
    ).toBe(400)
  })

  it('creates and edits general company records through the module API', async () => {
    const backend = new PreviewBackend()
    const initial = await json(backend, 'client-companies/?status=active')
    expect(initial.results.length).toBeGreaterThan(0)
    const createdResponse = await backend.handle(
      url('client-companies/'),
      'POST',
      {
        name: 'Empresa do módulo',
        legalName: 'Empresa do módulo Ltda.',
        cnpj: '12345678000195',
      },
    )
    expect(createdResponse.status).toBe(201)
    const created = await createdResponse.json()
    const updatedResponse = await backend.handle(
      url(`client-companies/${created.id}/`),
      'PATCH',
      { name: 'Empresa atualizada' },
      new Headers({ 'If-Match': '"1"' }),
    )
    expect(updatedResponse.status).toBe(200)
    expect(await updatedResponse.json()).toMatchObject({
      id: created.id,
      name: 'Empresa atualizada',
      version: 2,
    })
    expect(
      (
        await backend.handle(url(`client-companies/${created.id}/`), 'PATCH', {
          name: 'Edição desatualizada',
        })
      ).status,
    ).toBe(409)
  })

  it('serves responses accepted by the same contract decoder for all authorized personas', async () => {
    const backend = new PreviewBackend()
    for (const persona of [
      'demo-diretoria',
      'demo-financeiro',
      'demo-regularidade',
    ]) {
      backend.selectActor(persona)
      const catalog = parseProcessCatalog(
        await json(backend, 'processes/catalog/'),
      )
      expect(catalog.contractVersion).toBe(2)
      const collection = parseProcessPage(await json(backend, 'processes/'))
      expect(collection.count).toBe(13)
      parseProcessIndicators(await json(backend, 'processes/indicators/'))
      for (const summary of collection.results) {
        const detail = parseProcessDetail(
          await json(backend, `processes/${summary.id}/`),
        )
        expect(detail.status).toBe(summary.status)
        parseProcessEntriesPage(
          await json(backend, `processes/${summary.id}/entries/`),
        )
      }
    }
  })

  it('projects summaries separately and paginates only the requested collection page', async () => {
    const backend = new PreviewBackend()
    const first = await json(backend, 'processes/?pageSize=2')
    expect(first.count).toBe(13)
    expect(first.results).toHaveLength(2)
    expect(first.next).toContain('page=2')
    expect(first.previous).toBeNull()
    const second = await json(backend, first.next.replace('/api/v1/', ''))
    expect(second.results[0].id).not.toBe(first.results[0].id)
    expect(second.previous).toContain('page=1')
    for (const summary of first.results) {
      expect(summary).toHaveProperty('responsibleSectors')
      expect(summary).toHaveProperty('statusChangedAt')
      for (const field of [
        'tarefas',
        'etapas',
        'entries',
        'notas',
        'historico',
        'custo',
        'obs',
        'notifications',
      ])
        expect(summary).not.toHaveProperty(field)
    }
    const detail = await json(backend, `processes/${first.results[0].id}/`)
    expect(detail).toHaveProperty('tarefas')
    expect(detail).toHaveProperty('etapas')
    expect(detail).toHaveProperty('custo')
    expect(detail).not.toHaveProperty('entries')
    expect(detail).not.toHaveProperty('notas')
    expect(detail).not.toHaveProperty('historico')
  })

  it('uses repeated statuses with OR and applies other filters with AND, including indicators', async () => {
    const backend = new PreviewBackend()
    const query =
      'status=andamento&status=agendado&tipo=abertura&responsibleSector=fin&pageSize=1'
    const list = await json(backend, `processes/?${query}`)
    const indicators = await json(backend, `processes/indicators/?${query}`)
    expect(list.count).toBe(3)
    expect(list.results).toHaveLength(1)
    expect(indicators.total).toBe(list.count)
    expect(indicators.active).toBe(3)
    expect(indicators.byStatus.agendado).toBe(1)
    expect(indicators.byStatus.atrasado).toBe(0)
    expect(indicators.byStatus.cancelado).toBe(0)
    const search = await json(backend, 'processes/?q=PROTO-DEMO-100')
    expect(
      search.results.every(
        (item: { protocolo: string }) => item.protocolo === 'PROTO-DEMO-100',
      ),
    ).toBe(true)
  })

  it('keeps all four second visits open and responsible while the browser clock advances', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-29T12:00:00-03:00'))
    const backend = new PreviewBackend()
    const waiting = await json(backend, 'processes/?status=agendado')
    expect(
      new Set(waiting.results.map((item: { tipo: string }) => item.tipo)),
    ).toEqual(new Set(['abertura', 'mei', 'outro', 'reativacao']))
    vi.setSystemTime(new Date('2030-01-01T12:00:00-03:00'))
    const after = await json(backend, 'processes/?status=agendado')
    expect(after.results).toEqual(waiting.results)
    const responsible = await json(
      backend,
      'processes/?responsibleSector=fin&status=agendado',
    )
    expect(responsible.count).toBe(4)
    const queue = await json(backend, 'processes/?queueSector=fin')
    expect(
      queue.results.every(
        (item: { status: string }) => item.status !== 'agendado',
      ),
    ).toBe(true)
    const open = await json(
      backend,
      'processes/?status=andamento&status=agendado&status=atrasado',
    )
    for (const item of waiting.results)
      expect(
        open.results.some((process: { id: string }) => process.id === item.id),
      ).toBe(true)
    for (const summary of waiting.results) {
      expect(summary.responsibleSectors).toEqual(['fin'])
      expect(summary.analysis.pendingSectors).toEqual([])
      const detail = await json(backend, `processes/${summary.id}/`)
      const lastTask = detail.etapas[detail.analysis.currentStage].tasks[0]
      expect(
        (
          await backend.handle(
            url(`processes/${summary.id}/tasks/${lastTask.id}/transition/`),
            'POST',
            {
              version: detail.version,
              state: 'feito',
            },
          )
        ).status,
      ).toBe(409)
    }
  })

  it.each(['abertura', 'mei', 'outro', 'reativacao'])(
    'completes the recorded %s snapshot only after a server release and the final effective task',
    async (tipo) => {
      const backend = new PreviewBackend()
      const process = backend.state.processes.find(
        (item) => item.tipo === tipo && item.status === 'agendado',
      )!
      expect(process.status).toBe('agendado')
      // Recorded server release, independent of the test/browser clock.
      process.status = 'andamento'
      process.version++
      process.analysis.waiting = false
      process.analysis.releaseDate = null
      process.analysis.pendingSectors = ['fin']
      process.statusNextEvaluationAt = null
      const task = process.etapas[process.analysis.currentStage!].tasks[0]!
      expect(process.status).not.toBe('concluido')
      const completed = await json(
        backend,
        `processes/${process.id}/tasks/${task.id}/transition/`,
        'POST',
        {
          version: process.version,
          state: 'feito',
        },
      )
      expect(completed.status).toBe('concluido')
      expect(completed.analysis.completedTasks).toBe(
        completed.analysis.totalTasks,
      )
      expect(completed.responsibleSectors).toEqual([])
      const entries = await json(
        backend,
        `processes/${process.id}/entries/?kind=event`,
      )
      expect(
        entries.results.some(
          (item: { kind: string; details: { to?: string } }) =>
            item.kind === 'status_changed' && item.details.to === 'concluido',
        ),
      ).toBe(true)
    },
  )

  it('paginates notes and events after confidentiality filtering and returns updated detail when adding a note', async () => {
    const backend = new PreviewBackend()
    const process = backend.state.processes[0]!
    const initial = process.entries[0]!
    process.entries = Array.from({ length: 65 }, (_, index) => ({
      ...initial,
      id: `note-${index}`,
      em: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
      financial: index < 55,
      text: index < 55 ? 'Confidencial' : `Nota pública ${index}`,
    }))
    const created = await json(
      backend,
      `processes/${process.id}/notes/`,
      'POST',
      {
        version: process.version,
        text: 'Nota financeira nova',
      },
    )
    expect(created.version).toBe(2)
    expect(created).not.toHaveProperty('notas')
    const notes = await json(
      backend,
      `processes/${process.id}/entries/?kind=note&pageSize=50`,
    )
    expect(notes.count).toBe(66)
    expect(notes.results).toHaveLength(50)
    expect(notes.results[0].text).toBe('Nota financeira nova')
    expect(notes.next).toContain('page=2')
    backend.selectActor('demo-regularidade')
    const publicNotes = await json(
      backend,
      `processes/${process.id}/entries/?kind=note&pageSize=3`,
    )
    expect(publicNotes.count).toBe(10)
    expect(publicNotes.results).toHaveLength(3)
    expect(
      publicNotes.results.every(
        (item: { financial: boolean }) => !item.financial,
      ),
    ).toBe(true)
    const events = await json(
      backend,
      `processes/${process.id}/entries/?kind=event`,
    )
    expect(events.count).toBe(0)
    expect(events.results).toEqual([])
  })

  it('rejects removed, unknown, repeated and invalid parameters without a compatibility fallback', async () => {
    const backend = new PreviewBackend()
    for (const query of [
      'waiting=true',
      'late=true',
      'setor=fin',
      'unknown=1',
      'q=a&q=b',
      'status=unknown',
      'tipo=unknown',
      'responsibleSector=x',
      'page=0',
      'pageSize=0',
      'pageSize=101',
      'month=2026-13',
    ]) {
      expect(
        (await backend.handle(url(`processes/?${query}`))).status,
        query,
      ).toBe(400)
      expect(
        (await backend.handle(url(`processes/indicators/?${query}`))).status,
        query,
      ).toBe(400)
    }
    expect(
      (
        await backend.handle(
          url(
            'processes/00000000-0000-4000-8000-000000000001/entries/?kind=unknown',
          ),
        )
      ).status,
    ).toBe(400)
    backend.selectActor('demo-regularidade')
    expect(
      (await backend.handle(url('processes/?queueSector=fin'))).status,
    ).toBe(403)
    expect(
      (await backend.handle(url('processes/?responsibleSector=fin'))).status,
    ).toBe(200)
  })

  it('preserves waiting responsibility through cancellation/reopening and rejects a stale command', async () => {
    const backend = new PreviewBackend()
    const waiting = backend.state.processes.find(
      (process) => process.status === 'agendado',
    )!
    const cancelled = await json(
      backend,
      `processes/${waiting.id}/cancel/`,
      'POST',
      { version: waiting.version },
    )
    expect(cancelled.status).toBe('cancelado')
    expect(cancelled.responsibleSectors).toEqual([])
    expect(
      (
        await backend.handle(url(`processes/${waiting.id}/reopen/`), 'POST', {
          version: 1,
        })
      ).status,
    ).toBe(409)
    const reopened = await json(
      backend,
      `processes/${waiting.id}/reopen/`,
      'POST',
      { version: cancelled.version },
    )
    expect(reopened.status).toBe('agendado')
    expect(reopened.responsibleSectors).toEqual(['fin'])
    expect(reopened.analysis.pendingSectors).toEqual([])
    const events = await json(
      backend,
      `processes/${waiting.id}/entries/?kind=event`,
    )
    expect(events.results[0].details).toEqual({
      from: 'cancelado',
      to: 'agendado',
      trigger: 'command',
    })
  })
  it('creates processes idempotently and rejects old edit versions', async () => {
    const backend = new PreviewBackend()
    const payload = {
      tipo: 'abertura',
      empresa: 'Empresa em abertura',
      cnpj: '12345678000195',
    }
    const headers = new Headers({ 'Idempotency-Key': 'preview-opening' })
    const first = await backend.handle(
      url('processes/'),
      'POST',
      payload,
      headers,
    )
    const created = await first.json()
    const second = await backend.handle(
      url('processes/'),
      'POST',
      payload,
      headers,
    )
    expect(first.status).toBe(201)
    expect(second.status).toBe(200)
    expect((await second.json()).id).toBe(created.id)
    expect(created.companyId).toBeNull()
    expect(created.companyReference).toBeNull()
    expect(created.companyLinkRequired).toBe(false)
    expect(created.empresa).toBe(payload.empresa)
    expect(created.cnpj).toBe(payload.cnpj)
    const updated = await json(backend, `processes/${created.id}/`, 'PATCH', {
      version: 1,
      obs: 'Exemplo de edição',
    })
    expect(updated.version).toBe(2)
    expect(
      (
        await backend.handle(url(`processes/${created.id}/`), 'PATCH', {
          version: 1,
          empresa: 'Versão antiga',
        })
      ).status,
    ).toBe(409)
  })
  it('rejects manual company fields for other process types and company IDs for company openings', async () => {
    const backend = new PreviewBackend()
    const headers = new Headers({ 'Idempotency-Key': 'bad-opening' })
    expect(
      (
        await backend.handle(
          url('processes/'),
          'POST',
          { tipo: 'reativacao', empresa: 'Digitada manualmente' },
          headers,
        )
      ).status,
    ).toBe(400)
    expect(
      (
        await backend.handle(
          url('processes/'),
          'POST',
          {
            tipo: 'abertura',
            companyId: '00000000-0000-4000-8000-000000000001',
          },
          headers,
        )
      ).status,
    ).toBe(400)
  })
  it('keeps Regularidade private data hidden and does not infer Processos access for admins', async () => {
    const backend = new PreviewBackend()
    backend.selectActor('demo-regularidade')
    const process = await json(
      backend,
      'processes/00000000-0000-4000-8000-000000000001/',
    )
    expect(process.permissions.executeSectors).toEqual(['reg'])
    expect(process).not.toHaveProperty('custo')
    expect(process).not.toHaveProperty('obs')
    expect(process).not.toHaveProperty('notifications')
    expect(
      (
        await backend.handle(url('processes/'), 'POST', {
          tipo: 'abertura',
          empresa: 'Não permitido',
        })
      ).status,
    ).toBe(403)
    backend.selectActor('demo-admin')
    expect(
      backend.modules().some((module) => module.module === 'processes'),
    ).toBe(false)
    expect((await backend.handle(url('processes/catalog/'))).status).toBe(403)
  })
  it('executes allowed tasks and respects the waiting stage', async () => {
    const backend = new PreviewBackend()
    backend.selectActor('demo-financeiro')
    const process = await json(
      backend,
      'processes/00000000-0000-4000-8000-000000000001/',
    )
    const task = process.etapas[process.analysis.currentStage].tasks.find(
      (task: { d: string }) => task.d === 'fin',
    )
    const result = await json(
      backend,
      `processes/${process.id}/tasks/${task.id}/transition/`,
      'POST',
      { version: process.version, state: 'feito' },
    )
    expect(result.tarefas[task.id].s).toBe('feito')
    const waiting = await json(
      backend,
      'processes/00000000-0000-4000-8000-000000000007/',
    )
    expect(waiting.analysis.waiting).toBe(true)
    const next = waiting.etapas[waiting.analysis.currentStage].tasks[0]
    expect(
      (
        await backend.handle(
          url(`processes/${waiting.id}/tasks/${next.id}/transition/`),
          'POST',
          { version: waiting.version, state: 'feito' },
        )
      ).status,
    ).toBe(409)
  })
  it('simulates delivery state changes without retrying uncertain messages', async () => {
    const backend = new PreviewBackend()
    const before = await json(
      backend,
      'processes/00000000-0000-4000-8000-000000000001/',
    )
    const updated = await json(
      backend,
      `processes/${before.id}/notifications/retry/`,
      'POST',
      { version: before.version },
    )
    expect(updated.notifications.sent).toBe(
      before.notifications.sent +
        before.notifications.pending +
        before.notifications.failed,
    )
    expect(updated.notifications.uncertain).toBe(before.notifications.uncertain)
    expect(updated.notifications.pending).toBe(0)
  })
  it('persists role grants only in the demonstration store and resets them', async () => {
    const data = new Map<string, string>()
    const store = {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => {
        data.set(key, value)
      },
    }
    const backend = new PreviewBackend(store)
    await backend.handle(
      url('organization-members/demo-regularidade/module-accesses/'),
      'PUT',
      {
        module: 'processes',
        sector: 'fin',
        role: 'fin',
        jobTitle: 'Cargo demonstrativo',
      },
    )
    const restored = new PreviewBackend(store)
    restored.selectActor('demo-regularidade')
    expect(restored.permissions().viewFinancial).toBe(true)
    restored.reset()
    restored.selectActor('demo-regularidade')
    expect(restored.permissions().viewFinancial).toBe(false)
  })
})

describe('synthetic communication preview', () => {
  afterEach(() => vi.useRealTimers())
  const openingId = '00000000-0000-4000-8000-000000000001'

  it('serves recorded pending, declared and resolved snapshots through production decoders', async () => {
    const backend = new PreviewBackend()
    const alerts = parseProcessAlertPage(await json(backend, 'process-alerts/'))
    expect(alerts.count).toBe(4)
    expect(new Set(alerts.results.map((alert) => alert.status))).toEqual(
      new Set(['pending', 'sent', 'resolved']),
    )
    const pending = parseProcessAlertPage(
      await json(backend, 'process-alerts/?status=pending&pageSize=1'),
    )
    expect(pending.count).toBe(2)
    expect(pending.results).toHaveLength(1)
    expect(pending.next).toContain('page=2')
    const second = parseProcessAlertPage(
      await json(backend, pending.next!.replace('/api/v1/', '')),
    )
    expect(second.previous).toContain('page=1')
    expect(second.results[0].id).not.toBe(pending.results[0].id)
    const followUps = parseProcessFollowUpPage(
      await json(backend, `process-follow-ups/?processId=${openingId}`),
    )
    expect(followUps.count).toBe(2)
    expect(
      followUps.results.find((item) => item.state === 'resolved')?.completedBy,
    ).toBe(communicationMembers[1].memberId)
    parseProcessFollowUp(
      await json(
        backend,
        `process-follow-ups/${communicationIds.pendingFollowUp}/`,
      ),
    )
    parseProcessAlert(
      await json(backend, `process-alerts/${communicationIds.leggacyAlert}/`),
    )
    const tracking = parseProcessDetail(
      await json(backend, `processes/${openingId}/`),
    ).leggacy[0]
    expect(tracking.followUpDue).toBe(true)
    expect(tracking.awaitingReturn).toBe(true)
  })

  it('supports recipient search, sector filtering and requested-page metadata', async () => {
    const backend = new PreviewBackend()
    const all = parseProcessAlertRecipientPage(
      await json(backend, 'process-alerts/recipient-options/?pageSize=2'),
    )
    expect(all.count).toBe(5)
    expect(all.results).toHaveLength(2)
    expect(all.next).toContain('page=2')
    expect(
      (await json(backend, 'process-alerts/recipient-options/?q=MARINA'))
        .results[0].email,
    ).toBe('marina.costa@example.com')
    const financial = parseProcessAlertRecipientPage(
      await json(
        backend,
        'process-alerts/recipient-options/?sector=fin&pageSize=1',
      ),
    )
    expect(financial.count).toBe(3)
    expect(
      financial.results.every((member) => member.sectors.includes('fin')),
    ).toBe(true)
    expect(
      (await backend.handle(url('process-alerts/recipient-options/?page=99')))
        .status,
    ).toBe(404)
  })

  it('prepares people, sectors and their union without duplicates or mutation', async () => {
    const backend = new PreviewBackend()
    const path = `process-alerts/${communicationIds.leggacyAlert}/`
    const before = await json(backend, path)
    for (const selection of [
      { memberIds: [communicationMembers[1].memberId] },
      { sectors: ['fin'] },
      {
        sectors: ['fin'],
        memberIds: [
          communicationMembers[1].memberId,
          communicationMembers[1].memberId,
        ],
      },
    ]) {
      const prepared = parsePreparedProcessAlert(
        await json(backend, path + 'prepare/', 'POST', {
          version: before.version,
          ...selection,
        }),
      )
      expect(prepared.recipients).toHaveLength('sectors' in selection ? 3 : 1)
      expect(
        new Set(prepared.recipients.map((member) => member.memberId)).size,
      ).toBe(prepared.recipients.length)
      expect(prepared.copyText).toBe(
        `Para: ${prepared.recipients.map((member) => member.email).join(', ')}\nAssunto: ${before.subject}\n\n${before.body}`,
      )
      expect(await json(backend, path)).toEqual(before)
    }
    const everyone = parsePreparedProcessAlert(
      await json(backend, path + 'prepare/', 'POST', {
        version: 1,
        sectors: ['com', 'fin', 'reg'],
      }),
    )
    expect(everyone.recipients).toHaveLength(5)
    expect(
      new Set(everyone.recipients.map((member) => member.memberId)).size,
    ).toBe(5)
  })

  it('declares external sending separately and freezes recipients using the alert version', async () => {
    const backend = new PreviewBackend()
    const path = `process-alerts/${communicationIds.leggacyAlert}/`
    const processBefore = await json(backend, `processes/${openingId}/`)
    const selection = {
      version: 1,
      sectors: ['fin'],
      memberIds: [communicationMembers[1].memberId],
    }
    await json(backend, path + 'prepare/', 'POST', selection)
    expect((await json(backend, path)).status).toBe('pending')
    const declared = parseProcessAlert(
      await json(backend, path + 'declare-sent/', 'POST', selection),
    )
    expect(declared.status).toBe('sent')
    expect(declared.sentBy).toBe(communicationMembers[0].memberId)
    expect(declared.version).toBe(2)
    expect(declared.recipients).toHaveLength(3)
    expect(declared.selectedMemberIds).toEqual(selection.memberIds)
    expect(
      (await json(backend, 'process-alerts/?status=pending&pageSize=1')).count,
    ).toBe(1)
    await json(backend, 'organization-members/demo-financeiro/', 'PATCH', {
      displayName: 'Marina atualizada',
      email: 'outro@example.com',
    })
    expect((await json(backend, path)).recipients).toEqual(declared.recipients)
    const processAfter = await json(backend, `processes/${openingId}/`)
    expect(processAfter.notifications).toEqual(processBefore.notifications)
    expect(processAfter.tarefas).toEqual(processBefore.tarefas)
    expect(
      (await backend.handle(url(path + 'declare-sent/'), 'POST', selection))
        .status,
    ).toBe(409)
    expect(
      (
        await backend.handle(url(path + 'declare-sent/'), 'POST', {
          ...selection,
          version: 2,
        })
      ).status,
    ).toBe(409)
    backend.selectActor('demo-financeiro')
    const entries = await json(backend, `processes/${openingId}/entries/`)
    expect(
      entries.results.some(
        (item: { kind: string }) => item.kind === 'alert_sent',
      ),
    ).toBe(false)
  })

  it('revalidates revoked and suspended recipients between preparation and declaration', async () => {
    const backend = new PreviewBackend()
    const path = `process-alerts/${communicationIds.leggacyAlert}/`
    const selection = {
      version: 1,
      memberIds: [communicationMembers[1].memberId],
    }
    await json(backend, path + 'prepare/', 'POST', selection)
    backend.state.accesses['demo-financeiro'] = []
    const revoked = await backend.handle(
      url(path + 'declare-sent/'),
      'POST',
      selection,
    )
    expect(revoked.status).toBe(400)
    expect((await json(backend, path)).status).toBe('pending')
    expect(
      (await json(backend, 'process-alerts/recipient-options/?q=Marina')).count,
    ).toBe(0)
    const regularity = backend.member('demo-regularidade')
    backend.storeMember({ ...regularity, status: 'suspended' })
    expect(
      (await json(backend, 'process-alerts/recipient-options/?sector=reg'))
        .count,
    ).toBe(1)
    expect(
      (
        await backend.handle(url(path + 'prepare/'), 'POST', {
          version: 1,
          memberIds: [communicationMembers[2].memberId],
        })
      ).status,
    ).toBe(400)
    expect(
      (
        await backend.handle(url(path + 'prepare/'), 'POST', {
          version: 1,
          sectors: [],
          memberIds: [],
        })
      ).status,
    ).toBe(400)
  })

  it.each([
    'demo-financeiro',
    'demo-regularidade',
    'demo-rotinas',
    'demo-admin',
  ])('protects communication routes and actions for %s', async (persona) => {
    const backend = new PreviewBackend()
    backend.selectActor(persona)
    for (const path of [
      'process-alerts/',
      'process-alerts/recipient-options/',
      `process-alerts/${communicationIds.leggacyAlert}/`,
    ])
      expect((await backend.handle(url(path))).status).toBe(403)
    expect(
      (
        await backend.handle(
          url(`process-alerts/${communicationIds.leggacyAlert}/prepare/`),
          'POST',
          { version: 1, sectors: ['fin'] },
        )
      ).status,
    ).toBe(403)
    const readable = ['demo-financeiro', 'demo-regularidade'].includes(persona)
    expect((await backend.handle(url('process-follow-ups/'))).status).toBe(
      readable ? 200 : 403,
    )
    const complete = await backend.handle(
      url(`process-follow-ups/${communicationIds.pendingFollowUp}/complete/`),
      'POST',
      { version: 1 },
    )
    expect(complete.status).toBe(persona === 'demo-financeiro' ? 200 : 403)
  })

  it('records follow-up completion without changing the workflow, then closes it on return', async () => {
    const backend = new PreviewBackend()
    backend.selectActor('demo-financeiro')
    const before = await json(backend, `processes/${openingId}/`)
    const followUpPath = `process-follow-ups/${communicationIds.pendingFollowUp}/`
    const completed = parseProcessFollowUp(
      await json(backend, followUpPath + 'complete/', 'POST', { version: 1 }),
    )
    expect(completed.state).toBe('completed')
    expect(completed.version).toBe(2)
    expect(completed.completedBy).toBe(communicationMembers[1].memberId)
    const after = await json(backend, `processes/${openingId}/`)
    expect(after.analysis).toEqual(before.analysis)
    expect(after.tarefas).toEqual(before.tarefas)
    expect(after.version).toBe(before.version)
    expect(after.leggacy[0].awaitingReturn).toBe(true)
    expect(
      (
        await backend.handle(url(followUpPath + 'complete/'), 'POST', {
          version: 1,
        })
      ).status,
    ).toBe(409)
    await json(
      backend,
      `processes/${openingId}/tasks/ab5/transition/`,
      'POST',
      { version: before.version, state: 'feito' },
    )
    const resolved = parseProcessFollowUp(await json(backend, followUpPath))
    expect(resolved.state).toBe('resolved')
    expect(resolved.completedAt).toBe(completed.completedAt)
    expect(resolved.completedBy).toBe(completed.completedBy)
    expect(resolved.resolution).toBe('return_or_reset')
    expect(
      (await json(backend, `processes/${openingId}/`)).leggacy[0]
        .awaitingReturn,
    ).toBe(false)
    backend.selectActor('demo-diretoria')
    expect(
      (await json(backend, `process-alerts/${communicationIds.leggacyAlert}/`))
        .status,
    ).toBe('resolved')
  })

  it('closes pending situations after cancellation while keeping declared history and never regenerating on reads', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    const backend = new PreviewBackend()
    const path = `process-alerts/${communicationIds.leggacyAlert}/`
    const before = await json(backend, 'process-alerts/')
    vi.setSystemTime(new Date('2040-01-01T12:00:00Z'))
    expect(await json(backend, 'process-alerts/')).toEqual(before)
    await json(backend, path + 'declare-sent/', 'POST', {
      version: 1,
      sectors: ['com', 'fin', 'reg'],
    })
    const cancelled = await json(
      backend,
      `processes/${openingId}/cancel/`,
      'POST',
      { version: 1 },
    )
    const declared = await json(backend, path)
    expect(declared.status).toBe('sent')
    expect(declared.resolvedAt).toBeTruthy()
    expect(
      (
        await json(
          backend,
          `process-follow-ups/${communicationIds.pendingFollowUp}/`,
        )
      ).resolution,
    ).toBe('process_closed')
    await json(backend, `processes/${openingId}/reopen/`, 'POST', {
      version: cancelled.version,
    })
    expect((await json(backend, path)).status).toBe('sent')
    expect((await json(backend, 'process-alerts/')).count).toBe(4)
  })

  it('does not expose records of deleted processes or a different organization', async () => {
    const backend = new PreviewBackend()
    const process = backend.state.processes.find(
      (item) => item.id === openingId,
    )!
    process.organizationId = 'other-organization'
    expect(
      (
        await backend.handle(
          url(`process-alerts/${communicationIds.leggacyAlert}/`),
        )
      ).status,
    ).toBe(404)
    expect(
      (await json(backend, `process-follow-ups/?processId=${openingId}`)).count,
    ).toBe(0)
    process.organizationId = 'demo-office'
    await backend.handle(url(`processes/${openingId}/`), 'DELETE', {
      version: 1,
    })
    expect(
      (
        await backend.handle(
          url(`process-follow-ups/${communicationIds.pendingFollowUp}/`),
        )
      ).status,
    ).toBe(404)
    expect(
      (await json(backend, `process-alerts/?processId=${openingId}`)).count,
    ).toBe(0)
  })

  it('validates query limits, empty selections and resource versions without mutating fixtures', async () => {
    const backend = new PreviewBackend()
    for (const path of [
      'process-alerts/?pageSize=101',
      'process-alerts/?status=other',
      'process-alerts/?status=pending&status=sent',
      'process-alerts/?kind=other',
      'process-follow-ups/?state=other',
      'process-follow-ups/?processId=not-a-uuid',
      'process-alerts/recipient-options/?sector=other',
      'process-alerts/?page=0',
    ])
      expect((await backend.handle(url(path))).status, path).toBe(400)
    const path = `process-alerts/${communicationIds.leggacyAlert}/`
    expect(
      (
        await backend.handle(url(path + 'prepare/'), 'POST', {
          version: 99,
          sectors: ['fin'],
        })
      ).status,
    ).toBe(409)
    expect(
      (
        await backend.handle(url(path + 'prepare/'), 'POST', {
          version: 1,
          emails: ['arbitrary@example.com'],
        })
      ).status,
    ).toBe(400)
    expect((await json(backend, path)).version).toBe(1)
    const followUpPath = `process-follow-ups/${communicationIds.pendingFollowUp}/`
    expect(
      (
        await backend.handle(url(followUpPath + 'complete/'), 'POST', {
          version: 0,
        })
      ).status,
    ).toBe(400)
    expect(
      (
        await backend.handle(url(followUpPath + 'reopen/'), 'POST', {
          version: 1,
        })
      ).status,
    ).toBe(404)
  })

  it('retains communication changes for the instance and resets the synthetic demonstration explicitly', async () => {
    const backend = new PreviewBackend()
    const path = `process-alerts/${communicationIds.leggacyAlert}/`
    await json(backend, path + 'declare-sent/', 'POST', {
      version: 1,
      sectors: ['com'],
    })
    backend.selectActor('demo-financeiro')
    backend.selectActor('demo-diretoria')
    expect((await json(backend, path)).status).toBe('sent')
    backend.reset()
    expect((await json(backend, path)).status).toBe('pending')
    expect((await json(backend, 'process-alerts/?status=pending')).count).toBe(
      2,
    )
    await backend.handle(url('auth/logout/'), 'POST')
    expect((await backend.handle(url('process-alerts/'))).status).toBe(403)
  })
})
