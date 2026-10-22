# Backend para o módulo de Processos

Após o login e a seleção da organização, o frontend terá um HUB para escolher entre
**Rotinas** e **Processos**, conforme os acessos do usuário. O módulo de Rotinas
deve continuar funcionando com os dados e acessos existentes.

## Dados e operações de Processos

O arquivo `processos-jaralcon.html` é a referência funcional e visual. Atualmente,
ele usa o banco do Claude ou o armazenamento local do navegador. Para funcionar
com a equipe, os processos precisam ser persistidos e compartilhados pela nossa
API, sempre vinculados à organização ativa.

É necessário preservar:

- Os dez tipos: abertura, transformação MEI → ME, cliente de outro escritório,
  alteração contratual, paralisação, inatividade, reativação, baixa, saída e
  exclusão de cliente. No HTML, os identificadores de paralisação e inatividade
  são, respectivamente, `inatividade` e `inativa`.
- Empresa/cliente, CNPJ, protocolo, prazos, datas, observações e autor da abertura.
- Etapas e tarefas por setor, conclusão, reabertura, “não se aplica”, etapas
  opcionais e liberação de etapas após o período de espera.
- Custos, pagador, parcelas, honorários contábeis e trabalhistas, início da
  cobrança e valores anteriores ou perdidos.
- Detalhes específicos de cada tipo, incluindo alterações contratuais, motivos
  de saída/inatividade, dados do novo contador e opções de reuniões.
- Notas, histórico de ações com autor e data, cancelamento e encerramento.

A API deve permitir listar, consultar, criar, editar e excluir processos, alterar
tarefas, adicionar notas e cancelar/reabrir processos. Também deve fornecer os
dados necessários aos filtros, à fila por setor, aos indicadores de prazo e aos
relatórios de movimentações mensais e honorários. As regras de validação e de
transição devem ser aplicadas no backend.

## Cargos e permissões por módulo

Um usuário pode ter cargos e acessos diferentes em Rotinas e Processos, dentro da
mesma organização. O cadastro deve permitir administrar esses vínculos, e a API
de sessão/permissões deve informar os módulos disponíveis, os setores e as ações
permitidas em cada um. Os papéis organizacionais existentes (`owner`, `admin`,
`member`) continuam sendo distintos dos cargos por módulo; qualquer acesso global
deve ter uma regra explícita.

As regras atuais do HTML são a referência inicial para Processos:

| Setor        | Acesso                                                                                                    |
| ------------ | --------------------------------------------------------------------------------------------------------- |
| Diretoria    | Iniciar e administrar processos, executar tarefas de qualquer setor e visualizar valores e movimentações. |
| Financeiro   | Executar tarefas do próprio setor e visualizar valores e movimentações.                                   |
| Regularidade | Executar tarefas do próprio setor, sem acesso a valores financeiros ou movimentações.                     |

A seleção de setor na interface deve respeitar os acessos cadastrados. O backend
deve validar todas as operações e omitir dados financeiros das respostas para
quem não puder consultá-los, inclusive nas notas e no histórico.

## E-mail ao iniciar um processo

Ao iniciar um processo, o backend enviará um e-mail aos envolvidos com as
informações pertinentes às suas permissões. É necessário definir os destinatários,
o conteúdo e o contrato da operação, evitando envios duplicados em novas tentativas.

## Contratos para integração

Atualizar `ENDPOINTS.md` e `openapi.yml` com as operações, campos, permissões,
respostas e erros de Processos e da administração de acessos por módulo. Com os
contratos definidos, o frontend poderá integrar a persistência e o envio de
e-mail, preservando o comportamento do HTML de referência.
