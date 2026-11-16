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

O comparativo agregado por regime da prévia ainda não é fornecido pelo contrato do dashboard. Não foi fabricado usando somente uma página de clientes. Esse agregado permanece uma pendência de integração.

## Verificação

Sem execução da bateria de testes, conforme solicitado. Foram executados TypeScript, ESLint nos arquivos alterados, formatação e compilação de produção. Houve conferência em navegador dos cinco destinos principais do React em 1280 × 720, usando respostas simuladas do contrato: [registro](evidencias/validacao-honorarios-implementacao.json). Não representa validação contra o backend real nem teste de regressão completo.

A página Clientes possui um único título. Ações ficam na mesma faixa do título; foram removidos Carteira de clientes, a descrição redundante e o título intermediário Empresas e honorários.

## Janela do perfil financeiro — contexto da empresa

Ao abrir uma empresa da lista, o nome passa a ser o título da janela e seu vínculo fica fixo. CNPJ e código aparecem em resumo de consulta, com link para o cadastro geral. O seletor existe somente ao iniciar Novo cliente sem empresa escolhida; após a escolha, a janela assume esse contexto.

O formulário usa blocos de Contrato financeiro e Perfil de cálculo, campos alinhados e observações em largura inteira. Foram retirados o cartão e título internos duplicados. Cancelar e Salvar ficam em um único rodapé visível durante a rolagem. O fechamento é impedido durante gravação; endpoints, companyId, versões, cálculo e validações financeiras foram preservados.

Verificação em 1280 × 720 e 1366 × 768, com respostas simuladas: [evidência](evidencias/validacao-perfil-financeiro-contexto.json). O teste de vínculo confirma nome no título, ausência do seletor e envio do ID da empresa escolhida.

Após esta revisão, TypeScript, ESLint direcionado e os oito testes de parâmetros/carteira passaram. Na execução anterior à reforma desta janela, todos os comandos da CI passaram, incluindo 804 testes em 93 arquivos. A execução foi local, com Node 24; o workflow permanece em Node 22. O npm reportou 16 vulnerabilidades de dependências (11 moderadas e 5 altas); não foram aplicadas atualizações automáticas de dependências.
