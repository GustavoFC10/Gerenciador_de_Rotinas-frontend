# Componentes base — implementação visual

15/11/2026. Etapa autorizada para aplicação real no React.

[Demonstração dos componentes reais](../../previews/base-components/index.html) · [Prévias pendentes](../../previews/revisao-ux/index.html).

## Aplicado

- Paleta clara e escura: azul profundo da marca, fundos suaves, bordas e sombras discretas.
- Botões de 40 px, compacto de 32 px e destaque de 44 px; ícones de 36 px. Sobrescritas locais de tamanho continuam funcionando.
- TextField e Select de uma linha com 40 px, rótulos, foco, erro, desativado e somente leitura consistentes. Textarea, arquivo e seleção múltipla preservam o comportamento nativo.
- Card, Badge, FloatingMenu e ações do catálogo com acabamento compartilhado.
- Layouts com cabeçalho de 72 px, hierarquia tipográfica e superfícies coerentes. Destinos, menus, permissões e navegação pelo HUB preservados. Empresas e Equipe receberão sua estrutura própria na etapa dos módulos.
- Novo Dialog reutilizável: nome acessível, foco contido, Escape, retorno ao acionador e rolagem interna. A migração dos diálogos específicos será feita por módulo.
- Novo Combobox: busca por rótulo e palavras-chave, seleção explícita, ID separado do texto digitado e teclado. Demonstrado na P11/P18 sem migrar o fluxo real de Honorários nesta etapa.

O Combobox segue o [Fluent 2](https://fluent2.microsoft.design/components/web/react/core/combobox/usage) e o [WAI-ARIA APG](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/). Nenhuma biblioteca foi adicionada.

## Preservação

Os tokens dos estados Pendente, Em andamento, Erro e Concluído foram mantidos. Sem movimento conserva o azul original em tokens próprios, independente da nova marca. A grade, ícones, abas e medidas das células da planilha não foram reorganizados.

A comparação comercial tem tokens separados: abaixo/pode aumentar em verde, alinhado em azul e acima em vermelho, nos dois temas. Eles não representam execução de rotinas nem situações de processos. Superfícies antigas que usam a marca receberam cor de texto correspondente para conservar contraste no tema escuro.

A fonte raiz permanece em 16 px para preservar medidas em rem; o corpo usa 14 px. A barra lateral mantém a largura e os controles de competência mantêm suas ações.

Nenhum serviço, payload, cálculo, snapshot, vínculo, autenticação, permissão ou regra de negócio foi alterado. O ajuste no hook de diálogo limita Escape à sobreposição ativa quando há diálogos empilhados. Os testes verificam isso e o fechamento prioritário do popup do Combobox.

A P18 usa componentes de produção com dados fictícios. Configurações especializadas e criação/vinculação central continuam simulações. Máscaras e alterações específicas serão tratadas por módulo; campos genéricos não recebem uma máscara financeira ou de CNPJ indiscriminadamente.

## Validação

Resoluções verificadas: 1280 × 720 e 1366 × 768. Medidas, temas, foco, seleção estrita, diálogos, paridade dos dez acessos de Processos e catálogos reais estão no [relatório](evidencias/validacao-base-previas.json).

Os checks seguem a CI: formatação, TypeScript, ESLint, testes e build, com VITE_API_URL=http://localhost:3000 nos testes/build. O Vitest passa a descobrir apenas src/**/*.test.{ts,tsx}, evitando cópias históricas em reports/. Nenhum teste da aplicação foi excluído.

Resultado: instalação limpa em pasta temporária, formatação, TypeScript, ESLint, 802 testes em 93 arquivos e build aprovados. Validação local em Node 24.22.2; CI permanece em Node 22. Após a revisão 5 foram feitas apenas verificações direcionadas, conforme pedido. Nenhum deploy realizado.
