# Organização de Processos — acessos às listas (P16)

15/11/2026. Opção 1 escolhida para a futura implementação; acabamento revisado somente na prévia.

[Comparar alternativas](../../previews/revisao-ux/organizacao-processos.html)

A revisão esclareceu o problema: as filas e seus significados devem continuar existindo. A comparação avaliou como acessar essas consultas. A escolha foi a opção 1, com os nomes Acesso rápido e Por situação, confirmados no chat, e um seletor simples de departamento. Os dois grupos iniciam abertos e permanecem recolhíveis. Os modelos anteriores de quadro, bancada e dossiês foram substituídos. A tabela clássica e a abertura pela linha são iguais nas quatro alternativas.

| Alternativa                                                                                     | Acesso                                                     | Benefício                                 | Compromisso                                         |
| ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ----------------------------------------- | --------------------------------------------------- |
| [A — Menu lateral agrupado](../../previews/revisao-ux/organizacao-processos-ideia.html?ideia=A) | Acesso rápido e Por situação na barra lateral              | Acessos conhecidos visíveis junto à lista | Menu mais extenso, com grupos recolhíveis e rolagem |
| [B — Abas](../../previews/revisao-ux/organizacao-processos-ideia.html?ideia=B)                  | Dois grupos de abas acima da lista                         | Troca direta entre acessos visíveis       | Consome altura no notebook                          |
| [C — Seletor de visão](../../previews/revisao-ux/organizacao-processos-ideia.html?ideia=C)      | Seletor agrupado identifica a lista atual                  | Mais espaço para registros                | Alternativas dentro do seletor                      |
| [D — Central de acessos](../../previews/revisao-ux/organizacao-processos-ideia.html?ideia=D)    | Central com descrição; lista oferece Voltar e Trocar lista | Explica o objetivo de cada destino        | Etapa adicional de entrada                          |

As decisões desta rodada usam nova chave local para não reaproveitar preferências sobre os modelos anteriores. É possível preferir uma alternativa, pedir ajuste ou descartar e exportar o resumo.

## Semântica preservada

- **Minha fila:** execução com ações liberadas e pendências do setor de referência; não é atribuição individual.
- **Responsabilidade:** processos sob responsabilidade do setor, incluindo espera por liberação.
- **Com outros setores:** execução sem pendências do setor de referência.
- **Por situação:** abertos, em andamento, atrasados, aguardando liberação, concluídos, cancelados e todos.

A referência é [processFilters.ts](../../src/utils/processFilters.ts). Busca por empresa/CNPJ/código, tipo, setor, mês de abertura e ordenação funcionam nas quatro alternativas. Personalizar situações abre Todos. O HUB continua sendo a passagem entre módulos.

## Validação e limites

A paridade foi verificada nos dez acessos de A, B, C e D por IDs e ordenação. A amostra tem 18 processos, sendo três em Minha fila do Financeiro, quatro em Responsabilidade e seis Com outros setores. Não representa desempenho da API.

Anotações são locais. Nenhuma prévia conclui tarefas, avança etapas, grava honorários ou altera permissões. A implementação reutilizará lista, paginação, filtros e ficha reais; estas alternativas não requerem novos contratos.

[Evidência](evidencias/validacao-base-previas.json).
