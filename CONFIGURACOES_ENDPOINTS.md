# Contratos da tela de configurações

Este documento registra como a tela `Configurações` se conecta à API e quais
contratos ainda não existem. `ENDPOINTS.md` e `openapi.yml` continuam sendo a
fonte de verdade para os endpoints já implementados.

## Regra de acesso

A rota da aplicação é `GET /configuracoes` (rota do frontend) e é protegida por
`MANAGE_ORGANIZATION`. Na prática, somente usuários `owner` ou `admin` da
organização ativa podem acessá-la. A API deve continuar validando a mesma regra;
a proteção do frontend não substitui a autorização do backend.

Todas as escritas abaixo usam a sessão Django, cookie CSRF e o header
`X-CSRFToken`, conforme as convenções de `ENDPOINTS.md`. A organização é inferida
da associação ativa da sessão.

## Contratos já existentes utilizados pela tela

### Departamentos

- `GET /api/v1/departments/?page=1`: lista os departamentos visíveis.
- `POST /api/v1/departments/`: cria um departamento.

Payload enviado pela tela:

```json
{
  "name": "Fiscal",
  "description": "Obrigações e apurações fiscais"
}
```

O frontend atualiza os dados após o `201 Created` para obter o departamento
retornado e refletir a nova lista. O contrato `Department` deve conter `id`,
`name`, `description` e `accessRole`, conforme `openapi.yml`.

### Telas operacionais

A seção de telas da central lista as telas ativas agrupadas por departamento e
abre o formulário de criação da mesma central administrativa. Ela usa:

- `GET /api/v1/screens/` e `GET /api/v1/screens/{id}/`;
- `POST /api/v1/screens/` para criar uma planilha ou agenda;
- `PATCH /api/v1/screens/{id}/`, `DELETE /api/v1/screens/{id}/` e
  `POST /api/v1/screens/{id}/restore/` para o ciclo de vida;
- `GET /api/v1/screens/{id}/projection/?period=YYYY-MM` para a operação.

As escritas de edição, arquivamento e restauração devem enviar o `ETag` recebido
como `If-Match`. O tipo da tela não pode ser alterado e `departmentId` é
obrigatório.

### Pessoas e cadastros

Os atalhos da central reaproveitam os contratos existentes:

- convites e membros: `/api/v1/membership-invitations/` e
  `/api/v1/organization-members/`;
- acessos departamentais:
  `/api/v1/organization-members/{memberId}/department-accesses/`;
- empresas: `/api/v1/client-companies/`;
- rotinas: `/api/v1/routines/`.

Não deve ser criado um endpoint agregador apenas para preencher a central. A
tela pode usar os dados do carregamento de controle operacional e os endpoints
de cada recurso.

## Endpoints ainda ausentes

### Ciclo de vida completo do departamento

Hoje `openapi.yml` e `ENDPOINTS.md` oferecem listagem, criação, detalhe e lista
de responsáveis do departamento. Não existe operação para editar, arquivar ou
restaurar um departamento. A tela atual não exibe esses comandos; caso eles
sejam adicionados, o backend deve seguir este formato:

#### `PATCH /api/v1/departments/{id}/`

Somente `owner/admin`, com CSRF e `If-Match` obrigatório.

Request:

```http
PATCH /api/v1/departments/<UUID_DO_DEPARTAMENTO>/
If-Match: "1"
Content-Type: application/json
X-CSRFToken: <TOKEN>
```

```json
{
  "name": "Fiscal e Tributário",
  "description": "Obrigações, apurações e declarações"
}
```

Resposta esperada: `200` com `Department` atualizado e `ETag` novo. Os campos
omitidos devem ser preservados. O backend deve retornar `400` para validação,
`403` para permissão, `404` para outro tenant e `409` para conflito de nome,
seguindo `application/problem+json`.

#### `DELETE /api/v1/departments/{id}/`

Somente `owner/admin`, com CSRF e `If-Match`. A exclusão deve ser lógica para
preservar histórico, vínculos e tarefas.

```http
DELETE /api/v1/departments/<UUID_DO_DEPARTAMENTO>/
If-Match: "2"
X-CSRFToken: <TOKEN>
```

Resposta esperada: `204 No Content` e `ETag` novo. O backend deve impedir a
operação quando houver dependências que não possam ser encerradas com segurança
e explicar o motivo em `application/problem+json`.

#### `POST /api/v1/departments/{id}/restore/`

Se o arquivamento for implementado, a restauração deve ser explícita e usar o
mesmo controle de concorrência:

```http
POST /api/v1/departments/<UUID_DO_DEPARTAMENTO>/restore/
If-Match: "3"
X-CSRFToken: <TOKEN>
```

Resposta esperada: `200` com `Department` restaurado e `ETag` novo.

Essas três rotas são propostas; não devem ser tratadas como disponíveis até
serem adicionadas ao `openapi.yml` e ao `ENDPOINTS.md` do backend.

### Cargos personalizados (opcional)

O contrato atual possui papéis fixos (`owner`, `admin`, `member`) e acessos
departamentais fixos (`lead`, `contributor`, `viewer`). A tela de configurações
não precisa de um endpoint de catálogo de cargos enquanto esses enums forem
fixos. Se a organização passar a criar cargos personalizados, será necessário
um recurso separado, por exemplo:

- `GET /api/v1/organization-roles/`;
- `POST /api/v1/organization-roles/`;
- `PATCH /api/v1/organization-roles/{id}/`;
- `DELETE /api/v1/organization-roles/{id}/`.

Esse recurso deve conter `id`, `name`, `description`, `permissions`, `isSystem`,
`createdAt` e `updatedAt`; alterações devem usar `If-Match`, não podem modificar
roles de sistema e devem continuar separando o papel organizacional do acesso a
departamentos. É uma extensão futura, não um contrato consumido pela tela atual.

## Checklist para conectar um novo endpoint

1. Adicionar a operação e os schemas ao `openapi.yml` do backend.
2. Atualizar o exemplo correspondente em `ENDPOINTS.md`.
3. Implementar o método no service específico em `src/services/` usando
   `HttpClient`, CSRF e `ifMatch` quando aplicável.
4. Expor a ação na tela somente depois de tratar `400`, `403`, `404`, `409`,
   `412` e `428` conforme o contrato.
5. Atualizar os dados da central após uma mutação bem-sucedida e cobrir o
   service com teste de método, URL, payload e headers.
