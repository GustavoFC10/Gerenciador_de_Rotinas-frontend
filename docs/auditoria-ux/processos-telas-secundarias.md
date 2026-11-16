# Processos — telas secundárias e critérios de fidelidade

15/11/2026. Somente análise e prévias locais. Nenhum componente, cálculo, endpoint ou fluxo de produção foi alterado nesta rodada.

## Fontes e escopo

- [ProcessesPage](../../src/pages/processes/ProcessesPage.tsx): navegação, filtros, permissões e consultas.
- [ProcessOverview](../../src/components/processes/ProcessOverview.tsx): dashboard React atual.
- [ProcessList](../../src/components/processes/ProcessList.tsx), [ProcessSummaryRow](../../src/components/processes/ProcessSummaryRow.tsx) e [processFilters](../../src/utils/processFilters.ts): listas, linhas e recortes.
- [ProcessMovements](../../src/components/processes/ProcessMovements.tsx) e [processReportPdf](../../src/services/processReportPdf.ts): movimentações e documento.
- [Tipos e contratos](../../src/types/processes.ts): limites dos dados disponíveis.
- [Modelo da diretoria](<../../processos-jaralcon (1).html>): organização original do dashboard, movimentações e relatório.

O código atual foi tratado como autoridade de integração e autorização. O HTML da diretoria foi tratado como referência de organização e apresentação. Funções financeiras locais do HTML não foram transplantadas para o produto: os relatórios reais continuam dependendo dos agregados do servidor.

## Dashboard de Processos — P15

[Abrir prévia](../../previews/revisao-ux/dashboard-processos.html) · [Captura em notebook](../../previews/revisao-ux/imagens/P15-dashboard-processos.png)

### O que o original estabelece

O dashboard distribui o trabalho em duas colunas. À esquerda, mostra o que aguarda ação do setor selecionado e o que está com os outros setores. À direita, o Panorama da operação mostra processos em execução, percentual no prazo, barra de prazo, distribuição por setor, agendados, concluídos no mês e tempo médio. Prazos da Leggacy permanece como um bloco próprio.

A função do dashboard é orientar a entrada no trabalho e oferecer um panorama. Ele não deve se tornar outra listagem completa, nem apresentar estatísticas sem relação com o recorte dos dados.

### Problemas e ajustes avaliados

| Ponto                    | Constatação no React atual                                                                                                                                                                      | Tratamento na prévia e motivo                                                                                                                                                                                                       |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Base do número principal | `indicators.active` inclui abertos que aguardam liberação; o percentual ao lado considera apenas andamento + atrasados. Os textos são verdadeiros, mas comparam bases distintas no mesmo bloco. | Recuperar o destaque de **execução** do original: andamento + atrasados. Agendados continuam separados.                                                                                                                             |
| Barra de prazo           | O cálculo do percentual existe no React, mas a barra e a legenda do HTML não são renderizadas.                                                                                                  | Recuperar a barra e os números associados para leitura visual imediata, sem mudar as cores de estado ou recalcular prazos.                                                                                                          |
| Distribuição por setor   | Os totais permanecem, mas sem as barras do modelo.                                                                                                                                              | Recuperar barras com escala comum. As cores dos setores continuam nas marcas e os números continuam explícitos.                                                                                                                     |
| Destino das barras       | O dashboard atual chama “Filas executáveis por setor”, mas seu callback abre o recorte de Responsabilidade, que pode incluir processos aguardando liberação.                                    | O atalho precisa respeitar a base do indicador. Na prévia, abre a referência de ações liberadas do setor.                                                                                                                           |
| Indicadores adicionais   | Sete métricas complementares aparecem antes do panorama e ampliam bastante a coluna direita.                                                                                                    | Preservar o acesso aos indicadores atuais em um grupo complementar abaixo dos blocos principais. O panorama da diretoria permanece como referência hierárquica.                                                                     |
| Agendados                | O React atual inclui uma lista explícita de Aguardando liberação; no original, agendados também aparecem nos indicadores.                                                                       | Manter a lista atual e a data de liberação, distinguindo acompanhamento de ação disponível.                                                                                                                                         |
| Escopo                   | O setor afeta as ações à esquerda; os indicadores à direita são globais da organização.                                                                                                         | Identificar ambos os escopos. Trocar o setor não deve fazer o usuário concluir que os indicadores globais também foram filtrados.                                                                                                   |
| Médias                   | O contrato fornece `averageOpenAgeDays`; isso inclui abertos, e não apenas os em execução do original.                                                                                          | Conforme orientação recebida, a prévia mantém o estilo original com **18 d demonstrativos**. A definição do agregado de produção fica registrada em [Mudanças funcionais](mudancas-funcionais.md), sem bloquear a avaliação visual. |

### Invariantes para implementação futura

- Indicadores globais vêm de consulta agregada; não são somas de uma página de resultados.
- Um processo pode ter tarefas de mais de um setor em paralelo. As contagens por setor podem se sobrepor e não precisam somar o número de processos em execução.
- “Aguardando liberação” não significa tarefa executável. A data e as condições continuam sendo determinadas pelo servidor.
- Prazos da Leggacy preservam média, mínimo, máximo, amostra concluída e quantidade aguardando por tipo.
- Abrir, executar, editar e consultar valores financeiros continuam dependendo das permissões do recurso e do catálogo.
- A seleção do setor se refere ao setor de trabalho, não a uma atribuição individual a uma pessoa.

## Minha Fila, Responsabilidade e listas por situação

### O problema organizacional confirmado

O usuário está correto: hoje as entradas são composições de filtros sobre **a mesma lista de processos**, renderizadas pelo mesmo `ProcessList`. Trocar apenas as cores, os títulos ou a ordem das colunas manteria a fragmentação da navegação.

Há duas dimensões diferentes que precisam continuar disponíveis mesmo se as páginas forem unificadas:

| Dimensão             | Exemplos e contrato                                            | Pergunta respondida                                                                                   |
| -------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Situação do processo | andamento, atrasado, agendado, concluído, cancelado            | Em que situação este processo está?                                                                   |
| Relação com o setor  | `queueSector`/`taskSector`, `responsibleSector`, `otherSector` | Há uma ação liberada para este setor? O processo está sob sua responsabilidade? Está com outro setor? |

`Minha Fila` combina situação executável e tarefas liberadas para o setor. `Responsabilidade` usa o setor responsável e pode incluir processos que ainda aguardam a próxima liberação. Essa diferença de regra é válida; manter várias entradas visualmente equivalentes não é a única forma de apresentá-la.

Exemplo: um processo pode estar agendado e ser responsabilidade do Financeiro, sem aparecer na fila de execução do Financeiro. Juntar as regras sem preservar essa distinção criaria um erro operacional.

### Alternativas para comparação, sem decisão automática

1. **Catálogo único com filtros combináveis.** Retira as listas equivalentes do menu. Situação, setor e relação com o trabalho se combinam na mesma página. É a alternativa de menor mudança de dados, mas continua sendo uma organização por listagem.
2. **Quadro por situação operacional.** Distribui visualmente os processos em grupos de acompanhamento, mantendo os mesmos recortes. A prévia deve ser de consulta: arrastar um cartão não pode alterar silenciosamente etapas ou estados calculados.
3. **Bancada de execução com lista e detalhe.** Mantém a seleção visível e abre o contexto do processo ao lado. Reduz navegação entre lista e ficha, sem transformar a conclusão de tarefa em um clique cego. Uma fila realmente baseada em tarefas, com várias linhas por processo, exige contrato e paginação adequados para tarefas; `nextTask` é apenas uma próxima ação resumida.
4. **Dossiês por empresa.** Agrupa os processos pela empresa para consulta e acompanhamento de carteira. Precisa tratar processos ainda sem vínculo central e não pode agrupar somente por nome, pois nomes podem coincidir ou mudar.

As alternativas devem permitir comparar organizações distintas, não apenas quatro variações de cores do mesmo catálogo. Nenhuma das quatro foi imposta por P15/P17.

Nos atalhos dessas duas prévias, o diálogo “Referência: lista atual” reutiliza o componente React atual com dados fictícios. Isso torna o dashboard testável sem antecipar a escolha de organização da lista.

## Movimentações Empresariais — P17

[Abrir prévia](../../previews/revisao-ux/movimentacoes-processos.html) · [Captura](../../previews/revisao-ux/imagens/P17-movimentacoes-processos.png) · [Relatório](../../previews/revisao-ux/imagens/P17-relatorio-original.png)

### Organização preservada

1. Seleção do mês, atualização e Relatório do mês.
2. Ganhos de honorários, honorários perdidos e saldo mensal; dados não informados sinalizados à parte.
3. Listas de ganhos e perdas lado a lado, com tipo de processo e valor mensal.
4. Perdas por tipo de processo, com valores e participação.
5. Evolução dos últimos **12 meses** na página.
6. Relatório com marca Jaralcon, cabeçalho azul e dourado, resumo, indicadores, evolução de **seis meses**, listas e perdas por tipo. O PDF atual já utiliza seis meses.

O componente de movimentações foi derivado diretamente do React atual em um arquivo exclusivo da prévia. O componente de produção não foi editado. A única mudança de período no documento demonstrativo é recuperar os seis meses do relatório original; a página continua com 12.

### Cuidados semânticos e de apresentação

- Os números representam variação de **honorários mensais recorrentes**, pelo mês de abertura do processo. Não são receita de caixa, recebimento de parcelas nem faturamento já realizado.
- Ganhos, perdas, saldo e grupos por tipo devem vir do mesmo relatório mensal agregado. O frontend não deve reconstruir esses totais com processos visíveis ou aplicar outra fórmula.
- A ausência de valor não é zero. O registro continua identificável, com aviso de que está fora dos totais. Os exemplos permitem avaliar esse estado.
- A seleção do mês altera listas, indicadores, histórico e relatório juntos; o documento não pode usar dados de um mês anterior durante atualização.
- A lista inteira abre o processo. Não foi acrescentado botão “Abrir”.
- As duas colunas foram alinhadas ao mesmo topo, retirando a margem de painel herdada que criava um degrau entre elas.
- O relatório mantém o documento comercial próprio; o estilo do aplicativo não substitui sua marca ou sua organização.
- O contraste e o acabamento dos controles seguem o estilo aprovado. O cabeçalho do relatório permanece integralmente visível acima da rolagem.
- As regras reais de visualização financeira e de movimentações são mantidas na implementação futura. A prévia representa uma conta de direção com acesso aos dados fictícios.

### Decisão recebida sobre contagem

O usuário aprovou contar e rotular **movimentações**, não empresas únicas ou contratos novos. Uma empresa com dois processos produz duas movimentações; não foi criada deduplicação por empresa. A nomenclatura foi aplicada aos indicadores, perdas por tipo, resumo do relatório e PDF. Quantidades, valores e sinais permanecem iguais. O serviço de PDF foi derivado em arquivo exclusivo da prévia, sem editar o serviço de produção.

## Artefatos e verificação

- [Entrada isolada](../../previews/revisao-ux/processos-react/entry.tsx): layout do dashboard, abertura de detalhes e referência de lista.
- [Movimentações derivadas do React](../../previews/revisao-ux/processos-react/ProcessMovementsPreview.tsx).
- [Documento e PDF da prévia](../../previews/revisao-ux/processos-react/processReportPdfPreview.ts): mesma geração local e mesmos valores, com contagem em movimentações.
- [Fixtures](../../previews/revisao-ux/processos-react/fixtures.ts): 18 resumos, catálogo de 13 tipos, agregados demonstrativos e relatórios mensais em memória. Reutilizáveis pelas alternativas de organização.
- [Validação no navegador](evidencias/validacao-processos-secundarios.json): Edge em 1280 × 720 e 1366 × 768, mudança de setor/mês, abertura de linhas, lista atual, relatório de seis meses e geração real de PDF offline. Nenhuma requisição externa ou exceção de JavaScript na sessão.

Build: `npx vite build --config previews/revisao-ux/processos-react/vite.config.ts`.

ESLint sem erros ou avisos e typecheck isolado da entrada passaram. Os arquivos gerados em `processos-react/vendor` são artefatos da prévia; não são uma segunda implementação do módulo na aplicação.
