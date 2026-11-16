/* global Review, document, window, location, setTimeout, clearTimeout */
;(function () {
  'use strict'
  const esc = (value) =>
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
  const clone = (value) => JSON.parse(JSON.stringify(value))
  const money = (value) =>
    Number(value).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    })
  const regimes = [
    ['mei', 'MEI'],
    ['simples', 'Simples Nacional'],
    ['presumido', 'Lucro Presumido'],
    ['real', 'Lucro Real'],
  ]
  const tabs = [
    ['base', 'Valores base'],
    ['adicionais', 'Adicionais'],
    ['complexidade', 'Regime e horas'],
    ['faixas', 'Faturamento'],
    ['servicos', 'Serviços'],
    ['anomalias', 'Exceções'],
    ['planos', 'Planos'],
    ['cobranca', 'Cobrança e reajuste'],
    ['regras', 'Regras'],
  ]
  const defaults = {
    anomalias: [
      {
        id: 'atraso',
        nome: 'Documentos entregues fora do prazo',
        pct: 15,
      },
      {
        id: 'desorganizado',
        nome: 'Documentação desorganizada ou incompleta',
        pct: 20,
      },
      {
        id: 'retrabalho',
        nome: 'Retrabalho frequente (lançamentos refeitos)',
        pct: 10,
      },
    ],
    arredondamento: 10,
    decimoTerceiro: true,
    descontoMax: 10,
    faixasPresumido: [
      {
        ate: 30000,
        pct: 0,
      },
      {
        ate: 100000,
        pct: 15,
      },
      {
        ate: 300000,
        pct: 30,
      },
      {
        ate: 800000,
        pct: 50,
      },
      {
        ate: null,
        pct: 80,
      },
    ],
    faixasReal: [
      {
        ate: 30000,
        pct: 0,
      },
      {
        ate: 100000,
        pct: 15,
      },
      {
        ate: 300000,
        pct: 30,
      },
      {
        ate: 800000,
        pct: 50,
      },
      {
        ate: null,
        pct: 80,
      },
    ],
    faixasSimples: [
      {
        ate: 30000,
        pct: 0,
      },
      {
        ate: 100000,
        pct: 15,
      },
      {
        ate: 300000,
        pct: 30,
      },
      {
        ate: 400000,
        pct: 50,
      },
    ],
    fatorRegime: {
      mei: 1,
      presumido: 1.2,
      real: 1.5,
      simples: 1,
    },
    filial: {
      modo: 'fixo',
      pct: 80,
      valor: 250,
      valorInativa: 100,
    },
    funcionarios: {
      incluidos: 1,
      valor: 45,
    },
    horas: {
      custoHora: 85,
      margem: 35,
      metodo: 'maior',
    },
    inativa: {
      mei: 60,
      presumido: 180,
      real: 400,
      simples: 150,
    },
    indices: {
      carencia: 7,
      fixo: {
        nome: 'Percentual fixo',
        pct: 5,
      },
      igpm: {
        nome: 'IGP-M',
        pct: 3.34,
      },
      ipca: {
        nome: 'IPCA',
        pct: 4.58,
      },
      periodicidade: 'aniversario',
      referencia: 'acumulado 12 meses até set/2026',
      usar: 'ipca',
    },
    nf: {
      fixo: 80,
      franquia: 10,
      porNota: 4,
    },
    planos: {
      ativo: false,
      niveis: [
        {
          ajuste: 0,
          ativo: true,
          descricao: 'Só a contabilidade obrigatória',
          destaque: false,
          emiteNF: false,
          id: 'basico',
          nome: 'Básico',
          servicos: [],
        },
        {
          ajuste: 0,
          ativo: true,
          descricao: 'Contabilidade + emissão de notas + consultoria contábil',
          destaque: true,
          emiteNF: true,
          id: 'recomendado',
          nome: 'Recomendado',
          servicos: ['consultoria'],
        },
        {
          ajuste: 0,
          ativo: true,
          descricao: 'Tudo do Recomendado + consultoria periódica',
          destaque: false,
          emiteNF: true,
          id: 'premium',
          nome: 'Premium',
          servicos: ['consultoria', 'gerencial', 'certidoes'],
        },
      ],
    },
    reajusteMax: 20,
    reajusteTeto: true,
    segmentos: [
      {
        base: {
          mei: 120,
          presumido: 850,
          real: 1800,
          simples: 450,
        },
        id: 'servicos',
        nome: 'Prestação de serviços',
      },
      {
        base: {
          mei: 150,
          presumido: 1000,
          real: 2100,
          simples: 550,
        },
        id: 'comercio',
        nome: 'Comércio',
      },
      {
        base: {
          mei: 180,
          presumido: 1300,
          real: 2600,
          simples: 750,
        },
        id: 'industria',
        nome: 'Indústria',
      },
      {
        base: {
          mei: 120,
          presumido: 900,
          real: 1900,
          simples: 500,
        },
        id: 'saude',
        nome: 'Saúde (clínicas e consultórios)',
      },
      {
        base: {
          mei: 150,
          presumido: 1200,
          real: 2400,
          simples: 700,
        },
        id: 'construcao',
        nome: 'Construção civil',
      },
      {
        base: {
          mei: 0,
          presumido: 700,
          real: 1500,
          simples: 400,
        },
        id: 'holding',
        nome: 'Holding / patrimonial',
      },
    ],
    servicos: [
      {
        id: 'consultoria',
        nome: 'Consultoria contábil sob demanda',
        valor: 150,
      },
      {
        id: 'gerencial',
        nome: 'Reunião gerencial mensal',
        valor: 250,
      },
      {
        id: 'irpf',
        nome: 'IRPF dos sócios (mensalizado)',
        valor: 35,
      },
      {
        id: 'certidoes',
        nome: 'Gestão de certidões e alvarás',
        valor: 60,
      },
      {
        id: 'bpo',
        nome: 'BPO financeiro',
        valor: 450,
      },
    ],
    socios: {
      ativo: false,
      incluidos: 1,
      valor: 30,
    },
    tolerancia: 5,
    vencimento: 10,
    xml: {
      ativo: false,
      bloco: 100,
      franquia: 100,
      valorBloco: 50,
    },
  }
  const panel = (title, body, actions = '') =>
    `<section class="panel hon-param-panel"><header class="panel-head"><h2>${title}</h2>${actions}</header><div class="panel-body">${body}</div></section>`
  const field = (label, id, value, type = 'text', attrs = '') =>
    `<label class="field"><span>${label}</span><input id="${id}" type="${type}" value="${esc(value)}" ${attrs}></label>`
  const select = (label, id, value, options, attrs = '') =>
    `<label class="field"><span>${label}</span><select id="${id}" ${attrs}>${options.map(([key, text]) => `<option value="${esc(key)}" ${String(value) === String(key) ? 'selected' : ''}>${text}</option>`).join('')}</select></label>`
  const check = (label, id, value, attrs = '') =>
    `<label class="check"><input id="${id}" type="checkbox" ${value ? 'checked' : ''} ${attrs}><span>${label}</span></label>`
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
      active: active === 'novo' || active === 'orcamentos',
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
  function mount(id, title, active, content, notes, before, actions = '') {
    const main = Review.mount({
      id,
      title,
      module: 'Honorários',
      nav: nav(active),
      content: `<div class="hon-preview">${content}</div>`,
      actions,
      notes,
      before,
    })
    return (
      main.querySelector('.hon-preview') ||
      document.querySelector('.hon-preview')
    )
  }
  function choice(label, key, value, options, namespace = 'data-quote') {
    return `<fieldset><legend class="hon-mini-heading">${label}</legend><div class="hon-param-radio">${options.map(([val, text]) => `<label class="check"><input type="radio" name="${key}" ${namespace}="${key}" value="${val}" ${String(value) === String(val) ? 'checked' : ''}><span>${text}</span></label>`).join('')}</div></fieldset>`
  }
  function newQuote() {
    const initial = {
      prospect: 'Simulação — prestação de serviços',
      contato: '',
      validadeDias: 15,
      decimoTerceiro: 13,
      aberturaOn: false,
      aberturaValor: 800,
      aberturaParcelas: 2,
      inicioCobranca: 1,
      segmento: 'servicos',
      regime: 'simples',
      faturamento: 60000,
      inativa: false,
      funcionarios: 3,
      socios: 2,
      xml: 150,
      emiteNF: true,
      notas: 20,
      filiais: 0,
      filiaisInativas: 0,
      usarHoras: false,
      horas: 10,
      servicos: [],
      anomalias: [],
      servOn: false,
      excOn: false,
      ofertarPlanos: true,
      planosOv: {},
    }
    const state = clone(initial),
      params = clone(defaults)
    const root = mount(
      'P05',
      'Novo orçamento',
      'novo',
      `<div class="hon-columns"><form id="hon-quote-form" class="hon-stack"></form><aside class="hon-summary"><section class="hon-result-card"><div class="hon-result"><div class="res-total"><span class="res-label">Pelos par\u00e2metros</span><strong class="res-value" id="hon-total">R$ 620,00</strong><span class="res-sub">por m\u00eas</span></div><div class="hon-update" id="hon-update" role="status" aria-live="polite">Valores atualizados</div></div><div class="res-ajuste" id="hon-single-price"><label class="f" for="hon-proposto">Valor a propor<span class="hint">Digite livremente um desconto ou acr\u00e9scimo.</span><div class="prefix"><span>R$</span><input id="hon-proposto" type="text" data-format="money" inputmode="numeric" value="620,00" aria-describedby="hon-discount hon-reset-help"></div></label><div class="hon-stable-notice" id="hon-discount">Mesmo valor dos par\u00e2metros.</div><button class="button ghost small" id="hon-reset-price" type="button" hidden>Usar valor calculado</button><span class="hint" id="hon-reset-help" hidden>Substitui o valor digitado pelo valor calculado para este perfil.</span></div><div class="margin-line" id="hon-margin" hidden></div><ul class="res-lines" id="hon-breakdown"></ul><div class="orc-planos" id="hon-plan-control"><label class="switch"><input type="checkbox" id="hon-plans" aria-describedby="hon-plan-availability"><span>Ofertar em 3 planos</span></label><p class="hint" id="hon-plan-availability"></p><div id="hon-plan-values"></div></div><div id="hon-conditions"></div><div class="res-actions"><button class="button primary" type="submit" form="hon-quote-form">Salvar or\u00e7amento e gerar proposta</button><div class="hon-actions-inline"><a class="button" href="clientes-honorarios.html#novo">Cadastrar como cliente</a><button class="button ghost" type="button" id="hon-clear">Limpar</button></div></div></section></aside></div>`,
      [
        'Restauração da organização do HTML aprovado: Dados do orçamento → Abertura e início da cobrança → Empresa → Departamento pessoal → Fiscal → Filiais → Ajustes do honorário. A marcação dos grupos de cálculo foi extraída do arquivo original.',
        'Orçamento genérico: Empresa ou pessoa é uma referência textual, sem exigir empresa cadastrada. Clientes continua restrito às empresas existentes.',
        'As ativações de Sócios, XML e Planos vêm do config-params.json. Use Cobranças ativadas na barra de revisão para conferir os campos condicionais do modelo.',
        'Valores são demonstrativos fixos, sem API nem motor de cálculo no navegador. Use Resposta lenta para verificar estabilidade. Salvar e vincular não envia dados ao sistema.',
        'Gerar proposta abre o documento original: PROPOSAL_CSS, proposalBody, escopo e condições foram extraídos do HTML aprovado. A prévia não grava registros; impressão e download usam esse mesmo documento local, sem carregar fontes externas.',
        'Com Tempo adicional ativo, custo e margem apresentam o cenário fechado de 10 horas, custo de R$ 350,00 e margem de 43,55% no valor de referência. Planos usam preços demonstrativos de R$ 450,00, R$ 620,00 e R$ 850,00. Abertura e benefício apenas apresentam as condições preenchidas; não substituem o cálculo oficial.',
      ],
      '../../docs/auditoria-ux/evidencias/22-honorarios-orcamento.png',
      '<a class="button" href="orcamentos-honorarios.html">Voltar aos orçamentos</a>',
    )
    const tools = document.querySelector('.review-tools')
    tools.insertAdjacentHTML(
      'afterbegin',
      '<a href="../../docs/honorarios_base/honorarios-jaralcon%20(1).html" target="_blank" rel="noopener">Modelo HTML ↗</a><button type="button" id="hon-demo-active" aria-pressed="false">Cobranças ativadas</button><button type="button" id="hon-slow">Resposta lenta</button>',
    )
    const form = root.querySelector('form'),
      update = root.querySelector('#hon-update')
    let timer,
      currentTotal = 620,
      manualPrice = false,
      dirty = false
    const df = (label, key, type = 'number', attrs = '') =>
      field(
        label,
        'q-' + key,
        state[key],
        type,
        'data-quote="' + key + '" ' + attrs,
      )
    const quoteGroup = (title, body, tone) =>
      '<fieldset class="grp ' +
      tone +
      '"><legend>' +
      title +
      '</legend>' +
      body +
      '</fieldset>'
    const quoteChoice = (label, key, value, options) =>
      '<div class="f"><span id="q-label-' +
      key +
      '">' +
      label +
      '</span><div class="hon-choice" role="radiogroup" aria-labelledby="q-label-' +
      key +
      '" style="grid-template-columns:repeat(' +
      options.length +
      ',minmax(0,1fr))">' +
      options
        .map(
          ([id, text]) =>
            '<label><input type="radio" name="' +
            key +
            '" data-quote="' +
            key +
            '" value="' +
            id +
            '" ' +
            (String(value) === String(id) ? 'checked' : '') +
            '><span>' +
            text +
            '</span></label>',
        )
        .join('') +
      '</div></div>'
    function renderForm() {
      form.innerHTML =
        quoteGroup(
          'Dados do orçamento',
          `<div class="hon-fields">${df('Empresa ou pessoa', 'prospect', 'text', 'required maxlength="200"')}<div class="hon-grid2">${df('Contato', 'contato', 'text', 'placeholder="WhatsApp ou e-mail"')}${df('Validade da proposta (dias)', 'validadeDias', 'number', 'min="1" max="365" required')}</div>${quoteChoice(
            'Cobrança',
            'decimoTerceiro',
            state.decimoTerceiro,
            [
              [12, '12 parcelas'],
              [13, '13 parcelas'],
            ],
          )}</div>`,
          'tone-orc',
        ) +
        quoteGroup(
          'Abertura e início da cobrança',
          `<div class="hon-fields"><label class="switch"><input type="checkbox" id="q-aberturaOn" data-quote="aberturaOn" ${state.aberturaOn ? 'checked' : ''}><span>Orçar honorário de abertura</span></label>${
            state.aberturaOn
              ? '<div class="hon-grid2">' +
                df(
                  'Valor da abertura (R$)',
                  'aberturaValor',
                  'number',
                  'min="0" step="0.01"',
                ) +
                select(
                  'Forma de pagamento',
                  'q-aberturaParcelas',
                  state.aberturaParcelas,
                  Array.from({ length: 12 }, (_, i) => [
                    i + 1,
                    i ? i + 1 + ' vezes' : 'À vista',
                  ]),
                  'data-quote="aberturaParcelas"',
                ) +
                '</div>'
              : ''
          }${quoteChoice(
            'Primeiro honorário mensal',
            'inicioCobranca',
            state.inicioCobranca,
            [
              [0, 'Cobrar no ato'],
              [1, '1ª competência'],
              [2, '2ª competência'],
              [3, '3ª competência'],
            ],
          )}<p class="hon-rule">${state.inicioCobranca > 1 ? 'Benefício concedido: ' + (state.inicioCobranca - 1) + ' competência(s) sem cobrança do honorário mensal.' : 'Primeiro honorário ' + (state.inicioCobranca === 0 ? 'cobrado no ato da contratação' : 'cobrado na 1ª competência') + ', sem benefício.'}</p></div>`,
          'tone-ab',
        ) +
        '<div class="hon-original">' +
        window.HonorariosModelo.pricing(state, 'q', params, {
          'q:serv': state.servOn,
          'q:exc': state.excOn,
        }) +
        '</div>'
      form
        .querySelectorAll('[data-ns="q"][data-k]')
        .forEach((input) => (input.dataset.quote = input.dataset.k))
      renderPlans()
      renderMargin()
      renderConditions()
    }
    const planScenario = [450, 620, 850]
    function activePlans() {
      return params.planos.ativo && !state.inativa
        ? params.planos.niveis.filter((plan) => plan.ativo)
        : []
    }
    function planValue(plan) {
      return (
        state.planosOv[plan.id] ??
        planScenario[params.planos.niveis.indexOf(plan)] ??
        620
      )
    }
    function offerPlans() {
      return state.ofertarPlanos && activePlans().length > 0
    }
    function renderPlans() {
      const plans = activePlans(),
        offered = offerPlans(),
        configured = params.planos.niveis.filter((plan) => plan.ativo),
        available = plans.length > 0
      root.querySelector('#hon-plan-control').hidden = false
      root.querySelector('#hon-plans').disabled = !available
      root.querySelector('#hon-plans').checked =
        available && state.ofertarPlanos
      root.querySelector('#hon-plans').nextElementSibling.textContent =
        'Ofertar em ' +
        configured.length +
        (configured.length === 1 ? ' plano' : ' planos')
      root.querySelector('#hon-plan-availability').textContent = !params.planos
        .ativo
        ? 'Oferta de planos desativada em Parâmetros › Planos.'
        : state.inativa
          ? 'A oferta de planos não se aplica a empresa inativa.'
          : !configured.length
            ? 'Ative ao menos um nível em Parâmetros › Planos.'
            : 'O que entra em cada plano é definido em Parâmetros › Planos.'
      root.querySelector('#hon-single-price').hidden = offered
      root.querySelector('#hon-plan-values').innerHTML = offered
        ? '<div class="orc-pl-list">' +
          plans
            .map(
              (plan) =>
                '<label class="orc-pl ' +
                (plan.destaque ? 'dest' : '') +
                '"><span><b>' +
                esc(plan.nome) +
                (plan.destaque && !/recomend/i.test(plan.nome)
                  ? ' <em class="orc-tag">Recomendado</em>'
                  : '') +
                '</b>' +
                (plan.descricao
                  ? '<small>' + esc(plan.descricao) + '</small>'
                  : '') +
                '</span><span class="prefix"><span>R$</span><input id="hon-plan-' +
                esc(plan.id) +
                '" type="text" data-format="money" data-plan-price="' +
                esc(plan.id) +
                '" inputmode="numeric" aria-label="Valor mensal do plano ' +
                esc(plan.nome) +
                ' em reais" value="' +
                esc(planValue(plan)) +
                '"></span></label>',
            )
            .join('') +
          '</div>'
        : available
          ? '<p class="hint">A proposta sai com um único valor: o valor a propor acima.</p>'
          : ''
    }
    function renderMargin() {
      const margin = root.querySelector('#hon-margin')
      margin.hidden = !state.usarHoras || state.inativa
      margin.innerHTML =
        '<span>Custo da equipe <b>R$ 350,00</b> (10 h)</span><span>Margem no sugerido <b>43,55%</b></span>'
    }
    function quoteReference() {
      const plans = activePlans()
      return offerPlans()
        ? planValue(plans.find((plan) => plan.destaque) || plans[0])
        : Review.inputs.decimal(root.querySelector('#hon-proposto').value)
    }
    function renderConditions() {
      const rows = [],
        installments = Math.max(1, Number(state.aberturaParcelas)),
        benefit = Math.max(0, Number(state.inicioCobranca) - 1)
      if (state.aberturaOn && state.aberturaValor > 0)
        rows.push([
          'Honorário de abertura',
          installments === 1
            ? money(state.aberturaValor) + ' à vista'
            : installments +
              '× de ' +
              money(state.aberturaValor / installments) +
              ' (total ' +
              money(state.aberturaValor) +
              ')',
        ])
      if (Number(state.inicioCobranca) === 0)
        rows.push([
          'Primeiro honorário mensal',
          'Cobrado no ato da contratação',
        ])
      if (benefit > 0)
        rows.push([
          'Benefício concedido · 1º honorário na ' +
            state.inicioCobranca +
            'ª competência',
          benefit +
            (benefit === 1 ? ' competência' : ' competências') +
            ' sem cobrança · ' +
            money(quoteReference() * benefit) +
            (offerPlans() ? ' no plano recomendado' : ''),
        ])
      root.querySelector('#hon-conditions').innerHTML = rows.length
        ? '<div class="cond-box"><strong class="hon-mini-heading">Condições comerciais</strong>' +
          rows
            .map(
              ([label, value]) =>
                '<div class="cond-r"><span>' +
                esc(label) +
                '</span><b>' +
                esc(value) +
                '</b></div>',
            )
            .join('') +
          '</div>'
        : ''
    }
    function showResult() {
      currentTotal = state.inativa ? 150 : 620
      root.querySelector('#hon-total').textContent = money(currentTotal)
      root.querySelector('#hon-breakdown').innerHTML = (
        state.inativa
          ? [
              ['Empresa inativa · Simples Nacional', 'R$ 150,00'],
              ['Serviços adicionais', '—'],
              ['Arredondamento', '—'],
            ]
          : [
              ['Base por segmento e regime', 'R$ 450,00'],
              ['Faixa e adicionais', 'R$ 157,50'],
              ['Arredondamento', 'R$ 12,50'],
            ]
      )
        .map(
          ([label, value]) =>
            '<li><span>' + label + '</span><b>' + value + '</b></li>',
        )
        .join('')
      if (!manualPrice)
        root.querySelector('#hon-proposto').value = currentTotal
          .toFixed(2)
          .replace('.', ',')
      update.classList.remove('is-loading')
      update.textContent = 'Valores atualizados'
      updatePriceNote()
      renderMargin()
      renderConditions()
    }
    function schedule(delay = 900) {
      clearTimeout(timer)
      update.textContent = 'Atualizando valores…'
      update.classList.add('is-loading')
      root.querySelector('[form="hon-quote-form"]').disabled = true
      timer = setTimeout(() => {
        showResult()
        root.querySelector('[form="hon-quote-form"]').disabled = false
      }, delay)
    }
    function updatePriceNote() {
      const amount = Review.inputs.decimal(
        root.querySelector('#hon-proposto').value,
      )
      const differs = Math.abs(amount - currentTotal) > 0.009
      root.querySelector('#hon-reset-price').hidden = !manualPrice || !differs
      root.querySelector('#hon-reset-help').hidden = !manualPrice || !differs
      root.querySelector('#hon-discount').textContent =
        amount < currentTotal * 0.9
          ? 'Desconto acima da referência de 10%. O salvamento continua permitido.'
          : amount === currentTotal
            ? 'Mesmo valor dos parâmetros.'
            : 'Valor livre para a proposta.'
    }
    form.addEventListener('input', (event) => {
      const key = event.target.dataset.quote
      if (
        !key ||
        event.target.type === 'radio' ||
        event.target.type === 'checkbox' ||
        event.target.tagName === 'SELECT'
      )
        return
      dirty = true
      const numeric = [
        'faturamento',
        'funcionarios',
        'socios',
        'xml',
        'notas',
        'filiais',
        'filiaisInativas',
        'horas',
        'validadeDias',
        'aberturaValor',
      ]
      state[key] = numeric.includes(key)
        ? Number(
            event.target.value
              .replace(/\./g, event.target.type === 'number' ? '.' : '')
              .replace(',', '.'),
          )
        : event.target.value
      if (key === 'aberturaValor') renderConditions()
      if (!['prospect', 'contato', 'validadeDias'].includes(key)) schedule()
    })
    form.addEventListener('change', (event) => {
      const key = event.target.dataset.quote
      if (event.target.dataset.actChange === 'grp-toggle') {
        state[event.target.dataset.g === 'serv' ? 'servOn' : 'excOn'] =
          event.target.checked
        renderForm()
        return
      }
      if (!key) return
      dirty = true
      if (['servicos', 'anomalias'].includes(key)) {
        const value = event.target.dataset.v
        state[key] = event.target.checked
          ? [...state[key], value]
          : state[key].filter((id) => id !== value)
      } else if (event.target.type === 'checkbox')
        state[key] = event.target.checked
      else if (event.target.type === 'radio' || key === 'aberturaParcelas')
        state[key] = isNaN(Number(event.target.value))
          ? event.target.value
          : Number(event.target.value)
      else if (event.target.tagName === 'SELECT')
        state[key] = event.target.value
      else return
      renderForm()
      schedule()
    })
    form.addEventListener('click', (event) => {
      const button = event.target.closest('[data-act]')
      if (!button) return
      if (button.dataset.act === 'set')
        state[button.dataset.k] = button.dataset.v
      else if (button.dataset.act === 'step')
        state[button.dataset.k] = Math.max(
          0,
          Number(state[button.dataset.k]) + Number(button.dataset.d),
        )
      else return
      dirty = true
      renderForm()
      schedule()
    })
    root.querySelector('#hon-proposto').addEventListener('input', () => {
      manualPrice = true
      dirty = true
      updatePriceNote()
      renderConditions()
    })
    root.querySelector('#hon-reset-price').addEventListener('click', () => {
      manualPrice = false
      showResult()
    })
    root.querySelector('#hon-plans').addEventListener('change', (event) => {
      state.ofertarPlanos = event.target.checked
      dirty = true
      renderPlans()
      renderConditions()
    })
    root
      .querySelector('#hon-plan-values')
      .addEventListener('input', (event) => {
        const id = event.target.dataset.planPrice
        if (!id) return
        state.planosOv[id] = Review.inputs.decimal(event.target.value)
        dirty = true
        renderConditions()
      })
    document
      .getElementById('hon-demo-active')
      .addEventListener('click', (event) => {
        const on = event.currentTarget.getAttribute('aria-pressed') !== 'true'
        event.currentTarget.setAttribute('aria-pressed', String(on))
        params.socios.ativo = on
        params.xml.ativo = on
        params.planos.ativo = on
        renderForm()
      })
    document
      .getElementById('hon-slow')
      .addEventListener('click', () => schedule(3000))
    root.querySelector('#hon-clear').addEventListener('click', async () => {
      if (
        await Review.confirm({
          title: 'Limpar este orçamento?',
          body: 'Os dados preenchidos serão substituídos por uma nova simulação.',
          confirmLabel: 'Limpar',
        })
      ) {
        Object.assign(state, clone(initial))
        manualPrice = false
        dirty = false
        renderForm()
        showResult()
      }
    })
    form.addEventListener('submit', (event) => {
      event.preventDefault()
      dirty = false
      const plans = offerPlans()
        ? activePlans().map((plan) => ({
            ...plan,
            inp: {
              ...state,
              emiteNF: plan.emiteNF,
              servicos: [...plan.servicos],
            },
            valor: planValue(plan),
          }))
        : []
      window.JaralProposal.open(
        {
          numero: '2026-018',
          prospect: state.prospect,
          contato: state.contato,
          criadoEm: '2026-11-12T12:00:00',
          validadeDias: state.validadeDias,
          decimoTerceiro: Number(state.decimoTerceiro) === 13,
          inicioCobranca: state.inicioCobranca,
          abertura: state.aberturaOn
            ? { valor: state.aberturaValor, parcelas: state.aberturaParcelas }
            : null,
          inp: { ...state },
          valor: quoteReference(),
          sugerido: currentTotal,
          planos: plans,
          params,
        },
        {
          actions: [
            { label: 'Orçamentos salvos', href: 'orcamentos-honorarios.html' },
          ],
        },
      )
    })
    document.querySelectorAll('a').forEach((link) => {
      if (
        link.target === '_blank' ||
        link.getAttribute('href')?.startsWith('#')
      )
        return
      link.addEventListener('click', async (event) => {
        if (!dirty) return
        event.preventDefault()
        if (
          await Review.confirm({
            title: 'Sair deste orçamento?',
            body: 'Os dados ainda não foram salvos.',
            confirmLabel: 'Descartar e sair',
          })
        ) {
          dirty = false
          location.href = link.href
        }
      })
    })
    renderForm()
    showResult()
  }

  function binding() {
    const companies = Array.from({ length: 300 }, (_, index) => ({
      id: index + 1,
      code: String(index + 1).padStart(3, '0'),
      name:
        index === 0
          ? 'Aurora Comércio de Alimentos Ltda.'
          : index === 1
            ? 'Ateliê Horizonte Ltda.'
            : `${['Vale Norte', 'Ponto Certo', 'Horizonte', 'Estação', 'Serra Azul', 'Alameda'][index % 6]} ${['Serviços', 'Comércio', 'Engenharia', 'Soluções', 'Indústria'][index % 5]} ${String(index + 1).padStart(3, '0')} Ltda.`,
      cnpj: `${String(index + 10).padStart(2, '0')}.345.678/0001-${String(index % 99).padStart(2, '0')}`,
    }))
    const clientRows = [
      { company: companies[0], fee: 680 },
      { company: companies[1], fee: 540 },
    ]
    let view = location.hash === '#clientes' ? 'clientes' : 'orcamento',
      selected = null,
      linked = null,
      path = 'existing',
      created = null,
      timer
    const root = mount(
      'P06',
      view === 'clientes' ? 'Clientes' : 'Orçamento 2026-018',
      view === 'clientes' ? 'clientes' : 'orcamentos',
      '<div id="hon-binding"></div>',
      [
        'P06 · Dados fictícios e interações locais. A lista de seleção contém 300 empresas para avaliar busca e diferenciação por nome, código e CNPJ. Clientes admite apenas empresas que já existem no cadastro central.',
        'Caminho compatível com o contrato atual: proposta aceita → confirmar empresa existente → POST convert com version e companyId. Esse comando também cria ou atualiza o perfil na carteira com o preço congelado; não é um simples vínculo independente.',
        'O contrato atual permite companyId na criação ou em nova revisão. Não há endpoint separado para apenas vincular uma proposta salva antes do aceite. A semântica dessa ação deve ser definida antes da implementação.',
        'Cadastrar empresa e vincular em uma única jornada fica como ideia futura, fora desta restauração. O caminho desta prévia usa apenas empresa preexistente.',
      ],
      '../../docs/auditoria-ux/evidencias/23-honorarios-clientes.png',
    )
    const area = root.querySelector('#hon-binding')
    function render() {
      area.innerHTML = `<div class="hon-page-flow"><div class="hon-paths"><button class="hon-path ${view === 'orcamento' ? 'active' : ''}" data-view="orcamento">Orçamento salvo</button><button class="hon-path ${view === 'clientes' ? 'active' : ''}" data-view="clientes">Clientes</button></div>${view === 'orcamento' ? quoteView() : clientsView()}</div>`
      if (area.querySelector('#hon-company-search')) renderCompanies('')
    }
    function quoteView() {
      return `<section class="panel"><div class="hon-quote-summary"><div><span>Empresa ou pessoa</span><strong>Simulação — prestação de serviços</strong></div><div><span>Valor mensal aceito</span><strong class="hon-main-value">R$ 620,00</strong></div><div><span>Plano</span><strong>Valor único</strong></div><div><span>Status da proposta</span><strong><span class="hon-status-dot"></span>Aceita</strong></div></div><div class="hon-state-line"><span class="hon-link-meta"><span class="badge">Revisão 1</span><span class="hon-minor">${linked ? 'Empresa vinculada' : 'Sem empresa vinculada'}</span></span><a class="button ghost" href="honorarios.html">Consultar simulação</a></div></section>${linked ? `<div class="hon-linked"><h3>${esc(linked.name)}</h3><p>${linked.cnpj} · Código ${linked.code}</p><p>Perfil adicionado à carteira com o honorário preservado de <strong>R$ 620,00</strong>.</p><button class="button" data-view="clientes">Ver na carteira</button></div>` : panel('Adicionar a uma empresa cadastrada', `<p class="hon-section-note">Selecione a empresa que receberá o perfil e o valor desta proposta aceita. Se ela já estiver na carteira, os dados financeiros serão atualizados após sua confirmação.</p><div class="hon-paths"><button type="button" class="hon-path ${path === 'existing' ? 'active' : ''}" data-path="existing">Vincular empresa existente</button></div>${path === 'existing' ? selector('quote') : createForm()}`)}`
    }
    function clientsView() {
      return panel(
        'Empresas da carteira',
        `<div class="hon-client-toolbar">${field('Buscar empresa', 'hon-client-search', '', 'search', 'placeholder="Nome, código ou CNPJ"')}<button class="button primary" id="hon-add-client">Vincular empresa existente</button></div><p class="hon-section-note">Cada perfil de honorários pertence a uma empresa do cadastro central.</p><div class="table-wrap"><table class="hon-client-table"><thead><tr><th>Empresa</th><th>Honorário atual</th><th>Situação</th></tr></thead><tbody id="hon-client-rows">${clientTable('')}</tbody></table></div><div id="hon-add-client-area"></div>`,
      )
    }
    function clientTable(query) {
      const filtered = clientRows.filter((item) =>
        `${item.company.name} ${item.company.cnpj} ${item.company.code}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      )
      return (
        filtered
          .map(
            (item) =>
              `<tr><td><strong>${esc(item.company.name)}</strong><small>Código ${item.company.code} · ${item.company.cnpj}</small></td><td>${money(item.fee)}</td><td><span class="badge">Empresa vinculada</span></td></tr>`,
          )
          .join('') ||
        '<tr><td colspan="3">Nenhuma empresa encontrada.</td></tr>'
      )
    }
    function selector(mode) {
      return `<div class="hon-company-layout"><div>${field('Buscar empresa cadastrada', 'hon-company-search', '', 'search', 'placeholder="Nome, código ou CNPJ"')}<div class="hon-caption-row"><span class="hon-list-label" id="hon-results-count">300 empresas cadastradas</span></div><div id="hon-company-list" class="hon-list" aria-label="Empresas cadastradas"></div></div><aside class="hon-selection" id="hon-selection" data-mode="${mode}">${selection(mode)}</aside></div>`
    }
    function selection(mode) {
      return selected
        ? `<h3>Empresa selecionada</h3><div class="hon-fields"><strong>${esc(selected.name)}</strong><span class="hon-minor">${selected.cnpj} · Código ${selected.code}</span></div>${mode === 'client' ? `${field('Honorário cobrado hoje (R$)', 'hon-client-fee', '620,00', 'text', 'inputmode="decimal"')}<button class="button primary" id="hon-confirm-client">Criar perfil nesta empresa</button>` : `<dl class="hon-breakdown hon-margin-top"><div><dt>Honorário da proposta</dt><dd>R$ 620,00</dd></div><div><dt>Origem</dt><dd>Proposta aceita</dd></div></dl><button class="button primary" id="hon-confirm-link">Vincular e adicionar à carteira</button>`}`
        : '<h3>Confirme a empresa</h3><p class="hon-empty-selection">Busque na lista e selecione a razão social, conferindo o CNPJ e o código antes de continuar.</p><button class="button primary" disabled>Selecione uma empresa</button>'
    }
    function renderCompanies(query) {
      const list = area.querySelector('#hon-company-list')
      if (!list) return
      const normalized = query.toLowerCase().replace(/[./-]/g, '')
      const filtered = companies.filter((item) =>
        `${item.name} ${item.code} ${item.cnpj}`
          .toLowerCase()
          .replace(/[./-]/g, '')
          .includes(normalized),
      )
      area.querySelector('#hon-results-count').textContent =
        `${filtered.length} empresa(s) encontrada(s)`
      list.innerHTML =
        filtered
          .map(
            (item) =>
              `<button class="hon-company-row" type="button" data-company="${item.id}" aria-pressed="${selected?.id === item.id}"><span><strong>${esc(item.name)}</strong><small>Código ${item.code} · ${item.cnpj}</small></span><i>${selected?.id === item.id ? '✓' : '→'}</i></button>`,
          )
          .join('') ||
        '<div class="hon-no-results">Nenhuma empresa encontrada. Confira o código ou o CNPJ.</div>'
    }
    function createForm() {
      return created
        ? `<div class="hon-linked"><h3>Empresa cadastrada</h3><p><strong>${esc(created.name)}</strong><br>${created.cnpj} · Código ${created.code}</p><p>A proposta ainda não foi vinculada.</p><button class="button primary" id="hon-link-created">Vincular esta empresa à proposta aceita</button></div>`
        : `<form id="hon-create-company" class="hon-fields"><p class="hon-section-note">Cadastre a empresa no cadastro central. O vínculo com a proposta será confirmado separadamente.</p><div class="hon-grid2">${field('Razão social', 'hon-company-name', '', 'text', 'required maxlength="200"')}${field('CNPJ', 'hon-company-cnpj', '', 'text', 'required placeholder="00.000.000/0000-00"')}${field('Código da empresa', 'hon-company-code', '', 'text', 'required')}${field('Contato', 'hon-company-contact', '', 'text')}</div><div class="hon-form-actions"><button type="button" class="button ghost" data-path="existing">Voltar à seleção</button><button type="submit" class="button primary">Cadastrar empresa</button></div></form>`
    }
    async function confirmLink(company, mode) {
      const fee =
        mode === 'client'
          ? Review.inputs.decimal(area.querySelector('#hon-client-fee').value)
          : 620
      if (!Number.isFinite(fee) || fee < 0) {
        Review.toast('Informe um honorário válido em reais.')
        area.querySelector('#hon-client-fee')?.focus()
        return
      }
      const accepted = await Review.confirm({
        title:
          mode === 'client'
            ? 'Criar perfil de honorários?'
            : 'Vincular e adicionar à carteira?',
        body: `${company.name} · ${company.cnpj}. ${mode === 'client' ? 'Será criado um perfil de honorários de ' + money(fee) + ' para esta empresa já cadastrada.' : 'Esta empresa receberá o perfil e o valor de R$ 620,00 da proposta aceita. Se já houver perfil ativo, os dados financeiros serão atualizados.'}`,
        confirmLabel:
          mode === 'client' ? 'Criar perfil' : 'Confirmar vínculo e conversão',
      })
      if (!accepted) return
      const existing = clientRows.find((item) => item.company.id === company.id)
      if (existing) existing.fee = fee
      else clientRows.push({ company, fee })
      if (mode === 'quote') linked = company
      selected = null
      Review.toast(
        mode === 'client'
          ? 'Perfil criado para a empresa cadastrada.'
          : 'Proposta vinculada e perfil adicionado à carteira.',
      )
      render()
    }
    root.addEventListener('input', (event) => {
      if (event.target.id === 'hon-company-search') {
        clearTimeout(timer)
        timer = setTimeout(() => renderCompanies(event.target.value), 220)
      }
      if (event.target.id === 'hon-client-search')
        area.querySelector('#hon-client-rows').innerHTML = clientTable(
          event.target.value,
        )
    })
    root.addEventListener('click', (event) => {
      const viewButton = event.target.closest('[data-view]')
      if (viewButton) {
        view = viewButton.dataset.view
        selected = null
        render()
        return
      }
      const pathButton = event.target.closest('[data-path]')
      if (pathButton) {
        path = pathButton.dataset.path
        selected = null
        render()
        return
      }
      const companyButton = event.target.closest('[data-company]')
      if (companyButton) {
        selected = companies.find(
          (item) => item.id === Number(companyButton.dataset.company),
        )
        const mode = area.querySelector('#hon-selection').dataset.mode
        area.querySelector('#hon-selection').innerHTML = selection(mode)
        renderCompanies(area.querySelector('#hon-company-search').value)
        return
      }
      if (event.target.closest('#hon-add-client')) {
        selected = null
        area.querySelector('#hon-add-client-area').innerHTML =
          `<div class="hon-divider"><h3>Vincular empresa existente</h3>${selector('client')}</div>`
        renderCompanies('')
        area.querySelector('#hon-company-search').focus()
      }
      if (event.target.closest('#hon-confirm-link') && selected)
        void confirmLink(selected, 'quote')
      if (event.target.closest('#hon-confirm-client') && selected)
        void confirmLink(selected, 'client')
      if (event.target.closest('#hon-link-created') && created)
        void confirmLink(created, 'quote')
    })
    root.addEventListener('submit', async (event) => {
      if (event.target.id !== 'hon-create-company') return
      event.preventDefault()
      const name = area.querySelector('#hon-company-name').value.trim(),
        cnpj = area.querySelector('#hon-company-cnpj').value.trim(),
        code = area.querySelector('#hon-company-code').value.trim()
      if (companies.some((item) => item.code === code || item.cnpj === cnpj)) {
        Review.toast(
          'Já existe uma empresa com este código ou CNPJ. Use a seleção de empresas.',
        )
        return
      }
      if (
        !(await Review.confirm({
          title: 'Cadastrar esta empresa?',
          body: `${name} · ${cnpj}. O cadastro será criado primeiro; o vínculo com o orçamento depende de uma segunda confirmação.`,
          confirmLabel: 'Cadastrar empresa',
        }))
      )
        return
      created = { id: companies.length + 1, name, cnpj, code }
      companies.push(created)
      render()
    })
    render()
  }

  function parameters() {
    let params = clone(defaults),
      saved = clone(defaults),
      section = 'base',
      dirty = new Set(),
      officeOpen = false
    let officeDraft = {
      nome: 'Jaralcon Assessoria Contábil',
      crc: 'PR-000000/O',
      cidade: 'Curitiba/PR',
      telefone: '(41) 90000-0000',
      email: 'contato@exemplo.invalid',
      site: '',
      validadeDias: 15,
      logo: '',
      escopoExtra: 'Atendimento em horário comercial.',
      condicoes: 'Serviços fora do escopo são orçados à parte.',
      units: [],
    }
    let officeSaved = clone(officeDraft)
    const root = mount(
      'P07',
      'Parâmetros',
      'parametros',
      '<div id="hon-params"></div>',
      [
        'P07 · Prévia local com valores fictícios/base de demonstração. Nenhuma configuração de produção é alterada. A ordem, os nomes e os agrupamentos das nove abas seguem vParametros do HTML original.',
        'A proposta remove títulos repetidos e mantém as instruções que explicam regras financeiras. Dados do escritório permanece em acesso separado; Histórico está fora deste escopo.',
        'Alterações sobrevivem à troca de abas. O rodapé identifica os grupos com pendências; Salvar e Restaurar padrão apenas simulam a gravação/rascunho local. Valores e cálculos definitivos continuam de responsabilidade da API.',
        'A opção original horas.metodo=tabela é mostrada desabilitada porque o contrato atual a rejeita. Acrescentar suporte depende de trabalho explícito no backend, não de substituição por cálculo no navegador.',
      ],
      '../../docs/auditoria-ux/evidencias/24-honorarios-parametros.png',
    )
    const area = root.querySelector('#hon-params')
    const get = (path, object = params) =>
      path.split('.').reduce((value, key) => value?.[key], object)
    const set = (path, value) => {
      const parts = path.split('.')
      let parent = params
      parts.slice(0, -1).forEach((key) => {
        parent = parent[key]
      })
      parent[parts.at(-1)] = value
      if (JSON.stringify(get(path)) === JSON.stringify(get(path, saved)))
        dirty.delete(path)
      else dirty.add(path)
      updateFooter()
    }
    function parameterLabel(path) {
      const [group, index, key, regime] = path.split('.')
      if (group === 'segmentos') {
        const segment = params.segmentos[index]
        return key === 'nome'
          ? 'Nome do segmento ' + (Number(index) + 1)
          : 'Valor mensal de ' +
              segment.nome +
              ' em ' +
              regimes.find(([id]) => id === regime)[1] +
              ', em reais'
      }
      if (group.startsWith('faixas')) {
        const name = {
          faixasSimples: 'Simples Nacional',
          faixasPresumido: 'Lucro Presumido',
          faixasReal: 'Lucro Real',
        }[group]
        return (
          (key === 'ate' ? 'Limite em reais' : 'Acréscimo percentual') +
          ' da faixa ' +
          (Number(index) + 1) +
          ' de ' +
          name
        )
      }
      if (group === 'servicos')
        return key === 'nome'
          ? 'Nome do serviço ' + (Number(index) + 1)
          : 'Valor mensal de ' + params.servicos[index].nome + ', em reais'
      if (group === 'anomalias')
        return key === 'nome'
          ? 'Situação da exceção ' + (Number(index) + 1)
          : 'Acréscimo percentual de ' + params.anomalias[index].nome
      return path
    }
    const input = (label, path, currency = false, attrs = '') => {
      const accessibleLabel = label
        ? label + (currency ? ', em reais' : '')
        : parameterLabel(path)
      return `<label class="field"><span${label ? '' : ' class="sr-only"'}>${esc(label ? label + (currency ? ' (R$)' : '') : accessibleLabel)}</span><input type="${currency || typeof get(path) === 'string' ? 'text' : 'number'}" value="${esc(get(path))}" ${currency ? 'data-format="money"' : ''} data-param="${path}" aria-label="${esc(accessibleLabel)}" ${currency ? 'min="0" step="0.01"' : 'step="0.01"'} ${attrs}></label>`
    }
    const toggle = (label, path) =>
      check(label, `p-${path}`, get(path), `data-param="${path}"`)
    const selectParam = (label, path, options) =>
      select(label, `p-${path}`, get(path), options, `data-param="${path}"`)
    const radios = (label, path, options) =>
      choice(label, path, get(path), options, 'data-param')
    function render() {
      area.innerHTML = `<div class="hon-section-toolbar"><span class="hon-tab-status">Tabela versão 12</span><div class="actions"><button class="button ${officeOpen ? 'primary' : ''}" id="hon-office">Dados do escritório</button><button class="button ghost" id="hon-restore">Restaurar padrão</button></div></div><div class="hon-param-tabs" role="tablist" aria-label="Seções dos parâmetros">${tabs.map(([id, label]) => `<button type="button" role="tab" id="p-tab-${id}" data-section="${id}" aria-controls="hon-param-body" aria-selected="${!officeOpen && id === section}" tabindex="${id === section ? 0 : -1}">${label}</button>`).join('')}</div><div class="hon-param-body" id="hon-param-body" role="${officeOpen ? 'region' : 'tabpanel'}" aria-labelledby="${officeOpen ? 'hon-office' : 'p-tab-' + section}">${officeOpen ? office() : content()}</div><footer class="hon-param-footer"><p id="hon-dirty"></p><div class="actions"><button class="button" id="hon-discard">Descartar rascunho</button><button class="button primary" id="hon-save-params">Salvar parâmetros</button></div></footer>`
      updateFooter()
    }
    function updateFooter() {
      if (!area.querySelector('#hon-dirty')) return
      const footer = area.querySelector('.hon-param-footer')
      footer.style.visibility = dirty.size ? 'visible' : 'hidden'
      footer.setAttribute('aria-hidden', String(!dirty.size))
      const groups = [...new Set([...dirty].map((path) => groupOf(path)))]
      area.querySelector('#hon-dirty').innerHTML = dirty.size
        ? `<strong>${dirty.size} alteração(ões) não salva(s)</strong> · ${groups.map(esc).join(', ')}`
        : 'Nenhuma alteração pendente.'
      area.querySelector('#hon-save-params').disabled = !dirty.size
      area.querySelector('#hon-discard').disabled = !dirty.size
    }
    function groupOf(path) {
      const key = path.split('.')[0]
      if (key === 'office') return 'Dados do escritório'
      if (['segmentos', 'inativa'].includes(key)) return 'Valores base'
      if (['funcionarios', 'socios', 'xml', 'nf', 'filial'].includes(key))
        return 'Adicionais'
      if (['fatorRegime', 'horas'].includes(key)) return 'Regime e horas'
      if (key.startsWith('faixas')) return 'Faturamento'
      if (key === 'servicos') return 'Serviços'
      if (key === 'anomalias') return 'Exceções'
      if (key === 'planos') return 'Planos'
      if (['arredondamento', 'tolerancia'].includes(key)) return 'Regras'
      return 'Cobrança e reajuste'
    }
    function base() {
      return (
        panel(
          'Valor base por segmento e regime',
          `<div class="table-wrap"><table class="hon-parameter-matrix"><thead><tr><th class="name" scope="col">Segmento</th>${regimes.map(([, name]) => `<th scope="col">${name}<small class="muted" style="display:block">R$/mês</small></th>`).join('')}<th scope="col"><span class="sr-only">Ações</span></th></tr></thead><tbody>${params.segmentos.map((item, index) => `<tr><td class="name">${input('', `segmentos.${index}.nome`)}</td>${regimes.map(([key]) => `<td class="amount">${input('', `segmentos.${index}.base.${key}`, true)}</td>`).join('')}<td class="remove"><button class="button ghost" data-remove="segmentos:${index}" ${params.segmentos.length < 2 ? 'disabled' : ''} aria-label="Remover ${esc(item.nome)}">Remover</button></td></tr>`).join('')}</tbody></table></div>`,
          '<button class="button" data-add="segmentos">+ Segmento</button>',
        ) +
        `<div class="hon-margin-top">${panel('Empresa inativa (sem movimento)', `<p>Valor mensal fixo do regime, mais serviços adicionais. Não soma faturamento, funcionários, XML ou notas.</p><div class="hon-inactive">${regimes.map(([key, name]) => input(name, `inativa.${key}`, true)).join('')}</div>`)}</div>`
      )
    }
    function additional() {
      return `<div class="hon-param-grid">${panel('Funcionários', `<p>Folha, eSocial e FGTS Digital por funcionário.</p><div class="hon-grid2">${input('Incluídos na base', 'funcionarios.incluidos', false, 'min="0"')}${input('Por funcionário adicional', 'funcionarios.valor', true)}</div>`)}${panel('Sócios com pró-labore', `<p>Cálculo e guias do pró-labore.</p><div class="hon-grid2">${input('Incluídos na base', 'socios.incluidos', false, 'min="0"')}${input('Por sócio adicional', 'socios.valor', true)}</div>`, toggle(params.socios.ativo ? 'Cobrando' : 'Sem cobrança', 'socios.ativo'))}${panel('Blocos de XML', `<p>XMLs de entrada e saída importados por mês.</p><div class="hon-grid3">${input('Franquia', 'xml.franquia', false, 'min="0"')}${input('Tamanho do bloco', 'xml.bloco', false, 'min="1"')}${input('Valor por bloco', 'xml.valorBloco', true)}</div>`, toggle(params.xml.ativo ? 'Cobrando' : 'Sem cobrança', 'xml.ativo'))}${panel('Emissão de notas fiscais', `<p>Quando o escritório emite as notas do cliente.</p><div class="hon-grid3">${input('Valor fixo', 'nf.fixo', true)}${input('Notas incluídas', 'nf.franquia', false, 'min="0"')}${input('Por nota adicional', 'nf.porNota', true)}</div>`)}${panel(
        'Filiais',
        `<p>Cada estabelecimento adicional pode ser cobrado por valor fixo ou percentual da matriz.</p>${radios(
          'Formato do valor da filial',
          'filial.modo',
          [
            ['fixo', 'Valor fixo'],
            ['pct', '% da matriz'],
          ],
        )}<div class="hon-grid2 hon-margin-top">${params.filial.modo === 'pct' ? input('Percentual por filial (%)', 'filial.pct', false, 'min="0"') : input('Por filial ativa', 'filial.valor', true) + input('Por filial inativa', 'filial.valorInativa', true)}</div>`,
      )}</div>`
    }
    function complexity() {
      return `<div class="hon-param-grid">${panel('Fator de complexidade por regime', `<p>Multiplica os adicionais por volume. Use acima de 1 onde cada documento dá mais trabalho.</p><div class="hon-grid2">${regimes.map(([key, name]) => input(`${name} (×)`, `fatorRegime.${key}`, false, 'min="0"')).join('')}</div>`)}${panel('Horas × mão de obra', `<p>Custo real da equipe por hora e margem sobre esse custo.</p><div class="hon-grid2">${input('Custo por hora', 'horas.custoHora', true)}${input('Margem desejada (%)', 'horas.margem', false, 'min="0" max="90"')}</div><div class="hon-margin-top"><label class="field"><span>Como usar as horas no preço</span><select data-param="horas.metodo"><option value="maior" ${params.horas.metodo === 'maior' ? 'selected' : ''}>Vale o maior: tabela ou horas</option><option value="horas" ${params.horas.metodo === 'horas' ? 'selected' : ''}>Vale sempre o cálculo por horas</option><option value="tabela" disabled>Vale a tabela; horas só mostram a margem — indisponível</option></select></label></div><p class="hon-inline-help">O terceiro modo depende de suporte adicional do serviço de cálculo.</p>`)}</div>`
    }
    function bandTable(key, name) {
      return panel(
        name,
        `<div class="table-wrap"><table class="hon-compact-table"><thead><tr><th>Faturamento até (R$)</th><th>Acréscimo (%)</th><th>Ações</th></tr></thead><tbody>${params[key].map((row, index) => `<tr><td>${row.ate === null ? 'Acima da faixa anterior' : input('', `${key}.${index}.ate`, true)}</td><td>${input('', `${key}.${index}.pct`, false, 'min="0"')}</td><td>${row.ate !== null && (key !== 'faixasSimples' || params[key].length > 1) ? `<button class="button ghost" data-remove="${key}:${index}">Remover</button>` : ''}</td></tr>`).join('')}</tbody></table></div>`,
        `<button class="button" data-add="${key}">+ Faixa</button>`,
      )
    }
    function bands() {
      return `<div class="hon-fields"><div class="hon-readonly"><strong>MEI</strong><p class="hon-inline-help">Sem faixas de faturamento. Vale o valor base do segmento.</p></div>${bandTable('faixasSimples', 'Simples Nacional')}${bandTable('faixasPresumido', 'Lucro Presumido')}${bandTable('faixasReal', 'Lucro Real')}</div>`
    }
    function extraList(key) {
      const services = key === 'servicos'
      return panel(
        services ? 'Serviços adicionais' : 'Taxas de exceção',
        `<p>${services ? 'Itens opcionais que entram no cálculo, nos planos e na proposta.' : 'Acréscimo para atraso de documentos, desorganização ou retrabalho.'}</p><div class="table-wrap"><table class="hon-compact-table"><thead><tr><th>${services ? 'Serviço' : 'Situação'}</th><th>${services ? 'Valor mensal (R$)' : 'Acréscimo (%)'}</th><th></th></tr></thead><tbody>${params[key].map((item, index) => `<tr><td>${input('', `${key}.${index}.nome`)}</td><td>${input('', `${key}.${index}.${services ? 'valor' : 'pct'}`, services, 'min="0"')}</td><td><button class="button ghost" data-remove="${key}:${index}">Remover</button></td></tr>`).join('')}</tbody></table></div>`,
        `<button class="button" data-add="${key}">+ ${services ? 'Serviço' : 'Exceção'}</button>`,
      )
    }
    function plans() {
      return panel(
        'Planos de venda',
        `<div class="hon-plan-grid">${params.planos.niveis.map((plan, index) => `<section class="hon-plan">${toggle(`Nível ${index + 1} ativo`, `planos.niveis.${index}.ativo`)}${input('Nome do plano', `planos.niveis.${index}.nome`)}${input('Descrição curta', `planos.niveis.${index}.descricao`)}${toggle('Inclui emissão de notas fiscais', `planos.niveis.${index}.emiteNF`)}<div><span class="hon-mini-heading">Serviços incluídos</span><div class="hon-fields">${params.servicos.map((service) => check(service.nome, `p-plan-${index}-${service.id}`, plan.servicos.includes(service.id), `data-plan-service="${index}:${service.id}"`)).join('')}</div></div>${input('Ajuste sobre o preço calculado (%)', `planos.niveis.${index}.ajuste`, false, 'min="-100"')}<span class="hon-field-note">Use negativo para desconto de pacote.</span><label class="check"><input type="radio" name="recommended" data-highlight="${index}" ${plan.destaque ? 'checked' : ''}><span>Destacar como recomendado</span></label></section>`).join('')}</div><p class="hon-inline-help">Os planos partem do perfil do cliente e trocam só notas e serviços. Desative níveis para ofertar apenas dois.</p>`,
        toggle('Ofertar em planos', 'planos.ativo'),
      )
    }
    function billing() {
      return `<div class="hon-param-grid">${panel(
        'Parcelas por ano',
        `${radios('Parcelas por ano', 'decimoTerceiro', [
          [false, '12 parcelas'],
          [true, '13 parcelas'],
        ])}<p class="hon-inline-help">${params.decimoTerceiro ? '12 mensais + 13ª em dezembro, referente ao encerramento anual.' : '12 mensais, sem 13ª parcela.'}</p>`,
      )}${panel(
        'Dia de vencimento',
        `${radios('Dia de vencimento', 'vencimento', [
          [10, 'Dia 10'],
          [20, 'Dia 20'],
        ])}<p class="hon-inline-help">Orçamentos já salvos mantêm o dia de quando foram feitos.</p>`,
      )}<div class="span-2">${panel('Limite do reajuste', '<p>O reajuste anual nunca passa da tabela. Contratos que já estão na tabela ou acima não são reduzidos.</p>', toggle(params.reajusteTeto ? 'Ligado' : 'Desligado', 'reajusteTeto'))}</div>${panel(
        'Quando reajustar',
        `${radios('Periodicidade', 'indices.periodicidade', [
          ['aniversario', 'A cada 12 meses'],
          ['janeiro', 'Em janeiro de cada ano'],
        ])}${params.indices.periodicidade === 'janeiro' ? `<div class="hon-margin-top">${selectParam('Contratos novos não reajustam no primeiro janeiro se começaram a partir de', 'indices.carencia', [[0, 'Sempre reajustar no primeiro janeiro'], ...['Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'].map((name, i) => [i + 2, name])])}</div>` : '<p class="hon-inline-help">Cada contrato reajusta no aniversário da data de início ou do último reajuste.</p>'}`,
      )}<div class="span-2">${panel(
        'Percentual do reajuste anual',
        `${radios('Base do reajuste', 'indices.usar', [
          ['ipca', 'IPCA'],
          ['igpm', 'IGP-M'],
          ['fixo', 'Percentual fixo'],
        ])}<div class="hon-grid3 hon-margin-top">${input('IPCA 12 meses (%)', 'indices.ipca.pct', false, 'min="0"')}${input('IGP-M 12 meses (%)', 'indices.igpm.pct', false, 'min="0"')}${input('Percentual fixo (%)', 'indices.fixo.pct', false, 'min="0"')}</div><div class="hon-margin-top">${input('Referência dos índices', 'indices.referencia')}</div><p class="hon-inline-help">Texto na proposta: reajuste ${params.indices.periodicidade === 'janeiro' ? 'em janeiro de cada ano' : 'a cada 12 meses'} pelo índice selecionado. Índices são informados manualmente.</p>`,
      )}</div>${panel('Descontos e reajustes', `<div class="hon-grid2">${input('Desconto máximo (%)', 'descontoMax', false, 'min="0" max="100"')}${input('Aumento máximo por cliente (%)', 'reajusteMax', false, 'min="0"')}</div>`)}</div>`
    }
    function office() {
      const item = (label, key, type = 'text') =>
        '<label class="field"><span>' +
        label +
        '</span><input type="' +
        type +
        '" data-office="' +
        key +
        '" value="' +
        esc(officeDraft[key]) +
        '"></label>'
      return panel(
        'Dados do escritório',
        '<div class="hon-fields"><div class="field"><span>Logo do escritório</span><div class="actions"><span class="brand-logo"><img src="../../src/assets/jaralcon-report-logo.png" alt="Logo Jaral"></span><label class="button" for="office-logo">Escolher imagem</label><input id="office-logo" type="file" accept="image/png,image/jpeg" hidden><small id="office-logo-name">PNG ou JPEG · até 149 KB</small></div></div>' +
          item('Nome do escritório', 'nome') +
          '<div class="hon-grid2">' +
          item('Registro CRC', 'crc') +
          item('Cidade', 'cidade') +
          item('Telefone ou WhatsApp', 'telefone') +
          item('E-mail', 'email', 'email') +
          '</div>' +
          item('Site', 'site') +
          item(
            'Validade padrão das propostas (dias)',
            'validadeDias',
            'number',
          ) +
          '<label class="field"><span>Itens fixos do escopo</span><textarea data-office="escopoExtra" rows="3">' +
          esc(officeDraft.escopoExtra) +
          '</textarea><small>Um por linha. Entram em todas as propostas.</small></label><label class="field"><span>Condições comerciais</span><textarea data-office="condicoes" rows="3">' +
          esc(officeDraft.condicoes) +
          '</textarea><small>Uma por linha.</small></label><details><summary>Unidades do escritório</summary><div class="hon-margin-top hon-fields">' +
          (officeDraft.units.length
            ? officeDraft.units
            : [{ name: '', address: '', phone: '' }]
          )
            .map(
              (unit, index) =>
                '<fieldset><legend class="hon-mini-heading">Unidade ' +
                (index + 1) +
                '</legend><div class="hon-fields">' +
                [
                  ['name', 'Nome da unidade'],
                  ['address', 'Endereço'],
                  ['phone', 'Telefone'],
                ]
                  .map(
                    ([key, label]) =>
                      '<label class="field"><span>' +
                      label +
                      '</span><input data-office-unit="' +
                      key +
                      '" data-office-unit-index="' +
                      index +
                      '" value="' +
                      esc(unit[key] || '') +
                      '"></label>',
                  )
                  .join('') +
                '</div></fieldset>',
            )
            .join('') +
          '</div></details></div>',
      )
    }
    function content() {
      if (section === 'base') return base()
      if (section === 'adicionais') return additional()
      if (section === 'complexidade') return complexity()
      if (section === 'faixas') return bands()
      if (section === 'servicos' || section === 'anomalias')
        return extraList(section)
      if (section === 'planos') return plans()
      if (section === 'cobranca') return billing()
      return `<div class="hon-param-grid">${panel('Arredondamento', `<p>O valor final sobe para o próximo múltiplo.</p>${input('Arredondar para múltiplos de', 'arredondamento', true)}`)}${panel('Tolerância da comparação', `<p>Diferença aceita para considerar o cliente alinhado.</p>${input('Tolerância (%)', 'tolerancia', false, 'min="0" max="100"')}`)}</div>`
    }
    root.addEventListener('input', (event) => {
      if (event.target.dataset.office) {
        const key = event.target.dataset.office
        officeDraft[key] =
          key === 'validadeDias'
            ? Number(event.target.value)
            : event.target.value
        dirty.add('office.' + key)
        updateFooter()
        return
      }
      if (event.target.dataset.officeUnit) {
        const index = Number(event.target.dataset.officeUnitIndex || 0)
        if (!officeDraft.units[index])
          officeDraft.units[index] = { name: '', address: '', phone: '' }
        officeDraft.units[index][event.target.dataset.officeUnit] =
          event.target.value
        dirty.add('office.units')
        updateFooter()
        return
      }
      const path = event.target.dataset.param
      if (
        !path ||
        ['checkbox', 'radio'].includes(event.target.type) ||
        event.target.tagName === 'SELECT'
      )
        return
      set(
        path,
        event.target.dataset.format === 'money'
          ? Review.inputs.decimal(event.target.value)
          : event.target.type === 'number'
            ? Number(event.target.value)
            : event.target.value,
      )
    })
    root.addEventListener('change', (event) => {
      if (event.target.id === 'office-logo') {
        const file = event.target.files[0]
        if (file) {
          const accepted =
            ['image/png', 'image/jpeg'].includes(file.type) &&
            file.size <= 149000
          root.querySelector('#office-logo-name').textContent = accepted
            ? file.name
            : 'Selecione PNG ou JPEG com até 149 KB.'
          if (accepted) {
            officeDraft.logo = file.name
            dirty.add('office.logo')
            updateFooter()
          }
        }
        return
      }
      const path = event.target.dataset.param
      if (event.target.dataset.highlight !== undefined) {
        params.planos.niveis.forEach((plan, index) => {
          plan.destaque = index === Number(event.target.dataset.highlight)
        })
        dirty.add('planos.niveis')
        render()
        return
      }
      if (event.target.dataset.planService) {
        const [index, id] = event.target.dataset.planService.split(':')
        const plan = params.planos.niveis[Number(index)]
        plan.servicos = event.target.checked
          ? [...plan.servicos, id]
          : plan.servicos.filter((item) => item !== id)
        dirty.add('planos.niveis')
        updateFooter()
        return
      }
      if (!path) return
      if (event.target.type === 'checkbox') set(path, event.target.checked)
      else if (event.target.type === 'radio') {
        const value = event.target.value
        set(
          path,
          value === 'true'
            ? true
            : value === 'false'
              ? false
              : isNaN(Number(value))
                ? value
                : Number(value),
        )
      } else if (event.target.tagName === 'SELECT')
        set(
          path,
          ['indices.carencia'].includes(path)
            ? Number(event.target.value)
            : event.target.value,
        )
      else return
      render()
    })
    root.addEventListener('keydown', (event) => {
      const target = event.target.closest('[data-section]')
      if (
        !target ||
        !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)
      )
        return
      event.preventDefault()
      const current = tabs.findIndex(([id]) => id === target.dataset.section)
      section =
        tabs[
          event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? tabs.length - 1
              : (current +
                  (event.key === 'ArrowRight' ? 1 : -1) +
                  tabs.length) %
                tabs.length
        ][0]
      officeOpen = false
      render()
      area.querySelector(`[data-section="${section}"]`).focus()
    })
    root.addEventListener('click', async (event) => {
      const tab = event.target.closest('[data-section]')
      if (tab) {
        section = tab.dataset.section
        officeOpen = false
        render()
        return
      }
      if (event.target.closest('#hon-office')) {
        officeOpen = !officeOpen
        render()
        return
      }
      if (event.target.closest('#hon-save-params')) {
        saved = clone(params)
        officeSaved = clone(officeDraft)
        dirty.clear()
        updateFooter()
        Review.toast(
          'Parâmetros salvos. A nova tabela será usada nos próximos cálculos.',
        )
        return
      }
      if (event.target.closest('#hon-discard')) {
        if (
          await Review.confirm({
            title: 'Descartar o rascunho?',
            body: 'As alterações ainda não salvas serão removidas.',
            confirmLabel: 'Descartar',
          })
        ) {
          params = clone(saved)
          officeDraft = clone(officeSaved)
          dirty.clear()
          render()
        }
        return
      }
      if (event.target.closest('#hon-restore')) {
        if (
          await Review.confirm({
            title: 'Restaurar parâmetros padrão?',
            body: 'Valores, adicionais, faixas, serviços, exceções, planos, índices e regras voltam ao padrão. Nada é salvo até você selecionar Salvar parâmetros.',
            confirmLabel: 'Restaurar no rascunho',
          })
        ) {
          params = clone(defaults)
          dirty.clear()
          Object.keys(params).forEach((key) => {
            if (JSON.stringify(params[key]) !== JSON.stringify(saved[key]))
              dirty.add(key)
          })
          render()
        }
        return
      }
      const add = event.target.closest('[data-add]')
      if (add) {
        const key = add.dataset.add
        if (key === 'segmentos')
          params.segmentos.push({
            id: `novo-${Date.now()}`,
            nome: 'Novo segmento',
            base: { mei: 0, simples: 0, presumido: 0, real: 0 },
          })
        else if (key.startsWith('faixas')) {
          const list = params[key],
            last = list[list.length - 1],
            prior = list[list.length - 2]?.ate || 0
          list.splice(list.length - 1, 0, {
            ate:
              last.ate === null
                ? prior + 100000
                : Math.round((prior + last.ate) / 2),
            pct: last.pct,
          })
        } else
          params[key].push(
            key === 'servicos'
              ? { id: `novo-${Date.now()}`, nome: 'Novo serviço', valor: 0 }
              : { id: `nova-${Date.now()}`, nome: 'Nova exceção', pct: 0 },
          )
        dirty.add(key)
        render()
        return
      }
      const remove = event.target.closest('[data-remove]')
      if (remove) {
        const [key, index] = remove.dataset.remove.split(':')
        if (
          await Review.confirm({
            title: 'Remover este item do rascunho?',
            body: 'A remoção será enviada somente ao salvar. Registros em uso poderão exigir ajuste antes da gravação.',
            confirmLabel: 'Remover',
          })
        ) {
          const item = params[key][Number(index)]
          params[key].splice(Number(index), 1)
          if (key === 'servicos')
            params.planos.niveis.forEach((plan) => {
              plan.servicos = plan.servicos.filter((id) => id !== item.id)
            })
          dirty.add(key)
          render()
        }
      }
    })
    render()
  }
  if (!window.Review) {
    document.getElementById('preview').innerHTML =
      '<p style="font:14px system-ui;padding:32px">Aguarde os arquivos compartilhados da revisão visual.</p>'
    return
  }
  const page = document.body.dataset.proposal
  if (page === 'P05') newQuote()
  else if (page === 'P06') binding()
  else if (page === 'P07') parameters()
})()
