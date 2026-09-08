# Plano completo de correção — Estado assíncrono, revalidação, preservação de contexto e loading

## 0. Objetivo

Corrigir estruturalmente a forma como o frontend do Gerenciador de Rotinas trata carregamento inicial, atualizações locais, revalidação específica, revalidação ampla, mudança de contexto, formulários em andamento, concorrência entre requests, feedback de sucesso/erro e animações de loading.

A regra central desta refatoração deve ser:

> Uma operação assíncrona só pode bloquear ou substituir a menor região da interface que realmente depende dela.

Nenhuma ação comum de CRUD deve desmontar toda a aplicação autenticada.

---

# 1. Diagnóstico do problema atual

O problema atual não é apenas visual. Ele decorre da mistura de três responsabilidades distintas:

```text
buscar dados
+
representar estado de carregamento
+
decidir quando desmontar a árvore renderizada
```

Hoje `AuthenticatedApp` recebe de `useRoutineControl` algo equivalente a:

```ts
response
setResponse
data
isLoading
error
reload
```

E usa um loading global. Como várias mutations chamam `reload()`, uma atualização local pode substituir a árvore autenticada inteira por `LoadingState`.

Consequências:

- formulários multi-step podem voltar ao início;
- páginas e abas de Settings podem remontar;
- drawers/modais filhos podem fechar;
- foco e scroll local podem ser perdidos;
- o sucesso de uma criação pode não ser mostrado antes do remount;
- o usuário pode repetir uma criação por não saber se ela foi concluída.

O `App.tsx` atual já contém um padrão melhor nas edições de detalhes da Task: a resposta do backend é convertida para `Task` e aplicada localmente em `setResponse`, sem reload operacional completo. Esse comportamento deve virar a regra.

---

# 2. Conclusões da pesquisa e padrões adotados

## 2.1 React Router

A documentação atual do React Router diferencia navegações que mudam contexto de operações assíncronas que devem permanecer na mesma tela. Para ações que não mudam URL/contexto, o padrão é manter pending state independente da navegação e permitir optimistic UI/local pending UI.

Aplicação ao projeto:

```text
Editar tarefa
Editar empresa
Salvar configuração
Adicionar link
Criar item dentro da tela atual
```

não devem possuir semântica de navegação global.

Referências:

- https://reactrouter.com/start/framework/pending-ui
- https://reactrouter.com/explanation/form-vs-fetcher
- https://reactrouter.com/how-to/fetchers
- https://reactrouter.com/explanation/race-conditions

Não é necessário migrar o projeto inteiro para React Router Data APIs para adotar o princípio.

## 2.2 TanStack Query

TanStack Query formaliza exatamente os problemas que o frontend está resolvendo manualmente hoje:

- cache de server state;
- distinção entre primeiro carregamento e refetch;
- atualização do cache a partir da resposta de uma mutation;
- invalidation direcionada;
- optimistic updates;
- rollback;
- cancelamento de requests;
- cache separado por parâmetros/contexto;
- refetch em background.

A documentação recomenda usar o objeto retornado pela mutation para atualizar o cache diretamente quando ele já contém os dados necessários, evitando um GET desnecessário. Também recomenda invalidação direcionada quando outras queries derivadas ficaram stale.

Referências:

- https://tanstack.com/query/latest/docs/framework/react/guides/updates-from-mutation-responses
- https://tanstack.com/query/latest/docs/framework/react/guides/invalidations-from-mutations
- https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates
- https://tanstack.com/query/latest/docs/framework/react/guides/query-cancellation
- https://tanstack.com/query/latest/docs/framework/react/guides/query-keys
- https://tanstack.com/query/latest/docs/framework/react/guides/placeholder-query-data

### Decisão

**Adotar TanStack Query de forma incremental.**

Não fazer uma migração completa de uma vez. Primeiro corrigir o hook atual e remover o comportamento destrutivo. Depois migrar server state por domínio.

## 2.3 GitHub / Primer

As guidelines do GitHub/Primer são particularmente adequadas ao problema:

- loading deve ficar próximo do conteúdo que representa;
- evitar interstitial/full-page loading quando o contexto pode permanecer;
- skeleton é adequado para regiões grandes sem conteúdo disponível;
- spinner é adequado para operações pequenas de duração desconhecida;
- processos longos devem, quando possível, virar tarefas em background;
- formulários devem preservar dados quando uma submission falha;
- same-page state changes devem evitar full reload;
- feedback de sucesso é útil quando o resultado não é evidente.

Referências:

- https://primer.style/product/ui-patterns/loading/
- https://primer.style/product/ui-patterns/saving/
- https://primer.style/product/ui-patterns/navigation/
- https://primer.style/product/ui-patterns/notification-messaging/
- https://primer.style/product/scenario-patterns/create/
- https://primer.style/product/ui-patterns/degraded-experiences/

## 2.4 Atlassian Design System

Atlassian também trata loading como estado localizado de componentes: botão com loading, spinner, skeleton e progress bar. Isso reforça o uso de feedback proporcional ao escopo da operação.

Referências:

- https://atlassian.design/guidelines/product/components/buttons
- https://atlassian.design/components/skeleton
- https://atlassian.design/components/spinner/
- https://atlassian.design/components/progress-bar/
- https://atlassian.design/foundations/accessibility

---

# 3. Princípios obrigatórios da nova arquitetura

## 3.1 O shell autenticado deve ser persistente

Após autenticação e seleção de organização, estes elementos não devem desaparecer por causa de refetch de dados operacionais:

```text
AppLayout
Topbar
Sidebar
WorkspaceBar
Routes
```

Exceções aceitáveis:

- logout;
- expiração/perda de sessão;
- troca explícita de associação quando o novo contexto ainda não pode ser renderizado;
- erro fatal que torne toda a aplicação autenticada inutilizável.

## 3.2 Server state não é UI state

### Server state

```text
companies
routines
tasks
screens
departments
members
projections
competences
```

Deve ser tratado por queries/cache.

### UI state

```text
form step
modal aberto
drawer aberto
texto ainda não enviado
foco
seleção temporária
```

Revalidação de server state não deve destruir UI state.

### Navigation state

```text
rota
competência
departamento
screen selecionada
aba de configuração que representa uma página
```

Sempre que fizer sentido, deve ficar na URL ou em contexto persistente apropriado.

## 3.3 A resposta da mutation é a primeira fonte de atualização

Regra:

```text
mutation
↓
backend retorna recurso atualizado
↓
frontend aplica recurso no cache/estado
```

Somente depois, quando necessário:

```text
invalidate query derivada
```

Evitar:

```text
mutation
↓
ignorar resposta
↓
GET de todo o sistema
```

## 3.4 Toda revalidação deve ter escopo explícito

Nenhuma mutation nova deve simplesmente chamar `reload()` sem responder:

```text
qual entidade mudou?
quais coleções contêm essa entidade?
quais projeções dependem dela?
qual é o menor escopo que precisa ser revalidado?
```

---

# 4. Taxonomia oficial de operações

Toda mutation deve ser classificada em uma destas categorias.

## A. Atualização local

Backend retorna dados suficientes para atualizar imediatamente a UI.

Exemplos:

- alterar status;
- responsável;
- prazo;
- título;
- descrição;
- observação;
- links;
- editar empresa;
- editar rotina;
- editar tela;
- alterar perfil de funcionário;
- alterar acesso quando o backend retorna o membro atualizado.

Estratégia:

```text
mutation
→ resposta
→ patch de cache
→ feedback local
```

## B. Atualização local + revalidação específica

A mutation retorna o recurso principal, mas também afeta projeções ou relações derivadas.

Exemplos:

```text
empresa–rotina
composição da screen
rotina que altera ocorrências futuras
departamento que altera telas
acessos que alteram contadores
```

Estratégia:

```text
mutation
→ patch imediato
→ invalidar somente queries derivadas
→ refetch em background
```

## C. Revalidação ampla sem desmontagem

Operação possui efeitos colaterais abrangentes.

Exemplo principal:

```text
finalização de competência
```

Outros exemplos:

- importação em lote;
- restore em massa;
- mudança administrativa com efeito em vários departamentos.

Estratégia:

```text
mutation
→ manter UI atual
→ estado "refreshing"
→ refetch do contexto operacional
→ atomic swap dos dados
```

## D. Mudança de contexto

Exemplos:

- competência;
- organização;
- associação;
- escopo completo de departamento;
- permissões que removem/adicionam acesso;
- login/logout.

Estratégia:

```text
context key muda
→ query correspondente é consultada
→ usar cache se disponível
→ caso contrário mostrar loading somente na região dependente
```

---

# 5. Modelo de estados assíncronos

Remover a semântica genérica de `isLoading` como estado global.

## 5.1 Query

```ts
isInitialLoading
isFetching
isRefreshing
```

Semântica:

```text
isInitialLoading
= não há dados utilizáveis e a primeira busca está acontecendo

isFetching
= existe uma request da query

isRefreshing
= já existem dados utilizáveis e uma nova versão está sendo buscada
```

## 5.2 Mutation

Cada mutation possui seu próprio estado:

```text
idle
pending
success
error
```

Exemplos:

```text
isSavingTask
isCreatingCompany
isArchivingCompany
isFinalizingCompetence
```

Não criar um `globalIsSaving` para todas as operações.

---

# 6. Correção imediata de `useRoutineControl`

Esta é a primeira alteração do projeto.

## Interface temporária sugerida

```ts
interface RoutineControlState {
  response: RoutineControlResponse | null
  data: RoutineControlData | null

  isInitialLoading: boolean
  isRefreshing: boolean

  error: Error | null

  refresh: () => Promise<void>

  setResponse: React.Dispatch<
    React.SetStateAction<RoutineControlResponse | null>
  >
}
```

## Regra de refresh

```ts
async function refresh() {
  setIsRefreshing(true)

  try {
    const nextResponse = await loadRoutineControl()
    setResponse(nextResponse)
  } finally {
    setIsRefreshing(false)
  }
}
```

Durante refresh:

```text
NÃO executar setResponse(null)
```

O dado anterior permanece renderizado até o novo estar pronto.

---

# 7. Correção imediata de `AuthenticatedApp`

Remover a condição global baseada em qualquer fetch.

O comportamento deve ser equivalente a:

```tsx
if (isInitialLoading && !response) {
  return <LoadingState message="Carregando rotinas..." />
}
```

`isRefreshing` nunca deve retirar `<Routes>`, `<AppLayout>`, formulários, modais ou drawers da árvore.

Alvo posterior: até a primeira carga pode preservar um shell básico e usar skeleton apenas na região principal.

---

# 8. Adoção incremental de TanStack Query

## Não migrar tudo no primeiro PR

Sequência recomendada:

```text
PR 1
corrigir hook atual

PR 2
instalar/configurar QueryClient

PR 3+
migrar domínios gradualmente
```

## Estrutura sugerida

```text
src/
  query/
    queryClient.ts
    queryKeys.ts

  hooks/
    queries/
    mutations/
```

Configuração inicial possível:

```ts
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
})
```

Os valores devem ser ajustados conforme comportamento real do produto.

---

# 9. Query keys

Keys devem representar tenant + recurso + contexto.

Exemplos:

```ts
['organization', organizationId, 'routine-control', competence]

['organization', organizationId, 'company', companyId]

['organization', organizationId, 'company-routine-assignments', companyId]

['organization', organizationId, 'routine', routineId]

[
  'organization',
  organizationId,
  'routine-occurrences',
  routineId,
  competence,
]

['organization', organizationId, 'screen', screenId]

[
  'organization',
  organizationId,
  'screen-projection',
  screenId,
  competence,
]

['organization', organizationId, 'department', departmentId]

['organization', organizationId, 'members']
```

Nunca omitir da key uma variável usada pela query.

---

# 10. Migração do `RoutineControlResponse`

O agregado operacional pode continuar existindo inicialmente. Não é necessário quebrar o backend imediatamente.

Tratamento alvo:

```ts
useQuery({
  queryKey: [
    'organization',
    organizationId,
    'routine-control',
    competence,
  ],
  queryFn: ...
})
```

Vantagens:

- cache por competência;
- background refetch;
- cancelamento;
- distinção de first load/refetch;
- atualização do cache;
- invalidação específica;
- prefetch.

---

# 11. Cache por competência

Competências devem possuir caches independentes.

```text
2026-07 → cache
2026-08 → cache
2026-09 → cache
```

Ao voltar a uma competência visitada:

```text
mostrar cache imediatamente
→ revalidar em background se stale
```

## Regra de consistência visual

Não exibir dados de agosto sob um cabeçalho que já diz setembro.

Se setembro não estiver em cache:

```text
shell permanece
contexto seleciona setembro
área operacional mostra skeleton localizado
```

Se estiver em cache:

```text
troca imediata
+
refetch silencioso quando necessário
```

---

# 12. Prefetch de competência

Depois da implementação básica, considerar prefetch limitado de:

```text
mês anterior
mês atual
próximo mês
```

Pode ser disparado após carga da competência atual ou em hover/foco do botão de navegação.

Não prefetch muitos meses sem necessidade.

---

# 13. Atualização de Task

O código atual já possui um padrão de atualização local via `applyTaskUpdate`. Esse padrão deve ser mantido e depois migrado para `queryClient.setQueryData`.

Fluxo:

```text
PATCH Task
↓
API retorna Task
↓
patch local
↓
task detail + lista recebem o mesmo novo estado
```

## Status

Remover o fluxo:

```text
setSelectedTask(null)
await reload()
```

Após transition.

O detalhe só fecha se houver decisão explícita de UX para isso.

---

# 14. Optimistic updates

Usar somente quando o estado futuro é previsível e o rollback é simples.

Bons candidatos:

```text
task status
toggle simples
algumas mudanças de responsável
```

Fluxo:

```text
onMutate
→ cancelar refetch concorrente
→ guardar snapshot
→ atualizar UI

onError
→ rollback
→ feedback

onSuccess
→ substituir pelo recurso canônico retornado

onSettled
→ invalidar derivadas se necessário
```

Evitar inicialmente em:

- criação complexa de empresa;
- publicação de versão de rotina;
- arquivamento com efeitos amplos;
- finalização de competência.

---

# 15. Criação de empresa

A criação atual é uma sequência multi-step:

```text
criar empresa
→ criar vínculos com rotinas
→ atualizar screen
→ reload
```

## Correção mínima

Remover o `await reload()` antes de devolver `CreateCompanyResult`.

Após sucesso:

```text
CreateCompanyPage continua montada
→ recebe resultado
→ apresenta confirmação
```

### Estado de sucesso recomendado

```text
Empresa criada com sucesso

Nome: ABC
5 rotinas vinculadas
Tela Fiscal atualizada

[Abrir empresa]
[Voltar para empresas]
[Criar outra]
```

Somente `Criar outra` deve resetar para step 1.

## Progress feedback opcional

Como há vários passos conhecidos, é possível mostrar progresso real:

```text
Criando empresa...
Vinculando rotinas (3/5)...
Atualizando tela...
```

Não inventar porcentagem falsa.

A melhor evolução de backend, se fizer sentido, seria um endpoint transacional de setup completo; essa mudança é independente da correção de loading.

---

# 16. Criação de rotina

Fluxo:

```text
POST routine
↓
API retorna Routine
↓
inserir no cache de routines
↓
form recebe sucesso
```

Se o fluxo deve navegar, navegar somente depois da resposta de sucesso.

Se deve permanecer na criação, mostrar success state.

Nunca recarregar o agregado antes do formulário saber que a operação terminou.

---

# 17. Editar empresa

Após `PATCH company`, o backend deve preferencialmente retornar recurso atualizado + ETag.

Frontend:

```text
substitui company no catálogo
substitui company no detail
```

Se derivados forem afetados, invalidar apenas queries necessárias.

---

# 18. Arquivar empresa

Fluxo:

```text
archive
↓
sucesso
↓
remover da coleção ativa
↓
navegar para /empresas
```

Se lista de arquivadas estiver cacheada:

```text
invalidate archived-companies
```

Não executar refresh global antes da navegação.

---

# 19. Vínculo empresa–rotina

Criar query dedicada:

```text
companyRoutineAssignments(companyId)
```

Após mutation:

```text
revalidar somente assignments da empresa
```

Se a mudança altera projeções:

```text
invalidate projection do contexto afetado
```

Eliminar o padrão de reload global + reload local.

---

# 20. Editar rotina

Separar efeitos.

## Identidade simples

```text
nome
shortname
```

→ patch local.

## Publicação de versão

Pode alterar ocorrências projetadas.

```text
publish version
→ patch routine
→ invalidate routine occurrences afetadas
→ invalidate screen projections dependentes
```

Se o frontend não conseguir determinar com segurança todas as projeções afetadas, invalidar a query operacional da competência em background, sem desmontagem.

---

# 21. Criar tela

```text
POST screen
→ API retorna screen
→ inserir em screens
```

Se a nova tela afeta navigation items, recalculá-los localmente a partir do cache.

---

# 22. Editar composição de tela

Queries:

```text
screen(screenId)
screenProjection(screenId, competence)
```

Após edição:

```text
patch screen
+
invalidate screenProjection
```

A tela de Settings continua montada.

---

# 23. Funcionários e acessos

## Perfil

```text
PATCH member
→ substituir membro no cache
```

## Acessos

```text
PATCH department access
→ substituir membro
→ atualizar/invalidate contadores relacionados
```

Se a alteração atinge o próprio usuário logado e modifica seu escopo:

```text
mudança de contexto/permissão
→ revalidar sessão/permissões
→ revalidar dados cujo escopo mudou
```

---

# 24. Tarefa avulsa

Backend deve retornar a Task criada.

```text
POST
→ Task
→ inserir em tasks da competência
```

Não executar reload global.

---

# 25. Alteração de departamento

Alterações simples:

```text
nome
descrição
```

→ patch local.

Alterações com efeito em screens/relacionamentos:

```text
patch department
+
invalidate department screens
```

---

# 26. Finalização de competência

Principal caso de refresh amplo.

Fluxo:

```text
usuário confirma
↓
isFinalizingCompetence = true
↓
POST finalize
↓
backend conclui
↓
refresh da query operacional da competência
↓
atomic swap
↓
isFinalizingCompetence = false
```

Durante todo o processo:

```text
AppLayout continua montado
rota continua montada
conteúdo atual permanece visível quando seguro
```

Estado visual:

```text
Finalizando competência…
```

com spinner ou barra indeterminada discreta na região operacional.

Ações que podem conflitar com finalização podem ficar temporariamente indisponíveis. Navegação não conflitante deve continuar funcionando quando possível.

---

# 27. Mudança de competência

Classificar como mudança de contexto.

## Sem cache

```text
clique setembro
↓
query key muda
↓
shell permanece
↓
skeleton somente da área operacional
↓
setembro chega
↓
conteúdo substitui skeleton
```

## Com cache

```text
clique agosto
↓
dados cacheados aparecem imediatamente
↓
refetch silencioso se stale
```

---

# 28. Troca de organização/membership

Mudança de contexto forte.

```text
selecionar membership
↓
sessão atualiza
↓
limpar/invalidar queries da organização anterior
↓
buscar contexto da nova organização
```

Não permitir mistura visual entre tenants.

Query keys devem incluir tenant em todos os recursos tenant-scoped.

---

# 29. Permissões

Quando uma alteração muda o próprio escopo de acesso:

```text
revalidar auth/session
+
revalidar navegação
+
revalidar queries afetadas
```

Se uma rota deixa de ser acessível, aí pode ocorrer navegação.

Não usar reload global do browser.

---

# 30. Requests concorrentes e respostas antigas

Mudanças rápidas de competência podem produzir:

```text
request agosto
request setembro
```

A resposta de agosto não pode sobrescrever setembro se chegar depois.

Usar `AbortSignal`.

O `httpClient` atual já possui suporte a AbortSignal; reutilizar.

TanStack Query também oferece signal por query.

---

# 31. ETag e conflito 412

Um `412 Precondition Failed` não deve provocar reload global.

Fluxo:

```text
mutation
↓
412
↓
manter formulário/drawer aberto
↓
buscar somente a entidade atual
↓
informar conflito
```

Exemplo:

```text
Esta tarefa foi alterada por outra pessoa.
Os dados mais recentes foram carregados.
```

Se houver texto ainda não salvo, não descartá-lo silenciosamente.

---

# 32. Formulários

Erro de API nunca deve zerar o formulário.

Preservar:

```text
step
fields
dirty state
validation state
```

Multi-step forms só resetam por ação explícita:

```text
cancel
criar outra
novo formulário
```

---

# 33. Draft de formulários longos

Depois da correção estrutural, considerar `sessionStorage` para:

- criação de empresa;
- criação de rotina.

Isso protege contra refresh real, fechamento acidental e crash.

Se implementado:

```text
TTL
chave por organização
clear após sucesso
clear após cancel explícito
```

Não usar `localStorage` indiscriminadamente para dados potencialmente sensíveis.

---

# 34. Unsaved changes

Para formulários explicitamente salvos:

```text
dirty = true
```

Ao navegar para outro contexto, confirmar descarte quando necessário.

Não disparar confirmação por simples background refetch.

---

# 35. Sistema de feedback assíncrono

Criar padrões reutilizáveis:

```text
AsyncButton
InlinePending
InlineSaveStatus
SectionRefreshIndicator
ContentSkeleton
TableSkeleton
BackgroundRefreshBar
AsyncError
```

Evitar loaders customizados por tela.

---

# 36. AsyncButton

Estados:

```text
idle
pending
success opcional
error
```

Exemplo:

```text
idle
[Salvar]

pending
[⟳ Salvando…]

success
[✓ Salvo]
```

Regras:

- bloquear submission duplicada enquanto pending;
- manter largura do botão para evitar layout shift;
- usar verbo que descreve a ação;
- erro deve aparecer próximo do formulário.

---

# 37. Spinner

Uso:

```text
ação pequena
duração desconhecida
região pequena
```

Exemplos:

- salvar observação;
- atualizar responsável;
- refresh de seção;
- carregar assignees.

Estilo:

- pequeno;
- sutil;
- sem overlay de página.

---

# 38. Skeleton

Uso:

```text
não existem dados renderizáveis ainda
+
estrutura da região é conhecida
```

Exemplos:

- planilha ao abrir competência nunca visitada;
- dashboard na primeira carga;
- lista específica sem cache;
- painel de configurações aguardando recurso.

Skeleton deve ocupar espaço próximo ao conteúdo final para evitar layout shift.

Não substituir conteúdo válido por skeleton durante background refresh.

---

# 39. BackgroundRefreshBar

Criar padrão discreto para refresh amplo mantendo conteúdo.

Pode ser:

- linha fina animada no topo da área de conteúdo;
- indicador na `WorkspaceBar`;
- label + spinner pequeno.

Uso:

- finalização de competência;
- refresh operacional amplo;
- operação administrativa abrangente.

Não bloquear a tela inteira.

---

# 40. Progress determinate

Usar somente quando existe progresso real.

Exemplos:

```text
upload 43%
importação 120/500
vinculando 3/8 rotinas
```

Não simular porcentagem quando não existe métrica confiável.

---

# 41. Política por duração

Usar como guideline, não como temporizador rígido.

## Aproximadamente < 1s

- evitar loaders grandes;
- pending state pode existir logicamente para bloquear duplicação;
- evitar flashes visuais desnecessários.

## Aproximadamente 1–3s

- spinner/feedback indeterminado local.

## Aproximadamente 3–10s

- mostrar contexto textual;
- usar progresso real se mensurável.

## > 10s

- preferir background;
- permitir continuar trabalhando;
- mostrar progresso/status persistente;
- considerar cancelamento quando seguro.

---

# 42. Delay para loaders

Evitar flash de spinner em background refresh muito rápido.

Modelo conceitual:

```text
request começa
↓
200–400ms
↓
se ainda pendente → mostrar spinner
```

O estado lógico pending existe imediatamente e submission duplicada já deve ser impedida.

O valor final deve ser validado no produto; não transformar 300ms em regra universal.

---

# 43. Animação e reduced motion

O projeto já possui suporte a reduced motion.

Regras:

- spinner pode continuar com movimento sutil por transmitir atividade;
- shimmer/sweeps decorativos devem ser reduzidos;
- evitar pulso grande, bounce e zoom;
- animação não deve competir com a tarefa principal.

---

# 44. Feedback de sucesso

Não mostrar toast para toda mutation trivial.

## Resultado evidente

Exemplo:

```text
status mudou para Em andamento
```

Não precisa de toast.

## Resultado não evidente

Exemplos:

```text
empresa criada
configuração salva
```

Mostrar confirmação.

Para criação importante:

```text
success state
ou
navegação para o recurso criado
```

Para save inline:

```text
"Salvo"
```

por curto período quando necessário.

---

# 45. Feedback de erro

Erro deve aparecer no menor escopo útil.

Exemplo:

```text
salvar observação falhou
→ erro junto ao editor
```

Não transformar a aplicação inteira em `ErrorState`.

Erro global somente quando o dado primário da página não puder ser recuperado.

---

# 46. Degradação parcial

Se uma seção secundária falhar:

```text
página permanece
seção mostra erro local
```

Exemplo:

```text
task detail funciona
assignees falharam
```

Não esconder a task inteira.

---

# 47. Navegação e foco

Refetch não deve:

- fechar dialog;
- mover foco;
- mandar scroll para topo.

Após mutation local, foco permanece.

Após criação com navegação, usar comportamento da nova rota.

Após erro de formulário, mover foco para erro relevante quando necessário.

---

# 48. ARIA

Para loading local, usar `aria-busy="true"` na região quando apropriado.

Mensagens assíncronas podem usar `role="status"` ou `aria-live`.

Evitar dezenas de loaders anunciando simultaneamente.

Uma coleção deve preferir um status agregado.

---

# 49. App.tsx

`AuthenticatedApp` deve deixar de possuir todas as mutations.

Extrair progressivamente:

```text
useTaskMutations
useCompanyMutations
useRoutineMutations
useScreenMutations
useCompetenceMutations
```

Alvo posterior:

```text
Page
↓
domain hook
↓
service
```

Não extrair apenas para diminuir o número de linhas. O objetivo é mover ownership do estado assíncrono para o domínio correto.

---

# 50. Não adicionar Redux/Zustand para server state

Manter `AuthContext` e `AppState` para estado de aplicação/cliente.

Usar TanStack Query para server state.

Store global adicional só deve ser considerado se surgir client state global real que não caiba nos contexts existentes.

---

# 51. Não duplicar source of truth

Durante a migração haverá período híbrido.

Evitar manter permanentemente:

```text
query cache
+
useState com cópia do mesmo recurso
```

Alvo:

```text
backend
→ query cache
→ UI
```

---

# 52. Regras para `setQueryData`

Usar quando:

- backend retorna recurso canônico;
- cache correspondente é identificável;
- não existem efeitos desconhecidos.

Atualizar imutavelmente.

Não modificar objetos cacheados in-place.

---

# 53. Regras para `invalidateQueries`

Usar quando:

- mutation altera derivados;
- backend possui efeito que frontend não consegue reconstruir seguramente;
- dado precisa ser confirmado.

Invalidar a menor key adequada.

```text
não:
invalidateQueries()

sim:
invalidateQueries(screenProjectionKey)
```

---

# 54. Quando ainda usar refresh operacional completo

Permitir somente função explicitamente nomeada, por exemplo:

```ts
refreshOperationalContext()
```

Usos:

- finalize competence;
- bulk import;
- mudança ampla de permission scope;
- operações excepcionais documentadas.

Não expor `reload()` genérico para qualquer componente.

---

# 55. Contratos da API

Para permitir boa UX, mutations devem preferencialmente retornar o recurso final.

Exemplo:

```text
PATCH /companies/:id
→ 200
→ ClientCompanyResource
→ ETag
```

Evitar `204` quando o recurso atualizado é útil ao frontend.

Exceções podem existir para commands cujo resultado é óbvio e não possui recurso natural de retorno.

---

# 56. ETag no cache

Quando a resposta recebe novo ETag:

```text
cache deve receber dados + versão nova
```

Evitar GET apenas para descobrir ETag se a própria response puder fornecê-lo.

---

# 57. Métricas de UX e observabilidade

Instrumentar durante a refatoração:

```text
mutation duration
query duration
number of full operational refreshes
number of targeted invalidations
error rate
412 rate
```

Opcionalmente usar `performance.mark`.

Objetivo:

- identificar operações lentas;
- ajustar política de loading;
- validar redução de refresh global.

---

# 58. Testes unitários prioritários

## `useRoutineControl`

Testar:

```text
initial load
→ isInitialLoading = true

response disponível + refresh
→ response permanece
→ isRefreshing = true

refresh sucesso
→ response substituído

refresh erro
→ resposta antiga preservada
→ erro de refresh disponível
```

---

# 59. Testes de mutation/cache

Para cada domínio:

```text
mutation sucesso
→ recurso atualizado no cache

mutation erro
→ cache preservado/rollback

mutation com derivada
→ somente query correta invalidada
```

---

# 60. Testes E2E essenciais

## Empresa

```text
ir até último step
criar
não voltar ao step 1
ver confirmação
empresa existir
```

## Erro de empresa

```text
submission falha
fields continuam
step continua
erro aparece
```

## Observação

```text
abrir task
salvar observação
dialog permanece
nenhum full-page loading
observação atualiza
```

## Status

```text
alterar status
card/lista atualizam
rota permanece
```

## Configurações

```text
abrir aba profunda
salvar
rota e aba permanecem
```

## Competência

```text
mudar competência
shell permanece
somente área operacional carrega
```

## Competência cacheada

```text
agosto
→ setembro
→ agosto

agosto reaparece sem full-page loading
```

## Finalização

```text
finalizar
shell permanece
refresh amplo ocorre
novo estado aparece
```

---

# 61. Teste contra remount indevido

Durante desenvolvimento, instrumentar temporariamente componentes críticos para verificar mount/unmount durante mutations e refetches.

Não manter logs de debug em produção.

---

# 62. Plano de implementação

## Fase 0 — Baseline

1. registrar os fluxos problemáticos;
2. adicionar testes E2E mínimos;
3. localizar todas as chamadas `reload`;
4. localizar todos os `if (loading) return ...`;
5. identificar componentes que limpam state no remount.

Entregável:

```text
mapa de reloads e loaders
```

## Fase 1 — Correção P0

Implementar:

- `isInitialLoading`;
- `isRefreshing`;
- response preservado durante refresh;
- `AuthenticatedApp` não desmonta em refresh;
- indicador discreto de refresh;
- formulário de empresa preservado.

Nesta fase ainda pode existir refresh global. O objetivo é parar a perda de contexto imediatamente.

## Fase 2 — Tasks

Migrar:

- transition status;
- assignee;
- due date;
- content;
- observation;
- links;
- ad-hoc create.

Objetivo:

```text
nenhuma mutation comum de Task chama refresh global
```

## Fase 3 — Empresas e rotinas

Migrar:

- create company;
- update company;
- archive company;
- assignments;
- create routine;
- update routine/version.

Adicionar success UX nos creates.

## Fase 4 — Screens, departamentos e funcionários

Migrar:

- create/update screen;
- projection invalidation;
- department updates;
- member updates;
- access updates.

## Fase 5 — TanStack Query

Se não tiver sido introduzido antes:

- `QueryClientProvider`;
- query keys;
- routine-control query;
- mutations prioritárias;
- targeted invalidation.

Migrar hooks existentes gradualmente.

## Fase 6 — Context cache

Implementar:

- cache por competência;
- cancelamento;
- prefetch opcional;
- background refetch.

## Fase 7 — Loading design system

Consolidar:

- AsyncButton;
- Spinner;
- Skeleton;
- SectionRefreshIndicator;
- BackgroundRefreshBar;
- status messaging;
- reduced motion.

## Fase 8 — Operações amplas

Aplicar o padrão de broad refresh sem desmontagem para finalização da competência e futuras operações em lote.

## Fase 9 — Cleanup

Remover:

```text
reload genérico
isLoading global
setResponse manual espalhado
duplicação de estados
loaders antigos
callbacks onReload genéricos
```

---

# 63. Ordem de PRs recomendada

```text
PR 1
Split initial loading / refreshing

PR 2
Preserve AppLayout + routes during refresh

PR 3
Task mutations without reload

PR 4
Create company/routine success + no blocking reload

PR 5
Company/routine mutations targeted

PR 6
Screen/settings targeted refresh

PR 7
TanStack Query foundation

PR 8+
Migrate domains to Query cache

PR final
Remove legacy reload architecture
```

Se TanStack Query for introduzido cedo, PRs 3–6 podem já usar a nova infraestrutura.

---

# 64. Critérios de aceite globais

- [ ] Nenhuma mutation comum mostra loading de página inteira.
- [ ] `AppLayout` permanece montado durante background refresh.
- [ ] Formulários multi-step não perdem etapa devido a refetch.
- [ ] Drawers/modals não fecham devido a revalidação.
- [ ] Criar empresa apresenta confirmação inequívoca.
- [ ] Criar rotina apresenta resultado inequívoco.
- [ ] Task status atualiza sem refresh operacional completo.
- [ ] Task fields atualizam somente a Task.
- [ ] Company edit atualiza somente Company e derivadas necessárias.
- [ ] Routine edit possui invalidação proporcional.
- [ ] Screen composition revalida apenas screen/projection.
- [ ] Assignments deixam de executar reload global + local.
- [ ] Finalização da competência mantém a UI montada.
- [ ] Troca de competência não desmonta o shell.
- [ ] Competências podem usar cache independente.
- [ ] Requests antigas não sobrescrevem contexto novo.
- [ ] Erros preservam os dados digitados.
- [ ] ETag conflicts não provocam reload global.
- [ ] Loading indicators são localizados.
- [ ] Skeleton só substitui conteúdo sem dados utilizáveis.
- [ ] Background refresh não troca conteúdo válido por skeleton.
- [ ] Reduced motion é respeitado.
- [ ] Feedback assíncrono é acessível.
- [ ] Testes E2E protegem os fluxos críticos.

---

# 65. Anti-patterns proibidos

Não adicionar código novo semelhante a:

```ts
await mutation()
await reload()
```

sem justificativa documentada.

Não adicionar:

```tsx
if (isAnythingLoading) {
  return <FullPageLoading />
}
```

em componente alto da árvore para mutations locais.

Não passar genericamente:

```tsx
onReload = { reload }
```

Não usar `window.location.reload()` para sincronizar dados.

Não limpar dados existentes antes de background refetch.

Não usar overlay cinza global para salvar um campo.

Não fechar formulário antes da mutation terminar.

Não resetar form automaticamente após sucesso sem mostrar resultado ou navegar para o recurso criado.

---

# 66. Arquitetura alvo

```text
                           App
                            │
                    Auth / Membership
                            │
                            ▼
                     Persistent Shell
                            │
                    React Router routes
                            │
          ┌─────────────────┴─────────────────┐
          │                                   │
       UI state                           Server state
          │                                   │
    forms / dialogs                     TanStack Query
    tabs / draft                             │
    local selection                 ┌────────┴────────┐
                                    │                 │
                                  Query            Mutation
                                    │                 │
                               cached data      API response
                                    │                 │
                                    │          setQueryData
                                    │                 │
                                    └──── targeted invalidation
```

A camada de services continua existindo:

```text
TanStack Query
↓
companyService / taskService / routineService
↓
httpClient
↓
Django API
```

TanStack Query não substitui services.

Ele substitui principalmente:

```text
loading manual
cache manual
reload manual
invalidation manual espalhada
```

---

# 67. Decisões finais

## Adotar

- cache de server state;
- TanStack Query incremental;
- local update por resposta da mutation;
- targeted invalidation;
- optimistic updates selecionados;
- cache por competência;
- AbortSignal;
- loaders localizados;
- skeleton para primeira carga de regiões;
- progress feedback quando mensurável;
- success state explícito em criação;
- errors localizados;
- App shell persistente.

## Não adotar

- Redux/Zustand apenas para dados do backend;
- big-bang rewrite;
- full-page spinner para CRUD;
- porcentagem falsa;
- reload genérico;
- duplicação permanente entre Query cache e `useState`;
- skeleton em background refresh;
- fechar UI para "forçar consistência".

---

# 68. Prioridade executiva

Se apenas três mudanças puderem ser feitas primeiro:

### 1. Separar loading inicial de refresh

```text
isInitialLoading
isRefreshing
```

E impedir desmontagem durante refresh.

### 2. Remover `reload()` de Task mutations e dos formulários de criação

Usar a resposta da API para atualizar estado/cache.

### 3. Introduzir política explícita de cache/revalidação

Preferencialmente TanStack Query, antes das próximas grandes funcionalidades.

Essas três mudanças eliminam o problema mais grave e criam a base necessária para dashboards, anexos, integrações e automações sem multiplicar estados de carregamento inconsistentes.

---

# 69. Observação sobre React `startTransition`

`startTransition` pode ser útil pontualmente para grandes atualizações de render, como substituir uma planilha extensa depois que novos dados chegaram, mantendo inputs e interações urgentes responsivas.

Não usar `startTransition` como solução para network state ou cache.

Não usar Transition para controlar campos de texto.

Referência:

- https://react.dev/reference/react/startTransition

---

# 70. Referências principais

## React / React Router

- Pending UI — https://reactrouter.com/start/framework/pending-ui
- Form vs Fetcher — https://reactrouter.com/explanation/form-vs-fetcher
- Fetchers — https://reactrouter.com/how-to/fetchers
- Race Conditions — https://reactrouter.com/explanation/race-conditions
- React startTransition — https://react.dev/reference/react/startTransition

## TanStack Query

- Updates from Mutation Responses — https://tanstack.com/query/latest/docs/framework/react/guides/updates-from-mutation-responses
- Invalidations from Mutations — https://tanstack.com/query/latest/docs/framework/react/guides/invalidations-from-mutations
- Optimistic Updates — https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates
- Query Cancellation — https://tanstack.com/query/latest/docs/framework/react/guides/query-cancellation
- Query Keys — https://tanstack.com/query/latest/docs/framework/react/guides/query-keys
- Placeholder Query Data — https://tanstack.com/query/latest/docs/framework/react/guides/placeholder-query-data

## GitHub Primer

- Loading — https://primer.style/product/ui-patterns/loading/
- Saving — https://primer.style/product/ui-patterns/saving/
- Navigation — https://primer.style/product/ui-patterns/navigation/
- Notification messaging — https://primer.style/product/ui-patterns/notification-messaging/
- Create — https://primer.style/product/scenario-patterns/create/
- Degraded experiences — https://primer.style/product/ui-patterns/degraded-experiences/

## Atlassian

- Button loading state — https://atlassian.design/guidelines/product/components/buttons
- Skeleton — https://atlassian.design/components/skeleton
- Spinner — https://atlassian.design/components/spinner/
- Progress bar — https://atlassian.design/components/progress-bar/
- Accessibility — https://atlassian.design/foundations/accessibility
