/* global Review, document, window, URLSearchParams, localStorage */
/* Preview only. Field names and conditions follow the current React forms. */
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
  const option = (value, label, selected) =>
    `<option value="${esc(value)}"${String(value) === String(selected) ? ' selected' : ''}>${esc(label)}</option>`
  const input = (name, label, value = '', settings = {}) =>
    `<label class="field ${settings.wide ? 'span-2' : ''}"><span>${esc(label)}${settings.required ? ' *' : ''}</span><input name="${name}" value="${esc(value)}" type="${settings.type || 'text'}" ${settings.money ? 'data-format="money" inputmode="numeric" placeholder="0,00"' : ''} ${settings.required ? 'required' : ''} ${settings.disabled ? 'disabled' : ''} ${settings.max ? `maxlength="${settings.max}"` : ''} ${settings.type === 'number' ? 'min="0" step="1"' : ''} aria-describedby="${name}-error"><small class="field-message" id="${name}-error"></small></label>`
  const select = (name, label, value, options, settings = {}) =>
    `<label class="field ${settings.wide ? 'span-2' : ''}"><span>${esc(label)}${settings.required ? ' *' : ''}</span><select name="${name}" ${settings.required ? 'required' : ''} ${settings.disabled ? 'disabled' : ''} aria-describedby="${name}-error">${options.map(([key, text]) => option(key, text, value)).join('')}</select><small class="field-message" id="${name}-error"></small></label>`
  const textarea = (name, label, value, required = false) =>
    `<label class="field span-2"><span>${esc(label)}${required ? ' *' : ''}</span><textarea name="${name}" rows="3" ${required ? 'required' : ''} aria-describedby="${name}-error">${esc(value)}</textarea><small class="field-message" id="${name}-error"></small></label>`
  const panel = (title, content, classes = '') =>
    `<section class="panel ${classes}"><div class="panel-head"><h2>${title}</h2></div><div class="panel-body">${content}</div></section>`
  const navRoutine = [
    { label: 'Início', icon: 'home', href: 'dashboard-rotinas.html' },
    { label: 'Fiscal', icon: 'grid', href: 'base-visual.html' },
    {
      label: 'Rotinas',
      icon: 'refresh',
      href: 'catalogo-rotinas.html',
      active: true,
    },
    { label: 'Configurações', icon: 'settings', href: 'estados.html' },
  ]
  const navProcess = [
    { label: 'Início', icon: 'home', href: 'dashboard-processos.html' },
    {
      label: 'Minha fila',
      icon: 'file',
      href: 'dashboard-processos.html?referencia=lista&situacao=fila&setor=fin',
    },
    {
      label: 'Processos',
      icon: 'list',
      href: 'dashboard-processos.html?referencia=lista',
      active: true,
    },
    {
      label: 'Movimentações',
      icon: 'list',
      href: 'movimentacoes-processos.html',
    },
    { label: 'Avisos por e-mail', icon: 'file', href: 'processos.html' },
  ]
  let dirty = false
  window.addEventListener('beforeunload', (event) => {
    if (dirty) {
      event.preventDefault()
      event.returnValue = ''
    }
  })
  const confirmLeave = () =>
    !dirty
      ? Promise.resolve(true)
      : Review.confirm({
          title: 'Descartar alterações?',
          body: 'Há alterações que ainda não foram salvas.',
          confirmLabel: 'Descartar alterações',
        })
  document.addEventListener('click', async (event) => {
    const anchor = event.target.closest('a[href]')
    if (
      !anchor ||
      !dirty ||
      anchor.getAttribute('href').startsWith('#') ||
      anchor.target === '_blank'
    )
      return
    event.preventDefault()
    if (await confirmLeave()) {
      dirty = false
      window.location.href = anchor.href
    }
  })
  function setDraft() {
    const node = document.querySelector('[data-draft-state]')
    if (node) {
      node.textContent = dirty
        ? 'Alterações não salvas'
        : 'Nenhuma alteração pendente'
      node.classList.toggle('is-dirty', dirty)
    }
  }
  function fieldError(form, name, message) {
    const control = form.elements.namedItem(name)
    control?.setAttribute('aria-invalid', 'true')
    const node = form.querySelector(`#${name}-error`)
    if (node) node.textContent = message
    return control
  }
  function clearError(control) {
    control.setAttribute('aria-invalid', 'false')
    const node = document.getElementById(`${control.name}-error`)
    if (node) node.textContent = ''
  }
  function validate(form, required) {
    let first
    required.forEach(([name, message]) => {
      const control = form.elements.namedItem(name)
      if (!String(control?.value ?? '').trim()) {
        const invalid = fieldError(form, name, message)
        first ||= invalid
      } else if (control) clearError(control)
    })
    first?.focus()
    return !first
  }
  const recurrenceLabels = {
    monthly: 'Mensal',
    quarterly: 'Trimestral',
    semiannual: 'Semestral',
    annual: 'Anual',
    on_demand: 'Sob demanda',
  }
  const months = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
  ]
  const departmentLabels = {
    fiscal: 'Fiscal',
    contabil: 'Contábil',
    pessoal: 'Pessoal',
  }
  const assignees = {
    fiscal: [
      ['camila', 'Camila Andrade'],
      ['rafael', 'Rafael Souza'],
    ],
    contabil: [['mariana', 'Mariana Costa']],
    pessoal: [['bruna', 'Bruna Martins']],
  }
  const catalogRoutines = [
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
    name,
    shotname: name,
    description: `Conferência e execução de ${name.toLocaleLowerCase('pt-BR')}.`,
    departmentId: 'fiscal',
    recurrence: 'monthly',
    defaultDueDays: '14',
    defaultAssigneeMemberId: 'camila',
    recurrenceMonths: '',
    companies: 10,
    active: true,
  }))
  const catalogStorageKey = 'jaral-preview-routine-search'
  function catalog() {
    const requested = new URLSearchParams(window.location.search).get('rotina')
    const item = catalogRoutines.find((routine) => routine.id === requested)
    if (item) {
      routineDetail(item)
      return
    }
    let search = ''
    try {
      search = localStorage.getItem(catalogStorageKey) || ''
    } catch {
      /* optional context */
    }
    const root = Review.mount({
      id: 'P03',
      title: 'Rotinas',
      module: 'Rotinas',
      nav: navRoutine,
      actions:
        '<a class="button primary" href="rotinas.html" data-new-routine>Nova rotina</a>',
      before: '../../docs/auditoria-ux/evidencias/05-rotinas-nova.png',
      notes: [
        'A entrada para criar rotinas fica neste catálogo, como em RoutinesPage.tsx. A planilha não ganha botão para criar modelos.',
        'As sete colunas do catálogo e a abertura da ficha seguem o React atual. Abra uma ficha para editar; Nova rotina abre o formulário por etapas.',
        'Busca preservada ao voltar. Dados fictícios; nenhum modelo ou tarefa é criado.',
      ],
      content: `<div class="operation-view"><section class="panel"><div class="panel-body toolbar"><label class="search-field">${Review.icon('search')}<input id="routine-catalog-search" type="search" value="${esc(search)}" placeholder="Buscar por nome, departamento ou recorrência" aria-label="Buscar rotinas"></label><span class="muted" data-routine-count></span></div><div class="table-wrap"><table class="routine-catalog-table"><thead><tr><th>Rotina</th><th>Departamento</th><th>Recorrência</th><th>Agenda e prazo</th><th>Empresas</th><th>Situação</th><th></th></tr></thead><tbody data-routine-rows></tbody></table></div></section></div>`,
    })
    const render = () => {
      const normalize = (text) =>
        text
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLocaleLowerCase('pt-BR')
      const q = normalize(search)
      const rows = catalogRoutines
        .filter((routine) =>
          normalize(
            [
              routine.name,
              routine.description,
              departmentLabels[routine.departmentId],
              recurrenceLabels[routine.recurrence],
            ].join(' '),
          ).includes(q),
        )
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
      root.querySelector('[data-routine-count]').textContent =
        `${rows.length} de ${catalogRoutines.length} cadastradas`
      root.querySelector('[data-routine-rows]').innerHTML =
        rows
          .map(
            (routine) =>
              `<tr data-routine-id="${routine.id}" aria-label="Abrir rotina ${esc(routine.name)}"><td><a href="catalogo-rotinas.html?rotina=${routine.id}" class="routine-catalog-link" tabindex="-1"><b>${esc(routine.name)}</b><small>${esc(routine.description)}</small></a></td><td>Fiscal</td><td>Mensal</td><td>Mensal · 14 dias</td><td>10</td><td><span class="badge">Ativa</span></td><td><span aria-hidden="true">›</span></td></tr>`,
          )
          .join('') ||
        '<tr><td colspan="7" class="catalog-empty">Nenhuma rotina encontrada. Ajuste a busca.</td></tr>'
      Review.rows(root, {
        selector: 'tr[data-routine-id]',
        onOpen: (row) => {
          window.location.href = `catalogo-rotinas.html?rotina=${row.dataset.routineId}`
        },
      })
    }
    root
      .querySelector('#routine-catalog-search')
      .addEventListener('input', (event) => {
        search = event.target.value
        try {
          localStorage.setItem(catalogStorageKey, search)
        } catch {
          /* optional context */
        }
        render()
      })
    render()
  }
  function routineDetail(item) {
    Review.mount({
      id: 'P03',
      title: item.name,
      module: 'Rotinas',
      nav: navRoutine,
      actions: `<a class="button" href="catalogo-rotinas.html">Voltar às rotinas</a><a class="button primary" href="rotinas.html?mode=edit&id=${item.id}" data-edit-routine>Editar rotina</a>`,
      notes: [
        'A ficha precede a edição, conforme o fluxo de RoutinesPage → EntityDetailPage. Os campos de edição seguem EntityEditModal; o departamento não é alterável.',
        'Esta ficha resume o modelo fictício para avaliar o caminho até a edição. A lista de execuções e os vínculos do produto não estão sendo reformulados.',
      ],
      content: `<div class="operation-view">${panel('Modelo da rotina', `<dl class="routine-record"><div><dt>Nome curto</dt><dd>${esc(item.shotname)}</dd></div><div><dt>Departamento</dt><dd>Fiscal</dd></div><div><dt>Recorrência</dt><dd>Mensal</dd></div><div><dt>Prazo padrão</dt><dd>14 dias a partir do início da competência</dd></div><div><dt>Responsável padrão</dt><dd>Camila Andrade</dd></div><div><dt>Descrição</dt><dd>${esc(item.description)}</dd></div></dl>`)}</div>`,
    })
  }
  const query = new URLSearchParams(window.location.search)
  const editing = query.get('mode') === 'edit'
  let routine = editing
    ? {
        ...(catalogRoutines.find((item) => item.id === query.get('id')) ||
          catalogRoutines[0]),
      }
    : {
        name: '',
        shotname: '',
        description: '',
        departmentId: '',
        recurrence: 'monthly',
        defaultDueDays: '14',
        defaultAssigneeMemberId: '',
        recurrenceMonths: '',
      }
  let routineStep = editing ? 3 : 1
  let routineSection = 0
  let sectionBackup
  let sectionWasDirty = false
  let sectionWasSaved = false
  let routineSaved = false
  function cycleOptions() {
    if (routine.recurrence === 'annual')
      return months.map((label, index) => [String(index + 1), label])
    if (routine.recurrence === 'quarterly')
      return [
        ['1-4-7-10', 'Janeiro, abril, julho e outubro'],
        ['2-5-8-11', 'Fevereiro, maio, agosto e novembro'],
        ['3-6-9-12', 'Março, junho, setembro e dezembro'],
      ]
    if (routine.recurrence === 'semiannual')
      return months
        .slice(0, 6)
        .map((name, index) => [
          `${index + 1}-${index + 7}`,
          `${name} e ${months[index + 6].toLocaleLowerCase('pt-BR')}`,
        ])
    return []
  }
  function routineStepFields(section = routineStep) {
    if (section === 1)
      return `<div class="form-grid">${input('name', 'Nome da rotina', routine.name, { required: true, max: 200, wide: true })}${input('shotname', 'Nome curto na planilha', routine.shotname, { required: true, max: 32 })}${select('departmentId', 'Departamento', routine.departmentId, [['', 'Selecione o departamento'], ...Object.entries(departmentLabels)], { required: true, disabled: editing })}${textarea('description', 'Descrição', routine.description, true)}</div>`
    if (section === 2)
      return `<fieldset class="recurrence-fieldset"><legend>Recorrência *</legend><div class="recurrence-options">${Object.entries(
        recurrenceLabels,
      )
        .map(
          ([key, label]) =>
            `<label class="recurrence-option"><input type="radio" name="recurrence" value="${key}" ${routine.recurrence === key ? 'checked' : ''}><span>${label}</span></label>`,
        )
        .join(
          '',
        )}</div></fieldset><div class="form-grid routine-schedule">${input('defaultDueDays', 'Prazo padrão (dias)', routine.defaultDueDays, { type: 'number', required: true })}${select('defaultAssigneeMemberId', 'Responsável padrão (opcional)', routine.defaultAssigneeMemberId, [['', 'Sem responsável definido'], ...(assignees[routine.departmentId] || [])])}${cycleOptions().length ? select('recurrenceMonths', routine.recurrence === 'annual' ? 'Mês de execução' : 'Ciclo de execução', routine.recurrenceMonths, [['', 'Selecione'], ...cycleOptions()], { required: true, wide: true }) : ''}</div><p class="field-help">O prazo é contado a partir do primeiro dia da competência. O responsável deve pertencer ao departamento selecionado.</p>`
    return routineSummary()
  }
  function routineReviewGroup(section, title, values) {
    const open = routineSection === section
    return `<section class="routine-review-group" aria-labelledby="routine-group-${section}"><div class="routine-review-group-head"><h3 id="routine-group-${section}">${title}</h3><button type="button" class="button small" data-routine-edit="${section}" aria-label="${open ? 'Editando' : 'Editar'} ${title.toLocaleLowerCase('pt-BR')}" aria-expanded="${open}" aria-controls="routine-group-content-${section}" ${routineSection ? 'disabled' : ''}>${open ? 'Editando' : 'Editar'}</button></div><div id="routine-group-content-${section}" class="${open ? 'routine-review-editor' : ''}">${open ? `${routineStepFields(section)}<div class="routine-section-actions"><button type="button" class="button" data-routine-section-cancel>Cancelar edição</button><button type="button" class="button primary" data-routine-section-confirm>Confirmar alterações</button></div>` : `<dl class="routine-record">${values}</dl>`}</div></section>`
  }
  function routineSummary() {
    const identification = `<div><dt>Nome da rotina</dt><dd>${esc(routine.name)}</dd></div><div><dt>Nome curto na planilha</dt><dd>${esc(routine.shotname)}</dd></div><div><dt>Departamento</dt><dd>${esc(departmentLabels[routine.departmentId])}</dd></div><div><dt>Descrição</dt><dd>${esc(routine.description)}</dd></div>`
    const execution = `<div><dt>Recorrência</dt><dd>${esc(recurrenceLabels[routine.recurrence])}</dd></div>${
      routine.recurrenceMonths
        ? `<div><dt>Meses</dt><dd>${routine.recurrenceMonths
            .split('-')
            .map((number) => months[Number(number) - 1])
            .join(', ')}</dd></div>`
        : ''
    }<div><dt>Prazo padrão</dt><dd>${esc(routine.defaultDueDays)} dias</dd></div><div><dt>Responsável padrão</dt><dd>${esc((assignees[routine.departmentId] || []).find(([id]) => id === routine.defaultAssigneeMemberId)?.[1] || 'Sem responsável definido')}</dd></div>`
    return `<div class="routine-review">${routineReviewGroup(1, 'Identificação', identification)}${routineReviewGroup(2, 'Execução', execution)}</div><div class="notice">${editing ? 'Salvar alterações publica uma nova versão do modelo.' : 'O cadastro cria o modelo da rotina. Empresas e telas serão associadas separadamente; nenhuma tarefa é criada aqui.'}</div>`
  }
  function validateRoutine(section = routineSection || routineStep) {
    const form = document.getElementById('routine-review-form')
    if (section === 1)
      return validate(form, [
        ['name', 'Informe o nome da rotina.'],
        ['shotname', 'Informe o nome curto na planilha.'],
        ['departmentId', 'Selecione o departamento.'],
        ['description', 'Informe a descrição da rotina.'],
      ])
    if (section === 2) {
      const due = Number(routine.defaultDueDays)
      if (
        routine.defaultDueDays === '' ||
        !Number.isInteger(due) ||
        due < 0 ||
        due > 3750
      ) {
        fieldError(
          form,
          'defaultDueDays',
          'Informe um prazo inteiro de 0 a 3.750 dias.',
        )?.focus()
        return false
      }
      return (
        !cycleOptions().length ||
        validate(form, [['recurrenceMonths', 'Selecione o ciclo de execução.']])
      )
    }
    return true
  }
  function renderRoutine() {
    const steps = ['Identificação', 'Execução', 'Revisão']
    const root = Review.mount({
      id: 'P03',
      title: editing ? 'Editar rotina' : 'Nova rotina',
      module: 'Rotinas',
      nav: navRoutine,
      actions:
        '<a class="button ghost" href="catalogo-rotinas.html">Voltar ao catálogo</a>',
      before: '../../docs/auditoria-ux/evidencias/05-rotinas-nova.png',
      notes: [
        'Fluxo: catálogo de Rotinas → Nova rotina. A planilha permanece sem ação de criar modelos.',
        'Identificação e Padrões de execução preservam os campos, obrigatoriedades e dependências de CreateRoutinePage. A organização por etapas é a alternativa visual solicitada.',
        'A edição abre diretamente nesta ficha, sem etapas. A mesma ficha permite corrigir os dados na etapa de Revisão do cadastro: use Editar em Identificação ou Execução, confirme a seção e salve ao terminar.',
        'O departamento permanece fixo na edição, como em EntityEditModal. Recorrência anual, semestral e trimestral exigem ciclo; responsáveis dependem do departamento. Não cria tarefas nem altera vínculos.',
      ],
      content: `<div class="operation-view routine-wizard ${editing ? 'routine-edit-record' : ''}">${editing ? '' : `<ol class="routine-stepper" aria-label="Etapas do cadastro">${steps.map((label, index) => `<li ${routineStep === index + 1 ? 'aria-current="step"' : ''}><button type="button" data-routine-step="${index + 1}" ${index + 1 > routineStep || routineSection ? 'disabled' : ''}><span>${index + 1 < routineStep ? '✓' : index + 1}</span>${label}</button></li>`).join('')}</ol>`}<form id="routine-review-form" novalidate><section class="panel"><div class="panel-head"><h2>${editing ? 'Dados da rotina' : steps[routineStep - 1]}</h2>${editing ? '' : `<span class="muted">${routineStep} de 3</span>`}</div><div class="panel-body routine-step-content">${routineStepFields()}</div><footer class="operation-footer"><span data-draft-state class="draft-state"></span><div class="actions"><button type="button" class="button" data-routine-back ${routineSection ? 'disabled' : ''}>${!editing && routineStep > 1 ? 'Voltar' : 'Cancelar'}</button><button type="submit" class="button primary" data-routine-next ${routineSection || routineSaved ? 'disabled' : ''}>${routineStep < 3 ? 'Continuar' : editing ? 'Salvar alterações' : 'Criar rotina'}</button></div></footer></section></form></div>`,
    })
    const form = root.querySelector('#routine-review-form')
    form.addEventListener('input', (event) => {
      const control = event.target
      if (!control.name) return
      routine[control.name] = control.value
      dirty = true
      routineSaved = false
      clearError(control)
      setDraft()
    })
    form.addEventListener('change', (event) => {
      const control = event.target
      if (!control.name) return
      routine[control.name] = control.value
      dirty = true
      routineSaved = false
      if (control.name === 'departmentId') routine.defaultAssigneeMemberId = ''
      if (control.name === 'recurrence') {
        routine.recurrenceMonths = ''
        renderRoutine()
        document
          .querySelector(`[name="recurrence"][value="${routine.recurrence}"]`)
          ?.focus()
      }
      setDraft()
    })
    form.addEventListener('submit', (event) => {
      event.preventDefault()
      if (routineSection) {
        confirmRoutineSection()
        return
      }
      if (!validateRoutine()) return
      if (routineStep < 3) {
        routineStep++
        renderRoutine()
        return
      }
      dirty = false
      routineSaved = true
      setDraft()
      Review.toast(
        editing
          ? 'Alterações salvas apenas nesta prévia.'
          : 'Modelo criado apenas nesta prévia. Nenhuma tarefa foi criada.',
      )
      root.querySelector('[data-routine-next]').disabled = true
    })
    root
      .querySelector('[data-routine-back]')
      .addEventListener('click', async () => {
        if (!editing && routineStep > 1) {
          routineStep--
          renderRoutine()
        } else if (await confirmLeave()) {
          dirty = false
          window.location.href = 'catalogo-rotinas.html'
        }
      })
    root.querySelectorAll('[data-routine-step]').forEach((button) =>
      button.addEventListener('click', () => {
        routineStep = Number(button.dataset.routineStep)
        renderRoutine()
      }),
    )
    root.querySelectorAll('[data-routine-edit]').forEach((button) =>
      button.addEventListener('click', () => {
        if (routineSection) return
        routineSection = Number(button.dataset.routineEdit)
        sectionBackup = { ...routine }
        sectionWasDirty = dirty
        sectionWasSaved = routineSaved
        renderRoutine()
        document
          .querySelector(
            '.routine-review-editor :is(input, select, textarea):not(:disabled)',
          )
          ?.focus()
      }),
    )
    function confirmRoutineSection() {
      if (!validateRoutine(routineSection)) return
      const section = routineSection
      routineSection = 0
      sectionBackup = undefined
      renderRoutine()
      document.querySelector(`[data-routine-edit="${section}"]`)?.focus()
    }
    root
      .querySelector('[data-routine-section-confirm]')
      ?.addEventListener('click', confirmRoutineSection)
    root
      .querySelector('[data-routine-section-cancel]')
      ?.addEventListener('click', () => {
        const section = routineSection
        routine = { ...sectionBackup }
        dirty = sectionWasDirty
        routineSaved = sectionWasSaved
        routineSection = 0
        sectionBackup = undefined
        renderRoutine()
        document.querySelector(`[data-routine-edit="${section}"]`)?.focus()
      })
    setDraft()
  }

  // Published workflow metadata: src/preview/workflows.json; fee adjustments: current ProcessForm/processTestFixtures.
  const typeCatalog = [
    {
      id: 'abertura',
      name: 'Abertura de empresa',
      description: 'Constituição de novo CNPJ',
      symbol: 'ABE',
      stages: [
        'Definições da Diretoria',
        'Dados do cliente e registro',
        'Formalização e cadastro',
        'Planilha geral e 1ª visita',
        '2ª visita',
      ],
      fields: ['custo', 'honorario', 'regime'],
      meetings: ['alinhamento', 'acompanhamento'],
    },
    {
      id: 'mei',
      name: 'Transformação MEI → ME',
      description: 'Conversão de MEI para ME',
      symbol: 'MEI',
      stages: [
        'Definições da Diretoria',
        'Dados do cliente e registro',
        'Formalização e cadastro',
        'Planilha geral e 1ª visita',
        '2ª visita',
      ],
      fields: ['custo', 'honorario', 'regime'],
      meetings: ['alinhamento', 'acompanhamento'],
    },
    {
      id: 'outro',
      name: 'Cliente de outro escritório',
      description: 'Vindo de outra contabilidade',
      symbol: 'OUT',
      stages: [
        'Definições da Diretoria',
        'Formalização e documentos',
        'Cadastro e 1ª visita',
        'Visita de feedback',
      ],
      fields: ['honorario', 'regime'],
      meetings: ['alinhamento', 'acompanhamento'],
    },
    {
      id: 'alteracao',
      name: 'Alteração contratual',
      description: 'Sócios, endereço, CNAE, capital',
      symbol: 'ALT',
      stages: [
        'Definições da alteração contratual',
        'Envio à Leggacy',
        'Envio da guia',
        'Registro e entrega ao cliente',
        'Arquivo e comunicação interna',
      ],
      fields: [],
      meetings: [],
    },
    {
      id: 'inatividade',
      name: 'Paralisação de empresa',
      description: 'Empresa deixa de operar e encerra o contrato',
      symbol: 'PAR',
      stages: [
        'Definições da paralisação',
        'Distrato',
        'Paralisação na Leggacy',
        'Encerramento interno',
      ],
      fields: [],
      meetings: [],
    },
    {
      id: 'inativa',
      name: 'Inatividade de empresa',
      description: 'Empresa inativa com honorário reduzido',
      symbol: 'INA',
      stages: [
        'Definições de inatividade',
        'Atualização do honorário',
        'Comunicação e atualizações internas',
      ],
      fields: ['honorario'],
      meetings: [],
    },
    {
      id: 'reativacao',
      name: 'Reativação de empresa',
      description: 'Retomada de empresa inativa',
      symbol: 'REA',
      stages: [
        'Condições de reativação',
        'Contrato e cobrança',
        'Reativação na Leggacy',
        'Retorno aos controles',
        'Visita de retomada',
        'Reunião de acompanhamento',
      ],
      fields: ['honorario'],
      meetings: ['alinhamento', 'acompanhamento'],
    },
    {
      id: 'baixa',
      name: 'Baixa de empresa',
      description: 'Encerramento definitivo do CNPJ',
      symbol: 'BAI',
      stages: [
        'Alinhamento com o cliente',
        'Distrato e débitos',
        'Regularidade fiscal',
        'Baixa empresarial na Leggacy',
        'Encerramento interno',
      ],
      fields: ['custo'],
      meetings: [],
    },
    {
      id: 'saida',
      name: 'Saída de cliente',
      description: 'Transferência para outra contabilidade',
      symbol: 'SAI',
      stages: [
        'Definições da saída',
        'Distrato e débitos',
        'Desativação',
        'Dados do novo contador',
        'Contato com a nova contabilidade',
      ],
      fields: [],
      meetings: [],
    },
    {
      id: 'exclusao',
      name: 'Exclusão de cliente',
      description: 'Encerramento do contrato pelo escritório',
      symbol: 'EXC',
      stages: [
        'Comunicação ao cliente',
        'Distrato e débitos',
        'Encerramento interno',
      ],
      fields: [],
      meetings: [],
    },
    {
      id: 'aumento_honorarios',
      name: 'Aumento de honorários contábeis',
      description: 'Reajuste dos honorários contábeis',
      symbol: 'AHC',
      stages: ['Financeiro'],
      fields: ['honorario'],
      meetings: [],
    },
    {
      id: 'reducao_honorarios',
      name: 'Redução de honorários contábeis',
      description: 'Reajuste dos honorários contábeis',
      symbol: 'RHC',
      stages: ['Financeiro'],
      fields: ['honorario'],
      meetings: [],
    },
    {
      id: 'outros',
      name: 'Outros',
      description: 'Atividade específica para Financeiro ou Regularidade',
      symbol: 'OTS',
      stages: ['Executar atividade', 'Confirmar conclusão'],
      fields: [],
      meetings: [],
    },
  ]
  const DIRECT_LOSS_TYPES = ['baixa', 'saida', 'exclusao', 'inatividade']
  const LOSS_TYPES = [...DIRECT_LOSS_TYPES, 'inativa']
  const startLabels = {
    inatividade: 'Início da paralisação',
    inativa: 'Início da inatividade',
  }
  const competenceFields = {
    abertura: [
      'competenciaInicioAtividade',
      'Competência de início da atividade',
    ],
    mei: ['competenciaInicioAtividade', 'Competência de início da atividade'],
    outro: ['competenciaInicioAtividade', 'Competência de início da atividade'],
    reativacao: [
      'competenciaInicioAtividade',
      'Competência de início da atividade',
    ],
    inativa: [
      'competenciaInicioInatividade',
      'Competência de início da inatividade',
    ],
    inatividade: [
      'ultimaCompetenciaTrabalho',
      'Última competência de trabalho',
    ],
    baixa: ['ultimaCompetenciaTrabalho', 'Última competência de trabalho'],
    saida: ['ultimaCompetenciaTrabalho', 'Última competência de trabalho'],
    exclusao: ['ultimaCompetenciaTrabalho', 'Última competência de trabalho'],
  }
  const alterations = {
    societario: 'Quadro societário',
    capital: 'Capital social',
    bens: 'Incorporação de bens',
    endereco: 'Endereço',
    razao: 'Razão social',
    atividades: 'Atividades',
    outros: 'Outros',
  }
  const reasons = {
    encerramento: 'Encerramento das atividades',
    honorarios: 'Valor dos honorários',
    atendimento: 'Insatisfação com o atendimento',
    concorrente: 'Mudança para outra contabilidade',
    inadimplencia: 'Inadimplência',
    venda: 'Venda ou fusão da empresa',
    reducao: 'Redução de atividade',
    outros: 'Outros',
  }
  let selectedType = ''
  let processValues = { reunAlinh: true, reunAcomp: true, reatJunta: true }
  const selected = () => typeCatalog.find((type) => type.id === selectedType)
  const feeAdjustment = () =>
    ['aumento_honorarios', 'reducao_honorarios'].includes(selectedType)
  const hasField = (field) => selected()?.fields.includes(field)
  const hasCost = () => selectedType === 'alteracao' || hasField('custo')
  const valueOf = (name) => processValues[name] ?? ''
  const moneyField = (name, label, required = false) =>
    input(name, `${label} (R$)`, valueOf(name), { money: true, required })
  const controlBlock = (title, fields, help = '') =>
    `<section class="director-group"><h3>${title}</h3>${fields}${help ? `<p class="field-help">${help}</p>` : ''}</section>`
  const switchField = (name, title, description) =>
    `<label class="process-toggle"><input type="checkbox" name="${name}" ${processValues[name] ? 'checked' : ''}><span><b>${title}</b><small>${description}</small></span></label>`
  const choices = (name, label, options, multiple = false) =>
    `<div class="field span-2"><span>${label}</span><div class="process-choice-group" role="group" aria-label="${label}">${Object.entries(
      options,
    )
      .map(
        ([key, text]) =>
          `<button type="button" class="process-choice" data-pick="${name}" data-value="${key}" ${multiple ? 'data-multiple' : ''} aria-pressed="${multiple ? (processValues[name] || []).includes(key) : String(processValues[name]) === key}">${text}</button>`,
      )
      .join(
        '',
      )}</div><small class="field-message" id="${name}-error"></small></div>`
  const normalizeCnpj = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 14)
    return (
      digits.slice(0, 2) +
      (digits.length > 2 ? '.' + digits.slice(2, 5) : '') +
      (digits.length > 5 ? '.' + digits.slice(5, 8) : '') +
      (digits.length > 8 ? '/' + digits.slice(8, 12) : '') +
      (digits.length > 12 ? '-' + digits.slice(12) : '')
    )
  }
  function cents(value) {
    const text = String(value ?? '').replace(/R\$|\s/g, '')
    if (!text) return null
    if (text.includes(',')) return BigInt(text.replace(/\D/g, '') || '0')
    if (/^\d+(\.\d{0,2})?$/.test(text)) {
      const [whole, fraction = ''] = text.split('.')
      return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'))
    }
    return null
  }
  function brl(amount) {
    if (amount === null) return 'A definir'
    const absolute = amount < 0n ? -amount : amount
    return `${amount < 0n ? '− ' : ''}R$ ${new Intl.NumberFormat('pt-BR').format(absolute / 100n)},${String(absolute % 100n).padStart(2, '0')}`
  }
  function updateProcessCalculations() {
    const honorario = cents(valueOf('honorario'))
    const previous = cents(valueOf('honAnterior'))
    const unit = cents(valueOf('trabValor'))
    const count = Number(processValues.trabQtd || 0)
    const payroll =
      processValues.trab && Number.isSafeInteger(count) && count > 0
        ? BigInt(count) * (unit || 0n)
        : 0n
    const total = (honorario || 0n) + payroll
    const cost = cents(valueOf('custo'))
    const installments = Number(processValues.parcelas || 0)
    const values = {
      payroll: brl(payroll),
      total: brl(total),
      loss:
        honorario === null || previous === null
          ? 'A definir'
          : brl(previous > total ? previous - total : 0n),
      variation:
        honorario === null || previous === null
          ? 'A definir'
          : brl(honorario - previous),
      installments:
        cost === null ||
        !Number.isSafeInteger(installments) ||
        installments < 1 ||
        installments > 360
          ? 'A definir'
          : `${installments} × ${brl((cost + BigInt(Math.floor(installments / 2))) / BigInt(installments))}`,
    }
    document.querySelectorAll('[data-calc]').forEach((node) => {
      node.textContent = values[node.dataset.calc]
    })
  }
  function costFields() {
    return controlBlock(
      'Custo do processo',
      `<div class="form-grid">${moneyField('custo', 'Valor do processo', selectedType === 'alteracao')}${select(
        'pagador',
        'Quem paga',
        valueOf('pagador'),
        [
          ['', 'Selecione'],
          ['cliente', 'Cliente'],
          ['jaralcon', 'Jaralcon'],
        ],
        { required: selectedType === 'alteracao' },
      )}${choices('paymentMode', 'Pagamento', { vista: 'À vista', parcelado: 'Parcelado' })}${processValues.paymentMode === 'parcelado' ? input('parcelas', 'Número de parcelas', valueOf('parcelas') || '2', { type: 'number', required: true }) : ''}</div><p class="calculation-line"><span>Forma de pagamento</span><b data-calc="installments">A definir</b></p>`,
    )
  }
  function monthlyFields() {
    const inactive = selectedType === 'inativa'
    return controlBlock(
      inactive ? 'Honorário durante a inatividade' : 'Novo honorário mensal',
      `<div class="form-grid">${inactive ? moneyField('honAnterior', 'Honorário atual (antes da inatividade)') : ''}${moneyField('honorario', processValues.trab ? 'Honorário contábil' : 'Honorário mensal')}${input('honCobranca', inactive ? 'Data da nova cobrança' : 'Cobrança do 1º honorário', valueOf('honCobranca'), { type: 'date' })}</div>${!inactive ? switchField('trab', 'Honorário trabalhista', processValues.trab ? 'Cobrado por funcionário, somado ao honorário mensal' : 'Ative se a empresa tiver folha de pagamento') : ''}${!inactive && processValues.trab ? `<div class="form-grid">${input('trabQtd', 'Funcionários', valueOf('trabQtd'), { type: 'number' })}${moneyField('trabValor', 'Valor por funcionário')}</div><p class="calculation-line"><span>Trabalhista</span><b data-calc="payroll"></b></p><p class="calculation-line total"><span>Total mensal · contábil e trabalhista</span><b data-calc="total"></b></p>` : ''}${inactive ? '<p class="calculation-line loss"><span>Perda de honorário mensal</span><b data-calc="loss">A definir</b></p>' : ''}`,
    )
  }
  function directorFields() {
    if (feeAdjustment())
      return `${input('contato', 'Contato do cliente (opcional)', valueOf('contato'), { wide: true, max: 500 })}<div class="form-grid">${moneyField('honAnterior', 'Honorário anterior', true)}${moneyField('honorario', 'Novo honorário contábil', true)}${input('honCobranca', 'Data cobrança novo valor', valueOf('honCobranca'), { type: 'date' })}</div><p class="calculation-line"><span>Variação mensal</span><b data-calc="variation">A definir</b></p><p class="field-help">Os dois honorários são obrigatórios. O ajuste no sistema contábil é realizado manualmente pelo Financeiro.</p>`
    let fields = input(
      'contato',
      'Contato do cliente (opcional)',
      valueOf('contato'),
      { wide: true, max: 500 },
    )
    if (hasField('regime'))
      fields += controlBlock(
        'Estrutura tributária',
        `<div class="form-grid">${choices('regime', 'Regime tributário', { simples: 'Simples Nacional', presumido: 'Lucro Presumido', real: 'Lucro Real' })}${textarea('regimeObs', 'Observações tributárias (opcional)', valueOf('regimeObs'))}</div>`,
      )
    if (hasCost()) fields += costFields()
    if (hasField('honorario')) fields += monthlyFields()
    if (DIRECT_LOSS_TYPES.includes(selectedType))
      fields += controlBlock(
        'Honorário perdido',
        `<div class="form-grid">${moneyField('honPerdido', 'Honorário mensal que deixa de ser cobrado', true)}</div>`,
      )
    if (LOSS_TYPES.includes(selectedType))
      fields += controlBlock(
        'Motivo (opcional)',
        `${choices('motivo', 'Motivo', reasons)}${textarea('motivoObs', 'Detalhes do motivo (opcional)', valueOf('motivoObs'))}`,
      )
    if (selectedType === 'saida')
      fields += controlBlock(
        'Nova contabilidade',
        `${switchField('novoContador', 'Já temos os dados do novo contador', processValues.novoContador ? 'A Regularidade entra em contato direto com a nova contabilidade' : 'A Regularidade solicitará os dados ao cliente')}${processValues.novoContador ? `<div class="form-grid">${input('contadorNome', 'Contador ou escritório', valueOf('contadorNome'), { required: true, max: 200 })}${input('contadorContato', 'Contato', valueOf('contadorContato'), { required: true, max: 500 })}</div>` : ''}`,
      )
    if (selectedType === 'reativacao')
      fields += controlBlock(
        'Junta Comercial',
        switchField(
          'reatJunta',
          'Reativar na Junta Comercial',
          processValues.reatJunta
            ? 'Abre a etapa de reativação com a Leggacy'
            : 'A etapa da Leggacy não será aberta',
        ),
      )
    const meetings = selected()?.meetings || []
    if (meetings.length)
      fields += controlBlock(
        'Reuniões com o cliente',
        `${meetings.includes('alinhamento') ? switchField('reunAlinh', 'Reunião de alinhamento', 'Abre a tarefa de agendar a reunião com o cliente') : ''}${meetings.includes('acompanhamento') ? switchField('reunAcomp', 'Reunião de acompanhamento no 4º mês', 'Abre a etapa da reunião quatro meses depois') : ''}`,
      )
    return fields
  }
  function processFields() {
    const others = selectedType === 'outros'
    const identification = `<div class="form-grid">${input('empresa', feeAdjustment() ? 'Nome do cliente' : 'Nome da empresa', valueOf('empresa'), { required: true, wide: true, max: 200 })}${!others ? input('cnpj', 'CNPJ (opcional)', valueOf('cnpj'), { max: 18 }) : ''}${!others && !feeAdjustment() ? input(startLabels[selectedType] ? 'inicioInat' : 'prazo', `${startLabels[selectedType] || 'Prazo'} (opcional)`, valueOf(startLabels[selectedType] ? 'inicioInat' : 'prazo'), { type: 'date' }) : ''}${!others && !feeAdjustment() && competenceFields[selectedType] ? input(competenceFields[selectedType][0], `${competenceFields[selectedType][1]} (opcional)`, valueOf(competenceFields[selectedType][0]), { type: 'month' }) : ''}</div>`
    const alteration =
      selectedType === 'alteracao'
        ? panel(
            'O que será alterado',
            `<div class="form-grid">${choices('altItens', 'Selecione uma ou mais alterações *', alterations, true)}${textarea('altDesc', 'Dados que serão alterados', valueOf('altDesc'), true)}</div>`,
          )
        : ''
    if (others)
      return `${panel('Dados do processo', identification)}${panel(
        'Atividade solicitada',
        `<div class="form-grid">${input('contato', 'Contato do cliente (opcional)', valueOf('contato'), { wide: true, max: 500 })}${textarea('descricaoProcesso', 'Descrição do processo', valueOf('descricaoProcesso'), true)}${moneyField('valorProcesso', 'Valor do processo', true)}${select(
          'departamentoSolicitado',
          'Solicitar a qual departamento?',
          valueOf('departamentoSolicitado'),
          [
            ['', 'Selecione'],
            ['fin', 'Financeiro'],
            ['reg', 'Regularidade'],
          ],
          { required: true },
        )}${select(
          'acionarLeggacy',
          'Acionar a Leggacy?',
          String(valueOf('acionarLeggacy')),
          [
            ['', 'Selecione'],
            ['true', 'Sim'],
            ['false', 'Não'],
          ],
          { required: true },
        )}</div><p class="field-help">Acionar a Leggacy configura o acompanhamento e as cobranças. O envio externo é realizado e declarado manualmente.</p>`,
      )}`
    return `${panel('Dados do processo', identification)}${alteration}${panel(selectedType === 'alteracao' ? 'Custo da alteração' : 'Definições da Diretoria', `${!feeAdjustment() ? `<p class="field-help director-intro">${selectedType === 'alteracao' ? 'Informe o custo, quem paga e a forma de pagamento para concluir as definições da alteração.' : DIRECT_LOSS_TYPES.includes(selectedType) ? 'O honorário perdido é obrigatório neste tipo. As demais definições podem ser completadas depois.' : 'Opcional agora. Definições completas concluem as tarefas correspondentes automaticamente.'}</p>` : ''}${directorFields()}`, 'director-panel')}${!feeAdjustment() ? panel('Observações', textarea('obs', 'Particularidades do processo (opcional)', valueOf('obs'))) : ''}`
  }
  function chooserCards(query = '') {
    const normalized = query
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('pt-BR')
    const matches = typeCatalog.filter((type) =>
      `${type.name} ${type.description}`
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLocaleLowerCase('pt-BR')
        .includes(normalized),
    )
    document.querySelector('[data-type-count]').textContent =
      `${matches.length} de ${typeCatalog.length} tipos`
    document.querySelector('[data-type-grid]').innerHTML =
      matches
        .map(
          (type) =>
            `<button type="button" class="type-card" data-type="${type.id}"><span class="type-symbol" aria-hidden="true">${type.symbol}</span><span><b class="type-name">${type.name}</b><span class="type-description">${type.description}</span></span><span class="type-arrow" aria-hidden="true">›</span></button>`,
        )
        .join('') ||
      '<div class="type-empty">Nenhum tipo encontrado. Ajuste a busca.</div>'
    document.querySelectorAll('[data-type]').forEach((button) =>
      button.addEventListener('click', () => {
        selectedType = button.dataset.type
        dirty = false
        renderProcess()
      }),
    )
  }
  function processCompatibleKeys(type) {
    const common = ['empresa', 'contato', 'cnpj']
    if (!type) return common
    if (['aumento_honorarios', 'reducao_honorarios'].includes(type.id))
      return [...common, 'honAnterior', 'honorario', 'honCobranca']
    if (type.id === 'outros')
      return [
        'empresa',
        'contato',
        'descricaoProcesso',
        'valorProcesso',
        'departamentoSolicitado',
        'acionarLeggacy',
      ]
    return [
      ...common,
      'obs',
      startLabels[type.id] ? 'inicioInat' : 'prazo',
      ...(competenceFields[type.id] ? [competenceFields[type.id][0]] : []),
      ...(type.fields.includes('custo') || type.id === 'alteracao'
        ? ['custo', 'pagador', 'parcelas', 'paymentMode']
        : []),
      ...(type.fields.includes('honorario')
        ? ['honorario', 'honCobranca', 'trab', 'trabQtd', 'trabValor']
        : []),
      ...(type.fields.includes('regime') ? ['regime', 'regimeObs'] : []),
      ...(type.id === 'inativa' ? ['honAnterior'] : []),
      ...(DIRECT_LOSS_TYPES.includes(type.id) ? ['honPerdido'] : []),
      ...(LOSS_TYPES.includes(type.id) ? ['motivo', 'motivoObs'] : []),
      ...(type.id === 'alteracao' ? ['altItens', 'altDesc'] : []),
      ...(type.id === 'saida'
        ? ['novoContador', 'contadorNome', 'contadorContato']
        : []),
      ...(type.id === 'reativacao' ? ['reatJunta'] : []),
      ...(type.meetings.includes('alinhamento') ? ['reunAlinh'] : []),
      ...(type.meetings.includes('acompanhamento') ? ['reunAcomp'] : []),
    ]
  }
  async function switchType(next) {
    if (next === selectedType) return
    if (
      dirty &&
      !(await Review.confirm({
        title: 'Trocar tipo de processo?',
        body: 'Os campos comuns serão mantidos. Dados que não se aplicam ao novo tipo serão removidos.',
        confirmLabel: 'Trocar tipo',
      }))
    ) {
      const selector = document.querySelector('[data-compact-type]')
      if (selector) selector.value = selectedType
      return
    }
    const keys = processCompatibleKeys(
      typeCatalog.find((type) => type.id === next),
    )
    processValues = {
      reunAlinh: true,
      reunAcomp: true,
      reatJunta: true,
      ...Object.fromEntries(
        Object.entries(processValues).filter(([key]) => keys.includes(key)),
      ),
    }
    selectedType = next
    dirty = false
    renderProcess()
  }
  function validateProcess(form) {
    const required = [['empresa', 'Informe o nome da empresa.']]
    if (feeAdjustment())
      required.push(
        ['honAnterior', 'Informe o honorário anterior.'],
        ['honorario', 'Informe o novo honorário contábil.'],
      )
    if (DIRECT_LOSS_TYPES.includes(selectedType))
      required.push([
        'honPerdido',
        'Informe o honorário mensal que deixa de ser cobrado.',
      ])
    if (selectedType === 'alteracao')
      required.push(
        ['altDesc', 'Descreva os dados que serão alterados.'],
        ['custo', 'Informe o custo da alteração.'],
        ['pagador', 'Informe quem paga.'],
      )
    if (selectedType === 'saida' && processValues.novoContador)
      required.push(
        ['contadorNome', 'Informe o nome do novo contador.'],
        ['contadorContato', 'Informe o contato do novo contador.'],
      )
    if (selectedType === 'outros')
      required.push(
        ['descricaoProcesso', 'Informe a descrição do processo.'],
        ['valorProcesso', 'Informe o valor do processo, inclusive zero.'],
        ['departamentoSolicitado', 'Selecione o departamento.'],
        ['acionarLeggacy', 'Selecione Sim ou Não.'],
      )
    if (!validate(form, required)) return false
    if (
      selectedType === 'alteracao' &&
      !(processValues.altItens || []).length
    ) {
      form.querySelector('#altItens-error').textContent =
        'Selecione o que será alterado.'
      form.querySelector('[data-pick="altItens"]').focus()
      return false
    }
    if (selectedType === 'alteracao' && !processValues.parcelas) {
      form.querySelector('#paymentMode-error').textContent =
        'Informe a forma de pagamento.'
      return false
    }
    if (
      hasCost() &&
      processValues.paymentMode === 'parcelado' &&
      (!Number.isInteger(Number(processValues.parcelas)) ||
        Number(processValues.parcelas) < 2 ||
        Number(processValues.parcelas) > 360)
    ) {
      fieldError(form, 'parcelas', 'Informe de 2 a 360 parcelas.')?.focus()
      return false
    }
    if (feeAdjustment()) {
      const previous = cents(valueOf('honAnterior'))
      const current = cents(valueOf('honorario'))
      if (
        previous === null ||
        current === null ||
        (selectedType === 'aumento_honorarios'
          ? current <= previous
          : current >= previous)
      ) {
        fieldError(
          form,
          'honorario',
          selectedType === 'aumento_honorarios'
            ? 'O novo honorário deve ser maior que o anterior.'
            : 'O novo honorário deve ser menor que o anterior.',
        )?.focus()
        return false
      }
    }
    return true
  }
  function renderProcess() {
    const type = selected()
    const chooser =
      '<div class="type-selection-toolbar"><label class="field"><span class="sr-only">Buscar tipo de processo</span><input type="search" data-type-search placeholder="Buscar tipo de processo" autocomplete="off"></label><span class="type-count" data-type-count></span></div><div class="type-grid" data-type-grid></div>'
    const form = type
      ? `<div class="selected-type"><label class="field"><span>Tipo de processo</span><select data-compact-type aria-label="Tipo de processo">${typeCatalog.map((item) => option(item.id, item.name, selectedType)).join('')}</select></label><button type="button" class="button ghost" data-choose-again>Ver todos os tipos</button></div><form id="process-review-form" novalidate><div class="process-error-summary" role="alert" data-process-error></div><div class="process-form-layout"><div class="process-sections">${processFields()}</div><aside>${panel('Etapas do processo', `<ol class="process-steps">${type.stages.map((step) => `<li>${step}</li>`).join('')}</ol>`)}</aside></div><div class="notice process-open-notice">Ao abrir, os envolvidos com acesso a Processos serão notificados por e-mail.</div><footer class="operation-footer"><span class="draft-state" data-draft-state></span><div class="actions"><button type="button" class="button" data-cancel-process>Cancelar</button><button type="submit" class="button primary" data-save-process>Abrir processo</button></div></footer></form>`
      : chooser
    Review.mount({
      id: 'P04',
      title: 'Processos · Escolha e formulário',
      module: 'Processos',
      nav: navProcess,
      content: `<div class="operation-view">${form}</div>`,
      notes: [
        'Todos os 13 tipos continuam com o mesmo peso. O nome ocupa as duas colunas e Protocolo externo foi retirado, conforme a revisão.',
        'Definições da Diretoria, condicionais, campos obrigatórios e regras foram conferidos em ProcessForm.tsx, ProcessFields.tsx e processFormUtils.ts. Dados dos fluxos vêm do catálogo usado pelo React, não do HTML antigo.',
        'Teste parcelamento, folha, reuniões, contador de saída, inatividade, Junta/Leggacy e os dois reajustes. Dinheiro e CNPJ aceitam números com máscara. Dados demonstrativos: salvar não cria processos nem envia e-mails.',
      ],
      before: '../../docs/auditoria-ux/evidencias/19-processos-form-tipo.png',
    })
    if (!type) {
      chooserCards()
      document
        .querySelector('[data-type-search]')
        .addEventListener('input', (event) => chooserCards(event.target.value))
      return
    }
    document
      .querySelector('[data-compact-type]')
      .addEventListener('change', (event) => switchType(event.target.value))
    document
      .querySelector('[data-choose-again]')
      .addEventListener('click', () => switchType(''))
    const formNode = document.getElementById('process-review-form')
    const store = (control) => {
      if (control.name === 'cnpj') control.value = normalizeCnpj(control.value)
      processValues[control.name] =
        control.type === 'checkbox' ? control.checked : control.value
      if (control.name === 'acionarLeggacy' && control.value !== '')
        processValues[control.name] = control.value === 'true'
      dirty = true
      clearError(control)
      document.querySelector('[data-process-error]').textContent = ''
      setDraft()
      updateProcessCalculations()
    }
    formNode.addEventListener('input', (event) => {
      if (event.target.name) store(event.target)
    })
    formNode.addEventListener('change', (event) => {
      const control = event.target
      if (!control.name) return
      store(control)
      if (control.type === 'checkbox') renderProcess()
    })
    formNode.querySelectorAll('[data-pick]').forEach((button) =>
      button.addEventListener('click', () => {
        const name = button.dataset.pick
        const value = button.dataset.value
        if (button.hasAttribute('data-multiple')) {
          const prior = processValues[name] || []
          processValues[name] = prior.includes(value)
            ? prior.filter((item) => item !== value)
            : [...prior, value]
        } else
          processValues[name] =
            processValues[name] === value && ['regime', 'motivo'].includes(name)
              ? ''
              : value
        if (name === 'paymentMode')
          processValues.parcelas =
            value === 'vista'
              ? 1
              : Math.max(2, Number(processValues.parcelas) || 2)
        dirty = true
        renderProcess()
      }),
    )
    formNode.addEventListener('submit', (event) => {
      event.preventDefault()
      if (!validateProcess(formNode)) {
        document.querySelector('[data-process-error]').textContent =
          'Revise os campos indicados antes de abrir o processo.'
        return
      }
      dirty = false
      setDraft()
      Review.toast(
        'Processo salvo apenas nesta prévia. Nenhum e-mail foi enviado.',
      )
    })
    document
      .querySelector('[data-cancel-process]')
      .addEventListener('click', async () => {
        if (!(await confirmLeave())) return
        processValues = { reunAlinh: true, reunAcomp: true, reatJunta: true }
        selectedType = ''
        dirty = false
        renderProcess()
      })
    Review.inputs?.decorate(formNode)
    const cnpj = formNode.elements.namedItem('cnpj')
    if (cnpj) cnpj.inputMode = 'numeric'
    updateProcessCalculations()
    setDraft()
  }
  const proposal = document.body.dataset.proposal
  if (proposal === 'P03-catalogo') catalog()
  if (proposal === 'P03') renderRoutine()
  if (proposal === 'P04') renderProcess()
})()
