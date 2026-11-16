# Rodada 2 — ajustes após avaliação

Escopo: somente prévias locais. Nenhuma implementação em produção nesta rodada.

## Decisões recebidas

| Proposta | Decisão    | Aplicação nesta rodada                                                                                                                                                                                                                  |
| -------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P05      | Ajustar    | Recuperar acabamento do formulário e resultado, títulos dentro dos grupos, toggles alinhados, oferta de planos visível quando desativada e proposta no modelo original. Restauração de preço calculado fica contextual à edição manual. |
| P11      | Ajustar    | Linha inteira abre a ficha; oportunidade de aumento com cor e hierarquia mais visíveis.                                                                                                                                                 |
| P07      | Aprovada   | Preservada.                                                                                                                                                                                                                             |
| P12      | Ajustar    | Rótulos e contagens usam as mesmas cores dos segmentos da barra.                                                                                                                                                                        |
| P13      | Ajustar    | Cabeçalho e ferramentas seguem os outros diretórios; filtro junto à busca, ação principal no cabeçalho e linha inteira abre proposta. Documento segue o HTML de referência.                                                             |
| P06      | Aprovada   | Preservada.                                                                                                                                                                                                                             |
| P01      | Refazer    | Usar o React real de Rotinas, suas abas de telas, distribuição, formato, ícones e estados. A planilha não vira entrada para criar modelos de rotina.                                                                                    |
| P03      | Ajustar    | Incluir catálogo e acesso à criação por ele; cadastro ocasional com etapas. O fluxo é conferido no código atual antes de apresentar o desenho.                                                                                          |
| P04      | Ajustar    | Retirar protocolo externo, nome em largura total e recuperar definições da diretoria a partir do React atual, sem usar HTML externo como contrato.                                                                                      |
| P08      | Ajustar    | Mesma lista/ficha, com abertura pela linha inteira.                                                                                                                                                                                     |
| P09      | Ajustar    | Mesma lista/ficha, com abertura pela linha inteira.                                                                                                                                                                                     |
| P10      | Aprovada   | Preservada.                                                                                                                                                                                                                             |
| P02      | Manter HUB | Retirada a alternativa de seletor direto; troca de área pelo HUB.                                                                                                                                                                       |

## Critérios da nova avaliação

- A área inteira da linha abre o registro por mouse ou teclado; controles internos e seleção de texto mantêm seu comportamento.
- A identidade visual deve organizar e destacar a tarefa. Retirar acabamento, controles úteis ou hierarquia do modelo não é uma melhoria por si só.
- Formatação de CNPJ e valores continua aceitando digitação numérica, colagem e edição.
- O resultado financeiro mantém posição durante atualização; a simulação não grava nem calcula preços de produção.
- Campos e definições preservados são verificados contra as fontes indicadas. Elementos ausentes de uma prévia anterior não são presumidos dispensáveis.
- P07, P06 e P10 não precisam de nova escolha por mudanças feitas nas outras propostas.

Na galeria, as três aprovações e a decisão pelo HUB são mantidas. Os demais itens ficam disponíveis para uma nova avaliação, com o feedback anterior visível em cada cartão. A rodada usa armazenamento próprio para não reapresentar automaticamente observações antigas como decisões sobre as novas versões.

## Fontes conferidas

- P01/P02 importam os componentes reais de `src/`, sem editá-los: layout, barra lateral, cabeçalho, planilha, abas, Agenda e HUB. O [ponto de entrada isolado](rotinas-react/entry.tsx) fornece somente contextos e dados fictícios em memória. O bundle local permite abrir as prévias pelo arquivo HTML, sem servidor e sem chamadas ao backend.
- P03 segue `RoutinesPage`, `CreateRoutinePage` e `EntityEditModal`: catálogo com sete colunas, ficha antes da edição e departamento fixo ao editar. O formulário demonstra Identificação, Execução e Revisão. A nova prévia começa no [catálogo](catalogo-rotinas.html).
- P04 foi comparada com `ProcessForm`, `ProcessFields`, `processFormUtils` e o catálogo usado pelo React. Foram recuperados parcelamento, honorário trabalhista, reuniões, observações, perda de honorários, dados do novo contador, Junta Comercial, Leggacy e os dois valores dos reajustes, respeitando as condições de cada tipo.
- P05/P13 usam a proposta comercial do HTML de referência, incluindo marca, cabeçalho, perfil, escopo, investimento e condições. O CSS do documento coincide integralmente com o original. O acabamento do formulário fica separado do documento comercial.
- As funções e os arquivos HTML das três propostas aprovadas (P06/P07/P10) foram comparados à versão anterior com normalização de quebra de linha; o conteúdo foi preservado.

## Validação da rodada 2

Concluída em 13/11/2026, com Edge real:

- Quinze páginas conferidas em 1280 × 720 e 1366 × 768, sem overflow horizontal da página ou imagens locais ausentes. Tabelas mantêm sua rolagem própria.
- Abas, recolhimento da navegação, Agenda e tema de Rotinas; troca de módulo pelo HUB.
- Catálogo → ficha → edição, validação das três etapas e manutenção dos dados ao voltar. O acabamento final mantém controles de 40 px e espaço reservado para erros.
- Treze tipos de Processo, nome em largura total, ausência de protocolo externo e campos condicionais da diretoria. Máscara monetária e total trabalhista conferidos com digitação numérica.
- Linhas de Empresas, Equipe, Clientes e Orçamentos abertas por mouse e teclado; seleção de texto e retorno de foco preservados; busca mantida ao fechar a ficha.
- Planos de orçamento presentes e desativados pela configuração; restauração de preço contextual; valor estável durante recálculo; ações de proposta alcançáveis no notebook.
- Cores de legenda e barras do painel correspondentes; proposta comercial original aberta em P05/P13.
- Nenhuma exceção de JavaScript ou requisição externa nas sessões de validação.

Evidências: [listas e Honorários](../../docs/auditoria-ux/evidencias/validacao-rodada2-parcial.json), [fluxos e tamanhos](../../docs/auditoria-ux/evidencias/validacao-rodada2-fluxos.json), [acabamento e tema](../../docs/auditoria-ux/evidencias/validacao-rodada2-acabamento.json).

O build isolado, `npm run format:check`, `npm run typecheck`, `npm run lint` e `git diff --check` passaram. Ambientes e caches Python locais foram excluídos dos verificadores de frontend; os artefatos dessas dependências não foram reformatados.

Para reconstruir somente a prévia React:

```sh
npx vite build --config previews/revisao-ux/rotinas-react/vite.config.ts
```

As simulações continuam usando dados fictícios. Esta validação verifica as prévias e seus fluxos demonstrativos; integrações e cálculos de produção serão testados na implementação autorizada posteriormente.
