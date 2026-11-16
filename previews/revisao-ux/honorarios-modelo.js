/* global window */
/* Marcação dos grupos copiada do HTML de referência; sem motor financeiro. */
;(function () {
  const REGIMES = [
    { id: 'mei', nome: 'MEI' },
    { id: 'simples', nome: 'Simples Nacional' },
    { id: 'presumido', nome: 'Lucro Presumido' },
    { id: 'real', nome: 'Lucro Real' },
  ]
  const esc = (value) =>
    String(value ?? '').replace(
      /[&<>"']/g,
      (c) =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;',
        })[c],
    )
  const parseBR = (value) => {
    const text = String(value ?? 0)
    return (
      Number(
        text.includes(',') ? text.replaceAll('.', '').replace(',', '.') : text,
      ) || 0
    )
  }
  const n = (value) => (typeof value === 'number' ? value : parseBR(value))
  const brl = (value) =>
    Number(value || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    })
  const brl0 = brl
  const numBR = (value, d = 2) =>
    Number(value || 0).toLocaleString('pt-BR', { maximumFractionDigits: d })
  const plural = (q, s, p) => (q === 1 ? s : p)
  const regNome = (id) => REGIMES.find((r) => r.id === id)?.nome || id
  let state = {
    params: {
      anomalias: [
        { id: 'atraso', nome: 'Documentos entregues fora do prazo', pct: 15 },
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
        { ate: 30000, pct: 0 },
        { ate: 100000, pct: 15 },
        { ate: 300000, pct: 30 },
        { ate: 800000, pct: 50 },
        { ate: null, pct: 80 },
      ],
      faixasReal: [
        { ate: 30000, pct: 0 },
        { ate: 100000, pct: 15 },
        { ate: 300000, pct: 30 },
        { ate: 800000, pct: 50 },
        { ate: null, pct: 80 },
      ],
      faixasSimples: [
        { ate: 30000, pct: 0 },
        { ate: 100000, pct: 15 },
        { ate: 300000, pct: 30 },
        { ate: 400000, pct: 50 },
      ],
      fatorRegime: { mei: 1, presumido: 1.2, real: 1.5, simples: 1 },
      filial: { modo: 'fixo', pct: 80, valor: 250, valorInativa: 100 },
      funcionarios: { incluidos: 1, valor: 45 },
      horas: { custoHora: 85, margem: 35, metodo: 'maior' },
      inativa: { mei: 60, presumido: 180, real: 400, simples: 150 },
      indices: {
        carencia: 7,
        fixo: { nome: 'Percentual fixo', pct: 5 },
        igpm: { nome: 'IGP-M', pct: 3.34 },
        ipca: { nome: 'IPCA', pct: 4.58 },
        periodicidade: 'aniversario',
        referencia: 'acumulado 12 meses até set/2026',
        usar: 'ipca',
      },
      nf: { fixo: 80, franquia: 10, porNota: 4 },
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
            descricao:
              'Contabilidade + emissão de notas + consultoria contábil',
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
          base: { mei: 120, presumido: 850, real: 1800, simples: 450 },
          id: 'servicos',
          nome: 'Prestação de serviços',
        },
        {
          base: { mei: 150, presumido: 1000, real: 2100, simples: 550 },
          id: 'comercio',
          nome: 'Comércio',
        },
        {
          base: { mei: 180, presumido: 1300, real: 2600, simples: 750 },
          id: 'industria',
          nome: 'Indústria',
        },
        {
          base: { mei: 120, presumido: 900, real: 1900, simples: 500 },
          id: 'saude',
          nome: 'Saúde (clínicas e consultórios)',
        },
        {
          base: { mei: 150, presumido: 1200, real: 2400, simples: 700 },
          id: 'construcao',
          nome: 'Construção civil',
        },
        {
          base: { mei: 0, presumido: 700, real: 1500, simples: 400 },
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
        { id: 'gerencial', nome: 'Reunião gerencial mensal', valor: 250 },
        { id: 'irpf', nome: 'IRPF dos sócios (mensalizado)', valor: 35 },
        { id: 'certidoes', nome: 'Gestão de certidões e alvarás', valor: 60 },
        { id: 'bpo', nome: 'BPO financeiro', valor: 450 },
      ],
      socios: { ativo: false, incluidos: 1, valor: 30 },
      tolerancia: 5,
      vencimento: 10,
      xml: { ativo: false, bloco: 100, franquia: 100, valorBloco: 50 },
    },
    grpOpen: {},
  }
  const DEFAULT_PARAMS = state.params
  const faixaHint = (inp) =>
    inp.regime === 'mei'
      ? 'MEI: o honorário não varia por faixa de faturamento.'
      : 'O acréscimo segue a faixa configurada para o regime.'
  function stepperHTML(inp, ns, k, label, hint) {
    return `<label class="f" for="${ns}-${k}">${label}<div class="stepper"><button type="button" data-act="step" data-ns="${ns}" data-k="${k}" data-d="-1" aria-label="Diminuir">−</button><input id="${ns}-${k}" type="number" min="0" step="1" inputmode="numeric" data-ns="${ns}" data-k="${k}" value="${n(inp[k])}"><button type="button" data-act="step" data-ns="${ns}" data-k="${k}" data-d="1" aria-label="Aumentar">+</button></div>${hint ? `<span class="hint">${hint}</span>` : ''}</label>`
  }
  function regimeCtl(inp, ns) {
    return `<div class="f"><span>Regime tributário</span><div class="segctl" role="radiogroup" aria-label="Regime tributário">${REGIMES.map((r) => `<button type="button" role="radio" aria-checked="${inp.regime === r.id}" class="${inp.regime === r.id ? 'on' : ''}" data-act="set" data-ns="${ns}" data-k="regime" data-v="${r.id}">${r.nome}</button>`).join('')}</div></div>`
  }
  function segSelect(inp, ns) {
    return `<label class="f" for="${ns}-segmento">Segmento<select id="${ns}-segmento" data-ns="${ns}" data-k="segmento">${state.params.segmentos.map((s) => `<option value="${esc(s.id)}" ${s.id === inp.segmento ? 'selected' : ''}>${esc(s.nome)}</option>`).join('')}</select></label>`
  }
  function fmtInt(v) {
    return Math.round(n(v)).toLocaleString('pt-BR')
  }
  function filialInativaUnit(regime, P = state.params) {
    const F = Object.assign(
      { modo: 'fixo', valor: 0, pct: 80, valorInativa: 0 },
      P.filial || {},
    )
    if (F.modo === 'pct') {
      const vi = n((P.inativa || DEFAULT_PARAMS.inativa)[regime]),
        pc = Math.max(0, n(F.pct)),
        u = (vi * pc) / 100
      return {
        v: u,
        det:
          numBR(pc) +
          '% do valor de inativa ' +
          regNome(regime) +
          ' (' +
          brl(u) +
          ')',
      }
    }
    return { v: n(F.valorInativa), det: brl(n(F.valorInativa)) }
  }
  function filialInatHint(regime, P = state.params) {
    const u = filialInativaUnit(regime, P)
    return (
      brl(u.v) +
      ' por filial inativa' +
      (P.filial && P.filial.modo === 'pct'
        ? ' · ' + numBR(n(P.filial.pct)) + '% do valor de empresa inativa'
        : '')
    )
  }
  function filialHint(P = state.params) {
    const F = Object.assign({ modo: 'fixo', valor: 0, pct: 80 }, P.filial || {})
    return F.modo === 'pct'
      ? numBR(n(F.pct)) + '% do honorário da matriz por filial'
      : brl(n(F.valor)) + ' por filial'
  }
  function fatInput(inp, ns, disabled) {
    return `<label class="f" for="${ns}-faturamento">Faturamento mensal médio<div class="prefix"><span>R$</span><input id="${ns}-faturamento" type="text" inputmode="numeric" autocomplete="off" data-fmt="int" data-ns="${ns}" data-k="faturamento" value="${fmtInt(inp.faturamento)}" ${disabled ? 'disabled' : ''}></div><span class="hint" id="${ns}-fx">${disabled ? 'Não entra no cálculo de empresa inativa.' : faixaHint(inp)}</span></label>`
  }
  function grpOpen(ns, g, inp) {
    const k = ns + ':' + g,
      sel = (inp[g === 'serv' ? 'servicos' : 'anomalias'] || []).length > 0
    return sel || !!(state.grpOpen && state.grpOpen[k])
  }
  function extrasFieldset(inp, ns, soServ) {
    const P = state.params,
      items = []
    if (!soServ) {
      items.push(`<div class="opc ${inp.usarHoras ? 'on' : ''}"><label class="switch"><input type="checkbox" id="${ns}-usarHoras" data-ns="${ns}" data-k="usarHoras" ${inp.usarHoras ? 'checked' : ''}><span><b>Tempo adicional da equipe</b><small>Calcula pelo custo/hora quando o cliente exige mais trabalho.</small></span></label>
      ${inp.usarHoras ? `<div class="opc-b"><label class="f" for="${ns}-horas">Horas estimadas por mês <span class="hint">Digitação, conciliação, apuração e atendimento deste cliente.</span><div class="suffix" style="max-width:220px"><input id="${ns}-horas" type="number" min="0" step="0.5" inputmode="decimal" data-ns="${ns}" data-k="horas" value="${n(inp.horas)}"><span>h</span></div><span class="hint">Custo/hora da equipe ${brl(n(P.horas.custoHora))} · margem desejada ${numBR(n(P.horas.margem))}% · ${{ maior: 'vale o maior entre tabela e horas', horas: 'vale o cálculo por horas', tabela: 'horas só para conferir a margem' }[P.horas.metodo] || ''}</span></label></div>` : ''}</div>`)
    }
    if (P.servicos.length) {
      const on = grpOpen(ns, 'serv', inp)
      items.push(`<div class="opc ${on ? 'on' : ''}"><label class="switch"><input type="checkbox" id="${ns}-grp-serv" data-act-change="grp-toggle" data-ns2="${ns}" data-g="serv" ${on ? 'checked' : ''}><span><b>Serviços adicionais</b><small>Consultoria, BPO, IRPF e outros serviços cobrados à parte.</small></span></label>
      ${on ? `<div class="opc-b"><div class="chips">${P.servicos.map((sv) => `<label class="chip"><input type="checkbox" data-ns="${ns}" data-k="servicos" data-v="${esc(sv.id)}" ${(inp.servicos || []).includes(sv.id) ? 'checked' : ''}>${esc(sv.nome)} <small>${brl0(n(sv.valor))}</small></label>`).join('')}</div></div>` : ''}</div>`)
    }
    if (!soServ && (P.anomalias || []).length) {
      const on = grpOpen(ns, 'exc', inp)
      items.push(`<div class="opc ${on ? 'on' : ''}"><label class="switch"><input type="checkbox" id="${ns}-grp-exc" data-act-change="grp-toggle" data-ns2="${ns}" data-g="exc" ${on ? 'checked' : ''}><span><b>Taxa de exceção</b><small>Acréscimo para clientes que dão mais trabalho que o normal.</small></span></label>
      ${on ? `<div class="opc-b"><div class="chips">${P.anomalias.map((x) => `<label class="chip"><input type="checkbox" data-ns="${ns}" data-k="anomalias" data-v="${esc(x.id)}" ${(inp.anomalias || []).includes(x.id) ? 'checked' : ''}>${esc(x.nome)} <small>+${numBR(n(x.pct))}%</small></label>`).join('')}</div></div>` : ''}</div>`)
    }
    if (!items.length) return ''
    return `<fieldset class="grp tone-opc"><legend>Ajustes do honorário</legend><p class="hint" style="margin:-4px 0 0">Ative só o que se aplica a este cliente.</p><div class="opc-list">${items.join('')}</div></fieldset>`
  }
  function pricingFields(inp, ns) {
    const P = state.params,
      fr = n(P.fatorRegime && P.fatorRegime[inp.regime]) || 1
    const inatSwitch = `<label class="switch"><input type="checkbox" id="${ns}-inativa" data-ns="${ns}" data-k="inativa" ${inp.inativa ? 'checked' : ''}>Empresa inativa (sem movimento)</label>`
    if (inp.inativa) {
      return `<fieldset class="grp tone-empresa"><legend>Empresa</legend>${segSelect(inp, ns)}${regimeCtl(inp, ns)}${fatInput(inp, ns, true)}${inatSwitch}
      <div class="inactive-note"><span>Empresa parada, sem faturamento, funcionários ou notas. Cobra o valor de inativa do regime <b>${regNome(inp.regime)}: ${brl(n((P.inativa || {})[inp.regime]))}</b>, mais os serviços marcados abaixo. Ajuste os valores em Parâmetros › Valores base.</span></div></fieldset>
    ${extrasFieldset(inp, ns, true)}`
    }
    return `
  <fieldset class="grp tone-empresa"><legend>Empresa</legend>
    ${segSelect(inp, ns)}
    ${regimeCtl(inp, ns)}
    ${fr !== 1 ? `<span class="hint muted" style="margin-top:-6px;font-size:12.5px">Fator de complexidade ${regNome(inp.regime)}: ×${numBR(fr)} sobre funcionários, sócios, XML, notas e filiais.</span>` : ''}
    ${fatInput(inp, ns)}
    ${inatSwitch}
  </fieldset>
  <fieldset class="grp tone-dp"><legend>Departamento pessoal</legend>
    <div class="fg keep">${stepperHTML(inp, ns, 'funcionarios', 'Funcionários', `${n(P.funcionarios.incluidos)} ${plural(n(P.funcionarios.incluidos), 'incluído', 'incluídos')} · ${brl(n(P.funcionarios.valor))} cada adicional`)}${P.socios.ativo === false ? '' : stepperHTML(inp, ns, 'socios', 'Sócios com pró-labore', `${n(P.socios.incluidos)} ${plural(n(P.socios.incluidos), 'incluído', 'incluídos')} · ${brl(n(P.socios.valor))} cada adicional`)}</div>
  </fieldset>
  <fieldset class="grp tone-fiscal"><legend>Fiscal</legend>
    <div class="fg">
      ${P.xml.ativo === false ? '' : `<label class="f" for="${ns}-xml">Média de XMLs por mês (entrada e saída)<input id="${ns}-xml" type="number" min="0" step="10" inputmode="numeric" data-ns="${ns}" data-k="xml" value="${n(inp.xml)}"><span class="hint">Franquia de ${n(P.xml.franquia)} · blocos de ${n(P.xml.bloco)} por ${brl(n(P.xml.valorBloco))}</span></label>`}
    </div>
    <label class="switch"><input type="checkbox" id="${ns}-emiteNF" data-ns="${ns}" data-k="emiteNF" ${inp.emiteNF ? 'checked' : ''}>O escritório emite as notas fiscais do cliente</label>
    ${inp.emiteNF ? `<label class="f" for="${ns}-notas">Média de notas emitidas por mês<input id="${ns}-notas" type="number" min="0" step="1" inputmode="numeric" data-ns="${ns}" data-k="notas" value="${n(inp.notas)}"><span class="hint">${brl(n(P.nf.fixo))} fixo · ${n(P.nf.franquia)} notas incluídas · ${brl(n(P.nf.porNota))} por nota adicional</span></label>` : ''}
  </fieldset>
  <fieldset class="grp tone-fil"><legend>Filiais</legend>
    <div class="fg keep">${stepperHTML(inp, ns, 'filiais', 'Filiais ativas', filialHint(P).replace(' por filial', ' por filial ativa'))}${stepperHTML(inp, ns, 'filiaisInativas', 'Filiais inativas', filialInatHint(inp.regime, P))}</div>
  </fieldset>
  ${extrasFieldset(inp, ns)}`
  }

  window.HonorariosModelo = {
    params: DEFAULT_PARAMS,
    pricing: (profile, namespace, params = DEFAULT_PARAMS, expanded = {}) => {
      state = { params, grpOpen: expanded }
      return pricingFields(profile, namespace)
    },
  }
})()
