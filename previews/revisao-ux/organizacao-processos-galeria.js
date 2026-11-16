/* global Review, document, navigator, localStorage, URL, Blob, setTimeout */
;(() => {
  'use strict'
  const ideas = [
    {
      id: 'A',
      title: 'Acesso rápido e Por situação',
      purpose:
        'Acessar as listas diretamente na barra lateral, reunidas em Acesso rápido e Por situação.',
      good: 'Mantém os acessos conhecidos sempre visíveis ao lado da lista.',
      cost: 'Ocupa mais espaço vertical no menu; os grupos podem ser recolhidos.',
      backend:
        'Mesmas listas, filtros e permissões. Nenhuma nova regra de trabalho.',
      mini: 'side',
    },
    {
      id: 'B',
      title: 'Navegação por abas',
      purpose:
        'Entrar em Processos pelo menu e escolher a lista em duas linhas de abas no conteúdo.',
      good: 'Mostra as alternativas juntas e permite alternar com um clique.',
      cost: 'As abas ocupam altura acima da lista, principalmente em notebooks menores.',
      backend:
        'Minha fila, Responsabilidade e cada situação continuam sendo consultas próprias.',
      mini: 'tabs',
    },
    {
      id: 'C',
      title: 'Seletor de visão',
      purpose:
        'Escolher a lista em um seletor compacto, com os mesmos dois grupos de acessos.',
      good: 'Deixa mais espaço para a lista e identifica explicitamente a consulta atual.',
      cost: 'As outras listas ficam dentro do seletor e exigem abri-lo para trocar.',
      backend: 'Preserva os recortes existentes e seus filtros adicionais.',
      mini: 'picker',
    },
    {
      id: 'D',
      title: 'Central de acessos',
      purpose:
        'Começar em uma central com todos os acessos; cada item leva à mesma lista clássica.',
      good: 'Dá contexto sobre o objetivo de cada fila sem comprimir a lista.',
      cost: 'Acrescenta uma etapa de entrada; Trocar lista permite mudar sem voltar à central.',
      backend:
        'Mesmos processos, estados, funções e permissões das demais alternativas.',
      mini: 'central',
    },
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
  const storageKey = 'jaral-processos-p16-acessos-v3'
  const decisions = {
    A: {
      choice: 'prefer',
      note: 'Opção 1 escolhida. Grupos Acesso rápido e Por situação, com seletor simples de departamento.',
    },
  }
  let storageAvailable = true
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || '{}')
    for (const idea of ideas) {
      const item = saved[idea.id]
      if (item)
        decisions[idea.id] = {
          choice: ['prefer', 'adjust', 'discard'].includes(item.choice)
            ? item.choice
            : '',
          note: typeof item.note === 'string' ? item.note.slice(0, 3000) : '',
        }
    }
  } catch {
    storageAvailable = false
  }
  const labels = {
    prefer: 'Preferir',
    adjust: 'Pedir ajuste',
    discard: 'Descartar',
  }
  function mini(type) {
    const rows = '<i></i><i></i><i></i><i></i>'
    if (type === 'central')
      return `<div class="org-mini org-mini-central"><span>${rows}</span><span>${rows}</span></div>`
    return `<div class="org-mini org-mini-${type}"><span class="org-mini-nav">${type === 'picker' ? '' : rows}</span><span class="org-mini-content">${rows}</span></div>`
  }
  const root = Review.mount({
    id: 'P16',
    title: 'Organização de Processos',
    module: 'Processos',
    nav: [
      { label: 'Início', icon: 'home', href: 'dashboard-processos.html' },
      {
        label: 'Comparar organização',
        icon: 'list',
        href: 'organizacao-processos.html',
        active: true,
      },
      {
        label: 'Movimentações',
        icon: 'list',
        href: 'movimentacoes-processos.html',
      },
    ],
    before: '../../docs/auditoria-ux/evidencias/11-processos-lista.png',
    notes: [
      'A opção 1 foi escolhida. Sua revisão usa Acesso rápido e Por situação, com o seletor simples de departamento. As demais alternativas ficam disponíveis como histórico.',
      'Preferir indica a favorita e pode ser marcado em uma ideia por vez; as demais podem receber ajuste, descarte ou permanecer sem decisão. As observações acompanham o resumo exportado.',
      'Cada prévia permite buscar, combinar recortes, consultar processos e adicionar anotações locais. A simulação não altera dados reais.',
    ],
    content: `<p class="org-gallery-intro">A opção 1 foi escolhida para seguir a organização existente de Processos. Abra a ideia A para revisar os grupos Acesso rápido e Por situação e o seletor simples de departamento. As alternativas B, C e D ficam registradas como histórico da comparação.</p><section class="panel org-gallery-summary"><strong id="org-review-count"></strong><button class="button" id="org-copy">Copiar resumo</button><button class="button" id="org-download">Baixar resumo</button></section><p class="org-storage-notice" id="org-storage" ${storageAvailable ? 'hidden' : ''}>As escolhas não serão mantidas neste navegador. Copie ou baixe o resumo antes de fechar.</p><div class="org-gallery-grid">${ideas
      .map((idea) => {
        const item = decisions[idea.id] || { choice: '', note: '' }
        return `<article class="panel org-idea-card" id="idea-${idea.id}"><div class="org-idea-visual" aria-hidden="true">${mini(idea.mini)}</div><div class="org-idea-body"><div class="org-idea-heading"><span class="org-idea-letter">${idea.id}</span><h2>${idea.title}</h2></div><p class="org-idea-purpose">${idea.purpose}</p><dl class="org-idea-facts"><div><dt>Favorece</dt><dd>${idea.good}</dd></div><div><dt>Compromisso</dt><dd>${idea.cost}</dd></div><div><dt>Preserva</dt><dd>${idea.backend}</dd></div></dl><a class="button primary org-idea-open" href="organizacao-processos-ideia.html?ideia=${idea.id}" target="_blank" rel="noopener">Experimentar ideia ${idea.id} ↗</a><div class="org-idea-decision"><span id="idea-${idea.id}-label">Sua decisão sobre a ideia ${idea.id}</span><button type="button" class="org-idea-clear" data-clear="${idea.id}">Limpar</button><div class="org-idea-options" role="radiogroup" aria-labelledby="idea-${idea.id}-label">${Object.entries(
          labels,
        )
          .map(
            ([choice, label]) =>
              `<label><input type="radio" name="decision-${idea.id}" data-idea="${idea.id}" value="${choice}" ${item.choice === choice ? 'checked' : ''}>${label}</label>`,
          )
          .join(
            '',
          )}</div><label class="org-idea-note"><span>Observações</span><textarea data-note="${idea.id}" maxlength="3000" rows="3">${esc(item.note)}</textarea></label></div></div></article>`
      })
      .join(
        '',
      )}</div><section class="panel org-common-functions"><h2>Mesmas funções nas quatro ideias</h2><p>Minha fila, Responsabilidade, Com outros setores e sete consultas por situação. Todas usam a mesma tabela, busca por empresa/CNPJ/código, tipo, setor, mês de abertura, ordenação e abertura pela linha inteira. Os mesmos 18 processos e as mesmas permissões aparecem nas quatro alternativas. O HUB continua sendo a passagem entre módulos.</p></section>`,
  })
  function persist() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(decisions))
    } catch {
      document.getElementById('org-storage').hidden = false
    }
    updateCount()
  }
  function updateCount() {
    const reviewed = ideas.filter((idea) => decisions[idea.id]?.choice).length
    const favorite = ideas.find(
      (idea) => decisions[idea.id]?.choice === 'prefer',
    )
    document.getElementById('org-review-count').textContent =
      `${reviewed} de 4 avaliadas${favorite ? ` · Favorita: ${favorite.id}` : ''}`
  }
  root.querySelectorAll('[data-idea]').forEach((input) =>
    input.addEventListener('change', () => {
      const id = input.dataset.idea
      if (input.value === 'prefer') {
        for (const idea of ideas) {
          if (idea.id !== id && decisions[idea.id]?.choice === 'prefer') {
            decisions[idea.id].choice = ''
            root.querySelector(
              `[data-idea="${idea.id}"][value="prefer"]`,
            ).checked = false
          }
        }
      }
      decisions[id] = {
        ...(decisions[id] || { note: '' }),
        choice: input.value,
      }
      persist()
    }),
  )
  root.querySelectorAll('[data-note]').forEach((input) =>
    input.addEventListener('input', () => {
      const id = input.dataset.note
      decisions[id] = {
        ...(decisions[id] || { choice: '' }),
        note: input.value,
      }
      persist()
    }),
  )
  root.querySelectorAll('[data-clear]').forEach((button) =>
    button.addEventListener('click', () => {
      const id = button.dataset.clear
      decisions[id] = { choice: '', note: '' }
      root
        .querySelectorAll(`[data-idea="${id}"]`)
        .forEach((input) => (input.checked = false))
      root.querySelector(`[data-note="${id}"]`).value = ''
      persist()
    }),
  )
  function summary() {
    return [
      'REVISÃO P16 — ORGANIZAÇÃO DE PROCESSOS',
      'Somente avaliação de prévias. A implementação depende de um próximo pedido.',
      '',
      ...ideas.flatMap((idea) => {
        const item = decisions[idea.id] || {}
        return [
          `Ideia ${idea.id} — ${idea.title}: ${labels[item.choice] || 'Ainda não avaliada'}`,
          item.note ? `Observações: ${item.note}` : '',
          `organizacao-processos-ideia.html?ideia=${idea.id}`,
          '',
        ]
      }),
    ]
      .filter((line) => line !== undefined)
      .join('\n')
  }
  function fallback() {
    const dialog = document.createElement('dialog')
    dialog.className = 'dialog org-export-dialog'
    dialog.innerHTML = `<div class="dialog-head"><h2>Copiar revisão P16</h2><button type="button" class="icon-button" data-close aria-label="Fechar">${Review.icon('x')}</button></div><div class="dialog-body"><label class="field"><span>Selecione e copie o resumo</span><textarea readonly>${esc(summary())}</textarea></label></div><div class="dialog-footer"><button class="button" type="button" data-close>Fechar</button></div>`
    document.body.append(dialog)
    const close = () => {
      dialog.close()
      dialog.remove()
      document.getElementById('org-copy').focus()
    }
    dialog
      .querySelectorAll('[data-close]')
      .forEach((button) => button.addEventListener('click', close))
    dialog.addEventListener('cancel', (event) => {
      event.preventDefault()
      close()
    })
    dialog.showModal()
    dialog.querySelector('textarea').select()
  }
  document.getElementById('org-copy').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(summary())
      Review.toast('Resumo das quatro ideias copiado.')
    } catch {
      fallback()
    }
  })
  document.getElementById('org-download').addEventListener('click', () => {
    const url = URL.createObjectURL(
      new Blob([summary()], { type: 'text/plain;charset=utf-8' }),
    )
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'revisao-P16-organizacao-processos.txt'
    anchor.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  })
  updateCount()
})()
