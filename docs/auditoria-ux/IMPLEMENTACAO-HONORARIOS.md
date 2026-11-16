# Honorários — atualização visual

16/11/2026. Implementação em React, preservando os serviços e regras de cálculo existentes.

- Navegação concentra a criação na página Orçamentos; sem entrada própria para Novo orçamento e sem descrições repetidas no cabeçalho.
- Dados do orçamento e cobrança antecedem o perfil de cálculo. Campos organizados em Empresa, Departamento pessoal, Fiscal, Filiais e Ajustes; serviços e exceções em grupos próprios. Flags de Sócios e XML respeitadas.
- Campos monetários principais aceitam digitação numérica e exibem reais, mantendo strings decimais para o backend.
- Seleção de empresa reúne pesquisa e seleção num Combobox; consulta ao servidor continua cancelável e com tratamento de erros de acesso.
- Orçamentos e Clientes abrem pela linha, com teclado; fichas financeiras e criação de perfil usam diálogo compartilhado.
- Comparação comercial usa verde para Podem aumentar, azul para Alinhados e vermelho para Acima. Estados operacionais de outros módulos preservados.
- Parâmetros mantêm as nove seções e a integração existente. Serviços de cálculo, snapshots, revisão, conversão, reajuste, importação e exportação não foram substituídos.

## Integração F03

Foi adicionada a chamada tipada e validada de `GET client-companies/`, conforme o exemplo recebido. Retorna identidade e `hasFinancialProfile`; aceita busca, ordenação e filtro de presença de perfil.

A projeção foi atualizada pelo backend com financialProfile aninhado e integrada à tabela. A lista principal usa paginação, busca, ordenação e filtro Com/Sem perfil no servidor. Perfis existentes abrem pelo ID financeiro, com consulta completa via endpoint de detalhe; empresas sem perfil iniciam o cadastro com companyId selecionado. Valores ausentes permanecem sem valor, nunca zero. A consulta antiga de perfis financeiros permanece acessível para filtros específicos e perfis arquivados; empresas arquivadas não são incluídas na projeção nova.

## Complemento da conferência visual

Resultado e valor negociado reunidos no painel lateral, com ações de salvamento no mesmo local. A apresentação conserva o último resultado durante atualização, identificado pelo aviso de recálculo; salvar continua exigindo resultado atual válido.

Empresa inativa oculta os grupos de Departamento pessoal, Fiscal e Filiais sem apagar seus valores. Segmento precede as opções visíveis de regime. Abertura tem ativação própria; desligada envia valor zero. Serviços e exceções têm controles de ativação, preservando os valores do rascunho para reativar. Os quatro indicadores principais da carteira foram recuperados a partir dos agregados existentes.

O comparativo agregado por regime da prévia ainda não é fornecido pelo contrato do dashboard. Não foi fabricado usando somente uma página de clientes. Esse agregado permanece uma pendência de integração.

## Verificação

Sem execução da bateria de testes, conforme solicitado. Foram executados TypeScript, ESLint nos arquivos alterados, formatação e compilação de produção. Houve conferência em navegador dos cinco destinos principais do React em 1280 × 720, usando respostas simuladas do contrato: [registro](evidencias/validacao-honorarios-implementacao.json). Não representa validação contra o backend real nem teste de regressão completo.
