# Sistema de Controle de Rotinas Contábeis

## Documento de Casos de Uso, Fluxos e Protótipos (MVP)

---

# 1. Visão Geral

## Objetivo

Desenvolver um sistema de controle de rotinas para uma empresa contábil específica, focado em:

- Organização operacional;
- Distribuição de tarefas;
- Acompanhamento gerencial;
- Rastreabilidade;
- Facilidade de uso;
- Substituição gradual do uso de planilhas.

O sistema deve priorizar velocidade operacional e simplicidade visual, evitando navegação excessiva entre telas.

---

# 2. Escopo do MVP

## Incluído

- Autenticação
- Cadastro de Empresas
- Cadastro de Funcionários
- Cadastro de Departamentos
- Definição de Líderes
- Cadastro de Rotinas Modelo
- Geração Automática de Tasks
- Atribuição de Tasks
- Dashboard Gerencial
- Tela Operacional do Funcionário
- Comentários
- Avisos
- Histórico
- Upload de Arquivos

## Não Incluído

- Integrações externas
- Aplicativo mobile
- Automações por IA
- Relatórios avançados
- API pública
- Integrações governamentais

---

# 3. Perfis de Usuário

## Manager

Responsável pela administração geral do sistema.

Permissões:

- Cadastro de clientes
- Cadastro de departamentos
- Cadastro de funcionários
- Configuração de rotinas
- Visualização global
- Reatribuição de tarefas

---

## Líder de Departamento

Responsável pela gestão operacional do setor.

Permissões:

- Visualizar tarefas do departamento
- Atribuir responsáveis
- Reatribuir tarefas
- Acompanhar andamento

---

## Funcionário

Responsável pela execução das rotinas.

Permissões:

- Visualizar tarefas atribuídas
- Atualizar status
- Anexar arquivos
- Adicionar comentários
- Enviar avisos

---

# 4. Casos de Uso

## UC01 – Login

### Ator Principal

Todos os usuários

### Fluxo Principal

1. Usuário acessa a tela de login.
2. Informa e-mail.
3. Informa senha.
4. Sistema valida credenciais.
5. Sistema redireciona para o dashboard correspondente.

### Pós-Condição

Usuário autenticado.

---

## UC02 – Cadastrar Empresa

### Ator

Manager

### Fluxo Principal

1. Acessa área de empresas.
2. Seleciona nova empresa.
3. Informa dados.
4. Salva cadastro.

### Pós-Condição

Empresa disponível para geração de rotinas.

---

## UC03 – Cadastrar Funcionário

### Ator

Manager

### Fluxo Principal

1. Acessa área de funcionários.
2. Informa dados.
3. Define departamento.
4. Salva cadastro.

---

## UC04 – Cadastrar Departamento

### Ator

Manager

### Fluxo Principal

1. Acessa área de departamentos.
2. Informa nome.
3. Salva cadastro.

---

## UC05 – Definir Líder

### Ator

Manager

### Fluxo Principal

1. Seleciona departamento.
2. Escolhe funcionário.
3. Define como líder.

---

## UC06 – Cadastrar Rotina Modelo

### Ator

Manager

### Fluxo Principal

1. Acessa área de rotinas.
2. Cria nova rotina.
3. Define parâmetros.
4. Salva.

---

## UC07 – Gerar Rotinas

### Ator

Sistema

### Fluxo Principal

1. Sistema identifica empresas ativas.
2. Avalia parâmetros.
3. Localiza rotinas aplicáveis.
4. Gera tasks.
5. Define departamento responsável.
6. Define status inicial.

### Pós-Condição

Tasks criadas como Pendente.

---

## UC08 – Atribuir Task

### Ator

Líder

### Fluxo Principal

1. Abre lista de tarefas.
2. Seleciona tarefa.
3. Escolhe responsável.
4. Salva.

### Pós-Condição

Histórico atualizado.

---

## UC09 – Visualizar Minhas Tasks

### Ator

Funcionário

### Fluxo Principal

1. Acessa sistema.
2. Sistema exibe tarefas pendentes.
3. Usuário aplica filtros opcionais.

---

## UC10 – Executar Task

### Ator

Funcionário

### Fluxo Principal

1. Abre tarefa.
2. Consulta detalhes.
3. Adiciona comentários.
4. Anexa documentos.
5. Atualiza status.

### Pós-Condição

Histórico atualizado.

---

## UC11 – Enviar Aviso

### Ator

Funcionário

### Fluxo Principal

1. Abre task.
2. Seleciona enviar aviso.
3. Escolhe destinatário.
4. Digita mensagem.
5. Envia.

### Pós-Condição

Aviso registrado.

---

## UC12 – Visualizar Dashboard

### Ator

Manager

### Fluxo Principal

1. Acessa dashboard.
2. Visualiza indicadores.
3. Analisa operação.

---

# 5. Fluxos Operacionais

## Fluxo Principal do Sistema

Empresa
↓
Parâmetros
↓
Rotina Modelo
↓
Geração de Task
↓
Departamento
↓
Atribuição
↓
Execução
↓
Conclusão

---

## Fluxo de Comunicação

Funcionário
↓
Aviso
↓
Líder ou Manager
↓
Resposta
↓
Histórico

---

## Fluxo de Alteração de Status

Pendente
↓
Em Espera

Pendente
↓
Erro/Problema

Pendente
↓
Concluído

Pendente
↓
Cancelado

---

# 6. Estados da Task

## Pendente

Aguardando execução.

---

## Em Espera

Dependente de evento externo.

---

## Concluído

Executada com sucesso.

---

## Erro/Problema

Existe impedimento.

---

## Cancelado

Não será executada.

---

# 7. Protótipos

---

# PT01 – Login

## Objetivo

Permitir autenticação.

## Componentes

- Campo E-mail
- Campo Senha
- Botão Entrar
- Recuperar Senha

---

# PT02 – Dashboard

## Objetivo

Apresentar visão inicial.

## Componentes

### Manager

- Total pendentes
- Total concluídas
- Total em espera
- Total com problema
- Total canceladas
- Atrasadas
- Próximas do vencimento

### Líder

- Pendentes do setor
- Sem responsável
- Avisos

### Funcionário

- Minhas pendentes
- Minhas atrasadas
- Avisos

---

# PT03 – Tela Operacional Principal

## Objetivo

Centralizar execução das rotinas.

## Conceito

Não utilizar navegação por mês.

Não utilizar abas por rotina.

Exibir todas as tarefas em uma única tela.

---

## Filtros Superiores

- Mês
- Cliente
- Rotina
- Status
- Responsável
- Pesquisa

[PREENCHER]

---

## Seção 1 – Requer Atenção

Contém:

- Erro/Problema
- Atrasadas

Expandida por padrão.

---

## Seção 2 – Em Espera

Contém tarefas aguardando retorno.

Expandida por padrão.

---

## Seção 3 – Pendentes

Contém tarefas operacionais.

Expandida por padrão.

---

## Seção 4 – Concluídas

Recolhida por padrão.

---

## Card da Task

Campos visíveis:

- Código do Cliente
- Nome do Cliente
- Rotina
- Prazo
- Status
- Responsável
- Indicador de anexos
- Indicador de comentários
- Indicador de avisos

Ações:

- Abrir
- Anexar
- Alterar Status

[PREENCHER]

---

# PT04 – Detalhe da Task

## Objetivo

Executar atividade.

## Componentes

### Cabeçalho

- Cliente
- Rotina
- Departamento
- Responsável
- Prazo

---

### Informações

- Descrição
- Observações

---

### Comentários

Lista cronológica.

---

### Arquivos

Lista de anexos.

---

### Avisos

Histórico de comunicação.

---

### Histórico

Linha do tempo completa.

---

# PT05 – Tela de Atribuição

## Objetivo

Distribuição de tarefas.

## Componentes

- Lista de tarefas
- Filtros
- Seleção de responsável
- Reatribuição

[PREENCHER]

---

# PT06 – Cadastro de Empresas

## Componentes

- Código Interno
- Razão Social
- Nome Fantasia
- CNPJ
- Regime Tributário
- Status
- Observações

---

## Parâmetros Operacionais

[PREENCHER]

---

# PT07 – Cadastro de Rotinas Modelo

## Componentes

- Nome
- Departamento
- Periodicidade
- Prazo
- Regras de aplicação
- Observações

---

## Regras de Aplicação

[PREENCHER]

---

# PT08 – Dashboard Gerencial

## Indicadores

- Pendentes
- Concluídas
- Em Espera
- Problemas
- Canceladas
- Atrasadas
- Próximas do vencimento

---

## Visões

Por Departamento

Por Funcionário

Por Cliente

[PREENCHER]

---

# 8. Regras de Negócio

RN01 – Toda task pertence a um cliente.

RN02 – Toda task pertence a um departamento.

RN03 – Toda task possui histórico obrigatório.

RN04 – Alteração de status gera histórico.

RN05 – Alteração de responsável gera histórico.

RN06 – Avisos geram histórico.

RN07 – Apenas Manager cadastra empresas.

RN08 – Apenas Manager cadastra departamentos.

RN09 – Apenas Manager define líderes.

RN10 – Líder só gerencia tarefas do próprio departamento.

RN11 – Funcionário altera apenas tarefas atribuídas a ele.

RN12 – Toda task inicia como Pendente.

RN13 – [PREENCHER]

RN14 – [PREENCHER]

RN15 – [PREENCHER]

---

# 9. Decisões de UX

- Priorizar uma única tela operacional.
- Evitar excesso de menus.
- Evitar múltiplas abas aninhadas.
- Utilizar filtros ao invés de navegação profunda.
- Separar tarefas por estado.
- Mostrar primeiro tarefas que exigem atenção.
- Permitir visualização alternativa em grade para líderes e gestores.

---

# 10. Itens em Aberto

## Estrutura completa dos parâmetros de clientes

[PREENCHER]

---

## Estrutura completa das rotinas modelo

[PREENCHER]

---

## Regras de geração automática

[PREENCHER]

---

## Política de notificações

[PREENCHER]

---

## Controle de permissões avançadas

[PREENCHER]

---

## Indicadores gerenciais avançados

[PREENCHER]
