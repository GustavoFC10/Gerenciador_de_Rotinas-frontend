/* global document, localStorage, navigator, Blob, URL, setTimeout, clearTimeout */
;(() => {
  'use strict'
  const proposals = [
    {
      id: 'P05',
      title: 'Novo orçamento',
      module: 'Honorários',
      page: 'honorarios.html',
      image: 'P05-honorarios.png',
      before: '22-honorarios-orcamento.png',
      problem:
        'Recuperar a sequência aprovada e manter o valor visível durante o preenchimento e o recálculo.',
      checks: [
        'Ative abertura, notas, horas e empresa inativa.',
        'Digite somente números nos valores e acompanhe o resultado.',
      ],
    },
    {
      id: 'P11',
      title: 'Clientes e ficha financeira',
      module: 'Honorários',
      page: 'clientes-honorarios.html',
      image: 'P11-clientes-honorarios.png',
      before: '23-honorarios-clientes.png',
      problem:
        'A comparação e o contrato precisam seguir o modelo sem misturar o cadastro da empresa com o perfil financeiro.',
      checks: [
        'Busque, filtre e abra uma ficha; confira o contexto ao voltar.',
        'Compare o valor atual, a oportunidade de aumento e o contrato.',
      ],
    },
    {
      id: 'P07',
      title: 'Parâmetros',
      module: 'Honorários',
      page: 'parametros.html',
      image: 'P07-parametros.png',
      before: '24-honorarios-parametros.png',
      problem:
        'Preservar as nove abas e as condições originais, corrigindo medidas e repetições de cabeçalhos.',
      checks: [
        'Passe pelas nove abas e abra Dados do escritório.',
        'Altere um valor, troque de aba e confira o rascunho.',
      ],
    },
    {
      id: 'P12',
      title: 'Painel de Honorários',
      module: 'Honorários',
      page: 'painel-honorarios.html',
      image: 'P12-painel-honorarios.png',
      before: '21-honorarios-painel.png',
      problem:
        'Restituir os indicadores e a leitura comercial da carteira previstos no modelo original.',
      checks: [
        'Confira os quatro indicadores de carteira e a situação por regime.',
        'Experimente a oportunidade de aumento sem aplicar valores.',
      ],
    },
    {
      id: 'P13',
      title: 'Orçamentos salvos',
      module: 'Honorários',
      page: 'orcamentos-honorarios.html',
      image: 'P13-orcamentos-honorarios.png',
      before: '22-honorarios-orcamento.png',
      problem:
        'Consultar propostas em Orçamentos e iniciar a criação pelo botão Novo orçamento, mantendo estados e documento salvo.',
      checks: [
        'Busque uma proposta, filtre por status e abra o documento.',
        'Confira a diferença entre revisar, aceitar e vincular.',
      ],
    },
    {
      id: 'P06',
      title: 'Vincular orçamento a uma empresa',
      module: 'Honorários',
      page: 'vinculo-orcamento.html',
      image: 'P06-vinculo-orcamento.png',
      before: '23-honorarios-clientes.png',
      problem:
        'Um orçamento genérico pode ganhar vínculo depois, com escolha explícita de uma empresa que já existe.',
      checks: [
        'Selecione a empresa por nome, código ou CNPJ.',
        'Leia o efeito da confirmação e teste cancelar.',
      ],
    },
    {
      id: 'P01',
      title: 'Base visual compartilhada',
      module: 'Todos os módulos',
      page: 'base-visual.html',
      image: 'P01-base-visual.png',
      before: '03-rotinas-planilha.png',
      problem:
        'Reduzir a sensação de módulos desconectados por meio de superfícies, marca, hierarquia e medidas comuns.',
      checks: [
        'Compare superfícies, botões e legibilidade.',
        'A planilha deve conservar formato, ícones e cores dos estados.',
      ],
    },
    {
      id: 'P03',
      title: 'Criar e editar Rotinas',
      module: 'Rotinas',
      page: 'catalogo-rotinas.html',
      image: 'P03-edicao-ficha.png',
      before: '06-rotinas-catalogo.png',
      problem:
        'Cadastro ocasional pelo catálogo: criação em etapas e edição direta na ficha de revisão.',
      checks: [
        'Abra uma ficha e edite um grupo diretamente; a edição não tem etapas.',
        'Crie em três etapas e corrija os dados na própria revisão antes de salvar.',
      ],
    },
    {
      id: 'P04',
      title: 'Escolha e formulário de Processo',
      module: 'Processos',
      page: 'processos.html',
      image: 'P04-processos.png',
      before: '19-processos-form-tipo.png',
      problem:
        'Mostrar todos os tipos com o mesmo peso e liberar espaço para os dados depois da escolha.',
      checks: [
        'Busque e escolha entre os treze tipos, sem favoritos.',
        'Preencha um campo e tente trocar de tipo.',
      ],
    },
    {
      id: 'P08',
      title: 'Empresas: lista e ficha',
      module: 'Empresas',
      page: 'empresas.html',
      image: 'P08-empresa-pagina.png',
      before: '13-empresas-lista.png',
      problem:
        'Catálogo geral com página completa da empresa; dados específicos em janelas nos módulos, com link para o cadastro geral.',
      checks: [
        'Use busca e filtros, incluindo empresas arquivadas.',
        'Abra a ficha, volte à lista e teste a edição com máscara de CNPJ.',
      ],
    },
    {
      id: 'P09',
      title: 'Equipe: pessoas e acessos',
      module: 'Equipe',
      page: 'equipe.html',
      image: 'P09-equipe.png',
      before: '15-equipe-lista.png',
      problem:
        'Reimaginar a área para encontrar pessoas, compreender sua situação e conferir permissões sem ruído.',
      checks: [
        'Busque pessoas e filtre pendentes ou inativos.',
        'Abra uma ficha e revise convite e acessos por módulo.',
      ],
    },
    {
      id: 'P10',
      title: 'Estados, erros e mensagens',
      module: 'Todos os módulos',
      page: 'estados.html',
      image: 'P10-estados.png',
      before: '09-configuracoes.png',
      problem:
        'Manter o contexto durante carregamento, falha, ausência de dados ou descarte de um formulário.',
      checks: [
        'Experimente erro com repetição, vazio e carregamento.',
        'Confira as mensagens de descarte e indisponibilidade.',
      ],
    },
    {
      id: 'P02',
      title: 'Troca de módulo',
      module: 'Navegação',
      page: 'navegacao.html',
      image: 'P02-navegacao.png',
      before: '01-hub-atual.png',
      problem:
        'Manter a troca de módulo pelo HUB, conforme a decisão recebida.',
      checks: [
        'Use Voltar aos módulos e escolha a área de trabalho.',
        'O seletor direto entre módulos foi retirado da proposta.',
      ],
    },
    {
      id: 'P14',
      title: 'Dashboard de Rotinas',
      module: 'Rotinas',
      page: 'dashboard-rotinas.html',
      image: 'P14-dashboard-rotinas.png',
      before: '02-rotinas-inicio.png',
      problem:
        'Entrada orientada à operação da equipe, com atenção, vencimentos, competência e acesso às planilhas.',
      checks: [
        'Filtre tarefas e planilhas, altere a competência e abra uma tarefa.',
        'Confira os cinco estados e a contagem distinta de tarefas que exigem atenção.',
      ],
    },
    {
      id: 'P15',
      title: 'Dashboard de Processos',
      module: 'Processos',
      page: 'dashboard-processos.html',
      image: 'P15-dashboard-processos.png',
      before: '10-processos-inicio.png',
      problem:
        'Recuperar o panorama idealizado pela diretoria e manter execução, espera e prazos com seus significados corretos.',
      checks: [
        'Compare execução e aguardando liberação; abra os recortes pelos indicadores.',
        'Confira filas por setor, cumprimento de prazo e métricas da Leggacy.',
      ],
    },
    {
      id: 'P16',
      title: 'Organização de Processos — acessos às listas',
      module: 'Processos',
      page: 'organizacao-processos-ideia.html?ideia=A',
      image: 'P16-A-organizacao.png',
      before: '11-processos-lista.png',
      problem:
        'Organizar os acessos existentes em Acesso rápido e Por situação, no padrão de submenu de Processos.',
      checks: [
        'Confira Acesso rápido e Por situação, com a mesma lista e seletor simples de departamento.',
        'Recolha os dois grupos, troque o departamento e confira os acessos preservados.',
      ],
    },
    {
      id: 'P17',
      title: 'Movimentações Empresariais',
      module: 'Processos',
      page: 'movimentacoes-processos.html',
      image: 'P17-movimentacoes-processos.png',
      reference: '../../processos-jaralcon (1).html',
      problem:
        'Preservar a organização da diretoria, os ganhos, perdas e saldo, o histórico e o relatório mensal.',
      checks: [
        'Troque o mês e abra o relatório; confira os períodos de 12 e 6 meses.',
        'Abra uma movimentação e observe os valores não informados separados dos totais.',
      ],
    },
    {
      id: 'P18',
      title: 'Empresas e configurações dos módulos',
      module: 'Empresas',
      page: 'empresas-rotinas.html',
      image: 'P18-empresas-modulos.png',
      before: '13-empresas-lista.png',
      problem:
        'Uma identidade central com configurações específicas de Rotinas e Honorários, incluindo empresas ainda sem dados do módulo.',
      checks: [
        'Compare os catálogos reais Empresas e Rotinas na barra lateral do módulo.',
        'Experimente criar uma empresa a partir do módulo e confira o vínculo central.',
      ],
    },
  ]
  const labels = {
    pending: 'Para avaliar',
    approve: 'Aprovar',
    adjust: 'Pedir ajuste',
    keep: 'Manter atual',
  }
  const storageKey = 'jaral-revisao-ux-v7'
  const receivedReview = {
    P05: 'Aprovada. Novo orçamento como ação na página Orçamentos, sem aba própria.',
    P11: 'Aprovada. Busca e seleção em um único campo.',
    P07: 'Aprovada. Preservar a proposta.',
    P12: 'Aprovada. Preservar as cores comerciais compartilhadas.',
    P13: 'Aprovada. Preservar a proposta.',
    P06: 'Aprovada. Preservar a proposta.',
    P01: 'Aprovada. Preservar a planilha, abas, ícones e cores.',
    P03: 'Aprovada. Criação em etapas, revisão editável e edição direta na ficha.',
    P04: 'Aprovada. Preservar a proposta.',
    P08: 'No catálogo geral, a empresa tem página própria e informações completas. Dentro de Rotinas, abre em janela com link para o cadastro geral.',
    P09: 'Aprovada. Preservar a proposta.',
    P10: 'Aprovada. Preservar a proposta.',
    P02: 'Aprovada. Manter via HUB.',
    P14: 'Aprovada. Preservar a proposta.',
    P15: 'Aprovada. Preservar o dashboard da diretoria.',
    P16: 'Acesso rápido e Por situação devem iniciar ambos abertos. Continuam recolhíveis; departamento mantém seletor simples.',
    P17: 'Aprovada. A indicação anterior de retirar um campo foi corrigida pelo usuário; nenhum campo será removido.',
    P18: 'Aprovada. Preservar os catálogos reais de Empresas e Rotinas.',
  }
  const approvedIds = [
    'P05',
    'P11',
    'P07',
    'P12',
    'P13',
    'P06',
    'P01',
    'P03',
    'P04',
    'P09',
    'P10',
    'P02',
    'P14',
    'P15',
    'P17',
    'P18',
  ]
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
  let choices = {
    P05: { choice: 'approve', note: '' },
    P11: { choice: 'approve', note: '' },
    P07: { choice: 'approve', note: '' },
    P12: { choice: 'approve', note: '' },
    P13: { choice: 'approve', note: '' },
    P06: { choice: 'approve', note: '' },
    P01: { choice: 'approve', note: '' },
    P03: { choice: 'approve', note: '' },
    P04: { choice: 'approve', note: '' },
    P09: { choice: 'approve', note: '' },
    P10: { choice: 'approve', note: '' },
    P02: { choice: 'approve', note: 'Manter via HUB.' },
    P14: { choice: 'approve', note: '' },
    P15: { choice: 'approve', note: '' },
    P17: { choice: 'approve', note: '' },
    P18: { choice: 'approve', note: '' },
  }
  let toastTimer
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || '{}')
    for (const proposal of proposals) {
      const item = saved[proposal.id]
      if (item && ['approve', 'adjust', 'keep'].includes(item.choice))
        choices[proposal.id] = {
          choice: item.choice,
          note: typeof item.note === 'string' ? item.note.slice(0, 3000) : '',
        }
    }
    localStorage.setItem(storageKey, JSON.stringify(choices))
  } catch {
    const notice = document.getElementById('storage-notice')
    notice.hidden = false
    notice.textContent =
      'Neste navegador as escolhas não serão mantidas após fechar o arquivo. Copie ou baixe o resumo antes de sair.'
  }
  function toast(message) {
    const node = document.getElementById('gallery-toast')
    clearTimeout(toastTimer)
    node.textContent = message
    node.classList.add('visible')
    toastTimer = setTimeout(() => node.classList.remove('visible'), 3000)
  }
  function persist() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(choices))
    } catch {
      /* The summary remains available when storage is denied. */
    }
    updateProgress()
  }
  function updateProgress() {
    const total = Object.values(choices).filter((item) => item.choice).length
    document.getElementById('reviewed-count').textContent =
      `${total} de ${proposals.length}`
    for (const [node, status] of [
      ['approved-count', 'approve'],
      ['changes-count', 'adjust'],
      ['keep-count', 'keep'],
    ])
      document.getElementById(node).textContent = Object.values(choices).filter(
        (item) => item.choice === status,
      ).length
    document.querySelectorAll('[data-rail]').forEach((link) => {
      const status = choices[link.dataset.rail]?.choice || 'pending'
      link.dataset.status = status
      link
        .querySelector('.rail-status')
        .setAttribute('aria-label', labels[status])
    })
  }
  function visibleProposals() {
    const term = document
      .getElementById('review-search')
      .value.normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
    const filter = document.getElementById('review-filter').value
    return proposals.filter(
      (item) =>
        `${item.id} ${item.title} ${item.module} ${item.problem}`
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .includes(term) &&
        (filter === 'all' ||
          (choices[item.id]?.choice || 'pending') === filter),
    )
  }
  function render() {
    const visible = visibleProposals()
    document.getElementById('visible-count').textContent =
      `${visible.length} ${visible.length === 1 ? 'proposta' : 'propostas'}`
    document.getElementById('proposal-cards').innerHTML = visible.length
      ? visible
          .map((item) => {
            const state = choices[item.id] || { choice: '', note: '' }
            return `<article id="${item.id}" class="proposal-card"><a class="proposal-thumb" href="${item.page}" target="_blank" rel="noopener" aria-label="Abrir prévia ${item.id}: ${esc(item.title)}"><img src="imagens/${item.image}" alt="Prévia de ${esc(item.title)}" loading="lazy"><span class="thumb-label">${item.id} · Prévia</span></a><div class="proposal-card-body"><div class="proposal-card-title"><h2><span class="proposal-code">${item.id}</span>${esc(item.title)}</h2><span class="module-label">${esc(item.module)}</span></div><p class="proposal-problem">${esc(item.problem)}</p><ul class="proposal-checklist">${item.checks.map((check) => `<li>${esc(check)}</li>`).join('')}</ul><div class="proposal-links"><a class="button primary" href="${item.page}" target="_blank" rel="noopener">Abrir prévia <span aria-hidden="true">↗</span></a><a href="${esc(item.reference || `../../docs/auditoria-ux/evidencias/${item.before}`)}" target="_blank" rel="noopener">${item.reference ? 'Ver referência' : 'Ver estado atual'} ↗</a></div><details class="received-review"><summary>Revisão recebida${approvedIds.includes(item.id) ? ' · Aprovada' : ['P08', 'P11'].includes(item.id) ? ' · Visual aprovado; novo fluxo' : Number(item.id.slice(1)) >= 14 ? ' · Nova prévia' : ' · Ajustes'}</summary><p>${esc(receivedReview[item.id])}</p></details><div class="decision-section"><div class="decision-label"><span id="${item.id}-decision">Sua decisão sobre esta proposta</span><button class="decision-reset" data-reset="${item.id}" type="button" ${state.choice ? '' : 'hidden'}>Limpar</button></div><div class="decision-options" role="radiogroup" aria-labelledby="${item.id}-decision">${['approve', 'adjust', 'keep'].map((choice) => `<label class="decision-option"><input type="radio" name="decision-${item.id}" value="${choice}" data-decision="${item.id}" ${state.choice === choice ? 'checked' : ''}><span>${labels[choice]}</span></label>`).join('')}</div><label class="adjustment-note" data-note-area="${item.id}" ${state.choice === 'adjust' ? '' : 'hidden'}><span>O que precisa mudar?</span><textarea data-note="${item.id}" rows="2" maxlength="3000" placeholder="Descreva o ajuste para revisarmos esta proposta.">${esc(state.note)}</textarea></label></div></div></article>`
          })
          .join('')
      : '<div class="empty-review">Nenhuma proposta corresponde à busca ou ao filtro escolhido.</div>'
    document.querySelectorAll('[data-decision]').forEach((input) =>
      input.addEventListener('change', () => {
        const id = input.dataset.decision
        choices[id] = { choice: input.value, note: choices[id]?.note || '' }
        document.querySelector(`[data-note-area="${id}"]`).hidden =
          input.value !== 'adjust'
        document.querySelector(`[data-reset="${id}"]`).hidden = false
        persist()
        if (input.value === 'adjust')
          document.querySelector(`[data-note="${id}"]`).focus()
      }),
    )
    document.querySelectorAll('[data-note]').forEach((input) =>
      input.addEventListener('input', () => {
        const id = input.dataset.note
        choices[id] = {
          choice: choices[id]?.choice || 'adjust',
          note: input.value,
        }
        persist()
      }),
    )
    document.querySelectorAll('[data-reset]').forEach((button) =>
      button.addEventListener('click', () => {
        delete choices[button.dataset.reset]
        persist()
        render()
      }),
    )
    updateProgress()
  }
  function organizationSummary() {
    try {
      const saved = JSON.parse(
        localStorage.getItem('jaral-processos-p16-acessos-v3') || '{}',
      )
      const ideaLabels = {
        prefer: 'Preferir',
        adjust: 'Pedir ajuste',
        discard: 'Descartar',
      }
      const names = {
        A: 'Acesso rápido e Por situação',
        B: 'Navegação por abas',
        C: 'Seletor de visão',
        D: 'Central de acessos',
      }
      const results = Object.entries(names).flatMap(([id, title]) => {
        const item = saved[id]
        if (!item || (!ideaLabels[item.choice] && !item.note)) return []
        return [
          `Ideia ${id} — ${title}: ${ideaLabels[item.choice] || 'Para avaliar'}`,
          typeof item.note === 'string' && item.note
            ? `Observações: ${item.note.slice(0, 3000)}`
            : '',
          `organizacao-processos-ideia.html?ideia=${id}`,
          '',
        ]
      })
      return results.length
        ? ['REVISÃO P16 — ORGANIZAÇÃO DE PROCESSOS', '', ...results]
        : []
    } catch {
      return []
    }
  }
  function summary() {
    return [
      'REVISÃO DE INTERFACES JARALCON',
      'Somente avaliação de prévias. A implementação depende de um próximo pedido.',
      '',
      ...proposals.flatMap((item) => {
        const state = choices[item.id]
        return [
          `${item.id} — ${item.title}: ${state ? labels[state.choice] : 'Para avaliar'}`,
          state?.note ? `Ajustes: ${state.note}` : '',
          `${item.page}`,
          '',
        ]
      }),
      ...organizationSummary(),
    ].join('\n')
  }
  document.getElementById('proposal-navigation').innerHTML = proposals
    .map(
      (item) =>
        `<a class="rail-link" href="#${item.id}" data-rail="${item.id}"><span class="rail-id">${item.id}</span><span>${esc(item.title.replace(' de Honorários', '').replace(' e ficha financeira', '').replace('Escolha e formulário de Processo', 'Tipos de Processo').replace('Criar e editar Rotinas', 'Formulário de Rotinas'))}</span><span class="rail-status"></span></a>`,
    )
    .join('')
  document.querySelectorAll('[data-rail]').forEach((anchor) =>
    anchor.addEventListener('click', () => {
      document.getElementById('review-filter').value = 'all'
      document.getElementById('review-search').value = ''
      render()
      setTimeout(
        () =>
          document
            .getElementById(anchor.dataset.rail)
            ?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
        0,
      )
    }),
  )
  document.getElementById('review-search').addEventListener('input', render)
  document.getElementById('review-filter').addEventListener('change', render)
  document
    .getElementById('copy-summary')
    .addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(summary())
        toast('Resumo copiado. Cole no chat para enviar suas escolhas.')
      } catch {
        const panel = document.getElementById('summary-fallback')
        panel.hidden = false
        const area = document.getElementById('summary-text')
        area.value = summary()
        panel.scrollIntoView({ behavior: 'smooth', block: 'center' })
        area.focus()
        area.select()
      }
    })
  document.getElementById('download-summary').addEventListener('click', () => {
    const url = URL.createObjectURL(
      new Blob([summary()], { type: 'text/plain;charset=utf-8' }),
    )
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'revisao-interfaces-jaralcon.txt'
    anchor.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    toast('Resumo preparado para download.')
  })
  document.getElementById('close-summary').addEventListener('click', () => {
    document.getElementById('summary-fallback').hidden = true
    document.getElementById('copy-summary').focus()
  })
  render()
})()
