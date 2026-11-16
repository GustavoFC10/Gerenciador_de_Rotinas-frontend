# Rodada 3 — telas complementares e organização

15/11/2026. Somente prévias e análise. A implementação em produção depende de um próximo pedido.

## Aprovações e ajustes

O usuário aprovou o visual de P05, P11, P07, P13, P06, P01, P04, P08, P09, P10 e P02. A troca de módulos continua via HUB.

- **P03:** criação em três etapas; edição abre diretamente na ficha de revisão. Identificação e Execução podem ser corrigidas na própria ficha, inclusive na etapa 3 da criação. Confirmar valida o grupo; cancelar restaura os dados; o departamento permanece fixo na edição.
- **P12:** Podem aumentar em verde, Alinhados em azul e Acima em vermelho. Essa orientação foi aplicada ao painel sem trocar a paleta já aprovada de Clientes.
- **P08/P11:** o visual aprovado foi preservado, mas os fluxos voltam à avaliação pela nova orientação de empresas compartilhadas. Na galeria, ficam explícitos “visual aprovado” e “novo fluxo”, em vez de apresentar a aprovação antiga como aprovação automática da ampliação.
- As demais aprovações permanecem registradas. A galeria usa uma nova rodada de armazenamento, preservando a avaliação anterior nos documentos de histórico.

## Telas e decisões acrescentadas

| Proposta                                                           | Organização demonstrada                                                                                  | Motivo e limites                                                                                                                             |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| [P14 — Dashboard de Rotinas](dashboard-rotinas.html)               | Prioridades da equipe e vencimentos primeiro, andamento da competência e acesso às planilhas como apoio. | Direção operacional aprovada pelo usuário. Estados, referência da competência e deduplicação de atenção são preservados.                     |
| [P15 — Dashboard de Processos](dashboard-processos.html)           | Base da diretoria: Aguardando você, outros setores, panorama em execução, barra de prazo e Leggacy.      | Corrigir o acabamento sem confundir execução com todos os abertos. Métrica indisponível não vira média de uma página de resultados.          |
| [P16 — Seleção própria de organização](organizacao-processos.html) | Catálogo com filtros combináveis; quadro operacional; bancada de execução; dossiês por empresa.          | O usuário pediu ideias distintas, sem escolher uma antes de testar. Todas preservam os recortes e funções; cada ideia tem avaliação própria. |
| [P17 — Movimentações Empresariais](movimentacoes-processos.html)   | Mês, ganhos, perdas, saldo, duas listas, perdas por tipo, gráfico de 12 meses e relatório de 6 meses.    | Máxima fidelidade à proposta da diretoria. Não transformar receita mensal acrescida/reduzida em recebimento de caixa.                        |
| [P18 — Empresa nos módulos](empresas-modulos.html)                 | Identidade central consultável, configurações específicas de Rotinas e vínculo fácil com Honorários.     | Cadastro central único aprovado. Empresa existente é reutilizada; nova empresa é criada explicitamente e vinculada.                          |

## Processos: alternativas para comparação

A simples mudança de aparência das páginas Minha Fila e Responsabilidade não resolveria sua fragmentação em várias listas equivalentes. A resposta mais recente pede uma exploração completa antes da escolha.

As quatro alternativas variam a unidade de organização: processo consultável, posição operacional, próxima ação e empresa. Não são quatro temas ou densidades da mesma tabela. Busca, tipo, situação, setor, execução liberada, acompanhamento, prazo e abertura da ficha continuam disponíveis. Setor de trabalho não é tratado como atribuição pessoal.

Nenhum quadro autoriza arrastar cartões para burlar etapas. A bancada não presume que `nextTask` contenha todas as tarefas da organização. Dossiês usam a identidade central; processos sem vínculo não são fundidos por semelhança de nome.

Os atalhos de P15/P17 continuam podendo abrir a lista React atual como referência de funcionamento, até que uma alternativa seja escolhida. Isso não escolhe a organização final do menu.

## Empresas: decisão aplicada às prévias

O usuário escolheu identidade central única com telas especializadas, resumo central e acesso contextual aos módulos. Solicitou que Clientes apresente todas as empresas, mesmo sem perfil financeiro, e que o vínculo seja obrigatório e facilitado em Rotinas e Honorários.

- **Todas as empresas:** P11 demonstra empresas com e sem dados, com busca, filtros e paginação.
- **Ausência de perfil:** aparece como “Sem dados financeiros”; não gera honorário zero, diferença fictícia nem participação indevida nos indicadores.
- **Cadastro existente:** selecionar reutiliza a empresa e configura o módulo.
- **Empresa nova:** cadastrar a identidade central e continuar para os dados do módulo. Se houver falha parcial na implementação, retomar a mesma empresa em vez de duplicar.
- **Orçamento genérico:** continua permitido, conforme P05 aprovada. Configurar cliente é uma operação diferente de simular uma proposta.
- **Permissões:** leitura cadastral e acesso financeiro continuam independentes. O exemplo usa uma conta fictícia com acessos completos.

[Pesquisa e comparação de alternativas](../../docs/auditoria-ux/empresas-organizacao.md) · [Mapa do código e dos contratos](../../docs/auditoria-ux/empresas-mapa-atual.md).

## Definições de indicador e revisão funcional posterior

Duas perguntas foram apresentadas separadamente no chat e respondidas:

1. **Tempo médio:** o usuário pediu manter a apresentação visual e adiar a definição funcional. A prévia usa um exemplo de 18 d no formato do original. A diferença entre execução e todos os abertos ficou registrada como F01.
2. **Quantidades de Movimentações:** o usuário escolheu contar e rotular movimentações. Página, resumo e PDF usam essa unidade, preservando os totais financeiros. A escolha ficou registrada como F02.

As dependências de contrato e funções condicionais das alternativas ficam no documento novo [Mudanças funcionais para revisão posterior](../../docs/auditoria-ux/mudancas-funcionais.md). A comparação visual pode seguir sem aprovar esses itens automaticamente.

## Fontes e validação

As análises detalhadas estão em [Rotinas](../../docs/auditoria-ux/rotinas-dashboard.md), [Processos](../../docs/auditoria-ux/processos-telas-secundarias.md), [organização de Processos](../../docs/auditoria-ux/processos-organizacao.md) e [empresas compartilhadas](../../docs/auditoria-ux/empresas-organizacao.md).

A validação usa navegador real e dados fictícios em notebook. Componentes atuais são importados sem alterar `src/` quando reutilizados nos bundles isolados; novas organizações ficam em arquivos de prévia. As simulações locais não comprovam cálculos, sincronização, permissões ou transações de produção.

Foram conferidos 24 estados de tela em 1280 × 720 e 1366 × 768, totalizando 48 combinações sem overflow horizontal da página. Quadros e tabelas preservam sua rolagem local. As quatro ideias passaram pela comparação dos mesmos 18 processos e recortes, abertura da ficha, anotações e exportação de decisões. Os painéis de C ficam alinhados; D demonstra a hierarquia já na abertura e respeita o recolhimento feito pelo usuário.

Fluxos de empresa existente, nova empresa, CNPJ repetido, múltiplos departamentos de Rotinas, ausência de perfil e atualização do painel financeiro foram conferidos. As propostas P06/P07/P10 foram preservadas por comparação de suas funções e HTMLs. O PDF de Movimentações foi gerado localmente, com contagens de movimentações e seis meses no relatório.

Evidências: [P03/P12/P14](../../docs/auditoria-ux/evidencias/validacao-rodada3-inicial.json), [quatro organizações de Processos](../../docs/auditoria-ux/evidencias/validacao-organizacao-processos-edge.json), [empresas e vínculos](../../docs/auditoria-ux/evidencias/validacao-empresas-modulos.json), [perfis e painel](../../docs/auditoria-ux/evidencias/validacao-empresas-painel.json), [dashboard, relatório e PDF](../../docs/auditoria-ux/evidencias/validacao-processos-secundarios.json) e [conferência final](../../docs/auditoria-ux/evidencias/validacao-rodada3-final.json).

Os builds isolados, verificação de tipos, lint, formatação e `git diff --check` passaram. Uma cópia temporária de revisão de formatação em `reports/` foi excluída do escopo dos verificadores, sem alterar seus arquivos; a raiz do parser foi explicitada para evitar ambiguidade com essa cópia. Nenhuma publicação foi feita.
