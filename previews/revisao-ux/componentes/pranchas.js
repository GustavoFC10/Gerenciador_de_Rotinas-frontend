/* global window, document */

const button = (label, tone = '', extra = '') =>
  `<button type="button" class="button ${tone ? `button--${tone}` : ''}" ${extra}>${label}</button>`
const stack = (...children) =>
  `<div class="mock stack">${children.join('')}</div>`
const line = (...children) => `<div class="line">${children.join('')}</div>`
const between = (...children) =>
  `<div class="line between">${children.join('')}</div>`
const field = (label, content) =>
  `<label class="field"><span>${label}</span>${content}</label>`
const control = (value = '', attributes = '') =>
  `<input class="control" value="${value}" ${attributes}>`
const badge = (label, tone = '') =>
  `<span class="badge ${tone ? `badge--${tone}` : ''}">${label}</span>`
const image = (captures, name, alt, scale = '') =>
  `<div class="image-box ${scale}"><img class="capture" src="data:image/png;base64,${captures[name]}" alt="${alt}"></div>`
const section = (name, detail, preview, caption) => ({
  name,
  detail,
  preview,
  caption,
})
const sample = (name, preview, detail) =>
  `<article class="sample"><h2>${name}</h2>${preview}<p class="muted">${detail}</p></article>`
const board = (area, title, subtitle, sections, source) => ({
  area,
  title,
  subtitle,
  sections,
  source,
})
const finder = `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="10.5" cy="10.5" r="5.5"/><path d="m14.5 14.5 4 4"/></svg>`
const formRow = (label, value) => field(label, control(value))
const select = (label, value) =>
  field(label, `<select class="control"><option>${value}</option></select>`)
const escapeText = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')

const boards = {
  '01-dialogo-tarefa': (captures) =>
    board(
      'Padronização · Rotinas',
      'Criação de tarefa avulsa',
      'O mesmo formulário com a estrutura de diálogo compartilhada.',
      [
        section(
          'Antes',
          'Captura do frontend',
          image(captures, 'task', 'Modal atual de criação de tarefa avulsa'),
          'Overlay e cabeçalho locais. O formulário não recebe o contrato de foco do Dialog.',
        ),
        section(
          'Depois',
          'Protótipo com Dialog real',
          image(
            captures,
            'taskProposal',
            'Formulário de tarefa renderizado na primitiva Dialog',
          ),
          'Foco gerenciado, corpo rolável, rodapé comum e os mesmos campos e vínculos.',
        ),
      ],
      'Minhas tarefas → Nova tarefa · Dados de demonstração',
    ),

  '02-painel-lateral': (captures) =>
    board(
      'Novo componente · Equipe e Empresas',
      'Painel lateral de edição',
      'Padronizar a moldura e o fechamento de painéis que preservam o contexto do diretório.',
      [
        section(
          'Antes',
          'Captura do frontend',
          image(captures, 'invite', 'Painel de convite atual da Equipe'),
          'O convite tem overlay próprio. A ficha de empresa tem outra implementação para foco e fechamento.',
        ),
        section(
          'Depois',
          'Proposta de Drawer',
          `<div class="dialog-layout"><div class="drawer mock-dialog">
        <header class="line between"><div class="mock-heading"><h3>Convidar pessoa</h3><p class="muted">Defina a função e os acessos iniciais.</p></div>${button('×', 'ghost close', 'aria-label="Fechar"')}</header>
        <section class="stack divider"><h4>Identificação</h4>${formRow('Nome', '')}${formRow('E-mail', '')}${select('Papel na organização', 'Colaborador')}
        <h4>Acessos aos módulos</h4><div class="notice stack"><strong>Processos</strong>${line(...['Diretoria', 'Financeiro', 'Regularidade'].map((name) => `<label><input type="checkbox"> ${name}</label>`))}<p class="muted">Sem setores selecionados, a pessoa não terá acesso a Processos.</p></div>
        ${select('Acesso a Rotinas', 'Sem acesso')}${select('Acesso a Empresas', 'Sem acesso')}${select('Acesso a Honorários', 'Sem acesso')}</section>
        <footer class="stack"><p class="muted">O papel não concede acesso automático aos módulos.</p><div class="line end">${button('Cancelar')}${button('Enviar convite', 'primary')}</div></footer>
      </div></div>`,
          'Um contrato de foco, Escape, descarte e scroll. Campos, permissões e fluxo por rota continuam locais.',
        ),
      ],
      'Equipe → Convidar pessoa · Mesmo padrão de moldura aplicável a configurações e perfil',
    ),

  '03-confirmacao-arquivar': (captures) =>
    board(
      'Novo componente · Empresas e Rotinas',
      'Confirmação de arquivamento',
      'A confirmação informa o efeito da operação e oferece ações identificáveis.',
      [
        section(
          'Antes',
          'Texto atual + reconstrução',
          `<div class="native-stage"><div class="native"><strong>Confirmação do navegador</strong><p>${escapeText(captures.confirmText)}</p><div class="line end">${button('Cancelar')}${button('OK', 'primary')}</div></div></div>`,
          'A interface do navegador é ilustrativa. A mensagem acima vem do fluxo local de Empresas.',
        ),
        section(
          'Depois',
          'Proposta de ConfirmDialog',
          `<div class="mock mock-dialog"><div class="mock-heading"><h3>Arquivar ${escapeText(captures.companyName)}?</h3><p>A empresa deixa de aparecer entre as ativas. O histórico permanece disponível.</p></div><footer class="line end">${button('Manter empresa')}${button('Arquivar empresa', 'warning')}</footer></div>`,
          'Restauração usa intenção neutra. Remoção de vínculos recebe a consequência específica, quando aplicável.',
        ),
      ],
      'Empresas → Ficha → Arquivar · O foco inicial proposto fica em Manter empresa',
    ),

  '04-acoes-processo': (captures) =>
    board(
      'Padronização · Processos',
      'Ações de risco e ênfase',
      'O botão inicial abre a confirmação. A decisão final indica o efeito de cancelar ou excluir.',
      [
        section(
          'Antes',
          'Captura do frontend',
          image(
            captures,
            'processActions',
            'Confirmação de exclusão atual na ficha de Processos',
          ) +
            image(
              captures,
              'processCancel',
              'Confirmação de cancelamento atual na ficha de Processos',
            ),
          'A confirmação substitui o grupo de ações. O cancelamento reversível usa a mesma cor de risco da exclusão.',
        ),
        section(
          'Depois',
          'Proposta de Button e confirmação inline',
          stack(
            '<h4>Ao excluir</h4>',
            `<div class="notice notice--error stack"><div><strong>Excluir o processo de Aurora Comércio de Alimentos?</strong><p>Ele deixará de aparecer nas listagens. O histórico será preservado.</p></div><div class="line end">${button('Manter processo', 'small')}${button('Excluir processo', 'danger button--small')}</div></div>`,
            '<h4>Ao cancelar</h4>',
            `<div class="notice notice--warn stack"><div><strong>Cancelar este processo?</strong><p>Você poderá reabri-lo depois.</p></div><div class="line end">${button('Manter processo', 'small')}${button('Confirmar cancelamento', 'warning button--small')}</div></div>`,
          ),
          'O aviso destaca o cancelamento reversível. A ação preenchida confirma a exclusão.',
        ),
      ],
      'ProcessDetails · Estados alternativos do mesmo bloco · Empresa de demonstração',
    ),

  '05-campo-e-busca': (captures) =>
    board(
      'Novos contratos · Formulários e busca',
      'Busca e validação no próprio campo',
      'Separar busca, entrada monetária e validação sem duplicar a estrutura de rótulo, ajuda e erro.',
      [
        section(
          'Antes',
          'Captura + reconstituição',
          image(
            captures,
            'processSearch',
            'Busca na lista de Processos',
            'natural-scale',
          ) +
            image(
              captures,
              'companyField',
              'Campo CNPJ com erro após validar o formulário de empresa',
              'natural-scale',
            ) +
            stack(formRow('Valor do honorário', '1.250,00')),
          'A busca é local. O cadastro já liga campo e erro com IDs manuais. A formatação monetária é especializada.',
        ),
        section(
          'Depois',
          'Proposta de SearchField e Field',
          stack(
            `<div class="field"><label for="search-example">Buscar processos</label><div class="control-group">${finder}${control('Aurora', 'id="search-example" type="search" placeholder="Empresa ou protocolo"')}${button('×', 'ghost close', 'aria-label="Limpar busca"')}</div></div>`,
            '<div class="divider"></div>',
            `<div class="field"><label for="cnpj-example">CNPJ (opcional)</label><input class="control" id="cnpj-example" value="12.345.678/0001" aria-invalid="true" aria-describedby="cnpj-error"><small class="danger-text" id="cnpj-error">Informe um CNPJ válido, com dígitos verificadores.</small></div>`,
            field(
              'Valor do honorário',
              `<span class="control-group"><span class="muted">R$</span>${control('1.250,00', 'inputmode="numeric" aria-describedby="honorario-estudo"')}</span><small id="honorario-estudo" class="muted">Valor mensal</small>`,
            ),
          ),
          'A limpeza explícita devolve o foco ao campo. Field passa a fornecer a associação do erro. O campo monetário conserva sua normalização.',
        ),
      ],
      'Processos · Cadastro de empresa · Honorários',
    ),

  '06-estados-e-paginacao': (captures) =>
    board(
      'Novos componentes · Coleções',
      'Estado da lista e paginação',
      'A tela oferece uma recuperação diferente para filtro sem resultados, falha e ausência inicial.',
      [
        section(
          'Antes',
          'Captura do frontend',
          image(
            captures,
            'processEmpty',
            'Resultado de pesquisa vazia em Processos',
          ) +
            image(
              captures,
              'processPager',
              'Rodapé de paginação atual da lista de Processos',
            ),
          'A limpeza dos filtros fica na barra acima da lista. O rodapé tem paginação e seletor de tamanho próprios de Processos.',
        ),
        section(
          'Depois',
          'Proposta de CollectionState e Pagination',
          stack(
            '<div class="notice stack"><div><strong>Nenhum processo corresponde à busca</strong><p class="muted">Ajuste o termo ou limpe os filtros.</p></div><div>' +
              button('Limpar filtros') +
              '</div></div>',
            '<div class="notice notice--error"><strong>Não foi possível carregar os processos</strong><p>' +
              button('Tentar novamente', 'small') +
              '</p></div>',
            '<div class="divider"></div>',
            between(
              `<strong>${escapeText(captures.processRange)} processos</strong>`,
              line(
                button('Anterior', 'small'),
                `<span class="muted">${escapeText(captures.processPage)}</span>`,
                button(
                  'Próxima',
                  'small',
                  captures.processNextDisabled ? 'disabled' : '',
                ),
              ),
            ),
            `<label class="line muted">Por página <select><option>${escapeText(captures.processPageSize)}</option></select></label>`,
          ),
          'Faixa e navegação aparecem quando existe paginação. Falhas mantêm o contexto e a nova tentativa fica à mão.',
        ),
      ],
      'Processos · Diretórios · Honorários · Estados mostrados individualmente na aplicação',
    ),

  '07-selecao-e-abas': () =>
    board(
      'Novos contratos · Configurações e Telas',
      'Seleção simples, ordenação e abas',
      'Seleção de registros e troca de painéis têm regras de teclado diferentes.',
      [
        section(
          'Antes',
          'Reconstituição do código atual',
          stack(
            '<h3>Nova tela</h3>',
            control('', 'placeholder="Buscar rotinas"'),
            '<ul class="records"><li class="row"><input type="checkbox" checked><span>Apuração de tributos</span></li><li class="row"><input type="checkbox"><span>Conferência de notas</span></li></ul>',
            '<h3>Editar tela</h3>',
            '<p class="muted">2 rotinas selecionadas</p>',
            '<ul class="records"><li class="row"><span>Apuração de tributos</span> ↑ ↓</li><li class="row"><span>Conferência de notas</span> ↑ ↓</li></ul>',
            '<div class="divider"></div>',
            '<h3>Arquivados</h3>',
            `<div class="segmented">${button('Empresas', 'selected')}${button('Rotinas', 'ghost')}</div>`,
          ),
          'Busca, seleção e contagem são implementadas separadamente. Abas e seleção exigem semânticas próprias.',
        ),
        section(
          'Depois',
          'Proposta de SelectionList e Tabs',
          stack(
            '<h3>Editar tela</h3>',
            field(
              'Buscar rotinas',
              control('', 'placeholder="Nome da rotina"'),
            ),
            between(
              '<strong>Rotinas selecionadas</strong>',
              badge('2 selecionadas'),
            ),
            `<ul class="records"><li class="row"><span>1. Apuração de tributos</span>${button('↓', 'small', 'aria-label="Mover Apuração de tributos para baixo"')}</li><li class="row"><span>2. Conferência de notas</span>${button('↑', 'small', 'aria-label="Mover Conferência de notas para cima"')}</li></ul>`,
            '<div class="divider"></div>',
            '<h3>Arquivados</h3>',
            '<div class="tabs" role="tablist" aria-label="Arquivados"><button type="button" class="tab" role="tab" aria-selected="true">Empresas</button><button type="button" class="tab" role="tab" aria-selected="false">Rotinas</button></div>',
          ),
          'A ordem ganha comandos nomeados e anúncio de mudanças. Nas abas, o usuário pode trocar de painel por teclado.',
        ),
      ],
      'Rotinas → Telas · Configurações → Arquivados',
    ),

  '08-catalogo-botoes': () =>
    board(
      'Catálogo proposto · Ações',
      'Botões por intenção e estado',
      'Intenção, ênfase, seleção, tamanho e pendência podem variar independentemente.',
      [
        sample(
          'Ação principal',
          line(button('Salvar alterações', 'primary'), button('Cancelar')),
          'Envio do formulário. Cancelar usa ação de apoio.',
        ),
        sample(
          'Comando e navegação',
          line(
            button('Limpar filtros', 'ghost'),
            '<a class="button button--primary" href="#prancha">Nova empresa</a>',
          ),
          'Limpar altera a lista. Nova empresa abre outra página com aparência de botão.',
        ),
        sample(
          'Risco e confirmação',
          line(
            button('Excluir', 'danger-quiet'),
            button('Excluir processo', 'danger'),
          ),
          'Versão discreta abre a confirmação. A preenchida executa a decisão.',
        ),
        sample(
          'Pendência e indisponibilidade',
          line(
            button(
              '<span class="spinner" aria-hidden="true"></span> Salvando…',
              'primary',
              'disabled aria-busy="true"',
            ),
            button('Próxima', 'small', 'disabled'),
          ),
          'O progresso bloqueia novo envio. Próxima fica indisponível na última página.',
        ),
        sample(
          'Ícone com nome',
          line(
            button('×', 'ghost close', 'aria-label="Remover anexo"'),
            '<span>Remover anexo</span>',
          ),
          'Ação compacta com nome acessível e área de toque adequada.',
        ),
        sample(
          'Alternância',
          line(button('Densidade compacta', 'selected', 'aria-pressed="true"')),
          'Exemplo de preferência binária com estado pressionado. No perfil atual, densidade é um campo de seleção.',
        ),
      ],
      'Primário, neutro, discreto e selecionado já existem · Risco, pendência e navegação ganham contratos comuns',
    ),

  '09-novos-em-contexto': () =>
    board(
      'Aplicações imediatas · Novos componentes',
      'Ações de linha, status e retorno local',
      'Três peças pequenas para reaproveitar em módulos com tarefas diferentes.',
      [
        sample(
          'ActionMenu · Empresas',
          `<div class="line between"><strong>Empresa Aurora</strong>${button('⋯', 'small', 'aria-label="Ações da Empresa Aurora"')}</div><div class="menu"><a href="#prancha" class="button button--ghost">Abrir cadastro</a>${button('Arquivar', 'ghost')}</div>`,
          'Um gatilho por registro. Abrir cadastro continua sendo navegação.',
        ),
        sample(
          'StatusBadge · Processos',
          stack(
            between('Abertura', badge('Em andamento', 'warn')),
            between('Alteração', badge('Concluído', 'ok')),
            between('Encerramento', badge('Cancelado')),
          ),
          'O módulo fornece rótulo e intenção. Tipo de processo conserva significado próprio.',
        ),
        sample(
          'InlineFeedback · Honorários',
          '<div class="notice notice--warn" role="status"><strong>Atualizando orçamento…</strong><p>O resultado aparece após o recálculo.</p><div class="skeleton" aria-hidden="true"><span class="one-line"></span><span class="one-line short"></span></div></div>',
          'A área do cálculo fica estável durante a atualização.',
        ),
      ],
      'Aplicações de referência · Dados e ações sintéticos',
    ),

  '10-alternativas-futuras': () =>
    board(
      'Catálogo futuro · Alternativas condicionais',
      'Variantes para validar antes de adotar',
      'Cada alternativa precisa de uma tarefa real e de comportamento próprio.',
      [
        sample(
          'Botão dividido',
          '<div class="split">' +
            button('Baixar PDF', 'primary') +
            button(
              '▾',
              'primary',
              'aria-label="Outros formatos de exportação" aria-haspopup="menu" aria-expanded="false"',
            ) +
            '</div>',
          'Adotar se houver formato padrão inequívoco e formatos alternativos recorrentes.',
        ),
        sample(
          'Barra de ações em lote',
          between(
            '<strong>3 linhas selecionadas</strong>',
            line(
              button('Limpar seleção', 'ghost'),
              button('Exportar selecionadas', 'primary'),
            ),
          ),
          'A seleção entre páginas e as falhas por registro precisam ficar explícitas.',
        ),
        sample(
          'Controle segmentado',
          '<div class="segmented" role="radiogroup" aria-label="Modo de exibição">' +
            button('Lista', 'selected', 'role="radio" aria-checked="true"') +
            button(
              'Quadro',
              'ghost',
              'role="radio" aria-checked="false" tabindex="-1"',
            ) +
            '</div>',
          'Exemplo de duas visões da mesma coleção com seleção exclusiva e filtro preservado.',
        ),
      ],
      'Estudos de catálogo · A disponibilidade dessas funções depende de validação do fluxo',
    ),

  '11-dialogos-processos': (captures) =>
    board(
      'Padronização · Processos',
      'Estrutura comum, conteúdos diferentes',
      'Formulário de criação e leitura de relatório compartilham foco e scroll, com larguras e ações adequadas ao conteúdo.',
      [
        section(
          'Antes',
          'Captura do frontend',
          image(
            captures,
            'processForm',
            'Formulário Novo processo com os tipos disponíveis',
          ) +
            image(
              captures,
              'processReport',
              'Capa atual do relatório de movimentações',
            ),
          'Formulário e relatório já usam portal e hook de overlay. Cada um monta a própria estrutura.',
        ),
        section(
          'Depois',
          'Proposta de Dialog e DocumentDialog',
          stack(
            between(
              '<div class="mock-heading"><h3>Novo processo</h3></div>',
              button('×', 'ghost close', 'aria-label="Fechar formulário"'),
            ),
            '<h4 id="tipo-processo-estudo">Tipo de processo</h4>',
            `<div class="type-grid" role="radiogroup" aria-labelledby="tipo-processo-estudo">${captures.processTypes.map(({ name, detail }) => `<label><input type="radio" name="tipo-processo"><span><strong>${escapeText(name)}</strong><small class="muted">${escapeText(detail)}</small></span></label>`).join('')}</div>`,
            formRow('Nome da empresa (obrigatório)', ''),
            `<div class="field-pair">${formRow('CNPJ (opcional)', '')}${field('Prazo (opcional)', control('', 'type="date"'))}</div>`,
            between(
              '<h4>Observações</h4>',
              button('+ Adicionar observação', 'small'),
            ),
            '<div class="notice notice--warn">Ao abrir, os envolvidos com acesso a Processos serão notificados por e-mail.</div>',
            `<div class="line end">${button('Cancelar')}${button('Abrir processo', 'primary', 'disabled')}</div>`,
            '<div class="divider"></div>',
            `<div class="report-cover"><p>Movimentações Empresariais</p><h3>${escapeText(captures.processMonth)}</h3></div>`,
            line(
              ...captures.processMetrics.map(
                ({ label, value, detail }) =>
                  `<div class="stat">${escapeText(label)}<strong>${escapeText(value)}</strong><small class="muted">${escapeText(detail)}</small></div>`,
              ),
            ),
            `<div class="line end">${button('Fechar')}${button('Baixar PDF', 'primary')}</div>`,
          ),
          'Contrato compartilhado de fechamento e foco. A navegação do formulário e as ações de documento são específicas.',
        ),
      ],
      'Processos → Novo processo / Movimentações → Relatório',
    ),
}

window.boardNames = Object.keys(boards)
window.renderBoard = (name, captures) => {
  const { area, title, subtitle, sections, source } = boards[name](captures)
  const samples = typeof sections[0] === 'string'
  const content = samples
    ? `<div class="actions-grid">${sections.join('')}</div>`
    : `<div class="comparison">${sections
        .map(
          ({ name: label, detail, preview, caption }, index) => `
      <section class="stage ${index === 1 ? 'stage--proposed' : ''}">
        <div class="stage-heading"><h2>${label}</h2><span>${detail}</span></div>
        <div class="frame">${preview}</div>
        <p class="caption">${caption}</p>
      </section>`,
        )
        .join('')}</div>`
  document.querySelector('#prancha').innerHTML = `<article class="board">
    <header class="intro"><p class="eyebrow">${area}</p><h1>${title}</h1><p>${subtitle}</p></header>
    ${content}<footer class="meta">${source}</footer>
  </article>`
}
