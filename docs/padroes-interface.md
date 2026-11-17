# Padrões dos componentes gerais

## Base visual

Rotinas é a referência para cores, superfícies, dimensões, alinhamentos e o acesso ao perfil no rodapé da barra lateral. As estruturas específicas dos módulos e os componentes já definidos nas previews continuam sendo as referências para suas respectivas telas.

O retorno aos módulos usa provisoriamente o padrão contornado de Honorários, com ícone de módulos e o texto “Voltar aos módulos”. O componente `ModulesReturnLink` concentra esse desenho para permitir revisá-lo sem alterar cada módulo.

Todos os acessos ao perfil levam a `/perfil`, fora dos dados operacionais de Rotinas. A rota anterior `/hub/perfil` redireciona para a página geral. O perfil conserva os controles existentes em um painel compacto, sem repetir nome e email em um resumo e em campos, nem inserir descrições em todas as seções.

## Tipografia por contexto

| Uso                                                | Tamanho                            | Peso    | Critério                                                            |
| -------------------------------------------------- | ---------------------------------- | ------- | ------------------------------------------------------------------- |
| Título de página operacional                       | 20 px no celular, 24 px no desktop | 600     | Um título principal para orientar a tarefa.                         |
| Seção de página ou formulário                      | 16 px                              | 600     | Apenas quando há um grupo de conteúdo que precisa de identificação. |
| Grupo pequeno em formulário                        | 14 px                              | 600     | Diferencia um grupo sem competir com o título da seção.             |
| Conteúdo, descrições curtas, navegação e controles | 14 px                              | 400–600 | Peso reforçado para rótulos e itens que exigem destaque.            |
| Metadados e ajuda complementar                     | 12 px                              | 400–600 | Não usar para instruções essenciais ou parágrafos longos.           |

Os valores são declarados em `rem`. Tamanhos de outros contextos, como login, apresentação do HUB e indicadores, podem diferir intencionalmente. Evitar aplicar um único tamanho a todos os títulos ou criar um título e uma descrição para cada bloco de interface. A descrição deve acrescentar uma instrução, regra ou contexto que ainda não esteja no título ou no controle.

Inter é fornecida localmente em WOFF2, com tamanhos ópticos automáticos e fallback para as fontes do sistema. A família já estava declarada no projeto, mas sem um arquivo de fonte: o desenho efetivo dependia das fontes instaladas no dispositivo. O arquivo local torna a escolha explícita e consistente.

### Referências pesquisadas

- [Carbon — Typography / type sets](https://www.carbondesignsystem.com/building-blocks/foundations/typography/type-sets): a escala produtiva usa base de 14 px e diferencia corpo, rótulos, ajuda e títulos de componentes.
- [Atlassian — Applying typography](https://atlassian.design/foundations/typography/applying-typography): títulos curtos, hierarquia semântica, tamanhos relativos e texto de corpo para botões, menus e campos.
- [Inter — documentação oficial](https://rsms.me/inter/): a família oferece desenhos ópticos para texto e recursos voltados à legibilidade de interfaces e dados tabulares.

A escala adotada é uma adaptação para este sistema, não uma reprodução integral dessas bibliotecas.

## Sugestões para próximas etapas

As propostas abaixo não alteram decisões já definidas nas previews e ainda não constituem novos componentes implementados.

1. **Botões por intenção e estado:** primário, secundário, discreto e destrutivo; carregando, desabilitado e com ícone. Separar o tamanho da intenção e ter um padrão comum para links com aparência de botão. Hoje vários fluxos ainda montam essas variações diretamente em CSS ou classes locais.
2. **Campos com contrato comum:** rótulo, ajuda, obrigatório, erro e sucesso; ícones de início/fim, limpeza e tamanhos compatíveis com botões. Preservar diferenças funcionais entre busca, senha, moeda, data e seleção. Não fazer todos os campos parecerem idênticos apenas por compartilharem o mesmo componente base.
3. **Ações de página e de formulário:** posição e ordem consistentes para criar, cancelar, salvar e excluir. Ações destrutivas precisam de distinção por intenção, sem usar a cor da marca como único sinal.
4. **Feedback e estados vazios:** diferenciar ausência de cadastro, busca sem resultados, falta de permissão, falha e carregamento. Padronizar a apresentação mantendo mensagens e ações específicas da tarefa.
5. **Ícones e informações truncadas:** família visual, tamanhos, espessura, nome acessível e ajuda ao passar o mouse ou focar. Nomes e emails podem truncar na barra; dados que a pessoa precisa ler na página devem quebrar linha ou ter outra forma de consulta.
6. **Recolhimento das barras:** Rotinas já oferece o estado recolhido. Vale definir como hierarquias e submenus de Processos devem funcionar nesse estado antes de estender o comportamento aos demais módulos.
7. **Preferências entre sessões:** hoje tema e densidade são estados da aplicação. Definir se devem ser guardados por navegador ou por usuário, e seu comportamento ao trocar de organização.
