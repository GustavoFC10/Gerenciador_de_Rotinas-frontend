/* global Review, window, document, location, history, URLSearchParams */
;(() => {
  const { esc, icon } = Review
  const model = window.HonorariosModelo
  const params = JSON.parse(JSON.stringify(model.params))
  const money = (value) =>
    Number(value).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    })
  let companies = Array.from({ length: 300 }, (_, i) => ({
    id: `empresa-${i + 1}`,
    name: `${['Aurora Comércio', 'Horizonte Serviços', 'Cedro Tecnologia', 'Norte Saúde', 'Ponte Engenharia', 'Solar Arquitetura'][i % 6]} ${String(i + 1).padStart(3, '0')} Ltda.`,
    code: String(i + 1).padStart(4, '0'),
    cnpj: `00.${String(100 + i)}.000/0001-00`,
  }))
  let rows = Array.from({ length: 10 }, (_, i) => ({
    ...companies[i],
    fee: [680, 540, 900, 1200, 470, 850, 1800, 760, 600, 1150][i],
    suggested: [850, 620, 900, 1500, 550, 850, 2200, 700, 680, 1300][i],
    due: i % 3 === 0,
    date: '2025-11-15',
    contact: 'Financeiro · (41) 90000-0000',
    notes: '',
    regime: ['simples', 'presumido', 'real', 'mei'][i % 4],
    segmento: 'servicos',
    faturamento: 60000,
    funcionarios: 3,
    socios: 2,
    xml: 150,
    emiteNF: true,
    notas: 20,
    filiais: 0,
    filiaisInativas: 0,
    inativa: false,
    usarHoras: false,
    horas: 10,
    servicos: [],
    anomalias: [],
  }))
  if (
    ['P11', 'P12'].includes(document.body.dataset.proposal) &&
    window.JaralCompaniesPreview
  ) {
    companies = window.JaralCompaniesPreview.list()
    rows = window.JaralCompaniesPreview.profileRows()
    if (document.body.dataset.proposal === 'P12')
      rows = rows.filter(
        (row) =>
          row.status === 'active' &&
          !row.archivedAt &&
          typeof row.fee === 'number' &&
          Number.isFinite(row.fee) &&
          typeof row.suggested === 'number' &&
          Number.isFinite(row.suggested),
      )
  }
  const alignment = (row) =>
    row.fee < row.suggested * 0.95
      ? 'abaixo'
      : row.fee > row.suggested * 1.05
        ? 'acima'
        : 'alinhado'
  const alignmentLabels = {
    abaixo: 'Podem aumentar',
    alinhado: 'Alinhados',
    acima: 'Acima',
  }
  const savedQuotes = [
    ['2026-018', 'Simulação — prestação de serviços', 620, 'Aceito'],
    ['2026-017', 'Novo comércio — estimativa', 850, 'Enviado'],
    ['2026-016', 'Simulação de abertura', 450, 'Rascunho'],
    ['2026-015', 'Estudo — prestação de serviços', 780, 'Recusado'],
  ].map(([numero, prospect, valor, status], index) => ({
    numero,
    prospect,
    valor,
    status,
    contato: 'Mariana Costa · contato@exemplo.invalid',
    criadoEm: '2026-11-12T12:00:00',
    validadeDias: 15,
    decimoTerceiro: true,
    inicioCobranca: '1a_competencia',
    abertura: { valor: index === 2 ? 1800 : 0, parcelas: 3 },
    inp: {
      regime: 'simples',
      segmento: index === 1 ? 'comercio' : 'servicos',
      faturamento: 60000,
      funcionarios: 3,
      socios: 2,
      xml: 150,
      emiteNF: true,
      notas: 20,
      filiais: 0,
      filiaisInativas: 0,
      inativa: false,
      usarHoras: false,
      horas: 10,
      servicos: [],
      anomalias: [],
    },
    planos: [],
    ofertarPlanos: false,
  }))
  const nav = (active) => [
    {
      label: 'Painel',
      icon: 'home',
      href: 'painel-honorarios.html',
      active: active === 'painel',
    },
    {
      label: 'Orçamentos',
      icon: 'file',
      href: 'orcamentos-honorarios.html',
      active: active === 'orcar',
    },
    {
      label: 'Clientes',
      icon: 'building',
      href: 'clientes-honorarios.html',
      active: active === 'clientes',
    },
    {
      label: 'Parâmetros',
      icon: 'settings',
      href: 'parametros.html',
      active: active === 'parametros',
    },
  ]
  const panel = (title, body, actions = '') =>
    `<section class="panel"><header class="panel-head"><h2>${title}</h2>${actions}</header><div class="panel-body">${body}</div></section>`
  const input = (label, name, value, type = 'text') =>
    `<label class="field"><span>${label}</span><input name="${name}" type="${type}" value="${esc(value)}"></label>`
  const numberValue = (input) =>
    input.dataset.format === 'money'
      ? Review.inputs.decimal(input.value)
      : input.dataset.format === 'integer'
        ? Number(input.value.replaceAll('.', '').replace(',', '.'))
        : Number(input.value)
  function mount(
    id,
    title,
    active,
    content,
    before,
    extraNotes = [],
    actions = '',
  ) {
    Review.mount({
      id,
      title,
      module: 'Honorários',
      nav: nav(active),
      actions,
      content: `<div class="hon-preview">${content}</div>`,
      before,
      notes: [
        'Restauração da organização do HTML aprovado. Esta prévia usa dados fictícios, valores de cenário e nenhuma API.',
        'O cadastro central é único. O vínculo do perfil de Honorários com uma empresa é obrigatório; uma nova empresa é cadastrada explicitamente antes do perfil.',
        ...extraNotes,
      ],
    })
    document
      .querySelector('.review-tools')
      .insertAdjacentHTML(
        'afterbegin',
        '<a href="../../docs/honorarios_base/honorarios-jaralcon%20(1).html" target="_blank" rel="noopener">Modelo HTML ↗</a>',
      )
    return document.querySelector('.hon-preview')
  }
  function clients() {
    const query = new URLSearchParams(location.search)
    let search = query.get('q') || '',
      filter = query.get('filtro') || 'todos',
      order = query.get('ordem') || 'gap',
      currentPage = 1
    const root = mount(
      'P11',
      'Gestão de clientes',
      'clientes',
      `<div class="toolbar hon-client-actions"><button class="button" id="hon-import">${icon('file')} Importar carteira</button><button class="button" id="hon-export">Exportar</button><button class="button primary" id="hon-new-client">${icon('plus')} Novo cliente</button></div><div class="hon-company-counts" id="hon-company-counts"></div><section class="panel"><div class="panel-body hon-client-tools"><label class="search-field">${icon('search')}<input type="search" id="hon-search" aria-label="Buscar empresa ou cliente" placeholder="Buscar por nome, código ou CNPJ" value="${esc(search)}"></label><div class="hon-filter-group" id="hon-filters" role="group" aria-label="Situação dos clientes"></div><select id="hon-order" aria-label="Ordenar clientes"><option value="gap">Maior defasagem</option><option value="atual">Maior honorário</option><option value="nome">Nome</option></select></div><div class="table-wrap"><table><thead><tr><th scope="col">Empresa</th><th scope="col">Cobra hoje</th><th scope="col">Pelos parâmetros</th><th scope="col">Diferença mensal</th></tr></thead><tbody id="hon-rows"></tbody></table></div><footer class="pagination"><span id="hon-client-count"></span><div class="hon-company-pages"><button class="button small" id="hon-prev-page">Anterior</button><button class="button small" id="hon-next-page">Próxima</button></div></footer></section>`,
      '../../docs/auditoria-ux/evidencias/23-honorarios-clientes.png',
      [
        'Retoma filtros e colunas comerciais de vClientes. A ficha conserva comparação → Identificação e contrato → grupos de cálculo → Observações.',
        'A busca e os filtros ficam preservados ao abrir e fechar a ficha. Importação e exportação não são executadas pela prévia; o desenho das ações atuais é preservado.',
        'Todas as empresas do cadastro central aparecem. Sem dados significa ausência de perfil financeiro, nunca honorário zero. Reajustes e indicadores financeiros usam somente perfis cadastrados.',
      ],
    )
    const status = alignment
    const labels = alignmentLabels
    function render() {
      const allRows = companies.map((company) => {
        const profile = rows.find((row) => row.id === company.id)
        return profile
          ? { ...profile, hasProfile: true }
          : { ...company, hasProfile: false }
      })
      const matches = allRows
        .filter(
          (row) =>
            (filter === 'todos' ||
              (filter === 'semDados'
                ? !row.hasProfile
                : row.hasProfile &&
                  (filter === 'cadastrados' ||
                    (filter === 'reajuste'
                      ? row.due
                      : filter === status(row))))) &&
            `${row.name} ${row.code} ${row.cnpj}`
              .toLowerCase()
              .includes(search.toLowerCase()),
        )
        .sort(
          order === 'nome'
            ? (a, b) => a.name.localeCompare(b.name)
            : order === 'atual'
              ? (a, b) =>
                  Number(b.hasProfile) - Number(a.hasProfile) ||
                  (b.fee || 0) - (a.fee || 0)
              : (a, b) =>
                  Number(b.hasProfile) - Number(a.hasProfile) ||
                  (a.hasProfile
                    ? a.fee - a.suggested - (b.fee - b.suggested)
                    : a.name.localeCompare(b.name)),
        )
      root.querySelector('#hon-filters').innerHTML = [
        ['todos', 'Todos'],
        ['cadastrados', 'Com dados'],
        ['semDados', 'Sem dados'],
        ['abaixo', 'Podem aumentar'],
        ['alinhado', 'Alinhados'],
        ['acima', 'Acima'],
        ['reajuste', 'Reajuste anual'],
      ]
        .map(
          ([id, label]) =>
            `<button class="button small ${filter === id ? 'primary' : ''}" data-filter="${id}" aria-pressed="${filter === id}">${label}<span>${id === 'todos' ? companies.length : id === 'semDados' ? companies.length - rows.length : rows.filter((row) => id === 'cadastrados' || (id === 'reajuste' ? row.due : id === status(row))).length}</span></button>`,
        )
        .join('')
      currentPage = Math.min(
        Math.max(1, currentPage),
        Math.max(1, Math.ceil(matches.length / 20)),
      )
      root.querySelector('#hon-rows').innerHTML =
        matches
          .slice((currentPage - 1) * 20, currentPage * 20)
          .map(
            (row) =>
              `<tr data-client="${row.id}" aria-label="Abrir ficha de ${esc(row.name)}"><td><strong>${esc(row.name)}</strong><small>${esc(row.cnpj)} · Código ${row.code}${row.due ? ' · Reajuste anual' : ''}${row.status === 'archived' ? ' · Arquivada' : ''}</small></td>${row.hasProfile ? `<td class="numeric">${money(row.fee)}</td><td class="numeric">${money(row.suggested)}</td><td class="numeric"><strong class="hon-difference hon-tone-${status(row)}">${status(row) === 'abaixo' ? `+${money(row.suggested - row.fee)}/mês` : status(row) === 'acima' ? `${money(row.fee - row.suggested)} acima` : '—'}</strong><small><span class="hon-client-status hon-tone-${status(row)}">${labels[status(row)]}</span></small></td>` : '<td class="numeric">—</td><td class="numeric">—</td><td class="hon-profile-missing"><strong>Sem dados financeiros</strong>Perfil não cadastrado</td>'}</tr>`,
          )
          .join('') ||
        '<tr><td colspan="4">Nenhum cliente encontrado com esses filtros.</td></tr>'
      Review.rows(root.querySelector('#hon-rows'), {
        selector: 'tr[data-client]',
        onOpen: (row) => {
          const profile = rows.find((item) => item.id === row.dataset.client)
          if (profile) openClient(profile)
          else
            openMissing(
              companies.find((company) => company.id === row.dataset.client),
            )
        },
      })
      root.querySelector('#hon-client-count').textContent =
        `${matches.length ? (currentPage - 1) * 20 + 1 : 0}–${Math.min(currentPage * 20, matches.length)} de ${matches.length} empresas`
      root.querySelector('#hon-company-counts').innerHTML =
        `<span><strong>${companies.length}</strong> empresas no cadastro central</span><span><strong>${rows.length}</strong> com dados financeiros</span><span><strong>${companies.length - rows.length}</strong> sem dados</span>`
      root.querySelector('#hon-prev-page').disabled = currentPage === 1
      root.querySelector('#hon-next-page').disabled =
        currentPage * 20 >= matches.length
      const next = new URLSearchParams()
      if (search) next.set('q', search)
      if (filter !== 'todos') next.set('filtro', filter)
      if (order !== 'gap') next.set('ordem', order)
      try {
        history.replaceState(
          null,
          '',
          location.pathname + (next.size ? `?${next}` : ''),
        )
      } catch {
        /* Local file previews retain their filters in memory. */
      }
    }
    root.querySelector('#hon-order').value = order
    root.querySelector('#hon-search').addEventListener('input', (event) => {
      search = event.target.value
      currentPage = 1
      render()
    })
    root.querySelector('#hon-order').addEventListener('change', (event) => {
      order = event.target.value
      currentPage = 1
      render()
    })
    root.addEventListener('click', (event) => {
      const choice = event.target.closest('[data-filter]')
      if (choice) {
        filter = choice.dataset.filter
        currentPage = 1
        render()
      }
    })
    root
      .querySelector('#hon-new-client')
      .addEventListener('click', () => chooseCompany())
    root.querySelector('#hon-prev-page').addEventListener('click', () => {
      currentPage--
      render()
    })
    root.querySelector('#hon-next-page').addEventListener('click', () => {
      currentPage++
      render()
    })
    root
      .querySelector('#hon-import')
      .addEventListener('click', () =>
        Review.toast(
          'A importação existente permanece no plano; esta prévia não lê nem envia arquivos.',
        ),
      )
    root
      .querySelector('#hon-export')
      .addEventListener('click', () =>
        Review.toast(
          'A exportação existente permanece disponível na aplicação. Aqui os dados são fictícios.',
        ),
      )
    function chooseCompany() {
      window.JaralCompanyFlow.select({
        module: 'Honorários',
        onSelect: (company) => {
          companies = window.JaralCompaniesPreview.list()
          const profile = rows.find((row) => row.id === company.id)
          render()
          openClient(profile || null, company)
        },
      })
    }
    function openMissing(company) {
      const origin = document.activeElement
      const dialog = document.createElement('dialog')
      dialog.className = 'dialog hon-client-dialog hon-preview'
      dialog.setAttribute('aria-label', company.name)
      const close = () => {
        dialog.close()
        dialog.remove()
        if (origin?.isConnected) origin.focus()
      }
      dialog.innerHTML = `<header class="dialog-head"><h2>${esc(company.name)}</h2><button class="button ghost" id="client-close" aria-label="Fechar cliente">${icon('x')}</button></header><div class="dialog-body"><div class="company-context-banner"><strong>Empresa do cadastro central</strong><p>${esc(company.cnpj || 'CNPJ não informado')} · Código ${esc(company.code || 'não informado')}</p></div><section class="hon-empty-profile"><h3>Sem dados financeiros</h3><p>Esta empresa já está cadastrada. Ainda não há perfil, honorário contratado ou data de reajuste em Honorários. Ela aparece na lista, mas não compõe os indicadores financeiros da carteira.</p>${company.status === 'archived' ? '<p class="notice">Empresa arquivada. Restaure-a no cadastro central antes de cadastrar um novo perfil.</p>' : '<button class="button primary" id="configure-honorarios">Configurar honorários</button>'}</section></div><footer class="dialog-footer"><a class="button" href="empresas.html?empresa=${encodeURIComponent(company.id)}">Consultar cadastro central</a><button class="button" id="client-cancel">Fechar</button></footer>`
      dialog.querySelector('#client-close').addEventListener('click', close)
      dialog.querySelector('#client-cancel').addEventListener('click', close)
      dialog
        .querySelector('#configure-honorarios')
        ?.addEventListener('click', () => {
          close()
          openClient(null, company)
        })
      dialog.addEventListener('cancel', (event) => {
        event.preventDefault()
        close()
      })
      document.body.append(dialog)
      dialog.showModal()
    }
    function openClient(source, company = null) {
      let draft = JSON.parse(
          JSON.stringify(
            source || {
              ...(window.JaralCompaniesPreview?.profileTemplate() || rows[0]),
              ...(company || {}),
              id: company?.id || '',
              name: company?.name || '',
              cnpj: company?.cnpj || '',
              contact: '',
              notes: '',
              fee: '',
              date: '',
              company,
            },
          ),
        ),
        dirty = false,
        expanded = {}
      const origin = document.activeElement
      const dialog = document.createElement('dialog')
      dialog.className = 'dialog hon-client-dialog hon-preview'
      dialog.setAttribute('aria-label', source ? draft.name : 'Novo cliente')
      const beforeLeave = (event) => {
        if (dirty) {
          event.preventDefault()
          event.returnValue = ''
        }
      }
      window.addEventListener('beforeunload', beforeLeave)
      async function close() {
        if (
          dirty &&
          !(await Review.confirm({
            title: 'Descartar alterações do cliente?',
            body: 'O perfil ainda não foi salvo.',
            confirmLabel: 'Descartar',
          }))
        )
          return
        dialog.close()
        dialog.remove()
        window.removeEventListener('beforeunload', beforeLeave)
        const replacement = [...root.querySelectorAll('tr[data-client]')].find(
          (row) => row.dataset.client === (source?.id || draft.company?.id),
        )
        ;(origin?.isConnected
          ? origin
          : replacement || root.querySelector('#hon-search')
        ).focus()
      }
      const profileAdjustmentText = (value) =>
        draft.name +
        ': de ' +
        money(draft.fee) +
        ' para ' +
        money(value) +
        '. Confira a data e o valor antes de salvar.'
      function clientCalculation(profile, original) {
        const cost = profile.usarHoras
          ? '<div class="hon-client-cost"><span>Custo da equipe <b>R$ 850,00</b></span><span>Margem no valor atual <b>35%</b></span></div>'
          : ''
        const composition =
          '<details class="hon-client-composition"><summary>Ver composição do valor</summary><dl class="summary-list"><div><dt>Base do segmento e regime</dt><dd>' +
          money(profile.suggested - 150) +
          '</dd></div><div><dt>Adicionais do perfil</dt><dd>R$ 140,00</dd></div><div><dt>Arredondamento</dt><dd>R$ 10,00</dd></div></dl></details>'
        if (!original?.due) return cost + composition
        const locked = profile.fee >= profile.suggested
        const annual =
          [710, 565, 900, 1255, 490, 850, 1880, 760, 625, 1200][
            rows.indexOf(original)
          ] || profile.fee
        return (
          cost +
          composition +
          '<section class="hon-adjustment-card"><header><h3>Reajuste anual</h3><span>12 meses completos</span></header><div class="hon-adjustment-options">' +
          (locked
            ? '<button type="button" data-adjust="' +
              profile.fee +
              '"><span>Manter o valor atual · recomendado</span><strong>' +
              money(profile.fee) +
              '</strong></button>'
            : '<button type="button" data-adjust="' +
              annual +
              '"><span>Aplicar IPCA · exemplo</span><strong>' +
              money(annual) +
              '</strong></button><button type="button" data-adjust="' +
              profile.suggested +
              '"><span>Repactuar ao parâmetro · recomendado</span><strong>' +
              money(profile.suggested) +
              '</strong></button>') +
          '</div><p>O reajuste respeita o limite da tabela. Confira o novo valor antes de confirmar.</p></section>'
        )
      }
      function comparison() {
        if (!source && draft.fee === '')
          return '<p class="notice">A empresa já está vinculada. Informe o honorário contratado e confira o perfil financeiro antes de salvar. O valor pelos parâmetros desta prévia é apenas ilustrativo.</p>'
        const tone = alignment(draft)
        const difference = Math.abs(draft.suggested - draft.fee)
        const text =
          tone === 'abaixo'
            ? `Pode receber mais ${money(difference)} por mês`
            : tone === 'acima'
              ? `${money(difference)} acima dos parâmetros por mês`
              : 'Honorário alinhado aos parâmetros'
        return `<div class="hon-client-comparison hon-tone-${tone}"><div><span>Valor pelos parâmetros</span><strong>${money(draft.suggested)}</strong></div><div class="hon-client-gap"><span>Cobra hoje ${money(draft.fee)}</span><strong>${text}</strong></div></div>`
      }
      function body() {
        dialog.innerHTML = `<header class="dialog-head"><h2>${source ? esc(draft.name) : 'Configurar honorários'}</h2><button class="button ghost" id="client-close" aria-label="Fechar cliente">${icon('x')}</button></header><form id="client-form"><div class="dialog-body">${comparison()}${clientCalculation(draft, source)}<fieldset class="grp hon-contract"><legend>Identificação e contrato</legend>${source || draft.company ? `<dl class="hon-company-identity"><dt>Empresa cadastrada</dt><dd>${esc(draft.name)}</dd><dt>CNPJ · Código</dt><dd>${esc(draft.cnpj || 'Não informado')} · ${esc(draft.code || 'Não informado')}</dd></dl><a class="button small" href="empresas.html?empresa=${encodeURIComponent(draft.id)}">Consultar cadastro central</a>` : `<label class="field"><span>Selecionar empresa existente</span><input id="client-company-query" type="search" placeholder="Nome, código ou CNPJ"><select id="client-company" required aria-label="Empresa cadastrada"><option value="">Selecione uma empresa</option>${companies.map((item) => `<option value="${item.id}">${esc(item.name)} · ${item.code}</option>`).join('')}</select></label>`}<div class="form-grid">${input('Honorário cobrado hoje (R$)', 'fee', draft.fee, 'number')}${input('Início do contrato ou último reajuste', 'date', draft.date, 'date')}${input('Contato', 'contact', draft.contact)}</div></fieldset><div class="hon-original">${model.pricing(draft, 'cliente', params, expanded)}</div><label class="field hon-client-notes"><span>Observações</span><textarea name="notes" rows="3">${esc(draft.notes)}</textarea></label></div><footer class="dialog-footer">${source ? '<a class="button" href="honorarios.html">Gerar orçamento de reajuste</a>' : ''}<button class="button" type="button" id="client-cancel">Cancelar</button><button class="button primary" type="submit">Salvar cliente</button></footer></form>`
        const feeInput = dialog.querySelector('[name="fee"]')
        feeInput.required = true
        Review.inputs.decorate(dialog)
        dialog.querySelectorAll('[data-adjust]').forEach((button) =>
          button.addEventListener('click', async () => {
            const value = Number(button.dataset.adjust)
            if (
              await Review.confirm({
                title: 'Aplicar reajuste?',
                body: profileAdjustmentText(value),
                confirmLabel: 'Aplicar reajuste',
              })
            ) {
              draft.fee = value
              draft.date = '2026-11-12'
              dirty = true
              body()
              Review.toast(
                'Reajuste aplicado somente ao rascunho desta demonstração.',
              )
            }
          }),
        )
        dialog
          .querySelector('#client-close')
          .addEventListener('click', () => void close())
        dialog
          .querySelector('#client-cancel')
          .addEventListener('click', () => void close())
        dialog
          .querySelector('#client-company-query')
          ?.addEventListener('input', (event) => {
            const q = event.target.value.toLowerCase()
            dialog.querySelector('#client-company').innerHTML =
              '<option value="">Selecione uma empresa</option>' +
              companies
                .filter((company) =>
                  `${company.name} ${company.code} ${company.cnpj}`
                    .toLowerCase()
                    .includes(q),
                )
                .map(
                  (company) =>
                    `<option value="${company.id}">${esc(company.name)} · ${company.code}</option>`,
                )
                .join('')
          })
        dialog
          .querySelector('#client-company')
          ?.addEventListener('change', (event) => {
            const company = companies.find(
              (item) => item.id === event.target.value,
            )
            if (!company) return
            Object.assign(draft, company, { company })
            dirty = true
            body()
          })
        dialog
          .querySelector('#client-form')
          .addEventListener('submit', (event) => {
            event.preventDefault()
            if (!source && !draft.company) return
            if (
              !Number.isFinite(Number(draft.fee)) ||
              draft.fee === '' ||
              Number(draft.fee) < 0
            ) {
              feeInput.setCustomValidity('Informe um honorário válido.')
              feeInput.reportValidity()
              return
            }
            if (window.JaralCompaniesPreview) {
              window.JaralCompaniesPreview.setProfile(draft.id, draft)
              rows = window.JaralCompaniesPreview.profileRows()
            } else if (source) Object.assign(source, draft)
            else rows.push({ ...draft, id: `cliente-${rows.length + 1}` })
            dirty = false
            render()
            void close()
            Review.toast(
              'Cliente salvo apenas nesta prévia. A empresa central foi preservada.',
            )
          })
      }
      dialog.addEventListener('input', (event) => {
        const key = event.target.name || event.target.dataset.k
        event.target.setCustomValidity?.('')
        if (!key || !Object.hasOwn(draft, key)) return
        draft[key] = [
          'fee',
          'funcionarios',
          'socios',
          'xml',
          'notas',
          'filiais',
          'filiaisInativas',
          'horas',
          'faturamento',
        ].includes(key)
          ? numberValue(event.target)
          : event.target.value
        dirty = true
      })
      dialog.addEventListener('change', (event) => {
        const input = event.target
        if (input.dataset.actChange === 'grp-toggle') {
          expanded[`cliente:${input.dataset.g}`] = input.checked
          body()
          return
        }
        const key = input.dataset.k
        if (!key) return
        if (['servicos', 'anomalias'].includes(key))
          draft[key] = input.checked
            ? [...draft[key], input.dataset.v]
            : draft[key].filter((id) => id !== input.dataset.v)
        else
          draft[key] =
            input.type === 'checkbox'
              ? input.checked
              : [
                    'funcionarios',
                    'socios',
                    'xml',
                    'notas',
                    'filiais',
                    'filiaisInativas',
                    'horas',
                    'faturamento',
                  ].includes(key)
                ? numberValue(input)
                : input.value
        dirty = true
        body()
      })
      dialog.addEventListener('click', (event) => {
        const button = event.target.closest('[data-act]')
        if (!button) return
        if (button.dataset.act === 'step')
          draft[button.dataset.k] = Math.max(
            0,
            Number(draft[button.dataset.k]) + Number(button.dataset.d),
          )
        else if (button.dataset.act === 'set')
          draft[button.dataset.k] = button.dataset.v
        else return
        dirty = true
        body()
      })
      dialog.addEventListener('cancel', (event) => {
        event.preventDefault()
        void close()
      })
      document.body.append(dialog)
      body()
      dialog.showModal()
    }
    const createOnOpen = location.hash === '#novo'
    render()
    if (createOnOpen) chooseCompany()
    const requestedCompany = companies.find(
      (company) => company.id === query.get('empresa'),
    )
    if (requestedCompany) {
      const profile = rows.find((row) => row.id === requestedCompany.id)
      if (profile) openClient(profile)
      else openMissing(requestedCompany)
    }
  }
  function dashboard() {
    const total = rows.reduce((sum, row) => sum + row.fee, 0),
      suggested = rows.reduce((sum, row) => sum + row.suggested, 0),
      opportunity = rows.reduce(
        (sum, row) => sum + Math.max(0, row.suggested - row.fee),
        0,
      ),
      pending = rows.filter((row) => row.due).length
    const lower = rows
      .filter((row) => alignment(row) === 'abaixo')
      .sort((a, b) => b.suggested - b.fee - (a.suggested - a.fee))
    const counts = Object.fromEntries(
      Object.keys(alignmentLabels).map((status) => [
        status,
        rows.filter((row) => alignment(row) === status).length,
      ]),
    )
    const maximumGap = Math.max(
      1,
      ...lower.map((row) => row.suggested - row.fee),
    )
    const openQuotes = savedQuotes.filter((quote) =>
      ['Rascunho', 'Enviado'].includes(quote.status),
    )
    const acceptedQuotes = savedQuotes.filter(
      (quote) => quote.status === 'Aceito',
    ).length
    const closedQuotes = savedQuotes.filter((quote) =>
      ['Aceito', 'Recusado'].includes(quote.status),
    ).length
    const acceptanceRate = closedQuotes
      ? `${Math.round((acceptedQuotes / closedQuotes) * 100)}%`
      : '—'
    mount(
      'P12',
      'Painel da carteira',
      'painel',
      `<section class="hon-kpis" aria-label="Indicadores da carteira">${[
        [
          'Total de clientes',
          rows.length,
          rows.length
            ? `ticket médio ${money(total / rows.length)}`
            : 'Nenhum perfil financeiro ativo',
        ],
        [
          'Faturamento mensal',
          money(total),
          `pelos parâmetros: ${money(suggested)}`,
        ],
        [
          'Potencial de aumento',
          money(opportunity),
          `${money(opportunity * 13)} por ano`,
        ],
        ['Reajustes pendentes', pending, 'vencidos ou em até 30 dias'],
      ]
        .map(
          ([label, value, help]) =>
            `<div class="panel hon-kpi"><span>${label}</span><strong>${value}</strong><small>${help}</small></div>`,
        )
        .join(
          '',
        )}</section><div class="hon-dashboard-grid">${panel('Oportunidade de aumento de receita', `<div class="hon-revenue"><strong>+${money(opportunity)}/mês</strong><span>${lower.length} clientes podem se aproximar dos parâmetros</span></div><div class="hon-opportunity-bars">${lower.map((row) => `<a href="clientes-honorarios.html?q=${encodeURIComponent(row.name)}"><span>${esc(row.name)}</span><span class="hon-bar-track"><i style="width:${Math.max(5, ((row.suggested - row.fee) / maximumGap) * 100)}%"></i></span><strong>+${money(row.suggested - row.fee)}<small>/mês</small></strong></a>`).join('')}</div>`, '<a href="clientes-honorarios.html?filtro=abaixo" class="button small">Ver todos</a>')}${panel(
        'Situação da carteira',
        `<div class="hon-alignment" role="img" aria-label="${Object.entries(
          counts,
        )
          .map(([status, count]) => `${alignmentLabels[status]}: ${count}`)
          .join(', ')}">${Object.entries(counts)
          .filter(([, count]) => count)
          .map(
            ([status, count]) =>
              `<div data-alignment="${status}" style="flex:${count}" title="${alignmentLabels[status]}: ${count}"></div>`,
          )
          .join('')}</div><div class="hon-alignment-legend">${Object.entries(
          counts,
        )
          .map(
            ([status, count]) =>
              `<span class="hon-tone-${status}"><i aria-hidden="true"></i>${alignmentLabels[status]} <b>${count}</b></span>`,
          )
          .join(
            '',
          )}</div><div class="hon-dashboard-part"><h3>Orçamentos</h3><dl class="summary-list"><div><dt>Em aberto</dt><dd>${openQuotes.length} · ${money(openQuotes.reduce((sum, quote) => sum + quote.valor, 0))}/mês</dd></div><div><dt>Aceitos no ano</dt><dd>${acceptedQuotes}</dd></div><div><dt>Taxa de aceite</dt><dd>${acceptanceRate}</dd></div></dl></div><div class="hon-dashboard-part"><h3>Atual × parâmetro por regime</h3><div class="hon-regime-key"><span>Cobrado hoje</span><span>Valor pelos parâmetros</span></div>${[
          ['Simples Nacional', 75, 90],
          ['Lucro Presumido', 66, 85],
          ['Lucro Real', 70, 92],
          ['MEI', 80, 82],
        ]
          .map(
            ([label, current, proposed]) =>
              `<div class="hon-regime-row"><span>${label}</span><div><i style="width:${proposed}%"></i><b style="width:${current}%"></b></div></div>`,
          )
          .join('')}</div>`,
      )}</div>`,
      '../../docs/auditoria-ux/evidencias/21-honorarios-painel.png',
      [
        'Os quatro indicadores e os dois blocos seguem vPainel do modelo original. Negociação e aceite continuam no resumo de Orçamentos.',
        'Barras por regime são ilustrativas. Os dados completos para esse agrupamento devem vir do backend; esta prévia não infere a carteira inteira de uma página parcial.',
        'Situação calculada sobre os 10 clientes fictícios; resumo de orçamentos usa os mesmos quatro registros de Orçamentos salvos, com taxa entre aceitos e recusados.',
      ],
    )
  }
  function quotes() {
    const root = mount(
      'P13',
      'Orçamentos',
      'orcar',
      `<section class="panel"><div class="panel-body hon-quote-tools"><label class="field"><span>Buscar orçamento</span><input id="quote-search" type="search" placeholder="Número, empresa ou pessoa"></label><label class="field"><span>Status</span><select id="quote-filter"><option value="">Todos os status</option><option>Rascunho</option><option>Enviado</option><option>Aceito</option><option>Recusado</option></select></label></div><div class="table-wrap"><table><thead><tr><th scope="col">Número</th><th scope="col">Empresa ou pessoa</th><th scope="col">Valor mensal</th><th scope="col">Status</th><th scope="col">Validade</th></tr></thead><tbody id="saved-quote-rows"></tbody></table></div><footer class="pagination"><span id="quote-count"></span></footer></section>`,
      '../../docs/auditoria-ux/evidencias/22-honorarios-orcamento.png',
      [
        'Novo orçamento é uma ação da página Orçamentos, sem aba de criação. O orçamento continua independente do cadastro de empresa.',
        'Abrir proposta mantém o documento e as ações na ficha. Vinculação/conversão não é executada nesta prévia.',
        'O documento usa o template completo do HTML aprovado. Perfil, contato, valores, data, condições de cobrança e abertura são cenários fictícios explícitos, sem cálculo financeiro nem API.',
      ],
      '<a class="button primary" href="honorarios.html">Novo orçamento</a>',
    )
    function render() {
      const q = root.querySelector('#quote-search').value.toLowerCase(),
        status = root.querySelector('#quote-filter').value
      const matches = savedQuotes.filter(
        (item) =>
          (!status || item.status === status) &&
          `${item.numero} ${item.prospect}`.toLowerCase().includes(q),
      )
      root.querySelector('#saved-quote-rows').innerHTML =
        matches
          .map(
            (item) =>
              `<tr data-quote="${item.numero}" aria-label="Abrir proposta ${item.numero} de ${esc(item.prospect)}"><td>${item.numero}</td><td><strong>${esc(item.prospect)}</strong><small>Sem empresa vinculada</small></td><td class="numeric">${money(item.valor)}</td><td><span class="badge ${item.status === 'Aceito' ? 'success' : item.status === 'Recusado' ? 'error' : ''}">${item.status}</span></td><td>27/11/2026</td></tr>`,
          )
          .join('') ||
        '<tr><td colspan="5">Nenhum orçamento encontrado.</td></tr>'
      root.querySelector('#quote-count').textContent =
        `${matches.length} de ${savedQuotes.length} orçamentos`
      Review.rows(root.querySelector('#saved-quote-rows'), {
        selector: 'tr[data-quote]',
        onOpen: (row) => {
          const quote = savedQuotes.find(
            (item) => item.numero === row.dataset.quote,
          )
          window.JaralProposal.open(quote, {
            actions: [
              { label: 'Nova revisão', href: 'honorarios.html' },
              quote.status === 'Aceito'
                ? {
                    label: 'Vincular empresa existente',
                    href: 'vinculo-orcamento.html',
                    primary: true,
                  }
                : {
                    label: 'Simular alteração de status',
                    primary: true,
                    onClick: () =>
                      Review.toast(
                        'A alteração de status mantém a confirmação e o versionamento atuais. Nenhuma alteração é enviada nesta prévia.',
                      ),
                  },
            ],
          })
        },
      })
    }
    root.querySelector('#quote-search').addEventListener('input', render)
    root.querySelector('#quote-filter').addEventListener('change', render)
    render()
  }
  const page = document.body.dataset.proposal
  if (page === 'P11') clients()
  if (page === 'P12') dashboard()
  if (page === 'P13') quotes()
})()
