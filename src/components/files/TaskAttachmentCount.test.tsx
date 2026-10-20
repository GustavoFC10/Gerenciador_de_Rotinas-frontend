import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import TaskAttachmentCount from './TaskAttachmentCount'
import RoutineClosedCardCompact from '../routine-control/spreadsheet/RoutineClosedCardCompact'
import { FileUploadsContext } from '../../contexts/fileUploadsContextDefinition'
import type { Task } from '../../types/domain'
import type { UploadJob, UploadJobState } from '../../types/fileUploads'

const task: Task = {
  id: 'occurrence',
  occurrenceKey: 'occurrence',
  taskId: 'task',
  competenceId: 'competence',
  kind: 'scheduled',
  clientId: null,
  routineId: null,
  departmentId: 'fiscal',
  assigneeId: null,
  status: 'pending',
  period: '2026-10',
  dueDate: '2026-10-20',
  completedAt: null,
  indicators: { attachments: 0 },
}

function upload(state: UploadJobState): UploadJob {
  return {
    id: 'upload',
    batchId: 'batch',
    destination: {
      purpose: 'task_attachment',
      target: { occurrenceKey: 'occurrence', referenceMonth: '2026-10' },
    },
    label: 'Documento mensal',
    fileName: 'documento.pdf',
    sizeBytes: 10,
    state,
    progress: null,
  }
}

function renderCard(jobs: UploadJob[], selectedTask = task) {
  const noop = () => undefined
  return renderToStaticMarkup(
    <FileUploadsContext.Provider
      value={{
        jobs,
        isAvailable: true,
        panelOpen: false,
        enqueue: noop,
        openPanel: noop,
        closePanel: noop,
        retry: noop,
        cancel: async () => undefined,
        dismiss: noop,
      }}
    >
      <RoutineClosedCardCompact task={selectedTask} label="Documento mensal" />
    </FileUploadsContext.Provider>,
  )
}

describe('task attachment count', () => {
  it('hides empty counters and identifies a positive count for readers', () => {
    expect(renderToStaticMarkup(<TaskAttachmentCount count={0} />)).toBe('')
    expect(renderToStaticMarkup(<TaskAttachmentCount count={-1} />)).toBe('')
    expect(renderToStaticMarkup(<TaskAttachmentCount count={2} />)).toContain(
      'aria-label="2 anexos"',
    )
    expect(renderToStaticMarkup(<TaskAttachmentCount count={1} />)).toContain(
      'aria-label="1 anexo"',
    )
  })
  it('shows the counter in a closed spreadsheet card without attachment permissions', () => {
    const task: Task = {
      id: 'task',
      kind: 'ad_hoc',
      clientId: null,
      routineId: null,
      departmentId: 'fiscal',
      assigneeId: null,
      status: 'pending',
      period: '2026-10',
      dueDate: '2026-10-20',
      completedAt: null,
      indicators: { attachments: 3 },
    }
    const markup = renderToStaticMarkup(
      <RoutineClosedCardCompact task={task} label="Documento mensal" />,
    )
    expect(markup).toContain('3 anexos')
    expect(markup).not.toContain('Anexar arquivo')
  })

  it.each([
    'queued',
    'preparing',
    'uploading',
    'verifying',
    'linking',
    'cancelling',
  ] as const)('shows the first attachment while %s', (state) => {
    const markup = renderCard([upload(state)])
    expect(markup).toContain('1 anexo em envio')
    expect(markup).toContain('aria-busy="true"')
    expect(markup).toContain('animate-spin')
  })

  it.each(['completed', 'error', 'cancelled'] as const)(
    'removes the pending indicator when %s',
    (state) => {
      const markup = renderCard([upload(state)])
      expect(markup).not.toContain('em envio')
      expect(markup).not.toContain('animate-spin')
    },
  )

  it('keeps confirmed counts separate during linking and after reconciliation', () => {
    const confirmed = { ...task, indicators: { attachments: 1 } }
    const linking = renderCard([upload('linking')], confirmed)
    expect(linking).toContain('aria-label="1 anexo; 1 anexo em envio"')
    expect(linking).not.toContain('2 anexos')
    const completed = renderCard(
      [{ ...upload('completed'), reconciled: true }],
      confirmed,
    )
    expect(completed).toContain('aria-label="1 anexo"')
    expect(completed).not.toContain('em envio')
  })

  it('isolates occurrence uploads by month, owner and purpose', () => {
    const original = upload('queued')
    const jobs: UploadJob[] = [
      {
        ...original,
        destination: {
          purpose: 'task_attachment',
          target: { occurrenceKey: 'occurrence', referenceMonth: '2026-11' },
        },
      },
      {
        ...original,
        destination: {
          purpose: 'task_attachment',
          target: {
            occurrenceKey: 'other-occurrence',
            referenceMonth: '2026-10',
          },
        },
      },
      {
        ...original,
        destination: { purpose: 'member_avatar', target: { memberId: 'task' } },
      },
    ]
    expect(renderCard(jobs)).not.toContain('em envio')
    expect(renderCard([...jobs, original])).toContain('1 anexo em envio')
  })

  it('isolates ad hoc uploads by task and competence', () => {
    const selectedTask = {
      ...task,
      kind: 'ad_hoc' as const,
      occurrenceKey: undefined,
    }
    const ownUpload: UploadJob = {
      ...upload('queued'),
      destination: {
        purpose: 'task_attachment',
        target: { taskId: 'task', competenceId: 'competence' },
      },
    }
    const otherUpload: UploadJob = {
      ...ownUpload,
      destination: {
        purpose: 'task_attachment',
        target: { taskId: 'task', competenceId: 'other-competence' },
      },
    }
    expect(renderCard([otherUpload], selectedTask)).not.toContain('em envio')
    expect(renderCard([otherUpload, ownUpload], selectedTask)).toContain(
      '1 anexo em envio',
    )
  })
})
