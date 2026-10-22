# Guia de endpoints da API

Este documento descreve as rotas expostas pelo backend no estado atual do código e
mostra um exemplo de utilização de cada operação HTTP.

Revisado em 14/10/2026 contra o texto fornecido do frontend, as rotas, serializers,
policies e services atuais. A terminologia do produto é **colaborador**; na API,
esse perfil continua sendo `OrganizationMember`, com rotas `organization-members/`
e identificadores `memberId`/`membershipId`. Esses nomes técnicos não foram alterados.

Atualização de 19/10/2026: contrato de anexos revisado com `attachmentCount`,
`uploadExpiresAt`, `updatedAt`, `upload.method`, `upload.enctype` e `Retry-After`
exposto pelo CORS. As seções de tarefas e arquivos abaixo descrevem esses campos
e a integração de progresso/fila; os exemplos completos de transporte estão no
[guia de feedbacks e anexos](CONTRATO_FEEDBACKS_ANEXOS.md).

Arquivos foram validados localmente em 13/10/2026 com 229 testes aprovados; veja
[RELATORIO_TESTES_ARQUIVOS.md](RELATORIO_TESTES_ARQUIVOS.md). As rotas dependem de
`FILES_API_ENABLED=True`, bucket e worker configurados. No rollout interno, definir
`FILES_REQUIRE_MALWARE_SCAN=False`; scanner é exigido somente quando essa flag é
`True`. Consulte a seção 15 para o fluxo de frontend e as regras de ativação.

## 1. Convenções dos exemplos

Atualização de 22/10/2026: o módulo **Processos**, o HUB da sessão e os vínculos por
módulo estão documentados na seção 17. As rotas de Rotinas e seus vínculos existentes
permanecem válidos. Processos usa `version` no corpo das mutações e conflito `409`,
conforme seu contrato abaixo; as operações anteriores continuam usando `If-Match`.

O cadastro geral agora aceita `moduleAccesses` no convite e na edição do
colaborador. Nas rotas operacionais, o nível administrativo de Rotinas pode ser
configurado separadamente do cargo organizacional. As referências anteriores a
owner/admin nessas rotas seguem esse nível do módulo; a administração de contas,
organização e recursos compartilhados continua seguindo o cargo organizacional.

Os exemplos usam PowerShell e `curl.exe`:

```powershell
$BASE_URL = "http://localhost:3000"
$CSRF = "TOKEN_RETORNADO_PELO_ENDPOINT_CSRF"
```

Substitua valores como `<UUID_DA_EMPRESA>` e `<UUID_DA_TAREFA>` pelos IDs retornados
pela API. `cookies.txt` mantém a sessão e o cookie CSRF entre as chamadas.

### Autenticação, tenant e CSRF

- a API de negócio usa sessão Django, não token Bearer;
- envie `-b cookies.txt -c cookies.txt` para reutilizar e atualizar os cookies;
- operações de escrita exigem `X-CSRFToken`;
- depois do login, selecione uma associação ativa quando o usuário possuir mais de
  uma organização;
- a organização nunca é recebida no payload: ela vem da associação ativa da sessão;
- IDs de outro tenant ou fora do escopo normalmente retornam `404`.

### Concorrência com ETag

Recursos mutáveis retornam um header como:

```http
ETag: "3"
```

Nas operações que exigem controle de versão, devolva o valor no `If-Match`:

```powershell
-H 'If-Match: "3"'
```

Sem `If-Match`, a API retorna `428`. Se a versão estiver obsoleta, retorna `412`.

### Paginação e erros

Listas comuns usam paginação por página:

```json
{
  "count": 1,
  "next": null,
  "previous": null,
  "results": []
}
```

Tarefas e eventos usam cursor, com `next`, `previous` e `results`. Erros tratados usam
`application/problem+json` e podem incluir um mapa `errors` por campo.

Todas as respostas recebem `X-Request-ID`. O cliente pode enviar um valor próprio de
1 a 64 caracteres usando esse mesmo header. São aceitos apenas letras ASCII, números,
ponto, sublinhado, dois-pontos e hífen (`A-Z`, `a-z`, `0-9`, `.`, `_`, `:` e `-`). Um
valor fora desse padrão é substituído por um UUID gerado pelo servidor.

Para origens autorizadas, o CORS da API expõe `ETag`, `X-Request-ID` e
`Retry-After` ao JavaScript. O CORS do bucket S3 é configurado separadamente:
o navegador envia os bytes diretamente ao armazenamento.

### Feature flag da Fase 4

Rotinas, presets, vínculos de rotina, competências, tarefas e telas operacionais só
executam quando:

```text
OPERATIONS_API_ENABLED=True
```

Com a flag desligada, essas rotas retornam `404`. Anexos também passam pelas flags
de arquivos da seção 15: `FILES_API_ENABLED=False` retorna `501` antes da checagem
operacional; com arquivos habilitados e operações desabilitadas, retorna `404`.

## 2. Infraestrutura e documentação

### `GET /health/live/`

Confirma que o processo web está respondendo. É público e não consulta o banco.

```powershell
curl.exe "$BASE_URL/health/live/"
```

Resposta esperada: `200 {"status":"ok"}`.

### `GET /health/ready/`

Executa uma consulta simples no PostgreSQL. Retorna `503` quando o banco não está
disponível.

```powershell
curl.exe "$BASE_URL/health/ready/"
```

Resposta saudável: `200 {"status":"ok","database":"ok"}`.

### `GET /api/schema/`

Retorna o contrato OpenAPI em YAML.

```powershell
curl.exe "$BASE_URL/api/schema/"
```

### `GET /api/docs/`

Abre a documentação Swagger UI baseada no schema atual.

```powershell
Start-Process "$BASE_URL/api/docs/"
```

### `/admin/`

Interface administrativa interna do Django. Exige usuário `staff`; não substitui a
API do produto.

```powershell
Start-Process "$BASE_URL/admin/"
```

## 3. Autenticação e sessão

### `GET /api/v1/auth/csrf/`

Emite o cookie CSRF e retorna o token que deve ser usado nas escritas. É público.

```powershell
curl.exe -c cookies.txt "$BASE_URL/api/v1/auth/csrf/"
```

Exemplo de resposta:

```json
{ "csrfToken": "TOKEN_MASCARADO" }
```

### `POST /api/v1/auth/login/`

Autentica por e-mail e senha. Se houver exatamente uma associação ativa, ela é
selecionada automaticamente. Exige o cookie e o header CSRF.

```powershell
curl.exe -X POST "$BASE_URL/api/v1/auth/login/" `
  -b cookies.txt -c cookies.txt `
  -H "X-CSRFToken: $CSRF" -H "Content-Type: application/json" `
  -d '{"email":"admin@example.com","password":"Senha-segura-2026!"}'
```

O sucesso retorna usuário, associações, associação ativa e um novo `csrfToken`. O
Django rotaciona o segredo CSRF durante o login; portanto, substitua o valor usado nos
comandos seguintes pelo token retornado:

```powershell
$CSRF = "NOVO_TOKEN_RETORNADO_PELO_LOGIN"
```

### `POST /api/v1/auth/logout/`

Encerra a sessão autenticada. Retorna `204`.

```powershell
curl.exe -X POST "$BASE_URL/api/v1/auth/logout/" `
  -b cookies.txt -c cookies.txt -H "X-CSRFToken: $CSRF"
```

### `GET /api/v1/auth/session/`

Retorna o usuário autenticado, suas associações ativas e a associação selecionada.

```powershell
curl.exe "$BASE_URL/api/v1/auth/session/" -b cookies.txt
```

### `GET /api/v1/auth/memberships/`

Lista as associações ativas disponíveis para o usuário autenticado.

```powershell
curl.exe "$BASE_URL/api/v1/auth/memberships/" -b cookies.txt
```

### `PUT /api/v1/auth/active-membership/`

Seleciona a associação/organização que será usada nas próximas requisições.

```powershell
curl.exe -X PUT "$BASE_URL/api/v1/auth/active-membership/" `
  -b cookies.txt -c cookies.txt `
  -H "X-CSRFToken: $CSRF" -H "Content-Type: application/json" `
  -d '{"membershipId":"<UUID_DA_ASSOCIACAO>"}'
```

### `POST /api/v1/auth/invitations/accept/`

Aceita um convite de uso único. Para identidade nova, define a senha; para identidade
existente, confirma a senha atual. É público, mas exige CSRF.

```powershell
curl.exe -X POST "$BASE_URL/api/v1/auth/invitations/accept/" `
  -b cookies.txt -c cookies.txt `
  -H "X-CSRFToken: $CSRF" -H "Content-Type: application/json" `
  -d '{"token":"TOKEN_RECEBIDO_POR_EMAIL","password":"Senha-segura-2026!","passwordConfirm":"Senha-segura-2026!"}'
```

O sucesso retorna `204`.

### `POST /api/v1/auth/password-reset/request/`

Solicita recuperação de senha. A resposta é sempre genérica para não revelar se o
e-mail existe.

```powershell
curl.exe -X POST "$BASE_URL/api/v1/auth/password-reset/request/" `
  -b cookies.txt -c cookies.txt `
  -H "X-CSRFToken: $CSRF" -H "Content-Type: application/json" `
  -d '{"email":"pessoa@example.com"}'
```

Retorna `202`.

### `POST /api/v1/auth/password-reset/confirm/`

Confirma a redefinição com o `uid` e o token recebidos por e-mail.

```powershell
curl.exe -X POST "$BASE_URL/api/v1/auth/password-reset/confirm/" `
  -b cookies.txt -c cookies.txt `
  -H "X-CSRFToken: $CSRF" -H "Content-Type: application/json" `
  -d '{"uid":"UID_RECEBIDO","token":"TOKEN_RECEBIDO","newPassword":"Nova-senha-2026!","newPasswordConfirm":"Nova-senha-2026!"}'
```

O sucesso retorna `204` e invalida sessões anteriores por meio da versão de
autenticação.

## 4. Organização, convites e departamentos

Colaborador é o perfil da pessoa em uma organização, identificado pelo UUID de
`OrganizationMember`; ele não é o UUID global de `User`. O mesmo perfil é usado
nos campos de responsável, acessos departamentais e foto. Papéis organizacionais:
`owner`, `admin`, `member`; papéis departamentais: `lead`, `contributor`, `viewer`.

### `POST /api/v1/membership-invitations/`

Emite ou reemite um convite no tenant ativo e envia o e-mail. Somente `owner` ou
`admin`. O token nunca é retornado pela API.

```powershell
curl.exe -X POST "$BASE_URL/api/v1/membership-invitations/" `
  -b cookies.txt -H "X-CSRFToken: $CSRF" -H "Content-Type: application/json" `
  -d '{"email":"novo.membro@example.com","displayName":"Novo Membro","role":"member"}'
```

Retorna `201` com ID do convite, `memberId`, e-mail, nome, papel, `moduleAccesses`,
expiração e criação do convite. O cadastro é geral: uma única identidade serve
todos os módulos. Inclua `moduleAccesses` para conceder os acessos já no convite,
conforme a seção 17.1. Novos convites sem esse campo começam sem acesso aos módulos,
mesmo com `role: "admin"`; na reemissão, sua ausência preserva os acessos atuais.

### `GET /api/v1/organization-members/`

Lista colaboradores do tenant com paginação comum. `owner/admin` recebe perfis de todos
os status. Um member com acesso `lead` recebe somente colaboradores ativos ligados a
algum departamento que lidera; os `departmentAccesses` da resposta também ficam
limitados a esses departamentos. Contributor/viewer recebe `403`.

```powershell
curl.exe "$BASE_URL/api/v1/organization-members/?page=1" -b cookies.txt
```

### `GET /api/v1/organization-members/{id}/`

Retorna um colaborador dentro do mesmo escopo da listagem. Um ID de outro tenant ou
fora dos departamentos liderados retorna `404`.

```powershell
curl.exe "$BASE_URL/api/v1/organization-members/<UUID_DO_COLABORADOR>/" -b cookies.txt
```

### `PATCH /api/v1/organization-members/{id}/`

Altera `displayName`, o cargo organizacional `role` (`owner`, `admin` ou `member`)
e/ou `moduleAccesses` (seção 17.1), em uma única transação.
Somente `owner/admin`; um admin não pode promover nem alterar owner, e o último
owner/admin ativo não pode ser rebaixado.

```powershell
curl.exe -X PATCH "$BASE_URL/api/v1/organization-members/<UUID_DO_COLABORADOR>/" `
  -b cookies.txt -H "X-CSRFToken: $CSRF" -H "Content-Type: application/json" `
  -d '{"displayName":"Maria Silva","role":"member"}'
```

### `POST /api/v1/organization-members/{id}/offboard/`

Desliga o colaborador sem apagar o perfil, vínculos ou histórico. O status passa a
`inactive` e as sessões da identidade vinculada são revogadas. Somente `owner/admin`;
a proteção do último owner/admin continua válida.

```powershell
curl.exe -X POST "$BASE_URL/api/v1/organization-members/<UUID_DO_COLABORADOR>/offboard/" `
  -b cookies.txt -H "X-CSRFToken: $CSRF"
```

### `GET /api/v1/organization-members/{memberId}/department-accesses/`

Lista os papéis departamentais do colaborador. Owner/admin vê todos; líder vê somente
os acessos relativos aos departamentos que lidera.

```powershell
curl.exe "$BASE_URL/api/v1/organization-members/<UUID_DO_COLABORADOR>/department-accesses/" `
  -b cookies.txt
```

### `PUT /api/v1/organization-members/{memberId}/department-accesses/{departmentId}/`

Concede acesso ou substitui o papel existente por `lead`, `contributor` ou `viewer`.
Somente `owner/admin`.

```powershell
curl.exe -X PUT "$BASE_URL/api/v1/organization-members/<UUID_DO_COLABORADOR>/department-accesses/<UUID_DO_DEPARTAMENTO>/" `
  -b cookies.txt -H "X-CSRFToken: $CSRF" -H "Content-Type: application/json" `
  -d '{"role":"contributor"}'
```

### `DELETE /api/v1/organization-members/{memberId}/department-accesses/{departmentId}/`

Revoga o acesso sem desligar o colaborador. Somente `owner/admin`; retorna `204`.

```powershell
curl.exe -X DELETE "$BASE_URL/api/v1/organization-members/<UUID_DO_COLABORADOR>/department-accesses/<UUID_DO_DEPARTAMENTO>/" `
  -b cookies.txt -H "X-CSRFToken: $CSRF"
```

### `GET /api/v1/departments/`

Lista departamentos ativos visíveis. `owner/admin` vê todos; member vê os que possuem
`DepartmentAccess`. Cada item informa `accessRole` para member.

```powershell
curl.exe "$BASE_URL/api/v1/departments/?page=1" -b cookies.txt
```

### `POST /api/v1/departments/`

Cria um departamento ativo no tenant atual. Somente `owner/admin`. A configuração de
telas é um recurso separado: use o `id` retornado como `departmentId` ao criar a
planilha ou agenda correspondente.

```powershell
curl.exe -X POST "$BASE_URL/api/v1/departments/" `
  -b cookies.txt -H "X-CSRFToken: $CSRF" -H "Content-Type: application/json" `
  -d '{"name":"Fiscal","description":"Obrigações e apurações fiscais"}'
```

Retorna `201` com `id`, `name`, `description`, `accessRole` (`null` para um
administrador) e `image` (`null` no departamento recém-criado). A imagem é
configurada separadamente, pelo fluxo da seção 15.

### `GET /api/v1/departments/{id}/`

Retorna um departamento visível específico.

```powershell
curl.exe "$BASE_URL/api/v1/departments/<UUID_DO_DEPARTAMENTO>/" -b cookies.txt
```

### `GET /api/v1/departments/{departmentId}/task-assignees/`

Retorna, sem paginação, os responsáveis elegíveis para tarefas do departamento.
`owner/admin` pode consultar qualquer departamento ativo; member precisa ser `lead`.
O resultado inclui owners/admins ativos e membros `lead`/`contributor`; viewers não
são elegíveis.

```powershell
curl.exe "$BASE_URL/api/v1/departments/<UUID_DO_DEPARTAMENTO>/task-assignees/" `
  -b cookies.txt
```

## 5. Empresas

Escritas neste módulo são exclusivas de `owner/admin`. Empresas pertencem somente ao
tenant; não existe vínculo obrigatório empresa–departamento. O acesso operacional do
membro continua sendo controlado por seus acessos aos departamentos.

### `GET /api/v1/client-companies/`

Lista empresas visíveis. Aceita:

- `search`: código, nome de exibição ou razão social (`legalName`);
- `ordering=code|name|legal_name` com prefixo `-` para ordem decrescente;
- `includeArchived=true`: apenas owner/admin;
- `page`: página da listagem.

```powershell
curl.exe "$BASE_URL/api/v1/client-companies/?search=exemplo&ordering=code&page=1" `
  -b cookies.txt
```

### `POST /api/v1/client-companies/`

Cria uma empresa. O código interno é opcional e, quando informado, aceita de 1 a
32 dígitos e preserva zeros à esquerda; `legalName` é a razão social e permanece
separado do nome de exibição, CNPJ, e-mail e celular. A razão social é opcional.
`code` pode ser omitido, `null` ou vazio; valores vazios são normalizados para
`null`. Em um PATCH, omitir o campo mantém o valor atual; enviar `null` ou `""`
remove o código. O frontend deve suportar `code=null` também nas projeções.

```powershell
curl.exe -X POST "$BASE_URL/api/v1/client-companies/" `
  -b cookies.txt -H "X-CSRFToken: $CSRF" -H "Content-Type: application/json" `
  -d '{"code":"007","name":"Empresa Exemplo","legalName":"Empresa Exemplo Serviços Ltda.","cnpj":"12.345.678/0001-95","email":"contato@example.com","mobilePhone":"+55 11 99999-9999","taxRegime":"Simples Nacional"}'
```

Retorna `201`, o recurso criado e `ETag: "1"`.

### `GET /api/v1/client-companies/{id}/`

Obtém uma empresa e sua versão atual.

```powershell
curl.exe -i "$BASE_URL/api/v1/client-companies/<UUID_DA_EMPRESA>/" -b cookies.txt
```

### `PATCH /api/v1/client-companies/{id}/`

Altera os campos enviados e incrementa a versão.

```powershell
curl.exe -X PATCH "$BASE_URL/api/v1/client-companies/<UUID_DA_EMPRESA>/" `
  -b cookies.txt -H "X-CSRFToken: $CSRF" -H 'If-Match: "1"' `
  -H "Content-Type: application/json" `
  -d '{"name":"Empresa Exemplo Atualizada","legalName":"Empresa Exemplo Serviços Contábeis Ltda."}'
```

### `DELETE /api/v1/client-companies/{id}/`

Arquiva a empresa sem apagar seu cadastro e remove fisicamente seus vínculos
empresa–rotina. Tarefas já materializadas mantêm os snapshots; ocorrências virtuais
dependentes desses vínculos deixam de ser projetadas. Não existe vínculo público
empresa–departamento na API atual. Retorna `204` e o novo ETag.

```powershell
curl.exe -X DELETE "$BASE_URL/api/v1/client-companies/<UUID_DA_EMPRESA>/" `
  -b cookies.txt -H "X-CSRFToken: $CSRF" -H 'If-Match: "2"'
```

### `POST /api/v1/client-companies/{id}/restore/`

Restaura uma empresa arquivada, após conferir disponibilidade de código/CNPJ.
Os vínculos de rotina removidos não são recriados automaticamente.

```powershell
curl.exe -X POST "$BASE_URL/api/v1/client-companies/<UUID_DA_EMPRESA>/restore/" `
  -b cookies.txt -H "X-CSRFToken: $CSRF" -H 'If-Match: "3"'
```

## 6. Contatos da empresa

O ETag destas operações representa a versão do agregado `ClientCompany`.

### `GET /api/v1/client-companies/{companyId}/contacts/`

Lista contatos da empresa. `includeArchived=true` está disponível para owner/admin.

```powershell
curl.exe -i "$BASE_URL/api/v1/client-companies/<UUID_DA_EMPRESA>/contacts/?page=1" `
  -b cookies.txt
```

### `POST /api/v1/client-companies/{companyId}/contacts/`

Adiciona um contato e incrementa a versão da empresa.

```powershell
curl.exe -X POST "$BASE_URL/api/v1/client-companies/<UUID_DA_EMPRESA>/contacts/" `
  -b cookies.txt -H "X-CSRFToken: $CSRF" -H 'If-Match: "1"' `
  -H "Content-Type: application/json" `
  -d '{"name":"Maria Silva","jobTitle":"Gerente","email":"maria@example.com","mobilePhone":"+55 11 98888-7777"}'
```

### `GET /api/v1/client-companies/{companyId}/contacts/{id}/`

Obtém um contato específico e retorna o ETag da empresa.

```powershell
curl.exe -i "$BASE_URL/api/v1/client-companies/<UUID_DA_EMPRESA>/contacts/<UUID_DO_CONTATO>/" `
  -b cookies.txt
```

### `PATCH /api/v1/client-companies/{companyId}/contacts/{id}/`

Altera os campos informados no contato.

```powershell
curl.exe -X PATCH "$BASE_URL/api/v1/client-companies/<UUID_DA_EMPRESA>/contacts/<UUID_DO_CONTATO>/" `
  -b cookies.txt -H "X-CSRFToken: $CSRF" -H 'If-Match: "2"' `
  -H "Content-Type: application/json" -d '{"jobTitle":"Diretora"}'
```

### `DELETE /api/v1/client-companies/{companyId}/contacts/{id}/`

Arquiva o contato sem apagar a linha.

```powershell
curl.exe -X DELETE "$BASE_URL/api/v1/client-companies/<UUID_DA_EMPRESA>/contacts/<UUID_DO_CONTATO>/" `
  -b cookies.txt -H "X-CSRFToken: $CSRF" -H 'If-Match: "3"'
```

### `POST /api/v1/client-companies/{companyId}/contacts/{id}/restore/`

Restaura um contato arquivado.

```powershell
curl.exe -X POST "$BASE_URL/api/v1/client-companies/<UUID_DA_EMPRESA>/contacts/<UUID_DO_CONTATO>/restore/" `
  -b cookies.txt -H "X-CSRFToken: $CSRF" -H 'If-Match: "4"'
```

## 7. Rotinas e versões

As escritas são exclusivas de owner/admin. Members leem rotinas dos departamentos aos
quais têm acesso. Criar uma rotina publica sua versão 1 na mesma transação.

Recorrências aceitas: `monthly`, `quarterly`, `semiannual`, `annual` e `on_demand`.
`recurrenceMonths` deve conter, respectivamente, 0, 4, 2, 1 ou 0 meses. A nomenclatura
pública da rotina é:

- `name`: nome completo;
- `shotname`: nome curto exibido na planilha, com até 32 caracteres. A grafia do campo
  é intencional e faz parte do contrato;
- `description`: instrução/descrição versionada da execução;
- `defaultDueDays`: quantidade de dias, entre 0 e 3750, somada ao primeiro dia da
  competência para obter o vencimento padrão.
- `defaultAssigneeMemberId`: UUID de um membro ativo elegível do departamento, salvo
  como responsável padrão. É opcional e pode ser obtido em
  `GET /api/v1/departments/{departmentId}/task-assignees/`.

Campos do contrato anterior não são aceitos pelos serializers atuais.

### `GET /api/v1/routines/`

Lista rotinas visíveis. Aceita `search`, `departmentId`, `includeArchived`, `page` e
`ordering=shotname|name|created_at|updated_at`. A busca consulta `shotname`, `name` e a
descrição da versão corrente.

```powershell
curl.exe "$BASE_URL/api/v1/routines/?departmentId=<UUID_DO_DEPARTAMENTO>&ordering=shotname" `
  -b cookies.txt
```

### `POST /api/v1/routines/`

Se `defaultAssigneeMemberId` for informado, ele deve ser o UUID de um membro ativo
elegível retornado por `GET /api/v1/departments/{departmentId}/task-assignees/`.
O campo, quando presente, é salvo na versão publicada e será usado nas ocorrências
futuras. `defaultDueDays` continua sendo o prazo padrão, contado a partir do
primeiro dia da competência. O UUID é do perfil de colaborador na organização.

Cria a rotina e publica a primeira regra.

```powershell
curl.exe -X POST "$BASE_URL/api/v1/routines/" `
  -b cookies.txt -H "X-CSRFToken: $CSRF" -H "Content-Type: application/json" `
  -d '{"departmentId":"<UUID_DO_DEPARTAMENTO>","name":"Apuração fiscal mensal","shotname":"Fiscal","description":"Conferir documentos e transmitir.","recurrence":"monthly","defaultDueDays":14,"defaultAssigneeMemberId":"<UUID_DO_RESPONSAVEL_PADRAO>","recurrenceMonths":[]}'
```

### `GET /api/v1/routines/{id}/`

Obtém a rotina, sua versão corrente completa e o ETag do agregado.

```powershell
curl.exe -i "$BASE_URL/api/v1/routines/<UUID_DA_ROTINA>/" -b cookies.txt
```

### `PATCH /api/v1/routines/{id}/`

Altera apenas a identidade estável (`name` e/ou `shotname`). Para mudar `description`,
recorrência, responsável padrão ou prazo padrão, publique uma nova versão.

```powershell
curl.exe -X PATCH "$BASE_URL/api/v1/routines/<UUID_DA_ROTINA>/" `
  -b cookies.txt -H "X-CSRFToken: $CSRF" -H 'If-Match: "1"' `
  -H "Content-Type: application/json" `
  -d '{"name":"Apuração fiscal recorrente","shotname":"Fiscal mensal"}'
```

### `DELETE /api/v1/routines/{id}/`

Arquiva a rotina e encerra/cancela vínculos atuais ou futuros sem reescrever tarefas.

```powershell
curl.exe -X DELETE "$BASE_URL/api/v1/routines/<UUID_DA_ROTINA>/" `
  -b cookies.txt -H "X-CSRFToken: $CSRF" -H 'If-Match: "2"'
```

### `POST /api/v1/routines/{id}/restore/`

Restaura a rotina; vínculos encerrados não são reabertos.

```powershell
curl.exe -X POST "$BASE_URL/api/v1/routines/<UUID_DA_ROTINA>/restore/" `
  -b cookies.txt -H "X-CSRFToken: $CSRF" -H 'If-Match: "3"' `
  -H "Content-Type: application/json" -d '{}'
```

### `GET /api/v1/routines/{routineId}/versions/`

Lista as versões imutáveis publicadas da rotina.

```powershell
curl.exe "$BASE_URL/api/v1/routines/<UUID_DA_ROTINA>/versions/?page=1" -b cookies.txt
```

### `POST /api/v1/routines/{routineId}/versions/`

Publica uma nova versão da regra e a torna corrente.

```powershell
curl.exe -X POST "$BASE_URL/api/v1/routines/<UUID_DA_ROTINA>/versions/" `
  -b cookies.txt -H "X-CSRFToken: $CSRF" -H 'If-Match: "1"' `
  -H "Content-Type: application/json" `
  -d '{"description":"Nova instrução imutável.","recurrence":"quarterly","defaultDueDays":19,"defaultAssigneeMemberId":"<UUID_DO_RESPONSAVEL_PADRAO>","recurrenceMonths":[1,4,7,10]}'
```

O retorno `201` contém a rotina com sua nova versão corrente e novo ETag.

### `GET /api/v1/routines/{routineId}/versions/{id}/`

Obtém uma versão publicada específica.

```powershell
curl.exe "$BASE_URL/api/v1/routines/<UUID_DA_ROTINA>/versions/<UUID_DA_VERSAO>/" `
  -b cookies.txt
```

## 8. Presets de rotinas

Presets são administrados por owner/admin. Seus itens capturam a versão da rotina no
momento da configuração. Editar um preset não altera empresas já configuradas.

### `GET /api/v1/routine-presets/`

Lista presets. Aceita `search`, `includeArchived`, `page` e
`ordering=name|created_at|updated_at`.

```powershell
curl.exe "$BASE_URL/api/v1/routine-presets/?search=fiscal&ordering=name" -b cookies.txt
```

### `POST /api/v1/routine-presets/`

Cria um preset com uma lista não vazia de rotinas.

```powershell
curl.exe -X POST "$BASE_URL/api/v1/routine-presets/" `
  -b cookies.txt -H "X-CSRFToken: $CSRF" -H "Content-Type: application/json" `
  -d '{"name":"Pacote Fiscal","description":"Rotinas fiscais padrão","routineIds":["<UUID_DA_ROTINA_1>","<UUID_DA_ROTINA_2>"]}'
```

### `GET /api/v1/routine-presets/{id}/`

Obtém o preset, seus itens/versionamentos e o ETag.

```powershell
curl.exe -i "$BASE_URL/api/v1/routine-presets/<UUID_DO_PRESET>/" -b cookies.txt
```

### `PATCH /api/v1/routine-presets/{id}/`

Altera nome, descrição e/ou conjunto de rotinas, criando uma nova versão do agregado.

```powershell
curl.exe -X PATCH "$BASE_URL/api/v1/routine-presets/<UUID_DO_PRESET>/" `
  -b cookies.txt -H "X-CSRFToken: $CSRF" -H 'If-Match: "1"' `
  -H "Content-Type: application/json" `
  -d '{"description":"Pacote fiscal revisado","routineIds":["<UUID_DA_ROTINA_1>"]}'
```

### `DELETE /api/v1/routine-presets/{id}/`

Arquiva o preset sem remover aplicações históricas.

```powershell
curl.exe -X DELETE "$BASE_URL/api/v1/routine-presets/<UUID_DO_PRESET>/" `
  -b cookies.txt -H "X-CSRFToken: $CSRF" -H 'If-Match: "2"'
```

### `POST /api/v1/routine-presets/{id}/restore/`

Restaura um preset arquivado.

```powershell
curl.exe -X POST "$BASE_URL/api/v1/routine-presets/<UUID_DO_PRESET>/restore/" `
  -b cookies.txt -H "X-CSRFToken: $CSRF" -H 'If-Match: "3"' `
  -H "Content-Type: application/json" -d '{}'
```

### `POST /api/v1/routine-presets/{id}/apply/`

Aplica a revisão lida do preset a uma empresa. Cria um vínculo para cada item e um
recibo imutável da aplicação. A vigência dos vínculos é independente de departamento.

```powershell
curl.exe -X POST "$BASE_URL/api/v1/routine-presets/<UUID_DO_PRESET>/apply/" `
  -b cookies.txt -H "X-CSRFToken: $CSRF" -H 'If-Match: "1"' `
  -H "Content-Type: application/json" `
  -d '{"companyId":"<UUID_DA_EMPRESA>","startsOn":"2026-08-01","endsOn":null}'
```

Retorna `201` com um array não paginado de vínculos criados.

## 9. Vínculos empresa–rotina

Escritas são exclusivas de owner/admin. Um vínculo é aceito quando empresa e rotina
pertencem ao mesmo tenant e a vigência informada é válida.

### `GET /api/v1/client-companies/{companyId}/routine-assignments/`

Lista os vínculos empresa–rotina ainda existentes, incluindo vigências encerradas
quando presentes. Vínculos removidos por DELETE ou pelo arquivamento da empresa
não aparecem: esta coleção não é um histórico append-only.

```powershell
curl.exe "$BASE_URL/api/v1/client-companies/<UUID_DA_EMPRESA>/routine-assignments/?page=1" `
  -b cookies.txt
```

### `POST /api/v1/client-companies/{companyId}/routine-assignments/`

Cria um vínculo individual. Esta criação retorna seu próprio ETag inicial.

```powershell
curl.exe -X POST "$BASE_URL/api/v1/client-companies/<UUID_DA_EMPRESA>/routine-assignments/" `
  -b cookies.txt -H "X-CSRFToken: $CSRF" -H "Content-Type: application/json" `
  -d '{"routineId":"<UUID_DA_ROTINA>","startsOn":"2026-08-01","endsOn":null}'
```

### `GET /api/v1/client-companies/{companyId}/routine-assignments/{id}/`

Obtém um vínculo de rotina e seu ETag.

```powershell
curl.exe -i "$BASE_URL/api/v1/client-companies/<UUID_DA_EMPRESA>/routine-assignments/<UUID_DO_VINCULO>/" `
  -b cookies.txt
```

### `POST /api/v1/client-companies/{companyId}/routine-assignments/{id}/end/`

Define o último dia efetivo do vínculo.

```powershell
curl.exe -X POST "$BASE_URL/api/v1/client-companies/<UUID_DA_EMPRESA>/routine-assignments/<UUID_DO_VINCULO>/end/" `
  -b cookies.txt -H "X-CSRFToken: $CSRF" -H 'If-Match: "1"' `
  -H "Content-Type: application/json" -d '{"endsOn":"2026-12-31"}'
```

### `DELETE /api/v1/client-companies/{companyId}/routine-assignments/{id}/`

Remove fisicamente o vínculo e retorna `204`. As ocorrências que ainda eram
virtuais deixam de ser projetadas; tarefas já materializadas mantêm seus snapshots
e podem ficar com `sourceAssignmentId=null`. Para preservar a linha e apenas
encerrar sua vigência, usar o endpoint `/end/`.

```powershell
curl.exe -X DELETE "$BASE_URL/api/v1/client-companies/<UUID_DA_EMPRESA>/routine-assignments/<UUID_DO_VINCULO>/" `
  -b cookies.txt -H "X-CSRFToken: $CSRF" -H 'If-Match: "1"'
```

## 10. Competências

Todos os membros ativos do tenant podem consultar competências. Um mês futuro pode ser
`projected`: ele existe apenas na resposta e sua consulta não grava `Competence` nem
`Task`. Somente owner/admin pode finalizar períodos.

Estados persistidos: `projected` e `finalized`.

Transição permitida:

```text
projected -> finalized
finalized -> nenhuma
```

`finalized` congela o conjunto recorrente do mês e suas regras. As tarefas materializadas
continuam podendo ser trabalhadas conforme suas próprias permissões.

### `GET /api/v1/competence-calendar/?from=YYYY-MM&to=YYYY-MM`

Lista uma janela de até 36 meses, incluindo meses projetados. Esta rota não cria
registros e é adequada ao seletor de competências do frontend.

```powershell
curl.exe "$BASE_URL/api/v1/competence-calendar/?from=2026-08&to=2027-08" `
  -b cookies.txt
```

Cada item informa `id` (nulo quando projetado), `period`, `status`, `persistence`,
`version`, `scheduleRevision` e `warning`. A listagem do calendário não calcula a
quantidade de cards; `taskOccurrenceCount` é `null` para evitar expandir 36 meses de
recorrência em uma chamada de navegação.

### `GET /api/v1/competences/by-period/{YYYY-MM}/`

Obtém um mês pelo período. Um mês ainda não persistido retorna `status=projected`,
`persistence=projected`, `id=null`, `version=null` e um ETag opaco baseado na revisão
das regras. Também informa `taskOccurrenceCount`. A leitura não grava nada.

```powershell
curl.exe -i "$BASE_URL/api/v1/competences/by-period/2026-10/" -b cookies.txt
```

### `POST /api/v1/competences/by-period/{YYYY-MM}/finalize/`

Comando owner/admin, atômico e idempotente. Exige o ETag numérico da competência
projetada, quando ela já estiver persistida. Se o mês ainda não existir, o comando cria
a competência projetada antes de finalizar. Materializa todas as ocorrências recorrentes ainda virtuais como `pending`,
preserva os snapshots e muda o período para `finalized`. Não cria um evento individual
para cada card automático; a `Task` guarda o motivo e a competência registra o evento
agregado com a quantidade.

```powershell
curl.exe -X POST "$BASE_URL/api/v1/competences/by-period/2026-10/finalize/" `
  -b cookies.txt -H "X-CSRFToken: $CSRF" -H 'If-Match: "2"' `
  -H "Content-Type: application/json" -d '{}'
```

### `GET /api/v1/competences/`

Lista somente competências já persistidas em ordem decrescente de mês. Para navegação
incluindo o futuro, prefira `competence-calendar`.

```powershell
curl.exe "$BASE_URL/api/v1/competences/?page=1" -b cookies.txt
```

### `POST /api/v1/competences/`

Cria uma competência mensal inicialmente em `projected`. Essa criação explícita é
opcional: a primeira mutação de uma ocorrência por período também pode criar a
competência automaticamente.

```powershell
curl.exe -X POST "$BASE_URL/api/v1/competences/" `
  -b cookies.txt -H "X-CSRFToken: $CSRF" -H "Content-Type: application/json" `
  -d '{"period":"2026-08"}'
```

Retorna `201` e `ETag: "1"`.

### `GET /api/v1/competences/{id}/`

Obtém uma competência e seu ETag.

```powershell
curl.exe -i "$BASE_URL/api/v1/competences/<UUID_DA_COMPETENCIA>/" -b cookies.txt
```

### `GET /api/v1/competences/{competenceId}/events/`

Lista o histórico de transições com cursor estável.

```powershell
curl.exe "$BASE_URL/api/v1/competences/<UUID_DA_COMPETENCIA>/events/?pageSize=50" `
  -b cookies.txt
```

Para continuar, use diretamente a URL retornada em `next`.

## 11. Tarefas

Uma tarefa sempre pertence a uma competência e a um departamento. Seu `kind` pode ser
`ad_hoc` (avulsa) ou `scheduled` (ocorrência de rotina); o endpoint público de criação
descrito abaixo sempre cria `ad_hoc`. Empresa e rotina são relações opcionais e
independentes, e a resposta preserva os respectivos snapshots somente quando essas
relações existem.

Os campos de conteúdo são `title`, `description`, `observation` e `links`. Cada link
possui `url` e `label`; são aceitos no máximo 20. Estados: `pending`, `in_progress`,
`completed`, `no_movement` e `error`.

Transições permitidas:

```text
pending -> in_progress | completed | no_movement | error
in_progress -> completed | no_movement | error
completed | no_movement | error -> pending
```

As informações contextuais da mudança devem ser registradas em `observation`, usando o
endpoint de edição da tarefa. Owner/admin pode executar todas as transições válidas. Lead opera seu departamento, mas não classifica
como `error` nem reabre tarefas; contributor opera apenas tarefas atribuídas a si e
não pode classificar como `error`; viewer apenas lê.

### Como funcionam as tarefas virtuais

`RoutineVersion` e `ClientRoutineAssignment` são a fonte das ocorrências `scheduled`.
Enquanto um card estiver integralmente nos defaults, ele é calculado na leitura e não
possui linha em `Task`:

- `status=pending`;
- `dueDate` calculado do primeiro dia da competência mais `defaultDueDays`;
- `assignee` preenchido com o membro salvo em `defaultAssigneeMemberId` da versão;
- `title` igual a `Routine.name`;
- `description`, `observation` e `links` vazios.

Qualquer diferença materializa o card: estado, responsável, prazo, título, descrição,
observação, links ou vínculo do primeiro anexo aprovado. Apenas consultar, filtrar, paginar ou abrir uma planilha nunca
grava. Solicitar ou confirmar upload também não materializa. Um PATCH idêntico ao
baseline é no-op e continua virtual.

O frontend deve usar `occurrenceKey` como chave estável do card. Antes da
materialização, `taskId=null`, `persistence=virtual`, `version=null` e `etag` contém um
token opaco `"virtual:..."`. Depois, `occurrenceKey` não muda, `taskId` passa a existir,
`persistence=materialized` e o ETag passa a ser a versão numérica da `Task`.

### `GET /api/v1/competences/by-period/{YYYY-MM}/task-occurrences/`

Lista exclusivamente ocorrências recorrentes, mesclando virtuais e materializadas.
Não cria a competência nem tarefas. Usa paginação `page`/`pageSize` (máximo 100) e
retorna `scheduleRevision`; as URLs `next`/`previous` já carregam essa revisão. Se as
regras mudarem entre páginas, a API retorna `409` para o frontend reiniciar a lista.

Filtros: `status` repetível, `departmentId`, `companyId`, `routineId`,
`assigneeMemberId`, `unassigned`, `includeArchived`, `overdue`, `dueFrom`, `dueTo`,
`search` e `ordering=dueDate|company|routine|status`, com `-` opcional.

```powershell
curl.exe "$BASE_URL/api/v1/competences/by-period/2026-10/task-occurrences/?status=pending&ordering=company&pageSize=50" `
  -b cookies.txt
```

Exemplo de item virtual:

```json
{
  "occurrenceKey": "<UUID_ESTAVEL>",
  "taskId": null,
  "etag": "\"virtual:HASH\"",
  "persistence": "virtual",
  "referenceMonth": "2026-10",
  "kind": "scheduled",
  "status": "pending",
  "dueDate": "2026-10-15",
  "assignee": {
    "id": "<UUID_DO_RESPONSAVEL_PADRAO>",
    "displayName": "Nome do responsável"
  },
  "observation": "",
  "links": [],
  "attachmentCount": 0,
  "sourceRevision": 41,
  "version": null,
  "materializationReason": null
}
```

Uma relação empresa–rotina só gera ocorrência quando sua vigência intersecta ao menos
um dia do mês, a versão é recorrente e o mês atende à regra. Configurar empresa e
rotina na tela sem esse vínculo mantém a
célula vazia.

### `GET /api/v1/competences/by-period/{YYYY-MM}/task-occurrences/{occurrenceKey}/`

Obtém um card virtual ou real e devolve o ETag também no header.
Inclui `attachmentCount`: `0` para virtual e o total de vínculos ativos para
materializada. As respostas de PATCH e transição preservam esse campo.

```powershell
curl.exe -i "$BASE_URL/api/v1/competences/by-period/2026-10/task-occurrences/<OCCURRENCE_KEY>/" `
  -b cookies.txt
```

### `PATCH /api/v1/competences/by-period/{YYYY-MM}/task-occurrences/{occurrenceKey}/`

Altera `title`, `description`, `observation`, `links`, `dueDate` ou
`assigneeMemberId`. A competência precisa estar `projected`. Para um card
virtual, devolva exatamente o ETag opaco recebido; para um real, devolva a versão
numérica. A primeira diferença cria uma única `Task` com todos os defaults e snapshots
daquele instante.

```powershell
curl.exe -X PATCH "$BASE_URL/api/v1/competences/by-period/2026-10/task-occurrences/<OCCURRENCE_KEY>/" `
  -b cookies.txt -H "X-CSRFToken: $CSRF" `
  -H 'If-Match: "virtual:HASH_RECEBIDO"' -H "Content-Type: application/json" `
  -d '{"observation":"Cliente enviará os documentos amanhã."}'
```

### `POST /api/v1/competences/by-period/{YYYY-MM}/task-occurrences/{occurrenceKey}/transition/`

Transiciona o card. Se ele ainda for virtual, o mesmo comando o materializa diretamente
no estado solicitado e cria o evento correspondente. As informações contextuais devem
ser registradas em `observation` antes ou depois da transição.

```powershell
curl.exe -X POST "$BASE_URL/api/v1/competences/by-period/2026-10/task-occurrences/<OCCURRENCE_KEY>/transition/" `
  -b cookies.txt -H "X-CSRFToken: $CSRF" `
  -H 'If-Match: "virtual:HASH_RECEBIDO"' -H "Content-Type: application/json" `
  -d '{"targetStatus":"in_progress"}'
```

### `POST /api/v1/competences/by-period/{YYYY-MM}/task-occurrences/{occurrenceKey}/attachments/`

Vincula um `fileId` aprovado e reservado para esta ocorrência. Exige `If-Match` do
card e `Idempotency-Key`. O primeiro anexo materializa a ocorrência na mesma
transação; solicitar ou confirmar o upload não materializa. Retorna `201` com
`attachmentId`, `fileId`, `taskId`, `version`, `etag` e `materialized`.
Consulte a seção 15. Enquanto a API de arquivos estiver desabilitada, retorna `501`.

```powershell
curl.exe -X POST "$BASE_URL/api/v1/competences/by-period/2026-10/task-occurrences/<OCCURRENCE_KEY>/attachments/" `
  -b cookies.txt -H "X-CSRFToken: $CSRF" `
  -H 'If-Match: "virtual:HASH_RECEBIDO"' -H "Idempotency-Key: anexo-ocorrencia-001" `
  -H "Content-Type: application/json" -d '{"fileId":"<UUID_DO_ARQUIVO_APROVADO>"}'
```

Depois da materialização, as alterações futuras da rotina, empresa ou vínculo não
reescrevem o card. Remover um vínculo elimina somente ocorrências futuras que ainda
são virtuais. Competências `finalized` leem somente snapshots
persistidos.

### `GET /api/v1/competences/{competenceId}/tasks/`

As respostas de tarefas e ocorrências incluem `attachmentCount`, inteiro não
negativo com a quantidade de vínculos ativos de anexos. O campo também aparece
nos detalhes, respostas de criação/alteração/transição e projeções de planilha e
agenda. Ocorrências virtuais retornam `0`, sem materializar tarefa; uploads ainda
sem vínculo não contam. Leitores autorizados também recebem o contador.

Lista tarefas já persistidas com cursor keyset. Use esta rota principalmente para
`ad_hoc`, dashboards históricos e acesso direto por UUID; ela não sintetiza virtuais.
Parâmetros aceitos:

- `status`, repetível;
- `kind=ad_hoc|scheduled`;
- `departmentId`, `companyId`, `routineId`, `assigneeMemberId`;
- `unassigned=true|false`, `includeArchived=true|false`, `overdue=true|false`;
- `dueFrom` e `dueTo` em `YYYY-MM-DD`;
- `search` em título, descrição, observação e snapshots de empresa/rotina;
- `ordering=dueDate|company|routine|status|updatedAt`, com `-` para decrescente;
- `pageSize` entre 1 e 100 e `cursor` retornado pela API.

Parâmetros desconhecidos são rejeitados.

```powershell
curl.exe "$BASE_URL/api/v1/competences/<UUID_DA_COMPETENCIA>/tasks/?kind=ad_hoc&status=pending&overdue=true&ordering=dueDate&pageSize=50" `
  -b cookies.txt
```

### `POST /api/v1/competences/{competenceId}/tasks/`

Cria uma tarefa avulsa (`kind=ad_hoc`) em uma competência `projected`.
Owner/admin ou lead do departamento pode criar. Exige `title` e `Idempotency-Key` de 8 a 255 caracteres;
`description`, `observation`, `dueDate`, `assigneeMemberId` e `links` são opcionais.

As relações aceitas são independentes:

- sem empresa e sem rotina: envie `departmentId`;
- somente empresa: envie `departmentId` e `clientCompanyId`;
- somente rotina: envie `routineId`; seu departamento é inferido;
- empresa e rotina: envie `clientCompanyId` e `routineId`, sem precisar de um vínculo
  empresa–rotina.

Quando `routineId` é informado, `departmentId` pode ser omitido; se for enviado,
precisa coincidir com o departamento da rotina. Quando há empresa, ela pode ser usada
independentemente do departamento. Sem `dueDate`, o prazo vem do
`defaultDueDays` da versão corrente da rotina ou, quando não há rotina, do primeiro
dia da competência.

```powershell
curl.exe -X POST "$BASE_URL/api/v1/competences/<UUID_DA_COMPETENCIA>/tasks/" `
  -b cookies.txt -H "X-CSRFToken: $CSRF" `
  -H "Idempotency-Key: tarefa-avulsa-2026-08-empresa-007" `
  -H "Content-Type: application/json" `
  -d '{"title":"Revisar pendência do cliente","description":"Conferir divergência informada pelo suporte.","observation":"Prioridade alta.","clientCompanyId":"<UUID_DA_EMPRESA>","routineId":"<UUID_DA_ROTINA>","dueDate":"2026-08-20","assigneeMemberId":"<UUID_DO_RESPONSAVEL>","links":[{"url":"https://example.com/chamado/123","label":"Chamado 123"}]}'
```

A primeira criação retorna `201`. Repetir a mesma chave com o mesmo payload retorna
`200` e a tarefa existente; usar a chave com outro payload retorna `409`.

### `GET /api/v1/competences/{competenceId}/tasks/{taskId}/`

Obtém uma tarefa e seu ETag. A resposta inclui `kind`, conteúdo, links, relações
opcionais e snapshots. Para tarefa arquivada, use `includeArchived=true` e ainda tenha
acesso atual ao departamento histórico.

```powershell
curl.exe -i "$BASE_URL/api/v1/competences/<UUID_DA_COMPETENCIA>/tasks/<UUID_DA_TAREFA>/?includeArchived=false" `
  -b cookies.txt
```

### `PATCH /api/v1/competences/{competenceId}/tasks/{taskId}/`

Altera `title`, `description`, `observation`, `links`, responsável e/ou vencimento.
Owner/admin ou lead do departamento. Empresa, rotina, departamento, `kind` e estado
não são alterados por este endpoint. Quando `links` é enviado, ele substitui a lista
inteira; envie `[]` para removê-los.

```powershell
curl.exe -X PATCH "$BASE_URL/api/v1/competences/<UUID_DA_COMPETENCIA>/tasks/<UUID_DA_TAREFA>/" `
  -b cookies.txt -H "X-CSRFToken: $CSRF" -H 'If-Match: "1"' `
  -H "Content-Type: application/json" `
  -d '{"title":"Revisar pendência fiscal","observation":"Cliente respondeu.","links":[{"url":"https://example.com/chamado/123","label":"Chamado atualizado"}],"assigneeMemberId":"<UUID_DO_RESPONSAVEL>","dueDate":"2026-08-21"}'
```

Use `"assigneeMemberId": null` para remover a atribuição.

### `POST /api/v1/competences/{competenceId}/tasks/{taskId}/attachments/`

Vincula um `fileId` aprovado, reservado para esta tarefa e criado pelo membro da
sessão. Exige `If-Match` da tarefa e `Idempotency-Key`; incrementa a versão da tarefa
e registra evento. A API recebe JSON, não bytes/multipart. Retorna `201` com
`attachmentId`, `fileId`, `taskId`, `version`, `etag` e `materialized=false`.
Consulte a seção 15. Com `FILES_API_ENABLED=False`, retorna `501`.

```powershell
curl.exe -X POST "$BASE_URL/api/v1/competences/<UUID_DA_COMPETENCIA>/tasks/<UUID_DA_TAREFA>/attachments/" `
  -b cookies.txt -H "X-CSRFToken: $CSRF" `
  -H 'If-Match: "1"' -H "Idempotency-Key: anexo-tarefa-001" `
  -H "Content-Type: application/json" -d '{"fileId":"<UUID_DO_ARQUIVO_APROVADO>"}'
```

### `POST /api/v1/competences/{competenceId}/tasks/{taskId}/transition/`

Executa uma transição da máquina de estados e cria um `TaskEvent` na mesma transação.

```powershell
curl.exe -X POST "$BASE_URL/api/v1/competences/<UUID_DA_COMPETENCIA>/tasks/<UUID_DA_TAREFA>/transition/" `
  -b cookies.txt -H "X-CSRFToken: $CSRF" -H 'If-Match: "2"' `
  -H "Content-Type: application/json" `
  -d '{"targetStatus":"completed"}'
```

Exemplo sem movimento:

```json
{ "targetStatus": "no_movement" }
```

Exemplo de erro:

```json
{ "targetStatus": "error" }
```

Quando houver contexto sobre a transição, atualize `observation` pelo endpoint de
edição da tarefa.

### `POST /api/v1/competences/{competenceId}/tasks/{taskId}/archive/`

Arquiva uma tarefa terminal. Somente owner/admin; exige justificativa e não apaga os
eventos. Retorna `204` e o novo ETag.

```powershell
curl.exe -X POST "$BASE_URL/api/v1/competences/<UUID_DA_COMPETENCIA>/tasks/<UUID_DA_TAREFA>/archive/" `
  -b cookies.txt -H "X-CSRFToken: $CSRF" -H 'If-Match: "3"' `
  -H "Content-Type: application/json" `
  -d '{"reason":"Arquivamento administrativo após conferência."}'
```

### `GET /api/v1/competences/{competenceId}/tasks/{taskId}/events/`

Lista eventos append-only da tarefa, em ordem decrescente, usando cursor. Para tarefa
arquivada, envie `includeArchived=true`.

```powershell
curl.exe "$BASE_URL/api/v1/competences/<UUID_DA_COMPETENCIA>/tasks/<UUID_DA_TAREFA>/events/?includeArchived=true&pageSize=50" `
  -b cookies.txt
```

## 12. Telas operacionais

Telas são configurações de navegação e visualização. Toda tela pertence
obrigatoriamente a um departamento e admite somente dois tipos. Para uma área
transversal, cadastre e use um departamento como `Geral`:

- `spreadsheet`: matriz ordenada de empresas e rotinas selecionadas;
- `agenda`: quadro Kanban de tarefas avulsas.

Somente `owner/admin` cria, altera, arquiva ou restaura telas. Members enxergam as
telas de departamentos aos quais têm acesso. Uma tela nunca concede
permissão: seus eixos e tarefas são filtrados pelo escopo que o membro já possui.

O `type` é imutável depois da criação. Os arrays `companyIds` e `routineIds` são
ordenados — a posição de cada UUID define a posição da linha ou coluna — e só são
aceitos em `spreadsheet` (até 500 empresas e 200 rotinas). Em uma tela vinculada a um
departamento, qualquer empresa do tenant pode ser configurada; as rotinas precisam
pertencer ao departamento da tela. Uma `agenda` rejeita esses dois arrays.

### `GET /api/v1/screens/`

Lista telas visíveis em ordem de `position`, nome e ID, usando a paginação comum.
Aceita somente `page` e `includeArchived`; este último é exclusivo de owner/admin.

```powershell
curl.exe "$BASE_URL/api/v1/screens/?includeArchived=false&page=1" -b cookies.txt
```

### `POST /api/v1/screens/`

Cria uma tela completa e retorna `201`, o recurso e `ETag: "1"`. A tela pode ser
criada logo após o departamento, usando o `departmentId` retornado por aquele
endpoint, ou durante a edição posterior das configurações.

Exemplo de planilha fiscal MEI:

```powershell
curl.exe -X POST "$BASE_URL/api/v1/screens/" `
  -b cookies.txt -H "X-CSRFToken: $CSRF" -H "Content-Type: application/json" `
  -d '{"name":"MEI","type":"spreadsheet","departmentId":"<UUID_DO_DEPARTAMENTO>","position":0,"companyIds":["<UUID_DA_EMPRESA_1>","<UUID_DA_EMPRESA_2>"],"routineIds":["<UUID_DA_ROTINA_1>","<UUID_DA_ROTINA_2>"]}'
```

Exemplo de agenda departamental, sem eixos:

```powershell
curl.exe -X POST "$BASE_URL/api/v1/screens/" `
  -b cookies.txt -H "X-CSRFToken: $CSRF" -H "Content-Type: application/json" `
  -d '{"name":"Agenda Fiscal","type":"agenda","departmentId":"<UUID_DO_DEPARTAMENTO>","position":1}'
```

`departmentId` é obrigatório e não aceita `null`. É válido criar uma planilha com
`companyIds` e/ou `routineIds` vazios e configurá-la depois.

### `GET /api/v1/screens/{id}/`

Obtém a configuração da tela, incluindo as empresas e rotinas selecionadas, e retorna
seu ETag.

```powershell
curl.exe -i "$BASE_URL/api/v1/screens/<UUID_DA_TELA>/" -b cookies.txt
```

### `PATCH /api/v1/screens/{id}/`

Altera `name`, `departmentId`, `position`, `companyIds` e/ou `routineIds`. Exige
`If-Match`; `type` não é aceito. Cada array enviado substitui integralmente aquele
eixo, preservando o outro quando ele não aparece no payload.

```powershell
curl.exe -X PATCH "$BASE_URL/api/v1/screens/<UUID_DA_TELA>/" `
  -b cookies.txt -H "X-CSRFToken: $CSRF" -H 'If-Match: "1"' `
  -H "Content-Type: application/json" `
  -d '{"name":"MEI e SIMEI","position":0,"companyIds":["<UUID_DA_EMPRESA_2>","<UUID_DA_EMPRESA_1>"]}'
```

### `DELETE /api/v1/screens/{id}/`

Arquiva a tela sem apagar seus eixos. Exige `If-Match`, retorna `204` e o novo ETag.
Uma tela arquivada não pode ser projetada.

```powershell
curl.exe -X DELETE "$BASE_URL/api/v1/screens/<UUID_DA_TELA>/" `
  -b cookies.txt -H "X-CSRFToken: $CSRF" -H 'If-Match: "2"'
```

### `POST /api/v1/screens/{id}/restore/`

Restaura uma tela arquivada com sua configuração preservada. Exige `If-Match` e
retorna o recurso com o novo ETag.

```powershell
curl.exe -X POST "$BASE_URL/api/v1/screens/<UUID_DA_TELA>/restore/" `
  -b cookies.txt -H "X-CSRFToken: $CSRF" -H 'If-Match: "3"'
```

### `GET /api/v1/screens/{id}/projection/`

Projeta a tela sobre o mês informado. O parâmetro `period=YYYY-MM` é obrigatório e
também aceita competências futuras ainda não persistidas. A leitura é passiva: não
cria competência, tarefa ou vínculo.

```powershell
curl.exe "$BASE_URL/api/v1/screens/<UUID_DA_TELA>/projection/?period=2026-10" `
  -b cookies.txt
```

Na `spreadsheet`, `rows` e `columns` sempre representam os cabeçalhos configurados,
mesmo que nenhuma ocorrência empresa–rotina exista. `cells` é uma coleção esparsa:
contém somente combinações que possuem ocorrência recorrente virtual ou `Task`
materializada naquela competência.
Assim, uma planilha configurada e ainda vazia retorna os cabeçalhos e `"cells": []`.
Para proteger o endpoint contra respostas excessivas, uma projeção com mais de 10.000
tarefas retorna `409`; nesse caso, divida a configuração em telas menores.

Exemplo resumido:

```json
{
  "type": "spreadsheet",
  "screen": { "id": "<UUID_DA_TELA>", "name": "MEI", "type": "spreadsheet" },
  "competenceId": null,
  "period": "2026-10",
  "rows": [
    {
      "id": "<UUID_DA_EMPRESA>",
      "code": "007",
      "name": "Empresa X",
      "legalName": "Empresa X Ltda.",
      "position": 0
    }
  ],
  "columns": [
    {
      "id": "<UUID_DA_ROTINA>",
      "shotname": "DAS",
      "name": "Apuração mensal do DAS",
      "departmentId": "<UUID_DO_DEPARTAMENTO>",
      "position": 0
    }
  ],
  "cells": [
    {
      "companyId": "<UUID_DA_EMPRESA>",
      "routineId": "<UUID_DA_ROTINA>",
      "tasks": [
        {
          "occurrenceKey": "<UUID_ESTAVEL>",
          "taskId": null,
          "persistence": "virtual",
          "status": "pending"
        }
      ]
    }
  ]
}
```

Se os eixos estiverem configurados mas não existir um
`ClientRoutineAssignment` aplicável, a resposta continua com os cabeçalhos e
`"cells": []`. A matriz da tela não cria o produto empresa × rotina nem gera tarefas.

Na `agenda`, somente tarefas `kind=ad_hoc` são agrupadas em colunas Kanban para
`pending`, `in_progress`, `completed`, `no_movement` e `error`. Cada coluna informa
`count`, até 100 tarefas e `hasMore`; quando `hasMore` for verdadeiro, consulte o
endpoint de tarefas com os filtros `kind=ad_hoc` e `status` para paginar o restante.

Exemplo resumido:

```json
{
  "type": "agenda",
  "screen": {
    "id": "<UUID_DA_TELA>",
    "name": "Agenda Fiscal",
    "type": "agenda"
  },
  "competenceId": "<UUID_DA_COMPETENCIA_OU_NULL>",
  "period": "2026-10",
  "columns": [
    {
      "status": "pending",
      "count": 1,
      "tasks": [
        {
          "id": "<UUID_DA_TAREFA>",
          "kind": "ad_hoc",
          "title": "Revisar pendência"
        }
      ],
      "hasMore": false
    },
    { "status": "in_progress", "count": 0, "tasks": [], "hasMore": false },
    { "status": "completed", "count": 0, "tasks": [], "hasMore": false },
    { "status": "no_movement", "count": 0, "tasks": [], "hasMore": false },
    { "status": "error", "count": 0, "tasks": [], "hasMore": false }
  ]
}
```

Ambas as projeções limitam tarefas ao departamento obrigatório da tela.
Uma planilha ainda exige que a tarefa possua simultaneamente uma das empresas e uma
das rotinas configuradas; a agenda não usa esses eixos.

## 13. Sequência mínima de uso

Um fluxo completo típico é:

1. obter CSRF e fazer login;
2. selecionar a associação ativa, se necessário;
3. criar ou consultar o departamento;
4. consultar/criar a empresa; o departamento pertence à rotina, tarefa ou tela,
   sem uma etapa de atribuição pública empresa–departamento;
5. criar uma rotina, ou consultar uma existente;
6. configurar a planilha com as empresas/rotinas selecionadas e/ou criar a agenda;
7. opcionalmente vincular rotinas recorrentes ou aplicar um preset;
8. consultar ou criar a competência `projected`; a primeira mutação também pode criá-la;
9. criar uma tarefa avulsa com `Idempotency-Key` ou consultar ocorrências de rotina
   que já existam na competência;
10. atribuir responsável e transicionar a tarefa;
11. consultar a projeção da tela e os eventos da tarefa;
12. quando necessário, enviar arquivo, aguardar processamento e vincular o anexo
    ou imagem pelo fluxo da seção 15.

O contrato gerado automaticamente continua sendo a referência de tipos e respostas:

- schema: `/api/schema/`;
- Swagger UI: `/api/docs/`;
- artefato versionado: `openapi.yml`.

## 14. Administracao interna da plataforma

Todas as rotas deste grupo exigem sessao autenticada, CSRF nas mutacoes e
`is_staff=True`. Elas nao dependem da organizacao ativa da sessao.

### `GET /api/internal/v1/organizations/`

Lista todas as organizacoes provisionadas, com status, timezone e contagens de membros
e departamentos.

### `POST /api/internal/v1/organizations/provision/`

Cria a organizacao, o perfil de owner pendente e seu convite em uma unica operacao.
`slug` e opcional; quando ausente, e derivado do nome.

```powershell
curl.exe -X POST "$BASE_URL/api/internal/v1/organizations/provision/" `
  -b cookies.txt -H "X-CSRFToken: $CSRF" -H "Content-Type: application/json" `
  -d '{"name":"Escritorio ABC","timezone":"America/Sao_Paulo","ownerName":"Joao Silva","ownerEmail":"joao@abc.com"}'
```

A resposta retorna `organization`, `owner`, `invitation` e `delivery` (`sent` ou
`failed`). Uma falha de entrega nao desfaz os recursos provisionados.

### `GET /api/internal/v1/organizations/{organizationId}/`

Retorna os dados da organizacao, seus owners e o convite mais recente de cada owner.

### `POST /api/internal/v1/organizations/{organizationId}/owners/`

Adiciona ou reemite o convite de um owner pendente.

```json
{ "name": "Maria Silva", "email": "maria@abc.com" }
```

### `POST /api/internal/v1/invitations/{invitationId}/resend/`

Reemite o convite de um owner pendente ou expirado, invalidando o convite anterior.

## 15. Arquivos privados, anexos e imagens — Bucketeer

Implementação validada localmente em 13/10/2026 com storage e scanner simulados.
Configuração e funcionamento do ambiente real ainda precisam de validação; este
documento não declara deploy ou ativação no Heroku. Todas as rotas usam sessão e
a organização ativa do servidor. Mutações exigem CSRF.

`FILES_API_ENABLED=False` retorna `501` após autenticação e membership ativa.
Rotas de anexos também dependem de `OPERATIONS_API_ENABLED=True`.
`FILES_UPLOADS_ENABLED=False` suspende intenções, confirmações e vínculos,
mantendo leitura, download e remoção. Placeholder de variável não é credencial válida.

### Fila e progresso no frontend

A fila usa os endpoints individuais abaixo; não há endpoint de upload em lote.
Cada arquivo possui sua própria intenção, chaves de idempotência e resultado.
Um arquivo que falhar não desfaz os anexos já vinculados.

- Capturar organização/membership, competência e destino no início de cada item.
  Fechar o card ou navegar entre telas/competências não deve mudar esse destino
  nem cancelar a fila. Trocar organização/membership ou sair interrompe o contexto
  anterior. Retomar a fila após recarregar a página fica fora deste contrato.
- Iniciar com até dois fluxos concorrentes e criar intenções somente quando
  houver vaga. Serializar vínculo e remoção da mesma tarefa, relendo seu ETag.
  Em `412`, reler o recurso e aguardar retomada explícita; recuperar respostas
  perdidas com a mesma chave de idempotência, sem reenviar bytes já aprovados.
- Respeitar `Retry-After`, usar polling progressivo e considerar o limite padrão
  de 120 solicitações por minuto, 10 uploads não vinculados por membro e 20 anexos
  ativos por tarefa. O servidor aplica os limites efetivos do ambiente.
- Medir os bytes com `XMLHttpRequest.upload.progress`: usar `loaded / total`
  somente quando `lengthComputable` for verdadeiro e `total > 0`. O total mede
  a transferência multipart, não apenas o tamanho do arquivo. Caso contrário,
  exibir barra indeterminada. O exemplo com `fetch` abaixo envia os mesmos dados,
  mas não fornece esse progresso de bytes.
- Registrar os listeners antes de enviar. O listener de upload entre origens
  exige preflight CORS no S3; o bucket deve permitir a origem do frontend,
  `POST` e os headers necessários. Não definir manualmente o boundary multipart
  nem enviar cookies/CSRF da API ao S3.
- Atingir 100% dos bytes não significa sucesso do anexo: esperar a resposta
  `2xx` do S3, confirmar, aguardar `available` e vincular. Não ler JSON do
  `204` do S3. Atualizar galeria e contador somente após o vínculo confirmado.

O guia complementar contém uma função completa de transporte com progresso,
cancelamento e tratamento de falhas. Os campos e respostas da API estão
documentados neste arquivo.

### Fluxo do frontend

1. Solicitar intenção de upload com finalidade e destino concreto.
2. Enviar os bytes ao S3 com todos os campos de `upload.fields`; adicionar `file`
   por último. Não enviar cookie/CSRF da API ao S3 nem definir manualmente o boundary.
3. Confirmar a intenção na API. O backend fixa a versão do objeto e agenda análise.
4. Consultar `GET files/{fileId}/` com polling moderado até `available`, `rejected`
   ou `deleted`. `pending`, `quarantined` e `scanning` não permitem vínculo/download.
5. Ler o destino para obter o ETag atual; vincular `fileId` com `If-Match` e
   `Idempotency-Key`. Em `412`, reler o destino antes de decidir repetir.
6. Solicitar a URL curta ao endpoint de download. Renovar quando expirar; não
   persistir URLs assinadas nem colocá-las em logs, analytics ou armazenamento durável.

Arquivos não vinculados são visíveis apenas ao criador. Vínculo não permite arquivo
de outro membro, outro tenant, outra finalidade ou outro destino. Upload rejeitado
exige nova intenção. Troca de imagem mantém a anterior enquanto processa.

### `POST /api/v1/files/upload-intents/`

Headers: CSRF e `Idempotency-Key` obrigatório (1–200 caracteres ASCII sem espaços).
Mesmo payload/chave/criador repete a intenção pendente; payload diferente retorna
`409`. A chave é reservada permanentemente nesta implementação; usar uma nova
chave para um novo upload ou depois de expirar. Não há expurgo automático de recibos.

Anexo de tarefa real:

```json
{
  "purpose": "task_attachment",
  "originalName": "comprovante.pdf",
  "sizeBytes": 123456,
  "contentType": "application/pdf",
  "target": { "competenceId": "<UUID>", "taskId": "<UUID>" }
}
```

Alternativas de finalidade e destino (não misturar campos):

| Finalidade                   | `target`                                                |
| ---------------------------- | ------------------------------------------------------- |
| `task_attachment` recorrente | `{"referenceMonth":"2026-10","occurrenceKey":"<UUID>"}` |
| `member_avatar`              | `{"memberId":"<UUID_DA_MEMBERSHIP>"}`                   |
| `department_image`           | `{"departmentId":"<UUID>"}`                             |

Resposta `201`:

```json
{
  "intentId": "<UUID>",
  "fileId": "<UUID>",
  "expiresAt": "2026-10-08T18:30:00Z",
  "uploadExpiresAt": "2026-10-08T18:05:00Z",
  "upload": {
    "url": "https://<BUCKET>.s3.<REGION>.amazonaws.com/",
    "method": "POST",
    "enctype": "multipart/form-data",
    "fields": {
      "key": "<KEY_ASSINADA>",
      "Content-Type": "application/pdf",
      "policy": "<POLICY>",
      "x-amz-signature": "<SIGNATURE>"
    }
  }
}
```

`fields` é opaco e contém outros campos obrigatórios de assinatura, tags e
criptografia. Enviar exatamente todos os campos retornados. `expiresAt` é o prazo
da intenção; a autorização S3 expira em até cinco minutos e nunca além desse prazo.

`uploadExpiresAt` informa esse prazo menor do envio ao S3. Para uma barra real de
bytes, o frontend pode usar `XMLHttpRequest.upload.progress` com o mesmo POST e
os mesmos campos, sem cookies nem headers da API. O backend não recebe os bytes
e não informa um percentual desse envio. Veja o
[contrato de progresso e fila](CONTRATO_FEEDBACKS_ANEXOS.md).

Exemplo do envio direto no navegador, após obter a intenção:

```javascript
const form = new FormData()
for (const [key, value] of Object.entries(intent.upload.fields)) {
  form.append(key, value)
}
form.append('file', selectedFile)
const upload = await fetch(intent.upload.url, {
  method: 'POST',
  body: form,
  credentials: 'omit',
})
if (!upload.ok) throw new Error('Upload ao armazenamento falhou')
// Confirmar somente após o S3 responder com sucesso.
```

O S3 normalmente retorna `204` sem corpo nesse POST; não tentar ler JSON.
Mesmo com `204` no painel de rede, `fetch` pode rejeitar se o bucket não tiver
CORS para a origem do frontend. Nesse caso, configurar CORS no S3 conforme
[o diagnóstico e procedimento Bucketeer](CONFIGURACAO_ARQUIVOS_BUCKETEER.md#upload-retorna-204-mas-o-navegador-exibe-erro)
e criar uma nova intenção se a anterior tiver sido cancelada.

Defaults: anexos PDF/TXT/CSV/JPEG/PNG/WebP até 20 MiB; avatar/imagem somente
JPEG/PNG/WebP até 5 MiB e 16 MP. Nome/extensão, MIME detectado e tamanho
são validados no servidor. Antimalware só é executado quando
`FILES_REQUIRE_MALWARE_SCAN=True`; no rollout interno, a análise é dispensada por
configuração e registrada na auditoria. SVG, animação, binários não permitidos e PDFs criptografados
são rejeitados. TXT/CSV precisam de UTF-8 e são servidos como download.

### `POST /api/v1/files/upload-intents/{intentId}/confirm/`

Enviar `{}` com CSRF. Retorna `202` com o objeto de arquivo. Confirmação repetida
não altera a versão S3 nem duplica job; intenção expirada retorna `410`.
Essa operação não vincula, não materializa tarefa e não libera download.

Confirmação e consulta de arquivo em `quarantined` ou `scanning` retornam
`Retry-After: 3`, exposto pelo CORS. Usar esse intervalo mínimo para polling;
o header não é uma estimativa de duração do processamento. `429` continua
informando seu próprio `Retry-After`.

### `GET /api/v1/files/{fileId}/`

Os metadados também incluem `uploadExpiresAt` e `updatedAt`. Os estados de
verificação não possuem percentual calculado pelo servidor: mostrar progresso
indeterminado até `available` e concluir a operação somente depois do vínculo.

Resposta `200`:

```json
{
  "fileId": "<UUID>",
  "purpose": "member_avatar",
  "state": "available",
  "originalName": "foto.jpg",
  "sizeBytes": 123456,
  "contentType": "image/jpeg",
  "rejectionReason": "",
  "createdAt": "2026-10-08T18:00:00Z",
  "expiresAt": "2026-10-08T18:31:00Z",
  "uploadExpiresAt": "2026-10-08T18:05:00Z",
  "updatedAt": "2026-10-08T18:01:00Z",
  "variants": [
    { "kind": "64", "width": 64, "height": 64, "contentType": "image/webp" },
    { "kind": "256", "width": 256, "height": 256, "contentType": "image/webp" }
  ]
}
```

Estados: `pending`, `quarantined`, `scanning`, `available`, `rejected`, `deleted`.

| Estado        | Progresso e próxima ação                                               |
| ------------- | ---------------------------------------------------------------------- |
| `pending`     | Aguardando/enviando; progresso de bytes vem do navegador               |
| `quarantined` | Verificando, barra indeterminada; consultar após `Retry-After`         |
| `scanning`    | Verificando, barra indeterminada; consultar após `Retry-After`         |
| `available`   | Arquivo aprovado; iniciar vínculo, sem incrementar contador ainda      |
| `rejected`    | Encerrar polling; novo envio exige nova intenção                       |
| `deleted`     | Encerrar polling; arquivo removido/cancelado/expirado exige novo envio |

`Retry-After` de polling não é enviado em `pending` ou nos estados terminais.
O servidor não informa percentual da análise. `updatedAt` é o instante da última
alteração dos metadados; `uploadExpiresAt` é a validade da autorização de envio,
distinta de `expiresAt`.

Antes de análise, `contentType` pode ser vazio e tamanho é o declarado.
Para imagens, os metadados de tamanho/MIME descrevem a entrada; as variantes
descrevem as imagens reescritas que podem ser exibidas. O original de foto/imagem
nunca é disponibilizado. `expiresAt` controla o arquivo sem vínculo; não representa
expiração do download e não remove arquivos já vinculados.

### `DELETE /api/v1/files/upload-intents/{intentId}/`

CSRF; `204`. Cancela arquivo ainda não vinculado, bloqueia sua disponibilidade e
agenda limpeza. Para arquivo vinculado, remover pelo endpoint do proprietário;
cancelamento retorna `409`.

### Coleções e remoção de anexos

| Método     | Rota após `/api/v1/`                                                                           |
| ---------- | ---------------------------------------------------------------------------------------------- |
| `GET/POST` | `competences/{competenceId}/tasks/{taskId}/attachments/`                                       |
| `DELETE`   | `competences/{competenceId}/tasks/{taskId}/attachments/{attachmentId}/`                        |
| `GET/POST` | `competences/by-period/{YYYY-MM}/task-occurrences/{occurrenceKey}/attachments/`                |
| `DELETE`   | `competences/by-period/{YYYY-MM}/task-occurrences/{occurrenceKey}/attachments/{attachmentId}/` |

GET usa `?page=`, retorna `count`, `next`, `previous`, `results`; cada resultado
possui `attachmentId`, `createdByMemberId`, `createdAt` e `file` com o contrato acima.
Uma ocorrência virtual possui lista vazia e não é materializada pela consulta.
GET de tarefa materializada inclui seu ETag. Para ocorrência virtual, obter ETag
no endpoint de detalhe do card.

POST recebe `{"fileId":"<UUID_APROVADO>"}` com CSRF, `If-Match` e
`Idempotency-Key`; retorna `201`:

```json
{
  "attachmentId": "<UUID>",
  "fileId": "<UUID>",
  "taskId": "<UUID>",
  "version": 2,
  "etag": "\"2\"",
  "materialized": false,
  "attachmentCount": 1
}
```

Primeiro vínculo em virtual retorna `materialized=true`, versão inicial 1 e
motivo `attachment`. Mantém `occurrenceKey`. Repetição da mesma operação retorna o
recibo original; refazer com chave diferente sobre arquivo já vinculado retorna
`409`. Releia o recurso para obter sua versão atual após replay.

`attachmentCount` é o total de vínculos ativos no momento dessa escrita. Não
substituir um contador/ETag mais recente com um recibo antigo recuperado por
idempotência. Recibos anteriores à inclusão do campo são completados na releitura.

DELETE exige CSRF e `If-Match` da tarefa; retorna `204` com novo ETag.
Não há corpo JSON nesse DELETE. Após confirmação, atualizar a contagem conhecida
e reconciliar com uma releitura agrupada do destino. Manter `attachmentCount`
ao substituir tarefas/ocorrências no cache após outras alterações.
Remover não desmaterializa tarefa nem altera status/responsável. Inclusão e remoção
produzem eventos `attachment_added`/`attachment_removed`.

Quem pode ler a tarefa pode ler seus anexos. Owner/admin e líder podem adicionar
e remover; contributor atribuído pode adicionar anexos e remover apenas os próprios
enquanto a tarefa estiver `pending` ou `in_progress`. Leitor não altera. Para uma
ocorrência ainda virtual, solicitar/vincular anexo exige owner/admin ou `lead`;
contributor não materializa a ocorrência por esse fluxo.
Tarefa arquivada, departamento inativo e competência finalizada bloqueiam mutações.
Limite de 20 anexos ativos por tarefa, configurável.

### Fotos e imagens de departamentos

| Métodos          | Rota                                              |
| ---------------- | ------------------------------------------------- |
| `GET/PUT/DELETE` | `/api/v1/organization-members/{memberId}/avatar/` |
| `GET/PUT/DELETE` | `/api/v1/departments/{departmentId}/image/`       |

GET retorna `{"version":1,"file":null}` quando vazio e `ETag: "1"`, sem criar
slot no banco. Quando houver imagem, `file` segue o contrato de metadados acima.
PUT recebe `{"fileId":"<UUID_APROVADO>"}`, CSRF, ETag da imagem e
`Idempotency-Key`; retorna `200` com `fileId`, `version` e `etag`. DELETE exige
CSRF/ETag e retorna `204` com novo ETag. As versões são próprias da imagem,
independentes das versões de tarefa, membership e sessão.

O próprio membro lê e troca sua foto na organização ativa. Outros leitores seguem
a visibilidade atual do roster. Owner/admin pode remover foto de outro membro,
mas não substituí-la. Foto não é global de `User` e não revoga sessões.
Quem vê o departamento vê a imagem; apenas owner/admin altera em departamento ativo.

As respostas de sessão/membership incluem `avatar`; as respostas de membros incluem
`avatar`; as de departamentos incluem `image`. A referência é nula ou:

```json
{ "fileId": "<UUID>", "version": 2, "variants": ["64", "256"] }
```

Esses campos não contêm URL. O frontend deve solicitar a variante para exibição e
manter iniciais/ícone como fallback. Imagens são quadradas, recortadas ao centro,
WebP estático em 64/256 pixels, reencodadas sem EXIF/GPS. Falha no novo upload ou
ETag obsoleto mantém a imagem anterior.

### `POST /api/v1/files/{fileId}/download/`

CSRF; enviar `{}` para anexo ou `{"variant":"64"}`/`{"variant":"256"}` para
imagem. Imagem sem variante explícita usa `256`. Retorna `200`:

```json
{ "url": "https://<URL_ASSINADA>", "expiresIn": 60 }
```

Reautoriza pelo vínculo e recurso de negócio. Arquivo aprovado ainda não vinculado
retorna `409`; tenant/recurso invisível retorna `404`. Anexos são download;
somente variantes reescritas podem ser inline. A resposta da API usa `no-store`.
URL emitida pode continuar válida por até 60 segundos após revogação de acesso;
revogação impede novas emissões.

### Erros e limites de operação

| HTTP          | Situação                                                                                  |
| ------------- | ----------------------------------------------------------------------------------------- |
| `400`         | Payload, destino ou parâmetros desconhecidos/inválidos                                    |
| `403`         | Ação proibida em recurso visível                                                          |
| `404`         | Tenant, arquivo ou destino fora da visibilidade                                           |
| `409`         | Arquivo não aprovado, destino errado, cota ou limite de anexos, idempotência incompatível |
| `410`         | Intenção/arquivo sem vínculo expirado                                                     |
| `412` / `428` | ETag divergente / `If-Match` ausente                                                      |
| `413` / `415` | Tamanho excessivo / formato declarado não permitido                                       |
| `429`         | Throttle por usuário, default 120/minuto                                                  |
| `501`         | API de arquivos ou novos uploads desabilitados                                            |
| `503`         | Bucket/configuração indisponível ou confirmação S3 falhou                                 |

Quando `FILES_REQUIRE_MALWARE_SCAN=True`, falhas de scanner ocorrem no worker: polling mantém o estado sem aprovação durante
retries e, ao esgotar tentativas, o arquivo fica `deleted`. Conteúdo inválido recebe
`rejected` com motivo técnico. Não exibir mensagens de SDK ou assinatura ao usuário.

Cota default de 5 GiB por organização e dez uploads não vinculados por membro.
Reserva cobre entrada e teto dos derivados. Arquivo removido deixa de emitir URLs
imediatamente; sua cota é liberada após limpeza física confirmada.

Configuração e operação: [CONFIGURACAO_ARQUIVOS_BUCKETEER.md](CONFIGURACAO_ARQUIVOS_BUCKETEER.md).

## 16. Alinhamento com o documento do frontend

Comparação realizada em 14/10/2026 com o texto fornecido pelo usuário. O código
atual do backend define o contrato; mudanças de texto ou formatação no frontend
não criam rotas, campos ou permissões adicionais.

| Tema                         | Contrato atual para os dois projetos                                                                                                                              |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Funcionários → colaboradores | Usar colaborador nos textos; preservar `organization-members/`, `memberId`, `membershipId`, `assigneeMemberId` e `defaultAssigneeMemberId` nos requests/responses |
| Código da empresa            | Opcional e anulável, conforme `ClientCompanyInputSerializer`/`ClientCompanyPatchSerializer`; frontend aceita ausência de código                                   |
| Anexos                       | Os placeholders do texto fornecido estão desatualizados; usar upload, confirmação, processamento e vínculo da seção 15                                            |
| Fotos e imagens              | `avatar`/`image` são referências nulas ou com `fileId`, `version` e variantes; URL temporária vem do endpoint de download                                         |
| Vínculos removidos           | DELETE empresa–rotina apaga a linha; arquivar empresa também remove seus vínculos; tarefas materializadas preservam snapshots                                     |
| Empresa e departamento       | Não existe endpoint público de atribuição empresa–departamento; selecionar departamento na rotina/tarefa/tela                                                     |
| Preview de anexos            | Ainda planejado; não existe `POST /api/v1/files/{fileId}/preview/` no código atual                                                                                |

As diferenças restantes no texto fornecido eram de apresentação dos exemplos JSON.
Não foram identificadas outras rotas ou campos novos exclusivos daquele texto.
Permissões e identificadores permanecem conforme o código, mesmo quando labels
do produto mudam. Algumas mensagens de erro/descriptions internas ainda usam
“funcionário”; essa redação não altera o contrato de colaboradores acima.

Fontes conferidas: `apps/organizations/api/urls.py`, serializers, views e policies
de organizações; `apps/clients/api/serializers.py`, validators e services;
`apps/routines/api/serializers.py`, views e services; `apps/operations/api/urls.py`
e projeções; `apps/files/api/urls.py`, views, serializers, policies e services.

Conferência local desta revisão: 103 combinações de método/rota documentadas
encontradas no schema gerado ou no resolvedor Django, 14 exemplos JSON válidos e
16 seções numeradas sem repetição. Os serializers de empresa também foram
exercitados sem banco para confirmar omissão, `null` e código vazio.

## 17. Processos e acessos por módulo

Contrato de 22/10/2026. Todas as rotas abaixo começam com `/api/v1/`, usam sessão,
organização ativa e CSRF nas escritas. Nenhuma aceita `organizationId`, autor,
histórico, tarefas ou status enviados livremente pelo cliente. Campos desconhecidos
são rejeitados. O `openapi.yml` contém os schemas de entrada e saída gerados dos
mesmos serializers executados pela API.

### 17.1 HUB e administração de acessos

`POST auth/login/`, `GET auth/session/`, `GET auth/memberships/` e
`PUT auth/active-membership/` acrescentam `modules` a cada resumo de associação,
inclusive `activeMembership`. A lista contém somente os módulos disponíveis naquela
organização. `GET module-permissions/` retorna `{ "modules": [...] }` para a
organização ativa. Consulte novamente após trocar de organização ou alterar vínculos.

Cada módulo informa `module` (`routines` ou `processes`), `globalAccess`, `actions` e
`sectors`. Cada setor informa `id`, `name`, `role`, `actions` e, em Processos,
`jobTitle`. Processos também informa `executeSectors`, a lista de setores em que o
usuário pode executar tarefas. As permissões são cumulativas quando existem vários
vínculos. A interface deve oferecer somente os setores permitidos; enviar outro
setor ao filtro da fila retorna `403`. As permissões de cada recurso continuam
sendo validadas na execução, inclusive atribuição de tarefas em Rotinas.

Regras globais explícitas:

- Rotinas conserva `DepartmentAccess` e seus cargos `lead`, `contributor`, `viewer`.
  Contas anteriores sem configuração explícita conservam o acesso existente:
  `owner`/`admin` continuam administradores de Rotinas. A configuração por módulo
  pode substituir esse comportamento por acesso departamental ou nenhum acesso.
- Processos exige vínculo próprio `com`, `fin` ou `reg`. `owner`, `admin`, staff e
  superuser **não recebem acesso implícito** a Processos. Não há migração de cargos
  de Rotinas para Processos. Owner/admin pode cadastrar explicitamente os vínculos.
- Somente owner/admin administra vínculos. Um admin não pode alterar os vínculos de
  um owner. Concessões são permitidas para membros `pending` ou `active`; acesso
  efetivo exige membro, usuário e organização ativos.

| Método e rota | Entrada | Resposta |
| --- | --- | --- |
| `GET module-permissions/` | — | `200` com módulos efetivos do solicitante |
| `GET organization-members/{memberId}/module-accesses/` | — | `200` com todos os vínculos do membro no tenant |
| `PUT organization-members/{memberId}/module-accesses/` | `module`, `sector`, `role`, `jobTitle?` | `200` com a lista atualizada; cria ou substitui um vínculo |
| `DELETE organization-members/{memberId}/module-accesses/` | `module`, `sector` no corpo JSON | `204`; revoga somente o vínculo indicado |

Exemplo de concessão em Processos:

```json
{"module":"processes","sector":"reg","role":"reg","jobTitle":"Analista de regularidade"}
```

`role` deve ser igual a `sector` em Processos: `com` = Diretoria, `fin` = Financeiro,
`reg` = Regularidade. Em Rotinas, `sector` é o UUID de um departamento da organização
e `role` é `lead`, `contributor` ou `viewer`; `jobTitle` deve estar ausente ou vazio.
O vínculo de Rotinas é o mesmo administrado pelas rotas `department-accesses/` já
existentes; não há segunda fonte de permissões. Alterações e revogações são
consultadas nas próximas requisições, sem exigir novo login.

O cadastro e a edição geral do colaborador recebem `moduleAccesses`, tanto em
`POST membership-invitations/` quanto em `PATCH organization-members/{id}/`.
O cargo organizacional controla a administração de usuários; ele é separado dos
níveis dos módulos. Apenas owner/admin da organização configura esses acessos.
O mesmo `memberId`, e-mail, senha e sessão atendem Rotinas e Processos.

Exemplo de novo colaborador: leitor do departamento indicado em Rotinas e
Financeiro em Processos (substitua o UUID pelo departamento ativo do tenant):

```json
{
  "email": "colaborador@example.com",
  "displayName": "Maria Silva",
  "role": "member",
  "moduleAccesses": [
    {
      "module": "routines",
      "enabled": true,
      "role": "departments",
      "sectors": [{"sector": "00000000-0000-0000-0000-000000000001", "role": "viewer"}]
    },
    {
      "module": "processes",
      "enabled": true,
      "sectors": [{"sector": "fin", "role": "fin", "jobTitle": "Analista financeiro"}]
    }
  ]
}
```

Em Rotinas, `role: "admin"` concede administração global do módulo, mesmo a um
`member` da organização, sem permitir que ele administre usuários. Nesse nível,
omita `sectors`. `role: "departments"` exige setores com cargos departamentais,
mesmo se o cargo organizacional for `owner`/`admin`. Em Processos, o nível é definido
por setor: `com`, `fin`, `reg`; não envie `role` no objeto do módulo.

Para retirar o acesso de uma conta existente a Rotinas e manter apenas Regularidade
em Processos, envie no PATCH do colaborador:

```json
{
  "moduleAccesses": [
    {"module": "routines", "enabled": false},
    {"module": "processes", "enabled": true, "sectors": [{"sector": "reg", "role": "reg"}]}
  ]
}
```

Cada módulo informado substitui integralmente seus vínculos anteriores; passar de
Diretoria para Regularidade remove o vínculo `com`, inclusive acesso financeiro.
`enabled: false` remove os vínculos do módulo e bloqueia suas APIs. Nas edições,
módulos omitidos permanecem como estavam; `moduleAccesses: []` não altera acessos.
Na criação, módulos omitidos começam desabilitados. Reemitir um convite sem
`moduleAccesses` preserva a configuração do perfil pendente.

Os endpoints de vínculo individual continuam cumulativos e não reabilitam um módulo
explicitamente desabilitado. Use o PATCH geral para reabilitá-lo e definir seus
vínculos completos. Nome, cargo e módulos são validados e gravados atomicamente;
um departamento inválido ou de outro tenant desfaz toda a alteração.

Owner/admin recebe `moduleAccesses` no roster e no detalhe do colaborador, incluindo
módulos sem acesso. Líderes de departamento recebem essa lista vazia, preservando o
escopo do roster. O HUB e a sessão mostram apenas módulos com acesso efetivo.
Recursos compartilhados, como gestão da organização, perfis, fotos e cadastro de
empresas, continuam seguindo suas políticas próprias. Desabilitar Rotinas bloqueia
rotinas, presets, vínculos recorrentes, competências, tarefas, telas e seus anexos;
não remove o cargo organizacional nem o histórico.

### 17.2 Matriz de Processos e confidencialidade

| Ação | Diretoria `com` | Financeiro `fin` | Regularidade `reg` |
| --- | --- | --- | --- |
| Consultar processos, catálogo e indicadores | Sim | Sim | Sim |
| Criar, editar dados, excluir, cancelar e reabrir processo | Sim | Não | Não |
| Executar/reabrir tarefas | Qualquer setor | Próprio setor | Próprio setor |
| Adicionar notas | Sim | Sim | Sim |
| Valores, relatórios de movimentações/honorários | Sim | Sim | Não |
| Consultar estados e tentar novamente notificações pendentes | Sim | Não | Não |

`permissions` na resposta de cada processo e no catálogo informa `read`, `create`,
`edit`, `delete`, `cancel`, `reopen`, `note`, `viewFinancial`, `viewMovements`,
`sectors` cadastrados e `executeSectors`. Todos os setores com acesso podem consultar
os processos do tenant; o filtro `setor` significa pendências atuais daquele setor.

Para quem não tem `viewFinancial`, a API **omite as propriedades** `custo`, `pagador`,
`parcelas`, `honorario`, `honCobranca`, `trab`, `trabQtd`, `trabValor`, `honAnterior`
e `honPerdido`, em listagens e detalhes. Não use a ausência como valor zero.
Textos livres `obs`, `altDesc`, `regimeObs`, `motivoObs`, `contato` e
`contadorContato` também são confidenciais: podem conter valores escritos sem
símbolo monetário. A indicação do pagador no texto da tarefa de guia é omitida.

Notas de autores que possuem acesso financeiro são sempre confidenciais. Só
Diretoria/Financeiro as recebem. Notas de autores sem esse acesso são operacionais
e compartilhadas. Essa classificação fica registrada na criação e não muda ao
revogar o vínculo. Não há parâmetro para contornar a classificação. Histórico
público usa eventos estruturados produzidos pelo servidor e não inclui valores ou
textos enviados pelo usuário. Não é utilizada máscara baseada em expressão regular.

### 17.3 Operações e filtros

| Método e rota | Entrada | Resposta |
| --- | --- | --- |
| `GET processes/catalog/` | — | `200`: `workflowVersion`, `types`, `sectors`, `permissions` |
| `GET processes/` | filtros abaixo | `200` paginado: `count`, `next`, `previous`, `results` |
| `GET processes/{id}/` | — | `200` com processo, etapas efetivas, tarefas, notas e histórico |
| `POST processes/` | dados de abertura + header `Idempotency-Key` | `201` criado; `200` para replay idêntico |
| `PATCH processes/{id}/` | `version` + campos editáveis | `200` com nova versão |
| `DELETE processes/{id}/` | `{"version":N}` | `204`; exclusão lógica, histórico preservado |
| `POST processes/{id}/tasks/{taskId}/transition/` | `version`, `state` | `200` com processo atualizado |
| `POST processes/{id}/notes/` | `version`, `text` (1–5000 caracteres) | `200` com processo atualizado |
| `POST processes/{id}/cancel/` | `{"version":N}` | `200` com processo cancelado |
| `POST processes/{id}/reopen/` | `{"version":N}` | `200` com processo reaberto |
| `GET processes/indicators/` | mesmos filtros da lista | `200` com contagens |
| `GET processes/reports/monthly/?month=YYYY-MM` | mês obrigatório, sem outros parâmetros | `200` com movimentações e honorários |
| `POST processes/{id}/notifications/retry/` | `{"version":N}` | `200`; tenta apenas notificações ainda elegíveis |
| `GET processes/{id}/notifications/` | — | `200`; Diretoria consulta cada destinatário e estado da entrega |

Filtros de lista/indicadores: `page` (inteiro positivo), `tipo`, `status`
(`andamento`, `concluido`, `cancelado`), `setor` (`com`, `fin`, `reg`), `q`
(empresa, CNPJ, protocolo ou código), `late` e `waiting` (booleanos), `month`
(`YYYY-MM`, mês de abertura no fuso da organização). Parâmetros desconhecidos ou
inválidos retornam `400`. `setor` exige autorização de execução naquele setor.
Processos em espera não entram na fila nem nos atrasados. Consulte
`?waiting=true` para os agendados e `?late=true` para os atrasados.

Indicadores retornam `total`, `active`, `completed`, `cancelled`, `late`, `waiting`,
`bySector` (pendências atuais) e `byType`, sem valores financeiros.

### 17.4 Campos e tipos

Os nomes do HTML foram mantidos nos dados do processo. Valores monetários são
strings decimais em BRL com duas casas, até 14 dígitos no total e sem valores
negativos. Datas usam `YYYY-MM-DD`; timestamps usam ISO 8601 com fuso.

| Grupo | Campos aceitos |
| --- | --- |
| Identificação | `tipo` (obrigatório e imutável), `empresa` (obrigatório, até 200), `companyId` (UUID opcional de empresa ativa do mesmo tenant), `cnpj` (opcional, valida dígitos verificadores e normaliza), `protocolo` (até 160) |
| Datas e observações | `prazo` (data ou null), `inicioInat` (data ou null), `obs` (até 5000) |
| Custos | `custo`, `pagador` (`cliente` ou `jaralcon`), `parcelas` (1–360) |
| Honorários | `honorario` (contábil), `honCobranca` (início da cobrança), `trab` (booleano), `trabQtd` (1–100000), `trabValor` (valor por funcionário), `honAnterior`, `honPerdido` |
| Alteração contratual | `altItens` (sem repetição: `societario`, `capital`, `bens`, `endereco`, `razao`, `atividades`, `outros`), `altDesc` (até 3000) |
| Motivo | `motivo` (`encerramento`, `honorarios`, `atendimento`, `concorrente`, `inadimplencia`, `venda`, `reducao`, `outros`), `motivoObs` (até 1500) |
| Regime | `regime` (`simples`, `presumido`, `real`), `regimeObs` (até 3000) |
| Saída | `contato` (até 500), `novoContador` (booleano), `contadorNome` (até 200), `contadorContato` (até 500) |
| Opções | `reatJunta`, `reunAlinh`, `reunAcomp` (booleanos) |

Campos específicos são aceitos somente nos tipos aplicáveis. Ausência permite
definir dados depois; `null` é aceito em datas, valores, pagador, parcelas, regime,
motivo e companyId. Use string vazia para limpar texto. `empresa` nunca é vazia.

| `tipo` | Significado e particularidades |
| --- | --- |
| `abertura` | Abertura; custo, honorário, regime, reuniões |
| `mei` | Transformação MEI → ME; custo, honorário, regime, reuniões |
| `outro` | Cliente de outro escritório; honorário, regime, reuniões |
| `alteracao` | Alteração contratual; exige itens, descrição, custo, pagador e parcelas na abertura e edição |
| `inatividade` | **Paralisação**; exige `honPerdido`, usa `inicioInat` em lugar de prazo |
| `inativa` | **Inatividade**; honorário reduzido, `honAnterior`, `inicioInat` em lugar de prazo |
| `reativacao` | Honorário, reuniões e etapa opcional controlada por `reatJunta` |
| `baixa` | Baixa; exige `honPerdido`, tem custo e motivo |
| `saida` | Saída; exige `honPerdido`; se `novoContador=true`, exige nome e contato do contador |
| `exclusao` | Exclusão de cliente; exige `honPerdido`, tem motivo |

Exemplo de abertura (enviar sessão, CSRF e `Idempotency-Key`):

```json
{
  "tipo":"abertura",
  "empresa":"Empresa Exemplo",
  "protocolo":"PROTO-2026-001",
  "prazo":"2026-11-30",
  "custo":"500.00",
  "pagador":"cliente",
  "parcelas":2,
  "honorario":"1200.00",
  "honCobranca":"2026-12-01",
  "regime":"simples",
  "reunAlinh":true,
  "reunAcomp":true
}
```

A resposta acrescenta `id`, `organizationId`, `codigo`, `status`, `version`,
`criadoPor` (membro da organização), `autorAbertura`, `criadoEm`, `atualizadoEm`,
`concluidoEm`, `workflowVersion`, `tarefas`, `etapas`, `analysis`, `permissions`,
`notas`, `historico`; Diretoria também recebe `notifications` com contagens por
estado de entrega. Respostas individuais têm `ETag` com a versão. Campos financeiros
e textos confidenciais são opcionais no schema pois podem ser omitidos por permissão.

`tarefas` é um objeto indexado pelo ID do catálogo (por exemplo `ab3`), contendo
`s` (`feito` ou `na`), `por`, `autor`, `em` e, para automáticas, `auto=true`.
Uma tarefa pendente não tem estado nesse objeto. `etapas` contém `t`, `tasks`,
`index` original e `completed`, além das opções do catálogo quando aplicáveis.
Cada tarefa contém `id`, `d` (setor), `txt` e os metadados de campo, reunião,
opcionalidade e marco existentes no HTML. A organização não pode enviar workflows
arbitrários. O catálogo é versionado e cada processo preserva sua cópia do fluxo.

`analysis` contém `currentStage` (índice de base zero das etapas efetivas, null se
todas completas), `completedTasks`, `totalTasks`, `releaseDate`, `waiting`, `late`
e `pendingSectors`. Datas de liberação são calculadas no fuso da organização.
Notas e eventos têm `id`, `por`, `autor`, `em`, `kind`, `financial`, `text`, `details`.
Eventos incluem `opened`, `edited`, `task`, `completed`, `reopened`, `cancelled`,
`deleted`, `email_retry`; alterações indicam os nomes dos campos, tarefas e estados,
sem expor seu conteúdo financeiro no histórico público.
Eventos confidenciais `definitions` e `financial_update` preservam os valores
definidos na abertura e os valores anteriores/novos de alterações financeiras ou
de texto privado. São omitidos integralmente para quem não pode consultar valores.

### 17.5 Transições e concorrência

Toda mutação em um processo existente exige `version` inteiro positivo no corpo;
o servidor bloqueia a linha, verifica a versão e incrementa-a na mesma transação.
Versão antiga retorna `409`, sem alteração parcial. Recarregue o processo antes de
reaplicar. Não envie um snapshot inteiro do HTML para sobrescrever o agregado.

Na transição de tarefa, `state` aceita `feito`, `na` ou `pending` (reabrir).
Apenas a etapa atual pode receber novas conclusões, respeitando o setor autorizado
e os campos obrigatórios. `na` exige tarefa marcada `opt` no catálogo. Definições
automáticas de abertura não podem ser reabertas diretamente. Custo/honorário/regime
preenchidos completam suas tarefas de definição; limpar campos obrigatórios reabre
as definições correspondentes. Honorário com folha exige quantidade e valor;
inatividade também exige honorário anterior antes de concluir sua definição.

Etapas são sequenciais, com tarefas de setores diferentes executáveis em paralelo
dentro da etapa. Reabrir pré-requisito limpa confirmações das etapas posteriores e
registra `resetTasks`, para impedir conclusão apoiada em pré-requisito inválido.
Alterar opções retira tarefas desabilitadas e também invalida dependências quando
necessário. Ao completar todas as tarefas efetivas, o servidor conclui o processo
e grava `concluidoEm`. Reabrir tarefa de processo concluído reabre o processo.

`reunAlinh=false` e `reunAcomp=false` retiram as respectivas reuniões;
`reatJunta=false` retira a etapa opcional de reativação; `novoContador=true`
retira a etapa de solicitar dados do contador. Opções de reunião/reativação são
habilitadas por padrão. Reuniões de acompanhamento liberam **quatro meses de
calendário** após a última conclusão da etapa anterior, com ajuste ao último dia do
mês; nenhum cliente pode antecipar essa data. A liberação é calculada na consulta,
sem depender de job ou relógio do navegador.

Somente processos `andamento` podem ser cancelados. Processo cancelado precisa ser
reaberto antes de editar dados ou tarefas. Notas podem ser adicionadas a processos
encerrados. `reopen/` restaura um cancelado; em concluído, reabre a última tarefa
manual. Exclusão é lógica e mantém histórico, chave de idempotência e vínculos de
autoria. Não existe transição arbitrária de status. O estado `revertido` aparece
em código auxiliar do HTML, mas o catálogo fornecido não contém tarefa de decisão
que o produza; esta API implementa os estados alcançáveis pelos dez fluxos atuais.

### 17.6 Movimentações e honorários

O relatório é restrito a Diretoria/Financeiro. Conta processos pelo **mês da abertura
no fuso da organização**, como o HTML, mesmo que a cobrança comece depois.
Exclui cancelados e excluídos. Soma `honorario + trabQtd × trabValor` quando há folha.
Ganhos incluem `abertura`, `mei`, `outro`; perdas diretas incluem `baixa`, `saida`,
`exclusao`, `inatividade`. Em `inativa`, perda é
`max(0, honAnterior - honorário total novo)`. Reativação continua sem gerar ganho
de contrato novo, conforme a referência.

Retorna `month`, `gain`, `loss`, `balance`, `missingValues`, `entries`, `exits`,
`lossesByType`, `previousMonth` e `history` (12 meses terminando no mês solicitado).
Cada item contém `processId`, `empresa`, `tipo`, `value` (decimal ou null).
Valor indefinido conta em `missingValues` e fica fora dos totais; não é confundido
com zero definido. Os totais são decimais, sem cálculo em ponto flutuante.

### 17.7 E-mail de abertura e idempotência

`POST processes/` exige `Idempotency-Key` de 1–128 caracteres ASCII alfanuméricos
ou `._:-`, preferencialmente UUID criado pelo frontend para aquela abertura.
Reutilize a mesma chave e o mesmo corpo validado ao repetir uma requisição cujo
resultado não chegou. A chave é única por organização, sem expiração automática.
Primeira abertura retorna `201`; repetição equivalente retorna `200`, o mesmo
processo e nenhum novo envio. Chave com outro conteúdo ou processo excluído retorna
`409`. A criação do processo e das notificações é atômica.

Destinatários: todos os membros ativos da organização com algum acesso explícito
a Processos, incluindo o autor se elegível; um e-mail individual por membro,
deduplicado mesmo com vários setores. Owner/admin sem vínculo não recebe.
Não são enviados e-mails a clientes/contadores externos ou endereços fornecidos no
payload. Antes da entrega, usuário, organização, vínculo e permissões são
consultados novamente; acesso revogado resulta em `skipped`.
O endereço de cada destinatário é o e-mail do vínculo já utilizado no sistema de
Rotinas (`OrganizationMember.email`); não é necessário cadastrar outro e-mail.

Conteúdo: organização, código, tipo, empresa, CNPJ, protocolo, prazo, abertura e
autor; lista de tarefas dos setores em que o destinatário pode atuar. Valores
estruturados são incluídos somente para Diretoria/Financeiro. Textos livres,
notas e histórico não entram no e-mail. O assunto contém somente o código do
processo. Envio usa o backend Django já configurado (`DEFAULT_FROM_EMAIL`, SMTP).
O corpo usa o template `processes/emails/opened.txt`, com saudação, nome do tipo,
setores por extenso e abertura no fuso da organização. Não há credenciais ou
remetente separados para Processos: `EMAIL_BACKEND`, `EMAIL_HOST`, `EMAIL_PORT`,
`EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `EMAIL_USE_TLS`, `EMAIL_TIMEOUT` e
`DEFAULT_FROM_EMAIL` são compartilhados com os demais e-mails do sistema.

`GET processes/{id}/notifications/` é restrito à Diretoria e retorna um array com
`id`, `memberId`, `displayName`, `email`, `status`, `claimedAt` e `sentAt`.
Não altera a versão nem dispara envio. IDs de outro tenant retornam `404`.
O frontend deve abrir o processo uma única vez com `POST processes/`; não precisa
fazer outra chamada para iniciar o envio de e-mail.

Após o commit, o backend tenta entregar as notificações registradas. A resposta
de criação permanece bem-sucedida se o provedor de e-mail falhar; consulte
`notifications` ou tente `notifications/retry/`. Esta tentativa exige Diretoria e
`version`, e retorna `200` com o estado do processo, sem recriar destinatários.
Configure também execução periódica para recuperar pendências após queda da API:

```powershell
python manage.py send_process_notifications --limit 100 --settings=config.settings.production
```

Alternativamente, mantenha o worker contínuo, que consulta pendências a cada cinco
segundos e recupera conexões após indisponibilidade do banco:

```powershell
python manage.py send_process_notifications --watch --poll-seconds 5 --limit 100 --settings=config.settings.production
```

O `Procfile` inclui o processo `notificationworker`; ative uma instância no ambiente
de hospedagem. Em Docker Compose, depois de aplicar as migrações, use
`docker compose --profile notifications up -d notificationworker`. Sem `--watch`,
o comando continua executando apenas um lote, adequado para agendadores. Não há
necessidade de agendador adicional quando o worker contínuo está ativo.

Estados persistidos: `pending` (aguarda), `sending` (reservado antes do contato com
o provedor), `sent` (aceito), `failed` (falha de preparação, sem tentativa de envio),
`uncertain` (entrega não confirmada), `skipped` (acesso revogado/exclusão/cancelamento antes do envio).
Worker e endpoint tentam somente `pending`/`failed`, com bloqueio por notificação;
uma tentativa concorrente não envia novamente. O worker classifica `sending`
abandonado há mais de 15 minutos como `uncertain`.

SMTP não permite assegurar entrega exatamente uma vez em caso de timeout ou queda
após aceitação. A política evita envio duplicado automático: `uncertain` nunca é
reenviado automaticamente e requer conferência operacional no provedor. Um
`Message-ID` estável por notificação auxilia essa conferência. `sent` e `skipped`
também não são reenviados. Ausência de duplicidade pode significar entrega pendente
de conferência em falhas ambíguas; não exiba confirmação de recebimento ao usuário.

### 17.8 Erros

Todos os erros usam `application/problem+json` com `type`, `title`, `status` e
`detail` ou `errors`, além do header `X-Request-ID` para correlação.

| Código | Condição |
| --- | --- |
| `400` | Campo/parâmetro desconhecido, formato inválido, dados obrigatórios ausentes, campo de outro tipo, estado de tarefa inválido, chave ausente |
| `403` | Sem sessão/organização ativa, sem acesso ao módulo, ação/setor/valor restrito ou CSRF ausente |
| `404` | Processo, empresa, membro ou tarefa fora do tenant/fluxo efetivo; processo excluído |
| `409` | Versão antiga, etapa bloqueada/espera, tarefa automática, transição incompatível ou chave de idempotência reutilizada |

As novas tabelas têm migrações próprias. As relações de processo, empresa, autor e
destinatário possuem chaves estrangeiras compostas por organização no PostgreSQL,
além do escopo e validações da aplicação. Execute `manage.py migrate` no deploy.
Nenhum dado ou acesso de Rotinas é modificado pelas migrações de Processos.
