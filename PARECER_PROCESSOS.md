# Parecer técnico — módulo Processos

**Data:** 26/10/2026  
**Escopo:** frontend do módulo Processos e contrato descrito em `ENDPOINTS.md`, com conferência pontual de `openapi.yml` e do backend simulado de preview.

## Parecer executivo

O módulo funciona sobre um contrato de API relativamente explícito, mas mistura responsabilidades de transporte, estado de domínio, apresentação e filtragem em alguns pontos centrais. Há justificativa para uma reorganização gradual, especialmente na fronteira entre API e frontend e na consulta/listagem. Não há, porém, evidência suficiente para atribuir os problemas à arquitetura inicial, a uma ferramenta de geração ou à pessoa que criou a primeira versão. A análise descreve o estado atual do código; não determina sua autoria ou histórico.

Sobre o caso da 2ª visita: **a lista ativa é filtrada pelo campo `status`**. `inProcessView` inclui em “Em andamento” todo recurso recebido com `status === 'andamento'`. A espera da próxima etapa não altera esse filtro. Ela apenas determina o subgrupo visual: se `analysis.waiting` for verdadeiro, o item vai para “Agendados”; se estiver atrasado, vai para “Atrasados”; caso contrário, para “Em andamento”. Assim, se o processo não aparece em nenhum desses grupos, a hipótese de que “a espera o removeu da lista ativa” não é compatível com o código atual.

Essa conclusão depende de o registro com status `andamento` estar presente **na resposta da listagem**. A resposta compartilhada agora para `GET /processes/` é `{"count":0,"next":null,"previous":null,"results":[]}`. Isso confirma que, nessa requisição, o próprio backend declarou não haver processos para listar. O frontend não pode exibir um processo que não veio na coleção; busca, tipo, setor pendente, classificação em grupos e paginação do frontend não explicam esse resultado vazio.

Se `GET /processes/{id}/` retorna o processo para a mesma sessão e organização em que `GET /processes/` retorna essa coleção vazia, há uma divergência de comportamento no backend: o endpoint individual encontra um recurso que o endpoint de coleção não inclui. O contrato da seção 17 define a coleção como lista paginada do tenant ativo e não documenta exclusão de processos em espera. Como `next` é nulo, não há páginas seguintes a verificar nessa resposta.

As causas backend ainda plausíveis incluem escopo de tenant/organização ou membership diferente entre as duas requisições, queryset/manager da listagem com condição adicional indevida, ou estado/soft-delete considerado de forma diferente na rota de detalhe. Não há evidência para escolher uma dessas causas sem conferir a identidade/organização efetiva de ambas as requisições e o código/backend logs correspondentes. A resposta do catálogo no anexo só descreve workflows e permissões; ela não demonstra que existam instâncias de processo.

A organização visual atual também é confusa: um processo pode ter status persistido `andamento` e ser apresentado sob um grupo chamado “Agendados”. Isso mistura ciclo de vida com condição operacional e merece revisão. Essa confusão, por si só, não explica o desaparecimento: o filtro de entrada da visão ativa não exclui processos aguardando; se o processo não chega à lista, a fronteira mais suspeita é a resposta/cache da listagem ou um filtro adicional ativo.

## Fluxo atual de dados e status

1. `ProcessesPage` carrega catálogo, indicadores, detalhe e lista em consultas distintas. Para a lista, chama `processService.listAll({}, signal)`, sem filtros de status, setor ou espera. A consulta repete a cada minuto.
2. `ProcessService.listAll` percorre as páginas de `GET /api/v1/processes/` até não haver próxima página e devolve uma lista plana.
3. `ProcessList` aplica localmente a visão escolhida, tipo, busca e setor pendente. A visão `ativos` testa somente `status === 'andamento'`.
4. Na visão ativa, o componente distribui os registros em grupos baseados em `analysis.late`, `analysis.waiting` e `status`. Com os invariantes descritos na API, um registro ativo deve cair em um desses grupos.
5. Detalhes e listas usam diretamente `ProcessResource`, o formato da API, incluindo nomes abreviados ou herdados (`empresa`, `tipo`, `tarefas`, `etapas`, `d`, `s`, `em`). Os componentes leem esse formato diretamente.

Com isso, fica delimitado onde o caso pode ocorrer: se `status: andamento` está no array `listQuery.data` e busca/tipo/setor pendente estão limpos, a visão `ativos` não o descarta. Na resposta compartilhada, porém, `results` está vazio, portanto a regra da UI nem recebe o processo. Se o mesmo ID retorna no detalhe para o mesmo usuário/organização, a divergência está na rota de coleção, seu escopo/queryset ou na resolução do tenant no backend. Acessar o detalhe não faz a página de lista buscar/mesclar esse registro; são consultas independentes.

O contrato estabelece que o servidor calcula a conclusão e o estado de espera: `status` tem os valores `andamento`, `concluido` e `cancelado`; `analysis` informa etapa atual, progresso, espera, atraso e setores pendentes. A espera de quatro meses da reunião de acompanhamento é uma regra de liberação da próxima etapa, não um estado terminal. Concluir todas as tarefas efetivas conclui o processo.

## Achados

| Prioridade | Achado | Evidência e consequência |
|---|---|---|
| **Alta** | A consulta carrega todos os processos e filtra no navegador, embora a API aceite filtros e paginação. | `ProcessesPage` chama `listAll({})`; `ProcessService.listAll` acumula todas as páginas. Isso aumenta o tráfego, memória e trabalho no cliente conforme a organização cresce e deixa a lista dependente de baixar o conjunto completo. Os indicadores, por sua vez, já vêm de outro endpoint. |
| **Alta** | O tipo de recurso da API é também o modelo consumido pelos componentes. | `ProcessResource` estende os campos de escrita e carrega estrutura, abreviações e opcionais de resposta diretamente à UI. Isso acopla apresentação e domínio ao contrato do servidor; uma mudança de API atravessa vários componentes e dificulta normalizar inconsistências. |
| **Alta** | Os tipos TypeScript não validam a resposta recebida em execução. | O cliente trata a resposta como `ProcessResource` por anotação estática. Um payload malformado, incompatível ou divergente entre detalhe e lista pode passar até a filtragem/renderização sem diagnóstico explícito. As omissões de campos financeiros por permissão são intencionais e documentadas; a ausência de validação deve respeitar essa regra, não converter ausência em zero. |
| **Média** | As regras da visão e dos grupos estão repartidas entre helper, lista, overview e linha. | `inProcessView` escolhe a visão; `ProcessList` calcula grupos e contagens; `ProcessOverview` e `ProcessSummaryRow` interpretam status/analysis novamente. Isso aumenta o risco de telas exibirem classificações diferentes ou de uma mudança corrigir um ponto e deixar outro inconsistente. |
| **Média** | Os estados principais e as condições operacionais são conceitos distintos, mas a UI os apresenta juntos. | `status` expressa andamento/conclusão/cancelamento; `waiting` e `late` são condições de um processo. “Agendados” é uma visão derivada, não um quarto valor de `ProcessStatus`. Sem uma regra de apresentação única e explícita, a terminologia pode levar a confundir “grupo da lista” com “status persistido”. |
| **Média** | A cobertura de testes não protege a regra central da visão ativa. | Há teste garantindo que um processo agendado não entre na fila de setor, mas não encontrei teste de lista que assegure que `status: andamento` permaneça na visão ativa nos casos aguardando liberação, atrasado e normal, nem que apenas `concluido` apareça como concluído. |
| **Baixa / risco de manutenção** | O mock de preview mantém uma implementação local das regras de workflow e status. | `preview/mockBackend.ts` recalcula etapas, tarefas, status e espera. Isso é útil para preview offline, mas constitui uma segunda implementação que pode divergir do backend real se não houver testes contratuais compartilhados ou cenários equivalentes. |

### Regras observadas na lista

- “Em andamento” (`ativos`) seleciona `status === 'andamento'`.
- “Concluídos” seleciona `status === 'concluido'`.
- “Cancelados” seleciona `status === 'cancelado'`.
- “Agendados” seleciona `analysis.waiting`; a espera não altera o campo `status`.
- “Minha fila” exige processo em andamento, não aguardando liberação e setor presente em `pendingSectors`.
- O filtro “Pendente com” é aplicado antes dos grupos e pode retirar um processo da tela se estiver selecionado um setor que não aparece em `pendingSectors`. A busca e o tipo também podem restringir resultados.
- A página não adiciona automaticamente à lista o recurso aberto por link direto: o detalhe e a coleção são consultas distintas.

Logo, sob os dados e filtros padrão, um processo com `status: andamento` não deveria desaparecer da visão “Em andamento” apenas porque está aguardando a 2ª visita. A resposta observada (`count: 0`, `results: []`) confirma que, nesta captura, o frontend não recebeu o processo. Se o detalhe ainda retorna esse registro sob a mesma sessão e organização, a causa imediata está na API de coleção/backend, não no filtro de status do frontend nem na separação visual entre “Em andamento” e “Agendados”.

## Contrato de API e documentação

O documento e o OpenAPI definem estados, paginação, filtros, recursos, transições e responsabilidades do servidor com bom nível de detalhe. O frontend usa os campos `status`, `analysis.waiting`, `analysis.late` e `analysis.pendingSectors` conforme essa distinção. O contrato também registra que processos em espera não entram na fila nem nos atrasados; isso não significa que deixam de ser processos em andamento.

O ponto fraco não é a falta de um campo de status na API. É a ausência de uma camada explícita no frontend que:

- valide e normalize respostas antes de expô-las aos componentes;
- diferencie recurso recebido, modelo de domínio e modelo de lista/apresentação;
- defina e teste as regras de classificação para que filtro, agrupamento, badges e contagens usem a mesma interpretação;
- faça a listagem crescer sem exigir o carregamento de todos os registros no navegador.

Os exemplos de status e análise em `ENDPOINTS.md` devem permanecer sincronizados com `openapi.yml` e com testes de contrato. A especificação já diferencia listagem paginada e indicadores, mas a tela atualmente baixa todas as páginas para depois realizar a filtragem local; essa decisão deve ser explícita e revista conforme volume e necessidades da tela.

## Recomendação de reorganização

Recomendo **refatoração incremental**, não reescrita ampla nem alteração imediata do contrato do backend:

1. **Localizar a divergência na API.** Confirmar que o detalhe retorna `200` para a mesma sessão/cookie, organização ativa e membership usados na listagem; registrar `organizationId`, ID do processo, versão e request ID sem incluir dados financeiros. Repetir `GET /processes/` sem parâmetros e comparar o tenant efetivo e a queryset da coleção com a rota de detalhe. Como a resposta observada tem `count: 0` e `next: null`, investigar primeiro escopo de tenant/membership, filtros implícitos e exclusão lógica/status no backend. Corrigir a API para incluir o processo elegível e cobrir com teste de regressão; não contornar no frontend adicionando o registro do detalhe à lista, pois isso mascararia o contrato inconsistente.
2. **Fixar a semântica por testes antes de mover código.** Cobrir a visão ativa para os três casos (`andamento` normal, atrasado e aguardando), a visão de concluídos por `status`, a fila por setor e os filtros secundários. Incluir teste para ausência do ID na lista e divergência de versão/resposta entre detalhe e listagem.
3. **Centralizar a classificação da lista.** Criar uma função pura tipada que produza uma classificação única a partir de `status` e `analysis`, usada por grupos, badges e contagens. Tratar combinações impossíveis/inconsistentes explicitamente, com diagnóstico, em vez de descartá-las silenciosamente ou permitir duplicação.
4. **Introduzir fronteira de dados.** Separar DTOs de entrada/saída dos modelos internos e mapear respostas para uma forma adequada à UI. Validar os invariantes de campos obrigatórios e estados, mantendo opcionais legítimos por permissão. Erros de contrato devem ficar visíveis como erro de dados, não virar uma lista vazia ou sucesso aparente.
5. **Adotar consultas paginadas e filtradas conforme a tela.** Usar os filtros do servidor quando aplicáveis, manter chaves de cache que incluam filtros/página e decidir claramente quais telas precisam de paginação. Preservar contagens agregadas no endpoint de indicadores, evitando contagens locais de uma página como se fossem totais.
6. **Manter o contrato estável durante a migração.** Não renomear de uma vez os campos em português/abreviados da API nem modificar o estado persistido para resolver uma classificação de UI. Normalizar nomes internamente primeiro; só propor evolução de API quando houver necessidade comprovada e migração coordenada com backend.
7. **Reduzir divergência do preview.** Garantir cenários equivalentes entre mock e contrato real, especialmente conclusão, espera e reabertura. O mock não deve ser tratado como autoridade para regras de produção.

## Conclusão final

Há questões organizacionais reais para corrigir: acoplamento ao formato da API, ausência de validação em runtime, filtragem após buscar todas as páginas e regras de apresentação distribuídas com cobertura insuficiente. Além disso, a UI deve distinguir visualmente o estado de ciclo de vida (`andamento`, `concluido`, `cancelado`) da condição operacional (`aguardando liberação`, `atrasado`, `pendência por setor`), sem sugerir que “Agendados” é um status terminal ou mutuamente exclusivo de “Em andamento”. Isso justifica organizar a área por fronteiras e invariantes, mas **não prova que a causa seja uma “arquitetura herdada” nem permite atribuir culpa à ferramenta ou à autoria anterior**.

Quanto ao bug relatado, o dado novo fecha uma parte importante do diagnóstico: `GET /processes/` respondeu com zero registros, então a listagem da UI está vazia porque a fonte da coleção enviou uma lista vazia. Se `GET /processes/{id}/` ainda responde com esse processo para o mesmo contexto de usuário e organização, está confirmado um defeito de consistência no backend entre detalhe e coleção. A causa específica precisa ser localizada comparando o tenant/organização efetivo e as regras de consulta dessas rotas. Não se deve alterar o status nem inserir o detalhe manualmente na lista como correção, pois isso esconderia a divergência de API.

## Referências no repositório

- Contrato de Processos: [ENDPOINTS.md](./ENDPOINTS.md), seção 17, especialmente 17.3–17.5.
- Especificação OpenAPI: [openapi.yml](./openapi.yml), rotas e schemas `ProcessResponse`, `Analysis` e `PaginatedProcessResponseList`.
- Tipos compartilhados atualmente: [src/types/processes.ts](./src/types/processes.ts).
- Serviço e paginação: [src/services/processService.ts](./src/services/processService.ts).
- Consulta/cache da página: [src/pages/processes/ProcessesPage.tsx](./src/pages/processes/ProcessesPage.tsx).
- Filtro de visão: [src/utils/processFilters.ts](./src/utils/processFilters.ts).
- Grupos e contagens: [src/components/processes/ProcessList.tsx](./src/components/processes/ProcessList.tsx).
- Apresentação do item: [src/components/processes/ProcessSummaryRow.tsx](./src/components/processes/ProcessSummaryRow.tsx).
- Resumo inicial: [src/components/processes/ProcessOverview.tsx](./src/components/processes/ProcessOverview.tsx).
- Testes de integração existentes: [src/pages/processes/ProcessesPage.test.tsx](./src/pages/processes/ProcessesPage.test.tsx).
- Regras simuladas para preview: [src/preview/mockBackend.ts](./src/preview/mockBackend.ts).
