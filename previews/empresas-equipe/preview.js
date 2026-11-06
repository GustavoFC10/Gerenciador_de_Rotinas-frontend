/* global document, window, location, history, URL, URLSearchParams, setTimeout, clearTimeout, structuredClone, requestAnimationFrame */
// Local, synthetic design study. This file deliberately has no API integration.
const icons = {
  companies:
    '<path d="M3 21h18M5 21V7l7-4 7 4v14M9 10h.01M15 10h.01M9 14h.01M15 14h.01M10 21v-4h4v4"/>',
  team: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/><circle cx="9" cy="7" r="4"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  arrow: '<path d="m9 5 7 7-7 7"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  sort: '<path d="M7 4v16m-4-4 4 4 4-4M14 4h7M14 9h5M14 14h3"/>',
  moon: '<path d="M21 13a9 9 0 0 1-10-10A9 9 0 1 0 21 13Z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  routines:
    '<rect x="4" y="4" width="16" height="17" rx="2"/><path d="M8 2v4M16 2v4M4 10h16M8 14h3M8 17h6"/>',
  processes:
    '<rect x="4" y="5" width="16" height="16" rx="2"/><path d="M9 5V3h6v2M8 10h8M8 14h8M8 18h5"/>',
  edit: '<path d="m15 5 4 4M4 20l4-1L21 6a2.8 2.8 0 0 0-4-4L4 15Z"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/>',
  back: '<path d="m12 5-7 7 7 7M5 12h14"/>',
}
const icon = (name, css = '') =>
  `<svg class="${css}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] ?? icons.companies}</svg>`
const $ = (selector) => document.querySelector(selector)
const escape = (value = '') =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ],
  )
const normalize = (value) =>
  String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
const initials = (value) =>
  value
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
const names = { empresas: 'Empresas', equipe: 'Equipe' }
const roles = {
  member: 'Colaborador',
  admin: 'Administrador',
  owner: 'Proprietário',
}
const statuses = {
  active: 'Ativo',
  pending: 'Convite pendente',
  inactive: 'Inativo',
  suspended: 'Suspenso',
}
const sectors = [
  ['com', 'Diretoria'],
  ['fin', 'Financeiro'],
  ['reg', 'Regularidade'],
]
const departments = ['Fiscal', 'Contábil', 'Pessoal', 'Societário']
const levels = { viewer: 'Leitor', contributor: 'Colaborador', lead: 'Líder' }
function cnpjDigits(base) {
  const digit = (value, weights) => {
    const remainder =
      [...value].reduce(
        (total, character, index) =>
          total + (character.charCodeAt(0) - 48) * weights[index],
        0,
      ) % 11
    return remainder < 2 ? 0 : 11 - remainder
  }
  const first = digit(base, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
  return `${first}${digit(base + first, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])}`
}
function validCnpj(value) {
  return (
    /^[A-Z0-9]{12}\d{2}$/.test(value) &&
    !/^(\d)\1{13}$/.test(value) &&
    value.endsWith(cnpjDigits(value.slice(0, 12)))
  )
}
function demoCnpj(value) {
  if (!value) return ''
  const base = value.replace(/[^A-Z0-9]/g, '').slice(0, 12)
  return (base + cnpjDigits(base)).replace(
    /^(.{2})(.{3})(.{3})(.{4})(.{2})$/,
    '$1.$2.$3/$4-$5',
  )
}
const companies = [
  [
    'aurora',
    'Aurora Café',
    'Aurora Cafés Especiais Ltda.',
    '0024',
    '12.345.678/0001-95',
    'financeiro@aurora.example.com',
    '(11) 3344-5566',
    'Simples Nacional',
  ],
  [
    'bosque',
    'Bosque Engenharia',
    'Bosque Engenharia e Projetos Ltda.',
    '0031',
    '24.518.306/0001-02',
    'contato@bosque.example.com',
    '(11) 99840-2233',
    'Lucro Presumido',
  ],
  [
    'casa',
    'Casa do Trigo',
    'Casa do Trigo Alimentos Ltda.',
    '0007',
    '03.147.289/0001-60',
    'adm@casadotrigo.example.com',
    '(11) 3271-8040',
    'Simples Nacional',
  ],
  [
    'estudio',
    'Estúdio Forma',
    'Forma Design e Comunicação Ltda.',
    '0046',
    '45.028.619/0001-84',
    'ola@forma.example.com',
    '(11) 99182-7640',
    'Simples Nacional',
  ],
  [
    'lume',
    'Lume Arquitetura',
    'Lume Arquitetura e Interiores Ltda.',
    '0018',
    '09.321.654/0001-12',
    'contato@lume.example.com',
    '(11) 99876-4321',
    'Simples Nacional',
  ],
  [
    'norte',
    'Norte Logística',
    'Norte Transportes e Logística S.A.',
    '0052',
    '37.462.918/0001-08',
    'fiscal@norte.example.com',
    '(11) 3535-1900',
    'Lucro Real',
  ],
  [
    'origem',
    'Origem Natural',
    'Origem Produtos Naturais Ltda.',
    '',
    '',
    'gestao@origem.example.com',
    '(11) 99718-4320',
    'Simples Nacional',
  ],
  [
    'ponte',
    'Ponte Tecnologia',
    'Ponte Soluções Digitais Ltda.',
    '0039',
    '18.705.632/0001-41',
    'financeiro@ponte.example.com',
    '(11) 4040-2255',
    'Lucro Presumido',
  ],
].map(([id, name, legalName, code, cnpj, email, mobilePhone, taxRegime]) => ({
  id,
  name,
  legalName,
  code,
  cnpj: demoCnpj(cnpj),
  email,
  mobilePhone,
  taxRegime,
}))
const members = [
  {
    id: 'ana',
    name: 'Ana Ribeiro',
    email: 'ana.ribeiro@jaralcon.example.com',
    role: 'member',
    status: 'active',
    processes: ['fin', 'reg'],
    jobTitles: { fin: 'Analista financeira', reg: '' },
    routines: {
      mode: 'departments',
      grants: { Fiscal: 'contributor', Contábil: 'viewer' },
    },
  },
  {
    id: 'bruno',
    name: 'Bruno Martins',
    email: 'bruno.martins@jaralcon.example.com',
    role: 'member',
    status: 'active',
    processes: ['reg'],
    jobTitles: {},
    routines: { mode: 'departments', grants: { Societário: 'lead' } },
  },
  {
    id: 'camila',
    name: 'Camila Nascimento',
    email: 'camila.n@jaralcon.example.com',
    role: 'member',
    status: 'pending',
    processes: ['fin'],
    jobTitles: {},
    routines: { mode: 'none', grants: {} },
  },
  {
    id: 'diego',
    name: 'Diego Almeida',
    email: 'diego.almeida@jaralcon.example.com',
    role: 'admin',
    status: 'active',
    processes: ['com', 'fin', 'reg'],
    jobTitles: {},
    routines: { mode: 'admin', grants: {} },
  },
  {
    id: 'elisa',
    name: 'Elisa Souza',
    email: 'elisa.souza@jaralcon.example.com',
    role: 'member',
    status: 'active',
    processes: [],
    jobTitles: {},
    routines: { mode: 'departments', grants: { Pessoal: 'contributor' } },
  },
  {
    id: 'felipe',
    name: 'Felipe Oliveira',
    email: 'felipe.o@jaralcon.example.com',
    role: 'member',
    status: 'inactive',
    processes: [],
    jobTitles: {},
    routines: { mode: 'none', grants: {} },
  },
  {
    id: 'mariana',
    name: 'Mariana Costa',
    email: 'mariana@jaralcon.example.com',
    role: 'owner',
    status: 'active',
    processes: ['com', 'fin', 'reg'],
    jobTitles: {},
    routines: { mode: 'admin', grants: {} },
  },
  {
    id: 'rafael',
    name: 'Rafael Lima',
    email: 'rafael.lima@jaralcon.example.com',
    role: 'member',
    status: 'suspended',
    processes: [],
    jobTitles: {},
    routines: { mode: 'none', grants: {} },
  },
]
const params = new URLSearchParams(location.search)
const state = {
  module: params.get('modulo') === 'equipe' ? 'equipe' : 'empresas',
  layout: params.get('layout') === 'ficha' ? 'ficha' : 'tabela',
  selected: null,
  tab: params.get('aba') === 'acessos' ? 'accesses' : 'profile',
  search: '',
  status: 'all',
  sort: 'name',
  editing: false,
  creating: false,
  draft: null,
  success: null,
  dirty: false,
  readonly: false,
}
let returnFocus = null
let toastTimer
let confirmation
let nextId = 1
document.documentElement.dataset.theme =
  params.get('tema') === 'dark' ? 'dark' : 'light'
const collection = () => (state.module === 'empresas' ? companies : members)
const selected = () =>
  collection().find((record) => record.id === state.selected)
const hasRoutines = (member) => member.routines.mode !== 'none'
const modulesSummary = (member) =>
  [
    hasRoutines(member) ? 'Rotinas' : '',
    member.processes.length ? 'Processos' : '',
  ].filter(Boolean)
function records() {
  return collection()
    .filter((record) => {
      if (
        state.module === 'equipe' &&
        state.status !== 'all' &&
        record.status !== state.status
      )
        return false
      const tokens =
        state.module === 'empresas'
          ? Object.values(record)
          : [
              record.name,
              record.email,
              roles[record.role],
              ...modulesSummary(record),
              ...sectors
                .filter(([id]) => record.processes.includes(id))
                .map(([, name]) => name),
              ...Object.keys(record.routines.grants),
            ]
      return normalize(tokens.join(' ')).includes(normalize(state.search))
    })
    .sort((a, b) =>
      state.sort === 'code' && state.module === 'empresas'
        ? (a.code || 'zzzz').localeCompare(b.code || 'zzzz', 'pt-BR', {
            numeric: true,
          })
        : a.name.localeCompare(b.name, 'pt-BR'),
    )
}
if (params.has('registro') || state.layout === 'ficha') {
  const requested = params.get('registro')
  state.selected =
    collection().find((record) => record.id === requested)?.id ??
    records()[0]?.id ??
    null
}

function syncURL() {
  const url = new URL(location.href)
  url.searchParams.set('modulo', state.module)
  url.searchParams.set('layout', state.layout)
  url.searchParams.set('tema', document.documentElement.dataset.theme)
  if (state.selected) url.searchParams.set('registro', state.selected)
  else url.searchParams.delete('registro')
  if (state.tab === 'accesses') url.searchParams.set('aba', 'acessos')
  else url.searchParams.delete('aba')
  history.replaceState(null, '', url)
}
function notify(message) {
  $('#toast').textContent = message
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    $('#toast').textContent = ''
  }, 4500)
}
function confirmAction(title, description, label, action, destructive = false) {
  confirmation = action
  $('#confirm-title').textContent = title
  $('#confirm-description').textContent = description
  $('#confirm-icon').innerHTML = icon(destructive ? 'lock' : 'edit')
  $('#confirm-ok').textContent = label
  $('#confirm-ok').className = `button ${destructive ? 'danger' : 'primary'}`
  $('#confirm-cancel').textContent = destructive
    ? 'Cancelar'
    : 'Continuar editando'
  $('#confirm-dialog').showModal()
  $('#confirm-cancel').focus()
}
function safeAction(action) {
  if (state.dirty)
    confirmAction(
      'Descartar alterações?',
      'Você tem alterações que ainda não foram salvas. O cadastro permanece como estava antes da edição.',
      'Descartar alterações',
      action,
    )
  else action()
}
function resetEditor() {
  state.editing = false
  state.creating = false
  state.draft = null
  state.dirty = false
  state.success = null
}
function closePanel() {
  safeAction(() => {
    const originId = returnFocus?.dataset.record ?? state.selected
    resetEditor()
    state.selected = null
    render()
    if (returnFocus?.isConnected) returnFocus.focus()
    else
      (
        Array.from(document.querySelectorAll('[data-record]')).find(
          (row) => row.dataset.record === originId,
        ) ?? $('#create')
      )?.focus()
  })
}
function avatar(record, large = false) {
  const company = state.module === 'empresas'
  const tone = company ? '' : `tone-${(members.indexOf(record) % 4) + 1}`
  return `<span class="avatar ${company ? 'company' : 'person'} ${tone} ${large ? 'large' : ''}" aria-hidden="true">${escape(initials(record.name || (company ? 'Nova empresa' : 'Novo convite')))}</span>`
}
function status(member) {
  return `<span class="status ${member.status}">${statuses[member.status]}</span>`
}
function renderRow(record) {
  const company = state.module === 'empresas'
  return `<button class="record-row ${state.selected === record.id ? 'is-selected' : ''}" data-record="${record.id}" aria-label="Abrir ${escape(record.name)}. ${escape(company ? [record.code, record.cnpj, record.email].filter(Boolean).join(' · ') : [record.email, roles[record.role], statuses[record.status], ...modulesSummary(record)].join(' · '))}" ${state.selected === record.id ? 'aria-current="true"' : ''}>
    <span class="identity">${avatar(record)}<span class="identity-text"><strong>${escape(record.name)}</strong><small>${escape(company ? record.legalName || 'Razão social não informada' : record.email)}</small><span class="split-metadata">${company ? `${record.code ? `Cód. ${escape(record.code)}` : 'Sem código'} · ${escape(record.cnpj || 'CNPJ não informado')}` : `${roles[record.role]} · ${statuses[record.status]}`}</span></span></span>
    ${
      company
        ? `<span class="code-cell tabular secondary">${escape(record.code) || '—'}</span><span class="cnpj-cell tabular secondary">${escape(record.cnpj) || '—'}</span><span class="email-cell secondary">${escape(record.email) || '—'}</span>`
        : `<span class="role-cell secondary">${roles[record.role]}</span><span class="access-cell tag-group">${
            modulesSummary(record)
              .map(
                (name) =>
                  `<span class="module-tag ${name === 'Processos' ? 'processes' : ''}"><i></i>${name}</span>`,
              )
              .join('') || '<span class="secondary">Sem acesso</span>'
          }</span><span class="status-cell">${status(record)}</span>`
    }
    ${icon('arrow', 'chevron')}
  </button>`
}
function renderList() {
  const company = state.module === 'empresas'
  const visible = records()
  const heads = company
    ? ['Empresa', 'Código', 'CNPJ', 'E-mail', '']
    : ['Pessoa', 'Papel na organização', 'Acessos', 'Situação', '']
  const classes = company
    ? ['', 'code-cell', 'cnpj-cell', 'email-cell', '']
    : ['', 'role-cell', 'access-cell', 'status-cell', '']
  $('#record-list').innerHTML =
    `<div class="column-head" aria-hidden="true">${heads.map((head, i) => `<span class="${classes[i]}">${state.layout === 'ficha' && i === 0 ? `${company ? 'Empresas' : 'Pessoas'} do escritório` : head}</span>`).join('')}</div>${visible.length ? visible.map(renderRow).join('') : `<div class="empty"><span>${icon('search')}</span><h2>Nenhum resultado encontrado</h2><p>Tente outro nome${company ? ', código ou CNPJ' : ', e-mail ou departamento'}.</p><button class="button" data-action="clear-search">Limpar busca e filtros</button></div>`}`
  $('#results-count').textContent =
    `${visible.length} de ${collection().length} ${company ? 'empresas' : 'pessoas'}`
}
function render() {
  const company = state.module === 'empresas'
  document.body.classList.toggle('team', !company)
  document.body.classList.toggle('split', state.layout === 'ficha')
  $('#module-companies').innerHTML = `${icon('companies')}Empresas`
  $('#module-team').innerHTML = `${icon('team')}Equipe`
  $('#module-companies').setAttribute(
    'aria-current',
    company ? 'page' : 'false',
  )
  $('#module-team').setAttribute('aria-current', company ? 'false' : 'page')
  $('#layout-table').setAttribute(
    'aria-pressed',
    String(state.layout === 'tabela'),
  )
  $('#layout-split').setAttribute(
    'aria-pressed',
    String(state.layout === 'ficha'),
  )
  $('#theme').innerHTML = icon(
    document.documentElement.dataset.theme === 'dark' ? 'sun' : 'moon',
  )
  $('#page-title').textContent = names[state.module]
  $('#breadcrumb-module').textContent = names[state.module]
  $('#total-count').textContent = collection().length
  $('#page-description').textContent = company
    ? 'Os dados do seu escritório, organizados em um só lugar.'
    : 'Pessoas, papéis e acessos do seu escritório.'
  $('#create').innerHTML =
    `${icon('plus')}${company ? 'Nova empresa' : 'Convidar pessoa'}`
  $('#create').hidden = company && state.readonly
  $('#search-icon').innerHTML = icon('search')
  $('#search').placeholder = company
    ? 'Buscar nome, código, CNPJ ou e-mail…'
    : 'Buscar nome, e-mail, módulo ou departamento…'
  $('#search').setAttribute(
    'aria-label',
    company ? 'Buscar empresas' : 'Buscar pessoas',
  )
  $('#search').value = state.search
  $('#sort-icon').innerHTML = icon('sort')
  $('#status').hidden = company
  $('#status').value = state.status
  $('#sort option[value="code"]').hidden = !company
  $('#sort').value = state.sort
  $('#scope-note').innerHTML = company
    ? `${icon('lock')}Cadastro compartilhado com os módulos do escritório. <label class="read-mode"><input id="read-mode" type="checkbox" ${state.readonly ? 'checked' : ''}/>Simular acesso de leitura</label>`
    : `${icon('lock')}A gestão da equipe é reservada ao proprietário. Acessos dos módulos são definidos separadamente.`
  renderList()
  renderPanel()
  syncURL()
  window.previewReady = true
}
function datum(label, value, wide = false) {
  return `<dl class="datum ${wide ? 'wide' : ''}"><dt>${label}</dt><dd>${escape(value) || '<span class="subtle">Não informado</span>'}</dd></dl>`
}
function companyView(record) {
  return `<section class="data-section"><div class="section-header"><h3>Identificação</h3>${!state.readonly ? `<button class="button" data-action="edit">${icon('edit')}Editar dados</button>` : ''}</div><div class="datum-grid">${datum('Nome fantasia', record.name, true)}${datum('Razão social', record.legalName, true)}${datum('Código interno', record.code)}${datum('CNPJ', record.cnpj)}${datum('Regime tributário', record.taxRegime, true)}</div></section><section class="data-section"><h3>Contato</h3><div class="datum-grid">${datum('E-mail', record.email, true)}${datum('Telefone', record.mobilePhone)}</div></section><p class="detail-note">Estes dados são compartilhados com os módulos do escritório. Você mantém o cadastro em um único lugar.</p>`
}
function memberView(record) {
  return `<section class="data-section"><div class="section-header"><h3>Dados da pessoa</h3><button class="button" data-action="edit">${icon('edit')}Editar perfil</button></div><div class="datum-grid">${datum('Nome', record.name, true)}${datum('E-mail de acesso', record.email, true)}${datum('Papel na organização', roles[record.role])}${datum('Situação', statuses[record.status])}</div></section><section class="data-section"><div class="section-header"><h3>Acessos aos módulos</h3><button class="button quiet" data-action="access-tab">Ver acessos ${icon('arrow')}</button></div><div class="access-read">${
    modulesSummary(record)
      .map((name) => `<span class="access-pill">${name}</span>`)
      .join('') || '<span class="subtle">Nenhum módulo liberado.</span>'
  }</div></section><details class="metadata"><summary>Informações do vínculo</summary><p>Vínculo nesta organização · dados demonstrativos.<br/>A foto pertence ao perfil da pessoa. As regras de alteração permanecem as atuais.</p></details>${record.status === 'active' && record.id !== 'mariana' ? `<div class="deactivate"><div><strong>Encerrar acesso ao escritório</strong><p>O histórico da pessoa é preservado.</p></div><button class="button danger" data-action="deactivate">Desativar</button></div>` : ''}`
}
function accessView(record) {
  const editable = ['active', 'pending'].includes(record.status)
  return `<div class="section-header"><h3>Acessos aos módulos</h3>${editable ? `<button class="button" data-action="edit">${icon('edit')}Editar acessos</button>` : ''}</div>${!editable ? '<p class="detail-note">O vínculo está inativo ou suspenso. A edição de acessos fica disponível apenas para pessoas ativas ou com convite pendente.</p>' : ''}<section class="access-module"><div class="access-module-header"><span class="module-symbol">${icon('processes')}</span><div><h3>Processos</h3><p>Setores de trabalho</p></div></div><div class="access-read">${
    sectors
      .filter(([id]) => record.processes.includes(id))
      .map(
        ([id, name]) =>
          `<span class="access-pill">${name}${record.jobTitles[id] ? ` · ${escape(record.jobTitles[id])}` : ''}</span>`,
      )
      .join('') || '<span class="subtle">Sem acesso</span>'
  }</div></section><section class="access-module"><div class="access-module-header"><span class="module-symbol">${icon('routines')}</span><div><h3>Rotinas</h3><p>Departamentos e níveis de acesso</p></div></div><div class="access-read">${
    record.routines.mode === 'admin'
      ? '<span class="access-pill">Administrador de Rotinas</span>'
      : record.routines.mode === 'none'
        ? '<span class="subtle">Sem acesso</span>'
        : Object.entries(record.routines.grants)
            .map(
              ([name, level]) =>
                `<span class="access-pill">${name} · ${levels[level]}</span>`,
            )
            .join('')
  }</div></section><p class="detail-note">O papel na organização e os acessos aos módulos são independentes. Um não concede o outro.</p>`
}
function field(
  name,
  label,
  value = '',
  {
    wide = false,
    required = false,
    type = 'text',
    max = 160,
    readonly = false,
    hint = '',
  } = {},
) {
  return `<label class="field ${wide ? 'wide' : ''}"><span>${label}${!required && !readonly ? ' <span class="optional">opcional</span>' : ''}</span><input name="${name}" type="${type}" maxlength="${max}" value="${escape(value)}" ${required ? 'required' : ''} ${readonly ? 'readonly' : ''} ${name === 'code' ? 'inputmode="numeric" pattern="[0-9]*"' : ''}/>${hint ? `<small>${hint}</small>` : ''}</label>`
}
function companyForm(record) {
  return `<section class="form-section"><h3>Identificação</h3><div class="field-grid">${field('name', 'Nome fantasia', record.name, { wide: true, required: true })}${field('legalName', 'Razão social', record.legalName, { wide: true, max: 200 })}${field('code', 'Código interno', record.code, { max: 32, hint: 'Zeros à esquerda são preservados.' })}${field('cnpj', 'CNPJ', record.cnpj, { max: 18, hint: 'Aceita números e letras na base.' })}${field('taxRegime', 'Regime tributário', record.taxRegime, { wide: true, max: 80 })}</div></section><section class="form-section"><h3>Contato</h3><div class="field-grid">${field('email', 'E-mail', record.email, { type: 'email' })}${field('mobilePhone', 'Telefone', record.mobilePhone, { type: 'tel', max: 32 })}</div></section>`
}
function memberForm(record) {
  return `<section class="form-section"><h3>${state.creating ? 'Quem vai fazer parte da equipe?' : 'Dados da pessoa'}</h3><div class="field-grid">${field('name', 'Nome completo', record.name, { wide: true, required: true })}${field('email', 'E-mail de acesso', record.email, { wide: true, required: state.creating, type: 'email', readonly: !state.creating, hint: state.creating ? 'O convite será enviado para este endereço.' : 'O e-mail de acesso não é alterado por esta tela.' })}<label class="field wide"><span>Papel na organização</span><select name="role">${Object.entries(
    roles,
  )
    .map(
      ([value, label]) =>
        `<option value="${value}" ${record.role === value ? 'selected' : ''}>${label}</option>`,
    )
    .join(
      '',
    )}</select><small>Define a administração do escritório. Os módulos são configurados separadamente.</small></label></div></section>${state.creating ? `<details class="invitation-access" open><summary>Acessos aos módulos <span>Selecionar onde a pessoa trabalha</span></summary>${accessEditor(record)}</details>` : ''}`
}
function accessEditor(record) {
  return `<div class="access-editor"><section class="access-module"><div class="access-module-header"><span class="module-symbol">${icon('processes')}</span><div><h3>Processos</h3><p>Selecione os setores permitidos</p></div><span class="access-count">${record.processes.length} de 3</span></div><div class="sector-options">${sectors.map(([id, name]) => `<label class="sector-choice"><input type="checkbox" data-sector="${id}" ${record.processes.includes(id) ? 'checked' : ''}/>${name}</label>`).join('')}</div><p class="sector-hint">Nenhum selecionado = sem acesso a Processos.</p>${
    record.processes.length
      ? `<details class="optional-details"><summary>Detalhes opcionais dos setores</summary><p>O cargo é apenas descritivo e não altera permissões.</p>${sectors
          .filter(([id]) => record.processes.includes(id))
          .map(
            ([id, name]) =>
              `<label class="field"><span>Cargo em ${name} <span class="optional">opcional</span></span><input maxlength="120" data-job-title="${id}" value="${escape(record.jobTitles[id] || '')}" placeholder="Ex.: analista financeira"/></label>`,
          )
          .join('')}</details>`
      : ''
  }</section><section class="access-module"><div class="access-module-header"><span class="module-symbol">${icon('routines')}</span><div><h3>Rotinas</h3><p>Departamentos e níveis de acesso</p></div></div><div class="routine-mode">${[
    ['none', 'Sem acesso'],
    ['departments', 'Por departamento'],
    ['admin', 'Administrador'],
  ]
    .map(
      ([value, label]) =>
        `<label><input type="radio" name="routine-mode" value="${value}" ${record.routines.mode === value ? 'checked' : ''}/>${label}</label>`,
    )
    .join('')}</div>${
    record.routines.mode === 'departments'
      ? departments
          .map(
            (name) =>
              `<div class="department-line"><label><input type="checkbox" data-department="${name}" ${record.routines.grants[name] ? 'checked' : ''}/>${name}</label>${
                record.routines.grants[name]
                  ? `<select data-level="${name}" aria-label="Nível de acesso em ${name}">${Object.entries(
                      levels,
                    )
                      .map(
                        ([value, label]) =>
                          `<option value="${value}" ${record.routines.grants[name] === value ? 'selected' : ''}>${label}</option>`,
                      )
                      .join('')}</select>`
                  : ''
              }</div>`,
          )
          .join('')
      : `<p class="sector-hint">${record.routines.mode === 'admin' ? 'Acesso administrativo a todos os departamentos de Rotinas. Não concede administração da organização.' : 'A pessoa não terá acesso ao módulo Rotinas.'}</p>`
  }</section></div>`
}
function renderPanel() {
  const inline =
    state.layout === 'ficha' && window.innerWidth >= 900 && !state.creating
  const record = state.creating ? state.draft : selected()
  const overlay = $('#overlay')
  $('#inline-detail').innerHTML = ''
  overlay.innerHTML = ''
  overlay.hidden = true
  overlay.className = ''
  document.body.style.overflow = ''
  document.querySelectorAll('.study,.workspace,main').forEach((element) => {
    element.inert = false
  })
  if (!record && !state.success) {
    if (state.layout === 'ficha')
      $('#inline-detail').innerHTML =
        `<div class="empty-detail"><div class="empty"><span>${icon(state.module === 'empresas' ? 'companies' : 'team')}</span><h2>Selecione um registro</h2><p>A ficha aparece aqui, ao lado da lista.</p></div></div>`
    return
  }
  const company = state.module === 'empresas'
  const editing = state.editing || state.creating
  const shown = editing ? state.draft : record
  const title = state.creating
    ? company
      ? 'Nova empresa'
      : 'Convidar pessoa'
    : shown.name
  const content = state.success
    ? `<div class="success-state"><span class="success-mark">${icon('check')}</span><h3>${company ? 'Empresa cadastrada' : 'Convite preparado'}</h3><p>${company ? 'O cadastro de demonstração já aparece na lista.' : `O convite para <strong>${escape(state.success)}</strong> foi simulado. Nenhum e-mail foi enviado.`}</p><button class="button primary" data-action="close">Voltar para ${company ? 'empresas' : 'equipe'}</button></div>`
    : editing
      ? `${company ? companyForm(shown) : state.creating || state.tab === 'profile' ? memberForm(shown) : accessEditor(shown)}`
      : company
        ? companyView(record)
        : state.tab === 'profile'
          ? memberView(record)
          : accessView(record)
  const footer =
    editing && !state.success
      ? `<footer class="panel-footer"><span class="pending-label" id="dirty-label">${state.dirty ? 'Alterações não salvas' : state.creating ? 'Preencha os dados para continuar' : 'Nenhuma alteração'}</span><div class="buttons"><button class="button" type="button" data-action="cancel">Cancelar</button><button class="button primary" type="submit" id="save" ${!state.dirty && !state.creating ? 'disabled' : ''}>${state.creating ? (company ? 'Cadastrar empresa' : `${icon('mail')}Enviar convite`) : 'Salvar alterações'}</button></div></footer>`
      : ''
  const panel = `<${editing ? 'form' : 'section'} id="detail-panel" class="record-panel" ${!inline ? 'role="dialog" aria-modal="true"' : ''} aria-labelledby="detail-title" tabindex="-1"><header><div class="panel-top"><span class="panel-context">${state.creating ? (company ? 'Novo cadastro' : 'Novo integrante') : company ? 'Ficha da empresa' : 'Ficha da pessoa'}${editing && !state.creating ? ' / Edição' : ''}</span><div class="panel-top-actions"><button class="icon-button" type="button" data-action="close" aria-label="Fechar ficha">${icon('close')}</button></div></div><div class="panel-identity">${avatar({ ...shown, name: title }, true)}<div><h2 id="detail-title">${escape(title)}</h2>${!state.creating ? `<p>${company ? `Código ${escape(record.code) || 'não informado'} · Cadastro geral` : escape(record.email)}</p>${!company ? status(record) : ''}` : `<p>${company ? 'Dados gerais compartilhados com o escritório' : 'Uma pessoa, os acessos necessários'}</p>`}</div></div>${!company && !state.creating ? `<nav class="panel-tabs" aria-label="Seções da ficha"><button type="button" id="tab-profile" aria-pressed="${state.tab === 'profile'}" data-tab="profile">Perfil</button><button type="button" id="tab-accesses" aria-pressed="${state.tab === 'accesses'}" data-tab="accesses">Acessos</button></nav>` : ''}</header><div class="panel-scroll"><div id="form-error" role="alert"></div>${content}</div>${footer}</${editing ? 'form' : 'section'}>`
  if (inline) $('#inline-detail').innerHTML = panel
  else {
    overlay.hidden = false
    overlay.className = 'overlay'
    overlay.innerHTML = panel
    document.body.style.overflow = 'hidden'
    document.querySelectorAll('.study,.workspace,main').forEach((element) => {
      element.inert = true
    })
  }
}
function focusPanel() {
  requestAnimationFrame(() => $('#detail-panel')?.focus())
}
function openRecord(id, element) {
  safeAction(() => {
    resetEditor()
    state.selected = id
    state.tab = 'profile'
    returnFocus = element
    render()
    if (state.layout !== 'ficha' || window.innerWidth < 900) focusPanel()
  })
}
function beginEdit() {
  state.draft = structuredClone(selected())
  state.editing = true
  state.dirty = false
  renderPanel()
  focusPanel()
}
function beginCreate() {
  safeAction(() => {
    resetEditor()
    state.creating = true
    state.selected = null
    returnFocus = $('#create')
    state.draft =
      state.module === 'empresas'
        ? {
            name: '',
            legalName: '',
            code: '',
            cnpj: '',
            taxRegime: '',
            email: '',
            mobilePhone: '',
          }
        : {
            name: '',
            email: '',
            role: 'member',
            status: 'pending',
            processes: [],
            jobTitles: {},
            routines: { mode: 'none', grants: {} },
          }
    render()
    focusPanel()
  })
}
function markDirty() {
  state.dirty =
    state.creating || JSON.stringify(state.draft) !== JSON.stringify(selected())
  if ($('#dirty-label'))
    $('#dirty-label').textContent = state.dirty
      ? 'Alterações não salvas'
      : 'Nenhuma alteração'
  if ($('#save')) $('#save').disabled = !state.dirty
}
function cancelEdit() {
  if (state.creating) return closePanel()
  safeAction(() => {
    resetEditor()
    renderPanel()
    focusPanel()
  })
}
function changeTab(tab) {
  safeAction(() => {
    resetEditor()
    state.tab = tab
    renderPanel()
    syncURL()
    $(`#tab-${tab}`)?.focus()
  })
}
function saveForm(event) {
  event.preventDefault()
  const draft = state.draft
  for (const [key, value] of Object.entries(draft))
    if (typeof value === 'string') draft[key] = value.trim()
  if (!draft.name) {
    $('#form-error').className = 'error-message'
    $('#form-error').textContent = 'Informe um nome antes de salvar.'
    return
  }
  if (
    state.module === 'equipe' &&
    draft.routines.mode === 'departments' &&
    !Object.keys(draft.routines.grants).length
  ) {
    $('#form-error').className = 'error-message'
    $('#form-error').textContent =
      'Selecione ao menos um departamento em Rotinas ou escolha “Sem acesso”.'
    $('#form-error').scrollIntoView({ block: 'nearest' })
    return
  }
  if (state.module === 'empresas') {
    draft.cnpj = draft.cnpj.toUpperCase()
    if (draft.code && !/^[0-9]{1,32}$/.test(draft.code)) return
    const cnpj = draft.cnpj.replace(/[./\s-]/g, '')
    if (cnpj && !validCnpj(cnpj)) {
      $('#form-error').className = 'error-message'
      $('#form-error').textContent =
        'Informe um CNPJ válido ou deixe o campo vazio.'
      $('#form-error').scrollIntoView({ block: 'nearest' })
      return
    }
  }
  if (state.creating) {
    const created = { ...structuredClone(draft), id: `demo-${nextId++}` }
    collection().push(created)
    state.success = draft.email || draft.name
    state.dirty = false
    render()
  } else {
    Object.assign(selected(), structuredClone(draft))
    resetEditor()
    render()
    focusPanel()
    notify('Alterações salvas nesta demonstração.')
  }
}
document.addEventListener('click', (event) => {
  const target = event.target.closest('button')
  if (!target) return
  if (target.dataset.record) return openRecord(target.dataset.record, target)
  if (target.dataset.module)
    return safeAction(() => {
      resetEditor()
      state.module = target.dataset.module
      state.selected = null
      state.search = ''
      state.status = 'all'
      state.sort = 'name'
      if (state.layout === 'ficha') state.selected = records()[0]?.id
      render()
    })
  if (target.dataset.layout)
    return safeAction(() => {
      resetEditor()
      state.layout = target.dataset.layout
      state.selected = state.layout === 'ficha' ? records()[0]?.id : null
      render()
    })
  if (target.dataset.tab) return changeTab(target.dataset.tab)
  if (target.dataset.choose) {
    $('#comparison-dialog').close()
    safeAction(() => {
      resetEditor()
      state.layout = target.dataset.choose
      state.selected = state.layout === 'ficha' ? records()[0]?.id : null
      render()
    })
    return
  }
  switch (target.dataset.action) {
    case 'close':
      return closePanel()
    case 'edit':
      return beginEdit()
    case 'cancel':
      return cancelEdit()
    case 'access-tab':
      return changeTab('accesses')
    case 'clear-search':
      state.search = ''
      state.status = 'all'
      return render()
    case 'deactivate':
      return confirmAction(
        `Desativar ${selected().name}?`,
        'A pessoa perderá o acesso a esta organização. Os registros anteriores e o histórico de trabalho serão preservados. Nesta preview, a alteração é apenas local.',
        'Desativar acesso',
        () => {
          const record = selected()
          record.status = 'inactive'
          record.processes = []
          record.routines = { mode: 'none', grants: {} }
          render()
          notify('Acesso desativado nesta demonstração.')
        },
        true,
      )
  }
})
$('#create').addEventListener('click', beginCreate)
$('#theme').addEventListener('click', () => {
  document.documentElement.dataset.theme =
    document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'
  $('#theme').innerHTML = icon(
    document.documentElement.dataset.theme === 'dark' ? 'sun' : 'moon',
  )
  syncURL()
})
$('#comparison').addEventListener('click', () =>
  $('#comparison-dialog').showModal(),
)
$('#close-comparison').addEventListener('click', () =>
  $('#comparison-dialog').close(),
)
$('#confirm-cancel').addEventListener('click', () =>
  $('#confirm-dialog').close(),
)
$('#confirm-ok').addEventListener('click', () => {
  $('#confirm-dialog').close()
  confirmation?.()
  confirmation = null
})
$('#search').addEventListener('input', (event) => {
  state.search = event.target.value
  renderList()
})
$('#status').addEventListener('change', (event) => {
  state.status = event.target.value
  renderList()
})
$('#sort').addEventListener('change', (event) => {
  state.sort = event.target.value
  renderList()
})
$('#overlay').addEventListener('click', (event) => {
  if (event.target === $('#overlay')) closePanel()
})
document.addEventListener('submit', (event) => {
  if (event.target.id === 'detail-panel') saveForm(event)
})
document.addEventListener('input', (event) => {
  if (!state.draft || !event.target.closest('#detail-panel')) return
  if (
    [
      'name',
      'legalName',
      'code',
      'cnpj',
      'email',
      'mobilePhone',
      'taxRegime',
    ].includes(event.target.name)
  ) {
    state.draft[event.target.name] = event.target.value
    markDirty()
  }
  if (event.target.dataset.jobTitle) {
    state.draft.jobTitles[event.target.dataset.jobTitle] = event.target.value
    markDirty()
  }
})
document.addEventListener('change', (event) => {
  const element = event.target
  if (element.id === 'read-mode')
    return safeAction(() => {
      state.readonly = element.checked
      resetEditor()
      render()
    })
  if (!state.draft || !element.closest('#detail-panel')) return
  if (element.name === 'role') {
    state.draft.role = element.value
    markDirty()
  }
  const sector = element.dataset.sector
  if (sector) {
    state.draft.processes = element.checked
      ? [...state.draft.processes, sector]
      : state.draft.processes.filter((id) => id !== sector)
    markDirty()
    renderPanel()
    $(`[data-sector="${sector}"]`)?.focus()
  }
  if (element.name === 'routine-mode') {
    state.draft.routines.mode = element.value
    markDirty()
    renderPanel()
    $(`input[name="routine-mode"][value="${element.value}"]`)?.focus()
  }
  const department = element.dataset.department
  if (department) {
    if (element.checked) state.draft.routines.grants[department] = 'viewer'
    else delete state.draft.routines.grants[department]
    markDirty()
    renderPanel()
    $(`[data-department="${department}"]`)?.focus()
  }
  const level = element.dataset.level
  if (level) {
    state.draft.routines.grants[level] = element.value
    markDirty()
  }
})
document.addEventListener('keydown', (event) => {
  if ($('dialog[open]')) return
  const panel = $('#overlay #detail-panel')
  if (event.key === 'Escape' && (state.selected || state.creating)) {
    event.preventDefault()
    closePanel()
    return
  }
  if (
    event.key === '/' &&
    !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName) &&
    !panel
  ) {
    event.preventDefault()
    $('#search').focus()
  }
  if (event.key === 'Tab' && panel) {
    const items = [
      ...panel.querySelectorAll(
        'button:not(:disabled),input:not(:disabled),select:not(:disabled),summary,[tabindex="0"]',
      ),
    ].filter((node) => node.getClientRects().length)
    const first = items[0],
      last = items[items.length - 1]
    if (
      event.shiftKey &&
      (document.activeElement === first || document.activeElement === panel)
    ) {
      event.preventDefault()
      last?.focus()
    } else if (
      !event.shiftKey &&
      (document.activeElement === last || document.activeElement === panel)
    ) {
      event.preventDefault()
      first?.focus()
    }
  }
})
let resizeTimer
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer)
  resizeTimer = setTimeout(() => {
    const active = document.activeElement
    const focusKey = active.closest('#detail-panel')
      ? {
          id: active.id,
          name: active.name,
          value: active.value,
          ...active.dataset,
        }
      : null
    const scroll = $('.panel-scroll')?.scrollTop ?? 0
    const selection =
      active.tagName === 'INPUT' && active.type === 'text'
        ? [active.selectionStart, active.selectionEnd]
        : null
    renderPanel()
    if ($('.panel-scroll')) $('.panel-scroll').scrollTop = scroll
    if (focusKey) {
      const replacement = [
        ...document.querySelectorAll(
          '#detail-panel button,#detail-panel input,#detail-panel select,#detail-panel summary',
        ),
      ].find((node) =>
        focusKey.id
          ? node.id === focusKey.id
          : focusKey.name
            ? node.name === focusKey.name &&
              (node.type !== 'radio' || node.value === focusKey.value)
            : Object.keys(focusKey).some(
                (key) =>
                  !['id', 'name', 'value'].includes(key) &&
                  node.dataset[key] === focusKey[key],
              ),
      )
      replacement?.focus({ preventScroll: true })
      if (selection && replacement?.type === 'text')
        replacement.setSelectionRange(...selection)
    }
  }, 100)
})
render()
if ($('#overlay #detail-panel')) focusPanel()
