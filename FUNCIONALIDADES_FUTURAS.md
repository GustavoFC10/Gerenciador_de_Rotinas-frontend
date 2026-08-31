# Funcionalidades futuras do frontend

Inventário das funcionalidades que aparecem no frontend como área em desenvolvimento,
indisponível, disponível em breve ou como ação que apenas exibe um aviso. O levantamento
foi feito no código de `src/` em 24/08/2026.

## Critérios

Foram incluídos:

- rotas que renderizam `PlaceholderPage`;
- ações cuja implementação atual apenas mostra uma mensagem de desenvolvimento;
- telas de configuração marcadas como “Em desenvolvimento” ou “Disponíveis em breve”;
- recursos operacionais explicitamente indicados como indisponíveis por falta de suporte
  funcional ou de backend.

Não foram incluídos placeholders normais de campos de formulário, mensagens de carregamento,
estados vazios causados pela ausência de dados, erros de acesso/API ou mocks usados somente em
testes.

## Resumo

| ID     | Funcionalidade futura                                   | Área                          | Situação atual                                                   |
| ------ | ------------------------------------------------------- | ----------------------------- | ---------------------------------------------------------------- |
| FUT-01 | Dashboard do departamento                               | Navegação principal           | Rota estrutural sem implementação funcional                      |
| FUT-02 | Dashboard geral da organização                          | Navegação principal           | Rota estrutural sem implementação funcional                      |
| FUT-03 | Gerenciamento de cargos                                 | Navegação principal           | Rota estrutural sem implementação funcional                      |
| FUT-04 | Edição dos dados da organização                         | Configurações › Organização   | Botão apenas exibe aviso; sem suporte no backend                 |
| FUT-05 | Ações administrativas adicionais da organização         | Configurações › Organização   | Placeholder sem ações disponíveis                                |
| FUT-06 | Edição de departamentos                                 | Configurações › Departamentos | Ação apenas exibe aviso; sem suporte no backend                  |
| FUT-07 | Exclusão de departamentos                               | Configurações › Departamentos | Ação apenas exibe aviso; sem suporte no backend                  |
| FUT-08 | Automações de fluxos de trabalho                        | Configurações › Fluxos        | Rota e cartão existem, mas criação está indisponível             |
| FUT-09 | Atalhos organizacionais                                 | Configurações › Fluxos        | Rota e cartão existem, mas configuração está indisponível        |
| FUT-10 | Integrações externas                                    | Configurações › Integrações   | Duas integrações catalogadas, ambas sem configuração funcional   |
| FUT-11 | Restauração de empresas arquivadas                      | Empresas › Zona de risco      | Arquivamento funciona; restauração não está exposta na interface |
| FUT-12 | Upload e persistência de anexos de tarefas              | Execução de tarefas           | UI prevê anexos, mas o envio não está disponível nesta versão    |
| FUT-13 | Execução de células aplicáveis sem tarefa materializada | Planilha operacional          | Célula mostra marcador de execução indisponível                  |

## Detalhamento

### FUT-01 — Dashboard do departamento

- Rota: `/dashboard-departamento`.
- Tela atual: `PlaceholderPage`, com o título “Área em desenvolvimento”.
- Descrição apresentada: visão simples de progresso, gargalos e prazos do departamento.
- Evidência: [`src/App.tsx:1203`](src/App.tsx#L1203), [`src/pages/PlaceholderPage.tsx:14`](src/pages/PlaceholderPage.tsx#L14).
- Próximas necessidades: definir métricas, filtros de departamento/competência, cards de
  progresso, gargalos e prazos, além dos endpoints agregadores correspondentes.

### FUT-02 — Dashboard geral da organização

- Rota: `/dashboard-geral`.
- Tela atual: `PlaceholderPage`, com o título “Área em desenvolvimento”.
- Descrição apresentada: visão consolidada por departamentos, empresas, rotinas e responsáveis.
- Evidência: [`src/App.tsx:1212`](src/App.tsx#L1212), [`src/pages/PlaceholderPage.tsx:14`](src/pages/PlaceholderPage.tsx#L14).
- Próximas necessidades: definir agregações organizacionais, filtros, permissões, período de
  referência e endpoints para consolidar os dados.

### FUT-03 — Gerenciamento de cargos

- Rota: `/cargos`.
- Tela atual: `PlaceholderPage`, protegida pela permissão de visualização da equipe.
- Descrição apresentada: gerenciamento de permissões e responsabilidades.
- Evidência: [`src/App.tsx:1237`](src/App.tsx#L1237), [`src/pages/PlaceholderPage.tsx:14`](src/pages/PlaceholderPage.tsx#L14).
- Próximas necessidades: definir catálogo de cargos, associação com membros/departamentos,
  permissões e operações de criação, edição e remoção.

### FUT-04 — Edição dos dados da organização

- Localização: Configurações › Organização › Informações gerais.
- Controle atual: botão “Editar organização”.
- Comportamento atual: abre somente o aviso de que a edição está em desenvolvimento e não
  possui suporte no backend.
- Evidência: [`src/pages/settings/OrganizationSettingsPage.tsx:39`](src/pages/settings/OrganizationSettingsPage.tsx#L39) e [`src/pages/settings/OrganizationSettingsPage.tsx:48`](src/pages/settings/OrganizationSettingsPage.tsx#L48).
- Dados hoje exibidos: nome, identificador e fuso horário recebidos da sessão ativa.
- Dependências: contrato de atualização da organização, formulário, validações, permissões e
  atualização da sessão após o salvamento.

### FUT-05 — Ações administrativas adicionais da organização

- Localização: Configurações › Organização › Ações da organização.
- Estado atual: `DevelopmentPlaceholder` com “Nenhuma ação adicional disponível”.
- Comportamento atual: o botão “Ver recursos futuros” apenas mostra o aviso genérico de
  desenvolvimento.
- Evidência: [`src/pages/settings/OrganizationSettingsPage.tsx:72`](src/pages/settings/OrganizationSettingsPage.tsx#L72), [`src/components/settings/SettingsPageChrome.tsx:202`](src/components/settings/SettingsPageChrome.tsx#L202).
- Escopo provável: ações administrativas globais que não são edição de dados, ainda não
  especificadas no frontend.
- Dependências: definição de produto e endpoints específicos no backend.

### FUT-06 — Edição de departamentos

- Localizações:
  - Configurações › Departamentos › menu de ações › “Editar dados”;
  - Configurações › Departamentos › [departamento] › Geral › “Editar dados do departamento”.
- Comportamento atual: ambas as entradas apenas exibem uma mensagem de desenvolvimento.
- Evidência: [`src/pages/settings/DepartmentsSettingsPage.tsx:293`](src/pages/settings/DepartmentsSettingsPage.tsx#L293) e [`src/pages/settings/DepartmentSettingsPages.tsx:56`](src/pages/settings/DepartmentSettingsPages.tsx#L56).
- Dependências: endpoint de atualização, controle de concorrência/versão se aplicável,
  validação de nome e descrição, e recarga das telas e acessos afetados.

### FUT-07 — Exclusão de departamentos

- Localizações:
  - Configurações › Departamentos › menu de ações › “Excluir departamento”;
  - Configurações › Departamentos › [departamento] › Zona de perigo.
- Comportamento atual: a ação não exclui dados; apenas exibe uma mensagem de desenvolvimento.
- Evidência: [`src/pages/settings/DepartmentsSettingsPage.tsx:293`](src/pages/settings/DepartmentsSettingsPage.tsx#L293) e [`src/pages/settings/DepartmentSettingsPages.tsx:69`](src/pages/settings/DepartmentSettingsPages.tsx#L69).
- Dependências: regra de impacto sobre telas, permissões e rotinas, confirmação destrutiva,
  endpoint de exclusão/arquivamento e tratamento de conflitos.

### FUT-08 — Automações de fluxos de trabalho

- Rota: `/configuracoes/fluxos/automacoes`.
- Entrada: cartão “Automações”, marcado como “Em desenvolvimento”.
- Tela atual: placeholder com “Nenhuma automação configurada” e botão “Criar automação”.
- Comportamento atual: o botão apenas mostra o aviso genérico de falta de suporte no backend.
- Evidência: [`src/pages/settings/WorkflowSettingsPages.tsx:46`](src/pages/settings/WorkflowSettingsPages.tsx#L46) e [`src/pages/settings/WorkflowSettingsPages.tsx:106`](src/pages/settings/WorkflowSettingsPages.tsx#L106).
- Dependências: modelo de gatilhos, condições, ações, execução, histórico, permissões e
  endpoints para criar, editar, ativar, pausar e auditar automações.

### FUT-09 — Atalhos organizacionais

- Rota: `/configuracoes/fluxos/atalhos`.
- Entrada: cartão “Atalhos”, marcado como “Em desenvolvimento”.
- Tela atual: placeholder com “Nenhum atalho organizacional configurado” e botão
  “Configurar atalhos”.
- Comportamento atual: o botão apenas mostra o aviso genérico de falta de suporte no backend.
- Evidência: [`src/pages/settings/WorkflowSettingsPages.tsx:54`](src/pages/settings/WorkflowSettingsPages.tsx#L54) e [`src/pages/settings/WorkflowSettingsPages.tsx:106`](src/pages/settings/WorkflowSettingsPages.tsx#L106).
- Dependências: definição do que é um atalho, escopo organizacional/departamental, conflitos,
  permissões e endpoints de manutenção.

### FUT-10 — Integrações externas

- Rota: `/configuracoes/integracoes`.
- Estado da listagem: seção “Disponíveis em breve”; cada cartão está marcado como “Em
  desenvolvimento”.
- Integrações catalogadas:
  - **Enviador de mensagens** — e-mail e WhatsApp;
  - **Calculadora contábil** — cálculos e consultas de apoio à operação.
- Rotas de detalhe:
  - `/configuracoes/integracoes/enviador-de-mensagens`;
  - `/configuracoes/integracoes/calculadora-contabil`.
- Tela de detalhe atual: “Integração indisponível”; o botão “Configurar integração” apenas
  mostra o aviso de falta de suporte no backend.
- Evidência: [`src/pages/settings/IntegrationSettingsPages.tsx:31`](src/pages/settings/IntegrationSettingsPages.tsx#L31), [`src/pages/settings/IntegrationSettingsPages.tsx:60`](src/pages/settings/IntegrationSettingsPages.tsx#L60) e [`src/pages/settings/IntegrationSettingsPages.tsx:92`](src/pages/settings/IntegrationSettingsPages.tsx#L92).
- Dependências: autenticação/configuração de cada provedor, credenciais e secrets, status da
  conexão, sincronização, tratamento de falhas, consentimento e endpoints específicos.

### FUT-11 — Restauração de empresas arquivadas

- Localização: Empresa › Zona de risco.
- Estado atual: o frontend permite arquivar a empresa, mas informa que ela poderá ser recuperada
  quando o ciclo de restauração estiver disponível. Não existe controle de restauração na tela.
- Evidência: [`src/components/entities/EntityEditModal.tsx:440`](src/components/entities/EntityEditModal.tsx#L440).
- Observação: o serviço de empresas já possui uma operação `restore` ([`src/services/companyService.ts:92`](src/services/companyService.ts#L92)); portanto, o trabalho
  pendente parece estar principalmente na exposição da UI, seleção de empresas arquivadas,
  permissões, confirmação e atualização da lista.
- Dependências de frontend: listagem/consulta de arquivadas, botão ou fluxo de restauração,
  tratamento de ETag/conflitos e feedback após a operação.

### FUT-12 — Upload e persistência de anexos de tarefas

- Localizações: detalhes da tarefa, ações de tarefa e estado vazio do painel de anexos.
- Estado atual: o painel consegue exibir prévias de anexos já presentes, mas, quando não há
  callback de inclusão, mostra “O envio de anexos ainda não está disponível nesta versão”.
- Evidência: [`src/components/routine-control/shared/RoutineCardActions.tsx:184`](src/components/routine-control/shared/RoutineCardActions.tsx#L184) e [`src/components/routine-control/shared/RoutineCardActions.tsx:909`](src/components/routine-control/shared/RoutineCardActions.tsx#L909).
- Observação: a interface possui contratos opcionais `onAttachmentAdd`/`onAttachmentRemove`,
  porém o fluxo principal do `App` não os conecta ao backend. O botão de anexar, quando
  disponível em componentes isolados, é apenas um callback; não há seleção de arquivo nessa
  camada.
- Dependências: storage, upload multipart/presigned URL, limites e tipos de arquivo, remoção,
  download/preview, permissões e atualização dos indicadores da tarefa.

### FUT-13 — Execução de células aplicáveis sem tarefa materializada

- Localização: planilha operacional.
- Estado atual: quando a combinação empresa–rotina é aplicável, mas não existe uma tarefa
  associada à célula, a tabela renderiza um marcador pontilhado com `aria-label="Execução ainda
não disponível"`.
- Evidência: [`src/components/routine-control/spreadsheet/RoutineControlTable.tsx:316`](src/components/routine-control/spreadsheet/RoutineControlTable.tsx#L316) e [`src/components/routine-control/spreadsheet/RoutineControlTable.tsx:419`](src/components/routine-control/spreadsheet/RoutineControlTable.tsx#L419).
- Escopo provável: transformar a ocorrência virtual em uma tarefa executável na própria célula,
  ou deixar claro e acionável o fluxo de materialização da competência.
- Dependências: mapeamento entre projeção e ocorrências virtuais, materialização, identificadores
  e ETags, regras de competência projetada/finalizada e atualização da planilha após a ação.

## Componentes reutilizáveis de placeholder

O componente [`DevelopmentPlaceholder`](src/components/settings/SettingsPageChrome.tsx#L202)
centraliza o padrão visual usado em organização, automações, atalhos e integrações. Atualmente
ele sempre apresenta a mensagem genérica de que a funcionalidade está em desenvolvimento e não
possui suporte no backend; não dispara uma operação real.

O componente [`PlaceholderPage`](src/pages/PlaceholderPage.tsx#L4) centraliza o estado das três
rotas estruturais ainda não implementadas.

## Itens encontrados e deliberadamente não classificados como funcionalidades futuras

Estes textos apareceram na varredura, mas representam estados normais ou auxiliares do produto:

- `placeholder="..."` em campos de nome, busca, e-mail, CNPJ e observação: são dicas de entrada,
  não funcionalidades futuras;
- “Ainda não existe uma tela de planilha disponível” e “Nenhuma rotina ativa disponível” em
  `CreateCompanyPage`: estados de catálogo vazio/dependência de dados;
- “Empresa arquivada ou indisponível”, “Membros indisponíveis” e mensagens equivalentes:
  estados de acesso, filtro ou falha de carregamento;
- “Prévia indisponível” para tipos de arquivo desconhecidos: fallback visual de preview;
- placeholders gerados por utilitários de layout e mocks de usuários em testes: infraestrutura
  técnica, sem efeito de funcionalidade futura no sistema.

## Observação sobre a documentação existente

`README.md` e `ARQUITETURA_FRONTEND.md` ainda descrevem algumas rotas antigas como planejadas,
inclusive Rotinas, Empresas e Funcionários. Essas áreas já possuem páginas funcionais no código
atual e, por isso, não foram registradas como placeholders neste inventário. As rotas que ainda
usam `PlaceholderPage` são Dashboard do departamento, Dashboard geral e Cargos.
