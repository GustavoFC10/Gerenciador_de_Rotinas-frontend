# Interface Geral do Sistema - Analise para o MVP

Este documento consolida a proposta de interface do MVP para o sistema de controle de rotinas. A ideia central e clara: a planilha operacional e a parte mais importante do produto, mas ela precisa conviver com listas, tarefas avulsas, dashboards simples, cadastros e configuracoes de perfil sem virar uma navegacao confusa.

## Direcao Principal do MVP

A direcao mais forte para o MVP e:

- A planilha do departamento como centro operacional.
- Funcionarios acessam apenas as planilhas dos seus departamentos.
- A home facilita chegar rapidamente na planilha.
- Listas funcionam como visualizacao de foco: rotina especifica, empresa especifica, busca, minhas tarefas, lista global.
- Tarefas avulsas usam o mesmo formato visual da lista.
- Lideres recebem ferramentas de acompanhamento e manutencao do departamento.
- Manager recebe tudo dos lideres, mais cadastros administrativos e dashboard completo.
- Perfil existe desde o inicio, mesmo simples, para evitar redesenho depois.

## Perfis e Permissoes

### Funcionario

Deve acessar:

- Home com atalho claro para a planilha do departamento.
- Planilha do departamento.
- Minhas tarefas.
- Tarefas avulsas atribuidas a ele.
- Listas acessadas pela planilha.
- Busca dentro do seu escopo.
- Perfil.

Nao deve acessar:

- Dashboard gerencial completo.
- Cadastro de funcionarios.
- Gerenciamento de cargos.
- Edicao ampla de rotinas, empresas e prazos, salvo se houver permissao especifica.

Observacao:

- Se o funcionario pertence a mais de um departamento, o menu lateral pode listar uma planilha por departamento.

### Lider de Departamento

Deve acessar tudo do funcionario, mais:

- Dashboard simples do departamento.
- Cadastro/edicao de rotinas do departamento.
- Cadastro/edicao de empresas, se isso fizer parte da operacao do setor.
- Designacao de tarefas.
- Alteracao de prazos.
- Listagem de funcionarios do departamento.

Cuidados:

- O lider nao precisa ver dados de departamentos sem relacao com ele.
- Acoes de prazo e responsavel precisam gerar historico.

### Manager

Deve acessar tudo do lider, mais:

- Dashboard completo.
- Visao entre departamentos.
- Cadastro de funcionarios.
- Gerenciamento de cargos.
- Configuracoes globais.
- Todos os departamentos.

Cuidados:

- O manager pode ter muitas telas; o menu precisa separar operacao, gestao e administracao.

## Home

### Melhor abordagem para o MVP

A home nao deve ser uma landing page e tambem nao precisa ser um dashboard complexo no primeiro momento. Ela deve ser uma tela operacional de entrada com atalhos.

Estrutura sugerida:

```text
Home
- Saudacao/contexto do usuario
- Competencia ativa
- Atalho principal: abrir planilha do departamento
- Minhas tarefas pendentes
- Erros/pendencias que exigem atencao
- Atalhos secundarios: lista global, busca, nova tarefa
```

Vantagens:

- Nao joga o usuario direto em uma planilha gigante sem contexto.
- Ainda mantem a planilha como centro do sistema.
- Funciona para funcionario e lider.
- Pode evoluir para dashboard por perfil.

Alternativas analisadas:

- Planilha como home direta: muito eficiente, mas pode ser brusca e pouco orientadora.
- Dashboard como home: bom para manager/lider, mas menos util para funcionario no MVP.
- Perfil como home: nao recomendado; perfil e configuracao, nao operacao.

Recomendacao:

- Home operacional com atalho muito forte para a planilha.
- Para usuarios que preferirem, futuramente permitir "abrir direto na planilha" como preferencia de perfil.

## Competencia Ativa

A navegacao por competencia e essencial.

Formato sugerido:

```text
< 06/2026 >
```

Onde colocar:

- No topo da aplicacao, proximo ao titulo ou ao lado dos filtros.
- Deve ser sempre visivel nas telas de rotina.

Comportamento:

- Seta esquerda volta uma competencia.
- Seta direita avanca uma competencia.
- Clicar no mes abre seletor de mes/ano.
- Trocar competencia recarrega planilha, listas e dashboards.

Cuidados:

- Confirmar antes de sair se houver edicao nao salva.
- Mostrar claramente quando a competencia e passada, atual ou futura.

## Navegacao Principal

### Recomendacao: menu lateral + topo leve

Para esse sistema, a melhor direcao e uma navegacao hibrida:

- Menu lateral para areas principais.
- Topo para competencia, busca, perfil e contexto.

Motivo:

- O sistema tende a crescer.
- Perfis diferentes veem menus diferentes.
- Planilha precisa de largura, entao o menu lateral deve poder recolher.

## Menu Lateral

### Estrutura para Funcionario

```text
Operacao
- Home
- Planilha - Fiscal
- Planilha - Contabil
- Minhas tarefas
- Busca
- Lista global

Perfil
- Meu perfil
```

Se o usuario tiver um unico departamento:

```text
Operacao
- Home
- Planilha
- Minhas tarefas
- Busca
- Lista global
```

Se tiver mais de um departamento:

```text
Planilhas
- Fiscal
- Contabil
- Departamento Pessoal
```

Vantagem:

- Acesso direto ao que o funcionario usa diariamente.

Cuidados:

- Nao listar departamentos sem permissao.
- Evitar duplicar "Planilha" e "Rotinas" se apontarem para a mesma coisa.

### Estrutura para Lider

```text
Operacao
- Home
- Planilha do departamento
- Minhas tarefas
- Busca
- Lista global

Gestao do departamento
- Dashboard
- Designacao de tarefas
- Rotinas
- Empresas
- Funcionarios
```

Vantagem:

- Separa execucao diaria de gestao.

Cuidados:

- "Designacao de tarefas" pode ser uma tela propria ou um modo/filtro dentro da lista global. Se o MVP precisa ser mais simples, comecar como filtro "Sem responsavel" pode ser melhor.

### Estrutura para Manager

```text
Operacao
- Home
- Planilhas
- Minhas tarefas
- Busca
- Lista global

Gestao
- Dashboard geral
- Departamentos
- Empresas
- Rotinas
- Funcionarios

Administracao
- Cargos
- Permissoes
- Configuracoes
```

Vantagem:

- Escala bem.
- Separa administracao de operacao.

Cuidados:

- "Permissoes" pode ficar para depois se o MVP ainda nao tiver controle fino.

## Topo da Aplicacao

Elementos recomendados:

- Nome da tela atual.
- Competencia: `< 06/2026 >`.
- Busca rapida ou botao de busca.
- Perfil no canto direito.
- Indicador discreto de salvamento/sincronizacao, quando existir.

Perfil no canto direito:

- Foto ou iniciais.
- Nome do usuario.
- Cargo/papel.
- Menu:
  - Meu perfil.
  - Preferencias.
  - Sair.

Preferencias iniciais:

- Foto.
- Nome exibido.
- Tema.
- Visualizacao padrao: planilha/lista/home.
- Densidade: compacta/confortavel.

Pensando em escala:

- Mais tarde o perfil pode receber notificacoes, seguranca, preferencias de dashboard e filtros salvos.

## Planilha Operacional

A planilha e o centro do sistema.

Funcoes:

- Mostrar empresas x rotinas.
- Mostrar status por celula.
- Clicar na celula abre detalhe da tarefa.
- Clicar na coluna/rotina abre lista de empresas daquela rotina.
- Clicar na linha/empresa abre lista de rotinas daquela empresa.

Vantagens:

- Visao macro excelente.
- Facil de comparar progresso entre empresas.
- Boa para lideres e gestores.

Cuidados:

- Pode ficar larga.
- Precisa de scroll horizontal bem resolvido.
- A primeira coluna deve ficar fixa.
- A competencia deve estar sempre visivel.

## Listas

As listas devem ser o formato de foco e execucao.

Tipos de lista:

- Lista de empresas de uma rotina.
- Lista de rotinas de uma empresa.
- Lista global.
- Lista de busca.
- Minhas tarefas.
- Tarefas avulsas.
- Lista por status.
- Lista por responsavel.

Regra importante:

- Todas devem usar o mesmo sistema visual de lista, mudando apenas titulo, filtros e campos principais.

Vantagens:

- Reaproveita componentes.
- Mantem consistencia.
- Facilita mobile.
- Facilita busca e foco.

## Minhas Tarefas

Ideia proposta:

- Lista com tarefas avulsas, sem necessariamente ter rotina e/ou empresa.

Analise:

- A ideia e boa, mas o nome "Minhas tarefas" pode misturar duas coisas:
  - tarefas atribuidas ao usuario;
  - tarefas avulsas.

Sugestao:

- "Minhas tarefas" deve mostrar tudo atribuido ao usuario, incluindo:
  - tarefas de rotina;
  - tarefas avulsas;
  - tarefas sem empresa;
  - tarefas sem rotina.

Se precisar separar:

```text
Minhas tarefas
- Todas
- Avulsas
- Rotinas
```

Botao:

- "Nova tarefa" dentro de Minhas tarefas.

Interface de nova tarefa:

- Parecida com criar rotina, mas mais simples.
- Campos:
  - Titulo.
  - Descricao/observacao.
  - Empresa opcional.
  - Rotina opcional.
  - Departamento.
  - Responsavel.
  - Prazo.
  - Competencia.

Cuidados:

- Tarefa avulsa nao deve exigir rotina.
- Se nao houver empresa, exibir "Sem empresa".
- Se nao houver rotina, exibir "Sem rotina".

## Busca

Ideia proposta:

- Tela de busca no menu lateral que mostra resultados no mesmo formato da lista.

Analise:

- Boa ideia.
- Evita criar telas especificas para cada consulta.
- Pode pesquisar empresa, rotina, tarefa, observacao e responsavel.

Recomendacao:

- Criar uma tela "Busca" que usa o mesmo componente de lista.
- Campo de busca no topo.
- Filtros avancados recolhidos.
- Resultado agrupado por status.

Cuidados:

- Busca global pode ser mais complexa que parece.
- No MVP, comecar buscando em tarefas/empresas/rotinas carregadas no frontend.

## Lista Global

Funcao:

- Mostrar todas as tarefas acessiveis ao usuario.

Para funcionario:

- Apenas tarefas do seu escopo.

Para lider:

- Tarefas do departamento.

Para manager:

- Todas as tarefas.

Vantagens:

- Serve como "central de trabalho".
- Ajuda filtros por status, prazo e responsavel.

Cuidados:

- Precisa de filtros fortes.
- Sem filtros, pode virar lista grande demais.

## Botao "Novo" vs Menus "Rotinas" e "Empresas"

Ideia proposta:

- Um botao "Novo" para criar/adicionar rotinas e empresas.
- Ou botoes separados "Rotinas" e "Empresas" para visualizar, editar e criar cada uma.

Analise:

- Um botao "Novo" e bom para acao rapida.
- Mas ele nao resolve bem visualizacao/edicao.
- Para cadastros importantes, telas proprias tendem a ser melhores.

Recomendacao:

- Para lider/manager, ter menus:
  - Rotinas.
  - Empresas.
- Dentro de cada tela, ter botao:
  - Nova rotina.
  - Nova empresa.

Opcional:

- Um botao global "Novo" no topo ou menu lateral pode abrir um menu:

```text
Novo
- Nova tarefa
- Nova rotina
- Nova empresa
```

Cuidados:

- Nao depender apenas do botao "Novo" para editar/ver cadastros.
- Edicao e visualizacao devem existir nas telas de Rotinas e Empresas.

## Cadastro de Rotina

Para lider:

- Criar rotinas do departamento.
- Editar nome, descricao, periodicidade, prazo padrao e regras.

Campos iniciais:

- Nome.
- Departamento.
- Periodicidade.
- Prazo padrao.
- Descricao.
- Ativa/inativa.

Cuidados:

- Rotina modelo nao e tarefa.
- Deve ficar claro se alterar a rotina afeta tarefas ja geradas ou apenas futuras.

## Cadastro de Empresa

Para lider/manager:

- Criar empresa.
- Editar dados basicos.
- Definir quais rotinas se aplicam.

Campos iniciais:

- Codigo.
- Razao social.
- Nome fantasia.
- CNPJ.
- Regime tributario.
- Status.
- Rotinas aplicaveis.

Cuidados:

- Empresa precisa ter codigo interno unico.
- Associar rotina a empresa pode ser parte essencial da configuracao.

## Designacao de Tarefas

Alternativas:

### Tela propria

Vantagens:

- Boa para lider trabalhar em lote.
- Pode mostrar tarefas sem responsavel.

Desvantagens:

- Mais uma tela no MVP.

### Filtro dentro da Lista Global

Vantagens:

- Reaproveita lista.
- Menos complexidade.
- Bom para MVP.

Desvantagens:

- Pode ficar menos especializado.

Recomendacao:

- No MVP, comecar como filtro "Sem responsavel" na Lista Global.
- Se virar rotina frequente, evoluir para tela "Designacao".

## Alteracao de Prazos

Pode acontecer:

- Dentro do detalhe da tarefa.
- Em lote na lista global.
- Em tela de designacao/gestao.

Recomendacao:

- MVP: alterar prazo no detalhe.
- Lider: permitir alterar prazo em tarefas do departamento.
- Manager: permitir alterar prazo em qualquer departamento.

Futuro:

- Alteracao em lote com confirmacao.

Cuidados:

- Sempre registrar historico.
- Diferenciar prazo padrao da rotina e prazo especifico da tarefa.

## Dashboard do Lider

Objetivo:

- Mostrar progresso do departamento sem virar BI complexo.

Melhor abordagem para MVP:

```text
Dashboard do Departamento
- Progresso geral da competencia
- Tarefas por status
- Rotinas com mais atraso/erro
- Empresas com mais pendencias
- Tarefas sem responsavel
- Proximos vencimentos
```

Visualizacoes recomendadas:

- Cards pequenos de contagem.
- Barra de progresso por rotina.
- Lista curta de maiores problemas.
- Tabela simples "Rotina x status".

Evitar no MVP:

- Graficos complexos demais.
- Comparativos historicos longos.
- Muitas abas de dashboard.

Sugestao:

- Comecar com uma tela unica de dashboard.
- Permitir clicar nos indicadores para abrir lista filtrada.

## Dashboard do Manager

Objetivo:

- Dar visao da empresa contábil como um todo.

Possiveis visualizacoes:

- Progresso geral por departamento.
- Status total por departamento.
- Ranking de departamentos com mais pendencias.
- Empresas com maior volume de problemas.
- Responsaveis mais sobrecarregados.
- Tarefas atrasadas.
- Tarefas sem responsavel.
- Evolucao por competencia, futuramente.

MVP:

- Cards globais.
- Progresso por departamento.
- Lista de maiores riscos.
- Atalhos para listas filtradas.

Futuro:

- Historico.
- Comparacao entre competencias.
- Exportacao.

Cuidados:

- Dashboard completo demais pode atrasar o MVP.
- Melhor comecar clicavel e operacional, nao apenas visual.

## Listagem de Funcionarios

Para lider:

- Listar funcionarios do departamento.
- Ver carga de tarefas.
- Ver tarefas em andamento/pendentes.

Para manager:

- Listar todos.
- Criar/editar funcionarios.
- Gerenciar cargos.

MVP:

- Lider pode ter listagem somente leitura ou limitada.
- Manager pode editar.

## Gerenciamento de Cargos

Manager:

- Criar cargos.
- Associar permissões.
- Definir se cargo e manager, lider ou funcionario.

MVP simplificado:

- Usar papeis fixos inicialmente:
  - Manager.
  - Lider.
  - Funcionario.

Futuro:

- Cargos customizaveis.
- Permissoes granulares.

Recomendacao:

- Nao tornar cargos customizaveis cedo demais se isso atrasar o MVP.
- Criar a tela pensando em evolucao, mas com regras simples no inicio.

## Perfil

MVP:

- Foto.
- Nome exibido.
- Email.
- Tema.
- Densidade da interface.
- Preferencia de tela inicial.

Futuro:

- Notificacoes.
- Filtros salvos.
- Atalhos pessoais.
- Preferencias de dashboard.
- Seguranca e senha.

Vantagem:

- Perfil simples cria base para personalizacao futura.

Cuidados:

- Perfil nao deve virar deposito de configuracoes do sistema.
- Configuracoes globais devem ficar em Administracao.

## Elementos Visuais Importantes

Elementos permanentes:

- Menu lateral.
- Topo com competencia.
- Perfil no canto direito.
- Conteudo principal.
- Estados de carregamento, vazio e erro.

Elementos operacionais:

- Planilha.
- Lista.
- Modal/painel de detalhe.
- Filtros.
- Chips de filtro ativo.
- Indicadores compactos.
- Botoes de acao rapida.

Elementos de cadastro:

- Formularios.
- Validacao.
- Estados ativo/inativo.
- Historico de alteracoes, se necessario.

Elementos de feedback:

- Toast de salvamento.
- Confirmacao para acoes sensiveis.
- Indicador de carregamento.
- Mensagem de erro clara.
- Estado vazio com acao sugerida.

## O Que Nao Parece Necessario Agora

### Dashboard complexo logo no inicio

Motivo:

- Pode atrasar o MVP.
- A planilha e as listas ja resolvem muita coisa.

Melhor abordagem:

- Dashboard simples e clicavel.
- Evoluir conforme uso real.

### Permissoes customizadas demais

Motivo:

- Cargos granulares podem aumentar muito a complexidade.

Melhor abordagem:

- Comecar com 3 papeis.
- Estruturar codigo para evoluir depois.

### Botao unico "Novo" como unica entrada de cadastro

Motivo:

- Facilita criar, mas dificulta encontrar e editar.

Melhor abordagem:

- Ter telas Rotinas e Empresas.
- Opcionalmente ter botao "Novo" como atalho.

### Notificacoes completas no MVP

Motivo:

- Pode gerar ruido.
- Exige regras de leitura, prioridade e destinatarios.

Melhor abordagem:

- Comecar com indicadores de erro, atraso e sem responsavel.

## Arquitetura Sugerida de Telas

### Funcionario

```text
Home
Planilha do departamento
Minhas tarefas
Busca
Lista global
Perfil
```

### Lider

```text
Home
Planilha do departamento
Minhas tarefas
Busca
Lista global
Dashboard do departamento
Rotinas
Empresas
Funcionarios
Perfil
```

### Manager

```text
Home
Planilhas
Minhas tarefas
Busca
Lista global
Dashboard geral
Departamentos
Rotinas
Empresas
Funcionarios
Cargos
Configuracoes
Perfil
```

## Fluxo Recomendado

### Pela planilha

```text
Home
-> Planilha do departamento
-> Clique em rotina
-> Lista de empresas daquela rotina
-> Abre tarefa
-> Executa/acompanhamento
```

### Pela empresa

```text
Planilha
-> Clique em empresa
-> Lista de rotinas daquela empresa
-> Abre tarefa
```

### Pela busca

```text
Menu lateral
-> Busca
-> Resultados em formato de lista
-> Abre tarefa
```

### Por tarefa avulsa

```text
Minhas tarefas
-> Nova tarefa
-> Preenche campos opcionais
-> Tarefa aparece na lista
```

## Recomendacao Final Para o MVP

Implementar primeiro:

1. Layout com menu lateral e topo com competencia.
2. Home operacional com atalho para planilha.
3. Planilha do departamento.
4. Lista reutilizavel.
5. Clique em rotina/empresa abrindo lista filtrada.
6. Minhas tarefas com suporte a tarefas avulsas.
7. Perfil simples.
8. Dashboard simples do lider.
9. Cadastros de rotinas e empresas.

Depois:

1. Designacao em lote.
2. Dashboard completo do manager.
3. Cadastro de funcionarios.
4. Gerenciamento de cargos.
5. Busca global mais avancada.
6. Preferencias salvas por usuario.

Essa ordem mantem a planilha como produto principal, mas cria a estrutura certa para o sistema crescer sem precisar redesenhar toda a navegacao.
