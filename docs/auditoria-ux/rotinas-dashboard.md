# Dashboard de Rotinas — avaliação e proposta P14

15/11/2026. Somente avaliação e prévia. Nenhuma alteração em `src/` faz parte deste documento.

O usuário autorizou reestruturar o dashboard e escolheu **operação da equipe primeiro, com resumo gerencial secundário**. Essa autorização não altera as restrições da planilha: seus estados, ícones, abas e organização continuam preservados.

[Abrir P14](../../previews/revisao-ux/dashboard-rotinas.html) · [Dashboard atual, captura da auditoria](evidencias/02-rotinas-inicio.png) · [Plano de revisão](../../previews/revisao-ux/PLANO.md)

## Fontes e fluxo atual

| Fonte                                                                                  | Referência na versão consultada                 | Responsabilidade                                                                                  |
| -------------------------------------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| [HomePage.tsx](../../src/pages/HomePage.tsx)                                           | Linha 25; composição na linha 57                | Obtém competência e usuário; apresenta prioridades, andamento da equipe e áreas de trabalho.      |
| [homeOverview.ts](../../src/utils/homeOverview.ts)                                     | Linha 56; filtros nas linhas 75 e 76            | Monta o resumo da competência, limitado aos departamentos autorizados.                            |
| [homeOverview.ts](../../src/utils/homeOverview.ts)                                     | Linha 102; atenção na linha 104                 | Separa abertas/encerradas e conta atenção por tarefa distinta.                                    |
| [homeOverview.ts](../../src/utils/homeOverview.ts)                                     | Linha 227                                       | Ordena prioridades por erro com atraso, atraso, erro, hoje, prazo próximo, andamento e pendência. |
| [routineStatus.ts](../../src/constants/routineStatus.ts)                               | Linha 16                                        | Define Concluída e Sem movimento como estados terminais.                                          |
| [routineListItems.ts](../../src/utils/routineListItems.ts)                             | Função `selectTasks`                            | Exclui tarefas avulsas pessoais do conjunto global usado pelo dashboard.                          |
| [HomePrioritySection.tsx](../../src/components/home/HomePrioritySection.tsx)           | Linha 57                                        | Abre a tarefa pela linha, mostra empresa, rotina, prazo e anexos.                                 |
| [HomeDepartmentPeriodCard.tsx](../../src/components/home/HomeDepartmentPeriodCard.tsx) | Linha 13                                        | Exibe andamento e contagens da equipe.                                                            |
| [HomeSpreadsheetSection.tsx](../../src/components/home/HomeSpreadsheetSection.tsx)     | Linha 8                                         | Oferece acesso às áreas de trabalho e seus resumos.                                               |
| [routineControlService.ts](../../src/services/routineControlService.ts)                | Linha 95; paginação em `listAll`                | Carrega recursos e projeções autorizados da competência; percorre as páginas necessárias.         |
| [P14 — JavaScript](../../previews/revisao-ux/dashboard-rotinas.js)                     | `reference`, `terminal`, `attention` e `render` | Demonstra a apresentação escolhida com dados fictícios e referência em 15/11/2026.                |

O dashboard atual já tem uma base operacional útil: competência, prioridades da equipe, progresso e acesso às planilhas. A proposta não precisa inventar pontuações, rankings de funcionários ou novos indicadores financeiros. A principal oportunidade é tornar esses dados mais acionáveis e esclarecer o recorte usado.

## Avaliação do estado atual

| Achado                                                                                                                   | Efeito no uso                                                                           | Resposta da P14                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Há seis prioridades por padrão, mas a contagem do cabeçalho é de todas as tarefas abertas.                               | A pessoa vê uma amostra sem uma relação imediata entre a contagem e as linhas exibidas. | Contagem do recorte escolhido e ação para expandir a lista.                                                      |
| As contagens de erro e atraso ficam no resumo lateral.                                                                   | A pessoa precisa interpretar o resumo antes de encontrar as tarefas correspondentes.    | Indicadores acionáveis no topo filtram a lista principal.                                                        |
| Erro é estado; atraso é condição de prazo. Podem ocorrer na mesma tarefa.                                                | Somar os dois números produz uma quantidade de tarefas incorreta.                       | “Exigem atenção” representa a união das condições, sem duplicação. As outras contagens permanecem independentes. |
| O painel de andamento e as prioridades têm bastante informação explicativa repetida.                                     | O conteúdo secundário compete com o que a equipe precisa executar.                      | Recorte e competência concentrados no cabeçalho; prioridade ocupa a coluna principal.                            |
| As áreas de trabalho ocupam cartões grandes abaixo dos painéis principais.                                               | O acesso à planilha pode exigir rolagem, embora seja uma atividade frequente.           | Acessos compactos às planilhas do departamento ficam junto ao resumo secundário.                                 |
| A soma das áreas de trabalho não é necessariamente um total exclusivo. Uma ocorrência pode aparecer em mais de uma tela. | Um resumo agregado por cartão pode sugerir totais aditivos que não existem.             | O total operacional deve ser calculado por ocorrência distinta; cada planilha mantém o próprio recorte.          |

## Organização proposta

A P14 coloca o contexto de equipe, o recorte de planilha e a competência antes dos números. Quatro entradas — Exigem atenção, Vencem hoje, Atrasadas e Com erro — filtram a lista principal, com o filtro ativo identificado. O andamento da competência e os acessos às planilhas permanecem na lateral.

Cada linha mantém empresa, rotina, responsável, estado e prazo. A linha abre a consulta da tarefa; o acesso à planilha preserva o contexto correspondente. A proposta não adiciona criação de modelos de rotina ao dashboard nem reformula a planilha. A gestão do catálogo continua em Rotinas.

Essa composição atende à direção aprovada: decidir onde agir ao entrar no módulo, consultar o contexto e chegar à área operacional. O resumo gerencial continua disponível sem dominar a tela.

## Significado dos números

| Indicador      | Regra a preservar                                                                                                                                    |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Total          | Ocorrências distintas e autorizadas da competência e do recorte selecionados. Não multiplicar uma ocorrência por cada célula ou tela em que aparece. |
| Abertas        | Total menos os estados terminais.                                                                                                                    |
| Encerradas     | Concluída + Sem movimento, conforme `isTerminalRoutineStatus`.                                                                                       |
| Andamento      | Encerradas ÷ total. Sem tarefas, apresentar ausência de tarefas, sem sugerir conclusão de uma competência vazia.                                     |
| Com erro       | Ocorrências abertas no estado Erro.                                                                                                                  |
| Atrasadas      | Ocorrências abertas com prazo anterior à data de referência.                                                                                         |
| Vencem hoje    | Ocorrências abertas com prazo igual à data de referência.                                                                                            |
| Exigem atenção | Ocorrências abertas com erro **ou** prazo até a data de referência, contadas uma única vez.                                                          |

Exemplo: uma tarefa com erro e vencida aparece em Com erro e Atrasadas, mas representa **uma** tarefa em Exigem atenção. Esses indicadores não são partes exclusivas de um gráfico e não devem ser somados.

Sem movimento encerra a ocorrência, mas não significa que uma obrigação foi executada com entrega. Por isso, a expressão “encerradas” é mais precisa que uma taxa de produtividade ou uma contagem genérica de serviços realizados. A legenda deve distinguir Concluída e Sem movimento mesmo quando ambas participam do andamento.

## Estados, ícones e cores

Os cinco estados devem usar a mesma semântica visual já definida no produto. A referência dos ícones é [RoutineStatusIcon.tsx](../../src/components/routine-control/shared/RoutineStatusIcon.tsx); a da aparência de execução é [RoutineClosedCardCompact.tsx](../../src/components/routine-control/spreadsheet/RoutineClosedCardCompact.tsx), com cores em [themes.css](../../src/styles/themes.css).

| Estado        | Reconhecimento a manter                 |
| ------------- | --------------------------------------- |
| Pendente      | Superfície neutra e ícone de documento. |
| Em andamento  | Amarelo/âmbar e relógio.                |
| Erro          | Vermelho e triângulo de alerta.         |
| Concluída     | Verde e confirmação.                    |
| Sem movimento | Azul e traço horizontal.                |

Rótulos e nomes acessíveis acompanham as cores. Atraso não vira um sexto estado de execução: é sinalizado no prazo. O tema escuro precisa manter contraste e a mesma associação entre estado, ícone e cor.

Durante a auditoria, os ícones de Erro e Sem movimento e as cores fortes da primeira versão da P14 foram comparados com essas fontes. A coordenação aplicou a correção na prévia para usar triângulo de alerta, traço horizontal e as cores correspondentes do produto.

## Competência, dados autorizados e limitações da prévia

- Competência, recorte, contagens, lista e detalhes devem representar o mesmo conjunto. Trocar a competência em produção exige carregar as ocorrências daquele período; não basta trocar o texto do cabeçalho.
- A data de referência deve respeitar o fuso da organização e a atualização dos dados. O código atual extrai uma data de `generatedAt`; ao implementar, conferir a diferença entre dia UTC e dia local perto da meia-noite.
- O total deve vir do conjunto completo autorizado, não das seis linhas inicialmente visíveis nem da primeira página. Se os dados passarem a ser paginados de outra forma, o agregado deve ser fornecido por contrato apropriado.
- A permissão de ler uma empresa no cadastro central não autoriza visualizar todas as ocorrências dela. Departamento, tela, ocorrência e módulo continuam sujeitos às permissões correspondentes.
- As tarefas avulsas pessoais continuam em Minhas tarefas. Incluí-las no resumo coletivo mudaria o escopo atual e exigiria uma decisão própria.
- A ordenação de prioridades atual é uma regra explícita. A implementação futura deve reaproveitá-la ou obter aprovação para qualquer alteração; o exemplo visual não autoriza reclassificar urgências silenciosamente.
- A P14 usa dados fictícios e referência fixa em 15/11/2026. Trocar o mês no exemplo reutiliza a amostra para demonstrar o comportamento visual; não comprova que existam aqueles dados ou estados em outro período.
- Os acessos às planilhas preservam `screenId` e competência na demonstração. A inicialização do roteador da prévia React interpreta tela e período solicitados pela URL; a navegação completa de P14 até Lucro Presumido em outubro foi conferida no navegador. Na implementação, o destino deve carregar as ocorrências reais do período.
- Ausência de dados, falha de carregamento e falta de permissão são situações distintas. Uma falha não deve resultar em números zero e mensagem de que tudo está em dia.

## Verificações para a implementação futura

1. Comparar contagens com as ocorrências completas da mesma competência, incluindo erro com atraso, vencimento hoje e Sem movimento.
2. Conferir deduplicação de uma ocorrência exibida em duas telas, e isolamento entre departamentos permitidos e não permitidos.
3. Conferir prioridade, filtro ativo, abertura e fechamento de tarefa, expansão da lista e retorno com o recorte preservado.
4. Navegar a cada planilha e verificar tela e competência de destino.
5. Conferir carregamento, erro, conjunto vazio, período sem tarefas e tema escuro em notebook.

A escolha operacional já foi respondida pelo usuário. A P14 continua uma prévia para avaliação visual; nenhuma alteração de regra ou integração de produção é consequência automática dessa aprovação de direção.
