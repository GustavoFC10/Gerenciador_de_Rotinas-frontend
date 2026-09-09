# Auditoria técnica — frontend v0.5

> Relatório incremental iniciado em 27/08/2026 e consolidado em 28/08/2026.
> Ele foi escrito durante a investigação para preservar os achados caso a
> análise fosse interrompida.

## Escopo e critérios

O produto foi avaliado como uma versão 0.5: a ausência intencional de anexos,
gráficos e funcionalidades já planejadas para a próxima versão não é tratada
como defeito. A auditoria procura fragilidades de implementação e manutenção:
arquitetura, consistência de padrões, segurança, acessibilidade, resiliência,
qualidade, testes, configuração e desempenho.

## Resultado executivo

Foram confirmados **22 achados**: 6 de severidade alta, 15 de severidade média
(incluindo condicionais à infraestrutura/escala) e 1 de severidade baixa. O
produto tem uma base tecnológica consistente — typecheck, lint, testes e build
passam localmente —, mas há fragilidades reais nos fluxos de cache, no primeiro
carregamento, no comportamento modal, na configuração de deploy e na esteira de
qualidade.

Prioridade recomendada antes de uma entrega mais ampla:

1. Restaurar a confiabilidade de entrega e inicialização: A-002, A-016 e A-001.
2. Corrigir os fluxos que levam a erro ou estado enganoso: A-005, A-013 e A-017.
3. Fechar acessibilidade básica de diálogos e contraste: A-006, A-015 e A-021.
4. Preparar escala e evolução: A-008, A-014, A-018 e A-019.
5. Validar hardening do ambiente real e reduzir dívida operacional: A-003,
   A-020 e A-022.

Anexos, gráficos/dashboards e outras funcionalidades já mapeadas para a próxima
versão foram conscientemente excluídos da lista de defeitos.

## Andamento

- Mapeamento do repositório e da stack: concluído.
- Auditoria de código e componentes: concluída.
- Validações automatizadas: concluídas e registradas abaixo.

## Validações executadas

| Verificação                 | Resultado         | Observação                                                                                    |
| --------------------------- | ----------------- | --------------------------------------------------------------------------------------------- |
| `npm run typecheck`         | passou            | Sem erro de tipos na árvore atual.                                                            |
| `npm run lint`              | passou            | A configuração, porém, desabilita duas regras de Hooks — A-001.                               |
| `npm run test`              | passou            | 18 arquivos e 51 testes. A cobertura de fluxos segue insuficiente — A-012.                    |
| `npm run build`             | passou com alerta | Um chunk inicial de 669,89 kB minificado / 175,94 kB gzip — A-018.                            |
| `npm run format:check`      | falhou            | 73 arquivos fora do Prettier; também bloqueia a CI — A-002.                                   |
| `docker compose ... config` | passou            | Configurações de desenvolvimento e produção renderizaram sem erro.                            |
| `npm audit --omit=dev`      | passou            | Nenhuma vulnerabilidade de dependência de produção encontrada.                                |
| `npm audit`                 | atenção           | Duas vulnerabilidades altas transitivas apenas em ferramentas de desenvolvimento — A-022.     |
| Build da imagem Docker      | não executado     | O daemon Docker Desktop não estava ativo; isto não foi classificado como falha do Dockerfile. |

## Achados confirmados

### A-001 — A automação não protege completamente tipagem e regras de Hooks

- **Severidade:** média
- **Evidência:** [`.github/workflows/ci.yml`](.github/workflows/ci.yml) executa
  formatação, lint, testes e build, mas não executa `npm run typecheck`. O
  `vite build` transpila com esbuild e não substitui o compilador TypeScript
  como verificador completo de tipos. Além disso,
  [`eslint.config.ts:38-39`](eslint.config.ts:38) desabilita globalmente as
  regras `react-hooks/refs` e `react-hooks/set-state-in-effect`, sem limitar a
  exceção aos locais que a exigiriam.
- **Impacto:** uma regressão de tipagem ou de ciclo de renderização/efeito pode
  passar pela pipeline e só aparecer em revisão manual ou em tempo de execução,
  apesar de existir um script `typecheck` no [`package.json`](package.json).
- **Recomendação:** incluir `npm run typecheck` como etapa obrigatória da CI e
  reabilitar as regras de Hooks, suprimindo-as de modo local e justificado apenas
  quando necessário.

### A-002 — A pipeline está bloqueada por divergências de formatação

- **Severidade:** alta (operacional)
- **Evidência:** a execução local de `npm run format:check` falha em **73
  arquivos**. A mesma checagem é a primeira validação da CI em
  [`.github/workflows/ci.yml`](.github/workflows/ci.yml), antes de lint,
  testes e build.
- **Impacto:** todo push/PR nos ramos monitorados tende a receber uma CI
  vermelha antes de executar as validações de qualidade restantes. Isso reduz
  a confiança na esteira e incentiva a ignorar falhas legítimas.
- **Recomendação:** aplicar a formatação de modo deliberado em um commit
  mecânico isolado, incluir a checagem no fluxo de desenvolvimento e manter a
  etapa bloqueante na CI.

### A-003 — Links persistidos são normalizados em apenas uma das telas

- **Severidade:** média (segurança, em defesa em profundidade)
- **Evidência:** o menu de contexto filtra os links recebidos da API com
  `getSafeTaskLinks` em
  [`TaskContextMenu.tsx:61`](src/components/context-menu/TaskContextMenu.tsx:61)
  e aceita somente `http:`/`https:`. Já o painel principal usa
  `const links = task.links ?? []` em
  [`TaskLinksPanel.tsx:33`](src/components/routine-control/details/TaskLinksPanel.tsx:33)
  e expõe diretamente `href={link.url}` em
  [`TaskLinksPanel.tsx:152`](src/components/routine-control/details/TaskLinksPanel.tsx:152).
- **Impacto:** embora o formulário de inclusão valide URLs, dados legados,
  inseridos por outra interface ou retornados de uma API comprometida podem
  conter esquemas inesperados. React 19 bloqueia especificamente URLs
  `javascript:`, e os links já usam `noopener noreferrer`; ainda assim, a
  divergência permite apresentar/navegar para protocolos não previstos e deixa
  a proteção dependente de um detalhe da biblioteca e de cada componente.
- **Recomendação:** centralizar a normalização no adaptador dos dados ou
  reutilizar `getSafeTaskLinks` no painel; o backend também deve rejeitar esses
  esquemas. Criar teste de regressão para o painel, equivalente ao teste já
  existente para o menu de contexto. No formulário, associar o erro de URL ao
  campo (`aria-invalid`/`aria-describedby`) e anunciá-lo em região de alerta.

### A-004 — A competência inicial está congelada em uma data de fixture

- **Severidade:** média (alta se isto já estiver em produção)
- **Evidência:** [`AppStateContext.tsx:15`](src/contexts/AppStateContext.tsx:15)
  inicia sempre com `useState('2026-06')`. A própria documentação marca isso
  como uma regra/fixture ainda a confirmar em
  [`ARQUITETURA_FRONTEND.md:284`](ARQUITETURA_FRONTEND.md:284).
- **Impacto:** cada nova sessão abre a operação em junho de 2026, em vez de uma
  competência definida pelo negócio (por exemplo, a vigente). Isso pode levar
  o usuário a consultar/alterar um período incorreto sem perceber; os botões da
  barra superior apenas permitem navegar a partir desse valor.
- **Recomendação:** decidir e codificar explicitamente a origem da competência
  inicial (data atual na timezone da organização, preferência persistida ou
  valor fornecido pela API) e adicionar teste para a regra escolhida.

### A-005 — A nova planilha pode falhar ao abrir imediatamente após a criação

- **Severidade:** alta (fluxo funcional interrompido)
- **Evidência:** ao criar uma tela,
  [`useScreenMutations.ts:26-32`](src/hooks/mutations/useScreenMutations.ts:26)
  insere somente a tela nos caches, sem invalidar/recarregar o agregado
  operacional nem criar sua `spreadsheetProjection`. Logo após o sucesso,
  [`CreateScreenPage.tsx:123-130`](src/pages/CreateScreenPage.tsx:123) oferece
  o CTA **Abrir planilha**. Porém, a rota exige ao mesmo tempo a tela e a
  projeção em [`App.tsx:721-792`](src/App.tsx:721); sem a projeção, exibe
  “Planilha não encontrada”.
- **Impacto:** um caminho normal recém-concluído pode levar o usuário a uma
  tela de erro até uma recarga/refetch incidental. O mesmo padrão deixa caches
  de outras competências parcialmente atualizados após edição de tela.
- **Recomendação:** após criar/alterar uma tela, invalidar ou atualizar de
  forma atômica todos os `routineControl` afetados. Alternativamente, a rota
  da planilha deve buscar a projeção ausente sob demanda e ter estado de
  carregamento. Cobrir criação + abertura imediata em teste de integração.

### A-006 — Drawers modais têm comportamentos de acessibilidade divergentes

- **Severidade:** alta (acessibilidade e consistência de interação)
- **Evidência:** `EmployeeProfilePanel` anuncia `role="dialog"` e
  `aria-modal="true"`, mas só trata `Escape`; não prende o foco nem torna o
  conteúdo de fundo inerte em
  [`EmployeesPage.tsx:298-317`](src/pages/EmployeesPage.tsx:298) e
  [`EmployeesPage.tsx:455-470`](src/pages/EmployeesPage.tsx:455). O modal de
  tarefa avulsa e o drawer de criação de predefinição são somente overlays
  visuais: não declaram semântica modal, foco inicial, `Escape` ou bloqueio da
  rolagem em
  [`LooseTaskFormModal.tsx:100-111`](src/components/routine-control/forms/LooseTaskFormModal.tsx:100)
  e [`RoutinePresetsPage.tsx:245-363`](src/pages/RoutinePresetsPage.tsx:245).
  Em contraste, outros drawers repetem implementações manuais de trap de foco
  e scroll lock, por exemplo em
  [`EntityEditModal.tsx:51-112`](src/components/entities/EntityEditModal.tsx:51)
  e [`ScreensPage.tsx:274-341`](src/pages/ScreensPage.tsx:274).
- **Impacto:** usuários de teclado/leitor de tela podem sair de um diálogo
  marcado como modal e interagir com conteúdo visualmente bloqueado; no outro
  drawer, não recebem sequer a semântica esperada. A experiência varia por
  tela e qualquer correção precisa ser replicada manualmente.
- **Recomendação:** extrair um primitivo único de `Modal/Drawer` (ou usar
  `<dialog>` com tratamento consistente) que implemente foco inicial, trap,
  retorno de foco, `Escape`, scroll lock, `inert` no fundo e testes de teclado.

### A-007 — Rota desconhecida para usuário autenticado renderiza página vazia

- **Severidade:** média
- **Evidência:** o bloco de rotas autenticadas em
  [`App.tsx:747-1009`](src/App.tsx:747) não possui rota filha `path="*"` nem
  componente de não-encontrado. A única wildcard de `App.tsx` está no fluxo de
  visitante (linhas 94-106). A reprodução com o `react-router` instalado,
  usando a mesma estrutura de layout e uma URL inexistente, resultou em markup
  vazio (`""`).
- **Impacto:** deep links antigos, URL digitada incorretamente ou uma rota
  removida deixam a pessoa autenticada sem conteúdo e sem caminho de
  recuperação.
- **Recomendação:** adicionar uma rota autenticada de fallback com página 404,
  link para início e, quando fizer sentido, preservar a URL original para
  diagnóstico.

### A-008 — O carregamento operacional faz fan-out por tela e bloqueia a SPA

- **Severidade:** média (pode se tornar alta conforme crescem telas e dados)
- **Evidência:** [`RoutineControlService.get`](src/services/routineControlService.ts:89)
  inicia seis coleções/recursos e, depois, busca o detalhe de **cada** tela
  ativa ([`120-130`](src/services/routineControlService.ts:120)) e a projeção
  de cada planilha ([`131-142`](src/services/routineControlService.ts:131)).
  As listagens ainda podem paginar em `listAll` (linhas 167-201). Todo esse
  agregado é pré-requisito do `AuthenticatedApp` antes das rotas serem
  renderizadas ([`App.tsx:680-719`](src/App.tsx:680)).
- **Impacto:** cada tela adicional aumenta chamadas e payload da inicialização;
  uma falha de uma única projeção torna a aplicação inteira indisponível. Em
  organizações maiores, há dois estágios de rede e a pessoa aguarda dados de
  telas que talvez nem abrirá.
- **Recomendação:** carregar um resumo mínimo para o shell e buscar detalhe /
  projeção por rota sob demanda; preferir endpoint agregador versionado quando
  a visão geral realmente exigir tudo. Medir requests, tempo e tamanho de
  payload com uma organização representativa antes da v1.

### A-009 — `App.tsx` concentra responsabilidades incompatíveis

- **Severidade:** média (manutenibilidade e risco de regressão)
- **Evidência:** [`App.tsx`](src/App.tsx) possui cerca de **1.098 linhas**, 47
  imports, 26 declarações de rota e orquestra autenticação, consultas, seis
  famílias de mutation, seleção contextual, validações, navegação, diálogo e
  tratamento de erro. As mesmas callbacks de tarefa são repassadas em várias
  rotas, por exemplo nas linhas 797-879 e 1029-1051. A arquitetura já reconhece
  esse acoplamento em [`ARQUITETURA_FRONTEND.md:281-287`](ARQUITETURA_FRONTEND.md:281).
- **Impacto:** mudanças pequenas em uma tela operacional reexecutam ou exigem
  entendimento do orquestrador global; aumenta a chance de cache, permissões e
  UI divergirem. O problema aparece também em componentes com 900+ linhas,
  como `ScreensPage`, `CreateCompanyPage` e `EntityEditModal`.
- **Recomendação:** extrair por domínio: `OperationalRoutes`, hook/controlador
  de detalhes de tarefa, adaptadores de rotas e handlers de mutation. Manter
  `App` limitado a providers, guarda de sessão e composição de alto nível;
  adicionar testes de integração aos fluxos extraídos.

### A-010 — Preferências do perfil são transitórias e incluem estado morto

- **Severidade:** baixa (experiência e manutenção)
- **Evidência:** o perfil permite alterar tema e densidade em
  [`ProfilePage.tsx:49-77`](src/pages/ProfilePage.tsx:49), mas
  [`AppStateContext.tsx:15-25`](src/contexts/AppStateContext.tsx:15) mantém as
  preferências somente em `useState`; após reload/logout elas voltam aos
  padrões. No mesmo tipo, `defaultView` é inicializada mas não é lida nem
  alterada em produção (ocorrências restritas a tipo, estado inicial e teste).
  Em contraste, a preferência de sidebar é persistida explicitamente em
  `localStorage` no layout.
- **Impacto:** a tela promete “Perfil e preferências”, mas escolhas visuais se
  perdem sem aviso. O campo não utilizado aumenta ambiguidade sobre a regra de
  navegação padrão.
- **Recomendação:** decidir se as preferências são locais ou por usuário;
  persistir somente dados não sensíveis com versionamento/fallback, ou remover
  a UI/campos que ainda não têm suporte. Documentar a decisão.

### A-011 — Falhas de carregamento relevantes não oferecem recuperação na UI

- **Severidade:** média
- **Evidência:** quando o agregado central falha, `App` mostra apenas
  `error.message` em [`App.tsx:680-718`](src/App.tsx:680); `useRoutineControl`
  não expõe `refetch`. `EmployeesPage` já possui `reloadMembers`, mas não o
  conecta ao seu `ErrorState`; `AgendaPage` também não expõe o `refetch` da
  query. O componente reutilizável
  [`ErrorState.tsx`](src/components/common/ErrorState.tsx) não aceita ação de
  retry, enquanto `ScreensPage` implementa uma tentativa manual isolada.
- **Impacto:** após esgotar as duas tentativas automáticas, a pessoa precisa
  recarregar o navegador ou encontrar outro caminho para repetir uma requisição
  temporariamente indisponível. Isso é especialmente ruim no primeiro acesso,
  que bloqueia todas as rotas autenticadas.
- **Recomendação:** padronizar `ErrorState` com ação opcional de tentar
  novamente, retornar `refetch` dos hooks e decidir uma política de mensagens
  seguras para erros da API. Evitar mostrar detalhes brutos do servidor onde
  eles não sejam apropriados ao usuário final.

### A-012 — A cobertura automatizada não protege os fluxos de maior risco

- **Severidade:** média
- **Evidência:** há 18 arquivos de teste para 155 arquivos TypeScript/TSX. Não
  há teste de `App`, nem de `ScreensPage`, `CreateScreenPage`,
  `CreateCompanyPage`, `EmployeesPage`, `EntityEditModal` ou das mutations de
  tarefa. Também não existe script/configuração de coverage ou limiar na CI.
  A própria arquitetura registra ausência de testes end-to-end e de cobertura
  ampla de páginas em [`ARQUITETURA_FRONTEND.md:249-259`](ARQUITETURA_FRONTEND.md:249).
- **Impacto:** regressões entre rota, cache, permissões e feedback visual —
  como a abertura imediata de uma planilha recém-criada — passam apesar dos
  testes unitários verdes.
- **Recomendação:** acrescentar testes de integração para os fluxos críticos
  e, antes da v1, uma pequena suíte E2E (login/membership, criar e abrir tela,
  edição concorrente, permissões, modal por teclado). Publicar coverage como
  sinal de acompanhamento, sem usar percentual isolado como objetivo.

### A-013 — A lista de responsáveis elegíveis pode permanecer obsoleta

- **Severidade:** média
- **Evidência:** o seletor de responsáveis guarda a query por departamento em
  [`App.tsx:380-394`](src/App.tsx:380). Ao alterar cargo, acesso departamental
  ou desligar um membro, `EmployeesPage` atualiza somente o cache de membros
  por meio de `replaceMember` (linhas 183-195); não invalida
  `queryKeys.taskAssignees`. A invalidação ampla de escopo só ocorre quando a
  própria pessoa logada é editada. A mesma API ainda é carregada por três
  estratégias incompatíveis: React Query em `App`, `fetch` local sem cache/
  `AbortSignal` em
  [`CreateRoutinePage.tsx:145-183`](src/pages/CreateRoutinePage.tsx:145) e
  outro `fetch` local equivalente em
  [`EntityEditModal.tsx:541-565`](src/components/entities/EntityEditModal.tsx:541).
- **Impacto:** por até o próximo refetch incidental, o modal de tarefa pode
  oferecer uma pessoa sem acesso/ativa ou não listar alguém recém-habilitado.
  Mesmo que o backend bloqueie a escrita, a interface induz uma ação inválida e
  parece estar inconsistente.
- **Recomendação:** extrair `useTaskAssignees(scope, departmentId, enabled)`
  com cache, cancelamento e feedback padronizados; centralizar as dependências
  de membership e invalidar `taskAssignees` dos departamentos afetados em toda
  mutation de membro. Testar mudança de acesso seguida da abertura do seletor
  de tarefa nas três telas consumidoras.

### A-014 — A planilha aceita uma matriz grande, mas a renderiza e consulta integralmente

- **Severidade:** alta para tenants grandes (desempenho e disponibilidade da UI)
- **Evidência:** a criação e edição permitem até 500 empresas e 200 rotinas
  ([`CreateScreenPage.tsx:327-372`](src/pages/CreateScreenPage.tsx:327) e
  [`ScreensPage.tsx:33-34`](src/pages/ScreensPage.tsx:33)). A
  [`RoutineControlTable.tsx:302-361`](src/components/routine-control/spreadsheet/RoutineControlTable.tsx:302)
  gera todas as linhas e células dessa matriz em um único DOM — até 100 mil
  células, sem virtualização. Antes disso, o cálculo de `tableTasks` percorre
  tarefas, células da projeção e tarefas de cada célula com buscas aninhadas
  ([`RoutineControlTable.tsx:176-183`](src/components/routine-control/spreadsheet/RoutineControlTable.tsx:176)),
  em vez de usar índices por ocorrência/célula.
- **Impacto:** uma tela dentro dos limites aceitos pode consumir muita memória,
  bloquear o thread principal e tornar a planilha impraticável em máquinas
  comuns. A busca aninhada aumenta o custo à medida que o histórico de tarefas
  cresce, mesmo antes da renderização.
- **Recomendação:** estabelecer um orçamento de desempenho para esse limite;
  carregar a projeção por viewport ou página, virtualizar linhas e colunas e
  construir `Map`s indexados por `occurrenceKey` e `companyId:routineId` antes
  de renderizar. Incluir um teste de desempenho com uma tela próxima ao limite.

### A-015 — Controles de transição de estado usam semântica de rádio sem estado selecionado

- **Severidade:** média (acessibilidade e clareza de interação)
- **Evidência:** `RoutineStatusControl` remove o estado atual da lista de
  transições e renderiza todos os `input type="radio"` com `checked={false}`
  ([`RoutineCardActions.tsx:330-337`](src/components/routine-control/shared/RoutineCardActions.tsx:330)
  e [`RoutineCardActions.tsx:411-417`](src/components/routine-control/shared/RoutineCardActions.tsx:411),
  com a mesma lógica nas variantes `rail` e `strip`). Assim, leitores de tela e
  navegação por teclado encontram um grupo de rádio no qual nenhuma alternativa
  está marcada, embora exista um estado atual exibido fora do grupo. O menu de
  contexto repete a ideia: filtra o estado atual e ainda anuncia as alternativas
  como `menuitemradio` ([`TaskContextMenu.tsx:65-67`](src/components/context-menu/TaskContextMenu.tsx:65)
  e [`TaskContextMenu.tsx:324-346`](src/components/context-menu/TaskContextMenu.tsx:324)).
- **Impacto:** a semântica anunciada não corresponde à ação disponível. Isso
  confunde pessoas que usam tecnologia assistiva e faz o estilo visual
  `peer-checked` nunca representar a seleção atual.
- **Recomendação:** se são ações de transição, usar botões/menuitems comuns com
  texto que deixe explícita a mudança; se são escolhas de estado, manter o
  estado atual dentro do grupo e controlá-lo por `checked={task.status ===
value}`. Cobrir as variantes com testes de semântica e teclado.

### A-016 — A configuração da API pode produzir um frontend que não inicializa

- **Severidade:** alta (disponibilidade e configuração de produção)
- **Evidência:** o singleton `httpClient` é criado durante a importação e exige
  `VITE_API_URL` válida
  ([`httpClient.ts:235-249`](src/services/httpClient.ts:235)). Essa cadeia é
  importada pelo `AuthProvider` no bootstrap, antes da primeira tela. A imagem
  de produção, porém, usa `http://localhost:3000` como valor padrão em
  [`Dockerfile:8-9`](Dockerfile:8) e
  [`docker-compose.prod.yml:6-7`](docker-compose.prod.yml:6); o `.dockerignore`
  exclui `.env`. Já o CI não injeta nem testa uma configuração de ambiente
  válida. A URL é materializada no bundle em build, sem alternativa de
  configuração em runtime.
- **Impacto:** uma implantação sem variável explícita envia o navegador da
  pessoa para o `localhost` dela, não para a API do produto; uma variável ausente
  ou malformada pode interromper o carregamento antes de o React montar. Se um
  endereço HTTP remoto for aceito em produção, a política de `credentials:
'include'` também fica dependente de transporte inseguro.
- **Recomendação:** remover o fallback de produção e falhar o build/deploy sem
  `VITE_API_URL` HTTPS válida (exceto origem local de desenvolvimento). Adicionar
  validação de configuração/smoke test na CI e decidir entre rebuild por ambiente
  documentado ou um mecanismo explícito de configuração em runtime.

### A-017 — Mensagens brutas do backend são exibidas diretamente na interface

- **Severidade:** alta (exposição de informação e experiência de erro)
- **Evidência:** `ApiError` usa `problem.detail` como `Error.message` em
  [`httpClient.ts:43-59`](src/services/httpClient.ts:43). Para resposta não JSON
  ou JSON inválido, o cliente ainda transforma o corpo inteiro em `detail`
  ([`httpClient.ts:338-369`](src/services/httpClient.ts:338)). Esse `message`
  chega diretamente ao login, à tela de erro global e a outros alertas, por
  exemplo em [`LoginPage.tsx:35-40`](src/pages/LoginPage.tsx:35) e
  [`App.tsx:698-704`](src/App.tsx:698).
- **Impacto:** detalhes internos, stack traces, mensagens de infraestrutura ou
  conteúdo inesperado retornado por um proxy podem ser mostrados a usuários
  finais. Além de vazar informação operacional, a mensagem deixa de ser uma
  orientação confiável para recuperar a ação.
- **Recomendação:** criar um mapeador de erro de apresentação: mensagens
  genéricas para rede/5xx e apenas mensagens 4xx previamente classificadas como
  seguras. Preservar `requestId` para suporte/logs, sem exibir corpos brutos na
  UI.

### A-018 — O primeiro carregamento entrega todas as páginas em um único chunk grande

- **Severidade:** média (desempenho de entrada)
- **Evidência:** o build passou, mas o Vite emitiu alerta para um único chunk de
  **669,89 kB minificado / 175,94 kB gzip**, acima do limite padrão de 500 kB.
  [`App.tsx:11-32`](src/App.tsx:11) importa estaticamente todas as páginas e
  [`vite.config.ts:5-7`](vite.config.ts:5) não define uma estratégia de divisão
  de chunks; a documentação também registra a ausência de lazy loading.
- **Impacto:** até uma pessoa que usa apenas uma rota simples baixa, interpreta
  e compila páginas administrativas e fluxos pesados. Em redes móveis ou
  dispositivos modestos isso aumenta o tempo até interação e torna regressões de
  bundle invisíveis sem orçamento automatizado.
- **Recomendação:** aplicar `React.lazy`/`Suspense` por rota, separar dependências
  quando a medição justificar e publicar um budget de tamanho/tempo na CI. Medir
  a rota inicial real antes e depois da mudança.

### A-019 — Fluxos compostos persistem estado parcial e exigem reparo manual

- **Severidade:** média (integridade do fluxo e escalabilidade operacional)
- **Evidência:** criar empresa, vínculos de rotina e inclusão opcional na tela é
  uma sequência serial de chamadas no cliente em
  [`useCompanyMutations.ts:45-116`](src/hooks/mutations/useCompanyMutations.ts:45).
  Em falha, o próprio código cria `CompanySetupError` e orienta reparo manual
  ([`119-144`](src/hooks/mutations/useCompanyMutations.ts:119) e
  [`CreateCompanyPage.tsx:968-1024`](src/pages/CreateCompanyPage.tsx:968)). A
  edição de acessos de colaborador aplica um departamento por vez em
  [`EmployeesPage.tsx:243-273`](src/pages/EmployeesPage.tsx:243) e também
  reconhece estado parcialmente aplicado em [`408-425`](src/pages/EmployeesPage.tsx:408)).
- **Impacto:** uma operação comum pode terminar com empresa criada, apenas parte
  dos vínculos e/ou composição visual gravada. O tempo cresce linearmente com o
  número de itens e uma falha ambígua de rede não oferece retry seguro nem
  retomada automática.
- **Recomendação:** preferir um comando transacional/bulk no backend, ou uma
  operação idempotente com job e estado de progresso consultável. Enquanto o
  contrato não existir, persistir o progresso, oferecer conciliação/retomada e
  limitar concorrência de forma explícita — em vez de depender apenas de uma
  instrução textual de reparo.

### A-020 — O hardening HTTP não está garantido pela configuração versionada

- **Severidade:** média, condicional à ausência de proxy/CDN que aplique as
  políticas
- **Evidência:** [`nginx.conf:1-17`](nginx.conf:1) e
  [`vercel.json:1-12`](vercel.json:1) configuram roteamento/cache, mas não
  declaram CSP, `X-Content-Type-Options`, `Referrer-Policy`, proteção contra
  framing (`frame-ancestors` ou `X-Frame-Options`) ou `Permissions-Policy`.
  O container Nginx também expõe HTTP diretamente. Não há, no repositório,
  evidência de que essas políticas sejam aplicadas em uma camada externa.
- **Impacto:** se o deploy não tiver proxy/CDN com os headers equivalentes, o
  frontend perde defesas de navegador importantes contra framing indevido,
  interpretação de conteúdo e vazamento de referer. A gravidade real depende da
  infraestrutura que termina TLS e serve a aplicação.
- **Recomendação:** inspecionar os headers efetivos da URL de produção e declarar
  as políticas no terminador HTTPS ou na configuração de hosting. Definir CSP
  progressivamente; configurar HSTS somente onde HTTPS é garantido.

### A-021 — O token de texto informativo falha o contraste mínimo em todos os temas

- **Severidade:** média (acessibilidade visual)
- **Evidência:** `--color-text-subtle` tem contraste de apenas **2,56:1** no
  tema claro (`#94a3b8` sobre branco), **3,08:1** no escuro (`#64748b` sobre
  `#1f2937`) e **3,24:1** no Jaral (`#7890b8` sobre branco), conforme
  [`themes.css:19-29`](src/styles/themes.css:19),
  [`themes.css:152-162`](src/styles/themes.css:152) e
  [`themes.css:281-291`](src/styles/themes.css:281). O token aparece em texto
  funcional pequeno, como filtros/legendas e controles de estado.
- **Impacto:** o conteúdo fica abaixo de 4,5:1 exigido para texto normal no
  WCAG AA e pode se tornar ilegível para pessoas com baixa visão ou em telas com
  baixo contraste, especialmente por ser usado em tamanho reduzido.
- **Recomendação:** ajustar o token por tema para atingir no mínimo 4,5:1 contra
  cada fundo onde é aplicado (ou limitar o token a elementos puramente
  decorativos). Adicionar teste/lint visual de contraste aos tokens de tema.

### A-022 — Ambiente de desenvolvimento, metadados e documentação estão desalinhados

- **Severidade:** média (manutenibilidade e reprodutibilidade)
- **Evidência:** `package.json` ainda declara versão `0.1.0`, embora o escopo
  atual seja v0.5; não há `engines`, `.nvmrc` ou `.node-version`, enquanto CI e
  Docker usam Node 22. O Docker de desenvolvimento monta o volume nomeado
  `frontend_node_modules` sobre a imagem
  ([`docker-compose.yml:11-13`](docker-compose.yml:11)), mas o comando
  documentado `--force-recreate` não o remove; uma alteração de dependência pode
  continuar usando módulos antigos. `Dockerfile` e actions da CI usam tags
  flutuantes, e [`README.md:270-275`](README.md:270) ainda lista lint,
  formatação, CI e testes como próximos passos já existentes.
- **Impacto:** é mais difícil reproduzir problemas, saber o estado real do
  produto e atualizar dependências com segurança. O `npm audit` completo também
  apontou duas vulnerabilidades altas transitivas somente de ferramentas de
  desenvolvimento, embora `npm audit --omit=dev` não tenha encontrado
  vulnerabilidade de produção.
- **Recomendação:** declarar a versão suportada de Node, alinhar metadados e
  documentação ao release, usar imagens/actions pinadas conforme a política do
  time e corrigir o bootstrap do volume (ou documentar remoção explícita ao
  alterar dependências). Incluir atualização/auditoria regular das ferramentas.

## Atualizacao de correcoes em 31/08/2026

Esta rodada foi concentrada no orquestrador autenticado e preservou o contrato
das paginas e dos hooks de mutacao existentes.

- **A-007 corrigido:** a arvore de rotas operacionais agora tem fallback para a
  rota inicial; URL autenticada desconhecida deixa de renderizar uma pagina vazia.
- **A-009 mitigado:** `App.tsx` ficou restrito a sessao, escopo, consultas e
  composicao de alto nivel. As rotas foram movidas para
  `src/routes/AuthenticatedRoutes.tsx`; selecao de planilha e detalhes de tarefa
  foram extraidos para hooks com contratos tipados.
- **A-011 mitigado no agregado operacional:** `useRoutineControl` expoe
  `refetch`, a tela mostra uma acao de tentativa segura e nao apresenta a
  mensagem bruta recebida da API. Perfil e Agenda continuam acessiveis enquanto
  o agregado operacional esta indisponivel. O retry das consultas internas de
  EmployeesPage e AgendaPage continua pendente.
- **A-006 mitigado para o dialogo de tarefa:** o novo `TaskDetailsDialog` usa
  portal, foco inicial, trap de Tab, Escape, restauracao de foco, scroll lock e
  fundo inerte. Os outros modais e drawers citados no achado ainda precisam de
  uma primitiva compartilhada.
- **A-012 melhorado:** foram incluidos testes para o fallback autenticado, o
  dialogo e a regra pura de contexto da planilha. A lacuna de E2E e coverage
  segue aberta.
- **A-013 parcialmente mitigado:** a consulta de responsaveis so e executada
  quando a tarefa selecionada pode ser editada. A invalidacao apos alteracoes
  de membro continua como trabalho pendente.

Validacao desta rodada: `npm run typecheck`, `npm run lint`, `npm test` (21
arquivos e 58 testes) e `npm run build` passaram. O build ainda informa o chunk
inicial acima de 500 kB, portanto A-018 permanece aberto.

## Limitações conhecidas da auditoria

- A análise não pressupõe que recursos mapeados para versões futuras sejam
  obrigatórios nesta versão.
- A disponibilidade e o comportamento do backend serão avaliados apenas pelo
  contrato e pelo código cliente, salvo evidência local adicional.
