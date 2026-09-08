# Melhorias Estruturais React - Esforco x Recompensa

Este documento lista melhorias estruturais que ainda valem a pena considerar no frontend, organizadas pela relacao entre esforco e recompensa. A ideia e evitar refatoracoes cedo demais, mas tambem nao deixar o projeto crescer em cima de uma base dificil de manter.

## Status Atual

Os itens 1 a 14 foram estruturados no projeto como base do MVP:

- tokens de design em `src/constants/designTokens.js`;
- componentes base em `src/components/ui`;
- preparo de dados em `src/utils`;
- hooks de dados, tarefas, competencia, lista e formulario em `src/hooks`;
- paginas reais em `src/pages`;
- layout principal em `src/layouts`;
- roteamento com `react-router-dom`;
- competencia e preferencias globais via Context API;
- permissoes frontend em `src/utils/permissions.js`;
- services por dominio em `src/services`;
- normalizacao simples de dados por maps;
- testes focados com Vitest;
- padrao inicial de formularios em `src/components/forms`.

## Criterios

- Recompensa alta: reduz duplicacao, melhora consistencia visual, facilita novas telas ou reduz chance de bug.
- Esforco baixo: pode ser feito sem redesenhar a aplicacao.
- Esforco medio: exige mover responsabilidades ou ajustar varios componentes.
- Esforco alto: muda arquitetura, fluxo de dados ou forma de navegar.

## Prioridade Recomendada

```text
1. Tokens de design: cores, status, espacamento e sombras.
2. Componentes base: Button, IconButton, Select, TextField, Badge, Card.
3. Utilitarios de dados para rotinas, tarefas, empresas e status.
4. Hooks para dados e filtros.
5. Estrutura de paginas reais.
6. Roteamento.
7. Testes focados.
8. Estado global, apenas quando a aplicacao pedir.
```

## 1. Arquivo de Padrao de Cores e Tokens

Recompensa: Alta  
Esforco: Baixo

Hoje as cores aparecem direto nos componentes com classes Tailwind. Isso funciona no comeco, mas a interface ja tem muitos estados: pendente, em andamento, erro, concluido, fundo de pagina, bordas, cards, campos e acentos.

Criar um arquivo de tokens ajudaria a manter consistencia.

Arquivo sugerido:

```text
src/constants/designTokens.js
```

Conteudo sugerido:

```js
export const statusTone = {
  pending: {
    label: 'Pendente',
    dot: 'border border-slate-300 bg-white',
    card: 'border-slate-200 bg-white',
    text: 'text-slate-700',
  },
  in_progress: {
    label: 'Em andamento',
    dot: 'bg-amber-400',
    card: 'border-amber-200 bg-amber-50',
    text: 'text-amber-900',
  },
}
```

O que mover para tokens:

- Cores por status.
- Cores de pagina.
- Cores de cards.
- Estados de foco.
- Bordas.
- Sombras.
- Tamanhos de raio.
- Classes para densidade compacta/confortavel.

Vantagens:

- Evita cada componente inventar sua cor.
- Facilita trocar a identidade visual depois.
- Ajuda a manter planilha e lista coerentes.

Risco:

- Se exagerar, vira um sistema de design grande demais para o MVP.

Recomendacao:

- Fazer agora, mas pequeno.
- Comecar pelos status e superficies principais.

## 2. Componentes Base de UI

Recompensa: Alta  
Esforco: Medio

Componentes sugeridos:

```text
src/components/ui/
  Button.jsx
  IconButton.jsx
  Select.jsx
  TextField.jsx
  Textarea.jsx
  Badge.jsx
  Card.jsx
  Modal.jsx
```

Por que vale a pena:

- A aplicacao ja tem muitos botoes e campos.
- Ajuda a padronizar foco, hover, tamanho, disabled e loading.
- Reduz classes repetidas.

Onde comecar:

- `IconButton`, porque a lista usa anexo por icone.
- `Button`, porque menus e acoes vao crescer.
- `Textarea`, porque observacoes aparecem em lista e detalhe.

Cuidados:

- Nao criar componentes abstratos demais.
- Cada componente deve resolver um problema real ja repetido.

## 3. Separar Preparacao de Dados da UI

Recompensa: Alta  
Esforco: Medio

Hoje parte da preparacao dos dados esta dentro do `App.jsx`: montar itens da lista, buscar relacoes, filtrar por empresa/rotina.

Isso pode crescer rapido.

Arquivos sugeridos:

```text
src/utils/routineRelations.js
src/utils/routineListItems.js
src/utils/routineFilters.js
```

Funcoes sugeridas:

```js
buildTaskRelations(task, data)
buildRoutineListItems({
  tasks,
  clients,
  routines,
  employees,
  departments,
  mode,
})
filterTasksByClient(tasks, clientId)
filterTasksByRoutine(tasks, routineId)
```

Vantagens:

- `App.jsx` fica menor.
- Facilita testar regra de dados.
- Facilita reaproveitar a lista em outras telas.

Recomendacao:

- Fazer antes de criar dashboards e busca global.

## 4. Hooks de Dados e Estado Operacional

Recompensa: Alta  
Esforco: Medio

Hooks sugeridos:

```text
src/hooks/useRoutineControl.js
src/hooks/useTaskUpdates.js
src/hooks/useRoutineListView.js
src/hooks/useCompetence.js
```

Responsabilidades:

- `useRoutineControl`: carregar dados.
- `useTaskUpdates`: alterar status, prazo, responsavel, observacao e anexos.
- `useRoutineListView`: controlar filtro da lista.
- `useCompetence`: controlar `< 06/2026 >`.

Vantagens:

- Remove logica pesada do `App.jsx`.
- Prepara melhor para API real.
- Ajuda a compartilhar comportamento entre paginas.

Risco:

- Criar hooks cedo demais pode espalhar logica sem necessidade.

Recomendacao:

- Comecar por `useTaskUpdates` e `useRoutineControl`.

## 5. Estrutura de Paginas Reais

Recompensa: Alta  
Esforco: Medio

Hoje `App.jsx` concentra as telas. Com a ideia de MVP, isso vai crescer:

- Home.
- Planilha.
- Lista global.
- Busca.
- Minhas tarefas.
- Dashboard.
- Rotinas.
- Empresas.
- Perfil.

Estrutura sugerida:

```text
src/pages/
  HomePage.jsx
  SpreadsheetPage.jsx
  ListPage.jsx
  SearchPage.jsx
  MyTasksPage.jsx
  DepartmentDashboardPage.jsx
  ManagerDashboardPage.jsx
  RoutinesPage.jsx
  CompaniesPage.jsx
  ProfilePage.jsx
```

Vantagens:

- Facilita navegação e permissao por tela.
- Reduz tamanho do `App.jsx`.
- Ajuda a implementar menu lateral.

Recomendacao:

- Fazer antes de implementar menu lateral real.

## 6. Layout Principal da Aplicacao

Recompensa: Alta  
Esforco: Medio

Com o MVP definido, vale criar um layout base.

Estrutura sugerida:

```text
src/layouts/AppLayout.jsx
src/layouts/Sidebar.jsx
src/layouts/Topbar.jsx
src/layouts/PageHeader.jsx
```

Responsabilidades:

- Menu lateral.
- Topo com competencia.
- Perfil no canto direito.
- Area principal.
- Responsividade.

Vantagens:

- Todas as paginas ficam consistentes.
- Evita cada pagina recriar topo e container.
- Facilita permissao no menu.

Recomendacao:

- Implementar logo depois de separar paginas.

## 7. Roteamento

Recompensa: Alta  
Esforco: Medio/Alto

Quando houver mais paginas, usar roteamento fica importante.

Opcao comum:

```text
react-router
```

Rotas possiveis:

```text
/
/planilha/:departmentId
/lista
/busca
/minhas-tarefas
/dashboard
/rotinas
/empresas
/perfil
```

Vantagens:

- URLs compartilháveis.
- Browser voltar/avancar funciona.
- Menu lateral fica mais natural.
- Facilita permissao por rota.

Desvantagens:

- Adiciona dependencia.
- Exige organizar estado que hoje esta local no `App.jsx`.

Recomendacao:

- Nao precisa antes de separar paginas.
- Vale implementar quando o menu lateral começar a existir.

## 8. Controle de Competencia

Recompensa: Alta  
Esforco: Baixo/Medio

Como o sistema gira por competencia, vale estruturar isso cedo.

Arquivo/hook sugerido:

```text
src/hooks/useCompetence.js
src/utils/competence.js
```

Funcoes:

```js
formatCompetence('2026-06') // 06/2026
nextCompetence('2026-06')
previousCompetence('2026-06')
```

Vantagens:

- Evita data espalhada.
- Facilita aplicar competencia em planilha, lista e dashboard.

Recomendacao:

- Fazer junto com o topo da aplicacao.

## 9. Sistema de Permissoes no Frontend

Recompensa: Media/Alta  
Esforco: Medio

Mesmo que a permissao real venha do backend, o frontend precisa saber o que mostrar.

Arquivo sugerido:

```text
src/constants/roles.js
src/utils/permissions.js
```

Exemplo:

```js
canAccessDashboard(user)
canEditRoutine(user, departmentId)
canAssignTask(user, task)
```

Vantagens:

- Menu muda por perfil.
- Acoes aparecem/desaparecem corretamente.
- Facilita MVP com funcionario/lider/manager.

Cuidados:

- Isso nao substitui permissao no backend.

Recomendacao:

- Fazer antes de criar telas de lider e manager.

## 10. Estado Global

Recompensa: Media  
Esforco: Medio/Alto

Possiveis opcoes:

- Context API.
- Zustand.
- Redux Toolkit.

O que poderia virar global:

- Usuario atual.
- Perfil/permissoes.
- Competencia ativa.
- Departamento ativo.
- Preferencias.

O que nao precisa ser global agora:

- Estado local de modal.
- Edicao temporaria de campo.
- Estado interno de uma lista.

Recomendacao:

- Comecar com Context API para usuario, competencia e preferencias.
- Evitar Redux no MVP, a menos que a complexidade cresca muito.

## 11. Camada de Servicos para API

Recompensa: Alta  
Esforco: Medio

Hoje existe `routineControlService`, mas a API futura vai exigir mais separacao.

Estrutura sugerida:

```text
src/services/
  routineControlService.js
  taskService.js
  companyService.js
  routineService.js
  employeeService.js
```

Vantagens:

- Facilita trocar mock por API.
- Evita chamadas HTTP dentro de componentes.
- Centraliza tratamento de erro.

Recomendacao:

- Expandir conforme novas telas forem nascendo.

## 12. Normalizacao de Dados

Recompensa: Media  
Esforco: Medio

Como as telas cruzam empresas, rotinas, tarefas e funcionarios, pode valer normalizar dados em maps.

Exemplo:

```js
const clientsById = new Map(clients.map((client) => [client.id, client]))
```

Vantagens:

- Evita `find` repetido.
- Melhora clareza em listas e detalhes.

Recomendacao:

- Criar helper simples antes de dashboards.
- Nao precisa trazer biblioteca para isso.

## 13. Testes

Recompensa: Media/Alta  
Esforco: Medio

Testes mais valiosos:

- Utilitarios de competencia.
- Filtros de tarefas.
- Agrupamento por status.
- Permissoes.
- Criacao de itens de lista.

Ferramentas possiveis:

- Vitest.
- Testing Library.

Recomendacao:

- Comecar testando utilitarios, nao componentes visuais complexos.

## 14. Padrao de Formularios

Recompensa: Media/Alta  
Esforco: Medio

Telas futuras terao muitos formularios:

- Nova tarefa.
- Nova rotina.
- Nova empresa.
- Perfil.
- Funcionario.
- Cargo.

Vale definir:

- Componentes de campo.
- Validacao.
- Mensagens de erro.
- Padrao de salvar/cancelar.
- Estado de loading.
- Confirmacao ao sair com alteracoes.

Recomendacao:

- Criar padrao antes de implementar cadastros.

## 15. Modal vs Painel Lateral

Recompensa: Media  
Esforco: Medio

Hoje detalhe abre em modal. No futuro, pode valer criar um componente base que suporte:

- Modal central.
- Painel lateral em desktop.
- Tela cheia em mobile.

Recomendacao:

- Nao refatorar agora se o modal esta funcionando.
- Considerar quando a lista virar fluxo principal de execucao.

## 16. Arquivos de Constantes por Dominio

Recompensa: Media  
Esforco: Baixo

Estrutura sugerida:

```text
src/constants/
  routineStatus.js
  roles.js
  routes.js
  departments.js
  designTokens.js
```

Vantagens:

- Evita strings soltas.
- Facilita manutencao.

Recomendacao:

- Fazer gradualmente.

## 17. Nomeclatura e Organizacao de Pastas

Recompensa: Media  
Esforco: Baixo/Medio

O projeto ja melhorou com:

```text
routine-control/
  spreadsheet/
  list/
  details/
  shared/
```

Proximos passos:

```text
features/
  routine-control/
  companies/
  routines/
  employees/
  dashboard/
```

Vantagem:

- Quando o sistema crescer, separar por feature pode ficar melhor que separar tudo por tipo.

Recomendacao:

- Nao migrar para `features/` ainda.
- Avaliar quando cadastros e dashboards forem implementados.

## 18. Estados de Loading, Empty e Error

Recompensa: Alta  
Esforco: Baixo

Criar componentes:

```text
LoadingState.jsx
EmptyState.jsx
ErrorState.jsx
```

Vantagens:

- Todas as telas ficam consistentes.
- Melhora UX quando vier API real.

Recomendacao:

- Fazer cedo.

## 19. Toasters e Feedback de Salvamento

Recompensa: Media  
Esforco: Baixo/Medio

Acoes como alterar status, prazo, responsavel e anexar precisam de feedback.

Opcoes:

- Toast simples.
- Indicador inline.
- Mensagem no topo.

Recomendacao:

- MVP pode comecar com feedback inline discreto.
- Toast entra quando houver API real.

## Matriz Esforco x Recompensa

| Melhoria                  | Recompensa | Esforco     | Prioridade  |
| ------------------------- | ---------- | ----------- | ----------- |
| Tokens de cores/status    | Alta       | Baixo       | Alta        |
| Componentes base UI       | Alta       | Medio       | Alta        |
| Separar dados da UI       | Alta       | Medio       | Alta        |
| Hooks de dados/tarefas    | Alta       | Medio       | Alta        |
| Layout principal          | Alta       | Medio       | Alta        |
| Competencia centralizada  | Alta       | Baixo/Medio | Alta        |
| Paginas reais             | Alta       | Medio       | Alta        |
| Roteamento                | Alta       | Medio/Alto  | Media       |
| Permissoes frontend       | Media/Alta | Medio       | Media       |
| Estado global             | Media      | Medio/Alto  | Media       |
| Testes de utilitarios     | Media/Alta | Medio       | Media       |
| Modal para painel lateral | Media      | Medio       | Baixa agora |
| Migrar para features/     | Media      | Medio       | Baixa agora |

## Ordem Recomendada de Implementacao

1. Criar `designTokens.js` e mover tons de status.
2. Criar componentes UI basicos: `Button`, `IconButton`, `Textarea`, `Select`.
3. Extrair preparacao de lista e relacoes para `utils`.
4. Criar `useRoutineControl` e `useTaskUpdates`.
5. Criar `useCompetence`.
6. Criar `AppLayout`, `Sidebar`, `Topbar`.
7. Separar paginas principais.
8. Adicionar roteamento.
9. Criar permissões frontend.
10. Adicionar testes para utilitarios.

## Recomendacao Final

As melhorias que mais valem agora sao as que deixam a interface consistente e removem logica do `App.jsx`:

- tokens de design;
- componentes UI base;
- utilitarios de dados;
- hooks de dados/tarefas;
- competencia centralizada.

Melhorias como roteamento, estado global e dashboards mais sofisticados devem vir depois que a estrutura de paginas e layout estiver mais definida.
