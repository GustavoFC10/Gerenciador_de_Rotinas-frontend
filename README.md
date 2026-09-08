# Gerenciador de Rotinas - Frontend

Frontend do MVP para um sistema de controle de rotinas contabeis. A proposta do produto e substituir gradualmente planilhas operacionais por uma interface unica para acompanhar empresas, rotinas, responsaveis, status, prazos, observacoes e tarefas avulsas.

O foco atual do MVP e validar a experiencia operacional:

- planilha de empresas x rotinas como tela central;
- listas reutilizaveis para focar por rotina, empresa, tarefas fiscais ou responsavel;
- tarefas avulsas no mesmo modelo visual das tarefas de rotina;
- detalhe de tarefa em modo de leitura;
- base de navegacao por perfil para funcionario, lider e manager;
- integração direta com a API REST, incluindo autenticação e projeções de telas.

## Stack

- React 19
- React Router 7
- Vite 8
- Tailwind CSS 4
- Vitest
- Docker multi-stage com Nginx para producao

## Requisitos

- Node.js 22+
- npm
- Docker Desktop, opcional para execucao via container

## Execucao local

Instale as dependencias:

```bash
npm install
```

Inicie o Vite:

```bash
npm run dev
```

Por padrao, o Vite disponibiliza a aplicacao em:

```text
http://localhost:5173
```

## Scripts

| Comando                | Descricao                                                 |
| ---------------------- | --------------------------------------------------------- |
| `npm run dev`          | Inicia o servidor local do Vite.                          |
| `npm run build`        | Gera o build de producao em `dist/`.                      |
| `npm run preview`      | Serve localmente o build gerado pelo Vite.                |
| `npm run test`         | Executa os testes unitarios com Vitest.                   |
| `npm run lint`         | Verifica problemas de codigo com ESLint.                  |
| `npm run lint:fix`     | Corrige automaticamente problemas suportados pelo ESLint. |
| `npm run format`       | Formata o projeto com Prettier.                           |
| `npm run format:check` | Verifica se os arquivos seguem o padrao do Prettier.      |

## Variaveis de ambiente

O frontend usa variaveis expostas pelo Vite.

| Variavel        | Padrao | Uso                                                          |
| --------------- | ------ | ------------------------------------------------------------ |
| `VITE_API_URL`  | —      | URL base obrigatória da API do backend.                      |
| `FRONTEND_PORT` | `8080` | Porta usada pelo Docker para publicar o frontend localmente. |

Exemplo:

```bash
VITE_API_URL=http://localhost:3000
FRONTEND_PORT=8080
```

## Docker

O projeto possui um `Dockerfile` multi-stage com dois modos principais:

- `development`: roda o Vite dentro do container e sincroniza o codigo por volume;
- `production`: gera o `dist/` e serve a aplicacao estatica com Nginx.

### Desenvolvimento com hot reload

Use o compose principal durante o desenvolvimento:

```bash
docker-compose up --build
```

Subir em background:

```bash
docker-compose up --build -d
```

Aplicacao via Docker em desenvolvimento:

```text
http://localhost:8080
```

Neste modo, alteracoes em `src/` sao refletidas pelo Vite sem rebuild da imagem. Se instalar ou remover dependencias, recrie o container:

```bash
docker-compose up --build --force-recreate
```

### Build de producao com Nginx

Use o compose de producao quando quiser testar a imagem estatica final:

```bash
docker-compose -f docker-compose.prod.yml up --build
```

Subir em background:

```bash
docker-compose -f docker-compose.prod.yml up --build -d
```

Build manual da imagem:

```bash
docker build --target production --build-arg VITE_API_URL=http://localhost:3000 -t gerenciador-de-rotinas-frontend .
docker run --rm -p 8080:80 gerenciador-de-rotinas-frontend
```

## Deploy

O projeto inclui `vercel.json` para deploy do frontend Vite na Vercel.

Configuracao esperada:

- comando de build: `npm run build`;
- diretorio de saida: `dist`;
- rewrite para `index.html`, garantindo suporte a rotas client-side do React Router.

## Estado atual do MVP

### Implementado no frontend

- Layout base com sidebar, topbar e area de conteudo.
- Home operacional personalizada por usuário e competência, com planilhas,
  prioridades, andamento pessoal e expansão por cargo.
- Planilha operacional por departamento.
- Clique em rotina para abrir lista filtrada por rotina.
- Clique em empresa para abrir lista filtrada por empresa.
- Lista global reutilizavel.
- Tarefas fiscais em lista com busca local.
- Minhas tarefas com suporte a tarefas avulsas.
- Perfil simples.
- Detalhe de tarefa em overlay.
- Atualizacao local de status, responsavel, prazo, observacao e anexos simulados.
- Componentes compartilhados de UI, formulario, loading, erro e vazio.
- Testes unitarios para utilitarios criticos de competencia, filtros e montagem de listas.

### Planejado / placeholder

As rotas abaixo existem na proposta de navegacao do MVP:

- Dashboard do departamento;
- Dashboard geral;
- Rotinas;
- Empresas;
- Funcionarios;
- Cargos.

Essas telas representam a direcao do MVP final, mas ainda precisam de implementacao funcional e integracao com backend.

## Regras de produto consideradas

O MVP parte destes conceitos:

- toda task de rotina pertence a uma empresa, rotina, departamento e competencia;
- tarefas avulsas podem nao ter empresa ou rotina;
- status operacional inicial: pendente, em andamento, erro e concluido;
- alteracoes de status, prazo e responsavel devem gerar historico quando o backend existir;
- funcionarios enxergam apenas seu escopo operacional;
- lideres devem operar e acompanhar seu departamento;
- managers devem ter visao global e acesso administrativo;
- a planilha deve continuar sendo o centro da operacao, mas listas resolvem foco, busca e execucao diaria.

## Rotas principais

| Rota                      | Tela                                             |
| ------------------------- | ------------------------------------------------ |
| `/`                       | Home operacional                                 |
| `/planilha`               | Planilha operacional                             |
| `/lista`                  | Lista filtravel por rotina ou empresa            |
| `/tarefas-fiscal`         | Todas as tarefas fiscais em lista                |
| `/minhas-tarefas`         | Tarefas atribuidas ao usuario, incluindo avulsas |
| `/perfil`                 | Perfil do usuario                                |
| `/dashboard-departamento` | Dashboard do lider                               |
| `/dashboard-geral`        | Dashboard do manager                             |
| `/rotinas`                | Cadastro/manutencao de rotinas                   |
| `/empresas`               | Cadastro/manutencao de empresas                  |
| `/funcionarios`           | Funcionarios                                     |
| `/cargos`                 | Cargos e permissoes                              |

## Estrutura esperada do projeto

```text
src/
|-- assets/                  # Arquivos estaticos
|-- components/
|   |-- home/                # Blocos operacionais e responsivos da Home
|   |-- common/              # Estados compartilhados: loading, erro, vazio
|   |-- forms/               # Shell, secoes e acoes de formularios
|   |-- routine-control/     # Componentes especificos da operacao de rotinas
|   |   |-- details/         # Cartoes/paineis de detalhe de task
|   |   |-- list/            # Cards, secoes e utilitarios da lista operacional
|   |   |-- shared/          # Campos e acoes reutilizaveis de task
|   |   `-- spreadsheet/     # Planilha empresas x rotinas
|   `-- ui/                  # Componentes primitivos de UI
|-- constants/               # Rotas, papeis, status e tokens
|-- contexts/                # Estado global da aplicacao
|-- hooks/                   # Hooks de competencia, listas e integracao
|-- layouts/                 # Sidebar, topbar, header e layout principal
|-- pages/                   # Telas roteadas
|-- services/                # Cliente HTTP e integracoes com a API
|-- styles/                  # CSS global e temas
`-- utils/                   # Regras puras e utilitarios testaveis
```

## Dados e integracao

A aplicação consome os dados por `services/`, usando a URL configurada em
`VITE_API_URL`. As telas operacionais são carregadas diretamente pelas rotas de
`screens` e suas projeções mensais; não há dados locais de demonstração.

Dados esperados:

- departamentos;
- empresas/clientes;
- rotinas;
- funcionários visíveis no escopo retornado pela API;
- telas operacionais e seus eixos;
- projeções mensais de cada tela;
- ocorrências recorrentes e metadados de competência.

## Testes

Executar todos os testes:

```bash
npm run test
```

Cobertura recomendada para o MVP:

- competencia;
- filtros de rotinas;
- montagem de itens de lista;
- permissoes por perfil;
- adaptação de telas e projeções mensais.

## Padroes de desenvolvimento

- Preferir componentes pequenos e especificos ao dominio.
- Manter regras puras em `utils/` quando puderem ser testadas sem React.
- Manter acesso a dados em `services/`.
- Reaproveitar o sistema de lista para tarefas fiscais, minhas tarefas e listas filtradas.
- Modelar telas e projeções conforme o contrato OpenAPI.
- Preservar a planilha como visualizacao macro e usar listas para execucao focada.

## Proximos passos tecnicos

- Persistir atualizações de status, prazo, responsável, comentários e links com ETag.
- Implementar dashboards simples e clicaveis para lider e manager.
- Implementar cadastros de rotinas, empresas, funcionarios e cargos.
- Adicionar lint, formatacao, CI e testes de componentes/fluxos.
