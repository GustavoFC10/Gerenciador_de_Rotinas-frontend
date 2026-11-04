import type {
  LeggacyTracking,
  ProcessAlert,
  ProcessAlertRecipientOption,
  ProcessFollowUp,
  ProcessResource,
} from '../types/processes'

/** Synthetic recorded responses for this preview, independent of the clock. */
export const communicationFixtureIds = {
  pendingFollowUp: '10000000-0000-4000-8000-000000000001',
  previousFollowUp: '10000000-0000-4000-8000-000000000002',
  leggacyAlert: '20000000-0000-4000-8000-000000000001',
  overdueAlert: '20000000-0000-4000-8000-000000000002',
  sentAlert: '20000000-0000-4000-8000-000000000003',
  resolvedAlert: '20000000-0000-4000-8000-000000000004',
} as const

export const communicationMembers: (ProcessAlertRecipientOption & {
  actorId?: string
})[] = [
  {
    memberId: '30000000-0000-4000-8000-000000000001',
    actorId: 'demo-diretoria',
    name: 'Ana Souza',
    email: 'ana.souza@example.com',
    sectors: ['com'],
  },
  {
    memberId: '30000000-0000-4000-8000-000000000002',
    actorId: 'demo-financeiro',
    name: 'Marina Costa',
    email: 'marina.costa@example.com',
    sectors: ['fin'],
  },
  {
    memberId: '30000000-0000-4000-8000-000000000003',
    actorId: 'demo-regularidade',
    name: 'Bruno Lima',
    email: 'bruno.lima@example.com',
    sectors: ['reg'],
  },
  {
    memberId: '30000000-0000-4000-8000-000000000004',
    name: 'Rafael Nunes',
    email: 'rafael.nunes@example.com',
    sectors: ['com', 'fin'],
  },
  {
    memberId: '30000000-0000-4000-8000-000000000005',
    name: 'Joana Reis',
    email: 'joana.reis@example.com',
    sectors: ['fin', 'reg'],
  },
]

export const recordedLeggacyTracking: LeggacyTracking = {
  sendTaskId: 'ab4',
  returnTaskId: 'ab5',
  sentAt: '2026-10-26T15:00:00Z',
  dueOn: '2026-11-02',
  daysWaiting: 8,
  awaitingReturn: true,
  followUpDue: true,
}

/** Records attach only to existing demo processes; no client data is imported. */
export function createCommunicationFixtures(
  processes: readonly ProcessResource[],
) {
  const opening = processes.find(
    (p) => p.id === '00000000-0000-4000-8000-000000000001',
  )
  const overdue = processes.find(
    (p) => p.tipo === 'mei' && p.status === 'atrasado',
  )
  const closed = processes.find((p) => p.status === 'concluido')
  const followUps: ProcessFollowUp[] = []
  const alerts: ProcessAlert[] = []
  const alert = (
    process: ProcessResource,
    patch: Partial<ProcessAlert>,
  ): ProcessAlert => ({
    id: communicationFixtureIds.leggacyAlert,
    processId: process.id,
    empresa: process.empresa,
    codigo: process.codigo,
    kind: 'leggacy',
    followUpId: null,
    stageIndex: null,
    subject: `[Processos] Retorno da Leggacy · ${process.empresa}`,
    body: `Empresa: ${process.empresa}\nProcesso: ${process.codigo}\nAguardando retorno da Leggacy. Confira o acompanhamento com o Financeiro.\nAbrir processo: /processos/${process.id}`,
    defaultSectors: ['com', 'fin'],
    selectedSectors: [],
    selectedMemberIds: [],
    recipients: [],
    createdAt: '2026-11-03T11:00:00Z',
    sentAt: null,
    sentBy: null,
    resolvedAt: null,
    status: 'pending',
    deliveryMode: 'manual',
    version: 1,
    ...patch,
  })
  if (opening) {
    const pending: ProcessFollowUp = {
      id: communicationFixtureIds.pendingFollowUp,
      processId: opening.id,
      empresa: opening.empresa,
      sendTaskId: 'ab4',
      returnTaskId: 'ab5',
      sentAt: recordedLeggacyTracking.sentAt,
      dueOn: recordedLeggacyTracking.dueOn,
      createdAt: '2026-11-02T11:00:00Z',
      state: 'pending',
      completedAt: null,
      completedBy: null,
      resolvedAt: null,
      resolution: '',
      version: 1,
    }
    followUps.push({
      ...pending,
      id: communicationFixtureIds.previousFollowUp,
      sentAt: '2026-10-05T15:00:00Z',
      dueOn: '2026-10-12',
      createdAt: '2026-10-12T11:00:00Z',
      state: 'resolved',
      completedAt: '2026-10-13T13:00:00Z',
      completedBy: communicationMembers[1].memberId,
      resolvedAt: '2026-10-14T14:00:00Z',
      resolution: 'return_or_reset',
      version: 3,
    })
    if (
      opening.leggacy.some((item) => item.awaitingReturn && item.followUpDue) &&
      ['andamento', 'atrasado'].includes(opening.status)
    ) {
      followUps.unshift(pending)
      alerts.push(alert(opening, { followUpId: pending.id }))
    }
    alerts.push(
      alert(opening, {
        id: communicationFixtureIds.sentAlert,
        followUpId: communicationFixtureIds.previousFollowUp,
        body: `Registro de demonstração de um ciclo anterior.\nEmpresa: ${opening.empresa}\nA cobrança foi enviada por e-mail e declarada manualmente pela Diretoria.`,
        createdAt: '2026-10-12T11:00:00Z',
        sentAt: '2026-10-13T13:00:00Z',
        sentBy: communicationMembers[0].memberId,
        resolvedAt: '2026-10-14T14:00:00Z',
        status: 'sent',
        selectedSectors: ['com', 'fin'],
        recipients: communicationMembers
          .filter((member) =>
            member.sectors.some((sector) => ['com', 'fin'].includes(sector)),
          )
          .map(({ memberId, name, email }) => ({ memberId, name, email })),
        version: 3,
      }),
    )
  }
  if (overdue)
    alerts.push(
      alert(overdue, {
        id: communicationFixtureIds.overdueAlert,
        kind: 'overdue',
        stageIndex:
          overdue.etapas[overdue.analysis.currentStage ?? 0]?.index ?? 0,
        defaultSectors: ['com', 'fin', 'reg'],
        subject: `[Processos] Prazo vencido · ${overdue.empresa}`,
        body: `Empresa: ${overdue.empresa}\nProcesso: ${overdue.codigo}\nEtapa: Definições da Diretoria\nO prazo registrado está vencido. Revise as pendências da equipe.\nAbrir processo: /processos/${overdue.id}`,
      }),
    )
  if (closed)
    alerts.push(
      alert(closed, {
        id: communicationFixtureIds.resolvedAlert,
        kind: 'overdue',
        defaultSectors: ['com', 'fin', 'reg'],
        subject: `[Processos] Prazo vencido · ${closed.empresa}`,
        body: 'Situação encerrada antes de qualquer envio. Este aviso permanece somente no histórico da demonstração.',
        createdAt: '2026-10-21T11:00:00Z',
        resolvedAt: '2026-10-23T14:00:00Z',
        status: 'resolved',
        version: 2,
      }),
    )
  return { followUps, alerts }
}
