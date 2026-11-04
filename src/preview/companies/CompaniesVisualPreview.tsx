import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import TextField from '../../components/ui/TextField'
import Select from '../../components/ui/Select'
import { CatalogSearchField } from '../../components/catalog/CatalogList'
import ProcessIcon from '../../components/processes/ProcessIcon'
import { useOverlayDialog } from '../../hooks/useOverlayDialog'
import {
  companyExamples,
  visualOptions,
  type CompanyExample,
  type VisualOption,
} from './fixtures'

type StatusFilter = 'active' | 'archived' | 'all'
type ProfileTab = 'cadastro' | 'contatos' | 'historico'
const pageSize = 6
const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')

export default function CompaniesVisualPreview() {
  const [visual, setVisual] = useState<VisualOption>(() => {
    const requested = new URLSearchParams(location.search).get('opcao')
    return (
      visualOptions.find((option) => option.id === requested)?.id ?? 'workspace'
    )
  })
  const [theme, setTheme] = useState(() =>
    new URLSearchParams(location.search).get('tema') === 'dark'
      ? 'dark'
      : 'light',
  )
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active')
  const [ordering, setOrdering] = useState('recent')
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState<string | null>(() =>
    new URLSearchParams(location.search).get('empresa'),
  )
  const [dialog, setDialog] = useState<'create' | 'edit' | 'archive' | null>(
    null,
  )
  const [notice, setNotice] = useState('')
  const currentOption = visualOptions.find((option) => option.id === visual)!
  const filtered = companyExamples.filter(
    (company) =>
      (statusFilter === 'all' || company.status === statusFilter) &&
      normalize(
        [
          company.name,
          company.legalName,
          company.cnpj,
          company.code,
          company.email,
        ].join(' '),
      ).includes(normalize(search)),
  )
  if (ordering === 'name')
    filtered.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
  if (ordering === 'code')
    filtered.sort((a, b) => (a.code || '9999').localeCompare(b.code || '9999'))
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, pages)
  const visible = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  )
  const selected =
    companyExamples.find((company) => company.id === selectedId) ??
    (visual === 'ficha' ? visible[0] : undefined)
  const fullProfile = visual === 'essencial' && !!selected

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    const url = new URL(location.href)
    url.searchParams.set('opcao', visual)
    url.searchParams.set('tema', theme)
    if (selectedId) url.searchParams.set('empresa', selectedId)
    else url.searchParams.delete('empresa')
    history.replaceState(null, '', url)
  }, [visual, theme, selectedId])

  function changeStatus(status: StatusFilter) {
    setStatusFilter(status)
    setPage(1)
    setSelectedId(null)
  }
  function changeSearch(value: string) {
    setSearch(value)
    setPage(1)
    setSelectedId(null)
  }
  function finishSimulation() {
    setDialog(null)
    setNotice('Simulação concluída. Nenhum cadastro foi criado ou alterado.')
  }

  const filters = (
    <div className="cv-list-toolbar">
      <CatalogSearchField
        label="Buscar empresas"
        placeholder="Nome, CNPJ ou código do Domínio"
        value={search}
        onChange={changeSearch}
      />
      <Select
        aria-label="Ordenar empresas"
        value={ordering}
        onChange={(event) => {
          setOrdering(event.target.value)
          setPage(1)
        }}
      >
        <option value="recent">Atualizadas recentemente</option>
        <option value="name">Nome da empresa</option>
        <option value="code">Código do Domínio</option>
      </Select>
    </div>
  )
  const statusTabs = (
    <div
      className="cv-status-tabs"
      role="group"
      aria-label="Situação do cadastro"
    >
      {(
        [
          ['active', 'Disponíveis', 9],
          ['archived', 'Arquivadas', 3],
          ['all', 'Todas', 12],
        ] as const
      ).map(([value, label, count]) => (
        <button
          key={value}
          className={statusFilter === value ? 'is-active' : ''}
          aria-pressed={statusFilter === value}
          onClick={() => changeStatus(value)}
        >
          {label}
          <span>{count}</span>
        </button>
      ))}
    </div>
  )
  const pagination = (
    <div className="cv-pagination">
      <span>
        {filtered.length
          ? `${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, filtered.length)} de ${filtered.length} empresas`
          : '0 empresas'}
      </span>
      <div>
        <Button
          size="sm"
          aria-label="Página anterior"
          disabled={currentPage === 1}
          onClick={() => {
            setPage(currentPage - 1)
            setSelectedId(null)
          }}
        >
          <span className="cv-reverse">
            <ProcessIcon name="chevr" size={14} />
          </span>
        </Button>
        <span>
          Página {currentPage} de {pages}
        </span>
        <Button
          size="sm"
          aria-label="Próxima página"
          disabled={currentPage === pages}
          onClick={() => {
            setPage(currentPage + 1)
            setSelectedId(null)
          }}
        >
          <ProcessIcon name="chevr" size={14} />
        </Button>
      </div>
    </div>
  )
  const empty = (
    <div className="cv-empty">
      <ProcessIcon name="building" size={28} />
      <h3>Nenhuma empresa encontrada</h3>
      <p>Experimente outro nome, CNPJ ou código.</p>
      <Button size="sm" onClick={() => changeSearch('')}>
        Limpar busca
      </Button>
    </div>
  )
  const profileProps = {
    onEdit: () => setDialog('edit'),
    onArchive: () => setDialog('archive'),
  }

  return (
    <div className={`companies-study cv-${visual}`}>
      <a href="#companies-study-main" className="cv-skip">
        Ir para o conteúdo
      </a>
      <header className="cv-study-bar">
        <div className="cv-study-name">
          <span className="cv-study-dot" />
          <div>
            <strong>Empresas</strong>
            <span>Estudo visual · dados fictícios</span>
          </div>
        </div>
        <nav className="cv-options" aria-label="Opções de layout">
          {visualOptions.map((option) => (
            <button
              key={option.id}
              aria-pressed={visual === option.id}
              onClick={() => {
                setVisual(option.id)
                setSelectedId(null)
                setPage(1)
                setNotice('')
              }}
            >
              <span>{option.number}</span>
              {option.short}
            </button>
          ))}
        </nav>
        <Button
          size="sm"
          aria-label={
            theme === 'light' ? 'Ativar tema escuro' : 'Ativar tema claro'
          }
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
        >
          <ProcessIcon name={theme === 'light' ? 'moon' : 'home'} size={15} />
          <span>{theme === 'light' ? 'Escuro' : 'Claro'}</span>
        </Button>
      </header>
      <div className="cv-application">
        {visual !== 'essencial' && (
          <aside className="cv-sidebar" aria-label="Navegação de Empresas">
            <div className="cv-module">
              <span className="cv-module-icon">
                <ProcessIcon name="building" size={23} />
              </span>
              <div>
                <strong>Empresas</strong>
                <small>Jaralcon Contabilidade</small>
              </div>
            </div>
            <div className="cv-sidebar-body">
              <div className="cv-workspace-link">
                <ProcessIcon name="swap" size={17} />
                <span>Áreas de trabalho</span>
              </div>
              <span className="cv-nav-caption">CADASTRO</span>
              <button
                className={statusFilter !== 'archived' ? 'is-active' : ''}
                title="Empresas disponíveis"
                onClick={() => changeStatus('active')}
              >
                <ProcessIcon name="building" />
                <span>Empresas</span>
                <em>9</em>
              </button>
              <button
                className={statusFilter === 'archived' ? 'is-active' : ''}
                title="Empresas arquivadas"
                onClick={() => changeStatus('archived')}
              >
                <ProcessIcon name="archive" />
                <span>Arquivadas</span>
                <em>3</em>
              </button>
              <div className="cv-shared-note">
                <span>
                  <ProcessIcon name="lock" size={15} />
                  Cadastro compartilhado
                </span>
                <p>
                  A mesma empresa em Rotinas e Processos. Cada área mantém seus
                  próprios acessos.
                </p>
              </div>
            </div>
            <div className="cv-user">
              <span className="cv-user-avatar">AS</span>
              <div>
                <strong>Ana Silva</strong>
                <small>Gestora de Empresas</small>
              </div>
              <ProcessIcon name="chev" size={15} />
            </div>
          </aside>
        )}
        <div className="cv-workspace">
          <header className="cv-app-header">
            <div>
              {visual === 'essencial' ? (
                <>
                  <span className="cv-header-mark">
                    <ProcessIcon name="building" size={19} />
                  </span>
                  <strong>Empresas</strong>
                  <span className="cv-header-divider" />
                  <span>Jaralcon Contabilidade</span>
                </>
              ) : (
                <>
                  <span>Áreas de trabalho</span>
                  <ProcessIcon name="chevr" size={13} />
                  <strong>Empresas</strong>
                </>
              )}
            </div>
            <div>
              <span className="cv-office-dot" />
              <span>Jaralcon Contabilidade</span>
              <Badge>Gestor</Badge>
              <span className="cv-small-avatar">AS</span>
            </div>
          </header>
          <main id="companies-study-main" className="cv-content">
            <div className="cv-direction">
              <span>OPÇÃO {currentOption.number}</span>
              <p>{currentOption.description}</p>
              <small>{currentOption.reference}</small>
            </div>
            {notice && (
              <div className="cv-notice" role="status">
                <ProcessIcon name="check" size={17} />
                <span>{notice}</span>
                <button aria-label="Fechar aviso" onClick={() => setNotice('')}>
                  <ProcessIcon name="x" size={15} />
                </button>
              </div>
            )}
            <div className="cv-page-heading">
              <div>
                <div className="cv-eyebrow">CADASTRO DE CLIENTES</div>
                <h1>
                  {fullProfile ? 'Ficha da empresa' : 'Empresas'}
                  {!fullProfile && (
                    <span>
                      {statusFilter === 'active'
                        ? 9
                        : statusFilter === 'archived'
                          ? 3
                          : 12}
                    </span>
                  )}
                </h1>
                <p>
                  {fullProfile
                    ? 'Identidade, canais e contatos do cadastro.'
                    : 'Um cadastro único. Todas as informações da sua carteira.'}
                </p>
              </div>
              {fullProfile ? (
                <Button onClick={() => setSelectedId(null)}>
                  <span className="cv-reverse">
                    <ProcessIcon name="arrow" size={16} />
                  </span>
                  Voltar ao catálogo
                </Button>
              ) : (
                <Button tone="primary" onClick={() => setDialog('create')}>
                  <ProcessIcon name="plus" size={17} />
                  Nova empresa
                </Button>
              )}
            </div>
            {visual === 'workspace' && (
              <div className="cv-metrics">
                {[
                  {
                    label: 'Empresas disponíveis',
                    count: '09',
                    helper: 'Para novos vínculos e operações',
                    icon: 'building',
                  },
                  {
                    label: 'Empresas arquivadas',
                    count: '03',
                    helper: 'Cadastros e histórico preservados',
                    icon: 'archive',
                  },
                  {
                    label: 'Total no escritório',
                    count: '12',
                    helper: 'O mesmo cadastro entre os módulos',
                    icon: 'users',
                  },
                ].map((metric) => (
                  <Card key={metric.label} className="cv-metric">
                    <div>
                      <span>{metric.label}</span>
                      <strong>{metric.count}</strong>
                      <small>{metric.helper}</small>
                    </div>
                    <span className="cv-metric-icon">
                      <ProcessIcon name={metric.icon} size={19} />
                    </span>
                  </Card>
                ))}
              </div>
            )}
            {fullProfile && selected ? (
              <Card className="cv-full-profile">
                <CompanyProfile
                  key={selected.id}
                  company={selected}
                  {...profileProps}
                />
              </Card>
            ) : visual === 'ficha' ? (
              <div className="cv-split">
                <Card className="cv-directory">
                  <div className="cv-directory-heading">
                    <h2>Seu catálogo</h2>
                    <span>{filtered.length} empresas</span>
                  </div>
                  {statusTabs}
                  {filters}
                  <div className="cv-company-items">
                    {visible.length
                      ? visible.map((company) => (
                          <button
                            key={company.id}
                            className={
                              selected?.id === company.id ? 'is-selected' : ''
                            }
                            onClick={() => setSelectedId(company.id)}
                            aria-pressed={selected?.id === company.id}
                          >
                            <CompanyAvatar company={company} />
                            <span>
                              <strong>{company.name}</strong>
                              <small>
                                {company.cnpj || 'CNPJ não informado'}
                              </small>
                              <span>
                                {company.code
                                  ? `Domínio ${company.code}`
                                  : 'Sem código do Domínio'}
                                <span className="cv-item-dot" />
                                {company.status === 'active'
                                  ? 'Disponível'
                                  : 'Arquivada'}
                              </span>
                            </span>
                            <ProcessIcon name="chevr" size={14} />
                          </button>
                        ))
                      : empty}
                  </div>
                  {pagination}
                </Card>
                <Card className="cv-profile-panel">
                  {selected ? (
                    <CompanyProfile
                      key={selected.id}
                      company={selected}
                      {...profileProps}
                    />
                  ) : (
                    <div className="cv-empty">
                      <ProcessIcon name="building" size={30} />
                      <h2>Selecione uma empresa</h2>
                      <p>A ficha aparece aqui, ao lado do catálogo.</p>
                    </div>
                  )}
                </Card>
              </div>
            ) : (
              <Card className="cv-catalog">
                {statusTabs}
                {filters}
                <div className="cv-table-container">
                  <table className="cv-table">
                    <thead>
                      <tr>
                        <th>Empresa</th>
                        <th>CNPJ</th>
                        <th>Código do Domínio</th>
                        <th>Regime tributário</th>
                        <th>Situação</th>
                        <th>
                          <span className="sr-only">Abrir</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {visible.map((company) => (
                        <tr key={company.id}>
                          <td>
                            <button
                              className="cv-company-link"
                              onClick={() => setSelectedId(company.id)}
                              aria-label={`Abrir ficha de ${company.name}`}
                            >
                              <CompanyAvatar company={company} />
                              <span>
                                <strong>{company.name}</strong>
                                <small>
                                  {company.legalName ||
                                    'Cadastro para abertura de empresa'}
                                </small>
                              </span>
                            </button>
                          </td>
                          <td className="cv-document">
                            {company.cnpj || (
                              <span className="cv-optional">Não informado</span>
                            )}
                          </td>
                          <td>
                            <span
                              className={
                                company.code ? 'cv-code' : 'cv-optional'
                              }
                            >
                              {company.code || 'Não informado'}
                            </span>
                          </td>
                          <td>{company.regime}</td>
                          <td>
                            <CompanyStatus status={company.status} />
                          </td>
                          <td>
                            <button
                              className="cv-open-company"
                              aria-label={`Ver ${company.name}`}
                              onClick={() => setSelectedId(company.id)}
                            >
                              <ProcessIcon name="chevr" size={17} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!visible.length && empty}
                </div>
                {pagination}
              </Card>
            )}
            <footer className="cv-canvas-footer">
              <span>
                <ProcessIcon name="lock" size={13} />
                Cadastro independente de competência e tarefas.
              </span>
              <span>Estudo de interface · sem integração com a API</span>
            </footer>
          </main>
        </div>
      </div>
      {visual === 'workspace' && selected && !dialog && (
        <PreviewDialog
          title="Ficha da empresa"
          onClose={() => setSelectedId(null)}
          drawer
        >
          <CompanyProfile
            key={selected.id}
            company={selected}
            {...profileProps}
          />
        </PreviewDialog>
      )}
      {(dialog === 'create' || dialog === 'edit') && (
        <PreviewDialog
          title={dialog === 'edit' ? 'Editar cadastro' : 'Nova empresa'}
          onClose={() => setDialog(null)}
        >
          <form
            className="cv-identity-form"
            onSubmit={(event) => {
              event.preventDefault()
              finishSimulation()
            }}
          >
            <p className="cv-form-intro">
              Identificação e canais gerais da empresa. A configuração de
              Rotinas e Processos acontece nas respectivas áreas.
            </p>
            <div className="cv-form-fields">
              <TextField
                label="Nome da empresa *"
                placeholder="Como a empresa é conhecida"
                required
                defaultValue={dialog === 'edit' ? selected?.name : ''}
              />
              <TextField
                label="Razão social"
                placeholder="Opcional"
                defaultValue={dialog === 'edit' ? selected?.legalName : ''}
              />
              <TextField
                label="CNPJ"
                placeholder="Opcional · aceita letras e números"
                defaultValue={dialog === 'edit' ? selected?.cnpj : ''}
              />
              <TextField
                label="Código do Domínio"
                placeholder="Opcional"
                defaultValue={dialog === 'edit' ? selected?.code : ''}
              />
              <TextField
                label="E-mail geral"
                type="email"
                placeholder="contato@empresa.com.br"
                defaultValue={dialog === 'edit' ? selected?.email : ''}
              />
              <TextField
                label="Telefone geral"
                type="tel"
                placeholder="(00) 00000-0000"
                defaultValue={dialog === 'edit' ? selected?.phone : ''}
              />
            </div>
            <div className="cv-form-note">
              <ProcessIcon name="building" size={17} />
              <p>
                Uma empresa em abertura pode ser cadastrada sem CNPJ e sem
                código do Domínio.
              </p>
            </div>
            <div className="cv-form-footer">
              <small>Demonstração visual. Nenhum dado será salvo.</small>
              <div>
                <Button onClick={() => setDialog(null)}>Cancelar</Button>
                <Button type="submit" tone="primary">
                  {dialog === 'edit' ? 'Simular alteração' : 'Simular cadastro'}
                </Button>
              </div>
            </div>
          </form>
        </PreviewDialog>
      )}
      {dialog === 'archive' && selected && (
        <PreviewDialog
          title={
            selected.status === 'active'
              ? 'Arquivar empresa'
              : 'Restaurar empresa'
          }
          onClose={() => setDialog(null)}
        >
          <div className="cv-confirmation">
            <div className="cv-confirm-company">
              <CompanyAvatar company={selected} />
              <div>
                <strong>{selected.name}</strong>
                <small>{selected.cnpj || 'CNPJ não informado'}</small>
              </div>
            </div>
            <p>
              {selected.status === 'active'
                ? 'A empresa deixará de estar disponível para novos vínculos. O histórico e as operações já registradas permanecem preservados.'
                : 'O cadastro volta a ficar disponível. Rotinas antigas e contatos arquivados individualmente não são reativados automaticamente.'}
            </p>
            {selected.status === 'archived' && (
              <TextField
                label="Código do Domínio"
                defaultValue={selected.code}
                placeholder="Opcional"
              />
            )}
            <div className="cv-form-note">
              <ProcessIcon name="lock" size={17} />
              <p>
                Prévia visual da confirmação. O impacto real dependerá das
                permissões e da validação do servidor.
              </p>
            </div>
            <div className="cv-form-footer">
              <small>Esta simulação não altera o cadastro.</small>
              <Button tone="primary" onClick={finishSimulation}>
                Concluir simulação
              </Button>
            </div>
          </div>
        </PreviewDialog>
      )}
    </div>
  )
}

function CompanyAvatar({
  company,
  large = false,
}: {
  company: CompanyExample
  large?: boolean
}) {
  return (
    <span
      className={`cv-company-avatar cv-avatar-${company.color}${large ? ' is-large' : ''}`}
    >
      {company.initials}
    </span>
  )
}
function CompanyStatus({ status }: { status: CompanyExample['status'] }) {
  return (
    <span
      className={`cv-company-status ${status === 'active' ? 'is-active' : ''}`}
    >
      <i />
      {status === 'active' ? 'Disponível' : 'Arquivada'}
    </span>
  )
}
function CompanyProfile({
  company,
  onEdit,
  onArchive,
}: {
  company: CompanyExample
  onEdit: () => void
  onArchive: () => void
}) {
  const [tab, setTab] = useState<ProfileTab>('cadastro')
  return (
    <div className="cv-company-profile">
      <div className="cv-profile-heading">
        <CompanyAvatar company={company} large />
        <div>
          <CompanyStatus status={company.status} />
          <h2>{company.name}</h2>
          <p>{company.legalName || 'Cadastro para abertura de empresa'}</p>
        </div>
      </div>
      <div className="cv-profile-actions">
        <Button size="sm" onClick={onEdit}>
          <ProcessIcon name="pen" size={15} />
          Editar cadastro
        </Button>
        <Button size="sm" tone="ghost" onClick={onArchive}>
          <ProcessIcon
            name={company.status === 'active' ? 'archive' : 'refresh'}
            size={15}
          />
          {company.status === 'active' ? 'Arquivar' : 'Restaurar'}
        </Button>
      </div>
      <div
        className="cv-profile-tabs"
        role="tablist"
        aria-label="Informações da empresa"
      >
        {(
          [
            ['cadastro', 'Cadastro'],
            ['contatos', 'Contatos'],
            ['historico', 'Histórico'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            role="tab"
            id={`${company.id}-tab-${value}`}
            aria-selected={tab === value}
            aria-controls={`${company.id}-panel`}
            onClick={() => setTab(value)}
          >
            {label}
            {value === 'contatos' && <span>1</span>}
          </button>
        ))}
      </div>
      <div
        className="cv-profile-content"
        id={`${company.id}-panel`}
        role="tabpanel"
        aria-labelledby={`${company.id}-tab-${tab}`}
      >
        {tab === 'cadastro' ? (
          <>
            <ProfileSection
              title="Identificação"
              description="Dados do cadastro da empresa."
            >
              <dl className="cv-datum-grid">
                <ProfileDatum label="Nome da empresa" value={company.name} />
                <ProfileDatum label="Razão social" value={company.legalName} />
                <ProfileDatum label="CNPJ" value={company.cnpj} />
                <ProfileDatum label="Código do Domínio" value={company.code} />
                <ProfileDatum
                  label="Regime tributário"
                  value={company.regime}
                />
                <ProfileDatum
                  label="Situação do cadastro"
                  value={
                    company.status === 'active' ? 'Disponível' : 'Arquivada'
                  }
                />
              </dl>
            </ProfileSection>
            <ProfileSection
              title="Canais gerais"
              description="Canais institucionais para falar com a empresa."
            >
              <dl className="cv-datum-grid">
                <ProfileDatum label="E-mail" value={company.email} />
                <ProfileDatum label="Telefone" value={company.phone} />
              </dl>
            </ProfileSection>
            <div className="cv-profile-info">
              <ProcessIcon name="building" size={18} />
              <div>
                <strong>Um cadastro para todas as áreas</strong>
                <p>
                  A identidade da empresa é compartilhada. As configurações de
                  Rotinas e os fluxos de Processos continuam nos seus módulos.
                </p>
              </div>
            </div>
          </>
        ) : tab === 'contatos' ? (
          <ProfileSection
            title="Pessoas de contato"
            description="Contatos vinculados a este cadastro."
          >
            <div className="cv-contact-person">
              <span className="cv-user-avatar">
                {company.contact
                  .split(' ')
                  .map((word) => word[0])
                  .slice(0, 2)
                  .join('')}
              </span>
              <div>
                <strong>{company.contact}</strong>
                <small>Responsável pelo contato</small>
              </div>
              <CompanyStatus status="active" />
            </div>
            <dl className="cv-datum-grid">
              <ProfileDatum label="E-mail de contato" value={company.email} />
              <ProfileDatum label="Telefone" value={company.phone} />
            </dl>
          </ProfileSection>
        ) : (
          <ProfileSection
            title="Histórico do cadastro"
            description="Alterações de identidade, canais e contatos."
          >
            <ol className="cv-history">
              {[
                [
                  'Cadastro atualizado',
                  company.updated,
                  'Ana Silva',
                  'Dados gerais da empresa revisados.',
                ],
                [
                  'Contato cadastrado',
                  '23 out. 2026',
                  'Marina Oliveira',
                  `${company.contact} incluído como contato.`,
                ],
                [
                  'Empresa cadastrada',
                  '20 out. 2026',
                  'Ana Silva',
                  'Identificação e canais gerais registrados.',
                ],
              ].map(([title, date, author, text]) => (
                <li key={title}>
                  <span className="cv-history-point" />
                  <div>
                    <strong>{title}</strong>
                    <p>{text}</p>
                    <small>
                      {date} · {author}
                    </small>
                  </div>
                </li>
              ))}
            </ol>
          </ProfileSection>
        )}
      </div>
      <div className="cv-profile-footer">
        <ProcessIcon name="clock" size={14} />
        Atualizada em {company.updated} · Ana Silva
      </div>
    </div>
  )
}
function ProfileSection({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <section className="cv-profile-section">
      <h3>{title}</h3>
      <p>{description}</p>
      {children}
    </section>
  )
}
function ProfileDatum({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd className={!value ? 'cv-optional' : ''}>
        {value || 'Não informado'}
      </dd>
    </div>
  )
}
function PreviewDialog({
  title,
  onClose,
  drawer = false,
  children,
}: {
  title: string
  onClose: () => void
  drawer?: boolean
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  useOverlayDialog(ref, onClose)
  return createPortal(
    <div
      className={`companies-study cv-overlay ${drawer ? 'cv-drawer' : ''}`}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        ref={ref}
        className="cv-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
      >
        <div className="cv-dialog-heading">
          <div>
            <span>EMPRESAS</span>
            <h2>{title}</h2>
          </div>
          <Button
            data-overlay-close
            size="sm"
            onClick={onClose}
            aria-label="Fechar painel"
          >
            <ProcessIcon name="x" size={17} />
          </Button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  )
}
