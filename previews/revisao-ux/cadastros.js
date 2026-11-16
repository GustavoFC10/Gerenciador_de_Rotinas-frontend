/* global Review, document, location, history, URLSearchParams, window */
;(() => {
  'use strict'

  const team = document.body.dataset.proposal === 'P09'
  const modules = {
    routines: 'Rotinas',
    processes: 'Processos',
    companies: 'Empresas',
    honorarios: 'Honorários',
  }
  const roles = {
    member: 'Colaborador',
    admin: 'Administrador',
    owner: 'Proprietário',
  }
  const statuses = {
    active: 'Ativa',
    archived: 'Arquivada',
    pending: 'Convite pendente',
    inactive: 'Inativa',
    suspended: 'Suspensa',
  }
  const departments = ['Fiscal', 'Contábil', 'Pessoal']
  const sectors = { com: 'Diretoria', fin: 'Financeiro', reg: 'Regularidade' }
  const accessRoles = {
    viewer: 'Consulta',
    editor: 'Operação',
    manager: 'Administração',
  }
  const departmentRoles = {
    viewer: 'Leitor',
    contributor: 'Colaborador',
    lead: 'Líder',
  }
  const e = (value) =>
    String(value ?? '').replace(
      /[&<>"']/g,
      (character) =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;',
        })[character],
    )
  const normalize = (value) =>
    String(value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
  const blankAccess = () => ({
    routines: { mode: 'none', departments: {} },
    processes: [],
    titles: {},
    companies: 'none',
    honorarios: 'none',
  })
  const copy = (value) => JSON.parse(JSON.stringify(value))
  const state = {
    query: new URLSearchParams(location.search).get('q') || '',
    status:
      new URLSearchParams(location.search).get('situacao') ||
      (team ? 'all' : 'active'),
    page: Number(new URLSearchParams(location.search).get('pagina')) || 1,
    readOnly: false,
  }
  const companyNames = [
    'Aurora Comércio',
    'Horizonte Serviços',
    'Vale Sereno Engenharia',
    'Cedro Tecnologia',
    'Norte Saúde',
    'Ponte Consultoria',
    'Lagoa Distribuidora',
    'Ateliê Ipê',
    'Solar Arquitetura',
    'Caminho Logística',
    'Raiz Alimentos',
    'Clara Educação',
  ]
  const companies =
    window.JaralCompaniesPreview?.list() ||
    Array.from({ length: 300 }, (_, index) => ({
      id: `company-${index + 1}`,
      name: `${companyNames[index % companyNames.length]} ${String(Math.floor(index / companyNames.length) + 1).padStart(2, '0')}`,
      legalName: `${companyNames[index % companyNames.length]} Ltda. — exemplo ${index + 1}`,
      code: String(index + 1).padStart(4, '0'),
      cnpj: `00.${String(100 + index).padStart(3, '0')}.000/0001-00`,
      email: `financeiro${index + 1}@exemplo.invalid`,
      phone: '(41) 90000-0000',
      taxRegime: ['Simples Nacional', 'Lucro Presumido', 'Lucro Real'][
        index % 3
      ],
      status: index % 15 === 0 ? 'archived' : 'active',
    }))
  const names = [
    'Mariana Costa',
    'Ana Souza',
    'Bruno Oliveira',
    'Camila Andrade',
    'Daniel Ribeiro',
    'Elisa Martins',
    'Felipe Santos',
    'Gabriela Lima',
    'Henrique Alves',
    'Isabela Rocha',
    'João Ferreira',
    'Laura Mendes',
    'Lucas Pereira',
    'Manuela Gomes',
    'Nicolas Barbosa',
    'Olívia Teixeira',
    'Paulo Dias',
    'Rafaela Nunes',
    'Sofia Carvalho',
    'Tiago Castro',
  ]
  const people = names.map((name, index) => {
    const access = blankAccess()
    access.routines =
      index % 4 === 0
        ? { mode: 'admin', departments: {} }
        : {
            mode: 'departments',
            departments: {
              Fiscal: 'contributor',
              ...(index % 3 === 0 ? { Contábil: 'viewer' } : {}),
            },
          }
    access.processes =
      index % 3 === 0 ? ['com', 'fin'] : index % 3 === 1 ? ['reg'] : []
    access.companies = index < 5 ? 'editor' : 'viewer'
    access.honorarios = index < 3 ? 'manager' : index % 2 ? 'viewer' : 'none'
    return {
      id: `person-${index + 1}`,
      name,
      email: `${name.split(' ')[0].toLowerCase()}${index + 1}@exemplo.invalid`,
      role: index === 0 ? 'owner' : index < 3 ? 'admin' : 'member',
      status:
        index > 17
          ? index === 18
            ? 'inactive'
            : 'suspended'
          : index > 14
            ? 'pending'
            : 'active',
      joined: index > 14 ? null : '03/02/2026',
      access,
    }
  })
  const records = team ? people : companies
  let selected = null
  let draft = null
  let baseline = ''
  let editing = false
  let creating = false
  let opener = null
  let detailTab = 'profile'
  let fieldErrors = {}
  const taxRegimes = [
    'Simples Nacional',
    'Lucro Presumido',
    'Lucro Real',
    'MEI',
  ]

  const main = Review.mount({
    id: team ? 'P09' : 'P08',
    title: team ? 'Equipe' : 'Empresas',
    module: team ? 'Equipe' : 'Empresas',
    nav: [
      {
        label: 'Empresas',
        icon: 'building',
        active: !team,
        href: 'empresas.html',
      },
      {
        label: 'Equipe',
        icon: 'users',
        active: team,
        href: 'equipe.html',
      },
    ],
    content: `<div class="directory-page"><div class="page-heading"><div><h1>${team ? 'Equipe' : 'Empresas'}</h1><span class="muted">${records.length} ${team ? 'pessoas' : 'empresas'}</span></div><div class="actions"><button class="button primary" id="new-record">${team ? 'Convidar pessoa' : 'Adicionar empresa'}</button></div></div>${team ? '' : '<div class="preview-scenario"><span>Cenário da prévia:</span><label class="check"><input type="checkbox" id="read-only"> Acesso somente de consulta</label></div>'}<section class="panel" aria-label="${team ? 'Diretório da equipe' : 'Diretório de empresas'}"><div class="directory-tools"><label class="field"><span>Buscar ${team ? 'pessoa' : 'empresa'}</span><input type="search" id="directory-search" value="${e(state.query)}" placeholder="${team ? 'Nome, e-mail ou módulo' : 'Nome, código, CNPJ ou e-mail'}"></label><label class="field"><span>Situação</span><select id="directory-status">${team ? '<option value="all">Todas</option><option value="active">Ativas</option><option value="pending">Convites pendentes</option><option value="inactive">Inativas</option><option value="suspended">Suspensas</option>' : '<option value="active">Ativas</option><option value="archived">Arquivadas</option><option value="all">Todas</option>'}</select></label><span class="directory-count" id="directory-count" aria-live="polite"></span></div><div class="table-wrap" id="directory-results"></div><div class="directory-pager"><span id="page-description"></span><div class="actions"><button class="button" id="previous-page">Anterior</button><button class="button" id="next-page">Próxima</button></div></div></section></div>`,
    notes: [
      team
        ? 'P09 · Filtro de situação, consulta antes de editar e acessos compactos.'
        : 'P08 · Busca, filtro e página são preservados ao consultar ou editar.',
      'Somente demonstração local: não altera dados reais nem envia convites.',
      team
        ? '20 pessoas fictícias. O acesso de gestão desta prévia representa um proprietário, como na regra atual.'
        : '300 empresas fictícias, em páginas de 20. A quantidade demonstra navegação; não mede desempenho da API.',
      'Consulta + Editar é uma alternativa para avaliar; o predomínio de consulta ou edição ainda precisa de confirmação.',
      team
        ? 'Os quatro módulos usam os papéis do contrato atual; cargo organizacional não concede acesso automático aos módulos.'
        : 'Arquivamento, restauração e consulta de arquivados já possuem suporte no contrato. As ações desta prévia são simuladas.',
    ],
    before: team
      ? [
          '../../docs/auditoria-ux/evidencias/15-equipe-lista.png',
          '../../docs/auditoria-ux/evidencias/16-equipe-convite.png',
          '../../docs/auditoria-ux/evidencias/34-equipe-perfil-atual.png',
        ]
      : [
          '../../docs/auditoria-ux/evidencias/13-empresas-lista.png',
          '../../docs/auditoria-ux/evidencias/14-empresas-nova.png',
        ],
  })
  main.classList.add('directory-review')
  main.querySelector(':scope > .page-heading')?.remove()
  const search = main.querySelector('#directory-search')
  const filter = main.querySelector('#directory-status')
  filter.value = state.status
  if (!filter.value) {
    filter.value = team ? 'all' : 'active'
    state.status = filter.value
  }
  const directory = main.querySelector('.directory-page')
  let companyListScroll = 0
  const dialog = document.createElement(team ? 'dialog' : 'section')
  dialog.className = team
    ? 'drawer record-drawer'
    : 'record-drawer company-record-page'
  dialog.setAttribute('aria-labelledby', 'record-title')
  if (team) document.body.append(dialog)
  else {
    dialog.hidden = true
    main.append(dialog)
  }
  function syncRecordUrl() {
    if (team) return
    const params = new URLSearchParams(location.search)
    if (dialog.hidden) params.delete('empresa')
    else params.set('empresa', creating ? 'nova' : draft.id)
    try {
      history.replaceState({}, '', location.pathname + '?' + params)
    } catch {
      /* Local file preview. */
    }
  }
  function showRecord() {
    if (team) {
      dialog.showModal()
      return
    }
    companyListScroll = window.scrollY
    directory.hidden = true
    dialog.hidden = false
    syncRecordUrl()
    window.scrollTo(0, 0)
    dialog.querySelector('#record-title')?.focus()
  }

  function syncUrl() {
    const params = new URLSearchParams(location.search)
    if (state.query) params.set('q', state.query)
    else params.delete('q')
    params.set('situacao', state.status)
    params.set('pagina', state.page)
    try {
      history.replaceState(
        {},
        '',
        `${location.pathname}${params.size ? `?${params}` : ''}`,
      )
    } catch {
      /* file previews can restrict URL updates; state remains in the page. */
    }
  }
  function enabledModules(person) {
    return Object.entries(modules)
      .filter(([id]) =>
        id === 'routines'
          ? person.access.routines.mode !== 'none'
          : id === 'processes'
            ? person.access.processes.length
            : person.access[id] !== 'none',
      )
      .map(([, label]) => label)
  }
  function matching() {
    const query = normalize(state.query)
    return records.filter(
      (record) =>
        (state.status === 'all' || state.status === record.status) &&
        normalize(
          [
            record.name,
            record.email,
            record.code,
            record.cnpj,
            record.cnpj?.replace(/[^a-z0-9]/gi, ''),
            record.legalName,
            team ? roles[record.role] : '',
            team ? enabledModules(record).join(' ') : '',
          ].join(' '),
        ).includes(query),
    )
  }
  function status(record) {
    return `<span class="record-status ${record.status}">${e(statuses[record.status] || record.status)}</span>`
  }
  function renderRows() {
    main.querySelector('.page-heading .muted').textContent =
      `${records.length} ${team ? 'pessoas' : 'empresas'}`
    const all = matching()
    const pages = Math.max(1, Math.ceil(all.length / 20))
    state.page = Math.min(Math.max(state.page, 1), pages)
    const rows = all.slice((state.page - 1) * 20, state.page * 20)
    main.querySelector('#directory-count').textContent =
      `${all.length} resultado${all.length !== 1 ? 's' : ''}`
    main.querySelector('#page-description').textContent =
      `Página ${state.page} de ${pages} · ${all.length ? (state.page - 1) * 20 + 1 : 0}–${Math.min(state.page * 20, all.length)} de ${all.length}`
    main.querySelector('#previous-page').disabled = state.page === 1
    main.querySelector('#next-page').disabled = state.page === pages
    main.querySelector('#directory-results').innerHTML = rows.length
      ? `<table class="directory-table"><colgroup>${team ? '<col style="width:35%"><col style="width:17%"><col style="width:30%"><col style="width:18%">' : '<col style="width:35%"><col style="width:9%"><col style="width:19%"><col class="secondary-col" style="width:24%"><col style="width:13%">'}</colgroup><thead><tr>${(team ? ['Pessoa', 'Papel na organização', 'Módulos', 'Situação'] : ['Empresa', 'Código', 'CNPJ', 'E-mail', 'Situação']).map((label, index) => `<th scope="col"${!team && index === 3 ? ' class="secondary-col"' : ''}>${label}</th>`).join('')}</tr></thead><tbody>${rows
          .map((record) =>
            team
              ? `<tr data-open="${record.id}" aria-label="Abrir ficha de ${e(record.name)}"><td><span class="record-identity"><span class="person-cell"><span class="person-monogram" aria-hidden="true">${e(
                  record.name
                    .split(' ')
                    .map((part) => part[0])
                    .slice(0, 2)
                    .join(''),
                )}</span><span><strong>${e(record.name)}</strong><small>${e(record.email)}</small></span></span></span></td><td>${e(roles[record.role])}</td><td><span class="module-tags">${
                  enabledModules(record)
                    .map((label) => `<span>${label}</span>`)
                    .join('') || '<span>Sem acesso</span>'
                }</span></td><td>${status(record)}</td></tr>`
              : `<tr data-open="${record.id}" aria-label="Abrir ficha de ${e(record.name)}"><td><span class="record-identity"><strong>${e(record.name)}</strong><small>${e(record.legalName)}</small></span></td><td class="code-cell">${e(record.code || '—')}</td><td class="code-cell">${e(record.cnpj || 'Não informado')}</td><td class="secondary-col">${e(record.email || 'Não informado')}</td><td>${status(record)}</td></tr>`,
          )
          .join('')}</tbody></table>`
      : `<div class="directory-empty"><p>Nenhum registro encontrado para esta busca e situação.</p><button class="button" data-action="clear-search">Limpar busca e filtros</button></div>`
    Review.rows(main.querySelector('#directory-results'), {
      selector: 'tr[data-open]',
      onOpen: (row) => openRecord(row.dataset.open, row),
    })
    main
      .querySelector('[data-action="clear-search"]')
      ?.addEventListener('click', () => {
        state.query = ''
        state.status = team ? 'all' : 'active'
        state.page = 1
        search.value = ''
        filter.value = state.status
        renderRows()
      })
    syncUrl()
  }
  function changed() {
    return editing && JSON.stringify(draft) !== baseline
  }
  async function mayDiscard() {
    return (
      !changed() ||
      Review.confirm({
        title: 'Descartar alterações?',
        body: 'O que foi alterado nesta ficha ainda não foi salvo.',
        confirmLabel: 'Descartar alterações',
      })
    )
  }
  async function closeRecord() {
    if (!(await mayDiscard())) return
    const recordId = selected?.id || draft?.id
    if (team) dialog.close()
    else {
      dialog.hidden = true
      directory.hidden = false
      syncRecordUrl()
      window.scrollTo(0, companyListScroll)
    }
    selected = null
    const replacement = [...main.querySelectorAll('[data-open]')].find(
      (button) => button.dataset.open === recordId,
    )
    ;(opener?.isConnected ? opener : replacement || search).focus()
  }
  function openRecord(id, button) {
    selected = records.find((record) => record.id === id)
    if (!selected) return
    opener = button
    creating = false
    editing = false
    detailTab = 'profile'
    fieldErrors = {}
    draft = copy(selected)
    baseline = JSON.stringify(draft)
    renderDialog()
    showRecord()
  }
  function newRecord(button) {
    creating = true
    editing = true
    detailTab = 'profile'
    fieldErrors = {}
    selected = null
    opener = button
    draft = team
      ? {
          id: `person-${Date.now()}`,
          name: '',
          email: '',
          role: 'member',
          status: 'pending',
          joined: null,
          access: blankAccess(),
        }
      : {
          id: `company-${Date.now()}`,
          name: '',
          legalName: '',
          code: '',
          cnpj: '',
          email: '',
          phone: '',
          taxRegime: '',
          status: 'active',
        }
    baseline = JSON.stringify(draft)
    renderDialog()
    showRecord()
  }
  const datum = (label, value, wide = false) =>
    `<div${wide ? ' class="span-2"' : ''}><dt>${label}</dt><dd>${e(value || 'Não informado')}</dd></div>`
  const errorAttributes = (key) =>
    fieldErrors[key]
      ? ` aria-invalid="true" aria-describedby="record-${key}-error"`
      : ''
  const inlineError = (key) =>
    `<span class="field-error" id="record-${key}-error"${fieldErrors[key] ? '' : ' hidden'}>${e(fieldErrors[key] || '')}</span>`
  const input = (key, label, options = {}) =>
    `<label class="field${options.wide ? ' span-2' : ''}${options.className ? ` ${options.className}` : ''}"><span>${label}${options.required ? ' *' : ''}</span><input id="record-${key}" name="${key}" value="${e(draft[key])}" type="${key === 'phone' ? 'tel' : options.type || 'text'}" ${options.required ? 'required' : ''} ${options.max ? `maxlength="${options.max}"` : ''} ${options.autocomplete ? `autocomplete="${options.autocomplete}"` : ''}${errorAttributes(key)}>${inlineError(key)}</label>`
  function accessSummary() {
    const access = draft.access
    return `<dl class="access-summary"><div><dt>Rotinas</dt><dd>${
      access.routines.mode === 'none'
        ? 'Sem acesso'
        : access.routines.mode === 'admin'
          ? 'Administração de Rotinas'
          : Object.entries(access.routines.departments)
              .map(([name, role]) => `${e(name)} · ${departmentRoles[role]}`)
              .join('<br>') || 'Nenhum departamento selecionado'
    }</dd></div><div><dt>Processos</dt><dd>${access.processes.map((id) => `${sectors[id]}${access.titles[id] ? ` · ${e(access.titles[id])}` : ''}`).join('<br>') || 'Sem acesso'}</dd></div><div><dt>Empresas</dt><dd>${accessRoles[access.companies] || 'Sem acesso'}</dd></div><div><dt>Honorários</dt><dd>${accessRoles[access.honorarios] || 'Sem acesso'}</dd></div></dl>`
  }
  function accessEditor() {
    const access = draft.access
    const locked = !['active', 'pending'].includes(draft.status)
    return `<fieldset ${locked ? 'disabled' : ''} style="border:0;padding:0;margin:0;min-width:0"><legend class="sr-only">Acessos por módulo</legend>${locked ? '<p class="notice">Os acessos só podem ser alterados para pessoas ativas ou com convite pendente.</p>' : ''}<fieldset class="access-section"><legend>Rotinas</legend><label class="field"><span>Acesso</span><select id="record-routine-mode" data-access="routine-mode"${errorAttributes('routine-mode')}><option value="none"${access.routines.mode === 'none' ? ' selected' : ''}>Sem acesso</option><option value="departments"${access.routines.mode === 'departments' ? ' selected' : ''}>Por departamento</option><option value="admin"${access.routines.mode === 'admin' ? ' selected' : ''}>Administração de Rotinas</option></select>${inlineError('routine-mode')}</label>${
      access.routines.mode === 'departments'
        ? `<div class="access-departments">${departments
            .map(
              (name) =>
                `<div class="access-department"><label class="check"><input type="checkbox" data-access="department" value="${name}"${access.routines.departments[name] ? ' checked' : ''}>${name}</label>${
                  access.routines.departments[name]
                    ? `<label class="field"><span class="sr-only">Nível em ${name}</span><select data-access="department-role" data-department="${name}">${Object.entries(
                        departmentRoles,
                      )
                        .map(
                          ([id, label]) =>
                            `<option value="${id}"${access.routines.departments[name] === id ? ' selected' : ''}>${label}</option>`,
                        )
                        .join('')}</select></label>`
                    : ''
                }</div>`,
            )
            .join('')}</div>`
        : access.routines.mode === 'admin'
          ? '<p class="field-help">Administra Rotinas. Não concede acesso aos outros módulos ou à gestão de pessoas.</p>'
          : ''
    }</fieldset><fieldset class="access-section"><legend>Processos</legend><div class="access-choices">${Object.entries(
      sectors,
    )
      .map(
        ([id, label]) =>
          `<label class="check"><input type="checkbox" data-access="sector" value="${id}"${access.processes.includes(id) ? ' checked' : ''}>${label}</label>`,
      )
      .join(
        '',
      )}</div>${access.processes.length ? `<details data-details="job-titles"><summary>Cargos descritivos opcionais</summary>${access.processes.map((id) => `<label class="field"><span>Cargo em ${sectors[id]}</span><input data-access="job-title" data-sector="${id}" value="${e(access.titles[id] || '')}" maxlength="120"></label>`).join('')}</details>` : '<span class="field-help">Nenhum setor selecionado: sem acesso a Processos.</span>'}</fieldset>${[
      'companies',
      'honorarios',
    ]
      .map(
        (id) =>
          `<fieldset class="access-section"><legend>${modules[id]}</legend><label class="field"><span>Papel no módulo</span><select data-access="module-role" data-module="${id}"><option value="none">Sem acesso</option>${Object.entries(
            accessRoles,
          )
            .map(
              ([role, label]) =>
                `<option value="${role}"${access[id] === role ? ' selected' : ''}>${label}</option>`,
            )
            .join('')}</select></label></fieldset>`,
      )
      .join('')}</fieldset>`
  }
  function companyContent() {
    if (!editing)
      return `<section class="record-section"><h3>Identificação</h3><dl class="record-dl">${datum('Nome fantasia', draft.name, true)}${datum('Razão social', draft.legalName, true)}${datum('Código', draft.code)}${datum('CNPJ', draft.cnpj)}${datum('Regime tributário', draft.taxRegime)}${datum('Situação', statuses[draft.status])}</dl></section><section class="record-section"><h3>Contato</h3><dl class="record-dl">${datum('E-mail', draft.email, true)}${datum('Telefone', draft.phone)}</dl></section>${companyModules()}`
    const existingRegime = selected?.taxRegime || draft.taxRegime
    const legacyRegime = existingRegime && !taxRegimes.includes(existingRegime)
    return `<section class="record-section"><h3>Identificação</h3><div class="form-grid company-fields">${input('name', 'Nome fantasia', { required: true, wide: true, max: 160 })}${input('legalName', 'Razão social', { wide: true, max: 200 })}${input('code', 'Código', { max: 32, className: 'identity-code' })}${input('cnpj', 'CNPJ', { max: 18, className: 'identity-cnpj' })}<label class="field span-2 identity-regime"><span>Regime tributário</span><select id="record-taxRegime" name="taxRegime"><option value=""${!draft.taxRegime ? ' selected' : ''}>Não informado</option>${legacyRegime ? `<option value="${e(existingRegime)}"${draft.taxRegime === existingRegime ? ' selected' : ''}>${e(existingRegime)} (valor atual)</option>` : ''}${taxRegimes.map((regime) => `<option value="${e(regime)}"${draft.taxRegime === regime ? ' selected' : ''}>${e(regime)}</option>`).join('')}</select></label></div></section><section class="record-section"><h3>Contato</h3><div class="contact-fields">${input('email', 'E-mail', { type: 'email', autocomplete: 'email', className: 'contact-email' })}${input('phone', 'Telefone', { max: 32, autocomplete: 'tel', className: 'contact-phone' })}</div></section>`
  }
  function companyModules() {
    if (!window.JaralCompaniesPreview) return ''
    const routines = window.JaralCompaniesPreview.getRoutines(draft.id)
    const contexts = routines?.contexts
      ? Object.values(routines.contexts)
      : routines
        ? [routines]
        : []
    const routineCount = contexts.reduce(
      (sum, context) => sum + context.routineIds.length,
      0,
    )
    const profile = window.JaralCompaniesPreview.getProfile(draft.id)
    return `<section class="record-section"><h3>Dados nos módulos</h3><div class="company-module-summary"><a href="empresas-modulos.html?modulo=rotinas&empresa=${encodeURIComponent(draft.id)}"><span><strong>Rotinas</strong><small>${routines ? `${contexts.length} departamento${contexts.length > 1 ? 's' : ''} · ${routineCount} vínculos` : 'Sem configuração de rotinas'}</small></span><span>${routines ? 'Consultar configuração' : 'Configurar Rotinas'} ›</span></a><a href="clientes-honorarios.html?empresa=${encodeURIComponent(draft.id)}"><span><strong>Honorários</strong><small>${profile ? 'Perfil financeiro cadastrado' : 'Sem dados financeiros cadastrados'}</small></span><span>${profile ? 'Consultar perfil' : 'Configurar honorários'} ›</span></a></div></section>`
  }
  function teamContent() {
    if (detailTab === 'access' && !creating)
      return editing ? accessEditor() : accessSummary()
    if (!editing)
      return `<section class="record-section"><h3>Identidade</h3><dl class="record-dl">${datum('Nome', draft.name, true)}${datum('E-mail', draft.email, true)}${datum('Papel na organização', roles[draft.role])}${datum('Situação', statuses[draft.status])}${datum('Entrada', draft.joined || 'Convite ainda não aceito')}</dl></section>`
    return `<section class="record-section"><h3>${creating ? 'Dados do convite' : 'Identidade'}</h3><div class="form-grid">${input('name', 'Nome completo', { wide: true, required: true, max: 160, autocomplete: 'name' })}${creating ? input('email', 'E-mail do convite', { wide: true, required: true, type: 'email', autocomplete: 'email' }) : `<div class="span-2"><span class="field-help">E-mail da conta</span><p>${e(draft.email)}</p></div>`}<label class="field span-2"><span>Papel na organização</span><select name="role">${Object.entries(
      roles,
    )
      .map(
        ([id, label]) =>
          `<option value="${id}"${draft.role === id ? ' selected' : ''}>${label}</option>`,
      )
      .join(
        '',
      )}</select><span class="field-help">O papel organiza a administração da conta. Os acessos de trabalho são independentes.</span></label></div>${draft.role !== 'member' ? '<p class="notice">Este papel concede administração da organização. Confira antes de salvar; nenhum acesso a módulo é concedido automaticamente.</p>' : ''}</section>${creating ? `<section class="record-section"><h3>Acessos de trabalho</h3>${accessEditor()}</section>` : ''}`
  }
  function controlKey(control) {
    if (!control || !dialog.contains(control)) return null
    if (control.dataset.access)
      return `access:${control.dataset.access}:${control.dataset.department || control.dataset.sector || control.dataset.module || ''}:${control.type === 'checkbox' ? control.value : ''}`
    if (control.name) return `name:${control.name}`
    if (control.dataset.tab) return `tab:${control.dataset.tab}`
    if (control.dataset.action) return `action:${control.dataset.action}`
    if (control.tagName === 'SUMMARY')
      return `summary:${control.closest('details')?.dataset.details || ''}`
    return control.id ? `id:${control.id}` : null
  }
  function clearFieldError(key) {
    if (!fieldErrors[key]) return
    delete fieldErrors[key]
    const control = dialog.querySelector(`#record-${key}`)
    control?.removeAttribute('aria-invalid')
    control?.removeAttribute('aria-describedby')
    const error = dialog.querySelector(`#record-${key}-error`)
    if (error) {
      error.hidden = true
      error.textContent = ''
    }
    dialog.querySelector('#record-error').textContent = Object.keys(fieldErrors)
      .length
      ? 'Revise os campos indicados antes de salvar.'
      : ''
  }
  async function activateTab(tab) {
    if (detailTab === tab) {
      dialog.querySelector(`[data-tab="${tab}"]`)?.focus()
      return
    }
    if (!(await mayDiscard())) {
      dialog.querySelector(`[data-tab="${detailTab}"]`)?.focus()
      return
    }
    draft = copy(selected)
    editing = false
    fieldErrors = {}
    detailTab = tab
    renderDialog(`[data-tab="${tab}"]`)
    dialog.querySelector('.dialog-body').scrollTop = 0
  }
  function renderDialog(focusSelector = '') {
    const active = document.activeElement
    const focusKey = controlKey(active)
    const scroll = dialog.querySelector('.dialog-body')?.scrollTop || 0
    const openDetails = [...dialog.querySelectorAll('details[open]')].map(
      (details) => details.dataset.details,
    )
    const hasTabs = team && !creating
    const tabs = ['profile', 'access']
    const content = team ? teamContent() : companyContent()
    const tabBar = hasTabs
      ? `<div class="tabs" role="tablist" aria-label="Ficha da pessoa">${tabs.map((tab) => `<button class="tab ${detailTab === tab ? 'active' : ''}" id="record-tab-${tab}" role="tab" data-tab="${tab}" aria-selected="${detailTab === tab}" aria-controls="record-panel-${tab}" tabindex="${detailTab === tab ? 0 : -1}">${tab === 'profile' ? 'Perfil' : 'Acessos'}</button>`).join('')}</div>`
      : ''
    const panels = hasTabs
      ? tabs
          .map(
            (tab) =>
              `<section role="tabpanel" id="record-panel-${tab}" aria-labelledby="record-tab-${tab}" tabindex="0"${detailTab === tab ? '' : ' hidden'}>${detailTab === tab ? content : ''}</section>`,
          )
          .join('')
      : content
    dialog.innerHTML = `${team ? '' : `<nav class="company-record-nav"><button class="button" data-action="close">${Review.icon('arrow-left')} Voltar às empresas</button></nav>`}<header class="dialog-head"><div><${team ? 'h2' : 'h1'} id="record-title" tabindex="-1">${creating ? (team ? 'Convidar pessoa' : 'Adicionar empresa') : e(draft.name)}</${team ? 'h2' : 'h1'}>${creating ? '' : `<p>${team ? roles[draft.role] : `Código ${e(draft.code || 'não informado')}`} · ${e(statuses[draft.status])}</p>`}</div>${team ? `<button class="button ghost" data-action="close" aria-label="Fechar ficha">${Review.icon('x') || '×'}</button>` : ''}</header>${tabBar}<div class="dialog-body"><form id="record-form" novalidate><div class="error drawer-message" role="alert" id="record-error">${Object.keys(fieldErrors).length ? 'Revise os campos indicados antes de salvar.' : ''}</div>${panels}</form></div><footer class="dialog-footer"><span class="muted" id="draft-state">${editing ? (changed() ? 'Alterações não salvas' : 'Nenhuma alteração pendente') : 'Consulta'}</span><div class="actions">${editing ? `<button class="button" data-action="cancel">Cancelar</button><button class="button primary" type="submit" form="record-form" data-action="save">${creating ? (team ? 'Simular convite' : 'Cadastrar empresa') : 'Salvar alterações'}</button>` : `${!team && !state.readOnly ? `<button class="button ${draft.status === 'archived' ? '' : 'ghost'}" data-action="archive">${draft.status === 'archived' ? 'Restaurar' : 'Arquivar'}</button>` : ''}${team && draft.status === 'active' && draft.role !== 'owner' ? '<button class="button ghost" data-action="deactivate">Desativar acesso</button>' : ''}<button class="button" data-action="close">${team ? 'Fechar' : 'Voltar à lista'}</button>${!state.readOnly || team ? `<button class="button primary" data-action="edit">${team && detailTab === 'access' ? 'Editar acessos' : 'Editar'}</button>` : ''}`}</div></footer>`
    Review.inputs?.decorate(dialog)
    dialog.querySelectorAll('details').forEach((details) => {
      details.open = openDetails.includes(details.dataset.details)
    })
    dialog.querySelector('.dialog-body').scrollTop = scroll
    dialog
      .querySelectorAll('[data-action="close"]')
      .forEach((button) =>
        button.addEventListener('click', () => void closeRecord()),
      )
    dialog
      .querySelector('[data-action="edit"]')
      ?.addEventListener('click', () => {
        editing = true
        fieldErrors = {}
        baseline = JSON.stringify(draft)
        renderDialog(
          detailTab === 'access'
            ? '[data-access="routine-mode"]'
            : '[name="name"]',
        )
      })
    dialog
      .querySelector('[data-action="cancel"]')
      ?.addEventListener('click', async () => {
        if (!(await mayDiscard())) return
        if (creating) {
          editing = false
          await closeRecord()
        } else {
          draft = copy(selected)
          editing = false
          fieldErrors = {}
          renderDialog('[data-action="edit"]')
        }
      })
    dialog.querySelectorAll('[data-tab]').forEach((button) => {
      button.addEventListener(
        'click',
        () => void activateTab(button.dataset.tab),
      )
      button.addEventListener('keydown', (event) => {
        const current = tabs.indexOf(button.dataset.tab)
        const target = {
          ArrowLeft: tabs[(current + tabs.length - 1) % tabs.length],
          ArrowRight: tabs[(current + 1) % tabs.length],
          Home: tabs[0],
          End: tabs[tabs.length - 1],
        }[event.key]
        if (!target) return
        event.preventDefault()
        void activateTab(target)
      })
    })
    dialog
      .querySelector('[data-action="archive"]')
      ?.addEventListener('click', archiveCompany)
    dialog
      .querySelector('[data-action="deactivate"]')
      ?.addEventListener('click', deactivatePerson)
    dialog.querySelector('#record-form').addEventListener('submit', saveRecord)
    dialog.querySelectorAll('[name]').forEach((field) =>
      field.addEventListener('input', () => {
        if (Object.hasOwn(draft, field.name)) {
          draft[field.name] = field.value
          clearFieldError(field.name)
          updateDirty()
          if (field.name === 'role') renderDialog()
        }
      }),
    )
    dialog.querySelectorAll('[data-access]').forEach((field) =>
      field.addEventListener(
        field.dataset.access === 'job-title' ? 'input' : 'change',
        () => {
          const access = draft.access
          clearFieldError('routine-mode')
          if (field.dataset.access === 'routine-mode')
            access.routines.mode = field.value
          if (field.dataset.access === 'department') {
            if (field.checked)
              access.routines.departments[field.value] = 'viewer'
            else delete access.routines.departments[field.value]
          }
          if (field.dataset.access === 'department-role')
            access.routines.departments[field.dataset.department] = field.value
          if (field.dataset.access === 'sector')
            access.processes = field.checked
              ? [...access.processes, field.value]
              : access.processes.filter((id) => id !== field.value)
          if (field.dataset.access === 'job-title')
            access.titles[field.dataset.sector] = field.value
          if (field.dataset.access === 'module-role')
            access[field.dataset.module] = field.value
          if (field.dataset.access === 'job-title') updateDirty()
          else renderDialog()
        },
      ),
    )
    const restored =
      (focusSelector
        ? dialog.querySelector(focusSelector)
        : [...dialog.querySelectorAll('button,input,select,summary')].find(
            (control) => focusKey && controlKey(control) === focusKey,
          )) ||
      (focusKey
        ? dialog.querySelector('[data-action="edit"], [data-action="close"]')
        : null)
    restored?.focus({ preventScroll: true })
    if (focusSelector) restored?.scrollIntoView({ block: 'nearest' })
  }
  function updateDirty() {
    dialog.querySelector('#draft-state').textContent = changed()
      ? 'Alterações não salvas'
      : 'Nenhuma alteração pendente'
  }
  function saveRecord(event) {
    event.preventDefault()
    if (!editing) return
    fieldErrors = {}
    if (!draft.name.trim()) fieldErrors.name = 'Informe o nome.'
    const emailInput = dialog.querySelector('[name="email"]')
    if (team && creating && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email))
      fieldErrors.email = 'Informe um e-mail válido para o convite.'
    else if (emailInput && !emailInput.validity.valid)
      fieldErrors.email = 'Informe um e-mail válido.'
    if (
      team &&
      draft.access.routines.mode === 'departments' &&
      !Object.keys(draft.access.routines.departments).length
    )
      fieldErrors['routine-mode'] =
        'Selecione ao menos um departamento ou escolha Sem acesso.'
    const firstError = Object.keys(fieldErrors)[0]
    if (firstError) {
      if (team && !creating)
        detailTab = firstError === 'routine-mode' ? 'access' : 'profile'
      renderDialog(`#record-${firstError}`)
      return
    }
    draft.name = draft.name.trim()
    if (!team && window.JaralCompaniesPreview) {
      try {
        if (creating) {
          draft = window.JaralCompaniesPreview.create(draft)
          records.unshift(copy(draft))
        } else {
          window.JaralCompaniesPreview.update(draft.id, draft)
          Object.assign(selected, copy(draft))
        }
      } catch (error) {
        dialog.querySelector('#record-error').textContent = error.message
        return
      }
    } else if (creating) records.unshift(copy(draft))
    else Object.assign(selected, copy(draft))
    selected = records.find((record) => record.id === draft.id)
    const wasCreating = creating
    creating = false
    editing = false
    draft = copy(selected)
    baseline = JSON.stringify(draft)
    renderRows()
    renderDialog('[data-action="edit"]')
    syncRecordUrl()
    Review.toast(
      wasCreating && team
        ? 'Convite simulado. Nenhum e-mail foi enviado.'
        : wasCreating
          ? 'Empresa adicionada à demonstração.'
          : 'Alterações salvas apenas nesta demonstração.',
    )
  }
  async function archiveCompany() {
    const archived = draft.status === 'archived'
    if (
      !(await Review.confirm({
        title: archived ? 'Restaurar empresa?' : 'Arquivar empresa?',
        body: archived
          ? 'A empresa voltará à lista de ativas nesta demonstração.'
          : 'A empresa sairá da lista de ativas e continuará disponível em Arquivadas. Nenhum dado real será alterado.',
        confirmLabel: archived ? 'Restaurar' : 'Arquivar',
      }))
    )
      return
    selected.status = archived ? 'active' : 'archived'
    window.JaralCompaniesPreview?.update(selected.id, {
      status: selected.status,
    })
    draft = copy(selected)
    renderRows()
    renderDialog()
    Review.toast(
      archived
        ? 'Empresa restaurada na demonstração.'
        : 'Empresa arquivada na demonstração. Use o filtro Arquivadas para encontrá-la.',
    )
  }
  async function deactivatePerson() {
    if (
      !(await Review.confirm({
        title: 'Desativar acesso?',
        body: `${draft.name} deixará de acessar a organização nesta demonstração. Esta ação é apenas simulada.`,
        confirmLabel: 'Desativar acesso',
      }))
    )
      return
    selected.status = 'inactive'
    draft = copy(selected)
    renderRows()
    renderDialog()
    Review.toast('Acesso desativado apenas nesta demonstração.')
  }
  search.addEventListener('input', () => {
    state.query = search.value
    state.page = 1
    renderRows()
  })
  filter.addEventListener('change', () => {
    state.status = filter.value
    state.page = 1
    renderRows()
  })
  main.querySelector('#previous-page').addEventListener('click', () => {
    state.page--
    renderRows()
  })
  main.querySelector('#next-page').addEventListener('click', () => {
    state.page++
    renderRows()
  })
  main
    .querySelector('#new-record')
    .addEventListener('click', (event) => newRecord(event.currentTarget))
  main.querySelector('#read-only')?.addEventListener('change', (event) => {
    state.readOnly = event.target.checked
    main.querySelector('#new-record').hidden = state.readOnly
    Review.toast(
      state.readOnly
        ? 'Cenário de consulta: criação, edição e arquivamento ocultos.'
        : 'Cenário de administração da carteira.',
    )
  })
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault()
    void closeRecord()
  })
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) {
      const rect = dialog.getBoundingClientRect()
      if (
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom
      )
        void closeRecord()
    }
  })
  renderRows()
  const requestedCompany =
    !team && new URLSearchParams(location.search).get('empresa')
  if (
    requestedCompany &&
    records.some((record) => record.id === requestedCompany)
  )
    openRecord(requestedCompany, search)
})()
