/* global Review, window, document, URLSearchParams */
;(() => {
  'use strict'
  const store = window.JaralCompaniesPreview
  const { esc, icon } = Review
  window.JaralCompanyFlow = {
    select({ module, onSelect }) {
      const dialog = document.createElement('dialog')
      dialog.className = 'dialog company-choice-form'
      dialog.setAttribute('aria-label', `Selecionar empresa para ${module}`)
      let mode = 'existing',
        selectedId = '',
        dirty = false
      let unmountCombobox = null
      const values = {
        name: '',
        legalName: '',
        code: '',
        cnpj: '',
        email: '',
        phone: '',
        taxRegime: '',
      }
      const origin = document.activeElement
      async function close() {
        if (
          dirty &&
          !(await Review.confirm({
            title: 'Descartar o cadastro da empresa?',
            body: 'Os dados desta empresa ainda não foram cadastrados.',
            confirmLabel: 'Descartar',
          }))
        )
          return
        dialog.close()
        unmountCombobox?.()
        dialog.remove()
        if (origin?.isConnected) origin.focus()
      }
      function select(company) {
        dirty = false
        dialog.close()
        unmountCombobox?.()
        dialog.remove()
        onSelect(company)
      }
      const field = (name, label, settings = '') =>
        `<label class="field"><span>${label}${name === 'name' ? ' *' : ''}</span><input name="${name}" value="${esc(values[name])}" ${settings} ${name === 'name' ? 'required maxlength="160"' : ''}></label>`
      function render() {
        unmountCombobox?.()
        unmountCombobox = null
        dialog.innerHTML = `<header class="dialog-head"><h2>Empresa para ${esc(module)}</h2><button class="button ghost" data-company-close aria-label="Fechar">${icon('x')}</button></header><form id="company-selection-form"><div class="dialog-body"><div class="company-context-banner"><strong>Uma empresa, um cadastro</strong><p>Escolha uma empresa cadastrada ou cadastre uma nova. Os dados de ${esc(module)} ficam vinculados a ela.</p></div><div class="company-link-choices" role="group" aria-label="Origem da empresa"><button type="button" class="button ${mode === 'existing' ? 'primary' : ''}" data-company-mode="existing" aria-pressed="${mode === 'existing'}">Empresa existente</button><button type="button" class="button ${mode === 'new' ? 'primary' : ''}" data-company-mode="new" aria-pressed="${mode === 'new'}">Nova empresa</button></div><div class="company-link-error" role="alert" id="company-flow-error"></div>${mode === 'existing' ? `<div data-company-combobox></div>` : `<div class="form-grid">${field('name', 'Nome fantasia')}${field('legalName', 'Razão social', 'maxlength="200"')}${field('code', 'Código', 'maxlength="32"')}${field('cnpj', 'CNPJ', 'data-format="cnpj" maxlength="18"')}${field('email', 'E-mail', 'type="email"')}${field('phone', 'Telefone', 'type="tel"')}<label class="field"><span>Regime tributário cadastral</span><select name="taxRegime"><option value="">Não informado</option>${['Simples Nacional', 'Lucro Presumido', 'Lucro Real', 'MEI'].map((regime) => `<option${values.taxRegime === regime ? ' selected' : ''}>${regime}</option>`).join('')}</select></label></div>`}</div><footer class="dialog-footer"><button type="button" class="button" data-company-close>Cancelar</button><button type="submit" class="button primary">${mode === 'existing' ? 'Usar esta empresa' : 'Cadastrar empresa e continuar'}</button></footer></form>`
        Review.inputs.decorate(dialog)
        if (mode === 'existing') {
          unmountCombobox = window.JaralCombobox.mount(
            dialog.querySelector('[data-company-combobox]'),
            {
              id: 'company-flow-existing',
              name: 'companyId',
              label: 'Empresa *',
              placeholder: 'Busque por nome, código ou CNPJ',
              required: true,
              value: selectedId || null,
              options: store
                .list()
                .filter((company) => company.status === 'active')
                .map((company) => ({
                  value: company.id,
                  label: company.name,
                  description: `${company.cnpj || 'CNPJ não informado'} · Código ${company.code || 'não informado'}`,
                  keywords: [
                    company.code || '',
                    company.cnpj || '',
                    (company.cnpj || '').replace(/\D/g, ''),
                  ],
                })),
              onValueChange: (value) => {
                selectedId = value || ''
              },
              emptyMessage:
                'Nenhuma empresa encontrada. Tente outro nome, código ou CNPJ.',
            },
          )
        }
        dialog
          .querySelectorAll('[data-company-close]')
          .forEach((button) =>
            button.addEventListener('click', () => void close()),
          )
        dialog.querySelectorAll('[data-company-mode]').forEach((button) =>
          button.addEventListener('click', () => {
            mode = button.dataset.companyMode
            render()
          }),
        )
        dialog.querySelectorAll('[name]').forEach((field) =>
          field.addEventListener('input', () => {
            if (!Object.hasOwn(values, field.name)) return
            values[field.name] = field.value
            dirty = true
          }),
        )
        dialog
          .querySelector('[name=taxRegime]')
          ?.addEventListener('change', (event) => {
            values.taxRegime = event.target.value
            dirty = true
          })
        dialog
          .querySelector('#company-selection-form')
          .addEventListener('submit', (event) => {
            event.preventDefault()
            if (mode === 'existing') {
              const company = store.get(selectedId)
              if (company) select(company)
              return
            }
            const error = dialog.querySelector('#company-flow-error')
            try {
              select(store.create(values))
              Review.toast(
                `Empresa cadastrada na demonstração. Continue em ${module}.`,
              )
            } catch (failure) {
              const duplicate = store.duplicate(values.cnpj)
              error.innerHTML = `${esc(failure.message)}${duplicate?.status === 'active' ? '<br><button type="button" class="button small" id="use-duplicate">Usar empresa já cadastrada</button>' : ''}`
              dialog
                .querySelector('#use-duplicate')
                ?.addEventListener('click', () =>
                  select(store.get(duplicate.id)),
                )
            }
          })
      }
      dialog.addEventListener('cancel', (event) => {
        event.preventDefault()
        void close()
      })
      document.body.append(dialog)
      render()
      dialog.showModal()
    },
  }
  if (document.body.dataset.proposal !== 'P18') return
  const params = new URLSearchParams(window.location.search)
  let company = store.get(params.get('empresa')) || store.list()[0]
  let department = store.getRoutines(company.id)?.department || 'Fiscal'
  let routineDirty = false
  const routineNames = {
    das: 'Apurar e enviar DAS',
    dctfweb: 'DCTFWeb',
    notas: 'Conferir notas fiscais',
    folha: 'Folha de pagamento',
    ferias: 'Conferir férias',
    balancete: 'Balancete mensal',
    balanco: 'Conferir balanço',
  }
  const routineDepartments = {
    Fiscal: ['das', 'dctfweb', 'notas'],
    Contábil: ['balancete', 'balanco'],
    Pessoal: ['folha', 'ferias'],
  }
  const screensByDepartment = {
    Fiscal: ['Simples Nacional', 'Lucro Presumido', 'Lucro Real'],
    Contábil: ['Contábil'],
    Pessoal: ['Departamento pessoal'],
  }
  const settingsFor = () =>
    store.getRoutines(company.id)?.contexts?.[department] ||
    (store.getRoutines(company.id)?.department === department
      ? store.getRoutines(company.id)
      : null) || {
      department,
      screen: screensByDepartment[department][0],
      startsOn: '',
      routineIds: [],
    }
  const mayChangeContext = async () =>
    !routineDirty ||
    Review.confirm({
      title: 'Descartar alterações de Rotinas?',
      body: 'A configuração deste departamento ainda não foi salva.',
      confirmLabel: 'Descartar',
    })
  window.addEventListener('beforeunload', (event) => {
    if (routineDirty) {
      event.preventDefault()
      event.returnValue = ''
    }
  })
  const option = (value, selected) =>
    `<option${value === selected ? ' selected' : ''}>${value}</option>`
  function render() {
    const settings = settingsFor()
    const currentContext = store.getRoutines(company.id)
    const configuredForDepartment = !!(
      currentContext?.contexts?.[department] ||
      currentContext?.department === department
    )
    const root = Review.mount({
      id: 'P18',
      title: 'Empresas em Rotinas',
      module: 'Rotinas',
      nav: [
        { label: 'Início', icon: 'home', href: 'dashboard-rotinas.html' },
        { label: 'Fiscal', icon: 'grid', href: 'base-visual.html' },
        {
          label: 'Empresas',
          icon: 'building',
          href: 'empresas-modulos.html',
          active: true,
        },
        { label: 'Rotinas', icon: 'refresh', href: 'catalogo-rotinas.html' },
      ],
      actions:
        '<button class="button primary" id="routine-add-company">Adicionar empresa às Rotinas</button>',
      content: `<div class="company-module-page"><section class="panel"><header class="panel-head"><h2>Empresa</h2><a class="button small" href="empresas.html?empresa=${encodeURIComponent(company.id)}">Cadastro central</a></header><div class="panel-body"><label class="field"><span>Selecionar empresa cadastrada</span><select id="module-company">${store
        .list()
        .map(
          (item) =>
            `<option value="${item.id}"${company.id === item.id ? ' selected' : ''}>${esc(item.name)} · ${esc(item.code)}${item.status === 'archived' ? ' · Arquivada' : ''}</option>`,
        )
        .join(
          '',
        )}</select></label><dl class="company-shared-identity" style="margin-top:18px"><div><dt>CNPJ · Código</dt><dd>${esc(company.cnpj || 'Não informado')} · ${esc(company.code || 'Não informado')}</dd></div><div><dt>Situação cadastral</dt><dd>${company.status === 'archived' ? 'Arquivada' : 'Ativa'}</dd></div></dl></div></section><section class="panel"><header class="panel-head"><h2>Configuração em Rotinas</h2><span class="badge">${configuredForDepartment ? 'Configuração cadastrada' : 'Sem configuração'}</span></header><div class="panel-body">${company.status === 'archived' ? '<p class="notice">A empresa está arquivada. A configuração pode ser consultada; restaure-a no cadastro central para alterar seus vínculos.</p>' : ''}<form id="routine-company-form"><fieldset ${company.status === 'archived' ? 'disabled' : ''} style="border:0;margin:0;padding:0"><div class="form-grid"><label class="field"><span>Departamento</span><select name="department">${['Fiscal', 'Contábil', 'Pessoal'].map((value) => option(value, settings.department)).join('')}</select></label><label class="field"><span>Tela operacional</span><select name="screen">${screensByDepartment[department].map((value) => option(value, settings.screen)).join('')}</select></label><label class="field"><span>Início dos vínculos</span><input name="startsOn" type="date" value="${esc(settings.startsOn)}"></label></div><fieldset style="border:0;padding:0;margin:24px 0 0"><legend>Rotinas vinculadas</legend><div class="routine-setup-checks">${Object.entries(
        routineNames,
      )
        .filter(([id]) => routineDepartments[department].includes(id))
        .map(
          ([id, label]) =>
            `<label><input type="checkbox" name="routineIds" value="${id}"${settings.routineIds.includes(id) ? ' checked' : ''}>${label}</label>`,
        )
        .join(
          '',
        )}</div></fieldset><p class="company-link-error" id="routine-company-error" role="alert"></p><div class="routine-setup-footer"><a class="button" href="empresas.html?empresa=${encodeURIComponent(company.id)}">Consultar empresa</a><button class="button primary" type="submit">Salvar configuração de Rotinas</button></div></fieldset></form></div></section><section class="panel"><header class="panel-head"><h2>Mesma empresa em outros módulos</h2></header><div class="panel-body"><div class="company-module-summary"><a href="clientes-honorarios.html?empresa=${encodeURIComponent(company.id)}"><span><strong>Honorários</strong><small>${store.getProfile(company.id) ? 'Perfil financeiro cadastrado' : 'Empresa disponível · sem dados financeiros'}</small></span><span>${store.getProfile(company.id) ? 'Consultar perfil' : 'Configurar honorários'} ›</span></a></div></div></section></div>`,
      notes: [
        'Uma identidade central compartilhada. Não há cópia independente do nome ou CNPJ nos módulos. Cada módulo mantém seus vínculos, perfil e permissões.',
        'A criação escolhe uma empresa existente ou cadastra uma nova explicitamente, antes de configurar os vínculos. Cancelar a configuração não apaga uma empresa já cadastrada.',
        'Dados fictícios persistidos somente neste navegador. A escolha de telas e rotinas ilustra o vínculo; não é migração de contratos nem criação real de tarefas.',
        'O cadastro central oferece acessos aos módulos permitidos. Esta conta demonstrativa possui administração de Empresas, Rotinas e Honorários.',
      ],
    })
    root
      .querySelector('#module-company')
      .addEventListener('change', async (event) => {
        if (!(await mayChangeContext())) {
          event.target.value = company.id
          return
        }
        company = store.get(event.target.value)
        department = store.getRoutines(company.id)?.department || 'Fiscal'
        routineDirty = false
        render()
      })
    root
      .querySelector('#routine-add-company')
      .addEventListener('click', async () => {
        if (!(await mayChangeContext())) return
        routineDirty = false
        window.JaralCompanyFlow.select({
          module: 'Rotinas',
          onSelect: (selected) => {
            company = selected
            department = store.getRoutines(company.id)?.department || 'Fiscal'
            render()
            document
              .querySelector('#routine-company-form')
              ?.scrollIntoView({ block: 'start' })
          },
        })
      })
    root
      .querySelector('#routine-company-form')
      .addEventListener('input', (event) => {
        if (event.target.name !== 'department') routineDirty = true
      })
    root
      .querySelector('[name=department]')
      .addEventListener('change', async (event) => {
        if (!(await mayChangeContext())) {
          event.target.value = department
          return
        }
        department = event.target.value
        routineDirty = false
        render()
      })
    root
      .querySelector('#routine-company-form')
      .addEventListener('submit', (event) => {
        event.preventDefault()
        const form = event.currentTarget
        const routineIds = [
          ...form.querySelectorAll('[name=routineIds]:checked'),
        ].map((input) => input.value)
        if (routineIds.length && !form.elements.startsOn.value) {
          root.querySelector('#routine-company-error').textContent =
            'Informe o início dos vínculos selecionados.'
          form.elements.startsOn.focus()
          return
        }
        store.setRoutines(company.id, {
          department: form.elements.department.value,
          screen: form.elements.screen.value,
          startsOn: form.elements.startsOn.value,
          routineIds,
        })
        routineDirty = false
        render()
        Review.toast(
          'Configuração vinculada à mesma empresa, somente nesta demonstração.',
        )
      })
  }
  render()
  if (params.get('acao') === 'adicionar')
    document.getElementById('routine-add-company')?.click()
})()
