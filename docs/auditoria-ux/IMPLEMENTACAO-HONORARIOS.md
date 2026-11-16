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

A projeção foi atualizada pelo backend com financialProfile aninhado e integrada à tabela. Conforme a revisão posterior, a lista exibe somente busca, sem seletores ou filtros adicionais. A paginação continua no servidor; a consulta inclui empresas com e sem perfil. Perfis existentes abrem pelo ID financeiro, com consulta completa via endpoint de detalhe; empresas sem perfil iniciam o cadastro com companyId selecionado. Valores ausentes permanecem sem valor, nunca zero. O endpoint antigo de perfis financeiros foi preservado no serviço, sem introduzir outra consulta na interface. Empresas arquivadas não são incluídas na projeção nova.

## Complemento da conferência visual

Resultado e valor negociado reunidos no painel lateral, com ações de salvamento no mesmo local. A apresentação conserva o último resultado durante atualização, identificado pelo aviso de recálculo; salvar continua exigindo resultado atual válido.

Empresa inativa oculta os grupos de Departamento pessoal, Fiscal e Filiais sem apagar seus valores. Segmento precede as opções visíveis de regime. Abertura tem ativação própria; desligada envia valor zero. Serviços e exceções têm controles de ativação, preservando os valores do rascunho para reativar. Os quatro indicadores principais da carteira foram recuperados a partir dos agregados existentes.

O contrato do dashboard foi posteriormente complementado pelo backend e integrado conforme o [formato confirmado](contrato-dashboard-honorarios.md). O comparativo por regime utiliza os agregados recebidos, sem reconstruir a carteira a partir de páginas de clientes.

## Correção de fidelidade do dashboard — P12

A implementação anterior alterava a composição aprovada: trocava os indicadores e separava alinhamento, propostas e simulação em três painéis. A correção retoma os quatro indicadores da P12: Total de clientes, Faturamento mensal, Potencial de aumento e Reajustes pendentes. Faturamento apresenta o total pelos parâmetros no complemento; potencial anual respeita a configuração de décimo terceiro, como no modelo original.

O conteúdo principal volta a dois blocos: Oportunidade de aumento de receita à esquerda e Situação da carteira à direita. O segundo contém uma barra segmentada com legenda verde/azul/vermelha, resumo de Orçamentos e comparativo por regime. A simulação já existente permanece acessível por botão secundário em janela compartilhada, mantendo o mesmo serviço, limite e cálculo; não ocupa um terceiro painel no dashboard. A entrada inicial da barra lateral de Honorários passa a Home.

Após a confirmação do backend, o frontend passou a usar os dados de empresa e honorários integrais de `clients.adjustmentPlan.entries` e o objeto `clients.byRegime`, com `current` e `byParameters`. O campo separado `clients.opportunities` da proposta inicial foi removido. A lista de oportunidades representa `parameterFee − currentFee`, enquanto a simulação preserva `current`, `proposed`, `gain` e `full`. O backend confirmou que as entradas incluem todos os perfis abaixo do parâmetro mesmo em uma simulação de 0%, preservando as oportunidades no painel. Identidade, valores e regimes são validados pelo serviço, e os links abrem pelo ID do perfil financeiro. Regimes omitidos no objeto são apresentados com zero; ausência do objeto completo mantém a indicação de comparativo indisponível. Não há consultas individuais ou junção de páginas de clientes para montar os indicadores.

A conferência inicial do React em 1280 × 768 e 1366 × 768 usou respostas demonstrativas do contrato anterior e da primeira proposta: [registro histórico](evidencias/validacao-dashboard-honorarios-p12.json). As capturas [com contrato anterior](../../previews/revisao-ux/imagens/HON-painel-api-atual-1366.png) e [com a proposta demonstrativa](../../previews/revisao-ux/imagens/HON-painel-contrato-completo-1366.png) registram essa etapa. A verificação do formato efetivamente confirmado está separada em [integração do dashboard](evidencias/validacao-dashboard-honorarios-integrado.json), incluindo simulação de 0%. Todas essas verificações usam dados locais demonstrativos, não uma sessão autenticada de produção.

Verificações desta correção: TypeScript, ESLint dos arquivos alterados e 36 testes direcionados de dashboard, navegação, serviço e integração de rotas. A bateria completa não foi repetida.

Na integração posterior do contrato confirmado, passaram TypeScript, ESLint e 34 testes direcionados de dashboard, serviço e rotas. Foram conferidos o objeto esparso de regimes, os nomes e IDs das empresas/perfis, a ordenação das oito oportunidades e a manutenção do potencial integral ao simular 0%. A conferência em navegador abrange o formato confirmado nas duas resoluções e a janela de simulação. Nenhum cálculo financeiro, endpoint ou permissão foi alterado.

## Verificação

Sem execução da bateria de testes, conforme solicitado. Foram executados TypeScript, ESLint nos arquivos alterados, formatação e compilação de produção. Houve conferência em navegador dos cinco destinos principais do React em 1280 × 720, usando respostas simuladas do contrato: [registro](evidencias/validacao-honorarios-implementacao.json). Não representa validação contra o backend real nem teste de regressão completo.

A página Clientes possui um único título. Ações ficam na mesma faixa do título; foram removidos Carteira de clientes, a descrição redundante e o título intermediário Empresas e honorários.

## Janela do perfil financeiro — contexto da empresa

Ao abrir uma empresa da lista, o nome passa a ser o título da janela e seu vínculo fica fixo. CNPJ e código aparecem em resumo de consulta, com link para o cadastro geral. O seletor existe somente ao iniciar Novo cliente sem empresa escolhida; após a escolha, a janela assume esse contexto.

O formulário usa blocos de Contrato financeiro e Perfil de cálculo, campos alinhados e observações em largura inteira. Foram retirados o cartão e título internos duplicados. Cancelar e Salvar ficam em um único rodapé visível durante a rolagem. O fechamento é impedido durante gravação; endpoints, companyId, versões, cálculo e validações financeiras foram preservados.

Verificação em 1280 × 720 e 1366 × 768, com respostas simuladas: [evidência](evidencias/validacao-perfil-financeiro-contexto.json). O teste de vínculo confirma nome no título, ausência do seletor e envio do ID da empresa escolhida.

Após esta revisão, TypeScript, ESLint direcionado e os oito testes de parâmetros/carteira passaram. Na execução anterior à reforma desta janela, todos os comandos da CI passaram, incluindo 804 testes em 93 arquivos. A execução foi local, com Node 24; o workflow permanece em Node 22. O npm reportou 16 vulnerabilidades de dependências (11 moderadas e 5 altas); não foram aplicadas atualizações automáticas de dependências.
