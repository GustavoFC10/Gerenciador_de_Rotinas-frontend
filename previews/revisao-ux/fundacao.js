/* global Review, document, setTimeout */
;(() => {
  const nav = [
    { label: 'Início', icon: 'home', href: 'base-visual.html' },
    { label: 'Fiscal', icon: 'grid', href: 'base-visual.html' },
    { label: 'Rotinas', icon: 'refresh', href: 'catalogo-rotinas.html' },
    { label: 'Configurações', icon: 'settings', href: 'estados.html' },
  ]
  function states() {
    const root = Review.mount({
      id: 'P10',
      title: 'Configurações',
      module: 'Rotinas',
      nav,
      notes: [
        'Amostras de estados no contexto atual: carregamento estável, erro recuperável, confirmação de descarte e indisponibilidade indicada antes do clique.',
        'Não propõe reunir páginas de configurações nem mover preferências entre módulos. Automação e integração continuam indisponíveis.',
        'Recuperação automática de rascunho fica para depois. A confirmação básica de descarte permanece na correção.',
      ],
      before: '../../docs/auditoria-ux/evidencias/09-configuracoes.png',
      content: `<div class="prototype-options"><span>Amostra em revisão</span>${[
        ['ready', 'Conteúdo'],
        ['loading', 'Carregamento'],
        ['error', 'Erro'],
      ]
        .map(
          ([id, name]) =>
            `<button class="button small" data-state="${id}">${name}</button>`,
        )
        .join(
          '',
        )}</div><section class="panel"><div class="panel-head"><h2>Preferências de visualização</h2></div><div class="panel-body state-content" id="state-content"></div></section><section class="panel"><div class="panel-head"><h2>Automação e integrações</h2><span class="badge">Em desenvolvimento</span></div><div class="panel-body"><p class="muted">Estes recursos ainda não estão disponíveis.</p><div class="actions"><button class="button" disabled>Criar automação</button><button class="button" disabled>Configurar integração</button></div></div></section>`,
    })
    const area = root.querySelector('#state-content')
    function render(state) {
      if (state === 'loading')
        area.innerHTML =
          '<div class="loading-placeholder" role="status"><span>Carregando preferências…</span><div></div><div></div></div>'
      else if (state === 'error')
        area.innerHTML =
          '<div class="notice error" role="alert"><strong>Não foi possível carregar as preferências.</strong><p>Confira a conexão e tente novamente.</p><button class="button" id="state-retry">Tentar novamente</button></div>'
      else
        area.innerHTML =
          '<div class="form-grid"><label class="field"><span>Tema</span><select><option>Claro</option><option>Escuro</option></select></label><label class="field"><span>Densidade da planilha</span><select><option>Compacta</option><option>Confortável</option></select></label></div><div class="actions end"><button class="button" id="state-discard">Cancelar</button><button class="button primary" id="state-save">Salvar preferências</button></div>'
    }
    root.addEventListener('click', async (event) => {
      const choice = event.target.closest('[data-state]')
      if (choice) render(choice.dataset.state)
      if (event.target.closest('#state-retry')) {
        render('loading')
        setTimeout(() => render('ready'), 1000)
      }
      if (event.target.closest('#state-discard')) {
        const discard = await Review.confirm({
          title: 'Descartar alterações?',
          body: 'As preferências ainda não foram salvas.',
          confirmLabel: 'Descartar',
        })
        if (discard) render('ready')
      }
      if (event.target.closest('#state-save'))
        Review.toast('Preferências salvas apenas nesta demonstração.')
    })
    render('ready')
  }
  if (document.body.dataset.proposal === 'P10') states()
})()
