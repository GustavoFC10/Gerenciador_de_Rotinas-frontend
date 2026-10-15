/** @vitest-environment happy-dom */

import { act, useRef, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Outlet } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { adminUserMock } from '../../constants/roles'
import { ROUTES } from '../../constants/routes'
import {
  AppStateContext,
  type AppStateContextValue,
} from '../../contexts/appStateContextDefinition'
import { useSpreadsheetContext } from '../../hooks/useSpreadsheetContext'
import { useTaskDetailsController } from '../../hooks/useTaskDetailsController'
import { queryKeys } from '../../query/queryKeys'
import AuthenticatedRoutes from '../../routes/AuthenticatedRoutes'
import {
  fileOwnerPath,
  fileService,
  taskFileTarget,
} from '../../services/fileService'
import type { ApiResponse } from '../../services/httpClient'
import type {
  CompetenceStatus,
  RoutineControlData,
  ScheduledOccurrence,
  Screen,
  Task,
} from '../../types/domain'
import type { PrivateFile, UploadIntent } from '../../types/files'
import TaskAttachmentUpload, {
  type TaskAttachmentUploadHandle,
} from './TaskAttachmentUpload'

vi.mock('../../layouts/AppLayout', () => ({ default: () => <Outlet /> }))
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

const scope = {
  organizationId: 'org-1',
  membershipId: adminUserMock.membershipId,
}
const task: Task = {
  id: 'occurrence-1',
  occurrenceKey: 'occurrence-1',
  taskId: 'task-1',
  competenceId: 'competence-1',
  persistence: 'materialized',
  kind: 'scheduled',
  clientId: 'client-1',
  routineId: 'routine-1',
  departmentId: 'department-1',
  assigneeId: adminUserMock.membershipId,
  status: 'pending',
  period: '2026-10',
  dueDate: '2026-10-31',
  completedAt: null,
  indicators: { attachments: 0 },
}
const personalTask: Task = {
  ...task,
  id: 'personal-task-1',
  taskId: 'personal-task-1',
  occurrenceKey: undefined,
  kind: 'ad_hoc',
  clientId: null,
  routineId: null,
  title: 'Revisão pessoal',
}
const screen: Screen = {
  id: 'screen-1',
  name: 'Obrigações',
  type: 'spreadsheet',
  departmentId: 'department-1',
  departmentName: 'Fiscal',
  position: 0,
  version: 1,
  archivedAt: null,
  createdAt: '',
  updatedAt: '',
  companies: [
    {
      id: 'client-1',
      code: '001',
      name: 'Empresa',
      legalName: 'Empresa',
      position: 0,
    },
  ],
  routines: [
    {
      id: 'routine-1',
      shotname: 'DAS',
      name: 'Enviar DAS',
      departmentId: 'department-1',
      position: 0,
    },
  ],
}
const occurrence: ScheduledOccurrence = {
  occurrenceKey: task.id,
  taskId: task.taskId!,
  etag: '"1"',
  persistence: 'materialized',
  referenceMonth: task.period,
  kind: 'scheduled',
  departmentId: task.departmentId,
  departmentName: 'Fiscal',
  clientCompanyId: 'client-1',
  companyCode: '001',
  companyName: 'Empresa',
  companyLegalName: 'Empresa',
  routineId: 'routine-1',
  routineVersionId: 'routine-version-1',
  sourceAssignmentId: 'assignment-1',
  routineShotname: 'DAS',
  routineName: 'Enviar DAS',
  routineVersionNumber: 1,
  routineDescription: '',
  title: 'Enviar DAS',
  description: '',
  observation: '',
  links: [],
  dueDate: task.dueDate,
  status: task.status,
  assignee: { id: adminUserMock.membershipId, displayName: adminUserMock.name },
  sourceRevision: 1,
  version: 1,
  materializationReason: 'attachment',
  materializedAt: '',
  archivedAt: null,
  createdAt: '',
  updatedAt: '',
  isOverdue: false,
}
const data: RoutineControlData = {
  departments: [{ id: 'department-1', name: 'Fiscal' }],
  clients: [{ id: 'client-1', name: 'Empresa', code: '001' }],
  routines: [
    {
      id: 'routine-1',
      name: 'Enviar DAS',
      shortName: 'DAS',
      departmentId: 'department-1',
    },
  ],
  employees: [{ id: adminUserMock.membershipId, name: adminUserMock.name }],
  screens: [screen],
  spreadsheetProjections: [
    {
      type: 'spreadsheet',
      screen,
      competenceId: 'competence-1',
      period: task.period,
      rows: screen.companies,
      columns: screen.routines,
      cells: [
        { companyId: 'client-1', routineId: 'routine-1', tasks: [occurrence] },
      ],
    },
  ],
  tasks: [task, personalTask],
}
const state: AppStateContextValue = {
  user: adminUserMock,
  competence: task.period,
  formattedCompetence: '10/2026',
  preferences: {
    theme: 'light',
    density: 'compact',
    defaultView: 'spreadsheet',
  },
  setCompetence: () => undefined,
  setPreferences: () => undefined,
  goToNextCompetence: () => undefined,
  goToPreviousCompetence: () => undefined,
}
const actions = {
  onCompetenceFinalize: vi.fn(),
  onCompanyCreate: vi.fn(),
  onCompanyUpdate: vi.fn(),
  onCompanyArchive: vi.fn(),
  onCompanyRestore: vi.fn(),
  onRoutineCreate: vi.fn(),
  onRoutineUpdate: vi.fn(),
  onRoutineArchive: vi.fn(),
  onRoutineRestore: vi.fn(),
  onEmployeeInvite: vi.fn(),
  onDepartmentCreate: vi.fn(),
  onScreenCreate: vi.fn(),
  onScreenUpdate: vi.fn(),
}
const onTaskOpen = vi.fn()
const intent: UploadIntent = {
  intentId: 'intent-1',
  fileId: 'file-1',
  expiresAt: '',
  upload: { url: 'https://storage.example.com', fields: {} },
}
const storedFile = { fileId: 'file-1', state: 'available' } as PrivateFile
let root: Root
let host: HTMLDivElement
let client: QueryClient

function response<T>(value: T): ApiResponse<T> {
  return {
    data: value,
    status: 200,
    etag: '"1"',
    requestId: null,
    headers: new Headers(),
  }
}

function Harness({
  competenceStatus = 'projected',
}: {
  competenceStatus?: CompetenceStatus
}) {
  const uploadRef = useRef<TaskAttachmentUploadHandle | null>(null)
  const [isAvailable, setIsAvailable] = useState(true)
  const spreadsheetContext = useSpreadsheetContext({
    data,
    navigationScreens: data.screens,
  })
  const details = useTaskDetailsController({
    scope,
    period: task.period,
    data,
    user: state.user,
    competenceStatus,
    selectedDepartment: data.departments[0],
  })

  return (
    <>
      <AuthenticatedRoutes
        {...actions}
        data={data}
        competence={task.period}
        competenceStatus={competenceStatus}
        spreadsheetContext={spreadsheetContext}
        taskDetails={{ ...details, openTask: onTaskOpen }}
        onTaskAttachmentAdd={(selected) => uploadRef.current?.open(selected)}
        canTaskAttach={(selected) =>
          isAvailable && details.canAttachTask(selected)
        }
        isOperationalDataLoading={false}
        operationalDataError={null}
        onRetryOperationalData={vi.fn()}
      />
      <TaskAttachmentUpload
        ref={uploadRef}
        scope={scope}
        user={state.user}
        competenceStatus={competenceStatus}
        onAvailabilityChange={setIsAvailable}
      />
    </>
  )
}

beforeEach(() => {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  onTaskOpen.mockClear()
  vi.spyOn(fileService, 'createIntent').mockResolvedValue(response(intent))
  vi.spyOn(fileService, 'upload').mockResolvedValue()
  vi.spyOn(fileService, 'confirm').mockResolvedValue(response(storedFile))
  vi.spyOn(fileService, 'waitUntilAvailable').mockResolvedValue(storedFile)
  vi.spyOn(fileService, 'link').mockResolvedValue(
    response({ fileId: 'file-1' }),
  )
  vi.spyOn(fileService, 'cancel').mockResolvedValue(response(undefined))
})

afterEach(async () => {
  await act(async () => root.unmount())
  client.clear()
  host.remove()
  vi.restoreAllMocks()
})

async function render(
  path: string,
  competenceStatus: CompetenceStatus = 'projected',
) {
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <AppStateContext.Provider value={state}>
          <MemoryRouter initialEntries={[path]}>
            <Harness competenceStatus={competenceStatus} />
          </MemoryRouter>
        </AppStateContext.Provider>
      </QueryClientProvider>,
    )
  })
}

async function openContextMenu() {
  const trigger =
    host.querySelector<HTMLElement>('[data-list-card]') ??
    host.querySelector<HTMLElement>(
      'button[aria-haspopup="menu"][aria-label*="Status:"]',
    )
  expect(trigger).not.toBeNull()
  await act(async () => {
    trigger!.dispatchEvent(
      new MouseEvent('contextmenu', {
        bubbles: true,
        clientX: 100,
        clientY: 100,
      }),
    )
  })
}

function attachAction() {
  return [
    ...document.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'),
  ].find((button) => button.textContent?.includes('Anexar arquivo'))
}

describe('TaskAttachmentUpload', () => {
  it.each([
    `${ROUTES.SPREADSHEET}?screenId=${screen.id}`,
    ROUTES.TASKS,
    ROUTES.MY_TASKS,
    `${ROUTES.COMPANIES}/client-1`,
    `${ROUTES.ROUTINES}/routine-1`,
  ])(
    'abre o seletor pelo menu de %s e anexa sem abrir detalhes',
    async (path) => {
      const destination = taskFileTarget(
        path === ROUTES.MY_TASKS ? personalTask : task,
      )
      const invalidate = vi.spyOn(client, 'invalidateQueries')
      await render(path)
      const input = host.querySelector<HTMLInputElement>('input[type="file"]')!
      const picker = vi
        .spyOn(input, 'click')
        .mockImplementation(() => undefined)
      expect(input.hidden).toBe(true)
      expect(host.querySelector('[aria-label="Envio de anexo"]')).toBeNull()
      await openContextMenu()

      await act(async () => {
        attachAction()!.click()
        expect(picker).toHaveBeenCalledOnce()
      })
      expect(onTaskOpen).not.toHaveBeenCalled()
      expect(document.querySelector('[data-task-context-menu]')).toBeNull()
      expect(fileService.createIntent).not.toHaveBeenCalled()

      const file = new File(['document'], 'comprovante.pdf', {
        type: 'application/pdf',
      })
      Object.defineProperty(input, 'files', {
        configurable: true,
        value: [file],
      })
      await act(async () =>
        input.dispatchEvent(new Event('change', { bubbles: true })),
      )

      expect(fileService.createIntent).toHaveBeenCalledWith(
        file,
        destination,
        expect.any(String),
        expect.any(AbortSignal),
      )
      expect(fileService.link).toHaveBeenCalledWith(
        destination,
        intent.fileId,
        expect.any(String),
        expect.any(AbortSignal),
      )
      expect(invalidate).toHaveBeenCalledWith({
        queryKey: queryKeys.taskAttachments(scope, fileOwnerPath(destination)),
      })
      expect(invalidate).toHaveBeenCalledWith({
        queryKey: queryKeys.routineControlRoot(scope),
      })
      expect(host.textContent).toContain('Arquivo salvo')
      expect(onTaskOpen).not.toHaveBeenCalled()
    },
  )

  it('oculta anexar quando a competência está finalizada', async () => {
    await render(ROUTES.TASKS, 'finalized')
    expect(host.querySelector('button[aria-label="Anexar arquivo"]')).toBeNull()
    await openContextMenu()
    expect(attachAction()).toBeUndefined()
    expect(fileService.createIntent).not.toHaveBeenCalled()
  })

  it('mantém o envio pendente na própria tarefa e permite retomar sem reabrir o card', async () => {
    vi.mocked(fileService.link).mockRejectedValueOnce(
      new Error('Conflito de versão'),
    )
    await render(ROUTES.TASKS)
    await openContextMenu()
    await act(async () => attachAction()!.click())
    const input = host.querySelector<HTMLInputElement>('input[type="file"]')!
    Object.defineProperty(input, 'files', {
      configurable: true,
      value: [
        new File(['document'], 'comprovante.pdf', { type: 'application/pdf' }),
      ],
    })
    await act(async () =>
      input.dispatchEvent(new Event('change', { bubbles: true })),
    )
    expect(input.disabled).toBe(true)
    expect(host.textContent).toContain('Conflito de versão')
    await openContextMenu()
    expect(attachAction()).toBeUndefined()
    const resume = [...host.querySelectorAll('button')].find((button) =>
      button.textContent?.includes('Retomar'),
    )!
    await act(async () => resume.click())
    expect(fileService.createIntent).toHaveBeenCalledOnce()
    expect(fileService.upload).toHaveBeenCalledOnce()
    expect(fileService.link).toHaveBeenCalledTimes(2)
    expect(input.disabled).toBe(false)
    expect(onTaskOpen).not.toHaveBeenCalled()
  })
})
