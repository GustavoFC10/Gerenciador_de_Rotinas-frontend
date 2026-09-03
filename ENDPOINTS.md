# Guia de endpoints da API

Este documento descreve as rotas expostas pelo backend no estado atual do código e
mostra um exemplo de utilização de cada operação HTTP.

## 1. Convenções dos exemplos

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

### Feature flag da Fase 4

Rotinas, presets, vínculos de rotina, competências, tarefas e telas operacionais só
executam quando:

```text
OPERATIONS_API_ENABLED=True
```

Com a flag desligada, essas rotas retornam `404`.

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
{"csrfToken":"TOKEN_MASCARADO"}
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

### `POST /api/v1/membership-invitations/`

Emite ou reemite um convite no tenant ativo e envia o e-mail. Somente `owner` ou
`admin`. O token nunca é retornado pela API.

```powershell
curl.exe -X POST "$BASE_URL/api/v1/membership-invitations/" `
  -b cookies.txt -H "X-CSRFToken: $CSRF" -H "Content-Type: application/json" `
  -d '{"email":"novo.membro@example.com","displayName":"Novo Membro","role":"member"}'
```

Retorna `201` com ID, e-mail, nome, papel, expiração e criação do convite.

### `GET /api/v1/organization-members/`

Lista funcionários do tenant com paginação comum. `owner/admin` recebe perfis de todos
os status. Um member com acesso `lead` recebe somente funcionários ativos ligados a
algum departamento que lidera; os `departmentAccesses` da resposta também ficam
limitados a esses departamentos. Contributor/viewer recebe `403`.

```powershell
curl.exe "$BASE_URL/api/v1/organization-members/?page=1" -b cookies.txt
```

### `GET /api/v1/organization-members/{id}/`

Retorna um funcionário dentro do mesmo escopo da listagem. Um ID de outro tenant ou
fora dos departamentos liderados retorna `404`.

```powershell
curl.exe "$BASE_URL/api/v1/organization-members/<UUID_DO_FUNCIONARIO>/" -b cookies.txt
```

### `PATCH /api/v1/organization-members/{id}/`

Altera `displayName` e/ou o cargo organizacional `role` (`owner`, `admin` ou `member`).
Somente `owner/admin`; um admin não pode promover nem alterar owner, e o último
owner/admin ativo não pode ser rebaixado.

```powershell
curl.exe -X PATCH "$BASE_URL/api/v1/organization-members/<UUID_DO_FUNCIONARIO>/" `
  -b cookies.txt -H "X-CSRFToken: $CSRF" -H "Content-Type: application/json" `
  -d '{"displayName":"Maria Silva","role":"member"}'
```

### `POST /api/v1/organization-members/{id}/offboard/`

Desliga o funcionário sem apagar o perfil, vínculos ou histórico. O status passa a
`inactive` e as sessões da identidade vinculada são revogadas. Somente `owner/admin`;
a proteção do último owner/admin continua válida.

```powershell
curl.exe -X POST "$BASE_URL/api/v1/organization-members/<UUID_DO_FUNCIONARIO>/offboard/" `
  -b cookies.txt -H "X-CSRFToken: $CSRF"
```

### `GET /api/v1/organization-members/{memberId}/department-accesses/`

Lista os papéis departamentais do funcionário. Owner/admin vê todos; líder vê somente
os acessos relativos aos departamentos que lidera.

```powershell
curl.exe "$BASE_URL/api/v1/organization-members/<UUID_DO_FUNCIONARIO>/department-accesses/" `
  -b cookies.txt
```

### `PUT /api/v1/organization-members/{memberId}/department-accesses/{departmentId}/`

Concede acesso ou substitui o papel existente por `lead`, `contributor` ou `viewer`.
Somente `owner/admin`.

```powershell
curl.exe -X PUT "$BASE_URL/api/v1/organization-members/<UUID_DO_FUNCIONARIO>/department-accesses/<UUID_DO_DEPARTAMENTO>/" `
  -b cookies.txt -H "X-CSRFToken: $CSRF" -H "Content-Type: application/json" `
  -d '{"role":"contributor"}'
```

### `DELETE /api/v1/organization-members/{memberId}/department-accesses/{departmentId}/`

Revoga o acesso sem desligar o funcionário. Somente `owner/admin`; retorna `204`.

```powershell
curl.exe -X DELETE "$BASE_URL/api/v1/organization-members/<UUID_DO_FUNCIONARIO>/department-accesses/<UUID_DO_DEPARTAMENTO>/" `
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

Retorna `201` com `id`, `name`, `description` e `accessRole` (`null` para um
administrador).

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

Cria uma empresa. O código interno aceita de 1 a 32 dígitos e preserva zeros à
esquerda; `legalName` é a razão social e permanece separado do nome de exibição,
CNPJ, e-mail e celular. A razão social é opcional nesta etapa.

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

Arquiva a empresa sem apagá-la. Vínculos departamentais e de rotina vigentes/futuros
são encerrados ou cancelados conforme sua data. Retorna `204` e o novo ETag.

```powershell
curl.exe -X DELETE "$BASE_URL/api/v1/client-companies/<UUID_DA_EMPRESA>/" `
  -b cookies.txt -H "X-CSRFToken: $CSRF" -H 'If-Match: "2"'
```

### `POST /api/v1/client-companies/{id}/restore/`

Restaura uma empresa arquivada. Os vínculos antigos não são reabertos
automaticamente.

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
 primeiro dia da competência.

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

Lista o histórico de rotinas atribuídas à empresa.

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

Cancela o vínculo sem apagar a linha.

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
observação ou links. Apenas consultar, filtrar, paginar ou abrir uma planilha nunca
grava. Um PATCH idêntico ao baseline é no-op e continua virtual.

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

Placeholder equivalente ao endpoint de anexos de uma tarefa real. Ele valida a
visibilidade da ocorrência e retorna `501`. Chamar o placeholder em um card virtual
não materializa a tarefa nem grava qualquer dado.

```powershell
curl.exe -X POST "$BASE_URL/api/v1/competences/by-period/2026-10/task-occurrences/<OCCURRENCE_KEY>/attachments/" `
  -b cookies.txt -H "X-CSRFToken: $CSRF"
```

Depois da materialização, as alterações futuras da rotina, empresa ou vínculo não
reescrevem o card. Remover um vínculo elimina somente ocorrências futuras que ainda
são virtuais. Competências `finalized` leem somente snapshots
persistidos.

### `GET /api/v1/competences/{competenceId}/tasks/`

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

Placeholder para anexos. O endpoint valida autenticação, tenant e visibilidade da
tarefa, mas ainda não recebe nem persiste arquivos. Enquanto um storage não estiver
configurado, sempre retorna `501` com o código
`task_attachments_not_implemented` para uma tarefa acessível.

```powershell
curl.exe -X POST "$BASE_URL/api/v1/competences/<UUID_DA_COMPETENCIA>/tasks/<UUID_DA_TAREFA>/attachments/" `
  -b cookies.txt -H "X-CSRFToken: $CSRF"
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
{"targetStatus":"no_movement"}
```

Exemplo de erro:

```json
{"targetStatus":"error"}
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
  "screen": {"id": "<UUID_DA_TELA>", "name": "MEI", "type": "spreadsheet"},
  "competenceId": null,
  "period": "2026-10",
  "rows": [
    {"id": "<UUID_DA_EMPRESA>", "code": "007", "name": "Empresa X", "legalName": "Empresa X Ltda.", "position": 0}
  ],
  "columns": [
    {"id": "<UUID_DA_ROTINA>", "shotname": "DAS", "name": "Apuração mensal do DAS", "departmentId": "<UUID_DO_DEPARTAMENTO>", "position": 0}
  ],
  "cells": [
    {
      "companyId": "<UUID_DA_EMPRESA>",
      "routineId": "<UUID_DA_ROTINA>",
      "tasks": [{"occurrenceKey":"<UUID_ESTAVEL>","taskId":null,"persistence":"virtual","status":"pending"}]
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
  "screen": {"id": "<UUID_DA_TELA>", "name": "Agenda Fiscal", "type": "agenda"},
  "competenceId": "<UUID_DA_COMPETENCIA_OU_NULL>",
  "period": "2026-10",
  "columns": [
    {"status": "pending", "count": 1, "tasks": [{"id": "<UUID_DA_TAREFA>", "kind": "ad_hoc", "title": "Revisar pendência"}], "hasMore": false},
    {"status": "in_progress", "count": 0, "tasks": [], "hasMore": false},
    {"status": "completed", "count": 0, "tasks": [], "hasMore": false},
    {"status": "no_movement", "count": 0, "tasks": [], "hasMore": false},
    {"status": "error", "count": 0, "tasks": [], "hasMore": false}
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
4. consultar/criar a empresa e, quando necessário, atribuí-la ao departamento;
5. criar uma rotina, ou consultar uma existente;
6. configurar a planilha com as empresas/rotinas selecionadas e/ou criar a agenda;
7. opcionalmente vincular rotinas recorrentes ou aplicar um preset;
8. consultar ou criar a competência `projected`; a primeira mutação também pode criá-la;
9. criar uma tarefa avulsa com `Idempotency-Key` ou consultar ocorrências de rotina
   que já existam na competência;
10. atribuir responsável e transicionar a tarefa;
11. consultar a projeção da tela e os eventos da tarefa.

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
{"name":"Maria Silva","email":"maria@abc.com"}
```

### `POST /api/internal/v1/invitations/{invitationId}/resend/`

Reemite o convite de um owner pendente ou expirado, invalidando o convite anterior.
