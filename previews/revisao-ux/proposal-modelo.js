/* global Review, window, document, Blob, URL, setTimeout */
/* Document markup and styles copied from docs/honorarios_base/honorarios-jaralcon (1).html.
 * Only snapshot adapters replace the calculation dependency. No pricing engine or API. */
;(() => {
  'use strict'
  const esc = Review.esc
  const clone = (value) => JSON.parse(JSON.stringify(value))
  const n = (value) =>
    typeof value === 'number' ? value : Review.inputs.decimal(value)
  const brl = (value) =>
    Number(value || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    })
  const brl0 = brl
  const plural = (count, one, many) => (count === 1 ? one : many)
  let state = { params: window.HonorariosModelo.params, perfil: {} }
  const DEFAULT_PARAMS = window.HonorariosModelo.params
  const regNome = (id) =>
    REGIMES.find((item) => item.id === id)?.nome || esc(id)
  const segNome = (id) =>
    state.params.segmentos.find((item) => item.id === id)?.nome || id
  const iniClamp = (value) => {
    const aliases = {
      no_ato: 0,
      ato: 0,
      '1a_competencia': 1,
      '2a_competencia': 2,
      '3a_competencia': 3,
    }
    return Math.max(0, Math.min(3, Number(aliases[value] ?? value ?? 1)))
  }
  const compTxt = (count) =>
    count + ' ' + plural(count, 'compet\u00eancia', 'compet\u00eancias')
  const aberturaTxt = (opening) => {
    const count = Math.max(1, n(opening.parcelas) || 1),
      value = n(opening.valor)
    return count === 1
      ? brl(value) + ' \u00e0 vista'
      : count +
          '\u00d7 de ' +
          brl(value / count) +
          ' (total ' +
          brl(value) +
          ')'
  }
  const composition = (quote) => ({
    total: n(quote.sugerido ?? quote.valor ?? 620),
    linhas: quote.composicao || [],
  })
  const PROPOSAL_CSS = `.pp{background:#FFFFFF;color:#1E1B3A;max-width:800px;margin:0 auto;border-radius:10px;overflow:hidden;font-family:Inter,system-ui,sans-serif;font-size:14.5px;line-height:1.55;box-shadow:0 10px 30px -12px rgba(3,0,41,.35)}
.pp *{box-sizing:border-box}
.pp-hero{position:relative;background:#030029;color:#FFFFFF;padding:24px 40px 38px;overflow:hidden}
.pp-top{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap}
.pp-logo{display:block;height:40px;width:auto}
.pp-num{text-align:right;font-size:13px;font-weight:700;color:#FFFFFF}
.pp-num span{display:block;font-weight:500;color:#C9C8E0}
.pp-kick{margin-top:18px;font-size:11.5px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#DEAC29}
.pp-title{margin:4px 0 4px;font-size:27px;line-height:1.15;font-weight:800;letter-spacing:-.02em;color:#FFFFFF}
.pp-to{margin:0;color:#C9C8E0}
.pp-to strong{color:#FFFFFF}
.pp-wave{position:absolute;left:0;right:0;bottom:-1px;width:100%;height:36px;display:block}
.pp-body{padding:2px 40px 24px}
.pp h2{font-size:11.5px;letter-spacing:.12em;text-transform:uppercase;color:#030029;margin:20px 0 10px;font-weight:800;padding-bottom:8px;border-bottom:2px solid #030029}
.pp-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px 18px;margin:0}
.pp-grid div{border-left:3px solid #DEAC29;padding-left:10px}
.pp-grid dt{font-size:11.5px;color:#6B6987}
.pp-grid dd{margin:0;font-weight:700;color:#030029}
.pp-list{margin:0;padding:0;list-style:none;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px 22px}
.pp-list li{padding-left:24px;position:relative}
.pp-list li::before{content:"";position:absolute;left:2px;top:6px;width:12px;height:7px;border-left:2.5px solid #B8891A;border-bottom:2.5px solid #B8891A;transform:rotate(-45deg)}
.pp-invest{background:#030029;color:#FFFFFF;border-radius:12px;padding:2px 22px 16px;margin-top:20px}
.pp-invest h2{color:#DEAC29;border-bottom-color:rgba(222,172,41,.45)}
.pp-price{display:flex;align-items:baseline;justify-content:space-between;gap:12px;flex-wrap:wrap}
.pp-price span{font-weight:600;color:#C9C8E0}
.pp-price strong{font-size:34px;font-weight:900;color:#FFFFFF;letter-spacing:-.03em;font-variant-numeric:tabular-nums}
.pp-invest p{margin:6px 0 0;font-size:13.5px;color:#C9C8E0}
.pp-comp{width:100%;border-collapse:collapse;margin-top:12px;font-size:13px;color:#E8E7F5}
.pp-comp td{padding:6px 0;border-top:1px solid rgba(255,255,255,.14)}
.pp-comp td:last-child{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
.pp-plans{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-top:8px}
.pp-plan{border:1.5px solid #E4E3EE;border-radius:12px;padding:18px 14px 14px;display:flex;flex-direction:column;gap:8px;position:relative;background:#FFFFFF}
.pp-plan.dest{border-color:#030029;background:#F6F5FB}
.pp-plan.chosen{box-shadow:0 0 0 3px #DEAC29}
.pp-tag{position:absolute;top:-11px;left:14px;background:#DEAC29;color:#030029;font-size:10.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;padding:3px 9px;border-radius:999px}
.pp-plan h3{margin:0;font-size:19px;font-weight:800;color:#030029}
.pp-plan .pp-desc{font-size:12.5px;color:#6B6987;margin:0}
.pp-plan .pp-pv{font-size:27px;font-weight:900;color:#030029;font-variant-numeric:tabular-nums;letter-spacing:-.02em}
.pp-plan .pp-pv small{font-size:12px;font-weight:600;color:#6B6987}
.pp-plan ul{margin:0;padding:0;list-style:none;display:grid;gap:5px;font-size:13px}
.pp-plan li{padding-left:18px;position:relative}
.pp-plan li::before{content:"+";position:absolute;left:2px;font-weight:800;color:#B8891A}
.pp-extra{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin-top:12px}
.pp-x{border:1px solid #E4E3EE;border-radius:10px;padding:11px 14px;display:flex;flex-direction:column;gap:3px}
.pp-x span{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#6B6987;font-weight:700}
.pp-x strong{font-size:16px;color:#030029;font-variant-numeric:tabular-nums}
.pp-x small{font-size:12.5px;color:#4A4766}
.pp-x.ben{background:#FBF5E3;border-color:#DEAC29}
.pp-x.ben span{color:#8A6510}
.pp-x.ben strong{color:#030029}
.pp-x.ben small{color:#5E4A12}
.pp-cond{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:4px 22px}
.pp-cond p{margin:0}
.pp-sign{display:grid;grid-template-columns:1fr 1fr;gap:36px;margin-top:54px;font-size:13px;color:#6B6987;text-align:center}
.pp-sign span{display:block;border-top:1px solid #030029;margin-bottom:6px}
.pp-foot{background:#F6F5FB;border-top:3px solid #DEAC29;padding:10px 40px 11px;font-size:10px;line-height:1.4;color:#4A4766}
.pp-units{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:3px 20px}
.pp-units b{font-size:10px;color:#030029;font-weight:800}

.pp-contact{display:flex;flex-wrap:wrap;gap:4px 18px;margin-top:6px;padding-top:6px;border-top:1px solid #E4E3EE}
.pp-contact b{color:#030029}
@media (max-width:700px){.pp-list,.pp-cond{grid-template-columns:1fr}.pp-hero,.pp-body,.pp-foot{padding-left:20px;padding-right:20px}.pp-grid{grid-template-columns:1fr 1fr}.pp-units{grid-template-columns:1fr}.pp-sign{grid-template-columns:1fr;gap:40px}.pp-num{text-align:left}.pp-title{font-size:24px}}`

  const LOGO_JARALCON =
    'data:image/png;base64,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'

  const JARALCON_UNIDADES = [
    [
      'Matriz · Rio Branco do Sul',
      'R. Duque de Caxias, 270 · Natânea',
      '(41) 3652-2118',
    ],
    [
      'Unidade · Curitiba',
      'R. Tapajós, 1069 · Bom Retiro · CEP 80520-260',
      '(41) 3154-0298',
    ],
    [
      'Unidade · Almirante Tamandaré',
      'R. Fredolin Wolf, 59 · 1º andar, salas 4 e 5 · Vila Santa Terezinha · CEP 83501-040',
      '(41) 3698-7106',
    ],
    [
      'Unidade · Itaperuçu',
      'R. Gerônimo Albuquerque, 26 · Centro',
      '(41) 3603-2893',
    ],
  ]

  const DEFAULT_PERFIL = {
    nome: 'Jaralcon Assessoria Contábil',
    crc: '',
    cidade: 'Rio Branco do Sul/PR',
    telefone: '(41) 99967-3799',
    email: '',
    site: 'jaralcon.com.br',
    logo: LOGO_JARALCON,
    validadeDias: 15,
    condicoes: 'Serviços fora do escopo são orçados à parte.',
    escopoExtra: 'Consultoria por WhatsApp e e-mail em horário comercial',
  }

  const REGIMES = [
    { id: 'mei', nome: 'MEI' },
    { id: 'simples', nome: 'Simples Nacional' },
    { id: 'presumido', nome: 'Lucro Presumido' },
    { id: 'real', nome: 'Lucro Real' },
  ]
  function defaultInput() {
    return {
      inativa: false,
      usarHoras: false,
      segmento: 'servicos',
      regime: 'simples',
      funcionarios: 3,
      socios: 2,
      xml: 150,
      emiteNF: true,
      notas: 20,
      faturamento: 60000,
      filiais: 0,
      filiaisInativas: 0,
      servicos: [],
      anomalias: [],
      horas: 0,
      atual: '',
    }
  }
  function pct(v, d = 0) {
    return (
      (v * 100).toLocaleString('pt-BR', {
        maximumFractionDigits: d,
        minimumFractionDigits: d,
      }) + '%'
    )
  }
  function numBR(v, d = 2) {
    return Number(v || 0).toLocaleString('pt-BR', { maximumFractionDigits: d })
  }
  function fmtDate(iso) {
    if (!iso) return ''
    const d = /^\d{4}-\d{2}-\d{2}$/.test(iso)
      ? new Date(iso + 'T12:00:00')
      : new Date(iso)
    if (isNaN(d)) return ''
    return d.toLocaleDateString('pt-BR')
  }
  function indiceAtual(P = state.params) {
    const I2 = P.indices || DEFAULT_PARAMS.indices
    return I2[I2.usar] || I2.ipca
  }
  function periodo(P = state.params) {
    return (P.indices || {}).periodicidade === 'janeiro'
      ? 'janeiro'
      : 'aniversario'
  }
  const MESES = [
    'janeiro',
    'fevereiro',
    'março',
    'abril',
    'maio',
    'junho',
    'julho',
    'agosto',
    'setembro',
    'outubro',
    'novembro',
    'dezembro',
  ]
  function carenciaMes(P = state.params) {
    const v = n((P.indices || {}).carencia)
    return v >= 2 && v <= 12 ? v : 0
  }
  function carenciaTexto(P = state.params) {
    const m = carenciaMes(P)
    return m
      ? 'Contratos iniciados a partir de ' +
          MESES[m - 1] +
          ' têm o primeiro reajuste só no segundo janeiro após o início.'
      : ''
  }
  function reajusteTexto(P = state.params) {
    const I2 = P.indices || DEFAULT_PARAMS.indices,
      idx = indiceAtual(P)
    const como =
      I2.usar === 'fixo'
        ? 'de ' + numBR(n(idx.pct)) + '%'
        : 'pelo ' + idx.nome + ' acumulado em 12 meses'
    return (
      'Reajuste anual ' +
      como +
      (periodo(P) === 'janeiro'
        ? ', aplicado em janeiro de cada ano.' +
          (carenciaMes(P) ? ' ' + carenciaTexto(P) : '')
        : ', aplicado a cada 12 meses de contrato.')
    )
  }

  function escopoItens(inp) {
    const P = state.params,
      it = []
    if (inp.inativa) {
      it.push('Manutenção de empresa inativa no regime ' + regNome(inp.regime))
      it.push('Entrega das declarações e obrigações acessórias sem movimento')
      it.push(
        'Acompanhamento de pendências na Receita Federal, estado e município',
      )
      ;(inp.servicos || []).forEach((id) => {
        const sv = P.servicos.find((x) => x.id === id)
        if (sv) it.push(sv.nome)
      })
      String(state.perfil.escopoExtra || '')
        .split('\n')
        .map((x) => x.trim())
        .filter(Boolean)
        .forEach((x) => it.push(x))
      return it
    }
    it.push('Escrituração contábil e fiscal no regime ' + regNome(inp.regime))
    it.push('Apuração de tributos e entrega das obrigações acessórias')
    it.push('Balancete, balanço patrimonial e DRE')
    const f = n(inp.funcionarios),
      s = n(inp.socios)
    if (f > 0)
      it.push(
        'Folha de pagamento de até ' +
          f +
          ' ' +
          plural(f, 'funcionário', 'funcionários') +
          ', eSocial e FGTS Digital',
      )
    if (s > 0 && P.socios.ativo !== false)
      it.push('Pró-labore de ' + s + ' ' + plural(s, 'sócio', 'sócios'))
    if (P.xml.ativo !== false)
      it.push(
        'Importação e conferência de até ' +
          n(inp.xml).toLocaleString('pt-BR') +
          ' XMLs por mês',
      )
    if (inp.emiteNF)
      it.push(
        'Emissão de até ' +
          n(inp.notas) +
          ' notas fiscais por mês pelo escritório',
      )
    if (n(inp.filiais) > 0)
      it.push(
        'Atendimento a ' +
          n(inp.filiais) +
          ' ' +
          plural(n(inp.filiais), 'filial ativa', 'filiais ativas'),
      )
    if (n(inp.filiaisInativas) > 0)
      it.push(
        'Manutenção de ' +
          n(inp.filiaisInativas) +
          ' ' +
          plural(n(inp.filiaisInativas), 'filial inativa', 'filiais inativas') +
          ' (obrigações sem movimento)',
      )
    ;(inp.servicos || []).forEach((id) => {
      const sv = P.servicos.find((x) => x.id === id)
      if (sv) it.push(sv.nome)
    })
    String(state.perfil.escopoExtra || '')
      .split('\n')
      .map((x) => x.trim())
      .filter(Boolean)
      .forEach((x) => it.push(x))
    return it
  }

  function proposalBody(o) {
    const pf = clone(o.escritorio || DEFAULT_PERFIL)
    const P = state.params,
      inp = o.inp || defaultInput(),
      r = composition(o),
      d13 = o.decimoTerceiro == null ? !!P.decimoTerceiro : !!o.decimoTerceiro
    const meta = [pf.crc && 'CRC ' + pf.crc, pf.cidade, pf.telefone, pf.email]
      .filter(Boolean)
      .map(esc)
      .join(' · ')
    void meta
    const pl = o.planos && o.planos.length > 1 ? o.planos : []
    const cobranca = d13
      ? 'Cobrado em 13 parcelas (12 mensais + 13ª em dezembro).'
      : 'Cobrado em 12 parcelas mensais.'
    let escopo, invest
    if (pl.length) {
      const sets = pl.map((p) => escopoItens(p.inp))
      const comum = sets[0].filter((x) => sets.every((s) => s.includes(x)))
      escopo = `<h2>Incluso em todos os planos</h2><ul class="pp-list">${comum.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`
      invest = `<h2>Escolha seu plano</h2><div class="pp-plans">${pl
        .map((p, i) => {
          const extra = sets[i].filter((x) => !comum.includes(x))
          const chosen = o.planoEscolhido === p.id
          return `<div class="pp-plan ${p.destaque ? 'dest' : ''} ${chosen ? 'chosen' : ''}">${chosen ? '<span class="pp-tag">Plano escolhido</span>' : p.destaque ? '<span class="pp-tag">Recomendado</span>' : ''}<h3>${esc(p.nome)}</h3>${p.descricao ? `<p class="pp-desc">${esc(p.descricao)}</p>` : ''}<div class="pp-pv">${brl(n(p.valor))}<small> /mês</small></div>${extra.length ? `<ul>${extra.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : '<p class="pp-desc">Escopo essencial</p>'}</div>`
        })
        .join('')}</div>
      <p style="font-size:13px;color:#475569;margin:12px 0 0">Valores mensais. ${cobranca}</p>`
    } else {
      const sug = n(o.sugerido) || r.total,
        val = n(o.valor),
        desc = sug ? (sug - val) / sug : 0
      escopo = `<h2>Escopo dos serviços</h2><ul class="pp-list">${escopoItens(
        inp,
      )
        .map((x) => `<li>${esc(x)}</li>`)
        .join('')}</ul>`
      invest = `<section class="pp-invest"><h2>Investimento</h2>
      <div class="pp-price"><span>Honorário mensal</span><strong>${brl(val)}</strong></div>
      ${desc > 0.0001 ? `<p>Valor de tabela ${brl(sug)}, com ${pct(desc, 1)} de desconto.</p>` : ''}
      <p>${cobranca}</p>
      ${
        o.mostrarComposicao
          ? `<table class="pp-comp">${r.linhas
              .filter((l) => l.v && !/tempo da equipe/i.test(l.rot))
              .map((l) => `<tr><td>${esc(l.rot)}</td><td>${brl(l.v)}</td></tr>`)
              .join(
                '',
              )}${desc > 0.0001 ? `<tr><td>Desconto</td><td>−${brl(sug - val)}</td></tr>` : ''}</table>`
          : ''
      }
    </section>`
    }
    return `<article class="pp">
    <header class="pp-hero">
      <div class="pp-top"><img class="pp-logo" src="${LOGO_JARALCON}" alt="Jaralcon Assessoria Contábil"><div class="pp-num">Proposta nº ${esc(o.numero)}<span>${fmtDate(o.criadoEm)}</span></div></div>
      <div class="pp-kick">Proposta comercial</div>
      <h1 class="pp-title">Proposta de honorários contábeis</h1>
      <p class="pp-to">Para <strong>${esc(o.prospect)}</strong>${o.contato ? ' · ' + esc(o.contato) : ''}</p>
      <svg class="pp-wave" viewBox="0 0 800 40" preserveAspectRatio="none" aria-hidden="true"><path d="M0 28 C 120 4, 220 4, 330 22 S 560 40, 660 16 S 760 6, 800 14 L800 41 L0 41 Z" fill="#FFFFFF"/><path d="M0 28 C 120 4, 220 4, 330 22 S 560 40, 660 16 S 760 6, 800 14" fill="none" stroke="#DEAC29" stroke-width="2.4" vector-effect="non-scaling-stroke"/></svg>
    </header>
    <div class="pp-body">
    <h2>Perfil da empresa</h2>
    ${
      inp.inativa
        ? `<dl class="pp-grid"><div><dt>Situação</dt><dd>Inativa, sem movimento</dd></div><div><dt>Regime tributário</dt><dd>${regNome(inp.regime)}</dd></div><div><dt>Segmento</dt><dd>${esc(segNome(inp.segmento))}</dd></div></dl>`
        : `<dl class="pp-grid">
      <div><dt>Segmento</dt><dd>${esc(segNome(inp.segmento))}</dd></div>
      <div><dt>Regime tributário</dt><dd>${regNome(inp.regime)}</dd></div>
      <div><dt>Faturamento médio</dt><dd>${brl0(n(inp.faturamento))}/mês</dd></div>
      <div><dt>Funcionários</dt><dd>${n(inp.funcionarios)}</dd></div>
      ${P.xml.ativo === false ? '' : `<div><dt>XMLs por mês</dt><dd>${n(inp.xml).toLocaleString('pt-BR')}</dd></div>`}
      <div><dt>Notas pelo escritório</dt><dd>${pl.length ? 'Conforme o plano' : inp.emiteNF ? n(inp.notas) + ' por mês' : 'Não'}</dd></div>
    </dl>`
    }
    ${escopo}
    ${invest}
    ${propExtra(o, pl)}
    <h2>Condições</h2>
    <div class="pp-cond"><p>${d13 ? 'Honorário cobrado em 13 parcelas: 12 mensais e a 13ª em dezembro.' : 'Honorário cobrado em 12 parcelas mensais.'}</p><p>Vencimento todo dia ${n(o.vencimento) || n(P.vencimento) || 10} de cada mês.</p><p>${esc(reajusteTexto(P))}</p>${String(
      pf.condicoes || '',
    )
      .split('\n')
      .filter((x) => x.trim())
      .map((x) => `<p>${esc(x)}</p>`)
      .join(
        '',
      )}<p>Proposta válida até <strong>${fmtDate(o.validade)}</strong>.</p></div>
    </div>
    <footer class="pp-foot">
      <div class="pp-units">${JARALCON_UNIDADES.map((u) => `<div><b>${esc(u[0])}</b> ${esc(u[1])} · <span style="white-space:nowrap">${esc(u[2])}</span></div>`).join('')}</div>
      <div class="pp-contact"><span>WhatsApp <b>(41) 99967-3799</b></span><span><b>jaralcon.com.br</b></span><span>Contabilidade para comércio, indústria e serviços</span></div>
    </footer>
  </article>`
  }

  function propExtra(o, pl) {
    const ab = o.abertura && n(o.abertura.valor) > 0 ? o.abertura : null,
      ini = iniClamp(o.inicioCobranca),
      ben = Math.max(0, ini - 1)
    if (!ab && !ben && ini !== 0) return ''
    const ref = pl.length
      ? n(
          (
            pl.find((p) => p.id === o.planoEscolhido) ||
            pl.find((p) => p.destaque) ||
            pl[0]
          ).valor,
        )
      : n(o.valor)
    const qual = pl.length
      ? o.planoEscolhido
        ? ' no plano escolhido'
        : ' no plano recomendado'
      : ''
    return `<section class="pp-extra">${ab ? `<div class="pp-x"><span>Honorário de abertura</span><strong>${esc(aberturaTxt(ab))}</strong><small>Valor único pela abertura da empresa, separado do honorário mensal.</small></div>` : ''}${ini === 0 ? `<div class="pp-x"><span>Primeiro honorário mensal</span><strong>Cobrado no ato da contratação</strong><small>As demais parcelas seguem a cada competência.</small></div>` : ''}${ben ? `<div class="pp-x ben"><span>Benefício concedido</span><strong>Primeiro honorário mensal na ${ini}ª competência</strong><small>${compTxt(ben)} sem cobrança do honorário mensal${ref ? `, equivalente a ${brl(ref * ben)}${qual}` : ''}.</small></div>` : ''}</section>`
  }

  function proposalFile(o) {
    return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Proposta ${esc(o.numero)} – ${esc(o.prospect)}</title><style>body{margin:0;background:#ECEBF3;padding:32px 16px}${PROPOSAL_CSS}@page{size:A4;margin:0}@media print{html,body{background:#FFFFFF;padding:0;margin:0}.pp{box-shadow:none;border-radius:0;max-width:none;width:210mm;font-size:12px;line-height:1.45}.pp-hero{padding:18px 30px 30px}.pp-logo{height:34px}.pp-kick{margin-top:12px}.pp-title{font-size:22px}.pp-body{padding:0 30px 14px}.pp h2{margin:13px 0 7px;padding-bottom:5px;font-size:10.5px}.pp-grid{gap:6px 14px}.pp-list{gap:3px 18px}.pp-invest{margin-top:13px;padding:0 18px 11px}.pp-price strong{font-size:26px}.pp-invest p{font-size:11.5px;margin-top:3px}.pp-plans{gap:9px}.pp-plan{padding:14px 11px 10px;gap:5px}.pp-plan h3{font-size:15px}.pp-plan .pp-pv{font-size:21px}.pp-plan ul{font-size:11px;gap:2px}.pp-extra{margin-top:9px;gap:9px}.pp-x{padding:8px 12px}.pp-x strong{font-size:13.5px}.pp-foot{padding:7px 30px 8px;font-size:8.5px}.pp-units b{font-size:8.5px}.pp-contact{margin-top:4px;padding-top:4px}.pp,.pp *{break-inside:avoid}.pp-hero,.pp-invest,.pp-foot{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body>${proposalBody(o)}</body></html>`
  }
  function normalize(quote = {}) {
    const input = { ...defaultInput(), ...(quote.inp || {}) }
    const start = quote.criadoEm || '2026-11-12T12:00:00'
    const expiry = new Date(start.slice(0, 10) + 'T12:00:00')
    expiry.setDate(expiry.getDate() + Number(quote.validadeDias || 15))
    const annual =
      quote.decimoTerceiro === 12
        ? false
        : quote.decimoTerceiro === 13
          ? true
          : quote.decimoTerceiro
    return {
      ...quote,
      numero: quote.numero || '2026-018',
      prospect: quote.prospect || 'Simula\u00e7\u00e3o de honor\u00e1rios',
      contato: quote.contato || '',
      criadoEm: start,
      validade: quote.validade || expiry.toISOString().slice(0, 10),
      inp: input,
      valor: n(quote.valor ?? 620),
      sugerido: n(quote.sugerido ?? quote.valor ?? 620),
      decimoTerceiro: annual,
      planos: (quote.planos || []).map((plan) => ({
        ...plan,
        inp: { ...input, ...(plan.inp || {}) },
      })),
    }
  }
  function render(quote = {}) {
    const normalized = normalize(quote)
    state = {
      params: quote.params || DEFAULT_PARAMS,
      perfil: { ...DEFAULT_PERFIL, ...(quote.escritorio || {}) },
    }
    return proposalFile(normalized)
  }
  function open(quote = {}, options = {}) {
    const origin = document.activeElement,
      normalized = normalize(quote)
    const dialog = document.createElement('dialog')
    dialog.className = 'dialog jaral-proposal-dialog'
    dialog.setAttribute('aria-label', 'Proposta ' + normalized.numero)
    dialog.style.cssText =
      'width:min(1060px,calc(100vw - 48px));max-width:none;max-height:calc(100vh - 40px);padding:0;overflow:hidden;'
    dialog.innerHTML =
      '<header class="dialog-head"><h2>Proposta ' +
      esc(normalized.numero) +
      '</h2><button type="button" class="button ghost" data-proposal-close aria-label="Fechar proposta">' +
      Review.icon('x') +
      '</button></header><div class="toolbar" style="padding:12px 20px;border-bottom:1px solid var(--line);"><button type="button" class="button" data-proposal-print>Imprimir / Salvar PDF</button><button type="button" class="button" data-proposal-download>Baixar proposta HTML</button><span data-proposal-actions class="actions"></span></div><iframe title="Documento da proposta ' +
      esc(normalized.numero) +
      '" style="display:block;width:100%;height:calc(100vh - 204px);min-height:360px;border:0;background:#ECEBF3"></iframe>'
    const frame = dialog.querySelector('iframe')
    frame.srcdoc = render(quote)
    function close() {
      dialog.close()
      dialog.remove()
      origin?.focus()
    }
    dialog
      .querySelector('[data-proposal-close]')
      .addEventListener('click', close)
    dialog.addEventListener('cancel', (event) => {
      event.preventDefault()
      close()
    })
    dialog
      .querySelector('[data-proposal-print]')
      .addEventListener('click', () => frame.contentWindow?.print())
    dialog
      .querySelector('[data-proposal-download]')
      .addEventListener('click', () => {
        const url = URL.createObjectURL(
            new Blob([render(quote)], { type: 'text/html;charset=utf-8' }),
          ),
          link = document.createElement('a')
        link.href = url
        link.download = 'Proposta ' + normalized.numero + '.html'
        link.click()
        setTimeout(() => URL.revokeObjectURL(url), 1000)
      })
    const actions = dialog.querySelector('[data-proposal-actions]')
    for (const action of options.actions || []) {
      const control = document.createElement(action.href ? 'a' : 'button')
      control.className = 'button' + (action.primary ? ' primary' : '')
      control.textContent = action.label
      if (action.href) control.href = action.href
      else control.type = 'button'
      if (action.onClick)
        control.addEventListener('click', () =>
          action.onClick(normalized, dialog),
        )
      actions.append(control)
    }
    document.body.append(dialog)
    dialog.showModal()
    dialog.querySelector('[data-proposal-close]').focus()
    return dialog
  }
  window.JaralProposal = { render, open }
})()
