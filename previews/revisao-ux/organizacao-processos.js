/* global Review, document, window, URLSearchParams, URL */
;(() => {
  'use strict'
  const data = window.JaralProcessOrganizationData
  const catalog = data.catalog
  if (!catalog.permissions.read) {
    Review.mount({
      id: 'P16',
      title: 'Processos',
      module: 'Processos',
      content:
        '<section class="panel org-empty"><h2>Acesso indisponível</h2><p>Seu acesso não permite consultar Processos.</p></section>',
    })
    return
  }
  const processes = data.processes.filter((process) => process.permissions.read)
  const esc = (value) =>
    String(value ?? '').replace(
      /[&<>"']/g,
      (char) =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;',
        })[char],
    )
  const normalize = (value) =>
    String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('pt-BR')
  const titles = {
    A: 'Acesso rápido e Por situação',
    B: 'Navegação por abas',
    C: 'Seletor de visão',
    D: 'Central de acessos',
  }
  // Same named views and persisted statuses as src/utils/processFilters.ts.
  const views = {
    fila: {
      title: 'Minha fila',
      short: 'Minha fila',
      group: 'work',
      statuses: ['andamento', 'atrasado'],
    },
    responsabilidade: {
      title: 'Responsabilidade',
      short: 'Responsabilidade',
      group: 'work',
    },
    outrosSetores: {
      title: 'Com outros setores',
      short: 'Com outros setores',
      group: 'work',
      statuses: ['andamento', 'atrasado'],
    },
    ativos: {
      title: 'Abertos',
      short: 'Abertos',
      group: 'status',
      statuses: ['andamento', 'agendado', 'atrasado'],
    },
    andamento: {
      title: 'Em andamento',
      short: 'Em andamento',
      group: 'status',
      statuses: ['andamento'],
    },
    atrasados: {
      title: 'Atrasados',
      short: 'Atrasados',
      group: 'status',
      statuses: ['atrasado'],
    },
    agendados: {
      title: 'Aguardando liberação',
      short: 'Aguardando liberação',
      group: 'status',
      statuses: ['agendado'],
    },
    concluidos: {
      title: 'Concluídos',
      short: 'Concluídos',
      group: 'status',
      statuses: ['concluido'],
    },
    encerrados: {
      title: 'Cancelados',
      short: 'Cancelados',
      group: 'status',
      statuses: ['cancelado'],
    },
    todos: { title: 'Todos os processos', short: 'Todos', group: 'status' },
  }
  const groups = [
    {
      id: 'work',
      label: 'Acesso rápido',
      keys: ['fila', 'responsabilidade', 'outrosSetores'],
    },
    {
      id: 'status',
      label: 'Por situação',
      keys: [
        'ativos',
        'andamento',
        'atrasados',
        'agendados',
        'concluidos',
        'encerrados',
        'todos',
      ],
    },
  ]
  const params = new URLSearchParams(window.location.search)
  const variant = Object.hasOwn(titles, params.get('ideia'))
    ? params.get('ideia')
    : 'A'
  document.body.dataset.processOrganization = variant
  const initialView = Object.hasOwn(views, params.get('visao'))
    ? params.get('visao')
    : 'todos'
  const state = {
    q: '',
    view: initialView,
    sector: 'fin',
    type: '',
    responsible: '',
    status: [],
    month: '',
    ordering: ['fila', 'outrosSetores'].includes(initialView)
      ? 'urgency'
      : 'recent',
    orderChanged: false,
    central: variant === 'D' && !params.has('visao'),
    notes: {},
  }
  const options = (items, value) =>
    items
      .map(
        ([key, label]) =>
          `<option value="${esc(key)}" ${key === value ? 'selected' : ''}>${esc(label)}</option>`,
      )
      .join('')
  const isTerminal = (process) =>
    ['concluido', 'cancelado'].includes(process.status)
  const executable = (process) =>
    !isTerminal(process) &&
    !process.analysis.waiting &&
    ['andamento', 'atrasado'].includes(process.status)
  const inQueue = (process, sector) =>
    executable(process) && process.analysis.pendingSectors.includes(sector)
  const typeOf = (process) =>
    catalog.types.find((type) => type.id === process.tipo)
  const statusBadge = (process) =>
    `<span class="org-status status-${process.status}">${esc(catalog.statuses[process.status])}</span>`
  const typeBadge = (process) =>
    `<span class="org-type" title="${esc(typeOf(process)?.nome)}">${esc(typeOf(process)?.sigla || process.tipo)}</span>`
  const date = (value) =>
    value
      ? new Intl.DateTimeFormat('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          timeZone: 'America/Sao_Paulo',
        }).format(new Date(value.length === 10 ? value + 'T12:00:00Z' : value))
      : 'Sem prazo'
  const sectors = (keys) =>
    keys.map((key) => catalog.sectors[key]).join(' e ') || '—'
  const nextLabel = (process) =>
    isTerminal(process)
      ? 'Processo encerrado'
      : process.analysis.waiting
        ? `Liberação em ${date(process.analysis.releaseDate)}`
        : process.nextTask?.text || 'Consultar próximas ações na ficha'
  const viewDescription = (key) =>
    key === 'fila'
      ? `Ações liberadas para ${catalog.sectors[state.sector]}`
      : key === 'responsabilidade'
        ? `Processos de ${catalog.sectors[state.responsible || state.sector]}, incluindo os que aguardam liberação`
        : key === 'outrosSetores'
          ? `Em execução, sem pendências de ${catalog.sectors[state.sector]}`
          : key === 'ativos'
            ? 'Em andamento, aguardando liberação e atrasados'
            : key === 'agendados'
              ? 'Processos aguardando a liberação da próxima etapa'
              : key === 'todos'
                ? 'Todos os processos autorizados'
                : `Processos ${views[key].title.toLocaleLowerCase('pt-BR')}`
  function select() {
    const query = normalize(state.q)
    const statuses = state.status.length
      ? state.status
      : views[state.view].statuses
    return processes
      .filter((process) => {
        if (state.view === 'fila' && !inQueue(process, state.sector))
          return false
        if (
          state.view === 'responsabilidade' &&
          !process.responsibleSectors.includes(
            state.responsible || state.sector,
          )
        )
          return false
        if (
          state.view === 'outrosSetores' &&
          (!executable(process) ||
            process.analysis.pendingSectors.includes(state.sector))
        )
          return false
        if (statuses?.length && !statuses.includes(process.status)) return false
        if (state.type && process.tipo !== state.type) return false
        if (
          state.responsible &&
          !process.responsibleSectors.includes(state.responsible)
        )
          return false
        if (state.month && !process.criadoEm.startsWith(state.month))
          return false
        if (
          query &&
          !normalize(
            [
              process.empresa,
              process.companyReference?.name,
              process.cnpj,
              process.codigo,
            ].join(' '),
          ).includes(query)
        )
          return false
        return true
      })
      .sort((a, b) =>
        state.ordering === 'recent'
          ? b.atualizadoEm.localeCompare(a.atualizadoEm) ||
            b.codigo.localeCompare(a.codigo)
          : Number(b.status === 'atrasado') - Number(a.status === 'atrasado') ||
            (a.prazo || '9999').localeCompare(b.prazo || '9999') ||
            a.codigo.localeCompare(b.codigo),
      )
  }
  const viewCount = (key) =>
    processes.filter((process) => {
      if (key === 'fila') return inQueue(process, state.sector)
      if (key === 'responsabilidade')
        return process.responsibleSectors.includes(state.sector)
      if (key === 'outrosSetores')
        return (
          executable(process) &&
          !process.analysis.pendingSectors.includes(state.sector)
        )
      return (
        !views[key].statuses || views[key].statuses.includes(process.status)
      )
    }).length
  const viewButton = (key, style = '') =>
    `<button type="button" class="org-view ${style}" data-view="${key}" aria-current="${key === state.view ? 'page' : 'false'}">${style === 'org-side-view' ? `<i class="org-side-dot" data-view-tone="${key}" aria-hidden="true"></i><span>${esc(views[key].short)}</span><small class="org-side-count" data-view-count="${key}">${viewCount(key)}</small>` : esc(views[key].short)}</button>`
  const accessGroups = (style = '') =>
    groups
      .map(
        (group) =>
          `<section class="org-access-group"><h2>${group.label}</h2><div>${group.keys.map((key) => viewButton(key, style)).join('')}</div></section>`,
      )
      .join('')
  const tiles = () =>
    groups
      .map(
        (group) =>
          `<section class="panel org-access-tiles-group"><div class="panel-head"><h2>${group.label}</h2></div><div>${group.keys.map((key) => `<button type="button" class="org-view-tile" data-view="${key}"><span class="org-view-tile-icon">${Review.icon(group.id === 'work' ? 'users' : 'list')}</span><span><strong>${esc(views[key].title)}</strong><small>${esc(viewDescription(key))}</small></span>${Review.icon('arrow-right')}</button>`).join('')}</div></section>`,
      )
      .join('')
  function access() {
    if (variant === 'A') return ''
    if (variant === 'B')
      return `<nav class="org-access-tabs" aria-label="Listas de processos">${accessGroups('org-tab-view')}</nav>`
    if (variant === 'C')
      return `<nav class="org-access-picker" aria-label="Listas de processos"><label class="field"><span>Lista de processos</span><select id="org-view-select" aria-label="Lista de processos">${groups
        .map(
          (group) =>
            `<optgroup label="${group.label}">${options(
              group.keys.map((key) => [key, views[key].title]),
              state.view,
            )}</optgroup>`,
        )
        .join(
          '',
        )}</select></label><span class="org-picker-context" id="org-picker-context"></span></nav>`
    return `<div id="org-central" class="org-access-central">${tiles()}</div><nav id="org-central-path" class="org-access-path" aria-label="Caminho da lista" hidden><button class="button small" type="button" id="org-back-central">${Review.icon('arrow-left')} Central de listas</button><span id="org-current-path"></span><button class="button small" type="button" id="org-switch-view">Trocar lista ${Review.icon('chevron')}</button></nav>`
  }
  function toolbar() {
    const sectorField =
      variant === 'A'
        ? ''
        : `<label class="field"><span>Setor de referência</span><select id="org-sector">${options(Object.entries(catalog.sectors), state.sector)}</select></label>`

    return `<section class="panel org-filter-panel" aria-label="Filtros de processos"><div class="org-toolbar"><label class="field"><span>Buscar processos</span><input type="search" id="org-search" placeholder="Empresa, CNPJ ou código" maxlength="200"></label><label class="field"><span>Tipo de processo</span><select id="org-type">${options([['', 'Todos os tipos'], ...catalog.types.map((type) => [type.id, type.nome])], state.type)}</select></label>${sectorField}</div><div class="org-toolbar-secondary"><span id="org-scope-note" class="muted"></span><button class="button small" id="org-more" type="button" aria-expanded="false" aria-controls="org-advanced">${Review.icon('filter')} Mais filtros</button></div><div id="org-advanced" class="org-advanced" hidden><div id="org-preset-description" class="org-preset-description"><p>A situação desta consulta segue a lista selecionada. Para combinar situações, use Todos os processos.</p><button type="button" class="button small" data-custom-status>Personalizar situações</button></div><fieldset class="org-status-filters" id="org-status-filters"><legend>Situações <span>Sem seleção, todas são incluídas</span></legend>${Object.entries(
      catalog.statuses,
    )
      .map(
        ([key, label]) =>
          `<label><input type="checkbox" value="${key}" data-status> ${label}</label>`,
      )
      .join(
        '',
      )}</fieldset><div class="org-extra-fields"><label class="field"><span>Setor responsável</span><select id="org-responsible">${options([['', 'Qualquer responsável'], ...Object.entries(catalog.sectors)], '')}</select></label><label class="field"><span>Mês de abertura</span><input type="month" id="org-month" min="2000-01" max="2099-12"></label></div></div></section><div class="org-result-tools"><div><strong id="org-count"></strong><span id="org-filter-description" class="muted"></span></div><div class="org-result-actions"><label>Ordenação<select id="org-order">${options(
      [
        ['urgency', 'Mais urgentes'],
        ['recent', 'Mais recentes'],
      ],
      state.ordering,
    )}</select></label><button class="button ghost small" id="org-clear" type="button">Limpar filtros</button></div></div>`
  }
  const root = Review.mount({
    id: `P16 · ${variant}`,
    title: 'Processos',
    module: 'Processos',
    nav: [
      { label: 'Início', icon: 'home', href: 'dashboard-processos.html' },
      {
        label: 'Processos',
        icon: 'list',
        href: `organizacao-processos-ideia.html?ideia=${variant}`,
        active: true,
      },
      {
        label: 'Movimentações',
        icon: 'list',
        href: 'movimentacoes-processos.html',
      },
      { label: 'Avisos por e-mail', icon: 'file', href: 'estados.html' },
    ],
    actions: `<a class="button" href="organizacao-processos.html">Alternativas anteriores</a>${catalog.permissions.create ? '<a class="button primary" href="processos.html">Novo processo</a>' : ''}`,
    before: '../../docs/auditoria-ux/evidencias/11-processos-lista.png',
    notes: [
      `Ideia ${variant}: ${titles[variant]}. A comparação trata apenas de como acessar as listas existentes. Todas usam a mesma tabela clássica, os mesmos 18 processos, filtros e ficha.`,
      'Acesso rápido reúne Minha fila, Responsabilidade e Com outros setores. Por situação preserva Abertos, Em andamento, Atrasados, Aguardando liberação, Concluídos, Cancelados e Todos.',
      'Minha fila continua exibindo ações liberadas ao setor; Responsabilidade também inclui aguardando liberação. Esses recortes não são substituídos por novos estados ou regras.',
      'Os filtros de busca, tipo, setor responsável, mês e ordenação seguem disponíveis. Limpar filtros preserva a lista escolhida; abrir e fechar uma ficha mantém o contexto.',
      'A ficha de execução e suas permissões serão reutilizadas. Esta prévia permite consulta e anotações locais, sem executar fluxos financeiros ou enviar dados ao sistema.',
    ],
    content: `<div class="org-workspace org-variant-${variant}"><div id="org-access">${access()}</div><div id="org-list-workspace">${toolbar()}<div id="org-results"></div></div></div>`,
  })
  function row(process, context = 'catalog') {
    const companyContext = context === 'company'
    const title = companyContext
      ? typeOf(process)?.nome || process.tipo
      : process.empresa
    const metadata = companyContext
      ? process.codigo
      : `${process.codigo} · ${typeOf(process)?.nome || process.tipo}`
    return `<tr data-open="${process.id}" aria-label="Consultar processo ${esc(process.codigo)} de ${esc(process.empresa)}"><td><strong>${esc(title)}</strong><small>${esc(metadata)}</small></td><td><span class="org-next-text">${esc(nextLabel(process))}</span><small>${isTerminal(process) ? '' : esc(sectors(process.responsibleSectors))}</small></td><td class="${process.status === 'atrasado' ? 'org-late' : ''}">${date(process.prazo)}</td><td>${statusBadge(process)}</td><td aria-hidden="true">›</td></tr>`
  }
  const table = (items) =>
    `<section class="panel"><div class="table-wrap"><table class="org-table"><thead><tr><th>Empresa e processo</th><th>Próxima ação / acompanhamento</th><th>Prazo</th><th>Situação</th><th></th></tr></thead><tbody>${items.map(row).join('')}</tbody></table></div></section>`
  function detail(process, full = false, mode = 'inline') {
    const next = process.nextTask
    return `<div class="org-detail-content"><div class="org-detail-title"><div>${typeBadge(process)}<h2>${esc(process.empresa)}</h2><span>${esc(process.codigo)}</span></div>${statusBadge(process)}</div><section class="org-next-action"><span>${isTerminal(process) ? 'Acompanhamento' : process.analysis.waiting ? 'Aguardando liberação' : next ? `Próxima ação · ${esc(catalog.sectors[next.sector])}` : 'Consultar ficha'}</span><h3>${esc(nextLabel(process))}</h3>${next && !isTerminal(process) ? `<p>${esc(next.stageTitle)}${process.pendingTaskCount > 1 ? ` · ${process.pendingTaskCount} tarefas pendentes no processo` : ''}</p>` : ''}</section><dl class="org-detail-data"><div><dt>Prazo do processo</dt><dd class="${process.status === 'atrasado' ? 'org-late' : ''}">${date(process.prazo)}</dd></div><div><dt>Responsabilidade</dt><dd>${esc(sectors(process.responsibleSectors))}</dd></div><div><dt>Abertura</dt><dd>${date(process.criadoEm)}</dd></div><div><dt>Andamento</dt><dd>${process.analysis.completedTasks} de ${process.analysis.totalTasks} tarefas</dd></div><div class="org-span"><dt>Empresa vinculada</dt><dd>${process.companyId ? `${esc(process.companyReference?.name || process.empresa)} · código ${esc(process.companyReference?.code || 'não informado')}` : 'Sem vínculo cadastral · processo preservado'}</dd></div></dl>${full ? `<section class="org-detail-section"><h3>Fluxo previsto para este tipo</h3><ol class="org-stage-list">${(typeOf(process)?.etapas || []).map((stage, index) => `<li class="${index === process.analysis.currentStage ? 'is-current' : ''}"><span>${index + 1}</span><div>${esc(stage.t)}${index === process.analysis.currentStage ? '<small>Etapa atual informada na coleção</small>' : ''}</div></li>`).join('')}</ol></section>` : `<button class="button" type="button" data-open="${process.id}">Consultar ficha do processo ${Review.icon('arrow-right')}</button>`}<section class="org-detail-section"><h3>Anotações</h3><div class="org-notes" data-notes-for="${process.id}">${noteList(process.id)}</div>${process.permissions.note ? `<form class="org-note-form" data-note-process="${process.id}"><label class="field" for="org-note-${mode}-${process.id}"><span>Adicionar anotação</span><textarea id="org-note-${mode}-${process.id}" name="note" rows="3" maxlength="1000" required aria-describedby="org-note-error-${mode}-${process.id}"></textarea><small class="org-field-error" id="org-note-error-${mode}-${process.id}" role="status"></small></label><button class="button small" type="submit">Adicionar anotação</button></form>` : '<p class="muted">Seu acesso permite somente consultar este processo.</p>'}</section></div>`
  }
  function noteList(id) {
    return (
      (state.notes[id] || [])
        .map(
          (note) =>
            `<div class="org-note"><strong>Mariana Costa</strong><p>${esc(note)}</p></div>`,
        )
        .join('') ||
      '<p class="muted org-no-notes">Nenhuma anotação nesta prévia.</p>'
    )
  }
  function wireDetails(container) {
    container.querySelectorAll('[data-note-process]').forEach((form) =>
      form.addEventListener('submit', (event) => {
        event.preventDefault()
        const process = processes.find(
          (item) => item.id === form.dataset.noteProcess,
        )
        if (!process?.permissions.note) return
        const field = form.elements.namedItem('note'),
          value = field.value.trim(),
          error = form.querySelector('.org-field-error')
        if (!value) {
          error.textContent = 'Escreva a anotação antes de adicionar.'
          field.focus()
          return
        }
        ;(state.notes[process.id] ||= []).push(value)
        form.parentElement.querySelector('[data-notes-for]').innerHTML =
          noteList(process.id)
        field.value = ''
        error.textContent = ''
        Review.toast('Anotação adicionada somente nesta prévia.')
      }),
    )
  }
  function openProcess(id) {
    const process = processes.find((item) => item.id === id)
    if (!process?.permissions.read) return
    const previous = document.activeElement
    const dialog = document.createElement('dialog')
    dialog.className = 'dialog org-process-dialog'
    dialog.setAttribute('aria-labelledby', 'org-dialog-title')
    dialog.innerHTML = `<div class="dialog-head"><h2 id="org-dialog-title">Ficha do processo</h2><button class="icon-button" type="button" data-close aria-label="Fechar ficha">${Review.icon('x')}</button></div><div class="dialog-body">${detail(process, true, 'modal')}</div><div class="dialog-footer"><button class="button" type="button" data-close>Voltar à consulta</button></div>`
    document.body.append(dialog)
    const close = () => {
      dialog.close()
      dialog.remove()
      previous?.focus()
    }
    dialog
      .querySelectorAll('[data-close]')
      .forEach((button) => button.addEventListener('click', close))
    dialog.addEventListener('cancel', (event) => {
      event.preventDefault()
      close()
    })
    wireDetails(dialog)
    dialog.showModal()
  }

  function wireViewButtons(container) {
    container
      .querySelectorAll('[data-view]')
      .forEach((button) =>
        button.addEventListener('click', () =>
          activateView(button.dataset.view),
        ),
      )
  }
  function activateView(key) {
    if (!Object.hasOwn(views, key)) return
    state.view = key
    state.status = []
    state.central = false
    if (!state.orderChanged)
      state.ordering = ['fila', 'outrosSetores'].includes(key)
        ? 'urgency'
        : 'recent'
    document.getElementById('org-order').value = state.ordering
    root
      .querySelectorAll('[data-status]')
      .forEach((input) => (input.checked = false))
    renderResults()
    syncAccess()
  }
  function syncAccess() {
    document
      .querySelectorAll('[data-view-count]')
      .forEach(
        (counter) =>
          (counter.textContent = viewCount(counter.dataset.viewCount)),
      )
    const activeGroup = document.querySelector(
      '[data-org-group="' + views[state.view].group + '"]',
    )
    if (activeGroup) activeGroup.open = true

    document.querySelector('.page-heading h1').textContent = state.central
      ? 'Central de listas'
      : views[state.view].title
    const breadcrumb = document.querySelector('.breadcrumb span:last-child')
    if (breadcrumb)
      breadcrumb.textContent = state.central
        ? 'Central de listas'
        : views[state.view].title
    document.querySelector('.review-title').textContent = titles[variant]
    document
      .querySelectorAll('[data-view]')
      .forEach((button) =>
        button.setAttribute(
          'aria-current',
          !state.central && button.dataset.view === state.view
            ? 'page'
            : 'false',
        ),
      )
    const selected = document.getElementById('org-view-select')
    if (selected) selected.value = state.view
    const pickerContext = document.getElementById('org-picker-context')
    if (pickerContext)
      pickerContext.textContent = groups.find(
        (group) => group.id === views[state.view].group,
      ).label
    const central = document.getElementById('org-central')
    if (central) central.hidden = !state.central
    const centralPath = document.getElementById('org-central-path')
    if (centralPath) centralPath.hidden = state.central
    const currentPath = document.getElementById('org-current-path')
    if (currentPath)
      currentPath.textContent = `${groups.find((group) => group.id === views[state.view].group).label} / ${views[state.view].title}`
    document.getElementById('org-list-workspace').hidden = state.central
    document.getElementById('org-preset-description').hidden =
      state.view === 'todos'
    document.getElementById('org-status-filters').hidden =
      state.view !== 'todos'
    const url = new URL(window.location.href)
    url.searchParams.set('ideia', variant)
    if (state.central) url.searchParams.delete('visao')
    else url.searchParams.set('visao', state.view)
    window.history.replaceState(null, '', url)
  }
  function renderResults() {
    const items = select()
    document.getElementById('org-count').textContent =
      `${items.length} ${items.length === 1 ? 'processo encontrado' : 'processos encontrados'}`
    document.getElementById('org-scope-note').textContent = viewDescription(
      state.view,
    )
    document.getElementById('org-filter-description').textContent = state.status
      .length
      ? 'Situações personalizadas'
      : ''
    const target = document.getElementById('org-results')
    target.innerHTML = items.length
      ? table(items)
      : '<section class="panel org-empty"><h2>Nenhum processo neste recorte</h2><p>Ajuste os filtros ou limpe a consulta.</p></section>'
    Review.rows(target, {
      selector: 'tr[data-open]',
      onOpen: (row) => openProcess(row.dataset.open),
    })
  }
  if (variant === 'A') {
    const navigation = document.querySelector('.sidebar-body>nav')
    navigation.innerHTML = `<a class="nav-item" href="dashboard-processos.html">${Review.icon('home')} Início</a><section class="org-sector-context"><label class="field"><span>Meu departamento</span><select id="org-sector" aria-label="Meu departamento">${options(Object.entries(catalog.sectors), state.sector)}</select></label></section><p class="org-nav-caption">Listagens</p>${groups.map((group) => `<details class="org-side-group" data-org-group="${group.id}" open><summary>${Review.icon(group.id === 'work' ? 'users' : 'list')}<span>${group.label}</span>${Review.icon('chevron')}</summary><div>${group.keys.map((key) => viewButton(key, 'org-side-view')).join('')}</div></details>`).join('')}<a class="nav-item" href="movimentacoes-processos.html">${Review.icon('list')} Movimentações</a><a class="nav-item" href="estados.html">${Review.icon('file')} Avisos por e-mail</a>`

    wireViewButtons(navigation)
  }
  wireViewButtons(root.querySelector('#org-access'))
  document
    .getElementById('org-view-select')
    ?.addEventListener('change', (event) => activateView(event.target.value))
  document.getElementById('org-back-central')?.addEventListener('click', () => {
    state.central = true
    syncAccess()
    document.querySelector('#org-central [data-view]')?.focus()
  })
  document.getElementById('org-switch-view')?.addEventListener('click', () => {
    const previous = document.activeElement,
      dialog = document.createElement('dialog')
    dialog.className = 'dialog org-view-dialog'
    dialog.setAttribute('aria-labelledby', 'org-switch-title')
    dialog.innerHTML = `<div class="dialog-head"><h2 id="org-switch-title">Trocar lista de processos</h2><button class="icon-button" type="button" data-close aria-label="Fechar seleção">${Review.icon('x')}</button></div><div class="dialog-body org-access-central">${tiles()}</div>`
    document.body.append(dialog)
    const close = () => {
      dialog.close()
      dialog.remove()
      previous?.focus()
    }
    dialog.querySelector('[data-close]').addEventListener('click', close)
    dialog.addEventListener('cancel', (event) => {
      event.preventDefault()
      close()
    })
    dialog.querySelectorAll('[data-view]').forEach((button) =>
      button.addEventListener('click', () => {
        close()
        activateView(button.dataset.view)
      }),
    )
    dialog.showModal()
  })
  document.getElementById('org-search').addEventListener('input', (event) => {
    state.q = event.target.value
    renderResults()
  })
  for (const [id, key] of [
    ['sector', 'sector'],
    ['type', 'type'],
    ['responsible', 'responsible'],
    ['month', 'month'],
    ['order', 'ordering'],
  ])
    document.getElementById('org-' + id).addEventListener('change', (event) => {
      state[key] = event.target.value
      if (id === 'order') state.orderChanged = true
      renderResults()
      syncAccess()
    })
  root.querySelectorAll('[data-status]').forEach((input) =>
    input.addEventListener('change', () => {
      state.status = [...root.querySelectorAll('[data-status]:checked')].map(
        (item) => item.value,
      )
      state.view = 'todos'
      renderResults()
      syncAccess()
    }),
  )
  root.querySelector('[data-custom-status]').addEventListener('click', () => {
    activateView('todos')
    root.querySelector('[data-status]')?.focus()
  })
  document.getElementById('org-more').addEventListener('click', (event) => {
    const button = event.currentTarget,
      advanced = document.getElementById('org-advanced')
    advanced.hidden = !advanced.hidden
    button.setAttribute('aria-expanded', String(!advanced.hidden))
  })
  document.getElementById('org-clear').addEventListener('click', () => {
    Object.assign(state, {
      q: '',
      type: '',
      responsible: '',
      status: [],
      month: '',
    })
    for (const id of ['search', 'type', 'responsible', 'month'])
      document.getElementById('org-' + id).value = ''
    root
      .querySelectorAll('[data-status]')
      .forEach((input) => (input.checked = false))
    renderResults()
    syncAccess()
  })
  renderResults()
  syncAccess()
})()
