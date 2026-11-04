# Processos — entrega do frontend, contrato 2

Implementação local de 29/10/2026, compatível com a revisão entregue pelo backend
em 26/10/2026. O endpoint continua `/api/v1/processes/`; `contractVersion=2` e
`workflowVersion=1` são validados separadamente. O catálogo compatível é uma
condição para consultar os demais recursos. Servidores antigos produzem erro
visível; não existe fallback de contrato.

## Comportamento e camadas

- `processContract.ts` valida DTOs desconhecidos em execução, preserva referências
  de requisição e cria modelos independentes da resposta HTTP. Resumos não contêm
  dados de negócio, tarefas ou auditoria. Omissão financeira não vira zero.
- `processService.ts` implementa o transporte, incluindo `status` repetido,
  responsabilidade, fila, mês, paginação e entradas por tipo. `Retry-After` em
  429/503 bloqueia novas chamadas até o prazo indicado, sem repetição automática.
- `useProcessQueries.ts` e `useProcessEntries.ts` isolam consultas dos componentes.
  As chaves contêm organização, membership, contrato e filtros normalizados,
  incluindo página. O conjunto de status é ordenado para formar a chave.
- `ProcessesPage` mantém os filtros na URL e o destino de retorno do detalhe.
  Mudanças de filtro ou setor da fila reiniciam a página. A listagem global não
  herda o setor da fila. Edição só recebe detalhe carregado e autorizado.
- Situações e badges vêm exclusivamente de `status`: `andamento`, `agendado`,
  `atrasado`, `concluido`, `cancelado`. Datas e progresso apenas explicam o estado.
  “Abertos” consulta os três primeiros estados.
- O início consulta seções limitadas separadamente: fila (8), aguardando (6) e
  execução da equipe (6), com acesso às listagens completas. Agendados mostram
  responsável e liberação mesmo quando não há ação liberada.
- Indicadores do início e da navegação são globais; os da listagem usam todos os
  filtros atuais. Nenhum total é deduzido dos registros de uma página. Métricas de
  duração e marcos sem agregado da API deixam de ser apresentadas como globais.
- Notas e eventos usam `entries/` paginado, mais recente primeiro. Eventos
  `status_changed` automáticos identificam “Sistema”; comandos preservam autoria.
  Mutações atualizam detalhe e invalidam listas, indicadores, entradas e relatórios
  sem inserir detalhes nas listas filtradas.
- Logout, atualização de sessão, troca de contexto e revogação cancelam consultas
  e removem dados anteriores. Formulários fecham ao reduzir permissões. Respostas
  tardias de comandos não restauram dados de um contexto abandonado.

## Validação local

Os testes usam o `openapi.yml` gerado do repositório backend desta revisão,
copiado integralmente. O artefato gerado é preservado sem reformatação.

As regressões cobrem os quatro fluxos com segunda visita, status independente do
relógio, resumos/detalhe, paginação e retorno, indicadores, entradas e notas,
autoria automática, reabertura/cancelamento, conflito 409, idempotência, revogação,
troca de organização e omissões financeiras. Também cobrem 400/429/503, erros de
contrato/JSON, coleções vazias, referência da requisição e `Retry-After`, inclusive
no login. O preview usa o mesmo contrato com dados fictícios e snapshots explícitos.

Comandos de verificação: `npm test`, `npm run typecheck`, `npm run lint`,
`npm run build` e `npm run format:check`.

Passaram 408 testes em 67 arquivos, typecheck, lint e build. A formatação dos arquivos desta entrega
passou; o `format:check` global aponta somente `PARECER_PROCESSOS.md`, um arquivo
local anterior preservado a pedido. O build informa um chunk principal acima de
500 kB; a divisão lazy do módulo Processos continua ativa. O preview respondeu
HTTP 200 na rota `/processos` e nas entradas TypeScript, sem inspeção visual em
navegador disponível nesta sessão. O build usou `VITE_API_URL=http://localhost:3000`,
como na CI, sem conexão a uma API de produção.

Essas verificações são locais. Testes com mock não validam banco, migrações,
reconciliação temporal, envio de e-mails, scanner de arquivos ou produção.
`PARECER_PROCESSOS.md` foi preservado como registro da análise anterior.

## Publicação coordenada pendente

Nenhum ambiente foi publicado ou ativado nesta implementação. Não há confirmação
de implantação do backend ou de execução do worker em produção neste ambiente.
Antes da liberação, seguir `docs/REORGANIZACAO_PROCESSOS_ENTREGA.md` do backend:

1. Coordenar manutenção, backup e interrupção de escritas/workers antigos.
2. Aplicar a migração e conferir o relatório de reconciliação dos status.
3. Disponibilizar backend, frontend e `processclock` da mesma revisão.
4. Confirmar catálogo 2, cinco status, lista/detalhe/entries, permissões financeiras
   e worker com contas reais de teste, correlacionando request IDs.
5. Liberar acesso após esse smoke e monitorar 503, conflitos e avaliações vencidas.

A validação do catálogo impede misturar a nova interface com um servidor antigo;
ela não substitui a confirmação operacional da migração e do worker.
