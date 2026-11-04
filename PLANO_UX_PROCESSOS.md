# Plano de ajustes de UX — Processos Jaralcon

Data: 04/11/2026. Escopo: corrigir a apresentação e a compreensão dos fluxos existentes, preservando a concepção da equipe contábil.

**Atualização aprovada e implementada:** os ajustes deste plano foram aplicados à aplicação, mantendo a abertura e suas notificações como estavam. Na central de avisos, o seletor de destinatários é um único campo em que se podem marcar pessoas já cadastradas, departamentos ou todos com acesso a Processos. As prévias usam somente dados fictícios.

## 1. Direção da proposta

Manter a barra lateral, a identidade azul, os painéis claros, o vocabulário contábil, os dez tipos, os cinco status, as filas por setor e as fichas dos processos. O ajuste principal é dar uma função clara a cada elemento: navegar, filtrar, informar um resultado ou executar uma ação.

A lista terá **um botão principal de abertura, uma busca e um resumo dos resultados**. A navegação continuará mostrando as situações e seus totais globais. Na central de avisos, selecionar destinatários será a primeira tarefa visível ao abrir um aviso pendente.

O plano não propõe trocar o sistema por um CRM, adotar kanban, renomear os setores, reduzir etapas, alterar permissões, refazer honorários/PDF ou automatizar o envio dos novos avisos.

## 2. Diagnóstico do estado atual

As constatações abaixo combinam as capturas enviadas com a leitura dos componentes e estilos. Os números de linha são referências ao estado auditado, não endereços permanentes.

| ID    | Problema e evidência                                                                   | Causa confirmada                                                                                                                                                                                                                                    | Ajuste necessário                                                                                                                                             |
| ----- | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UX-01 | Dois botões “Novo processo” próximos um do outro                                       | `ProcessesPage.tsx` renderiza o botão na barra; `ProcessList.tsx` renderiza novamente no título. O Início vazio também tem outro botão. A regra `.processes-module body[data-page='lista']` em `processes.css:1075` não corresponde à árvore React. | Definir um único responsável pelo botão no JSX. Manter a ação na barra superior; estados vazios orientam para essa ação.                                      |
| UX-02 | Busca, tipo e responsável ficam com alturas diferentes; selects parecem caixas enormes | `ProcessList.tsx` usa `<select multiple>` para situações. `processes.css:1197` determina altura mínima de 136px; `.filters` é flex sem alinhamento explícito e estica os controles diretamente irmãos.                                              | Separar seleção múltipla de situações dos controles de linha. Usar alinhamento explícito e campos de altura consistente.                                      |
| UX-03 | Busca de empresa/CNPJ/protocolo aparece duas vezes                                     | Barra superior e lista renderizam entradas ligadas ao mesmo `q`.                                                                                                                                                                                    | Uma busca contextual acima da lista. A barra superior mantém contexto e ações.                                                                                |
| UX-04 | Indicadores e situações reaparecem no menu, em cartões, no seletor e nas etiquetas     | Menu usa indicadores globais; a lista usa indicadores dos filtros. Os mesmos quatro cartões aparecem até em Concluídos/Cancelados, onde vários valores não ajudam a decisão.                                                                        | Manter o panorama no Início e as contagens no menu. Na listagem, mostrar o total filtrado e o intervalo da página.                                            |
| UX-05 | Entrar em “Abertos” já gera três etiquetas e “Limpar filtros”                          | `processViewFilters('ativos')` fornece os três status abertos; `hasFilters` considera esses status como filtros adicionais.                                                                                                                         | Distinguir o recorte da navegação dos refinamentos feitos pela pessoa.                                                                                        |
| UX-06 | Parece não existir seleção de destinatários                                            | A seleção existe em `ProcessAlerts.tsx`, mas `selectedId` começa vazio e o editor só é renderizado após escolher um aviso. Datas e mensagem aparecem antes dos campos. Em históricos, a seleção é corretamente substituída pelo snapshot.           | Mostrar uma ação “Selecionar destinatários” em cada aviso pendente e orientar o estado inicial. Ao abrir o aviso, apresentar seleção antes da mensagem.       |
| UX-07 | No preview anterior nunca se consegue experimentar destinatários                       | `mockBackend.ts:1153` retorna listas sempre vazias para avisos, cobranças e opções; detalhes/preparação não possuem cenário funcional.                                                                                                              | Usar amostras estáticas explícitas em preview isolado, com avisos pendentes, declarados e situações encerradas; não gerar ciclos pelo relógio.                |
| UX-08 | No celular pode parecer que escolher um aviso não fez nada                             | Até 1180px a lista de avisos fica acima do editor e pode ocupar 400px; o clique não move o foco para o detalhe.                                                                                                                                     | Apresentar detalhe com título focável, acesso claro e retorno à lista preservando a consulta.                                                                 |
| UX-09 | Algumas etiquetas e notas perdem leitura no tema escuro                                | Etiquetas de tipo usam cores escuras fixas. Comparação matemática com o painel escuro indica contraste aproximado de 1,78–2,68:1; a nota de envio manual também precisa revisão.                                                                    | Criar pares de texto/fundo por tema e medir o resultado renderizado. O texto pequeno precisa de contraste de pelo menos 4,5:1.                                |
| UX-10 | Seletores genéricos e regras herdadas tornam o CSS difícil de prever                   | Há regras do HTML original baseadas em `body`, IDs e comandos que não existem na integração React; classes como `.input` e `.scards` são compartilhadas com outras áreas.                                                                           | Ajustes específicos por componente; remover regras comprovadamente obsoletas em uma etapa dedicada. Evitar sobrescritas globais para corrigir uma única tela. |

Não foi comprovada ausência dos endpoints, nem falha de permissão no ambiente real, apenas pelas capturas. Se os destinatários continuarem ausentes com um aviso pendente aberto pela Diretoria, conferir resposta de `recipient-options`, permissões, scroll e console antes de atribuir a causa ao backend.

## 3. Referências reais e limites da adaptação

Foram consultadas páginas públicas e documentação oficial. A documentação do Linear e do Fluent não representa uma inspeção de áreas autenticadas desses produtos. As decisões para o domínio contábil são adaptações nossas, não prescrições das fontes.

| Referência acessada                                                                                                                                                                                                                          | Princípio útil                                                                                             | Aplicação nesta proposta                                                                                                                                                                                        |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Linear — filtros](https://linear.app/docs/filters) e [busca contextual](https://linear.app/docs/search)                                                                                                                                     | Uma visualização pode ser refinada por critérios; busca dentro da visualização tem contexto identificável. | Preservar os recortes atuais e organizar busca/filtros adicionais em um único lugar. Não introduzir construtor AND/OR ou linguagem técnica.                                                                     |
| [GitHub — Issues público do VS Code](https://github.com/microsoft/vscode/issues) e [documentação de filtros](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/filtering-and-searching-issues-and-pull-requests) | Separação entre navegação, consulta e ação de criação.                                                     | Uma ação de criação, uma consulta da lista e critérios identificáveis. Os números e a semântica continuam seguindo nossa API.                                                                                   |
| [GOV.UK — botões](https://design-system.service.gov.uk/components/button/)                                                                                                                                                                   | Várias ações principais na mesma página competem pela atenção.                                             | Um botão de abertura por tela e ações secundárias com menor peso.                                                                                                                                               |
| [GOV.UK — checkboxes](https://design-system.service.gov.uk/components/checkboxes/) e [select](https://design-system.service.gov.uk/components/select/)                                                                                       | Seleção múltipla deve ser compreensível sem depender de comandos especiais do teclado.                     | Checklist para situações e setores. Manter selects compactos para as escolhas únicas já familiares. A recomendação genérica contra pré-seleção não substitui os setores sugeridos exigidos pelo nosso contrato. |
| [Microsoft Fluent 2 — TagPicker](https://fluent2.microsoft.design/components/web/react/core/tagpicker/usage)                                                                                                                                 | Buscar pessoas e manter as escolhas visíveis e removíveis.                                                 | Nome, e-mail e setor na lista de membros; selecionados visíveis entre buscas/páginas. Somente membros cadastrados: não permitir entrada livre de e-mails.                                                       |
| [IBM Carbon — filtering](https://www.carbondesignsystem.com/building-blocks/core/patterns/filtering)                                                                                                                                         | Diferenciar categorias, estado ativo e limpeza de filtros.                                                 | “Mais filtros” abre um painel inline com campos rotulados. Não esconder várias categorias dentro de um único dropdown.                                                                                          |

As referências servem à hierarquia e ao comportamento, sem importar marcas, bibliotecas ou modelos de negócio. A revisão antes da declaração também se apoia no padrão [GOV.UK — check answers](https://design-system.service.gov.uk/patterns/check-answers/), adaptado para a mesma tela.

## 4. Proposta para listas e filtros

### 4.1 Organização da tela

1. **Barra superior:** contexto do módulo, atualizar e “Novo processo” quando permitido.
2. **Título da lista:** nomes atuais, como Abertos, Atrasados ou Minha fila, com descrição curta.
3. **Uma faixa de filtros:** busca, tipo e setor responsável; “Mais filtros” abre mês e situações personalizadas.
4. **Refinamentos ativos:** etiquetas apenas dos filtros adicionais; nenhuma etiqueta automática repetindo o recorte do menu.
5. **Resumo da consulta:** “X processos nesta lista”; sem quatro cartões repetindo o menu.
6. **Resultados e paginação:** linhas atuais com empresa, tipo, código, etapa, situação e prazo. Rodapé “Exibindo A–B de X”, com página e tamanho de página.

Os cartões de panorama continuam no Início. Não esconder as contagens da barra lateral: identificá-las como “Toda a organização”. Elas não mudam quando alguém pesquisa uma empresa na lista.

### 4.2 O significado de cada número

| Elemento                     | Escopo                                              | Origem na aplicação real                           |
| ---------------------------- | --------------------------------------------------- | -------------------------------------------------- |
| Contadores do menu           | Organização inteira, por recorte                    | `indicators` sem filtros da lista                  |
| Resumo acima dos resultados  | Consulta atual, considerando recorte e refinamentos | `count` da página recebida                         |
| Intervalo e total de páginas | Página atual dessa consulta                         | `page`, `pageSize`, `count`, `next`, `previous`    |
| Contador de avisos pendentes | Todos os pendentes autorizados                      | `alerts?status=pending&pageSize=1`, usando `count` |

Não somar andamento, atraso e espera a partir das linhas carregadas. Não carregar todas as páginas para obter totais. Falha de consulta deve mostrar erro ou indisponibilidade, nunca zero como se fosse um resultado confirmado.

### 4.3 Recorte base e filtros adicionais

O menu continua definindo o recorte base. “Abertos” corresponde a `andamento`, `agendado` e `atrasado`; “Aguardando liberação” continua sendo o status recebido pelo backend, sem nova classificação no navegador.

| Ação                                      | Comportamento proposto                                                                                                                                       |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Entrar em Abertos                         | Três status enviados à API; nenhum chip automático desses três status.                                                                                       |
| Escolher tipo, setor, mês ou pesquisar    | Refinar a lista atual; exibir chip correspondente; voltar à página 1.                                                                                        |
| Trocar a situação no menu                 | Atualizar o recorte, zerar página e remover situações personalizadas. Preservar refinamentos adicionais, mantendo-os visíveis.                               |
| Remover um chip                           | Remover só aquele refinamento e voltar à página 1.                                                                                                           |
| Limpar filtros                            | Limpar refinamentos, mantendo o recorte atual e o setor da Minha fila. O botão não significa navegar para Todos.                                             |
| Personalizar situações                    | Abrir checklist, selecionar “Todos os processos” na navegação e indicar seleção personalizada. Não manter Abertos selecionado com uma consulta incompatível. |
| Desmarcar a última situação personalizada | Voltar a todas as situações; omitir `status` no request. Não enviar lista vazia inválida.                                                                    |
| Abrir ficha e voltar                      | Restaurar recorte, busca, filtros, página e posição quando possível, respeitando a organização/membership atual.                                             |
| Alterar quantidade por página             | Preservar critérios e voltar à página 1.                                                                                                                     |

Na aplicação, URL e filtros normalizados continuam sendo a fonte da consulta. Não criar estados divergentes no componente, nos chips e nos parâmetros. O protótipo usa memória local apenas para demonstrar as interações.

### 4.4 Dimensões e apresentação

- Campos de linha com altura de 40px no desktop e alvos confortáveis de 44px em telas de toque; labels acima dos controles.
- Grid ou flex com alinhamento explícito, `min-width: 0` e quebra responsiva. O conteúdo de um checklist não define a altura dos selects vizinhos.
- “Mais filtros” como botão de expansão (`aria-expanded`/`aria-controls`) e painel na página. Se houver critérios recolhidos, mostrar quantidade ativa e suas etiquetas fora do painel.
- Situações em checkboxes com nomes completos. Nenhum `<select multiple>` nem exigência de Ctrl/Command.
- Não repetir chips como “Aguardando liberação”, “Em andamento” e “Atrasado” só porque a pessoa entrou em Abertos.
- Preservar ícones, texto e cores dos dez tipos; validar os dois temas. Cor não é a única forma de identificar tipo, situação ou departamento.

## 5. Proposta para destinatários e avisos manuais

### 5.1 Entrada e descoberta

A central continua em `/processos/avisos`, exclusiva da Diretoria, por `permissions.create`. Não adicionar destinatários ao formulário de abertura de processo: esse envio automático já possui outra regra.

Na aplicação real, o estado inicial pode continuar sem aviso selecionado, mas cada pendente deve ter indicação explícita “Selecionar destinatários”. O painel vazio explica o próximo passo. No protótipo, o primeiro pendente está selecionado para que o elemento possa ser avaliado imediatamente.

Sem pendentes, mostrar o estado vazio e a opção de consultar histórico, sem simular falha. Financeiro/Regularidade veem apenas as áreas permitidas; não apresentar um formulário vazio que pareça quebrado.

### 5.2 Ordem do detalhe pendente

1. Empresa, código, tipo de aviso e estado.
2. **“Quem deve receber este aviso?”** — antes da mensagem longa.
3. **Um campo “Destinatários”:** o mesmo seletor pesquisável apresenta “Todos com acesso a Processos”, os departamentos Diretoria/Financeiro/Regularidade e pessoas já cadastradas. As opções usam checkboxes e aceitam combinação. Os padrões do servidor aparecem como sugestões revisáveis.
4. **Seleção e busca no mesmo campo:** pesquisar por pessoa ou departamento, marcar e remover escolhas sem abrir formulários separados. Cada pessoa mostra nome, e-mail e setor; selecionados continuam visíveis entre páginas e buscas. Não há cadastro nem entrada livre de endereços.
5. **Resumo da seleção:** explicar que setores inteiros podem incluir pessoas além dos nomes adicionados individualmente. O destinatário efetivo deve ser confirmado pelo servidor no preparo.
6. **Preparar texto**, conferir nomes/e-mails efetivos e conteúdo; **Copiar texto do e-mail** usando exatamente `copyText`.
7. Após envio externo, **Declarar envio realizado**, como ação separada, acompanhada de confirmação explícita. O registro não comprova entrega.

O resumo resolvido no protótipo é demonstrativo. Na produção, não calcular a expansão de setores pelas opções da página de membros: ela pode estar paginada e incompleta. `prepare` e `declare-sent` resolvem e deduplicam os destinatários no servidor.

“Todos” envia os três setores (`com`, `fin`, `reg`) ao servidor. A elegibilidade atual exige acesso ativo a pelo menos um desses setores; portanto essa união cobre todos os membros autorizados, inclusive os de outras páginas. Não significa “marcar as pessoas visíveis”. A opção pode ser desmarcada e a seleção continua editável.

### 5.3 Estados e proteções do fluxo

| Situação                                           | Comportamento esperado                                                                                                                      |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Sem setores ou pessoas                             | Explicar como selecionar; impedir preparação/declaração inválida, sem pedir e-mail livre.                                                   |
| Mesma pessoa por dois setores e seleção individual | Um único destinatário efetivo; exibir nomes/e-mails para conferência.                                                                       |
| Editar seleção depois de preparar/copiar           | Limpar preparação/cópia e exigir revisão novamente.                                                                                         |
| Cópia concluída                                    | Confirmar cópia, sem mudar o aviso para enviado.                                                                                            |
| Declarar envio                                     | Usar versão do aviso e seleção atual; desabilitar duplo envio enquanto aguarda resposta. Só atualizar estado após sucesso.                  |
| `409`                                              | Recarregar aviso, preservar seleção quando possível e pedir revisão/preparo/cópia. Não reaplicar declaração automaticamente.                |
| `400` por membro suspenso/revogado                 | Mostrar validação legível, atualizar opções e manter a possibilidade de corrigir seleção.                                                   |
| `403` ou troca de tenant/usuário                   | Retirar dados/ações restritos, descartar preparação e atualizar sessão/permissões.                                                          |
| `429`/`503`                                        | Manter contexto e respeitar `Retry-After`, sem mostrar vazio ou incentivar repetição contínua.                                              |
| Aviso com envio declarado                          | Snapshot de conteúdo/destinatários, autor, data e eventual encerramento; sem controles de alteração, reenvio ou exclusão.                   |
| Aviso resolvido sem envio                          | “Situação encerrada”; sem declaração ou escolhas editáveis.                                                                                 |
| Celular                                            | Abrir detalhe com foco no título; “Voltar aos avisos” restaura lista/consulta. Evitar que o editor apareça fora da percepção após o clique. |

Um fallback de cópia manual existe apenas na prévia para facilitar testes via `file://`. A implementação real deve manter a exigência de preparo/cópia definida no contrato e não tratar falha de Clipboard API como cópia concluída.

## 6. Ficha, filas, Início e movimentações

O escopo visual também precisa ser conferido fora da lista para que uma correção não desconfigure outras telas.

| Área                 | Ajuste previsto                                                                                                                                         | Regra preservada                                                                                         |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Início               | Panorama geral, fila e agendados com títulos que diferenciem execução de espera; remover botão duplicado no vazio.                                      | Agendados continuam abertos e visíveis, fora das ações liberadas.                                        |
| Minha fila           | Cabeçalho/filtros compactos e bloco de cobranças com título próprio abaixo das tarefas.                                                                 | Cobrança complementar não altera total de tarefas, percentual ou conclusão.                              |
| Ficha                | Hierarquia empresa/tipo/status; tarefas, tracking Leggacy, cobranças e histórico bem separados.                                                         | Tempo e cobrança vêm de `leggacy`; nenhum motor temporal no navegador.                                   |
| Histórico            | Textos claros para Sistema, ação humana e declaração manual; autor/data sem números internos incompreensíveis quando houver nome autorizado disponível. | Não usar o diretório administrativo para ampliar acesso; não inventar autor quando a API só devolver ID. |
| Cobranças encerradas | Manter contato realizado e encerramento visíveis, com data/autor e filtro de histórico.                                                                 | Preservar ciclos anteriores e registros de cobrança após o retorno.                                      |
| Movimentações        | Conferir apenas alinhamento, etiquetas e responsividade após mexer nos componentes compartilhados.                                                      | Valores decimais, cálculo, omissões financeiras, jsPDF e identidade do relatório.                        |

Estas áreas não serão redesenhadas inteiramente. Só recebem correções verificadas durante a aplicação dos componentes compartilhados. As duas prévias entregues cobrem os elementos com problema diretamente mostrado pelo usuário.

## 7. Sequência de implementação

Não é necessário alterar o backend para corrigir duplicação, alinhamento, hierarquia ou descoberta dos campos já disponíveis. Ajustes de contrato só devem ser propostos se uma resposta real demonstrar necessidade.

| Ordem                                    | Entrega                                                                           | Arquivos principais                                                        | Critério de saída                                                                       |
| ---------------------------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| 0 — diagnóstico e proposta               | Auditoria, referências e previews com dados fictícios                             | Este plano e `previews/processos-ux/`                                      | Causas distinguidas de hipóteses e fluxos testáveis. **Entregue nesta etapa.**          |
| 1 — estrutura básica                     | Um CTA, uma busca, controles alinhados e CSS específico                           | `ProcessesPage`, `ProcessList`, `ProcessOverview`, `processes.css`         | Sem botões/buscas duplicados; controles compactos nos dois temas.                       |
| 2 — filtros e números                    | Recorte base separado de refinamentos; resumo da consulta e limpeza previsível    | `ProcessList`, `processFilters`, parser de URL da página                   | Situações, URL, chips e API coerentes; paginação e retorno da ficha preservados.        |
| 3 — central de avisos                    | Entrada explícita, seleção primeiro, resumo efetivo e envio declarado com revisão | `ProcessAlerts`, `process-alerts.css`, hooks/serviços apenas se necessário | Seleção individual/setorial/combinada executável sem duplicação e sem envio automático. |
| 4 — estados e apresentação compartilhada | Mobile, foco, contraste, vazios/erros e etiquetas de tipo                         | CSS específico, `ProcessTypeBadge`, componentes de estados                 | Cenários definidos na matriz de validação passam sem regressão de valores/PDF.          |
| 5 — entrega e conferência                | Evidências visuais e funcionais, CI e roteiro com a equipe contábil               | Testes pertinentes e documentação do preview                               | Aprovação funcional por tarefas reais e mudanças prontas para publicação coordenada.    |

Aplicar em mudanças pequenas, revisáveis. A prioridade inicial é tornar destinatários encontráveis e desesticar os filtros; depois simplificar as repetições. Não usar `!important` em regras globais para ocultar duplicações que deveriam ser resolvidas pela estrutura React.

Pontos de conferência com a equipe contábil durante a revisão: manutenção dos nomes atuais, permanência das contagens no menu, significado de “Limpar filtros” e localização da escolha dos destinatários. O protótipo apresenta uma recomendação concreta para cada ponto, sem depender dessas respostas para existir.

## 8. Matriz de aceite

| ID  | Cenário                                                 | Aceite objetivo                                                                                                                    |
| --- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| A01 | Listas, Início vazio, fila e ficha                      | No máximo um “Novo processo” visível; somente para quem pode criar.                                                                |
| A02 | Abertos sem refinamentos                                | Sem chips repetindo automaticamente os três status; menu e resumo com escopos claros.                                              |
| A03 | Pesquisar empresa                                       | Um campo de busca; resultado muda; contadores globais não são substituídos pelo resultado filtrado.                                |
| A04 | Tipo/setor/mês e situações personalizadas               | Remover critério individual, limpar refinamentos e trocar recorte produzem a consulta esperada; página reinicia quando necessário. |
| A05 | Abrir processo da página 2 e voltar                     | Mesma consulta e página; nenhum dado do tenant anterior.                                                                           |
| A06 | Concluídos/Cancelados                                   | Nenhuma grade repetida de indicadores de processos abertos sem utilidade para a lista.                                             |
| A07 | Controles desktop/mobile                                | Nenhum select com altura da lista de situações; labels e área de toque legíveis; sem rolagem horizontal da página.                 |
| A08 | Aviso pendente pela Diretoria                           | A pessoa identifica e abre a seleção; setores, busca e membros aparecem antes da mensagem extensa.                                 |
| A09 | Setor + pessoa do mesmo setor + pessoa externa ao setor | União efetiva correta e deduplicada retornada por `prepare`; contador não depende da página de membros.                            |
| A10 | Preparar, copiar e editar seleção                       | Preparação/cópia anteriores deixam de habilitar declaração. Copiar não declara envio.                                              |
| A11 | Declaração manual                                       | Pedido só após ação explícita; nova versão e snapshot somente depois de resposta bem-sucedida.                                     |
| A12 | Conflito, revogação e perda de permissão                | Revisão sem replay em `409`; validação em `400`; dados restritos removidos em `403`; espera de `Retry-After`.                      |
| A13 | Histórico enviado/resolvido                             | Destinatários/conteúdo imutáveis; “Envio declarado” permanece distinto de entrega e mostra encerramento quando houver.             |
| A14 | Financeiro e Regularidade                               | Sem destinatários/central restrita, inclusive por URL direta; tarefas e cobranças seguem suas permissões.                          |
| A15 | Espera e cobranças                                      | Agendados visíveis entre abertos; cobrança não altera progresso; contato humano preservado após resolução e em novos ciclos.       |
| A16 | Dez tipos, cinco status, honorários e PDF               | Etiquetas com texto/ícone; cálculos e exportação preservados, sem vazamento financeiro.                                            |
| A17 | Consulta vazia, carregando ou falhando                  | Mensagens diferentes; filtros preservados; erro não aparece como zero confirmado.                                                  |
| A18 | Teclado, tema e zoom                                    | Foco visível, labels/legends, fechamento por Escape, retorno de foco e contraste medido; nenhum fluxo depende só de cor ou hover.  |

Para a aplicação real, validar 320, 390, 768, 1024, 1366 e 1440 CSS px; zoom de 200% e 400%; temas claro/escuro; nomes/e-mails longos; listas vazias e paginadas. Não impor ausência de rolagem horizontal a uma tabela financeira que legitimamente precisa dela, mas manter os controles e o conteúdo da lista legíveis.

As metas de acessibilidade se apoiam em [WCAG 2.2 — contraste](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), [reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html) e [tamanho de alvos](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html). O mínimo de alvo possui exceções; 44px é a meta confortável adotada nesta proposta, não uma afirmação de que todo controle de 40px viola a WCAG.

Verificação de entrega: testes de comportamento dos filtros/URL e seleção; testes de permissão e conflitos já relevantes; capturas em navegador com larguras/temas diferentes; formatação, TypeScript, lint, suíte e build exigidos pela CI. Testes de DOM isolados não confirmam tamanho, sobreposição ou contraste; é indispensável conferir a renderização.

## 9. Previews entregues e roteiro de revisão

- [Lista, navegação, filtros e estados](previews/processos-ux/index.html): um CTA, busca única, menu com contagens globais, resumo da consulta, refinamentos e situações personalizadas; simulação de perfis/estados e tema escuro.
- [Destinatários e declaração manual](previews/processos-ux/recipients.html): setores, pessoas, união sem repetição, preparo/cópia separados da declaração, histórico e estados de erro/acesso.
- [Instruções e limites dos protótipos](previews/processos-ux/README.md).

Na segunda prévia, o foco é o miolo da central, não uma nova navegação da aplicação. A implementação real deve continuar dentro do shell existente.

Roteiro curto para a equipe contábil:

1. Na lista, localizar um processo por empresa e tipo; perceber por que o contador do menu não muda.
2. Trocar Abertos por Aguardando liberação, limpar apenas refinamentos e abrir/fechar a ficha sem perder contexto.
3. Usar Mais filtros para consultar situações combinadas; confirmar que não precisa de Ctrl/Command.
4. Na central, escolher somente uma pessoa; depois um setor; depois ambos, verificando a ausência de nomes repetidos.
5. Preparar/copiar e mudar um destinatário: a declaração deve voltar a exigir revisão.
6. Simular histórico, destinatário revogado e os perfis Financeiro/Regularidade; conferir a clareza das mensagens.

Resultado esperado da revisão: confirmar que as tarefas ficaram mais claras sem mudar a forma de trabalho idealizada pelo setor contábil. Nenhum cadastro real, envio de e-mail ou alteração de processo é feito pelos protótipos.

### Verificação das prévias nesta entrega

Além das prévias isoladas, a aplicação foi conferida em Microsoft Edge com o backend demonstrativo: dez combinações de tela/largura entre 320 e 1440px, sem overflow horizontal, um único botão de abertura, uma busca e campos da lista de 40–44px. O campo de busca preserva foco e espaços durante novas consultas. O seletor foi conferido aberto, sem corte pelos cartões, e “Todos” resolveu cinco pessoas fictícias sem duplicação; preparar não habilitou declaração sem cópia. Há capturas reais da aplicação em desktop, celular e tema escuro, descritas no [README das prévias](previews/processos-ux/README.md#capturas-e-verificação-realizada).

Essa verificação registra a implementação no repositório, sem afirmar publicação em hospedagem ou conformidade completa de acessibilidade. A matriz de aceite continua sendo o roteiro para a conferência com dados autorizados do backend real.
