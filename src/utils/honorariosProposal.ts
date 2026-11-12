import type {
  HonorariosProfile,
  HonorariosQuote,
  HonorariosQuoteSnapshot,
} from '../types/honorarios'

const regimes = {
  mei: 'MEI',
  simples: 'Simples Nacional',
  presumido: 'Lucro Presumido',
  real: 'Lucro Real',
}

function escape(value: unknown): string {
  return String(value ?? '').replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        character
      ]!,
  )
}

function money(value: string | number): string {
  const amount = Number(value)
  return Number.isFinite(amount)
    ? amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : 'Valor não informado'
}

function date(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  return match ? `${match[3]}/${match[2]}/${match[1]}` : 'Não informada'
}

function lines(value: string): string[] {
  return String(value ?? '')
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
}

/** Only client-facing labels are selected from the frozen configuration. */
function scope(
  profile: HonorariosProfile,
  snapshot: HonorariosQuoteSnapshot,
): string[] {
  const items = profile.inativa
    ? [
        `Manutenção de empresa inativa no regime ${regimes[profile.regime]}`,
        'Entrega das declarações e obrigações acessórias sem movimento',
      ]
    : [
        `Escrituração contábil e fiscal no regime ${regimes[profile.regime]}`,
        'Apuração de tributos e entrega das obrigações acessórias',
        'Balancete, balanço patrimonial e DRE',
        ...(profile.funcionarios > 0
          ? [
              `Folha de pagamento de até ${profile.funcionarios} funcionário(s), eSocial e FGTS Digital`,
            ]
          : []),
        ...(profile.socios > 0
          ? [`Pró-labore de até ${profile.socios} sócio(s)`]
          : []),
        ...(profile.emiteNF
          ? [`Emissão de até ${profile.notas} nota(s) fiscal(is) por mês`]
          : []),
        ...(profile.filiais > 0
          ? [`Atendimento a ${profile.filiais} filial(is) ativa(s)`]
          : []),
        ...(profile.filiaisInativas > 0
          ? [`Manutenção de ${profile.filiaisInativas} filial(is) inativa(s)`]
          : []),
      ]
  for (const id of profile.servicos) {
    const service = snapshot.params.servicos.find((item) => item.id === id)
    if (service) items.push(service.nome)
  }
  return [...items, ...lines(snapshot.office.escopoExtra)]
}

function billing(snapshot: HonorariosQuoteSnapshot): string {
  return snapshot.decimoTerceiro
    ? 'Cobrança em 13 parcelas: 12 mensais e a 13ª em dezembro.'
    : 'Cobrança em 12 parcelas mensais.'
}

function start(snapshot: HonorariosQuoteSnapshot): string {
  if (snapshot.inicioCobranca === 0)
    return 'Primeiro honorário mensal cobrado no ato da contratação.'
  if (snapshot.inicioCobranca > 1)
    return `Benefício concedido: primeiro honorário na ${snapshot.inicioCobranca}ª competência, com ${snapshot.inicioCobranca - 1} competência(s) sem cobrança do honorário mensal.`
  return 'Primeiro honorário mensal cobrado na 1ª competência.'
}

function opening(snapshot: HonorariosQuoteSnapshot): string {
  if (Number(snapshot.aberturaValor) <= 0) return ''
  const total = money(snapshot.aberturaValor)
  return snapshot.aberturaParcelas > 1
    ? `Honorário de abertura: ${snapshot.aberturaParcelas} parcelas de ${money(Number(snapshot.aberturaValor) / snapshot.aberturaParcelas)} (total ${total}). Valor separado do honorário mensal.`
    : `Honorário de abertura: ${total} à vista. Valor separado do honorário mensal.`
}

function adjustment(snapshot: HonorariosQuoteSnapshot): string {
  const indices = snapshot.params.indices
  const index = indices[indices.usar]
  const period =
    indices.periodicidade === 'janeiro'
      ? 'em janeiro de cada ano'
      : 'a cada 12 meses, no aniversário do contrato'
  return `Reajuste ${period}, pelo índice ${index.nome}.`
}

function safeLogo(value: string): string {
  return value.length <= 200000 &&
    /^data:image\/(png|jpeg);base64,[a-zA-Z0-9+/]+={0,2}$/.test(value)
    ? value
    : ''
}

const styles = `
*{box-sizing:border-box}body{margin:0;padding:28px 16px;background:#eeedf4;color:#232039;font:12px/1.55 Arial,Helvetica,sans-serif}.proposal{max-width:850px;margin:auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 10px 45px #211b4b18}.hero{padding:32px 38px 28px;background:#08042e;color:white;display:flex;justify-content:space-between;gap:24px}.logo{max-width:190px;max-height:60px;object-fit:contain}.office{font-size:21px;font-weight:800}.muted{opacity:.76}.eyebrow{text-transform:uppercase;letter-spacing:.16em;font-size:10px;font-weight:800}.hero h1{font-size:30px;line-height:1.2;margin:13px 0 7px}.number{text-align:right;white-space:nowrap}.body{padding:8px 38px 24px}h2{color:#211948;font-size:11px;text-transform:uppercase;letter-spacing:.1em;border-bottom:1px solid #e5e2ed;padding-bottom:8px;margin:23px 0 12px}.profile{display:grid;grid-template-columns:1fr 1fr;gap:7px 22px}.profile p{margin:0}.scope{padding-left:18px;display:grid;grid-template-columns:1fr 1fr;gap:5px 24px}.investment{padding:19px 22px;border-radius:12px;background:#f1eef9;color:#201646}.price{font-size:31px;font-weight:800;line-height:1.3}.price small{font-size:12px;font-weight:400}.plans{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px}.plan{position:relative;border:1px solid #ded9ec;border-radius:11px;padding:18px 16px}.plan.recommended{border:2px solid #6c4cc4;background:#f7f4ff}.tag{display:inline-block;font-size:9px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#6744b9}.plan h3{font-size:18px;margin:7px 0}.plan .price{font-size:24px}.plan ul{padding-left:16px}.commercial{margin-top:16px;padding:14px 18px;background:#f8f7fb;border:1px solid #e8e4f2;border-radius:10px}.benefit{border-left:4px solid #6c4cc4}.commercial p{margin:5px 0}.conditions p{margin:5px 0}.signatures{display:grid;grid-template-columns:1fr 1fr;gap:35px;margin-top:30px;text-align:center;font-size:10px}.signatures div{padding-top:9px;border-top:1px solid #c9c3db}.footer{padding:16px 38px;background:#f5f3f9;color:#514b63;font-size:10px}.units{display:grid;grid-template-columns:1fr 1fr;gap:8px 20px}.footer p{margin:8px 0 0}.footer b{color:#251b48}@media(max-width:600px){.hero{display:block}.number{text-align:left;margin-top:18px}.body,.hero,.footer{padding-left:20px;padding-right:20px}.scope,.profile,.units{grid-template-columns:1fr}.hero h1{font-size:25px}}@page{size:A4;margin:10mm}@media print{body{background:white;padding:0;font-size:10px}.proposal{border-radius:0;box-shadow:none;max-width:none}.hero{padding:20px 26px}.hero h1{font-size:25px}.body{padding:4px 26px 18px}.footer{padding:12px 26px}.price{font-size:26px}h2{margin-top:16px}.plan,.investment,.commercial,.footer,.hero,.signatures{break-inside:avoid}.hero,.investment,.plan,.footer{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
`

/** Commercial export uses only the saved snapshot, never current settings or calculations. */
export function buildProposalHtml(quote: HonorariosQuote): string {
  const snapshot = quote.snapshot
  const office = snapshot.office
  const profile = snapshot.profile
  const logo = safeLogo(office.logo)
  const list = (items: string[]) =>
    items.map((item) => `<li>${escape(item)}</li>`).join('')
  const plans = snapshot.plans
  const sets = plans.map((plan) => scope(plan.profile, snapshot))
  const common = plans.length
    ? sets[0].filter((item) => sets.every((set) => set.includes(item)))
    : scope(profile, snapshot)
  const investment = plans.length
    ? `<div class="plans">${plans.map((plan, index) => `<section class="plan${plan.destaque ? ' recommended' : ''}">${plan.destaque ? '<span class="tag">Recomendado</span>' : ''}<h3>${escape(plan.nome)}</h3>${plan.descricao ? `<p>${escape(plan.descricao)}</p>` : ''}<div class="price">${escape(money(plan.value))}<small> / mês</small></div>${plan.annualValue ? `<p>${escape(money(plan.annualValue))} por ano</p>` : ''}${quote.selectedPlan === plan.id ? '<p><b>Plano escolhido</b></p>' : ''}<ul>${list(sets[index].filter((item) => !common.includes(item)))}</ul></section>`).join('')}</div>`
    : `<div class="investment"><span class="eyebrow">Investimento mensal</span><div class="price">${escape(money(snapshot.value))}<small> / mês</small></div><p>${escape(money(snapshot.annualValue))} por ano · ${escape(billing(snapshot))}</p></div>`
  const companyName = snapshot.company?.name || snapshot.prospect
  const segment =
    snapshot.params.segmentos.find((item) => item.id === profile.segmento)
      ?.nome ?? profile.segmento
  const openingText = opening(snapshot)
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><meta name="referrer" content="no-referrer"><title>Proposta ${escape(quote.number)} · ${escape(companyName)}</title><style>${styles}</style></head><body><article class="proposal"><header class="hero"><div>${logo ? `<img class="logo" src="${escape(logo)}" alt="${escape(office.nome)}">` : `<div class="office">${escape(office.nome)}</div>`}<p class="eyebrow">Contabilidade que acompanha o seu negócio</p><h1>Proposta de honorários</h1><div class="muted">${[office.crc && `CRC ${office.crc}`, office.cidade].filter(Boolean).map(escape).join(' · ')}</div></div><div class="number"><b>Nº ${escape(quote.number)}</b><br>Revisão ${escape(quote.revision)}<br>Emissão ${date(quote.createdAt)}<br>Válida até ${date(snapshot.validUntil)}</div></header><div class="body"><h2>Preparada para você</h2><div class="profile"><p><b>Empresa:</b> ${escape(companyName)}</p>${snapshot.company?.cnpj ? `<p><b>CNPJ:</b> ${escape(snapshot.company.cnpj)}</p>` : ''}<p><b>Regime:</b> ${escape(regimes[profile.regime])}</p><p><b>Segmento:</b> ${escape(segment)}</p>${snapshot.contact ? `<p><b>Contato:</b> ${escape(snapshot.contact)}</p>` : ''}${profile.inativa ? '<p><b>Situação:</b> Empresa inativa, sem movimento</p>' : ''}</div><h2>${plans.length ? 'Incluso em todos os planos' : 'O que está incluso'}</h2><ul class="scope">${list(common)}</ul><h2>${plans.length ? 'Escolha o plano para o seu negócio' : 'Seu investimento'}</h2>${investment}${plans.length ? `<p>${escape(billing(snapshot))}</p>` : ''}<section class="commercial${snapshot.inicioCobranca > 1 ? ' benefit' : ''}"><p><b>${escape(start(snapshot))}</b></p>${openingText ? `<p>${escape(openingText)}</p>` : ''}</section><h2>Condições da proposta</h2><div class="conditions"><p>${escape(billing(snapshot))}</p><p>Vencimento todo dia ${escape(snapshot.vencimento)} de cada mês.</p><p>${escape(adjustment(snapshot))}</p>${lines(
    office.condicoes,
  )
    .map((item) => `<p>${escape(item)}</p>`)
    .join(
      '',
    )}<p>Proposta válida até <b>${date(snapshot.validUntil)}</b>.</p></div><div class="signatures"><div>${escape(office.nome)}</div><div>${escape(companyName)}</div></div></div><footer class="footer">${office.units.length ? `<div class="units">${office.units.map((unit) => `<div><b>${escape(unit.name)}</b><br>${escape(unit.address)}${unit.phone ? ` · ${escape(unit.phone)}` : ''}</div>`).join('')}</div>` : ''}<p>${[office.telefone && `WhatsApp ${office.telefone}`, office.email, office.site].filter(Boolean).map(escape).join(' · ')}</p></footer></article></body></html>`
}

export function proposalMessage(quote: HonorariosQuote): string {
  const snapshot = quote.snapshot
  const office = snapshot.office
  const planText = snapshot.plans.length
    ? snapshot.plans
        .map(
          (plan) =>
            `${plan.nome}${plan.destaque ? ' (recomendado)' : ''}${quote.selectedPlan === plan.id ? ' — escolhido' : ''}: ${money(plan.value)}/mês${plan.annualValue ? ` · ${money(plan.annualValue)}/ano` : ''}\n${scope(
              plan.profile,
              snapshot,
            )
              .map((item) => `• ${item}`)
              .join('\n')}`,
        )
        .join('\n\n')
    : `Honorário mensal: ${money(snapshot.value)} · ${money(snapshot.annualValue)}/ano\n${scope(
        snapshot.profile,
        snapshot,
      )
        .map((item) => `• ${item}`)
        .join('\n')}`
  return [
    `Olá, ${snapshot.prospect}! Segue a proposta de honorários da ${office.nome} (nº ${quote.number}, revisão ${quote.revision}).`,
    snapshot.company
      ? `Empresa: ${snapshot.company.name}${snapshot.company.cnpj ? ` · CNPJ ${snapshot.company.cnpj}` : ''}`
      : '',
    planText,
    billing(snapshot),
    start(snapshot),
    opening(snapshot),
    `Vencimento todo dia ${snapshot.vencimento} de cada mês. ${adjustment(snapshot)}`,
    ...lines(office.condicoes),
    `Validade: até ${date(snapshot.validUntil)}.`,
    [office.nome, office.telefone, office.email, office.site]
      .filter(Boolean)
      .join(' · '),
  ]
    .filter(Boolean)
    .join('\n\n')
}

/** A sandboxed document keeps printing independent of the app and runs no scripts. */
export function printProposal(quote: HonorariosQuote): void {
  const frame = document.createElement('iframe')
  frame.title = `Impressão da proposta ${quote.number}`
  frame.setAttribute('sandbox', 'allow-same-origin allow-modals')
  frame.style.cssText =
    'position:fixed;left:-10000px;top:0;width:210mm;height:297mm;border:0'
  frame.onload = () => {
    const target = frame.contentWindow
    if (!target) {
      frame.remove()
      return
    }
    target.addEventListener('afterprint', () => frame.remove(), { once: true })
    target.focus()
    target.print()
    window.setTimeout(() => frame.remove(), 60000)
  }
  frame.srcdoc = buildProposalHtml(quote)
  document.body.appendChild(frame)
}
