import type {
  HonorariosProfile,
  HonorariosQuote,
  HonorariosQuoteSnapshot,
} from '../types/honorarios'
import {
  proposalDocumentStyles,
  proposalFontStylesheet,
  proposalLogoFallback,
} from './honorariosProposalTemplate'

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
        'Acompanhamento de pendências na Receita Federal, estado e município',
      ]
    : [
        `Escrituração contábil e fiscal no regime ${regimes[profile.regime]}`,
        'Apuração de tributos e entrega das obrigações acessórias',
        'Balancete, balanço patrimonial e DRE',
        ...(profile.funcionarios > 0
          ? [
              `Folha de pagamento de até ${profile.funcionarios} ${profile.funcionarios === 1 ? 'funcionário' : 'funcionários'}, eSocial e FGTS Digital`,
            ]
          : []),
        ...(profile.socios > 0 && snapshot.params.socios.ativo !== false
          ? [
              `Pró-labore de ${profile.socios} ${profile.socios === 1 ? 'sócio' : 'sócios'}`,
            ]
          : []),
        ...(snapshot.params.xml.ativo !== false
          ? [
              `Importação e conferência de até ${profile.xml.toLocaleString('pt-BR')} XMLs por mês`,
            ]
          : []),
        ...(profile.emiteNF
          ? [
              `Emissão de até ${profile.notas} ${profile.notas === 1 ? 'nota fiscal' : 'notas fiscais'} por mês pelo escritório`,
            ]
          : []),
        ...(profile.filiais > 0
          ? [
              `Atendimento a ${profile.filiais} ${profile.filiais === 1 ? 'filial ativa' : 'filiais ativas'}`,
            ]
          : []),
        ...(profile.filiaisInativas > 0
          ? [
              `Manutenção de ${profile.filiaisInativas} ${profile.filiaisInativas === 1 ? 'filial inativa' : 'filiais inativas'} (obrigações sem movimento)`,
            ]
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
    ? 'Cobrado em 13 parcelas (12 mensais + 13ª em dezembro).'
    : 'Cobrado em 12 parcelas mensais.'
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
  const method =
    indices.usar === 'fixo'
      ? `de ${Number(index.pct).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`
      : `pelo ${index.nome} acumulado em 12 meses`
  if (indices.periodicidade !== 'janeiro')
    return `Reajuste anual ${method}, aplicado a cada 12 meses de contrato.`
  const grace = indices.carencia
  const months = [
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
  const graceText =
    grace >= 2 && grace <= 12
      ? ` Contratos iniciados a partir de ${months[grace - 1]} têm o primeiro reajuste só no segundo janeiro após o início.`
      : ''
  return `Reajuste anual ${method}, aplicado em janeiro de cada ano.${graceText}`
}

function wholeMoney(value: string | number): string {
  const amount = Number(value)
  return Number.isFinite(amount)
    ? amount.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        maximumFractionDigits: 0,
        minimumFractionDigits: 0,
      })
    : money(value)
}

function percentage(value: number): string {
  return `${(value * 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`
}

function extraConditions(quote: HonorariosQuote): string {
  const snapshot = quote.snapshot
  const openingValue = Number(snapshot.aberturaValor)
  const openingInstallments = Math.max(1, snapshot.aberturaParcelas || 1)
  const startIndex = snapshot.inicioCobranca
  const benefitMonths = Math.max(0, startIndex - 1)
  const plans = snapshot.plans.length > 1 ? snapshot.plans : []
  const referencePlan =
    plans.find((plan) => plan.id === quote.selectedPlan) ??
    plans.find((plan) => plan.destaque) ??
    plans[0]
  const monthlyReference = Number(referencePlan?.value ?? snapshot.value)
  if (!(openingValue > 0) && !benefitMonths && startIndex !== 0) return ''

  const openingText =
    openingInstallments === 1
      ? `${money(openingValue)} à vista`
      : `${openingInstallments}× de ${money(openingValue / openingInstallments)} (total ${money(openingValue)})`
  const planLabel = plans.length
    ? quote.selectedPlan
      ? ' no plano escolhido'
      : ' no plano recomendado'
    : ''
  const benefitTotal = money(monthlyReference * benefitMonths)
  return `<section class="pp-extra">${openingValue > 0 ? `<div class="pp-x"><span>Honorário de abertura</span><strong>${escape(openingText)}</strong><small>Valor único pela abertura da empresa, separado do honorário mensal.</small></div>` : ''}${startIndex === 0 ? '<div class="pp-x"><span>Primeiro honorário mensal</span><strong>Cobrado no ato da contratação</strong><small>As demais parcelas seguem a cada competência.</small></div>' : ''}${benefitMonths ? `<div class="pp-x ben"><span>Benefício concedido</span><strong>1º honorário na ${startIndex}ª competência</strong><small>${benefitMonths} ${benefitMonths === 1 ? 'competência' : 'competências'} sem cobrança · ${benefitTotal}${escape(planLabel)}.</small></div>` : ''}</section>`
}

function safeLogo(value: string): string {
  return value.length <= 200000 &&
    /^data:image\/(png|jpeg);base64,[a-zA-Z0-9+/]+={0,2}$/.test(value)
    ? value
    : ''
}

const styles = proposalDocumentStyles

/** Commercial export uses only the saved snapshot, never current settings or calculations. */
export function buildProposalHtml(quote: HonorariosQuote): string {
  const snapshot = quote.snapshot
  const office = snapshot.office
  const profile = snapshot.profile
  const logo =
    safeLogo(office.logo) || (!office.logo ? proposalLogoFallback : '')
  const plans = snapshot.plans.length > 1 ? snapshot.plans : []
  const list = (items: string[]) =>
    items.map((item) => `<li>${escape(item)}</li>`).join('')
  const sets = plans.map((plan) => scope(plan.profile, snapshot))
  const common = plans.length
    ? sets[0].filter((item) => sets.every((set) => set.includes(item)))
    : scope(profile, snapshot)
  const investment = plans.length
    ? `<h2>Escolha seu plano</h2><div class="pp-plans">${plans.map((plan, index) => `<div class="pp-plan${plan.destaque ? ' dest' : ''}${quote.selectedPlan === plan.id ? ' chosen' : ''}">${quote.selectedPlan === plan.id ? '<span class="pp-tag">Plano escolhido</span>' : plan.destaque ? '<span class="pp-tag">Recomendado</span>' : ''}<h3>${escape(plan.nome)}</h3>${plan.descricao ? `<p class="pp-desc">${escape(plan.descricao)}</p>` : ''}<div class="pp-pv">${escape(money(plan.value))}<small> /mês</small></div>${sets[index].some((item) => !common.includes(item)) ? `<ul>${list(sets[index].filter((item) => !common.includes(item)))}</ul>` : '<p class="pp-desc">Escopo essencial</p>'}</div>`).join('')}</div><p style="font-size:13px;color:#475569;margin:12px 0 0">Valores mensais. ${escape(billing(snapshot))}</p>`
    : `<section class="pp-invest"><h2>Investimento</h2><div class="pp-price"><span>Honorário mensal</span><strong>${escape(money(snapshot.value))}</strong></div>${Number(snapshot.calculation.total) > 0 && Number(snapshot.calculation.total) > Number(snapshot.value) ? `<p>Valor de tabela ${escape(money(snapshot.calculation.total))}, com ${escape(percentage((Number(snapshot.calculation.total) - Number(snapshot.value)) / Number(snapshot.calculation.total)))} de desconto.</p>` : ''}<p>${escape(billing(snapshot))}</p></section>`
  const companyName = snapshot.company?.name || snapshot.prospect
  const segment =
    snapshot.params.segmentos.find((item) => item.id === profile.segmento)
      ?.nome ?? profile.segmento
  const profileDetails = profile.inativa
    ? `<dl class="pp-grid"><div><dt>Situação</dt><dd>Inativa, sem movimento</dd></div><div><dt>Regime tributário</dt><dd>${escape(regimes[profile.regime])}</dd></div><div><dt>Segmento</dt><dd>${escape(segment)}</dd></div></dl>`
    : `<dl class="pp-grid"><div><dt>Segmento</dt><dd>${escape(segment)}</dd></div><div><dt>Regime tributário</dt><dd>${escape(regimes[profile.regime])}</dd></div><div><dt>Faturamento médio</dt><dd>${escape(wholeMoney(profile.faturamento))}/mês</dd></div><div><dt>Funcionários</dt><dd>${profile.funcionarios}</dd></div>${snapshot.params.xml.ativo === false ? '' : `<div><dt>XMLs por mês</dt><dd>${profile.xml.toLocaleString('pt-BR')}</dd></div>`}<div><dt>Notas pelo escritório</dt><dd>${plans.length ? 'Conforme o plano' : profile.emiteNF ? `${profile.notas} por mês` : 'Não'}</dd></div></dl>`
  const conditions = [
    billing(snapshot),
    `Vencimento todo dia ${snapshot.vencimento} de cada mês.`,
    adjustment(snapshot),
    ...lines(office.condicoes),
    `Proposta válida até ${date(snapshot.validUntil)}.`,
  ]
  const footerContacts = [
    office.telefone &&
      `<span>WhatsApp <b>${escape(office.telefone)}</b></span>`,
    office.email && `<span>E-mail <b>${escape(office.email)}</b></span>`,
    office.site && `<span><b>${escape(office.site)}</b></span>`,
    '<span>Contabilidade para comércio, indústria e serviços</span>',
  ]
    .filter(Boolean)
    .join('')
  const footerUnits = office.units
    .map(
      (unit) =>
        `<div><b>${escape(unit.name)}</b> ${escape(unit.address)}${unit.phone ? ` · <span style="white-space:nowrap">${escape(unit.phone)}</span>` : ''}</div>`,
    )
    .join('')
  const logoMarkup = logo
    ? `<img class="pp-logo" src="${escape(logo)}" alt="${escape(office.nome)}">`
    : `<div class="pp-logo-text">${escape(office.nome)}</div>`
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; base-uri 'none'; form-action 'none'"><meta name="referrer" content="no-referrer"><link rel="stylesheet" href="${proposalFontStylesheet}"><title>Proposta ${escape(quote.number)} – ${escape(companyName)}</title><style>${styles}</style></head><body><article class="pp"><header class="pp-hero"><div class="pp-top">${logoMarkup}<div class="pp-num">Proposta nº ${escape(quote.number)}<span>${date(quote.createdAt)}</span></div></div><div class="pp-kick">Proposta comercial</div><h1 class="pp-title">Proposta de honorários contábeis</h1><p class="pp-to">Para <strong>${escape(companyName)}</strong>${snapshot.contact ? ` · ${escape(snapshot.contact)}` : ''}</p><svg class="pp-wave" viewBox="0 0 800 40" preserveAspectRatio="none" aria-hidden="true"><path d="M0 28 C 120 4, 220 4, 330 22 S 560 40, 660 16 S 760 6, 800 14 L800 41 L0 41 Z" fill="#FFFFFF"/><path d="M0 28 C 120 4, 220 4, 330 22 S 560 40, 660 16 S 760 6, 800 14" fill="none" stroke="#DEAC29" stroke-width="2.4" vector-effect="non-scaling-stroke"/></svg></header><div class="pp-body"><h2>Perfil da empresa</h2>${profileDetails}<h2>${plans.length ? 'Incluso em todos os planos' : 'Escopo dos serviços'}</h2><ul class="pp-list">${list(common)}</ul>${investment}${extraConditions(quote)}<h2>Condições</h2><div class="pp-cond">${conditions.map((item) => `<p>${escape(item)}</p>`).join('')}</div></div><footer class="pp-foot">${footerUnits ? `<div class="pp-units">${footerUnits}</div>` : ''}<div class="pp-contact">${footerContacts}</div></footer></article></body></html>`
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
