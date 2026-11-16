/* global Review, document, window, URLSearchParams */
;(() => {
  'use strict'
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
  const reference = '2026-11-15'
  const states = {
    pending: ['Pendente', 'file'],
    in_progress: ['Em andamento', 'clock'],
    error: ['Com erro', 'x'],
    completed: ['Concluída', 'check'],
    no_movement: ['Sem movimento', 'more'],
  }
  const statusIcon = (state) => {
    const paths = {
      pending:
        '<path d="M8 5.5h8A2.5 2.5 0 0 1 18.5 8v8a2.5 2.5 0 0 1-2.5 2.5H8A2.5 2.5 0 0 1 5.5 16V8A2.5 2.5 0 0 1 8 5.5Z"/><path d="M9 10h6M9 14h4"/>',
      in_progress:
        '<circle cx="12" cy="12" r="7"/><path d="M12 8.5V12l2.8 1.8"/>',
      error: '<path d="M12 4 21 20H3L12 4Z"/><path d="M12 9v5M12 17h.01"/>',
      completed: '<path d="m5 12.5 4.2 4.2L19 7"/>',
      no_movement: '<path d="M6 12h12"/>',
    }
    return `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths[state]}</svg>`
  }
  const companies = [
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
  ]
  const routineNames = [
    'Importar NF entrada',
    'Importar NF saída',
    'Apurar Simples',
    'Enviar DAS',
    'Apurar ISS',
    'Enviar ISS',
    'EFD Contribuições',
    'DCTFWeb',
    'MIT',
  ]
  const screens = ['Simples Nacional', 'Lucro Presumido', 'Lucro Real']
  // Fictional occurrences for this visual review. Production uses its authorized projection.
  const tasks = companies.flatMap((company, row) =>
    routineNames.flatMap((routine, column) =>
      (row + column) % 13 === 12
        ? []
        : [
            {
              id: `task-${row}-${column}`,
              company,
              routine,
              screen: row % 3,
              state: Object.keys(states)[(row + column) % 5],
              day: 10 + ((row + column) % 12),
              assignee: ['Camila Andrade', 'Rafael Souza'][row % 2],
              attachments: (row + column) % 7 === 0 ? 1 : 0,
            },
          ],
    ),
  )
  const requestedPeriod = new URLSearchParams(window.location.search).get(
    'period',
  )
  let period = /^\d{4}-(0[1-9]|1[0-2])$/.test(requestedPeriod || '')
      ? requestedPeriod
      : '2026-11',
    screen = '',
    filter = 'attention',
    expanded = false
  const due = (task) => `${period}-${String(task.day).padStart(2, '0')}`
  const terminal = (task) => ['completed', 'no_movement'].includes(task.state)
  const isLate = (task) => !terminal(task) && due(task) < reference
  const isToday = (task) => !terminal(task) && due(task) === reference
  const attention = (task) =>
    !terminal(task) && (task.state === 'error' || due(task) <= reference)
  const weight = (task) =>
    isLate(task) && task.state === 'error'
      ? 0
      : isLate(task)
        ? 1
        : task.state === 'error'
          ? 2
          : isToday(task)
            ? 3
            : 4
  const dateLabel = (date) =>
    new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
      timeZone: 'UTC',
    }).format(new Date(date + 'T12:00:00Z'))
  const monthLabel = () =>
    new Intl.DateTimeFormat('pt-BR', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(period + '-15T12:00:00Z'))
  function openTask(task) {
    const previous = document.activeElement
    const dialog = document.createElement('dialog')
    dialog.className = 'dialog routine-overview-dialog'
    dialog.setAttribute('aria-labelledby', 'overview-task-title')
    dialog.innerHTML = `<div class="dialog-head"><h2 id="overview-task-title">${esc(task.routine)}</h2><button class="icon-button" data-close aria-label="Fechar tarefa">${Review.icon('x')}</button></div><div class="dialog-body"><strong>${esc(task.company)}</strong><dl class="overview-record"><div><dt>Competência</dt><dd>${monthLabel()}</dd></div><div><dt>Prazo</dt><dd>${dateLabel(due(task))}</dd></div><div><dt>Estado</dt><dd>${states[task.state][0]}</dd></div><div><dt>Responsável</dt><dd>${task.assignee}</dd></div><div><dt>Planilha</dt><dd>${screens[task.screen]}</dd></div><div><dt>Anexos</dt><dd>${task.attachments}</dd></div></dl></div><div class="dialog-footer"><button class="button" data-close>Fechar</button><a class="button primary" href="base-visual.html?screenId=fiscal-${task.screen + 1}&amp;period=${period}">Ir à planilha</a></div>`
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
    dialog.showModal()
  }
  function render() {
    const selected = tasks.filter(
      (task) => screen === '' || task.screen === Number(screen),
    )
    const finalized = selected.filter(terminal).length
    const counts = {
      attention: selected.filter(attention).length,
      today: selected.filter(isToday).length,
      late: selected.filter(isLate).length,
      error: selected.filter((task) => task.state === 'error').length,
    }
    const predicates = {
      attention,
      today: isToday,
      late: isLate,
      error: (task) => task.state === 'error',
      open: (task) => !terminal(task),
    }
    const titles = {
      attention: 'Exigem atenção',
      today: 'Vencem hoje',
      late: 'Atrasadas',
      error: 'Com erro',
      open: 'Tarefas abertas',
    }
    const visible = selected
      .filter(predicates[filter])
      .sort(
        (a, b) =>
          weight(a) - weight(b) ||
          due(a).localeCompare(due(b)) ||
          a.company.localeCompare(b.company, 'pt-BR'),
      )
    const root = Review.mount({
      id: 'P14',
      title: 'Início',
      module: 'Rotinas',
      nav: [
        {
          label: 'Início',
          icon: 'home',
          href: 'dashboard-rotinas.html',
          active: true,
        },
        { label: 'Fiscal', icon: 'grid', href: 'base-visual.html' },
        { label: 'Rotinas', icon: 'refresh', href: 'catalogo-rotinas.html' },
        { label: 'Empresas', icon: 'building', href: 'empresas-modulos.html' },
        { label: 'Configurações', icon: 'settings', href: 'estados.html' },
      ],
      before: '../../docs/auditoria-ux/evidencias/02-rotinas-inicio.png',
      notes: [
        'Direção escolhida: operação da equipe primeiro, resumo gerencial secundário. A planilha e o catálogo de modelos permanecem separados.',
        'As cores dos cinco estados são preservadas. Atraso e vencimento são condições de prazo: uma tarefa pode estar com erro e atrasada. Exigem atenção conta cada tarefa uma única vez.',
        'Encerradas inclui Concluídas e Sem movimento, como na regra atual. O progresso não representa uma taxa de produtividade individual.',
        'A competência e o recorte da planilha afetam todos os números e tarefas. Dados fictícios com referência em 15/11/2026; nenhuma gravação ou chamada de API.',
      ],
      content: `<div class="overview-context"><div><strong>Fiscal</strong><span>Equipe · referência ${dateLabel(reference)}</span></div><div class="overview-context-controls"><label class="overview-screen"><span class="sr-only">Recorte da planilha</span><select id="overview-screen"><option value="">Todas as planilhas</option>${screens.map((name, i) => `<option value="${i}" ${screen === String(i) ? 'selected' : ''}>${name}</option>`).join('')}</select></label><div class="overview-period"><button class="icon-button" data-month="-1" aria-label="Competência anterior">${Review.icon('arrow-left')}</button><label><span class="sr-only">Competência</span><input id="overview-period" type="month" value="${period}" min="2000-01" max="2099-12"></label><button class="icon-button" data-month="1" aria-label="Próxima competência">${Review.icon('arrow-right')}</button></div></div></div>
      <div class="overview-metrics">${Object.entries(counts)
        .map(
          ([key, value]) =>
            `<button class="overview-metric metric-${key}" data-filter="${key}" aria-pressed="${filter === key}"><span>${titles[key]}</span><strong>${value}</strong><small>${key === 'attention' ? 'Tarefas distintas' : key === 'error' ? 'Estado da execução' : 'Prazo das tarefas abertas'}</small></button>`,
        )
        .join('')}</div>
      <div class="overview-columns"><section class="panel overview-priorities"><div class="panel-head"><h2>Tarefas da equipe</h2><span class="muted">${visible.length} tarefas</span></div><div class="overview-list-tools"><label><span class="sr-only">Tarefas exibidas</span><select id="overview-filter">${Object.entries(
        titles,
      )
        .map(
          ([value, title]) =>
            `<option value="${value}" ${filter === value ? 'selected' : ''}>${title}</option>`,
        )
        .join(
          '',
        )}</select></label><span class="muted">Atraso e prazo primeiro</span></div><div class="overview-task-list">${
        visible
          .slice(0, expanded ? undefined : 6)
          .map(
            (task) =>
              `<button class="overview-task" data-task="${task.id}"><span class="routine-state state-${task.state}" title="${states[task.state][0]}" aria-label="${states[task.state][0]}">${statusIcon(task.state)}</span><span class="overview-task-name"><strong>${esc(task.company)}</strong><span>${esc(task.routine)}</span><small>${esc(task.assignee)} · ${screens[task.screen]}</small></span><span class="overview-task-due ${isLate(task) ? 'is-late' : ''}"><strong>${dateLabel(due(task))}</strong><small>${isLate(task) ? 'Atrasada' : isToday(task) ? 'Vence hoje' : states[task.state][0]}</small></span>${Review.icon('arrow-right')}</button>`,
          )
          .join('') ||
        '<div class="overview-empty">Nenhuma tarefa neste recorte.</div>'
      }</div>${visible.length > 6 ? `<button class="overview-more" id="overview-more">${expanded ? 'Mostrar primeiras tarefas' : `Ver as ${visible.length} tarefas`}</button>` : ''}</section>
      <aside class="overview-secondary"><section class="panel"><div class="panel-head"><h2>Andamento da competência</h2></div><div class="panel-body"><div class="overview-completion"><strong>${selected.length ? Math.round((finalized / selected.length) * 100) : 0}%</strong><span>${finalized} de ${selected.length} encerradas</span></div><div class="overview-state-bar" role="img" aria-label="Distribuição das tarefas por estado">${Object.entries(
        states,
      )
        .map(([key, [label]]) => {
          const count = selected.filter((task) => task.state === key).length
          return count
            ? `<span class="state-${key}" style="flex:${count}" title="${label}: ${count}"></span>`
            : ''
        })
        .join('')}</div><dl class="overview-state-legend">${Object.entries(
        states,
      )
        .map(
          ([key, [label]]) =>
            `<div><dt><i class="state-${key}"></i>${label}</dt><dd>${selected.filter((task) => task.state === key).length}</dd></div>`,
        )
        .join(
          '',
        )}</dl><p class="overview-note">Encerradas: concluídas + sem movimento.</p></div></section><section class="panel"><div class="panel-head"><h2>Planilhas do departamento</h2></div><div class="overview-screen-links">${screens.map((name, i) => `<a href="base-visual.html?screenId=fiscal-${i + 1}&amp;period=${period}"><span>${name}<small>${new Set(tasks.filter((task) => task.screen === i).map((task) => task.company)).size} empresas</small></span>${Review.icon('arrow-right')}</a>`).join('')}</div></section></aside></div>`,
    })
    root.querySelectorAll('[data-filter]').forEach((button) =>
      button.addEventListener('click', () => {
        filter = button.dataset.filter
        expanded = false
        render()
      }),
    )
    root
      .querySelector('#overview-filter')
      .addEventListener('change', (event) => {
        filter = event.target.value
        expanded = false
        render()
      })
    root
      .querySelector('#overview-screen')
      .addEventListener('change', (event) => {
        screen = event.target.value
        expanded = false
        render()
      })
    root
      .querySelector('#overview-period')
      .addEventListener('change', (event) => {
        if (/^\d{4}-(0[1-9]|1[0-2])$/.test(event.target.value)) {
          period = event.target.value
          render()
        }
      })
    root.querySelectorAll('[data-month]').forEach((button) =>
      button.addEventListener('click', () => {
        const date = new Date(period + '-15T12:00:00Z')
        date.setUTCMonth(date.getUTCMonth() + Number(button.dataset.month))
        period = date.toISOString().slice(0, 7)
        render()
      }),
    )
    root
      .querySelectorAll('[data-task]')
      .forEach((button) =>
        button.addEventListener('click', () =>
          openTask(tasks.find((task) => task.id === button.dataset.task)),
        ),
      )
    root.querySelector('#overview-more')?.addEventListener('click', () => {
      expanded = !expanded
      render()
    })
  }
  render()
})()
