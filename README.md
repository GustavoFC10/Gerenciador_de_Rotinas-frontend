# Gerenciador de Rotinas — Frontend

Estrutura inicial do frontend para o sistema de controle de rotinas contábeis.

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

O projeto possui um `vercel.json` configurado para Vite, com saída em `dist` e
rewrite para `index.html`, garantindo que rotas do React funcionem no deploy.

## Estrutura

```text
src/
├── assets/          # Imagens, ícones e outros arquivos estáticos
├── components/
│   ├── common/      # Componentes compartilhados
│   └── routines/    # Tabela e cards de rotinas
├── constants/       # Estados e configurações compartilhadas
├── hooks/           # Hooks customizados
├── layouts/         # Estruturas de layout
├── mocks/           # Respostas fictícias no formato da futura API
├── pages/           # Páginas da aplicação
├── services/        # Comunicação com APIs e serviços externos
├── styles/          # Estilos globais
└── utils/           # Funções utilitárias
```

## Componentes iniciais de rotina

- `RoutineControlTable`: tabela configurável por departamento ou visão geral.
- `RoutineClosedCard`: ponto minimalista usado pelo departamento Fiscal.
- `RoutineClosedCardCompact`: etiqueta compacta usada pelo Contábil.
- `RoutineClosedCardCell`: célula colorida usada pelo Departamento Pessoal.
- `RoutineNotApplicableCard`: placeholder não clicável para células sem rotina.
- `RoutineDetailsCard`, `RoutineDetailsCardCompact` e
  `RoutineDetailsCardPanel`: três modelos abertos correspondentes.
- `RoutineStatusSelect`: controle compartilhado para alteração do estado.
- `RoutineCardActions`: observação, anexo, aviso e ação principal para concluir.

O padrão visual dos estados é: pendente em branco, em andamento em amarelo,
erro em vermelho e concluído em verde.

Os dados fictícios ficam separados da interface e são acessados por
`routineControlService`. Quando a API REST estiver disponível, o mock poderá ser
substituído por uma chamada HTTP sem alterar as propriedades dos componentes.
