import { describe, expect, it } from 'vitest'
import { PreviewBackend } from './mockBackend'

const url = (path: string) => new URL(`http://preview.invalid/api/v1/${path}`)
const json = async (
  backend: PreviewBackend,
  path: string,
  method = 'GET',
  body = {},
) => (await backend.handle(url(path), method, body)).json()

describe('isolated feature preview', () => {
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
    expect(backend.modules().map((item) => item.module)).toEqual(['processes'])
  })

  it('seeds all ten workflows and useful operational states', async () => {
    const backend = new PreviewBackend()
    const catalog = await json(backend, 'processes/catalog/')
    const indicators = await json(backend, 'processes/indicators/')
    expect(catalog.types).toHaveLength(10)
    expect(indicators.total).toBe(11)
    expect(indicators.late).toBeGreaterThan(0)
    expect(indicators.waiting).toBeGreaterThan(0)
    expect(indicators.completed).toBeGreaterThan(0)
    expect(indicators.cancelled).toBeGreaterThan(0)
  })
  it('creates processes idempotently and rejects old edit versions', async () => {
    const backend = new PreviewBackend()
    const payload = { tipo: 'abertura', empresa: 'Empresa fictícia' }
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
  it('keeps Regularidade private data hidden and does not infer Processos access for admins', async () => {
    const backend = new PreviewBackend()
    backend.selectActor('demo-regularidade')
    const process = await json(backend, 'processes/demo-process-abertura/')
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
    const process = await json(backend, 'processes/demo-process-abertura/')
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
    const waiting = await json(backend, 'processes/demo-process-reativacao/')
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
    const before = await json(backend, 'processes/demo-process-abertura/')
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
