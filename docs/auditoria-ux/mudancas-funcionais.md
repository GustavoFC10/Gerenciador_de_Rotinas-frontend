# Mudanças funcionais para revisão posterior

15/11/2026. Documento separado a pedido do usuário. As prévias servem à avaliação visual; este documento registra definições e contratos que precisam ser analisados individualmente antes da implementação.

Uma aprovação de aparência não aprova automaticamente novos endpoints, cálculos ou mudanças de fluxo. “Direção aprovada” abaixo registra uma escolha de experiência feita no chat, não uma autorização para implementar agora.

## Lista para avaliação

| ID  | Tema                                                  | Estado da decisão                                                            | Quando se aplica                        |
| --- | ----------------------------------------------------- | ---------------------------------------------------------------------------- | --------------------------------------- |
| F01 | Tempo médio dos processos em execução                 | Análise funcional adiada pelo usuário. A prévia usa um exemplo visual.       | Dashboard de Processos.                 |
| F02 | Quantidades rotuladas como movimentações              | Unidade e rótulo aprovados pelo usuário; totais financeiros preservados.     | Tela e relatório de Movimentações.      |
| F03 | Todas as empresas na lista Clientes, com e sem perfil | Direção de interface aprovada; contrato da projeção precisa ser conferido.   | Cadastro compartilhado e Honorários.    |
| F04 | Cadastrar empresa e configurar o módulo em um fluxo   | Vínculo obrigatório e facilitado aprovado; gravação e retomada a revisar.    | Rotinas e Honorários.                   |
| F05 | Estados cadastrais e financeiros independentes        | Preservar a distinção existente; não aprovar cascatas por inferência visual. | Arquivamento e configuração de módulos. |
| F06 | Quadro global por setor e liberação                   | Exploração anterior substituída; fora das opções atuais da P16.              | Organização de Processos.               |
| F07 | Bancada com próxima ação e detalhe ao lado            | Exploração anterior substituída; fora das opções atuais da P16.              | Organização de Processos.               |
| F08 | Dossiês com processos de uma empresa                  | Exploração anterior substituída; fora das opções atuais da P16.              | Organização de Processos.               |
| F09 | Filtros adicionais de prazo demonstrados na P16       | Retirados das opções atuais; nenhum novo parâmetro previsto.                 | Exploração anterior.                    |

## F01 — Tempo médio dos processos em execução

**Diferença encontrada:** o modelo da diretoria apresenta tempo médio dos processos em execução. O contrato atual oferece `averageOpenAgeDays`, que mede idade média dos abertos, incluindo os que aguardam liberação. Isso não é necessariamente o mesmo conjunto nem o mesmo resultado.

**Orientação recebida:** não deixar essa diferença atrapalhar a avaliação visual; anotá-la neste documento para revisão posterior. A P15 exibe um valor demonstrativo no formato original. Esse número não foi obtido de produção.

**Definições para a análise futura:** população exata do indicador; inclusão/exclusão de agendados; instante de referência e fuso; dias corridos ou úteis; campo agregado correspondente. Não usar a média dos oito processos carregados no cartão como média da organização, nem renomear `averageOpenAgeDays` silenciosamente.

**Fontes:** [ProcessOverview](../../src/components/processes/ProcessOverview.tsx), [ProcessIndicators](../../src/types/processes.ts) e `pageInicio()` no [modelo da diretoria](<../../processos-jaralcon%20(1).html>).

## F02 — Quantidade de movimentações

**Diferença encontrada:** o relatório trabalha com registros de movimentação vinculados a processos. Dois processos da mesma empresa podem produzir duas movimentações. `exits.length` não é uma contagem garantida de empresas únicas; aumentos de honorários também não são necessariamente novos contratos.

**Escolha do usuário:** contar e rotular **movimentações**. Isso vale para ganhos e perdas, cartões, resumo textual e relatório. Os totais de ganho, perda e saldo não mudam por essa correção de unidade.

**Implementação futura:** alinhar tela, relatório e PDF. Não introduzir deduplicação por nome, CNPJ ou empresa: a unidade escolhida é movimentação. Valores não informados continuam identificados separadamente e fora dos totais, conforme o contrato.

**Fontes:** [ProcessMovementItem e relatório mensal](../../src/types/processes.ts), [tela](../../src/components/processes/ProcessMovements.tsx), [geração do PDF](../../src/services/processReportPdf.ts).

## F03 — Empresas com e sem perfil financeiro

**Experiência escolhida:** Clientes apresenta todas as empresas autorizadas no contexto, com distinção entre dados financeiros cadastrados e ausência de perfil. Configurar Honorários não cria uma segunda empresa.

**Contrato a conferir:** uma projeção paginada com identidade central, presença de perfil e campos financeiros permitidos. `clients/` lista perfis; `company-options/` e o cadastro central têm outra finalidade. Juntar apenas as primeiras páginas no navegador pode esconder empresas e produzir totais errados.

**Decisões técnicas necessárias:** busca e ordenação globais, filtros Com dados/Sem dados, empresas arquivadas, contagens e acesso do usuário do módulo sem exigir indevidamente permissão de editar o cadastro geral. O painel financeiro conta os perfis elegíveis, não todas as empresas listadas.

**Semântica preservada:** ausência de perfil não é honorário zero. Dados indisponíveis por permissão não são ausência de cadastro.

## F04 — Cadastro central e configuração do módulo

**Experiência escolhida:** selecionar empresa existente ou cadastrar nova empresa explicitamente; vincular os dados de Rotinas/Honorários obrigatoriamente ao mesmo ID central.

**Gravação a revisar:** criar a empresa e salvar a configuração podem ser operações separadas. Se a segunda falhar, a empresa já criada precisa ser reutilizada na retomada. Conferir idempotência, versão e retorno do resultado parcial. O frontend já possui `CompanySetupError` para representar configuração parcialmente concluída; a nova apresentação não transforma automaticamente esse fluxo em uma transação atômica.

**Limites:** não exigir empresa para orçamento genérico, não converter uma proposta aceita silenciosamente e não forçar `companyId` nos payloads de Processos que hoje o removem. Não fundir empresas automaticamente por semelhança de nome.

**Fontes:** [CompanySetupInput e resultado parcial](../../src/types/companySetup.ts), [CompanyService](../../src/services/companyService.ts), [Honorários](../../src/types/honorarios.ts), [ProcessService](../../src/services/processService.ts).

## F05 — Arquivamento, inatividade e presença de configuração

Empresa arquivada no cadastro central, perfil de Honorários arquivado, cenário de empresa inativa na precificação e ausência de configuração de Rotinas são estados distintos.

A prévia identifica esses contextos. A aplicação real precisa seguir as permissões e regras de cada contrato. Arquivar a empresa não deve ser interpretado, apenas por uma mudança de tela, como autorização para apagar perfil, encerrar contrato, retirar vínculos históricos ou alterar propostas salvas.

Avaliar quais operações novas ficam impedidas e como os dados existentes continuam consultáveis. A aprovação do cadastro compartilhado não define automaticamente todas essas consequências.

## F06 — Quadro operacional

**Histórico da exploração anterior; não faz parte da P16 atual nem do escopo autorizado.**

Só se a ideia B for escolhida. O quadro precisa de totais e carregamento por coluna para representar toda a operação. Um processo pode ter setores atuando em paralelo; suas aparições em colunas diferentes não são processos distintos. Conferir paginação, filtros e atualização após ação.

O quadro proposto não avança etapas por arrasto. Autorizar mudança de etapa dessa maneira seria uma função nova, que não foi proposta para implementação.

## F07 — Bancada de execução

**Histórico da exploração anterior; não faz parte da P16 atual nem do escopo autorizado.**

Só se a ideia C for escolhida. O resumo atual fornece uma `nextTask` por processo. Isso permite mostrar um próximo passo e selecionar sua ficha; não garante a listagem de todas as tarefas pendentes da organização.

Se a escolha exigir fila de todas as tarefas, atribuição individual, execução em lote ou conclusão direta sem a ficha atual, definir essas funções e o contrato correspondente separadamente. A prévia não aprova essas ampliações. A ficha de execução existente e suas validações devem ser reutilizadas.

## F08 — Dossiês por empresa

**Histórico da exploração anterior; não faz parte da P16 atual nem do escopo autorizado.**

Só se a ideia D for escolhida. O agrupamento precisa usar `companyId`, com filtro e paginação apropriados no servidor. A lista atual de `ProcessFilters` não expõe esse filtro. Não carregar toda a organização no navegador para simular uma consulta global por empresa.

Definir agregados e preservação dos processos sem vínculo cadastral. Dois processos sem vínculo e com o mesmo nome continuam distintos. O nome registrado no processo e o cadastro atual da empresa não precisam ser reescritos um pelo outro.

## F09 — Filtros adicionais de prazo

Os recortes de vencimentos próximos e ausência de prazo da exploração anterior foram retirados da P16. As quatro alternativas atuais usam os acessos e filtros já existentes. Novos parâmetros não fazem parte desta etapa visual.
