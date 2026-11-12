# Módulo Honorários

Implementação React integrada ao HUB, à sessão e à organização ativa. A referência funcional está em `docs/honorarios_base`; os contratos foram conferidos também no código de `apps/honorarios` do backend disponível no repositório vizinho. A interface reutiliza `ModuleWorkspaceLayout`, os componentes de formulário, botões, cartões e tokens de tema do produto.

## Entrada e acesso

- Rota: `/honorarios`.
- O card e a rota exigem acesso explícito com a ação `read`.
- Convites e gestão de colaboradores oferecem Consulta (`viewer`), Operação (`editor`) e Administração (`manager`), sem departamentos.
- As ações da configuração controlam leitura, edição, reajuste e administração. O cargo organizacional não libera o módulo.
- Permissões ausentes em configurações antigas mantêm Honorários desabilitado. Empresas e Processos conservam seus acessos independentes.

## Fluxos disponíveis

| Tela           | Funções                                                                                                                |
| -------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Painel         | Indicadores, alinhamento da carteira, propostas do ano e simulação de aumentos sem aplicação automática                |
| Novo orçamento | Perfil completo, cálculo no servidor com debounce e cancelamento, composição, planos, descontos e condições comerciais |
| Orçamentos     | Busca e paginação, revisões, proposta salva, aceite com plano explícito, conversão, arquivamento e histórico           |
| Clientes       | Empresa existente, perfil financeiro, comparação com a tabela, reajuste confirmado, histórico, importação e exportação |
| Parâmetros     | Rascunho, tabelas, faixas, adicionais, índices manuais, planos, escritório, logo e unidades                            |

O salvamento de orçamento mantém o mesmo UUID e o mesmo corpo em uma repetição de resultado incerto. Uma nova criação ou revisão recebe outro UUID. O documento efetivamente salvo é apresentado antes de baixar HTML, imprimir/salvar PDF ou copiar a mensagem para WhatsApp. A interface não envia mensagens automaticamente.

Propostas antigas usam exclusivamente os dados preservados pelo backend. O HTML comercial seleciona os nomes dos serviços e as condições do snapshot e não incorpora tabelas internas de preços, custos, margens, exceções operacionais ou o JSON da configuração. Textos são escapados; o documento usa CSP e logo PNG/JPEG em data URL.

Status, conversão, edição, arquivamento e reajuste usam as versões retornadas pelo servidor. O reajuste envia também a versão da tabela e exige nova conferência após conflito. A conversão envia somente versão e empresa, sem um novo valor de honorário. Nenhum fluxo cria empresas ou Processos.

## Importação

CSV e XLSX são interpretados localmente, sem biblioteca externa ou execução de fórmulas. A prévia exige empresas existentes, resolvidas por UUID, CNPJ/código exatos ou seleção explícita. O nome nunca é usado como vínculo automático. As linhas preservam o `profile` JSON da exportação.

O limite é de 10.000 linhas por arquivo e 1.000 por lote enviado à API. Cada lote é transacional; a interface apresenta o resultado dos lotes confirmados e interrompe no primeiro erro. Arquivos XLS antigos precisam ser salvos como XLSX ou CSV. O download CSV usa o endpoint e respeita os filtros.

## Organização do código

- `src/pages/honorarios/HonorariosPage.tsx`: estrutura, rotas e isolamento por organização/membro.
- `src/components/honorarios/`: telas, formulários e componentes compartilhados.
- `src/hooks/useHonorariosCalculation.ts`: debounce e descarte de respostas antigas.
- `src/services/honorariosService.ts` e `src/types/honorarios.ts`: contrato, envelopes, paginação e chamadas pelo cliente HTTP existente.
- `src/utils/honorariosImport.ts`: planilhas e resolução de empresas.
- `src/utils/honorariosProposal.ts`: documento comercial e mensagem.

Consultas são isoladas pela organização e pelo membro. A troca de organização desmonta os formulários e cancela as requisições; falhas de acesso removem o conteúdo. Não existe banco financeiro em localStorage nem retorno silencioso a dados locais.

## Validação

Os testes específicos verificam o contrato HTTP/CSRF, permissões, debounce e respostas antigas, UUID em repetição, seleção de plano, revisões, conversão sem preço editável, conflito de reajuste, rascunho de parâmetros, CSV/XLSX e privacidade do documento comercial. Também há verificações de revogação de acesso e troca de organização.

Com `VITE_API_URL` definido, executar os scripts do projeto:

```text
npm run typecheck
npm run lint
npm run test
npm run build
```

Não houve publicação, commit ou push. A verificação automatizada de componentes usa happy-dom; a conferência visual em navegador e o fluxo autenticado contra a API de implantação precisam ser feitos no ambiente integrado.

Resultado da validação desta entrega: 87 arquivos e 757 testes aprovados; TypeScript, ESLint, formatação dos arquivos novos e build de produção aprovados. O Vite manteve o aviso não bloqueante sobre o tamanho do bundle principal.
