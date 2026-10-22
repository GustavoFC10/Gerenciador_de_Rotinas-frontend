# Preview local das novas funcionalidades

Execute `npm run preview:features` e abra **http://127.0.0.1:4174**.

O preview abre o HUB com uma sessão demonstrativa. Não precisa de staging,
credenciais ou configuração de API. O servidor atende somente na máquina local.

Use **Preview local · dados fictícios**, no canto inferior direito, para trocar
entre Diretoria, Financeiro, Regularidade, Rotinas e administrador sem acesso
inicial a Processos. Nesse painel também é possível trocar o tema e reiniciar
todos os exemplos.

Você pode explorar:

- HUB, navegação entre módulos, perfil e preferências.
- Os dez tipos de processo, fila por setor, filtros, indicadores e prazos da Leggacy.
- Abertura e edição, definições, tarefas, comentários, histórico, cancelamento,
  reabertura e exclusão dos exemplos.
- Relatórios mensais e download de PDF com a identidade visual original.
- Cargos e acessos por módulo: as mudanças podem ser conferidas trocando o perfil.
- No HUB → Equipe (exclusivo de owner), convite, consulta e edição de colaboradores de todos os
  módulos. Teste contas apenas de Processos, cargos por setor e habilitação ou
  bloqueio independente de Rotinas e Processos, inclusive em convites pendentes.
- Estados simulados dos e-mails e nova tentativa dos envios pendentes.
- Uma planilha de Rotinas com tarefas fictícias para conferir a troca de módulo.

As mudanças ficam no armazenamento local exclusivo do preview. **Nenhum e-mail é
enviado e nenhum dado real é alterado.** Uploads de arquivos não são enviados neste
ambiente demonstrativo. A simulação permite visualizar os fluxos, mas não substitui
os testes das regras e integrações do backend.

`npm run dev` e o build de produção continuam usando a aplicação normal. O mock só
é instalado pela entrada específica de `vite.preview.config.ts`.
