# Ideias Visuais para Visualizacao em Lista

Contexto: a visualizacao em planilha ja deve seguir a Opcao 3. Este documento reune alternativas para o outro formato de exibicao de dados: a visualizacao em lista.

A lista deve manter o mesmo padrao visual em todos os cenarios:

- Listar rotinas de uma empresa especifica.
- Listar empresas de uma rotina especifica.
- Listar tarefas avulsas sem rotina e/ou empresa.
- Listar todas as rotinas em um estado especifico.
- Listar tarefas por responsavel, departamento, prazo, periodo ou busca textual.

O conteudo muda conforme o filtro, mas o componente visual deve parecer o mesmo. A diferenca fica na ordem das informacoes principais e secundarias de cada item.

## Principios comuns

- Cada linha representa uma tarefa, rotina aplicada, empresa vinculada ou item operacional.
- O estado deve ser o principal marcador visual: pendente, em andamento, erro e concluido.
- A lista precisa ser rapida de escanear, como uma fila operacional.
- O clique principal abre o detalhe do item.
- Acoes rapidas podem existir na direita: alterar status, anexar, comentar, avisar ou atribuir responsavel.
- Filtros e ordenacao devem ficar acima da lista, nao dentro dos itens.
- Itens sem empresa ou sem rotina devem aparecer normalmente, com o campo ausente marcado como "Sem empresa" ou "Sem rotina".

## Opcao 1 - Lista Operacional Compacta

Uma lista densa, parecida com uma caixa de entrada de trabalho. Boa para usuarios que precisam revisar muitos itens rapidamente.

Estrutura visual:

```text
| status | titulo principal                  | contexto secundario          | prazo       | responsavel | acoes |
| erro   | Gerar DAS                         | Aurora Comercio - Fiscal     | 20/06       | Ana Souza   | ...   |
| pend.  | Envio do eSocial                  | Cais Tecnologia - Pessoal    | 29/06       | Bruno Lima  | ...   |
```

Comportamento por caso:

- Rotinas de uma empresa: titulo = rotina; contexto = departamento e periodo.
- Empresas de uma rotina: titulo = empresa; contexto = rotina, departamento e periodo.
- Tarefas avulsas: titulo = nome da tarefa; contexto = "Sem rotina", "Sem empresa" ou responsavel.
- Estado especifico: titulo = rotina ou empresa; contexto = motivo, departamento e prazo.

Forca:

- Melhor opcao para produtividade.
- Usa pouco espaco vertical.
- Funciona bem com 30, 100 ou mais registros.

Risco:

- Pode parecer simples demais se o sistema precisar passar uma sensacao mais moderna.

## Opcao 2 - Lista com Cartoes Horizontais

Cada item vira um cartao horizontal discreto, com mais respiro que uma tabela, mas ainda facil de comparar.

Estrutura visual:

```text
[barra de status]  Gerar DAS                         Pendente
                   Aurora Comercio Ltda. - Fiscal    Prazo: 20/06
                   Ana Souza                          anexos 2  comentarios 1
```

Comportamento por caso:

- O topo do cartao mostra sempre o item mais importante do contexto atual.
- A linha secundaria mostra o relacionamento: empresa, rotina, departamento ou periodo.
- A base mostra indicadores pequenos: anexos, comentarios e responsavel.

Forca:

- Equilibra legibilidade e densidade.
- Funciona bem em desktop e mobile.
- Combina com uma interface operacional mais amigavel.

Risco:

- Em listas muito grandes, mostra menos itens por tela que a opcao compacta.

## Opcao 3 - Lista Agrupada por Secoes

Os itens aparecem dentro de grupos recolhiveis. Para simplificar e padronizar, o agrupamento deve ser sempre por status. O filtro muda quais itens entram na lista, mas nao muda a estrutura visual.

Estrutura visual:

```text
Requer atencao (4)
  [erro] Fechamento da folha - Dalia Servicos Medicos - Bruno Lima - 28/06
  [erro] Revisao patrimonial - Cais Tecnologia - Sem responsavel - 30/06

Pendentes (12)
  [pendente] Gerar DAS - Bento Arquitetura - Ana Souza - 24/06
  [pendente] EFD-Reinf - Aurora Comercio - Ana Souza - 25/06
```

Comportamento por caso:

- Rotinas de uma empresa: agrupar por status e ordenar pelo codigo da empresa.
- Empresas de uma rotina: agrupar por status e ordenar pelo codigo da empresa.
- Tarefas avulsas: agrupar por status; itens sem empresa podem ficar no final.
- Estado especifico: renderizar apenas a secao daquele status, mantendo o mesmo componente.

Forca:

- Boa para gestao e acompanhamento.
- Mantem a prioridade visivel.
- Reaproveita a logica ja descrita na tela operacional: requer atencao, em espera, pendentes e concluidas.

Risco:

- Se houver muitos grupos, a tela pode exigir muitos cliques de expandir/recolher.

## Opcao 4 - Lista Timeline por Prazo

Lista orientada por data. Os itens sao separados em atraso, hoje, proximos dias e sem prazo.

Estrutura visual:

```text
Atrasadas
  [erro] Enviar DAS - Aurora Comercio - venceu em 18/06

Hoje
  [andamento] Gerar DAS - Bento Arquitetura - Bruno Lima

Proximos 7 dias
  [pendente] EFD-Reinf - Aurora Comercio - Ana Souza - 25/06

Sem prazo
  [pendente] Tarefa avulsa - Sem empresa - Sem rotina
```

Comportamento por caso:

- Rotinas de uma empresa: mostra o calendario operacional daquela empresa.
- Empresas de uma rotina: mostra quais empresas estao mais urgentes para aquela rotina.
- Tarefas avulsas: destaca o que precisa entrar na fila.
- Estado especifico: ordena o estado escolhido por urgencia.

Forca:

- Excelente para execucao diaria.
- Deixa atrasos e proximos vencimentos muito claros.
- Ajuda a equipe a decidir o que fazer primeiro.

Risco:

- Menos ideal quando o objetivo principal for comparar empresas ou rotinas entre si.

## Opcao 5 - Lista Mestre-Detalhe

A tela fica dividida em duas areas: lista na esquerda e detalhe do item selecionado na direita. Em mobile, o detalhe abre como tela/modal.

Estrutura visual:

```text
Lista                                      Detalhe
--------------------------------------     -------------------------------
[erro] Enviar DAS - Aurora Comercio        Cliente: Aurora Comercio Ltda.
[pendente] EFD-Reinf - Aurora Comercio     Rotina: Enviar DAS
[andamento] Gerar DAS - Bento              Prazo: 18/06
                                           Responsavel: Bruno Lima
                                           Comentarios, anexos e historico
```

Comportamento por caso:

- A lista sempre mostra os campos essenciais.
- O detalhe muda conforme o item, exibindo descricao, observacoes, comentarios, arquivos e historico.
- Acoes de status e atribuicao ficam no painel de detalhe.

Forca:

- Otima para trabalho continuo sem abrir e fechar modal toda hora.
- Boa para lideres e gestores que precisam revisar muitos itens.
- Reduz navegacao.

Risco:

- Exige mais largura de tela.
- Pode ficar pesada para a primeira versao se o foco for simplicidade.

## Opcao 6 - Lista com Bloco de Prioridade

Antes da lista completa, a tela mostra um bloco curto com os itens mais importantes. Abaixo, vem a lista normal.

Estrutura visual:

```text
Prioridade
[erro] Enviar DAS - Aurora Comercio - vencida
[erro] Folha - Dalia Servicos Medicos - divergencia
[sem responsavel] EFD-Reinf - Bento Arquitetura

Todos os itens
| status | item | contexto | prazo | responsavel |
```

Comportamento por caso:

- O bloco de prioridade pode destacar erros, atrasos e itens sem responsavel.
- A lista completa continua exibindo todos os registros do filtro atual.
- Em uma consulta de estado especifico, o bloco pode destacar os itens mais antigos ou mais proximos do prazo.

Forca:

- Boa para dashboard operacional.
- Ajuda o usuario a agir antes de apenas navegar.
- Mantem os casos criticos sempre no topo.

Risco:

- Pode duplicar itens visualmente, ja que um item prioritario tambem aparece na lista completa.

## Opcao 7 - Lista em Linhas com Colunas Flexiveis

Visualmente parece uma tabela leve, mas com comportamento de lista. Cada linha tem colunas que podem mudar de enfase conforme o contexto.

Estrutura visual:

```text
Item                  Empresa/Rotina        Departamento    Status       Prazo     Resp.
Gerar DAS             Aurora Comercio       Fiscal          Pendente     20/06     Ana
Aurora Comercio       Gerar DAS             Fiscal          Concluido    18/06     Ana
Tarefa avulsa         Sem rotina            Contabil        Em andamento 27/06     Carla
```

Comportamento por caso:

- Rotinas de uma empresa: primeira coluna = rotina.
- Empresas de uma rotina: primeira coluna = empresa.
- Tarefas avulsas: primeira coluna = tarefa.
- Estado especifico: primeira coluna = item mais relevante do filtro escolhido.

Forca:

- Boa ponte entre planilha e lista.
- Mantem comparacao objetiva sem usar a grade matriz.
- Facil de ordenar por qualquer coluna.

Risco:

- Pode ficar parecida demais com a visualizacao em planilha, perdendo identidade propria.

## Opcao Recomendada

Recomendacao principal: Opcao 3 - Lista Agrupada por Secoes.

Motivo: ela conversa diretamente com o fluxo operacional ja definido no documento base: requer atencao, em espera, pendentes e concluidas. Tambem suporta bem os varios cenarios sem mudar a aparencia geral da tela.

Recomendacao alternativa: Opcao 2 - Lista com Cartoes Horizontais.

Motivo: se a prioridade for uma interface mais confortavel e moderna, ela e a melhor escolha. Continua consistente, funciona bem no mobile e nao parece uma segunda planilha.

## Comparacao Rapida

| Opcao                    | Melhor para           | Densidade | Clareza gerencial | Mobile | Risco principal      |
| ------------------------ | --------------------- | --------- | ----------------- | ------ | -------------------- |
| 1 - Operacional compacta | Alto volume de itens  | Alta      | Media             | Media  | Simples demais       |
| 2 - Cartoes horizontais  | Uso geral             | Media     | Alta              | Alta   | Menos itens por tela |
| 3 - Agrupada por secoes  | Prioridade e gestao   | Media     | Alta              | Alta   | Grupos demais        |
| 4 - Timeline por prazo   | Execucao diaria       | Media     | Media             | Alta   | Menos comparativa    |
| 5 - Mestre-detalhe       | Revisao continua      | Alta      | Alta              | Media  | Exige largura        |
| 6 - Bloco de prioridade  | Dashboard operacional | Media     | Alta              | Alta   | Duplicacao visual    |
| 7 - Colunas flexiveis    | Transicao da planilha | Alta      | Media             | Media  | Parecida com tabela  |

## Campos Minimos do Item de Lista

Para qualquer opcao escolhida, o item precisa conseguir exibir:

- Titulo principal: rotina, empresa ou tarefa.
- Contexto: empresa, rotina, departamento ou periodo.
- Status.
- Prazo.
- Responsavel.
- Indicadores: anexos e comentarios.
- Observacao curta, quando existir.
- Acao principal: abrir detalhe.
- Acoes secundarias: alterar status, anexar, comentar, avisar e atribuir.

## Plano de Componentes para a Lista

A visualizacao escolhida deve combinar:

- Opcao 3: agrupamento por secoes.
- Opcao 2: itens como cartoes horizontais.
- Agrupamento sempre por status, para simplificar e padronizar.
- Ordenacao interna sempre pelo codigo da empresa, quando houver empresa vinculada.

O objetivo tecnico e criar uma lista unica e reutilizavel, mudando apenas uma configuracao de contexto para decidir quais informacoes aparecem com maior destaque.

Observacao de implementacao: as opcoes comparadas na tela nao devem variar apenas o desenho do card. Cada opcao deve representar um modelo de pagina inteira, mudando cabecalho, resumo, fundo, secoes, densidade e ritmo visual.

Modelos atuais para comparacao:

- Opcao 1 - Fila compacta: pagina densa, fundo neutro, secoes enxutas e linhas com alta capacidade de leitura.
- Opcao 2 - Painel de acompanhamento: pagina mais aberta, com resumo em destaque, fundo claro azulado e secoes com mais respiro.
- Opcao 3 - Registro operacional: pagina com aparencia de controle/protocolo, cabecalho claro e secoes mais retas, lembrando um registro administrativo.

Regras de acoes rapidas:

- Toda opcao deve ter acao de anexo direto no item, porque e uma acao frequente e curta.
- Acoes de observacao/comentario so entram quando houver espaco para nao prejudicar a leitura.
- A abertura do detalhe continua existindo para execucao completa: status, prazo, responsavel e observacao longa.

### Estrutura geral

```text
RoutineListView
  RoutineListToolbar opcional
  RoutineListSection status="error"
    RoutineListCard
    RoutineListCard
  RoutineListSection status="in_progress"
    RoutineListCard
  RoutineListSection status="pending"
    RoutineListCard
  RoutineListSection status="completed"
    RoutineListCard
  RoutineListEmptyState
```

### Componentes propostos

#### 1. RoutineListView

Componente principal da visualizacao em lista.

Responsabilidades:

- Receber `tasks`, `clients`, `routines`, `employees` e, se necessario, `departments`.
- Receber um `viewMode` indicando o tipo de listagem.
- Enriquecer cada task com seus relacionamentos.
- Ordenar por codigo da empresa.
- Agrupar por status.
- Renderizar as secoes na ordem padrao.

Props sugeridas:

```jsx
<RoutineListView
  title="Rotinas da empresa"
  description="Aurora Comercio Ltda. - Junho/2026"
  viewMode="clientRoutines"
  tasks={tasks}
  clients={clients}
  routines={routines}
  employees={employees}
  departments={departments}
  onTaskOpen={setSelectedTask}
  onStatusChange={handleStatusChange}
/>
```

Modos previstos:

```js
const ROUTINE_LIST_VIEW_MODE = {
  CLIENT_ROUTINES: 'clientRoutines',
  ROUTINE_CLIENTS: 'routineClients',
  UNLINKED_TASKS: 'unlinkedTasks',
  STATUS_TASKS: 'statusTasks',
  GENERAL_TASKS: 'generalTasks',
}
```

#### 2. RoutineListSection

Representa uma secao de status.

Responsabilidades:

- Mostrar nome do status e quantidade de itens.
- Usar a cor do status ja definida em `routineStatusConfig`.
- Permitir expandir/recolher futuramente, mas pode iniciar sempre aberta.
- Nao conhecer regras de cliente, rotina ou responsavel; recebe apenas `items` prontos.

Props sugeridas:

```jsx
<RoutineListSection
  status="pending"
  items={pendingItems}
  defaultOpen
  renderItem={(item) => <RoutineListCard item={item} onOpen={onTaskOpen} />}
/>
```

Ordem padrao das secoes:

```js
const routineListStatusOrder = ['error', 'in_progress', 'pending', 'completed']
```

Essa ordem coloca problema e andamento antes do pendente, mantendo concluido por ultimo.

#### 3. RoutineListCard

Cartao horizontal reutilizavel para todos os tipos de lista.

Responsabilidades:

- Exibir barra lateral ou ponto de status.
- Exibir titulo principal.
- Exibir subtitulo/contexto.
- Exibir metadados: prazo, responsavel, departamento, periodo.
- Exibir indicadores: anexos e comentarios.
- Exibir acoes rapidas.
- Chamar `onOpen(task)` no clique principal.

O componente nao deve decidir sozinho se o titulo e cliente ou rotina. Ele recebe um objeto ja formatado:

```js
{
  task,
  status,
  title,
  subtitle,
  code,
  meta: [
    { label: 'Prazo', value: '20/06' },
    { label: 'Responsavel', value: 'Ana Souza' },
    { label: 'Departamento', value: 'Fiscal' },
  ],
  indicators: {
    attachments: 2,
    comments: 1,
  },
}
```

Wireframe do cartao:

```text
[cor]  001  Aurora Comercio Ltda.                 Pendente
       Gerar DAS - Fiscal                         Prazo 20/06
       Ana Souza                                  anexos 2  comentarios 1
```

#### 4. RoutineListCardContent

Subcomponente opcional para separar a parte textual do cartao.

Responsabilidades:

- Renderizar `code`, `title`, `subtitle` e `meta`.
- Tratar textos longos com `truncate` ou `line-clamp`.
- Manter responsividade do cartao.

Esse componente ajuda a manter `RoutineListCard` pequeno e legivel.

#### 5. RoutineListQuickActions

Componente pequeno para indicadores.

Responsabilidades:

- Renderizar acoes rapidas proporcionais ao tamanho do layout.
- Usar icone para anexo, presente em todas as opcoes.
- Manter observacao como campo editavel direto quando ela aparecer no card.

Props sugeridas:

```jsx
<RoutineListQuickActions item={item} actions={['attach']} />
```

#### 6. RoutineStatusBadge

Hoje existe `RoutineStatusSelect` e o `routineStatusConfig`. Para a lista, faz sentido criar um badge apenas visual.

Responsabilidades:

- Mostrar label e cor do status.
- Reutilizar `routineStatusConfig`.
- Evitar repetir classes de status dentro dos cartoes.

Props sugeridas:

```jsx
<RoutineStatusBadge status={task.status} />
```

#### 7. RoutineListActions

Componente para acoes rapidas do item.

Responsabilidades:

- Abrir detalhe.
- Alterar status, se essa acao for permitida na lista.
- Anexar, comentar ou avisar futuramente.

No primeiro momento, pode ser simples:

```jsx
<RoutineListActions
  task={task}
  onOpen={onTaskOpen}
  onStatusChange={onStatusChange}
/>
```

Se o projeto quiser evitar acoes demais no cartao, o status pode ser alterado apenas no detalhe, mantendo na lista somente o botao de abrir.

#### 8. RoutineListEmptyState

Estado vazio padronizado.

Responsabilidades:

- Mostrar uma mensagem curta quando nenhuma task existir no filtro atual.
- Receber uma mensagem por contexto, se necessario.

Exemplos:

- "Nenhuma rotina encontrada para esta empresa."
- "Nenhuma empresa encontrada para esta rotina."
- "Nenhuma tarefa avulsa encontrada."
- "Nenhuma rotina neste estado."

### Camada de preparacao dos dados

Para maximizar reaproveitamento, as regras de exibicao nao devem ficar espalhadas dentro dos componentes visuais. O ideal e criar uma funcao utilitaria ou hook para transformar os dados crus em itens de lista.

Arquivo sugerido:

```text
src/utils/routineList.js
```

Funcoes sugeridas:

```js
export function buildRoutineListItems({
  tasks,
  clients,
  routines,
  employees,
  departments,
  viewMode,
}) {}

export function groupRoutineListItemsByStatus(items) {}

export function sortRoutineListItems(items) {}
```

Formato enriquecido sugerido:

```js
{
  id: task.id,
  task,
  client,
  routine,
  employee,
  department,
  status: task.status,
  companyCode: client?.code ?? '',
  title: 'Gerar DAS',
  subtitle: 'Aurora Comercio Ltda. - Fiscal',
  codeLabel: '001',
  meta: [],
  indicators: task.indicators,
}
```

### Regras de titulo por tipo de listagem

O visual do cartao permanece igual; o que muda e a preparacao do conteudo.

#### Lista de rotinas de uma empresa

Quando o filtro principal e uma empresa especifica:

- Titulo principal: nome da rotina.
- Codigo: codigo da empresa.
- Subtitulo: nome da empresa, departamento e periodo.
- Metadados: prazo, responsavel, indicadores.

Exemplo:

```text
001  Gerar DAS
     Aurora Comercio Ltda. - Fiscal - 2026-06
     Prazo 20/06 - Ana Souza - anexos 2 - comentarios 1
```

#### Lista de empresas de uma rotina

Quando o filtro principal e uma rotina especifica:

- Titulo principal: nome da empresa.
- Codigo: codigo da empresa.
- Subtitulo: nome da rotina, departamento e periodo.
- Metadados: prazo, responsavel, indicadores.

Exemplo:

```text
001  Aurora Comercio Ltda.
     Gerar DAS - Fiscal - 2026-06
     Prazo 20/06 - Ana Souza - anexos 2 - comentarios 1
```

#### Lista de tarefas avulsas

Quando a tarefa nao tem rotina e/ou empresa:

- Titulo principal: nome ou descricao curta da tarefa.
- Codigo: codigo da empresa, se existir.
- Subtitulo: empresa e rotina, usando "Sem empresa" ou "Sem rotina" quando faltar.
- Metadados: departamento, prazo, responsavel, indicadores.

Exemplo:

```text
--   Conferir documento pendente
     Sem empresa - Sem rotina - Contabil
     Prazo 27/06 - Carla Melo - comentarios 2
```

#### Lista de todas as rotinas em um estado especifico

Quando o filtro principal e status:

- Titulo principal: nome da empresa.
- Subtitulo: nome da rotina, departamento e periodo.
- Codigo: codigo da empresa.
- Metadados: prazo, responsavel, indicadores.

Mesmo filtrando por um unico status, o componente pode continuar agrupando por status. Nesse caso, a lista renderiza apenas uma secao, mantendo padrao visual e simplificando o codigo.

Exemplo:

```text
002  Bento Arquitetura
     EFD-Reinf - Fiscal - 2026-06
     Prazo 26/06 - Sem responsavel
```

#### Lista geral ou outros filtros

Quando nao houver um contexto principal forte:

- Titulo principal: nome da empresa.
- Subtitulo: nome da rotina, departamento e periodo.
- Codigo: codigo da empresa.
- Metadados: prazo, responsavel, indicadores.

Essa regra tambem serve para filtros por responsavel, departamento, prazo e pesquisa.

### Ordenacao

A ordenacao deve ser aplicada dentro de cada grupo de status.

Ordem sugerida:

1. Codigo da empresa, em ordem crescente.
2. Nome da empresa, se o codigo nao existir.
3. Nome da rotina.
4. Prazo.
5. Nome do responsavel.

Para evitar problemas com codigos numericos como `001`, a comparacao deve usar `localeCompare` com `numeric: true`.

Exemplo:

```js
companyCodeA.localeCompare(companyCodeB, 'pt-BR', { numeric: true })
```

Itens sem empresa podem ir para o final ou inicio. Recomendacao: final, porque a lista principal tende a ser orientada por empresa.

### Agrupamento por status

O agrupamento deve usar sempre `task.status`.

Mesmo em uma listagem filtrada por status, manter a mesma estrutura:

```text
Erro (8)
  cartao
  cartao
```

Isso evita criar um layout especial para cada caso e facilita trocar filtros sem quebrar o comportamento visual.

### Reaproveitamento com os componentes existentes

Componentes e constantes atuais que devem ser reaproveitados:

- `routineStatusConfig`: fonte unica para label e cor dos status.
- `RoutineStatusSelect`: pode continuar no detalhe ou entrar em uma acao expandida.
- `RoutineCardActions`: deve continuar como bloco de detalhe, nao precisa ser embutido inteiro no cartao de lista.
- Modal/detalhe atual do `App.jsx`: a lista pode chamar o mesmo `setSelectedTask` usado pela planilha.

### Organizacao de pastas para o controle de rotina

Para evitar que uma pasta generica como `routines` misture componentes da planilha, da lista e do detalhe, a organizacao deve ser por area da experiencia:

```text
src/components/routine-control/
  spreadsheet/
    RoutineControlTable.jsx
    RoutineClosedCard.jsx
    RoutineClosedCardCompact.jsx
    RoutineClosedCardCell.jsx
    RoutineNotApplicableCard.jsx
  list/
    RoutineListView.jsx
    RoutineListSection.jsx
    RoutineListCard.jsx
    RoutineListQuickActions.jsx
    RoutineListActions.jsx
    RoutineStatusBadge.jsx
    RoutineListEmptyState.jsx
  details/
    RoutineDetailsCard.jsx
    RoutineDetailsCardCompact.jsx
    RoutineDetailsCardPanel.jsx
  shared/
    RoutineCardActions.jsx
    RoutineEditableFields.jsx
    RoutineStatusSelect.jsx
```

Regra de organizacao:

- `spreadsheet/`: componentes exclusivos da visualizacao em planilha/matriz.
- `list/`: componentes exclusivos da visualizacao em lista.
- `details/`: componentes de detalhe/modal/painel aberto.
- `shared/`: componentes usados por mais de um formato de visualizacao.
- `constants/`: continua sendo a fonte unica para estados e configuracoes globais.
- `utils/`: recebe preparacao de dados, ordenacao e agrupamento que nao dependem de UI.

Com essa separacao, a lista pode crescer sem poluir os componentes da planilha, e qualquer componente que se torne reutilizavel pode ser promovido para `shared/`.

Utilitarios novos:

```text
src/utils/routineList.js
```

### Fluxo de implementacao recomendado

1. Criar `RoutineStatusBadge`, porque ele sera usado por secoes e cartoes.
2. Criar `RoutineListQuickActions`, isolando as acoes rapidas da task.
3. Criar `src/utils/routineList.js` com enriquecimento, ordenacao e agrupamento.
4. Criar `RoutineListCard` recebendo um item ja formatado.
5. Criar `RoutineListSection` recebendo status e itens.
6. Criar `RoutineListView` orquestrando tudo.
7. Integrar no `App.jsx` apenas como uma nova opcao de visualizacao ou tela de teste.

### Exemplo de uso final

```jsx
<RoutineListView
  title="Lista operacional"
  description="Agrupada por status e ordenada por codigo da empresa"
  viewMode="routineClients"
  tasks={visibleData.tasks}
  clients={visibleData.clients}
  routines={visibleData.routines}
  employees={visibleData.employees}
  onTaskOpen={setSelectedTask}
  onStatusChange={handleStatusChange}
/>
```

### Beneficio da abordagem

Com essa divisao, a lista tem apenas um layout visual. O que muda por caso de uso e somente o `viewMode`, que controla como os dados sao transformados em `title`, `subtitle`, `codeLabel` e `meta`.

Isso evita criar componentes separados como `ClientRoutineList`, `RoutineClientList`, `StatusRoutineList` e `UnlinkedTaskList`, mantendo o projeto mais facil de evoluir.
