# Gerenciador de Rotinas - Frontend

Estrutura inicial do frontend para o sistema de controle de rotinas contabeis.

## Tecnologias

- React
- Vite
- Tailwind CSS

## Executando o projeto

```bash
npm install
npm run dev
```

## Build e deploy na Vercel

```bash
npm run build
```

O projeto possui um `vercel.json` configurado para Vite, com saida em `dist` e
rewrite para `index.html`, garantindo que rotas do React funcionem no deploy.

## Estrutura

```text
src/
|-- assets/          # Imagens, icones e outros arquivos estaticos
|-- components/
|   |-- common/      # Componentes compartilhados globais
|   `-- routine-control/
|       |-- details/     # Cartoes e paineis abertos da task
|       |-- list/        # Visualizacao em lista agrupada por status
|       |-- shared/      # Campos, status e acoes reutilizaveis
|       `-- spreadsheet/ # Visualizacao em planilha/matriz
|-- constants/       # Estados e configuracoes compartilhadas
|-- hooks/           # Hooks customizados
|-- layouts/         # Estruturas de layout
|-- mocks/           # Respostas ficticias no formato da futura API
|-- pages/           # Paginas da aplicacao
|-- services/        # Comunicacao com APIs e servicos externos
|-- styles/          # Estilos globais
`-- utils/           # Funcoes utilitarias
```

## Componentes iniciais de controle de rotina

- `spreadsheet/RoutineControlTable`: tabela configuravel por departamento ou visao geral.
- `spreadsheet/RoutineClosedCard`: ponto minimalista usado pelo departamento Fiscal.
- `spreadsheet/RoutineClosedCardCompact`: etiqueta compacta usada pelo Contabil.
- `spreadsheet/RoutineClosedCardCell`: celula colorida usada pelo Departamento Pessoal.
- `spreadsheet/RoutineNotApplicableCard`: placeholder nao clicavel para celulas sem rotina.
- `details/RoutineDetailsCard`, `details/RoutineDetailsCardCompact` e
  `details/RoutineDetailsCardPanel`: tres modelos abertos correspondentes.
- `shared/RoutineStatusSelect`: controle compartilhado para alteracao do estado.
- `shared/RoutineCardActions`: observacao, anexo e acao principal para concluir.

O padrao visual dos estados e: pendente em branco, em andamento em amarelo,
erro em vermelho e concluido em verde.

Os dados ficticios ficam separados da interface e sao acessados por
`routineControlService`. Quando a API REST estiver disponivel, o mock podera ser
substituido por uma chamada HTTP sem alterar as propriedades dos componentes.
