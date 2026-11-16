import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  MemoryRouter,
  Navigate,
  Route,
  Routes,
  useSearchParams,
} from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppStateContext } from '../../../src/contexts/appStateContextDefinition'
import { AuthContext } from '../../../src/contexts/authContextDefinition'
import { useAppState } from '../../../src/hooks/useAppState'
import AppLayout from '../../../src/layouts/AppLayout'
import SpreadsheetPage from '../../../src/pages/SpreadsheetPage'
import AgendaPage from '../../../src/pages/AgendaPage'
import HubPage from '../../../src/pages/HubPage'
import CompaniesPage from '../../../src/pages/CompaniesPage'
import RoutinesPage from '../../../src/pages/RoutinesPage'
import RoutineCompanyDialog, {
  type CompanyPreviewStore,
} from './RoutineCompanyDialog'
import TaskDetailsDialog from '../../../src/components/routine-control/details/TaskDetailsDialog'
import { moduleService } from '../../../src/services/moduleService'
import {
  screenService,
  type AgendaProjection,
} from '../../../src/services/screenService'
import type { TaskResource } from '../../../src/services/taskService'
import type { MembershipSummary } from '../../../src/services/authService'
import type {
  AppPreferences,
  AppUser,
  Client,
  Routine,
  RoutineControlData,
  RoutineStatus,
  ScheduledOccurrence,
  Screen,
  SpreadsheetProjection,
  Task,
} from '../../../src/types/domain'
import type { ModuleSummary } from '../../../src/types/modules'
import '../../../src/styles/index.css'
import './review.css'

// Production components are imported unchanged. Every resource below is fictional.
const modules: ModuleSummary[] = [
  'routines',
  'processes',
  'honorarios',
  'companies',
].map((module) => ({
  module: module as ModuleSummary['module'],
  globalAccess: true,
  actions: ['read', 'create', 'edit'],
  sectors: [],
}))
const membership: MembershipSummary = {
  id: 'review-member',
  displayName: 'Mariana Costa',
  role: 'owner',
  status: 'active',
  modules,
  organization: {
    id: 'review-office',
    name: 'Jaralcon',
    slug: 'review',
    timezone: 'America/Sao_Paulo',
  },
}
const user: AppUser = {
  id: 'review-user',
  membershipId: membership.id,
  name: membership.displayName,
  email: 'mariana@exemplo.com.br',
  avatarUrl: '',
  role: 'owner',
  modules,
  departmentAccesses: [{ departmentId: 'fiscal', role: 'lead' }],
}
const clients: Client[] = [
  'Aurora Comércio',
  'Horizonte Serviços',
  'Cedro Tecnologia',
  'Norte Saúde',
  'Solar Arquitetura',
  'Ponte Engenharia',
  'Estação Alimentos',
  'Vale Sereno',
  'Bento Arquitetura',
  'Cais Tecnologia',
].map((name, i) => ({
  id: `company-${i + 1}`,
  code: String(i + 1).padStart(3, '0'),
  name,
  legalName: `${name} Ltda.`,
  active: true,
}))
const routines: Routine[] = [
  'Importar NF entrada',
  'Importar NF saída',
  'Apurar Simples',
  'Enviar DAS',
  'Apurar ISS',
  'Enviar ISS',
  'EFD Contribuições',
  'DCTFWeb',
  'MIT',
].map((name, i) => ({
  id: `routine-${i + 1}`,
  departmentId: 'fiscal',
  name,
  shortName: name,
  description: `Conferência e execução de ${name.toLocaleLowerCase('pt-BR')}.`,
  recurrence: 'monthly',
  defaultDueDays: 14,
  active: true,
}))
const screenNames = ['Simples Nacional', 'Lucro Presumido', 'Lucro Real']
const screens: Screen[] = screenNames.map((name, i) => ({
  id: `fiscal-${i + 1}`,
  name,
  type: 'spreadsheet',
  departmentId: 'fiscal',
  departmentName: 'Fiscal',
  position: i,
  version: 1,
  archivedAt: null,
  createdAt: '2026-11-01',
  updatedAt: '2026-11-01',
  companies: clients.map((client, position) => ({
    id: client.id,
    name: client.name,
    legalName: client.legalName!,
    code: client.code!,
    position,
  })),
  routines: routines.map((routine, position) => ({
    id: routine.id,
    shotname: routine.shortName,
    name: routine.name,
    departmentId: 'fiscal',
    position,
  })),
}))
const navigation = screens.map(({ id, name, departmentId }) => ({
  id,
  name,
  departmentId,
  to: `/planilha?screenId=${id}`,
}))
const spreadsheets = [
  {
    id: 'fiscal',
    departmentId: 'fiscal',
    name: 'Fiscal',
    to: navigation[0]!.to,
    screens: navigation,
  },
]
const agendas = [
  {
    id: 'agenda-fiscal',
    departmentId: 'fiscal',
    name: 'Fiscal',
    to: '/agenda?screenId=agenda-fiscal',
  },
]
const statusOrder: RoutineStatus[] = [
  'pending',
  'in_progress',
  'error',
  'completed',
  'no_movement',
]
const seedTasks: Task[] = clients.flatMap((client, row) =>
  routines.flatMap((routine, col) =>
    (row + col) % 13 === 12
      ? []
      : [
          {
            id: `task-${row}-${col}`,
            kind: 'scheduled',
            clientId: client.id,
            routineId: routine.id,
            departmentId: 'fiscal',
            assigneeId: membership.id,
            title: routine.name,
            description: routine.description,
            status: statusOrder[(row + col) % statusOrder.length]!,
            period: '2026-11',
            dueDate: '2026-11-15',
            completedAt: null,
            notes: '',
            indicators: { attachments: (row + col) % 7 === 0 ? 1 : 0 },
            links: [],
          },
        ],
  ),
)

// These methods return in-memory fixtures; no request reaches a server.
moduleService.permissions = async () => ({ modules })
screenService.getProjection = async () => ({
  data: {
    type: 'agenda',
    screen: {
      ...screens[0]!,
      id: 'agenda-fiscal',
      name: 'Fiscal',
      type: 'agenda',
    },
    competenceId: null,
    period: '2026-11',
    columns: statusOrder.map((status) => ({
      status,
      count: 2,
      hasMore: false,
      tasks: [0, 1].map(
        (i) =>
          ({
            id: `agenda-${status}-${i}`,
            title: ['Conferir documentos recebidos', 'Retornar ao cliente'][i],
            description: 'Conferir os documentos e registrar o retorno.',
            status,
            dueDate: '2026-11-15',
            attachmentCount: i,
            assignee: {
              id: membership.id,
              displayName: membership.displayName,
            },
          }) as TaskResource,
      ),
    })),
  } as AgendaProjection,
  status: 200,
  etag: null,
  requestId: null,
  headers: new Headers(),
})

const page = document.body.dataset.proposal || 'P01'
const isHub = page === 'P02'
const isCatalog = page === 'P18'
const catalogKind =
  new URLSearchParams(window.location.search).get('catalogo') === 'rotinas'
    ? 'rotinas'
    : 'empresas'
const companyStore = (
  window as Window & {
    JaralCompaniesPreview?: CompanyPreviewStore
  }
).JaralCompaniesPreview
const catalogClients: Client[] =
  isCatalog && companyStore
    ? companyStore.list().map((company) => ({
        id: company.id,
        name: company.name,
        code: company.code,
        legalName: company.legalName,
        document: company.cnpj,
        email: company.email,
        phone: company.phone,
        taxRegime: company.taxRegime,
        active: company.status === 'active',
      }))
    : clients
const catalogData: RoutineControlData = {
  departments: [{ id: 'fiscal', name: 'Fiscal' }],
  clients: catalogClients,
  routines,
  employees: [{ id: membership.id, name: membership.displayName }],
  screens,
  spreadsheetProjections: [],
  tasks: seedTasks.map((task) => ({
    ...task,
    clientId:
      isCatalog && companyStore
        ? task.clientId?.replace(/^company-/, 'empresa-') || null
        : task.clientId,
  })),
}
const requestedPeriod = new URLSearchParams(window.location.search).get(
  'period',
)
const initialPeriod =
  requestedPeriod && /^\d{4}-(0[1-9]|1[0-2])$/.test(requestedPeriod)
    ? requestedPeriod
    : '2026-11'
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
})
const destinations: Record<string, string> = {
  '/': 'dashboard-rotinas.html',
  '/hub': 'navegacao.html',
  '/rotinas': 'catalogo-rotinas.html',
  '/rotinas/nova': 'rotinas.html',
  '/processos': 'dashboard-processos.html',
  '/honorarios': 'honorarios.html',
  '/cadastro-empresas': 'empresas.html',
  '/empresas': 'empresas-rotinas.html',
  '/empresas/nova': 'empresas-modulos.html?acao=adicionar',
  '/equipe': 'equipe.html',
}
document.addEventListener(
  'click',
  (event) => {
    const anchor = (event.target as Element).closest<HTMLAnchorElement>(
      'a[href]',
    )
    const href = anchor?.getAttribute('href')
    if (!href) return
    const companyMatch = href.match(/^\/empresas\/([^/?]+)(?:\?.*)?$/)
    const routineMatch = href.match(/^\/rotinas\/([^/?]+)(?:\?.*)?$/)
    if (isCatalog && companyMatch && companyMatch[1] !== 'nova') {
      event.preventDefault()
      event.stopPropagation()
      window.dispatchEvent(
        new CustomEvent('preview-company-open', {
          detail: decodeURIComponent(companyMatch[1]!),
        }),
      )
      return
    }
    const destination =
      isCatalog && href === '/rotinas'
        ? 'empresas-rotinas.html?catalogo=rotinas'
        : isCatalog && companyMatch && companyMatch[1] !== 'nova'
          ? `empresas-modulos.html?empresa=${encodeURIComponent(decodeURIComponent(companyMatch[1]!))}`
          : isCatalog && routineMatch && routineMatch[1] !== 'nova'
            ? `catalogo-rotinas.html?rotina=${encodeURIComponent(decodeURIComponent(routineMatch[1]!))}`
            : destinations[href]
    if (!destination) return
    event.preventDefault()
    event.stopPropagation()
    window.location.href =
      destination +
      (href === '/'
        ? `?period=${new URLSearchParams(window.location.search).get('period') || initialPeriod}`
        : '')
  },
  true,
)

function ReviewBar() {
  const [notes, setNotes] = useState(false)
  const [dark, setDark] = useState(false)
  return (
    <>
      <div className="original-review-bar">
        <a href="index.html">← Propostas</a>
        <strong>{page}</strong>
        <span>
          {isHub
            ? 'Troca de módulo via HUB'
            : isCatalog
              ? 'Empresas e Rotinas · catálogos do módulo'
              : 'Rotinas · estrutura atual preservada'}
        </span>
        <div>
          <a
            href={
              isCatalog
                ? `../../src/pages/${catalogKind === 'rotinas' ? 'RoutinesPage' : 'CompaniesPage'}.tsx`
                : `../../docs/auditoria-ux/evidencias/${isHub ? '01-hub-atual.png' : '03-rotinas-planilha.png'}`
            }
            target="_blank"
            rel="noreferrer"
          >
            {isCatalog ? 'Componente real ↗' : 'Atual ↗'}
          </a>
          {isCatalog ? (
            <>
              <a href="empresas-rotinas.html">Empresas</a>
              <a href="empresas-rotinas.html?catalogo=rotinas">Rotinas</a>
            </>
          ) : (
            !isHub && <a href="catalogo-rotinas.html">Catálogo de rotinas ↗</a>
          )}
          <button
            type="button"
            onClick={() => setNotes(!notes)}
            aria-expanded={notes}
          >
            O que avaliar
          </button>
          <button
            type="button"
            onClick={() => {
              document.documentElement.dataset.theme = dark ? 'light' : 'dark'
              setDark(!dark)
            }}
          >
            {dark ? 'Tema claro' : 'Tema escuro'}
          </button>
        </div>
      </div>
      {notes && (
        <aside className="original-review-notes">
          <h2>
            {isHub
              ? 'P02 · HUB mantido'
              : isCatalog
                ? 'P18 · Listas operacionais de Rotinas'
                : 'P01 · Fidelidade ao React atual'}
          </h2>
          <p>
            {isHub
              ? 'O HUB é o componente HubPage real. O fluxo continua sendo sair do módulo, escolher uma área autorizada e entrar. A alternativa de seletor foi retirada.'
              : isCatalog
                ? 'Esta prévia começa nas listas reais CompaniesPage e RoutinesPage, dentro de AppLayout e da barra lateral do módulo de Rotinas. A estrutura, colunas, busca, ordenação e abertura pela linha vêm desses componentes sem alterações.'
                : 'AppLayout, Sidebar, Topbar, WorkspaceBar, SpreadsheetScreenNavigation e RoutineControlTable são os componentes reais importados sem alterações. Medidas, abas, ícones, cores e comportamento responsivo vêm dos estilos originais.'}
          </p>
          <p>
            {isHub
              ? 'Os cartões abrem as prévias locais de cada módulo. A conta fictícia de direção possui todos os acessos.'
              : isCatalog
                ? 'Empresas mantém Código, Empresa, CNPJ, Rotinas e Situação. Rotinas mantém Departamento, Recorrência, Agenda e prazo, Empresas e Situação. Abrir uma empresa leva à configuração especializada da mesma identidade central; criar/editar uma rotina continua usando a P03 aprovada.'
                : 'Teste trocar de tela na aba, recolher a barra lateral, navegar até a Agenda, abrir uma tarefa e alterar seu estado. A criação de rotina fica exclusivamente no catálogo Rotinas. Esta proposta não redesenha a grade.'}
          </p>
          <p>
            Prévia local com dados fictícios. Nenhuma alteração é enviada ao
            sistema.
          </p>
          <button type="button" onClick={() => setNotes(false)}>
            Fechar orientações
          </button>
        </aside>
      )}
    </>
  )
}

function Sheet() {
  const { competence } = useAppState()
  const [search] = useSearchParams()
  const screen =
    screens.find((item) => item.id === search.get('screenId')) || screens[0]!
  const [tasks, setTasks] = useState(seedTasks)
  const [opened, setOpened] = useState<Task | null>(null)
  const periodTasks = tasks.map((task) => ({
    ...task,
    period: competence,
    dueDate: `${competence}-15`,
  }))
  const projection: SpreadsheetProjection = {
    type: 'spreadsheet',
    screen,
    competenceId: null,
    period: competence,
    rows: screen.companies,
    columns: screen.routines,
    cells: tasks.map((task) => ({
      companyId: task.clientId!,
      routineId: task.routineId!,
      tasks: [{ occurrenceKey: task.id } as ScheduledOccurrence],
    })),
  }
  const updateStatus = (taskId: string, status: RoutineStatus) => {
    setTasks((current) =>
      current.map((task) => (task.id === taskId ? { ...task, status } : task)),
    )
    setOpened((current) =>
      current?.id === taskId ? { ...current, status } : current,
    )
  }
  return (
    <>
      <SpreadsheetPage
        departmentName="Fiscal"
        screens={navigation}
        selectedScreenId={screen.id}
        screen={screen}
        projection={projection}
        visibleData={{ clients, routines, tasks: periodTasks }}
        onRoutineOpen={(routine) => {
          window.location.href = `catalogo-rotinas.html?rotina=${routine.id}`
        }}
        onTaskOpen={setOpened}
        onTaskStatusChange={updateStatus}
      />
      {opened && (
        <TaskDetailsDialog
          task={opened}
          client={clients.find((item) => item.id === opened.clientId)}
          routine={routines.find((item) => item.id === opened.routineId)}
          department={{ id: 'fiscal', name: 'Fiscal' }}
          onStatusChange={updateStatus}
          allowedStatusChanges={statusOrder}
          onClose={() => setOpened(null)}
        />
      )}
    </>
  )
}

export default function App() {
  const [companyId, setCompanyId] = useState<string | null>(
    isCatalog
      ? new URLSearchParams(window.location.search).get('empresa')
      : null,
  )
  useEffect(() => {
    if (!isCatalog) return
    const open = (event: Event) =>
      setCompanyId((event as CustomEvent<string>).detail)
    window.addEventListener('preview-company-open', open)
    return () => window.removeEventListener('preview-company-open', open)
  }, [])
  const openedCompany = companyStore
    ?.list()
    .find((company) => company.id === companyId)
  const [competence, setCompetence] = useState(initialPeriod)
  useEffect(() => {
    if (isHub) return
    const url = new URL(window.location.href)
    url.searchParams.set('period', competence)
    window.history.replaceState(null, '', url)
  }, [competence])
  const [preferences, setPreferences] = useState<AppPreferences>({
    theme: 'light',
    density: 'comfortable',
    defaultView: 'spreadsheet',
  })
  const goMonth = (offset: number) =>
    setCompetence((current) => {
      const [year, month] = current.split('-').map(Number)
      const date = new Date(year!, month! - 1 + offset, 1)
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    })
  return (
    <AuthContext.Provider
      value={{
        session: null,
        user,
        memberships: [membership],
        activeMembership: membership,
        isAuthenticated: true,
        isInitializing: false,
        initializationError: null,
        login: async () => {
          throw new Error('Conta demonstrativa')
        },
        logout: async () => {
          window.location.href = 'index.html'
        },
        selectActiveMembership: async () => undefined,
        refreshSession: async () => undefined,
      }}
    >
      <AppStateContext.Provider
        value={{
          user,
          competence,
          formattedCompetence: competence,
          preferences,
          setCompetence,
          setPreferences,
          goToNextCompetence: () => goMonth(1),
          goToPreviousCompetence: () => goMonth(-1),
        }}
      >
        <QueryClientProvider client={queryClient}>
          <MemoryRouter
            initialEntries={[
              isHub
                ? '/hub'
                : isCatalog
                  ? `/${catalogKind}`
                  : navigation.find(
                      (item) =>
                        item.id ===
                        new URLSearchParams(window.location.search).get(
                          'screenId',
                        ),
                    )?.to || navigation[0]!.to,
            ]}
          >
            <ReviewBar />
            <Routes>
              <Route path="/hub" element={<HubPage />} />
              <Route
                element={
                  <AppLayout spreadsheets={spreadsheets} agendas={agendas} />
                }
              >
                <Route path="/planilha" element={<Sheet />} />
                <Route path="/agenda" element={<AgendaPage />} />
                <Route
                  path="/empresas"
                  element={<CompaniesPage data={catalogData} />}
                />
                <Route
                  path="/rotinas"
                  element={<RoutinesPage data={catalogData} />}
                />
                <Route
                  path="*"
                  element={<Navigate to={navigation[0]!.to} replace />}
                />
              </Route>
            </Routes>
            {isCatalog && openedCompany && companyStore && (
              <RoutineCompanyDialog
                key={openedCompany.id}
                company={openedCompany}
                store={companyStore}
                onClose={() => setCompanyId(null)}
              />
            )}
          </MemoryRouter>
        </QueryClientProvider>
      </AppStateContext.Provider>
    </AuthContext.Provider>
  )
}
const host = document.getElementById('root')
if (host) createRoot(host).render(<App />)
