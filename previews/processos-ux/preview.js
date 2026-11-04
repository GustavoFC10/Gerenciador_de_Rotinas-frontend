/* Isolated UX prototype. Synthetic snapshots only; no API, persistence or clock engine. */
/* global document, setTimeout, clearTimeout */
;(() => {
  const $ = (selector) => document.querySelector(selector)
  const escape = (value) =>
    String(value).replace(
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
  const sectors = { com: 'Diretoria', fin: 'Financeiro', reg: 'Regularidade' }
  const types = {
    abertura: 'Abertura de empresa',
    mei: 'MEI',
    outro: 'Vindo de outro escritório',
    alteracao: 'Alteração contratual',
    inatividade: 'Paralisação',
    inativa: 'Inatividade',
    reativacao: 'Reativação',
    baixa: 'Baixa empresarial',
    saida: 'Saída de cliente',
    exclusao: 'Exclusão de cliente',
  }
  const statuses = {
    andamento: 'Em andamento',
    agendado: 'Aguardando liberação',
    atrasado: 'Atrasado',
    concluido: 'Concluído',
    cancelado: 'Cancelado',
  }
  const views = {
    ativos: {
      title: 'Abertos',
      description: 'Processos em andamento, atrasados e aguardando liberação.',
      statuses: ['andamento', 'agendado', 'atrasado'],
      color: '#eab308',
    },
    andamento: {
      title: 'Em andamento',
      description: 'Processos em execução dentro do prazo.',
      statuses: ['andamento'],
      color: '#eab308',
    },
    atrasados: {
      title: 'Atrasados',
      description: 'Processos com status de atraso informado pelo servidor.',
      statuses: ['atrasado'],
      color: '#ef4444',
    },
    agendados: {
      title: 'Aguardando liberação',
      description: 'Processos abertos aguardando a próxima liberação.',
      statuses: ['agendado'],
      color: '#91b29c',
    },
    concluidos: {
      title: 'Concluídos',
      description: 'Processos concluídos, com o histórico preservado.',
      statuses: ['concluido'],
      color: '#10b981',
    },
    encerrados: {
      title: 'Cancelados',
      description: 'Processos cancelados, com o histórico preservado.',
      statuses: ['cancelado'],
      color: '#94a3b8',
    },
    todos: {
      title: 'Todos os processos',
      description:
        'Consulte todas as situações ou combine os filtros adicionais.',
      statuses: [],
      color: '#2563eb',
    },
    fila: {
      title: 'Minha fila',
      description: 'Ações liberadas para execução no seu departamento.',
      statuses: ['andamento', 'atrasado'],
      color: '#2563eb',
    },
  }
  const records = [
    {
      id: 'demo-a',
      company: 'Aurora Comércio',
      type: 'abertura',
      code: 'ABE-2611-001',
      status: 'andamento',
      sectors: ['fin'],
      stage: 'Dados do cliente e registro',
      progress: 33,
      deadline: '12/11/2026',
      month: '2026-11',
      queue: ['fin'],
    },
    {
      id: 'demo-b',
      company: 'Alameda Serviços',
      type: 'mei',
      code: 'MEI-2611-002',
      status: 'agendado',
      sectors: ['fin'],
      stage: 'Reunião de acompanhamento',
      progress: 83,
      deadline: '18/02/2027',
      month: '2026-11',
      queue: [],
      release: '18/02/2027',
    },
    {
      id: 'demo-c',
      company: 'Horizonte Consultoria',
      type: 'alteracao',
      code: 'ALT-2610-003',
      status: 'atrasado',
      sectors: ['fin', 'reg'],
      stage: 'Registro e entrega ao cliente',
      progress: 50,
      deadline: '26/10/2026',
      month: '2026-10',
      queue: ['fin', 'reg'],
    },
    {
      id: 'demo-d',
      company: 'Pontal Tecnologia',
      type: 'reativacao',
      code: 'REA-2611-004',
      status: 'andamento',
      sectors: ['com', 'fin'],
      stage: 'Definições da Diretoria',
      progress: 16,
      deadline: '16/11/2026',
      month: '2026-11',
      queue: ['com'],
    },
    {
      id: 'demo-e',
      company: 'Nascente Alimentos',
      type: 'abertura',
      code: 'ABE-2610-005',
      status: 'agendado',
      sectors: ['fin'],
      stage: 'Reunião de acompanhamento',
      progress: 83,
      deadline: '10/02/2027',
      month: '2026-10',
      queue: [],
      release: '10/02/2027',
    },
    {
      id: 'demo-f',
      company: 'Estação Design',
      type: 'abertura',
      code: 'ABE-2609-006',
      status: 'concluido',
      sectors: ['com', 'fin'],
      stage: 'Processo concluído',
      progress: 100,
      deadline: '20/10/2026',
      month: '2026-09',
      queue: [],
    },
    {
      id: 'demo-g',
      company: 'Vale Serviços',
      type: 'baixa',
      code: 'BAI-2610-007',
      status: 'concluido',
      sectors: ['fin', 'reg'],
      stage: 'Processo concluído',
      progress: 100,
      deadline: '29/10/2026',
      month: '2026-10',
      queue: [],
    },
    {
      id: 'demo-h',
      company: 'Orla Comércio',
      type: 'saida',
      code: 'SAI-2610-008',
      status: 'cancelado',
      sectors: ['com'],
      stage: 'Cancelamento registrado',
      progress: 25,
      deadline: '30/10/2026',
      month: '2026-10',
      queue: [],
    },
  ]
  const state = {
    view: 'ativos',
    q: '',
    type: '',
    sector: '',
    month: '',
    customStatuses: [],
    page: 1,
    pageSize: 5,
    persona: 'com',
    scenario: 'normal',
  }
  records.forEach((record, index) => {
    record.cnpj = `00.000.000/0000-${String(index + 1).padStart(2, '0')}`
    record.protocol = `DEMO-${String(index + 1).padStart(3, '0')}`
  })
  const typePaths = {
    abertura:
      '<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M9 7h.01M15 7h.01M9 11h.01M15 11h.01M10 21v-3h4v3"/>',
    mei: '<path d="M7 17 17 7M8 7h9v9"/>',
    outro:
      '<circle cx="9" cy="7" r="4"/><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M22 21v-2a4 4 0 0 0-3-4"/>',
    alteracao:
      '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6M10 17l5-5 2 2-5 5h-2z"/>',
    inatividade: '<circle cx="12" cy="12" r="9"/><path d="M10 9v6M14 9v6"/>',
    inativa: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
    reativacao:
      '<path d="M21 12a9 9 0 0 1-15.4 6.4L3 16M3 12a9 9 0 0 1 15.4-6.4L21 8M21 3v5h-5M3 21v-5h5"/>',
    baixa: '<path d="m21 8-9-5-9 5v8l9 5 9-5zM3 8l9 5 9-5M12 13v8"/>',
    saida:
      '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
    exclusao:
      '<circle cx="9" cy="7" r="4"/><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m13-11 5 5m0-5-5 5"/>',
  }
  const typeIcon = (type) =>
    `<svg viewBox="0 0 24 24" aria-hidden="true">${typePaths[type] || typePaths.abertura}</svg>`
  let toastTimer
  let refreshTimer
  function notify(message) {
    clearTimeout(toastTimer)
    $('#toast').textContent = message
    $('#toast').hidden = false
    toastTimer = setTimeout(() => {
      $('#toast').hidden = true
    }, 4500)
  }
  function matchesView(record) {
    const selection = state.customStatuses.length
      ? state.customStatuses
      : views[state.view].statuses
    return (
      (!selection.length || selection.includes(record.status)) &&
      (state.view !== 'fila' || record.queue.includes(state.persona))
    )
  }
  function filteredRecords() {
    const q = state.q.toLocaleLowerCase('pt-BR').trim()
    return records.filter(
      (record) =>
        matchesView(record) &&
        (!q ||
          `${record.company} ${record.code} ${record.cnpj} ${record.protocol}`
            .toLocaleLowerCase('pt-BR')
            .includes(q)) &&
        (!state.type || record.type === state.type) &&
        (!state.sector || record.sectors.includes(state.sector)) &&
        (!state.month || record.month === state.month),
    )
  }
  function activeFilters() {
    const items = []
    if (state.q.trim())
      items.push({ key: 'q', label: `Busca: ${state.q.trim()}` })
    if (state.type) items.push({ key: 'type', label: types[state.type] })
    if (state.sector)
      items.push({
        key: 'sector',
        label: `Responsável: ${sectors[state.sector]}`,
      })
    if (state.month) {
      const [year, month] = state.month.split('-')
      items.push({ key: 'month', label: `Abertura: ${month}/${year}` })
    }
    for (const status of state.customStatuses)
      items.push({ key: `status:${status}`, label: statuses[status] })
    return items
  }
  function renderNavigation() {
    $('#view-nav').innerHTML = Object.entries(views)
      .filter(([key]) => key !== 'fila')
      .map(([key, view]) => {
        const count = records.filter(
          (record) =>
            !view.statuses.length || view.statuses.includes(record.status),
        ).length
        return `<button class="view-link" data-view="${key}" ${state.view === key ? 'aria-current="page"' : ''}><span class="status-dot" style="background:${view.color}" aria-hidden="true"></span><span class="view-name">${view.title}</span><span class="counter" aria-label="${count} na organização">${count}</span></button>`
      })
      .join('')
    $('[data-view="fila"]').setAttribute(
      'aria-current',
      state.view === 'fila' ? 'page' : 'false',
    )
  }
  function renderFilters() {
    const chips = activeFilters()
    $('#active-filters').hidden = !chips.length
    $('#filter-chips').innerHTML = chips
      .map(
        (chip) =>
          `<button class="filter-chip" data-remove="${escape(chip.key)}" aria-label="Remover filtro ${escape(chip.label)}">${escape(chip.label)} <span aria-hidden="true">×</span></button>`,
      )
      .join('')
    const extra = Number(!!state.month) + state.customStatuses.length
    $('#extra-count').hidden = extra === 0
    $('#extra-count').textContent = String(extra)
    $('#base-status-hint').hidden = state.view === 'todos'
    $('#custom-statuses').hidden = state.view !== 'todos'
    for (const input of document.querySelectorAll('[name="custom-status"]'))
      input.checked = state.customStatuses.includes(input.value)
    $('#search').value = state.q
    $('#type').value = state.type
    $('#sector').value = state.sector
    $('#month').value = state.month
  }
  function renderRows(data) {
    return data
      .map(
        (record) =>
          `<button class="process-row" data-record="${escape(record.id)}" aria-label="Abrir processo de ${escape(record.company)}"><span><strong class="process-company">${escape(record.company)}</strong><span class="type-tag" data-type="${record.type}">${typeIcon(record.type)}${escape(types[record.type])}</span><span class="process-code">${escape(record.code)}</span></span><span class="stage-cell"><span class="stage-name">${escape(record.stage)}</span><span class="stage-meta"><span class="progress-track" aria-hidden="true"><span style="width:${record.progress}%"></span></span>${record.progress}% · ${record.sectors.map((key) => sectors[key]).join(' / ')}</span></span><span class="status-cell"><span class="status-badge" data-status="${record.status}"><span class="status-dot" aria-hidden="true"></span>${statuses[record.status]}</span></span><span class="due ${record.status === 'atrasado' ? 'late' : ''}"><span class="due-label">Prazo: </span>${record.deadline}</span></button>`,
      )
      .join('')
  }
  function render() {
    renderNavigation()
    renderFilters()
    const view = views[state.view]
    $('#view-title').textContent = state.customStatuses.length
      ? 'Todos os processos · seleção personalizada'
      : view.title
    $('#breadcrumb-view').textContent = view.title
    $('#view-description').textContent = view.description
    $('#department-label').textContent = sectors[state.persona]
    $('#new-process').hidden = state.persona !== 'com'
    const emailNav = document.querySelector(
      '.sidebar a[href="recipients.html"]',
    )
    emailNav.hidden = state.persona !== 'com'
    const results = state.scenario === 'empty' ? [] : filteredRecords()
    const pageCount = Math.max(1, Math.ceil(results.length / state.pageSize))
    state.page = Math.min(state.page, pageCount)
    const start = (state.page - 1) * state.pageSize
    const rows = results.slice(start, start + state.pageSize)
    const loading = state.scenario === 'loading'
    const failed = state.scenario === 'error'
    $('#result-count').textContent = failed
      ? 'Não foi possível consultar os processos'
      : loading
        ? 'Consultando processos…'
        : `${results.length} ${results.length === 1 ? 'processo nesta lista' : 'processos nesta lista'}`
    $('#query-state').textContent = failed
      ? 'Tente novamente'
      : loading
        ? 'Aguarde'
        : activeFilters().length
          ? 'Com filtros adicionais'
          : 'Sem filtros adicionais'
    if (loading)
      $('#records').innerHTML =
        '<div class="empty-state" role="status"><div class="loading-bar"></div><div class="loading-bar"></div><p>Carregando processos…</p></div>'
    else if (failed)
      $('#records').innerHTML =
        '<div class="empty-state error-state" role="alert"><h2>Não foi possível atualizar a lista</h2><p>Seus filtros foram mantidos. A falha não significa que não existam processos.</p><button class="button secondary" data-retry>Tentar novamente</button></div>'
    else if (!rows.length)
      $('#records').innerHTML =
        `<div class="empty-state"><h2>Nenhum processo nesta consulta</h2><p>${activeFilters().length ? 'Ajuste os filtros ou volte ao recorte da lista.' : 'Os processos desta situação aparecerão aqui.'}</p>${activeFilters().length ? '<button class="button secondary" data-clear>Limpar filtros adicionais</button>' : ''}</div>`
    else $('#records').innerHTML = renderRows(rows)
    $('.process-list').setAttribute('aria-busy', String(loading))
    $('#range').textContent =
      failed || loading
        ? 'Aguardando resultado da consulta'
        : results.length
          ? `Exibindo ${start + 1}–${start + rows.length} de ${results.length}`
          : 'Nenhum item para exibir'
    $('#page-label').textContent = `Página ${state.page} de ${pageCount}`
    $('#previous').disabled = state.page <= 1 || loading || failed
    $('#next').disabled = state.page >= pageCount || loading || failed
  }
  function clearFilters() {
    Object.assign(state, {
      q: '',
      type: '',
      sector: '',
      month: '',
      customStatuses: [],
      page: 1,
    })
    render()
  }
  function openDialog(id) {
    const dialog = $(`#${id}`)
    if (typeof dialog.showModal === 'function') dialog.showModal()
    else dialog.setAttribute('open', '')
  }
  const typeOptions = Object.entries(types)
    .map(([key, name]) => `<option value="${key}">${name}</option>`)
    .join('')
  $('#type').insertAdjacentHTML('beforeend', typeOptions)
  $('#demo-type').innerHTML = typeOptions
  $('#status-options').innerHTML = Object.entries(statuses)
    .map(
      ([key, label]) =>
        `<label><input name="custom-status" type="checkbox" value="${key}" /> ${label}</label>`,
    )
    .join('')
  for (const [id, key] of [
    ['search', 'q'],
    ['type', 'type'],
    ['sector', 'sector'],
    ['month', 'month'],
  ])
    $(`#${id}`).addEventListener(
      id === 'search' ? 'input' : 'change',
      (event) => {
        state[key] = event.target.value
        state.page = 1
        render()
      },
    )
  $('#more-toggle').addEventListener('click', () => {
    const open = $('#more-filters').hidden
    $('#more-filters').hidden = !open
    $('#more-toggle').setAttribute('aria-expanded', String(open))
  })
  $('#customize-status').addEventListener('click', () => {
    state.view = 'todos'
    state.customStatuses = []
    state.page = 1
    render()
    $('[name="custom-status"]').focus()
  })
  $('#status-options').addEventListener('change', () => {
    state.customStatuses = [
      ...document.querySelectorAll('[name="custom-status"]:checked'),
    ].map((input) => input.value)
    state.page = 1
    render()
  })
  $('#clear').addEventListener('click', clearFilters)
  $('#page-size').addEventListener('change', (event) => {
    state.pageSize = Number(event.target.value)
    state.page = 1
    render()
  })
  $('#previous').addEventListener('click', () => {
    state.page = Math.max(1, state.page - 1)
    render()
  })
  $('#next').addEventListener('click', () => {
    state.page += 1
    render()
  })
  $('#persona').addEventListener('change', (event) => {
    state.persona = event.target.value
    state.page = 1
    render()
  })
  $('#scenario').addEventListener('change', (event) => {
    state.scenario = event.target.value
    state.page = 1
    render()
  })
  $('#theme').addEventListener('click', () => {
    const dark = document.documentElement.dataset.theme !== 'dark'
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
    $('#theme').textContent = dark ? 'Ver tema claro' : 'Ver tema escuro'
  })
  $('#guide-button').addEventListener('click', () => openDialog('guide'))
  $('#new-process').addEventListener('click', () => openDialog('new-dialog'))
  $('#refresh').addEventListener('click', () => {
    clearTimeout(refreshTimer)
    state.scenario = 'loading'
    $('#scenario').value = 'loading'
    render()
    refreshTimer = setTimeout(() => {
      state.scenario = 'normal'
      $('#scenario').value = 'normal'
      render()
      notify('Lista demonstrativa atualizada. Seus filtros foram mantidos.')
    }, 650)
  })
  function closeNavigation() {
    const wasOpen = $('#sidebar').classList.contains('is-open')
    $('#sidebar').classList.remove('is-open')
    $('#nav-scrim').hidden = true
    $('.menu-toggle').setAttribute('aria-expanded', 'false')
    if (wasOpen) $('.menu-toggle').focus()
  }
  $('#close-nav').addEventListener('click', closeNavigation)
  $('#nav-scrim').addEventListener('click', closeNavigation)
  $('.menu-toggle').addEventListener('click', () => {
    const open = !$('#sidebar').classList.contains('is-open')
    $('#sidebar').classList.toggle('is-open', open)
    $('#nav-scrim').hidden = !open
    $('.menu-toggle').setAttribute('aria-expanded', String(open))
    if (open) $('#sidebar a').focus()
  })
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeNavigation()
    }
    if (event.key === 'Tab' && $('#sidebar').classList.contains('is-open')) {
      const nodes = [
        ...$('#sidebar').querySelectorAll('a[href],button'),
      ].filter((node) => !node.hidden && node.getClientRects().length)
      const first = nodes[0]
      const last = nodes.at(-1)
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first?.focus()
      }
    }
  })
  document.addEventListener('click', (event) => {
    const viewButton = event.target.closest('[data-view]')
    if (viewButton) {
      state.view = viewButton.dataset.view
      state.customStatuses = []
      state.page = 1
      closeNavigation()
      render()
    }
    const remove = event.target.closest('[data-remove]')
    if (remove) {
      const key = remove.dataset.remove
      if (key.startsWith('status:'))
        state.customStatuses = state.customStatuses.filter(
          (status) => status !== key.slice(7),
        )
      else state[key] = ''
      state.page = 1
      render()
      $('#search').focus()
    }
    if (event.target.closest('[data-clear]')) clearFilters()
    if (event.target.closest('[data-retry]')) {
      state.scenario = 'normal'
      $('#scenario').value = 'normal'
      render()
    }
    const close = event.target.closest('[data-close]')
    if (close) $(`#${close.dataset.close}`).close()
    if (event.target.closest('[data-open-guide]')) {
      event.preventDefault()
      openDialog('guide')
    }
    const row = event.target.closest('[data-record]')
    if (row) {
      const record = records.find((item) => item.id === row.dataset.record)
      $('#detail-title').textContent = record.company
      $('#detail-content').innerHTML =
        `<p>${escape(record.code)} · ${escape(types[record.type])}</p><h3>${escape(statuses[record.status])}</h3><p>Etapa: ${escape(record.stage)} · ${record.progress}% concluído.</p>${record.release ? `<p>Liberação prevista: ${record.release}. O processo permanece aberto.</p>` : ''}<p>A ficha real continuará trazendo as etapas, tarefas, valores autorizados, cobranças complementares e histórico existentes.</p><p>Esta amostra demonstra abrir e voltar sem perder a consulta.</p><button class="button secondary" data-close="detail">Voltar à lista</button>`
      openDialog('detail')
    }
  })
  $('#demo-create').addEventListener('submit', (event) => {
    event.preventDefault()
    const company = $('#demo-company').value.trim()
    if (!company) return
    records.unshift({
      ...records[0],
      id: `new-${records.length}`,
      company,
      type: $('#demo-type').value,
      code: 'DEMO-NOVO',
      status: 'andamento',
      stage: 'Definições da Diretoria',
      progress: 0,
      queue: ['com'],
      sectors: ['com'],
      month: '2026-11',
      deadline: 'A definir',
    })
    state.view = 'ativos'
    state.page = 1
    clearFilters()
    $('#new-dialog').close()
    notify('Empresa fictícia adicionada apenas à demonstração desta aba.')
  })
  render()
})()
