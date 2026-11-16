# Auditoria de design e UX

Data inicial: 12/11/2026. A auditoria abaixo registra o estado encontrado antes da reformulação. Em 15/11/2026 foi autorizada e aplicada a [etapa dos componentes base](IMPLEMENTACAO-BASE.md). As mudanças específicas dos módulos continuam no [plano e nas prévias](../../previews/revisao-ux/index.html), com prioridade para a organização de Honorários conforme o HTML aprovado.

[Plano para avaliação](../../previews/revisao-ux/PLANO.md) · [Comparação detalhada de Honorários](honorarios-fidelidade.md)

[Abrir galeria do estado atual](index.html) · [Rotinas](rotinas.md) · [Processos e Honorários](processos-honorarios.md) · [Empresas, Equipe e áreas compartilhadas](cadastros-hub.md)

## Complemento da rodada 3 — 15/11/2026

As telas inicialmente ausentes da seleção visual foram analisadas em [Dashboard de Rotinas](rotinas-dashboard.md), [Dashboard, filas e Movimentações de Processos](processos-telas-secundarias.md) e [alternativas de organização de Processos](processos-organizacao.md). A [pesquisa sobre empresas entre módulos](empresas-organizacao.md) compara Microsoft, SAP e Odoo, registra a escolha do cadastro central compartilhado e complementa o [mapa do contrato atual](empresas-mapa-atual.md).

As [prévias atualizadas](../../previews/revisao-ux/index.html) incluem uma [seleção própria de quatro ideias para Processos](../../previews/revisao-ux/organizacao-processos.html). Nenhuma dessas alternativas foi escolhida automaticamente. O restante deste documento registra o estado observado na auditoria inicial; as decisões posteriores estão na [rodada 3](../../previews/revisao-ux/REVISAO-03.md).

As definições e dependências a analisar depois estão no documento separado [Mudanças funcionais](mudancas-funcionais.md), com IDs para revisão individual. A unidade “movimentações” foi escolhida; a definição do tempo médio foi adiada sem interromper a avaliação visual.

## Como a avaliação foi feita

- Leitura dos componentes, rotas, estilos e contratos já existentes.
- Capturas em Edge real de 32 combinações de tela/largura, além da calculadora em atualização e do perfil de colaborador. Foram usados os componentes atuais em 1440, 1024 e 390 px com dados demonstrativos locais. Os controles exclusivos de demonstração foram ocultados das imagens.
- Medição de geometria dos campos e de uma atualização com latência controlada. Os dados brutos estão em [observacoes-browser.json](evidencias/observacoes-browser.json) e [medicao-calculadora.json](evidencias/medicao-calculadora.json).
- Comparação com diretrizes oficiais e padrões documentados de Microsoft Lists/Teams e Google Workspace Admin. Isso fornece critérios de avaliação; não significa copiar suas telas ou importar funções sem necessidade.
- Separação entre comportamento observado no navegador, evidência estática de código e hipótese dependente de uso/volume. Não houve estudo com usuários, medição de produtividade real nem inspeção de um tenant autenticado de produção.

O preview atual não tem uma agenda demonstrativa válida: `/agenda` mostrou a orientação de seleção, e o catálogo local só fornece uma tela de planilha. Portanto, a avaliação do quadro de Agenda é estática. O login e a administração interna também foram avaliados por código; não são apresentados como testes visuais concluídos. A quantidade de empresas do preview é pequena e não comprova o desempenho da base real.

## Síntese por módulo

| Área                       | Preservar                                                                                       | Problemas concretos ou riscos fortes                                                                                                                                                                                                 | Decisão que falta                                                                                                               |
| -------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| Rotinas                    | Planilha, navegação operacional, coluna de empresa fixa, estados com texto e atalhos existentes | Criar e editar o mesmo objeto têm organização diferente; ações de gravação inconsistentes; perda de rascunho em painéis; modal avulso sem comportamento completo de diálogo; explicações técnicas repetidas                          | Frequência de configuração, valor da prévia lateral, uso da Agenda e do celular                                                 |
| Processos                  | Fluxos e definições aprovados, seleção de tipo e informação de consequências                    | Controles próprios divergem do restante; catálogo completo continua ocupando a abertura depois da seleção; fechamento sem proteção do rascunho; algumas notas muito pequenas e claras                                                | Tipos predominantes e necessidade de abertura rápida; preservar cartões ou apresentar seleção compacta após escolher            |
| Honorários                 | Calculadora autoritativa, snapshots, confirmações financeiras e nove abas dos parâmetros        | Resultado desaparece durante atualização e desloca o preço; perfil pede campos que não se aplicam a certas combinações; cabeçalhos duplicados; histórico técnico; ficha de proposta coloca operação depois de um documento de 800 px | Simular antes de identificar cliente ou identificar primeiro; frequência de aceite/conversão e importância do histórico legível |
| Empresas                   | Cadastro central e independência de permissões                                                  | Estrutura de navegação diferente; campos de largura homogênea; listagem sem cabeçalho; consulta parece edição; ação Salvar pouco distinta; busca se perde ao sair da lista                                                           | Predomínio de consulta ou alteração; volume de cadastros; regras reais de código/regime e necessidade de arquivados             |
| Equipe                     | Separação entre papel organizacional e acesso operacional; configuração explícita por módulo    | Resumos de acesso repetidos; controles de concessão extensos; rascunho pode desaparecer ao fechar ou trocar pessoa; textos ainda citam só dois módulos; Salvar e Cancelar recebem ênfase semelhante em algumas telas                 | Convites/revisões frequentes, escala da equipe, utilidade de filtros de situação e reaproveitamento de acessos                  |
| HUB, perfil e configuração | HUB como seleção de área; login com autocomplete e exibição de senha; preferências compactas    | Vocabulário e ações globais variam; preferências parecem permanentes mas ficam apenas em memória; informações técnicas e mensagens genéricas de erro em contextos operacionais                                                       | Frequência de troca de módulo, persistência por usuário/dispositivo, público da administração interna e recuperação de conta    |

## Evidências transversais

### G01 — A mesma família de produto tem estruturas diferentes

Rotinas, Processos e Honorários têm navegação lateral; Empresas e Equipe usam o cabeçalho do HUB com abas horizontais e margem vertical maior. Não é necessário que todos tenham o mesmo menu, competência ou departamentos. É necessário que orientação global, hierarquia de página e localização das ações equivalentes sejam previsíveis. O HUB pode manter uma apresentação própria por ser um seletor.

Capturas: [Rotinas](evidencias/05-rotinas-nova.png), [Processos](evidencias/20-processos-form-abertura.png), [Honorários](evidencias/22-honorarios-orcamento.png), [Empresas](evidencias/14-empresas-nova.png), [Equipe](evidencias/16-equipe-convite.png).

### G02 — As medidas dos controles não seguem uma política comum

Na amostra capturada, entradas de Processos mediram 36 px; os campos compartilhados, aproximadamente 38–39 px; os campos locais de Empresas, 42 px. Checkboxes/radios foram excluídos dessa comparação porque são controles de outra natureza. Não é necessário impor a mesma largura a nome, código e preço: a largura deve acompanhar o conteúdo esperado. O problema é a falta de padrões claros para altura, alinhamento, densidade e comportamento do mesmo campo.

Em 1024 px, os rótulos da calculadora quebram em quantidades diferentes de linhas e deslocam os inputs de uma mesma linha; o segmento selecionado também fica truncado. Isso pode ocorrer mesmo com inputs de altura idêntica. [Captura de notebook](evidencias/27-notebook-orcamento.png).

### G03 — O cálculo muda a posição de uma ação durante a digitação

Com resposta de cálculo atrasada de forma controlada, o topo do cartão **Valor da proposta** passou de **562 px para 326 px** e voltou para **562 px**. O deslocamento foi de **236 px** na mesma largura de tela. O formulário não precisa mostrar um resultado antigo como válido para manter espaço estável: pode reservar o espaço e indicar atualização. Esta é uma direção de solução para discutir visualmente, não uma alteração aplicada.

[Estado normal](evidencias/22-honorarios-orcamento.png) · [Durante atualização](evidencias/33-honorarios-recalculo.png) · [Medição](evidencias/medicao-calculadora.json).

### G04 — O padrão de formulário e saída é incompleto

Vários painéis deixam fechar ou navegar com alterações pendentes, conforme os relatórios de código. Isso deve ser corrigido como prevenção de retrabalho. **Recuperar automaticamente rascunhos entre sessões**, por outro lado, é uma funcionalidade adicional e precisa de prioridade/contrato. Bloquear fechamento durante uma requisição e alertar sobre alterações são comportamentos diferentes.

Também devem ser consistentes: rótulos permanentes, indicação de obrigatório, ajuda necessária ao campo, erro associado ao dado e uma ação primária inequívoca. Não mover todas as explicações para tooltip: consequências financeiras e de permissão precisam continuar acessíveis.

### G05 — Há duplicação editorial, mas nem todo subtítulo é descartável

Remover ou condensar: títulos repetidos em níveis consecutivos, “cadastro principal” junto de um título autoexplicativo, frases que repetem o nome da tela, menções a API/backend/tenant/publicação de versão no preenchimento normal.

Preservar: o que uma rotina representa, diferença entre papel e permissão, efeitos de concluir definições, impacto de arquivar, valor congelado na conversão, limites do reajuste e instruções que evitam um erro real. A necessidade da ajuda deve determinar sua apresentação; não usar um template obrigatório de título + subtítulo em todos os blocos.

### G06 — Contraste e estados merecem uma regra única

O token `#94a3b8` sobre branco tem aproximadamente 2,56:1. Há usos em texto pequeno; cada ocorrência essencial precisa ser corrigida ou validada contra o fundo real. Isso não significa que todo texto secundário do sistema falhe. Estados de proposta hoje recebem praticamente a mesma apresentação; ali uma taxonomia semântica pode melhorar a varredura sem depender só de cor.

As diferenças observadas no primeiro registro do tema escuro de Honorários eram o instante de transição das cores; a captura posterior, após estabilização, ficou correta. Não é registrada como falha de CSS.

### G07 — Algumas ações prometem uma tarefa indisponível

Em Configurações, ações como editar organização, criar automação e configurar integração só apresentam indisponibilidade. A limitação deve ser perceptível antes do clique, sem sugerir que o fluxo está pronto. Isso não exige implementar esses recursos nesta revisão. A organização entre preferências pessoais, configurações de Rotinas, administração da organização e acessos deve ser avaliada conforme as tarefas reais, antes de mover destinos. Ver D01–D03 no [relatório de áreas compartilhadas](cadastros-hub.md).

## Avaliação dos ajustes opcionais solicitados

| Possibilidade                          | Avaliação preliminar                                                                                                           | O que deve orientar a decisão                                                                                                                                                                                                                   |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mais cor                               | Pode ajudar a separar navegação, área de trabalho, seleção e avisos. A quantidade de branco isoladamente não prova um defeito. | Comparar superfícies suavemente tonalizadas e acentos semânticos. Uma cor por módulo só se ajudar orientação, preservando o significado dos estados. Evitar painéis inteiros saturados e mais uma taxonomia competindo com setor/tipo/situação. |
| Reorganizar componentes                | Necessário onde os mesmos dados mudam de ordem entre criar/editar ou a ação fica fora do contexto.                             | Preservar a planilha e as estruturas aprovadas. Antes de mudar ordem do orçamento, escolha de tipo ou superfície da ficha, saber o trabalho predominante.                                                                                       |
| Reduzir descrições                     | Há excesso comprovado e vocabulário de implementação.                                                                          | Cortar repetição e manter informações que mudam uma decisão. Mostrar ajuda contextual quando o campo é menos conhecido, sem esconder regras essenciais.                                                                                         |
| Mais densidade                         | Pode melhorar uso repetitivo em notebook e diretórios.                                                                         | Densidade de dados e conforto de entrada são problemas distintos. Não reduzir todos os alvos clicáveis nem comprimir a planilha indiscriminadamente.                                                                                            |
| Diretório e ficha para Empresas/Equipe | Há estudos locais que já abordam consulta antes de editar, busca preservada e concessão de acesso mais clara.                  | Revisar os estudos existentes e atualizar os módulos/permissões antes de produzir alternativas. São propostas anteriores, não telas já entregues na aplicação.                                                                                  |

## Comparação com produtos consolidados e critérios utilizados

1. **Microsoft Fluent — coerência e foco.** A orientação é reduzir ruído e manter experiências reconhecíveis entre produtos; usamos isso para avaliar navegação e hierarquia, sem padronizar conteúdos operacionais distintos. [Princípios](https://fluent2.microsoft.design/design-principles).
2. **Microsoft Fluent — layout e campos.** Espaçamento organiza relações; largura de input deve acompanhar o conteúdo esperado. Aplicação aqui: separar identificação/contato/acesso, estabilizar linhas e distinguir código curto de razão social. [Layout](https://fluent2.microsoft.design/layout), [Input](https://fluent2.microsoft.design/components/web/react/core/input/usage), [Field](https://fluent2.microsoft.design/components/web/react/core/field/usage/).
3. **Microsoft Lists/Teams — ação no contexto do registro.** A documentação distingue criação/edição individual e modo de grade para operações repetidas. Isso sustenta preservar a planilha de Rotinas e avaliar ficha de edição sem transformar todos os módulos em grades editáveis. [Fluxo documentado](https://support.microsoft.com/en-us/sharepoint/lists/add-or-edit-list-items).
4. **Google Workspace Admin — separação de decisões.** O cadastro documentado começa pela identidade e permite tratar detalhes opcionais em uma etapa própria. A lição aplicável é diferenciar identidade, papel e acesso; não copiar o modelo de senha/licenciamento de outro produto. [Cadastro de usuário](https://knowledge.workspace.google.com/admin/users/add-an-account-for-a-new-user).
5. **Google Material — papéis de cor.** Superfícies, seleção, ação principal e erro têm funções específicas. Isso orienta testar cor por finalidade, em vez de colorir seções apenas para preencher o fundo. [Papéis de cor](https://m3.material.io/m3/pages/color-roles?s=m3).
6. **Microsoft — conteúdo.** Cabeçalhos devem orientar a leitura e a escrita deve servir à tarefa. Não há uma obrigação de repetir uma descrição depois de todo título. [Content design](https://fluent2.microsoft.design/content-design).
7. **W3C — acessibilidade verificável.** Texto normal tem referência mínima de 4,5:1, salvo exceções; reflow exige preservar conteúdo e operação, com exceção para elementos que precisam de duas dimensões, como tabelas. Tamanho mínimo de alvo de 24 px admite exceções de espaçamento; 44 px é uma referência mais confortável para ações de toque importantes, não uma proibição de interfaces densas de desktop. [Contraste](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), [Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html), [Alvos](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html), [Erros](https://w3c.github.io/wcag/understanding/error-identification.html).

## Decisões incorporadas ao plano e às propostas

O uso é exclusivamente em notebook, por departamentos, com aproximadamente vinte pessoas e trezentas empresas. A marca Jaral orienta a linguagem visual; cores, ícones e formato da planilha devem ser preservados. Rotinas é configuração ocasional e Processos não deve privilegiar tipos.

A preservação de busca/filtros e a consulta de pendentes/inativos/arquivados são prioritárias. Ação direta pela Agenda e reformulação do histórico ficam fora; recuperação de rascunhos fica para depois. Seletor de módulos é teste, sem decisão de implementação.

Honorários tem prioridade operacional: restaurar grupos, sequência, nomes e dependências do HTML original. Orçamentos são genéricos; Clientes utiliza empresas preexistentes. A matriz específica registra também diferenças de contrato que uma alteração visual não resolve.

Foram autorizadas prévias separadas para a unificação dos formulários de Rotinas e para a escolha compacta de Processos. A orientação mais recente autoriza reimaginar Empresas e Equipe com barra lateral e lista/ficha. Os formulários devem ter medidas apropriadas e aceitar digitação numérica com formatação automática de CNPJ e dinheiro. A implementação de produção permanece para uma etapa posterior à revisão das prévias.
