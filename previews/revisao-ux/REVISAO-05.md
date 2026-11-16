# Revisão 5 — últimos ajustes das prévias

15/11/2026. Mudanças dos módulos somente nas prévias. A base compartilhada já foi implementada no React.

**Aprovadas:** P01, P02, P03, P04, P06, P07, P09, P10, P11, P12, P13, P14, P15, P17 e P18.

**Ajustadas para nova avaliação:**

- [P05 — Novo orçamento](honorarios.html): criação sem aba própria. A entrada do menu passa a Orçamentos; a página de lista oferece Novo orçamento. A criação tem Voltar aos orçamentos. Campos, planos e documento preservados.
- [P08 — Empresas](empresas.html): ficha em janela centralizada, com o mesmo acabamento da ficha de Clientes de Honorários. Busca, filtros, abertura pela linha, edição, máscaras e retorno de foco preservados. Equipe mantém o painel aprovado.
- [P16 — Opção 1](organizacao-processos-ideia.html?ideia=A): escolhida pelo usuário. Os dois grupos se chamam **Acesso rápido** e **Por situação**, conforme resposta no chat. Ambos usam a hierarquia de menu/submenu recolhível de Processos. Meu departamento é um seletor simples, sem aparência de área de trabalho. Listas, estados e filtros mantidos. B/C/D permanecem apenas como histórico.

Verificação desta rodada restrita aos arquivos alterados e fluxos acima em 1280 × 720 e 1366 × 768: [evidência](../../docs/auditoria-ux/evidencias/validacao-rodada5-direcionada.json). A bateria completa não foi repetida após a orientação do usuário.

Antes desta revisão, a base passou por instalação limpa em pasta temporária, formatação, TypeScript, ESLint, 802 testes em 93 arquivos e build. Node local 24.22.2; CI configurada para Node 22.
