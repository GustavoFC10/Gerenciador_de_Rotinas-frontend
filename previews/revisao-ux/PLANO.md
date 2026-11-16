# Revisão de interfaces — plano para avaliação

12/11/2026; rodada 6 atualizada em 15/11/2026. **Componentes base autorizados e implementados em `src/`.** A migração das telas de cada módulo será tratada nas próximas etapas. As propostas pendentes continuam sendo prévias para decisão.

[Base implementada](../../docs/auditoria-ux/IMPLEMENTACAO-BASE.md) · [Rodada 6](REVISAO-06.md) · [Demonstração dos componentes reais](../base-components/index.html)

[Rodada 3 — decisões e escopo](REVISAO-03.md) · [Rodada 2](REVISAO-02.md) · [Abrir propostas](index.html) · [Auditoria completa](../../docs/auditoria-ux/README.md) · [Pesquisa: empresas entre módulos](../../docs/auditoria-ux/empresas-organizacao.md)

## Decisões incorporadas

| Tema                    | Orientação recebida                                                                                                          | Consequência                                                                                                                                                                                                          |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Público                 | Colaboradores por departamento: Fiscal concentra Rotinas; Financeiro/Regularidade, Processos; Diretoria, Honorários.         | Preservar tarefas e contexto de cada módulo. Coerência visual não exige juntar tudo em um fluxo.                                                                                                                      |
| Dispositivo             | Uso exclusivamente em notebook.                                                                                              | Revisão em 1280 × 720 e 1366 × 768; referência adicional de 1440 px. Nenhuma reformulação de celular nesta etapa.                                                                                                     |
| Marca e estados         | Logo Jaral como referência; preservar estritamente o formato da planilha e seus ícones e cores de estado.                    | Azul profundo da marca, superfícies suaves e dourado restrito à marca. Na planilha, somente estilo de superfície, borda, fonte e espaçamento pode ser comparado; sem trocar ícones, formato ou semântica dos estados. |
| Estrutura geral         | Preservar as bases operacionais; Empresas e Equipe podem ser reimaginados, conforme a orientação mais recente.               | P08/P09 demonstram barra lateral, lista e ficha. A autorização atual continua sendo para plano e prévias; produção apenas no próximo pedido.                                                                          |
| Honorários              | Organização e estrutura devem corresponder ao HTML aprovado; prioridade operacional.                                         | A primeira etapa da implementação futura será recuperar nomes, sequência, grupos e condições do modelo.                                                                                                               |
| Orçamento               | Genérico; pode ser vinculado depois. Clientes são empresas preexistentes.                                                    | Não exigir cadastro central na simulação, não transformar texto de prospect em empresa, não criar empresa silenciosamente.                                                                                            |
| Digitação de valores    | CNPJ e dinheiro devem aceitar digitação apenas de números, com máscara automática.                                           | Aplicar CNPJ e moeda brasileira durante a digitação e ao colar; não exigir que a pessoa escreva pontuação. O contrato monetário continua decimal, sem mudar cálculos.                                                 |
| Preservação de contexto | Busca/filtro ao voltar: prioridade.                                                                                          | Tornar contexto de lista recuperável por navegação/URL onde se aplica.                                                                                                                                                |
| Situação dos cadastros  | Pendentes/inativos e empresas arquivadas: prioridade.                                                                        | Demonstrar filtros sem inventar operações de reativação.                                                                                                                                                              |
| Rotinas                 | Cadastro ocasional; alternativa de criar/editar unificada pode ser demonstrada.                                              | P03 começa pelo catálogo: criação em etapas, revisão editável e edição direta na ficha. Sem mudança operacional da planilha.                                                                                          |
| Processos               | Nenhum tipo deve ser privilegiado; seleção compacta pode ser demonstrada.                                                    | P04 mantém catálogo completo, sem favoritos ou ordenação por suposição de uso.                                                                                                                                        |
| Empresas e Equipe       | Reimaginar a organização com barra lateral, lista e ficha. Esta orientação substitui a anterior de ajustar somente o visual. | P08/P09 podem reorganizar navegação e consulta; preservar dados, permissões e consequências de convite, arquivamento e alteração de acesso.                                                                           |
| Seletor de módulos      | Decisão da revisão: manter troca via HUB.                                                                                    | A alternativa de seletor direto foi retirada; P02 mostra somente o HUB.                                                                                                                                               |
| Fora de prioridade      | Ação pela Agenda e histórico com nomes/antes–depois: irrelevantes agora. Rascunho recuperável: útil depois.                  | Excluídos desta rodada. Confirmação básica de descarte continua necessária.                                                                                                                                           |
| Escala                  | Aproximadamente 20 pessoas e 300 empresas.                                                                                   | Previews com essa escala para navegação; isso não é teste de desempenho da API.                                                                                                                                       |

## Ordem de avaliação das prévias

Os identificadores permanecem estáveis; a ordem abaixo prioriza a operação de Honorários.

| Ordem | Prévia                                                           | O que avaliar                                                                                                             | O que deve ser preservado                                                                                                          |
| ----- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 1     | [P05 — Orçamento](honorarios.html)                               | Dados do orçamento e abertura antes do perfil; Empresa/DP/Fiscal/Filiais/Ajustes; condicionais; posição estável do valor. | Orçamento genérico, cálculos no backend, campos e organização do modelo.                                                           |
| 2     | [P11 — Clientes](clientes-honorarios.html)                       | Colunas e filtros comerciais do HTML; ficha de cliente; comparação e contrato; busca preservada.                          | Empresa central preexistente; perfil financeiro separado do cadastro central.                                                      |
| 3     | [P07 — Parâmetros](parametros.html)                              | Nove abas na mesma ordem; todos os grupos; Dados do escritório completos; rascunho entre abas.                            | Valores, flags de configuração, regras, conflitos e versões.                                                                       |
| 4     | [P12 — Painel](painel-honorarios.html)                           | Quatro indicadores originais, Oportunidade de aumento e Situação da carteira.                                             | Indicadores completos e verdadeiros vindos da API.                                                                                 |
| 5     | [P13 — Orçamentos salvos](orcamentos-honorarios.html)            | Orçamentos como lista principal; Novo orçamento como ação da página; status, valores e proposta.                          | URLs, revisões e snapshots da integração. Documento da prévia deve usar o template do HTML aprovado, sem um relatório alternativo. |
| 6     | [P06 — Vínculo existente](vinculo-orcamento.html)                | Confirmar a empresa e explicar efeito de adicionar/atualizar a carteira.                                                  | Aceite e `companyId` quando usar conversão; nenhuma criação automática de empresa.                                                 |
| 7     | [P01 — Linguagem visual](base-visual.html)                       | Superfícies, marca, hierarquia de botões, medidas e legibilidade.                                                         | Estrutura da planilha e cores dos estados.                                                                                         |
| 8     | [P03 — Catálogo e formulário de Rotinas](catalogo-rotinas.html)  | Criação pelo catálogo em etapas; revisão editável e edição direta na ficha.                                               | Dados, regras de recorrência, vínculos e configuração ocasional do React atual.                                                    |
| 9     | [P04 — Tipo de Processo](processos.html)                         | Catálogo completo inicialmente; depois seleção compacta e Trocar tipo.                                                    | Campos e regras específicos de cada tipo. A prévia não é uma implementação completa dos treze contratos.                           |
| 10    | [P08 — Empresas](empresas.html)                                  | Nova organização com barra lateral, lista/ficha, filtros e arquivados.                                                    | Campos de cadastro e significado dos dados; filtros e posição ao voltar.                                                           |
| 11    | [P09 — Equipe](equipe.html)                                      | Nova organização com barra lateral, pessoas/ficha, pendentes e acessos legíveis.                                          | Permissões por módulo, convites explícitos e estados efetivos das pessoas.                                                         |
| 12    | [P10 — Estados e mensagens](estados.html)                        | Carregamento, erro com repetição, descarte e indisponibilidade antecipada.                                                | Destinos atuais de configurações e autorizações.                                                                                   |
| 13    | [P02 — Troca de módulo](navegacao.html)                          | Manter a passagem pelo HUB.                                                                                               | Acesso efetivo por usuário; não criar seletor direto.                                                                              |
| 14    | [P14 — Dashboard de Rotinas](dashboard-rotinas.html)             | Atenção e tarefas primeiro, competência e acesso às planilhas.                                                            | Cores e estados, população autorizada e contagens sem duplicação.                                                                  |
| 15    | [P15 — Dashboard de Processos](dashboard-processos.html)         | Recuperar panorama em execução e organização da diretoria.                                                                | Significado de espera/execução, prazos e Leggacy.                                                                                  |
| 16    | [P16 — Organização de Processos](organizacao-processos.html)     | Comparar quatro formas de acessar as mesmas listas e registrar a decisão.                                                 | Mesmas funções e recortes; nenhuma alternativa escolhida automaticamente.                                                          |
| 17    | [P17 — Movimentações Empresariais](movimentacoes-processos.html) | Máxima fidelidade ao original, relatório e nova unidade movimentações.                                                    | Ganho/perda/saldo mensal e períodos de 12/6 meses.                                                                                 |
| 18    | [P18 — Catálogos do módulo Rotinas](empresas-rotinas.html)       | Conferir as listas reais de Empresas e Rotinas e o vínculo com a configuração.                                            | Identidade compartilhada, vínculos obrigatórios e permissões independentes.                                                        |

A rodada 3 preserva a aprovação visual de P08/P11 e demonstra a ampliação do fluxo de empresas para nova avaliação. P03 passa a ter edição direta na ficha; apenas a criação usa etapas, com a revisão também editável. Consulte [as decisões completas](REVISAO-03.md).

## Plano de implementação, sujeito à revisão visual

### Etapa 1 — Fidelidade de Honorários e estabilidade

1. Usar a matriz H01–H23 de [fidelidade](../../docs/auditoria-ux/honorarios-fidelidade.md) como checklist obrigatório. Comparar o HTML, o JSON de parâmetros e os componentes atuais antes de mudar a apresentação.
2. Refatorar `ProfileFields` em grupos menores, compartilhados entre orçamento e cliente: Empresa, Departamento pessoal, Fiscal, Filiais, Ajustes. Preservar objetos e chaves dos payloads; separar apresentação de adaptadores de API.
3. Recuperar ordem de `QuoteEditor`: Dados do orçamento → Abertura e início da cobrança → grupos de perfil; resultado na lateral com Valor a propor antes da composição. Campos condicionais seguem as flags originais; não apagar valores ao alternar.
4. Resolver a estabilidade de `useHonorariosCalculation`/resultado reservando espaço e sinalizando dado antigo durante recálculo. Salvar continua indisponível enquanto não houver cálculo válido para a entrada atual. Não usar resultado obsoleto para gravar proposta.
5. Recuperar organização de Clientes e sua ficha, mantendo identidade do cadastro central somente para consulta/seleção. Data do contrato/reajuste e observações voltam às posições do modelo; preservar busca/filtro/ordem ao fechar.
6. Manter nove abas de parâmetros já recuperadas. Completar apenas divergências verificadas e retirar repetição de cabeçalhos. Gravação continua com versão, validação e conflito; restauração preserva Dados do escritório.
7. Agrupar Novo orçamento/Orçamentos salvos sob Orçar conforme o modelo, mantendo URLs e links antigos funcionais. Não migrar toda a navegação do produto.

**Verificação:** grupos/ordem, dependências de notas/sócios/XML/horas/inativa/planos, moeda brasileira, ausência de salto durante latência e erro, cálculo autoritativo, acesso de consulta/operação/administração, revisão e snapshots, conflito e proteção de alterações.

### Etapa 2 — Painel e dependências reais do contrato

1. Repor indicadores e organização do painel original onde os dados já existem. Não trocar ausência de dados por zeros fictícios.
2. Verificar se o backend fornece as oportunidades com nome e a comparação por regime para toda a carteira. Acrescentar agregados no backend se necessário; não calcular indicadores globais a partir de uma página de vinte clientes.
3. Tratar separadamente o terceiro modo de horas (`tabela`), que existe no HTML e não é aceito pelo tipo atual. A prévia o identifica como indisponível. Definir e validar suporte no backend antes de habilitar.
4. Vínculo posterior à criação: distinguir criação/revisão com `companyId` de conversão aceita, que também altera carteira. Não apresentar conversão como mero vínculo sem consequência.

**Fora desta etapa:** jornada automática “Cadastrar empresa e vincular” — ideia a avaliar posteriormente. Não inferir autorização para criar endpoint, transação ou empresa a partir de prospect.

### Etapa 3 — Linguagem visual e comportamentos compartilhados

1. Consolidar tokens de superfícies, texto secundário, bordas, espaço e alturas usando o sistema existente. Cores de estado de Rotinas permanecem intactas.
2. Reutilizar `Button`, `TextField`, `Select`, `Textarea`, `Card`, componentes de catálogo e diálogos existentes. Corrigir alturas/alinhamento e linhas de rótulo conforme a necessidade; não impor largura igual a código e razão social.
3. Remover títulos repetidos e descrições que apenas repetem o nome da tela. Manter ajuda que muda uma decisão financeira, de prazo ou de permissão.
4. Corrigir foco, nomes acessíveis, erro associado a campo, descarte e fechamento durante gravação; estados de loading/erro permanecem no contexto da página.
5. Em Empresas/Equipe, demonstrar e, após revisão, implementar a organização autorizada de barra lateral, lista e ficha. Busca, filtros e posição da lista devem sobreviver à abertura e ao fechamento de um registro. Preservar campos, permissões e a distinção entre convidar e alterar acessos.

As máscaras de CNPJ e moeda devem aceitar a digitação somente de números e a colagem de texto formatado. A apresentação precisa permanecer separada dos valores canônicos da API: não transformar a revisão visual em um segundo motor financeiro.

### Etapa 4 — Somente alternativas escolhidas

- P03/P04: implementar apenas depois de o usuário revisar as alternativas. Rotinas usa um formulário consistente para criação/edição ocasional; Processos oferece todos os treze tipos com o mesmo peso e um seletor compacto depois da escolha.
- P08/P09: a reimaginação de Empresas e Equipe foi autorizada para as prévias, substituindo a restrição anterior. A implementação da alternativa revisada continua reservada ao próximo pedido.
- P02: manter o HUB; a revisão recusou o seletor direto.
- Qualquer outra mudança estrutural deve ser apresentada no chat antes de entrar no trabalho.

### Etapa 5 — Cadastro compartilhado e telas complementares

1. Preservar a identidade central única. Disponibilizar em Clientes as empresas autorizadas com e sem perfil financeiro, sem tratar ausência de dados como valor zero. A ficha central oferece resumo e acessos aos módulos permitidos.
2. Facilitar seleção de empresa existente ou criação central explícita a partir de Rotinas/Honorários, seguida da configuração do módulo. Validar gravação parcial e retomada com o mesmo ID antes de implementar.
3. Implementar o dashboard operacional de Rotinas somente depois da revisão da P14. Recuperar dashboard e Movimentações de Processos usando o modelo da diretoria e a avaliação de P15/P17.
4. A opção 1 da P16 foi escolhida: Acesso rápido e Por situação em menus recolhíveis, com seletor simples de departamento. Aguardar a revisão desse acabamento; tabela e funções atuais preservadas. As demais opções ficam como histórico.
5. Examinar individualmente [as mudanças funcionais](../../docs/auditoria-ux/mudancas-funcionais.md), incluindo métricas e contratos condicionais às ideias escolhidas. A disponibilidade de uma amostra local não comprova paginação, agregados ou permissões de produção.

## Critérios de aceite e validação futura

- Nenhuma alteração de organização fora das escolhas aprovadas.
- Honorários recupera a matriz do modelo; divergências por contrato ficam explícitas e não são mascaradas por UI fictícia.
- CNPJ e dinheiro com digitação numérica, máscara e colagem coerentes; sem perda de centavos ou truncamento silencioso.
- 1280/1366 px utilizáveis, sem overflow horizontal da página, cortes de rótulo ou deslocamentos durante preenchimento. Rolagem própria de tabela continua permitida quando necessária.
- Busca/filtro/página preservados; pendentes/inativos e arquivados encontráveis.
- Permissões, CSRF, idempotência, validação monetária/CNPJ, snapshots e versões mantidos.
- Testes futuros devem cobrir comportamento real, contratos e navegação, sem repetir CSS em testes sem valor.
- Em cada etapa: executar `npm ci`, `npm run format:check`, `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`, conforme `.github/workflows/ci.yml`, com `VITE_API_URL` de teste. A etapa base também tem validação dos componentes e layouts reais em navegador.

## Referências da decisão visual

[Fluent: princípios](https://fluent2.microsoft.design/design-principles), [campos](https://fluent2.microsoft.design/components/web/react/core/field/usage/), [layout](https://fluent2.microsoft.design/layout), [conteúdo](https://fluent2.microsoft.design/content-design), [Google Workspace: administração de pessoas](https://knowledge.workspace.google.com/admin/users/add-an-account-for-a-new-user), [Material: papéis de cor](https://m3.material.io/m3/pages/color-roles?s=m3). A aplicação dessas referências é uma decisão deste estudo. A estrutura aprovada de Honorários prevalece sobre uma reorganização sugerida por analogia com outro produto.

## Como revisar cada proposta

Na [galeria](index.html), abra a prévia em uma nova aba, experimente os controles indicados e registre **Aprovar**, **Pedir ajuste** ou **Manter atual**. Quando houver ajuste, descreva-o no cartão. As escolhas ficam apenas no navegador; copiar ou baixar o resumo permite enviá-las no próximo pedido. Registrar uma escolha nesta galeria não executa implementação nem publica nada.

As imagens são capturas de prévias com dados fictícios. As simulações financeiras ajudam a avaliar organização e comportamento visual; não comprovam o resultado dos cálculos do backend. A auditoria do estado atual permanece separada das sugestões, para não confundir uma tela demonstrativa com o produto em produção.
