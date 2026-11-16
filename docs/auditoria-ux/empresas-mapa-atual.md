# Empresas: identidade central e dados por módulo

15/11/2026. Somente análise e prévias. Nenhum arquivo de produção em `src/` foi alterado nesta rodada.

## Decisão recebida

O usuário escolheu cadastro central único, telas especializadas nos módulos e resumo central com acessos autorizados. Acrescentou que Clientes deve mostrar todas as empresas, incluindo as que ainda não possuem dados financeiros. O vínculo com uma empresa deve ser obrigatório e fácil tanto em Honorários como em Rotinas.

Interpretação aplicada nas prévias: escolher uma empresa existente aproveita seu cadastro; escolher uma nova cadastra explicitamente a empresa central antes de preencher os dados do módulo. Configurar outro módulo não cria outra empresa. Uma empresa sem perfil de Honorários aparece como **Sem dados financeiros**, nunca com honorário zero.

## O que já existe no React e no contrato

| Contexto                           | Dados e identidade                                                                                                                                                                  | Fontes locais                                                                                                                                                                      | Consequência                                                                                                                                                                                                 |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Cadastro central                   | `ClientCompanyResource`: `id`, código, nome, razão social, CNPJ, e-mail, telefone, regime cadastral, versão e estado ativa/arquivada.                                               | [companyService](../../src/services/companyService.ts), [CompaniesModulePage](../../src/pages/CompaniesModulePage.tsx)                                                             | A mesma empresa deve manter o mesmo identificador em todos os módulos. Atualizar seus dados não exige criar uma nova identidade.                                                                             |
| Empresas em Rotinas                | `CompaniesPage` usa `data.clients` do controle de Rotinas e conta rotinas observadas nas tarefas. A ficha é `EntityDetailPage`, com contexto de catálogo/tela e competência.        | [CompaniesPage](../../src/pages/CompaniesPage.tsx), [EntityDetailPage](../../src/pages/EntityDetailPage.tsx), [routineControlService](../../src/services/routineControlService.ts) | Essa tela é uma visão operacional do cadastro e seus vínculos; o número de rotinas observado na competência não deve ser confundido com a totalidade dos vínculos vigentes.                                  |
| Cadastro iniciado em Rotinas       | `CompanySetupInput` reúne dados centrais, tela opcional, rotinas e início dos vínculos. Há `CompanySetupPartialResult` para criação parcialmente concluída.                         | [CompanySetupInput](../../src/types/companySetup.ts), [CreateCompanyPage](../../src/pages/CreateCompanyPage.tsx), [companyService](../../src/services/companyService.ts)           | A interface já reconhece que cadastrar uma empresa e configurar Rotinas são operações relacionadas, com possibilidade de conclusão parcial.                                                                  |
| Vínculos de Rotinas                | `ClientRoutineAssignmentResource` possui empresa, rotina, departamento, versão, origem e vigência. Cadastro de tela e execução da competência são recursos próprios.                | [companyService](../../src/services/companyService.ts), [domain](../../src/types/domain.ts)                                                                                        | Essas informações não pertencem a um formulário gigante de cadastro geral. A empresa pode participar de vários departamentos.                                                                                |
| Perfil de Honorários               | `HonorariosClient` tem seu próprio `id`, além de `companyId`, referência da empresa, perfil de cálculo, honorário atual, data de reajuste, contato, observações e versões.          | [tipos de Honorários](../../src/types/honorarios.ts), [honorariosService](../../src/services/honorariosService.ts)                                                                 | O perfil é uma extensão vinculada; a empresa e o cliente financeiro não são recursos intercambiáveis.                                                                                                        |
| Empresas disponíveis em Honorários | O serviço possui `company-options/`, além da coleção paginada de `clients/`.                                                                                                        | [honorariosService](../../src/services/honorariosService.ts)                                                                                                                       | A coleção de perfis financeiros não representa todas as empresas. A nova lista depende de uma projeção que una presença de perfil e identidade central com paginação e permissões corretas.                  |
| Orçamento e proposta               | O vínculo de orçamento é opcional e o `snapshot` conserva destinatário, empresa, perfil, parâmetros e valores da revisão.                                                           | [tipos de Honorários](../../src/types/honorarios.ts)                                                                                                                               | Um orçamento genérico continua permitido. Atualizar a empresa central não deve reescrever propostas já emitidas. A operação de conversão aceita é diferente de apenas escolher uma empresa.                  |
| Empresa em Processos               | `ProcessSummaryDto` tem `companyId`, `companyReference`, `companyLinkRequired`, além dos campos do processo. A referência de empresa é mínima e autorizada pelo acesso a Processos. | [tipos de Processos](../../src/types/processes.ts), [processService](../../src/services/processService.ts)                                                                         | Referência contextual não concede acesso automático ao cadastro geral nem deve substituir os dados e registros históricos do processo. A vinculação não pode ser inferida apenas por nome/CNPJ na interface. |

## Responsabilidade de cada informação

**Central:** identidade e contato cadastral da empresa, código, CNPJ, estado cadastral e regime tributário atual registrado no cadastro.

**Rotinas:** vínculos com rotinas e telas, departamentos, vigências e configurações operacionais. Tarefas e estados da competência continuam na operação; não são atributos estáticos de empresa.

**Honorários:** perfil de precificação, honorário contratado, data de reajuste, condições e observações financeiras. O contato do contrato pode ser específico e diferente do contato geral.

**Processos:** procedimento, etapas, tarefas, responsáveis, prazos, campos do processo e sua referência autorizada à empresa. O processo não deve virar uma segunda ficha cadastral mutável sem distinção de finalidade.

**Documentos históricos:** dados registrados na proposta ou no procedimento permanecem associados à versão e ao contexto correspondente. Não há sincronização retroativa automática dos snapshots.

### Regime cadastral e regime de precificação

O cadastro possui `taxRegime`, enquanto `HonorariosProfile` possui `regime`. A identidade de empresa pode ser a mesma, mas o regime de uma simulação ou proposta pode representar um cenário. A prévia mantém os dois campos em seus contextos e não altera um automaticamente ao mudar o outro. Uma futura regra de comparação ou atualização precisa distinguir cadastro atual, perfil contratado e cenário orçado.

## Organização demonstrada

- [P08 — Cadastro central](../../previews/revisao-ux/empresas.html): a lista aprovada é mantida. A ficha ganha uma seção compacta de dados nos módulos, com presença de configuração e acesso contextual à empresa correspondente. A conta fictícia tem acesso aos três contextos; os atalhos reais deverão respeitar a permissão do módulo de destino.
- [P11 — Clientes](../../previews/revisao-ux/clientes-honorarios.html): todas as 300 empresas fictícias aparecem, com 10 perfis financeiros e 290 estados Sem dados no cenário inicial. Há filtros de Com dados e Sem dados, além dos recortes financeiros existentes. Abertura pela linha inteira e paginação de 20 linhas preservam a linguagem aprovada.
- [P18 — Empresa em Rotinas](../../previews/revisao-ux/empresas-modulos.html): a identidade central é consultada no topo; departamentos, telas e vínculos ficam na configuração especializada. O modelo local preserva configurações de departamentos diferentes, em vez de limitar a empresa a um único departamento.
- Em P11/P18, **Novo cliente / Adicionar empresa às Rotinas** abre a mesma escolha: empresa existente ou nova. O segundo caminho informa explicitamente que cadastra uma empresa central antes de continuar. CNPJ já encontrado oferece reaproveitar o cadastro, sem duplicação.
- Empresa arquivada continua consultável na demonstração. Novos dados de módulo ficam indisponíveis até sua restauração central; essa é uma apresentação proposta, cuja aplicação deve seguir as regras efetivas do contrato.

O módulo de Clientes continua sendo uma área de trabalho financeira. Mostrar a empresa sem perfil não significa criar automaticamente um cliente financeiro. Da mesma forma, uma empresa disponível para Rotinas não recebe rotinas automaticamente.

P12 usa a mesma fixture compartilhada e volta a ler os perfis ao abrir a página. O cenário de indicadores inclui somente empresas ativas com perfil financeiro não arquivado e valores informados; empresas sem perfil não viram clientes com valor zero. O arquivamento cadastral e o arquivamento do perfil são estados distintos. A aplicação efetiva desse recorte deve ser confirmada no agregado autorizado da API; a prévia não modifica as regras do backend.

## Fluxos e falhas que precisam estar claros na implementação

1. **Empresa existente:** selecionar → consultar identidade → configurar o módulo → salvar o perfil/vínculos usando o identificador selecionado.
2. **Empresa nova:** preencher dados centrais → cadastrar empresa → continuar com seu identificador → salvar os dados específicos. A pessoa recebe confirmação de que a empresa foi cadastrada.
3. **Cancelamento após cadastrar a empresa:** a empresa continua no catálogo, ainda sem dados do módulo. Não apagar silenciosamente um cadastro central concluído.
4. **Falha na configuração:** indicar que a empresa já existe e permitir concluir a configuração com o mesmo identificador. Usar idempotência e o resultado parcial; não repetir a criação central a cada tentativa.
5. **Permissão insuficiente para criar empresa:** permitir escolher uma empresa autorizada existente; a capacidade de criar a partir do módulo precisa ser concedida pelo contrato apropriado. Ter acesso a Honorários ou Rotinas não deve elevar automaticamente a permissão de cadastro central.
6. **Arquivamento:** distinguir empresa arquivada, perfil financeiro arquivado e vínculo de rotina encerrado. Uma ação não pode apagar ou encerrar outros recursos por inferência visual.

## O que cabe ao frontend e o que exige conferir a API

O frontend pode reutilizar o mesmo seletor/criador de empresa, manter o identificador obrigatório no fluxo, oferecer os estados Sem dados e Com dados, preservar o contexto de volta e separar a edição central da edição especializada. Pode também reorganizar os acessos sem alterar os contratos financeiros e de execução.

A listagem de **todas as empresas com sua situação em Honorários** precisa de dados autorizados que representem todo o conjunto. Não é correto juntar uma página de empresas com uma página de clientes e concluir que os demais não possuem perfil. Filtros financeiros, contagens, ordenação e paginação devem ser consistentes no servidor. `company-options/` pode apoiar a seleção, mas seu contrato deve ser conferido antes de usá-lo como catálogo financeiro completo.

Criar uma empresa e seu perfil exige tratar permissões, idempotência, concorrência e falha parcial. Uma transação única no backend é uma possibilidade futura, não um endpoint presumido nesta proposta. Os contratos atuais já indicam versão/ETag e tratamento parcial de Rotinas; a integração final precisa preservá-los.

Não implementar “espelhamento” como cópias editáveis de nome e CNPJ em cada módulo. A apresentação pode reutilizar a identidade central, enquanto documentos históricos continuam com seus snapshots. Uma visão combinada não exige uma tabela única no banco nem permissões globais de edição.

## Limites das prévias locais

`empresas-modelo.js` fornece uma identidade compartilhada fictícia e armazena alterações somente no navegador, sob uma chave exclusiva da revisão. Isso permite verificar que uma empresa criada em Honorários aparece no cadastro central e pode ser configurada em Rotinas. Os perfis e vínculos permanecem separados no modelo local.

Os valores de precificação são ilustrativos e não constituem um segundo motor financeiro. A página não executa chamadas à API, não concede permissões e não cria tarefas de produção. A seleção simplificada de telas/rotinas em P18 demonstra a organização; a implementação terá de reutilizar os catálogos e contratos operacionais reais.
