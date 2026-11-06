# Reformulação de Empresas e Equipe

Estudo de 4 de novembro de 2026. Pesquisa e decisões registradas antes da construção das previews. Esta pasta é um protótipo local com dados fictícios; a aplicação em `src/` permanece intacta.

## 1. Referências reais e escolha

| Referência consultada                                                                                                      | Padrão relevante                                                                                                | Aplicação neste projeto                                                                                                                                     |
| -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Attio — registros, tabelas e fichas](https://attio.com/help/reference/managing-your-data/records/create-and-view-records) | Diretórios de empresas e pessoas; identidade na primeira coluna; consulta de um registro ao lado da lista.      | Referência principal para estrutura compartilhada e preservação do contexto. Não trazer CRM, automações, favoritos, enriquecimento ou edição em massa.      |
| [Linear — membros e papéis](https://linear.app/docs/members-roles)                                                         | Administração centrada na lista de membros, filtros por papel/situação e ações secundárias vinculadas à pessoa. | Referência para densidade, ação principal única e separação entre identidade, situação e papel organizacional. Não copiar regras de autorização do produto. |
| [Notion — membros e convidados](https://www.notion.com/help/add-members-admins-guests-and-groups)                          | Convite com identidade e papel; gestão de pessoas sem transformar cadastro em dashboard.                        | Referência para convite compacto. Não adicionar grupos, links de convite ou convites em lote.                                                               |

São referências de produtos em uso, consultadas em suas documentações oficiais. A adaptação visual e a recomendação abaixo são decisões deste estudo, não recomendações dos fornecedores. Imagens oficiais eventualmente baixadas ficam em `referencias/`, apenas como material de pesquisa.

As páginas oficiais puderam ser consultadas, mas os servidores de imagens não foram acessíveis neste ambiente. A pesquisa confirma os fluxos descritos pelos produtos; não atribui a eles medidas de espaçamento, fontes ou cores que não puderam ser inspecionadas. As medidas da proposta são escolhas próprias, verificadas nas capturas locais.

**Direção A, recomendada: diretório tabular com ficha lateral.** Melhora comparação de código/CNPJ e de papel/situação, aproveita a largura, mantém lista e posição durante a consulta. A ficha só ocupa espaço quando necessária.

**Direção B, alternativa: lista e ficha fixa.** Boa para revisar pessoas ou empresas consecutivamente. Perde comparação entre colunas e dedica menos largura à lista. Mostrá-la com os mesmos dados e formulários permite comparar arquitetura, não decoração.

Não criar três paletas equivalentes nem variar recursos entre opções. Ambas usam a mesma linguagem, conteúdo e permissões. Em celular, ambas convergem para lista e ficha de largura total.

## 2. Diagnóstico do código atual

- Empresas duplica “Adicionar empresa” em aba e botão; os registros não têm títulos de coluna; código pode reaparecer no subtítulo; a ficha já abre como formulário.
- Equipe distribui edição entre perfil, convite e uma página separada chamada “Cargos e acessos”. Nome/e-mail e resumo de acessos disputam espaço; o convite repete informações em cards e resumo.
- Processos exige seleção geral e seleções “Com acesso/Sem acesso” por setor. `jobTitle` é um texto opcional e descritivo, mas recebe o peso de uma permissão obrigatória.
- Os módulos têm cabeçalhos, larguras, densidade, navegação e tratamento de detalhe diferentes, apesar de compartilharem a mesma tarefa: localizar um registro e agir sobre ele.
- A preview antiga de Empresas inclui contatos, histórico e arquivamento que não existem no módulo independente. Ela não será a base funcional desta proposta.

## 3. Estrutura e decisões visuais

| Elemento       | Decisão                                                                                                                                                                                               |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Contexto       | Cabeçalho compacto com organização ativa, retorno às áreas e identificação do usuário. Empresa e Equipe como destinos; criação é botão, não aba. Na implementação, destinos respeitam acesso efetivo. |
| Área útil      | Máximo aproximado de 1320 px, margens 40–56 px no desktop e 16 px no celular.                                                                                                                         |
| Título         | 28–32 px, peso 650–700; contagem pequena ao lado; uma frase curta de contexto; único CTA à direita.                                                                                                   |
| Tipografia     | Inter/system sans da aplicação. Corpo 14 px; dados secundários 12–13 px; rótulos legíveis sem excesso de caixa alta.                                                                                  |
| Cor            | Azul da marca `#2563eb` para ação/foco/seleção; superfícies quase brancas e texto ardósia; verde/âmbar apenas para situação. Preservar tema escuro.                                                   |
| Superfícies    | Uma área de diretório com divisórias de 1 px, raio de 10–12 px; evitar cards dentro de cards e grandes sombras.                                                                                       |
| Linhas         | 68–72 px; nome forte, metadado secundário; números tabulares para código/CNPJ; avatar só para pessoas, monograma sóbrio para empresas.                                                                |
| Ferramentas    | Busca visível; ordenação alfabética simples como facilitação; Equipe pode filtrar situações que já existem. Sem filtros de arquivamento em Empresas nesta proposta.                                   |
| Colunas        | Empresas: nome/razão social, código, CNPJ, e-mail em telas largas. Equipe: nome/e-mail, papel na organização, módulos, situação.                                                                      |
| Ficha          | Cabeçalho com identidade e fechar; modo de consulta inicial; “Editar” explícito; conteúdo por seção; rodapé de edição com cancelar/salvar.                                                            |
| Responsividade | Colunas secundárias viram metadados de linha; formulário de duas colunas vira uma; ficha ocupa tela em larguras menores que 900 px; ações com alvo de 44 px no celular.                               |
| Acessibilidade | Links/botões reais, nomes acessíveis, foco visível, ordem de leitura, escape e devolução de foco, foco contido em modal, labels persistentes, situação textual além da cor.                           |

## 4. Fluxos finais a demonstrar

### Empresas

1. Buscar nome, razão, código, CNPJ ou e-mail; ordenar nome/código sem alterar o domínio.
2. Abrir ficha em consulta; dados agrupados em Identificação (nome, razão, código, CNPJ, regime) e Contato (e-mail, telefone).
3. Editar os mesmos sete campos; cancelar restaura o valor; indicar alterações pendentes e impedir descarte silencioso.
4. Criar com o mesmo agrupamento. Só nome é obrigatório. Código é texto e preserva zeros; CNPJ é texto e admite letras.
5. Leitores consultam dados como texto; ações de criação/edição seguem permissões. A preview oferece um modo Leitura para conferir isso.

Sem contatos adicionais, histórico, arquivamento, importação/exportação ou dashboards novos. A dependência atual de Rotinas e suas regras de autorização permanecem.

### Equipe

1. Localizar por nome, e-mail, papel, módulo ou departamento; filtrar ativa/pendente/inativa/suspensa; abrir ficha.
2. Ficha com Perfil e Acessos. Papel organizacional identificado como “Papel na organização”, sem confundir com cargo descritivo.
3. Processos: três checkboxes visíveis — Diretoria, Financeiro, Regularidade. Nenhum selecionado significa sem acesso. “Detalhes opcionais” permite conservar/editar o cargo de cada setor selecionado.
4. Rotinas: sem acesso / por departamento / administrador. Selecionar departamentos primeiro; mostrar nível Leitor/Colaborador/Líder apenas nos selecionados. Não conceder acesso administrativo por padrão.
5. Convidar pessoa com nome, e-mail, papel e o mesmo editor de acessos; confirmação de envio no contexto, sem resumo redundante. Preview simula convite, sem enviar e-mail.
6. Desativação existente em ação secundária, com confirmação explícita. Inativos/suspensos consultam acessos, mas não recebem edição nem ação de reativar.
7. Preservar foto e metadados no plano de implementação: foto alheia só pode ser removida conforme API; não simular substituição de foto de outro membro como ação autorizada.

A entrada legada de acessos deve abrir a mesma ficha na aba Acessos, evitando um quarto editor. Não se amplia o acesso atual da Equipe, que continua reservado ao proprietário.

## 5. Estados e comportamento

- Busca sem resultado: mensagem contextual e “Limpar busca”. Base vazia: ação correspondente às permissões.
- Carregamento: estrutura estável com skeleton; erro: mensagem contextual e tentar novamente, mantendo busca/filtros.
- Seleção de linha permanece ao consultar e fechar. Busca/filtro/ordem não se perdem ao voltar da ficha.
- Alterações pendentes: salvar habilitado só após mudança; cancelar/fechar confirma descarte. Sucesso perto da tarefa e anunciado por região de status.
- Escape fecha overlays; ao fechar, foco retorna à origem. No painel fixo, a lista continua utilizável; em edição, trocar registro confirma descarte.
- Sem ações em massa ou edição automática ao mudar um select; o usuário confirma no botão Salvar.
- Dados da preview ficam apenas na memória da aba, sem API, cookies, autenticação, envio ou armazenamento persistente.

## 6. Contratos preservados e pendências técnicas

- Empresas: `companies.actions.read/create/edit` e `permissions` efetivas do recurso precisam governar a implementação. Não inferir acesso por owner/admin. Preservar CSRF, idempotência, ETag, validação do CNPJ e códigos nulos.
- Equipe: persistir pelo `PATCH organization-members/{id}/` e convite já existentes. Somente membros ativos/pendentes podem ter acessos alterados.
- Processos: seleção gera `{sector:'fin',role:'fin'}` etc.; `jobTitle` opcional, máximo 120 caracteres. Nenhuma mudança de autorização.
- Rotinas: papéis atuais `lead/contributor/viewer`; administrador é opção explícita. Concessões a departamentos fora do catálogo devem ser preservadas.
- O editor de concessões atual só configura Rotinas/Processos. Incluir Empresas nele exige verificar/adaptar contrato e tipos em etapa própria; a preview não apresenta controle fictício de concessão a Empresas.
- Rotas profundas devem continuar funcionando; a URL identifica a ficha/aba e a volta preserva o contexto. Não buscar toda a lista para resolver ficha individual quando o GET individual estiver disponível.

## 7. Implementação no próximo passo

1. Extrair DirectoryLayout, toolbar, tabela/linha responsiva e RecordPanel compartilhados; reutilizar/estender `components/catalog/CatalogList.tsx` onde fizer sentido.
2. Aplicar shell comum a `CompaniesModulePage`, `TeamModulePage` e `ModuleWorkspaceLayout` sem mudar outras áreas.
3. Separar consulta e edição; criar CompanyFields com os mesmos campos e mesmas validações. Manter mutações e invalidadores existentes.
4. Unificar perfil/acessos/convite de Equipe em componentes menores. Simplificar `MemberModuleFields` e manter `memberModuleAccess` como adaptador do payload.
5. Redirecionar a página legada de acessos para a ficha selecionada. Preservar retorno, queries e acessibilidade.
6. Validar permissões de cada ação e concessões desconhecidas; atualizar testes de navegação, edição, convite e transformação dos setores. Executar os checks do CI.

### Critérios de aceite

- Mesmos ritmos, controles e padrões de consulta/edição nos dois módulos.
- Processos configurado por seleção direta, sem dropdown binário por setor e sem cargo obrigatório.
- Nenhuma alteração em regras de Rotinas, acesso organizacional da Equipe ou autorização de Empresas.
- Nenhuma nova operação de negócio adicionada por conveniência visual.
- Filtros/contexto preservados, teclado utilizável, sem overflow horizontal de página em 390/768/1440 px.
- Antes da produção, aprovação da direção A ou B com base nas previews locais.
