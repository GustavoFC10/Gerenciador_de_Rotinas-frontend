# Implementação da nova tela de Configurações

## Objetivo

Refatorar completamente a tela de **Configurações da organização** para eliminar a navegação atual em múltiplas colunas/painéis aninhados.

A nova estrutura deve priorizar:

- área principal ampla para conteúdo;
- navegação consistente;
- separação clara entre categorias de configuração;
- páginas próprias para entidades complexas;
- no máximo uma navegação global de configurações + uma navegação local curta;
- nenhuma cadeia de sidebars ou painéis laterais aninhados.

Esta tela é exclusiva para configurações da **organização/escritório**.  
Configurações pessoais de usuário, conta, aparência ou preferências individuais **não fazem parte desta implementação**.

---

# 1. Regra principal de layout

## Não manter o layout atual

Remover qualquer estrutura equivalente a:

```text
Configurações
  → categoria em painel
    → departamento em outro painel
      → configuração em outro painel
        → conteúdo final comprimido
```

Não criar:

- sidebar dentro de sidebar;
- lista de departamentos fixa ao lado de tabs;
- lista de telas fixa ao lado da configuração da tela;
- múltiplos painéis verticais simultâneos;
- navegação diferente para cada nível sem consistência visual.

## Novo padrão

A tela deve seguir:

```text
Configurações
├── navegação de configurações
└── área principal de conteúdo
```

Estrutura desktop esperada:

```text
┌───────────────────────────────────────────────────────────────┐
│ Shell normal da aplicação                                    │
├──────────────┬────────────────────────────────────────────────┤
│ Configurações│                                                │
│              │ Breadcrumb                                     │
│ Organização  │                                                │
│ Departamentos│ Título da página                              │
│ Fluxos       │ Descrição                                      │
│ Integrações  │                                                │
│              │ Conteúdo ocupando toda a largura disponível   │
│              │                                                │
└──────────────┴────────────────────────────────────────────────┘
```

Se a sidebar principal do app já consumir muito espaço, preferir que a navegação de configurações substitua ou reutilize a região de navegação existente, em vez de criar uma segunda sidebar larga.

---

# 2. Arquitetura de informação

Criar estas categorias principais:

```text
Configurações
├── Visão geral
├── Organização
├── Departamentos
├── Fluxos de trabalho
└── Integrações
```

Não implementar categorias futuras ainda.

Não adicionar nesta etapa:

- Conta;
- Preferências pessoais;
- Aparência;
- Segurança pessoal;
- Dados pessoais;
- Configurações específicas de usuário.

---

# 3. Rotas

Usar rotas próprias para os níveis importantes.

Estrutura esperada:

```text
/configuracoes
/configuracoes/organizacao
/configuracoes/departamentos
/configuracoes/departamentos/:departmentId
/configuracoes/departamentos/:departmentId/telas
/configuracoes/departamentos/:departmentId/telas/:screenId
/configuracoes/departamentos/:departmentId/permissoes
/configuracoes/fluxos
/configuracoes/fluxos/predefinicoes
/configuracoes/fluxos/automacoes
/configuracoes/fluxos/atalhos
/configuracoes/integracoes
/configuracoes/integracoes/:integrationId
```

Evitar controlar todos esses níveis apenas por estado local.

A URL deve representar onde o usuário está.

---

# 4. Navegação principal de Configurações

Criar um componente único e reutilizável para a navegação:

```text
Visão geral
Organização
Departamentos
Fluxos de trabalho
Integrações
```

Requisitos:

- mesmo estilo visual para todos os itens;
- item ativo claramente destacado;
- não usar tabs horizontais para essas categorias;
- manter a navegação simples;
- não criar submenus permanentes nesta sidebar;
- itens internos devem ser acessados pela área de conteúdo.

---

# 5. Breadcrumb

Exibir breadcrumb em páginas internas.

Exemplos:

```text
Configurações / Departamentos
Configurações / Departamentos / Fiscal
Configurações / Departamentos / Fiscal / Telas
Configurações / Departamentos / Fiscal / Telas / Obrigações fiscais
Configurações / Integrações / Enviador de mensagens
```

Requisitos:

- permitir retorno aos níveis anteriores;
- manter a sidebar principal marcada pela categoria raiz;
- não usar breadcrumb como substituto da navegação principal.

---

# 6. Página inicial de Configurações

Rota:

```text
/configuracoes
```

Mostrar uma página simples de acesso às categorias.

Estrutura:

```text
Configurações
Gerencie o funcionamento do escritório.

[ Organização ]
Dados e parâmetros gerais da organização.

[ Departamentos ]
Estrutura, telas e permissões por departamento.

[ Fluxos de trabalho ]
Predefinições, automações e atalhos operacionais.

[ Integrações ]
Conexões com outros sistemas.
```

Pode usar cards ou lista de links.

Evitar excesso de informação.

Busca de configurações não precisa ser implementada agora.

---

# 7. Organização

Rota:

```text
/configuracoes/organizacao
```

Objetivo:

Centralizar configurações da organização que utiliza o sistema.

Não usar o termo "Empresa" como categoria principal para evitar confusão com empresas/clientes cadastrados.

Sugestão de seções:

```text
Organização

Informações gerais
- nome;
- nome de exibição;
- CNPJ, se aplicável;
- logo, se já houver suporte;
- outros dados organizacionais existentes.

Operação
- timezone;
- outros parâmetros globais existentes.

Ações da organização
- ações administrativas globais existentes.

Zona de perigo
- somente ações destrutivas reais.
```

Não inventar campos que o backend ainda não possui.

Se uma configuração não existe no domínio atual, não criar comportamento fictício.

---

# 8. Departamentos

## 8.1 Lista de departamentos

Rota:

```text
/configuracoes/departamentos
```

Esta tela deve ser somente uma tela de gerenciamento/listagem.

Estrutura esperada:

```text
Departamentos

Organize as áreas do escritório e configure como cada uma trabalha.

[ + Novo departamento ]

Fiscal
12 funcionários · 3 telas
[menu] [abrir]

Contábil
8 funcionários · 2 telas
[menu] [abrir]
```

Ações:

- criar departamento;
- editar dados básicos;
- excluir departamento;
- abrir página do departamento.

A lista não deve mostrar simultaneamente configurações detalhadas do departamento.

Não colocar uma segunda coluna permanente com "departamento selecionado".

---

# 9. Página do departamento

Rota base:

```text
/configuracoes/departamentos/:departmentId
```

Ao abrir um departamento, usar a área principal completa.

Cabeçalho:

```text
Configurações / Departamentos / Fiscal

Fiscal

Configurações e funcionamento do departamento.

Geral | Telas | Permissões
```

Aqui é permitido usar uma navegação local horizontal curta porque todos os itens pertencem ao mesmo departamento.

A navegação local deve ter no máximo:

```text
Geral
Telas
Permissões
```

Não criar sidebar adicional para esses itens.

---

# 10. Departamento > Geral

Rota:

```text
/configuracoes/departamentos/:departmentId
```

ou equivalente explícito:

```text
/configuracoes/departamentos/:departmentId/geral
```

Mostrar somente propriedades gerais do departamento já suportadas pelo domínio.

Exemplos possíveis:

- nome;
- descrição, se existir;
- líder/responsável, se existir;
- propriedades gerais existentes.

Não mostrar telas ou matriz de permissões nesta seção.

---

# 11. Departamento > Telas

Rota:

```text
/configuracoes/departamentos/:departmentId/telas
```

Mostrar lista das telas ligadas ao departamento.

Exemplo:

```text
Telas

Configure as visualizações disponíveis para o departamento.

[ + Nova tela ]

Obrigações fiscais
Planilha · 183 empresas · 14 rotinas
[menu] [abrir]

Simples Nacional
Planilha · 72 empresas · 8 rotinas
[menu] [abrir]
```

Ações existentes devem continuar funcionando.

Ao clicar em uma tela, navegar para página própria:

```text
/configuracoes/departamentos/:departmentId/telas/:screenId
```

Não abrir a configuração da tela em uma nova coluna lateral.

---

# 12. Configuração de uma tela

Rota:

```text
/configuracoes/departamentos/:departmentId/telas/:screenId
```

Usar todo o canvas de conteúdo.

Estrutura:

```text
Configurações / Departamentos / Fiscal / Telas / Obrigações fiscais

Obrigações fiscais

[configurações existentes da tela]
```

Reaproveitar a lógica e formulários atuais quando possível.

O objetivo desta refatoração é alterar principalmente:

- navegação;
- hierarquia visual;
- composição de página;
- distribuição de espaço.

Evitar reescrever regras de negócio sem necessidade.

---

# 13. Departamento > Permissões

Rota:

```text
/configuracoes/departamentos/:departmentId/permissoes
```

Agrupar permissões por capacidade, não por usuário individual.

Exemplo estrutural:

```text
Permissões

Gerenciamento de tarefas
- alterar responsável;
- alterar prazo;
- alterar status;
- outras permissões existentes.

Configuração
- criar telas;
- editar telas;
- administrar departamento;
- outras permissões existentes.
```

Usar o modelo real de permissões do backend.

Não inventar uma nova política de autorização.

Somente reorganizar visualmente as permissões existentes.

---

# 14. Fluxos de trabalho

Usar o nome:

```text
Fluxos de trabalho
```

Não usar:

```text
Assistência
```

e não usar "Automação" como nome de toda a categoria.

Rota:

```text
/configuracoes/fluxos
```

Subseções:

```text
Predefinições
Automações
Atalhos
```

A página raiz pode apresentar links/cards para as três áreas.

---

# 15. Fluxos > Predefinições

Rota:

```text
/configuracoes/fluxos/predefinicoes
```

Concentrar presets já existentes no domínio.

Exemplo:

```text
Predefinições

Configure padrões reutilizáveis para operações recorrentes.

Simples Nacional padrão
Indústria padrão
Prestador de serviços

[ + Nova predefinição ]
```

Reaproveitar os presets de rotinas já existentes.

Não duplicar regras de preset no frontend.

---

# 16. Fluxos > Automações

Rota:

```text
/configuracoes/fluxos/automacoes
```

Nesta etapa:

- criar apenas a estrutura visual necessária caso não exista suporte funcional;
- se a funcionalidade não existir, usar estado vazio apropriado;
- não implementar engine de automação sem solicitação específica.

Exemplo:

```text
Automações

Automatize ações recorrentes do fluxo de trabalho.

Nenhuma automação configurada.
```

---

# 17. Fluxos > Atalhos

Rota:

```text
/configuracoes/fluxos/atalhos
```

Esta tela representa padrões de atalhos da organização.

Não confundir com preferências pessoais de hotkeys.

Se ainda não houver backend para isso:

- criar somente estrutura/estado vazio;
- não persistir configuração fictícia.

---

# 18. Integrações

Rota:

```text
/configuracoes/integracoes
```

Usar padrão:

```text
catálogo/lista de integrações
→ página própria de configuração
```

Estrutura:

```text
Integrações

Conectadas

Enviador de mensagens
E-mail e WhatsApp
Conectado
[abrir]

Disponíveis

Calculadora contábil
[configurar]
```

As integrações previstas inicialmente são:

- Enviador de mensagens;
- Calculadora contábil.

Se ainda não houver integração backend real:

- representar como futura/indisponível;
- não criar endpoints falsos;
- não simular conexão.

---

# 19. Página de uma integração

Rota:

```text
/configuracoes/integracoes/:integrationId
```

Usar página inteira.

Estrutura futura:

```text
Integração

Status

Configuração

Permissões / departamentos autorizados

Recursos disponíveis

Ações
```

Só mostrar controles funcionais quando o backend suportar.

---

# 20. Padrões obrigatórios de UI

Usar os componentes compartilhados já existentes sempre que possível:

```text
Button
IconButton
Card
Badge
Select
TextField
Textarea
componentes common de loading/error/empty
```

Não criar um novo design system exclusivo para Configurações.

Reutilizar:

- tipografia;
- espaçamentos;
- bordas;
- radius;
- estados;
- botões;
- menus;
- campos;
- tokens de tema existentes.

Objetivo visual:

```text
Configurações devem parecer parte do mesmo produto.
```

Não criar estilos isolados para:

- lista de departamentos;
- tabs;
- permissões;
- telas;
- integrações.

---

# 21. Regra para escolher componentes de navegação

Seguir obrigatoriamente:

| Situação                             | Componente                 |
| ------------------------------------ | -------------------------- |
| Categoria principal de Configurações | Sidebar/nav principal      |
| Lista de entidades                   | Lista ou tabela            |
| Entrar em entidade                   | Nova rota/página           |
| 2–4 aspectos do mesmo objeto         | Navegação local horizontal |
| Liga/desliga                         | Switch existente           |
| Escolha exclusiva                    | Select ou radio            |
| Ações secundárias                    | Menu de contexto           |
| Ação destrutiva                      | Seção "Zona de perigo"     |
| Hierarquia de localização            | Breadcrumb                 |

Não criar um padrão diferente sem necessidade.

---

# 22. Responsividade

Desktop:

- priorizar largura do conteúdo;
- evitar múltiplas colunas de navegação;
- formulários podem usar grids internos quando houver espaço.

Tablet/mobile:

- a navegação de Configurações pode virar drawer ou lista;
- navegação local pode ter scroll horizontal se necessário;
- conteúdo deve permanecer em uma única coluna quando a largura for limitada.

Nunca preservar três painéis lado a lado em telas pequenas.

---

# 23. Estado e carregamento

Não mover toda a orquestração para `App.tsx`.

A arquitetura atual já possui excesso de responsabilidade em `App.tsx`.

Para as novas páginas:

```text
Page
  ↓
hook de domínio, quando necessário
  ↓
service
  ↓
httpClient
```

Exemplos conceituais:

```text
DepartmentsSettingsPage
  ↓
useDepartments / service existente
```

```text
DepartmentScreensPage
  ↓
screenService
```

```text
OrganizationSettingsPage
  ↓
organizationService
```

Evitar:

```text
Page
  ↓
App.tsx
  ↓
callback
  ↓
service
```

quando não houver motivo real.

---

# 24. Reaproveitamento do código atual

Antes de remover componentes:

1. identificar quais componentes atuais possuem regra de negócio útil;
2. separar lógica de apresentação quando necessário;
3. reaproveitar formulários, services, hooks e tipos;
4. substituir somente a estrutura de navegação/layout que causa o problema.

Não recriar:

- endpoints;
- serializers;
- tipos;
- services;
- regras de permissão;
- validações;

sem necessidade funcional.

---

# 25. Exclusões explícitas

Não implementar neste trabalho:

- configurações pessoais;
- página de conta;
- preferências visuais do usuário;
- tema;
- alteração de senha;
- perfil;
- engine completa de automações;
- integrações reais que ainda não existem;
- nova arquitetura de autorização;
- novo design system;
- alterações de domínio sem necessidade para a nova IA.

---

# 26. Ordem sugerida de implementação

Executar nesta ordem:

```text
1. Criar layout base de Configurações.
2. Criar navegação principal.
3. Criar breadcrumb.
4. Refatorar /configuracoes.
5. Implementar Organização.
6. Refatorar lista de Departamentos.
7. Criar página própria de Departamento.
8. Mover Telas para página própria dentro do departamento.
9. Mover Permissões para página própria.
10. Criar Fluxos de trabalho.
11. Reaproveitar presets existentes em Predefinições.
12. Criar placeholders/empty states para Automação e Atalhos se necessário.
13. Criar catálogo de Integrações.
14. Ajustar responsividade.
15. Remover componentes/layouts antigos que ficaram sem uso.
16. Atualizar testes.
```

---

# 27. Critérios de aceite

A implementação só deve ser considerada concluída se:

- [ ] Configurações não possuir mais múltiplos painéis laterais aninhados.
- [ ] A área principal tiver largura suficiente para formulários e listas.
- [ ] Organização, Departamentos, Fluxos de trabalho e Integrações forem categorias de primeiro nível.
- [ ] Departamentos forem apresentados primeiro como lista.
- [ ] Abrir um departamento navegar para uma página própria.
- [ ] Departamento possuir apenas `Geral`, `Telas` e `Permissões` como navegação local.
- [ ] Telas forem listadas em página própria.
- [ ] Abrir uma tela navegar para página própria.
- [ ] Breadcrumb indicar claramente o escopo atual.
- [ ] A URL representar o estado de navegação.
- [ ] Os estilos utilizarem o design system/tokens existentes.
- [ ] Não houver novo conjunto de estilos desconectado do restante do produto.
- [ ] Não houver alteração desnecessária das regras de negócio.
- [ ] Não houver novas responsabilidades relevantes adicionadas ao `App.tsx`.
- [ ] Configurações pessoais continuarem fora desta área.
- [ ] Layout funcionar adequadamente em desktop e mobile.

---

# 28. Resultado esperado

A hierarquia final deve ser percebida pelo usuário como navegação entre páginas, e não como painéis progressivamente menores.

Fluxo esperado:

```text
Configurações
  ↓
Departamentos
  ↓
Fiscal
  ↓
Telas
  ↓
Obrigações fiscais
```

Em cada etapa:

- o conteúdo anterior deixa de ocupar espaço;
- o breadcrumb mantém contexto;
- a categoria `Departamentos` permanece ativa;
- a nova página usa toda a área de conteúdo disponível.

Princípio final:

> Não representar a hierarquia do domínio por colunas aninhadas. Representar a hierarquia por rotas, páginas e breadcrumb.
