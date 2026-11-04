# Previews de ajustes de UX — Processos

Os ajustes aprovados foram aplicados aos componentes da aplicação. Estas páginas HTML preservam os exemplos interativos para revisão com a equipe contábil; seus dados são fictícios, sem importação do `dados-atuais.json`, persistência ou envio de e-mail.

## Conferir a implementação

Use `npm run preview:features` e abra a origem local informada pelo Vite (normalmente `http://127.0.0.1:4174`). Visite `/processos/lista` e `/processos/avisos`. Esse preview carrega os componentes reais com respostas de API simuladas e exemplos de avisos, pessoas e cobranças. Em sessões demonstrativas antigas, “Reiniciar demonstração” recarrega os novos exemplos.

O seletor é um único campo com opções de pessoas cadastradas, departamentos e “Todos com acesso a Processos”. Os três departamentos abrangem toda a seleção elegível, inclusive outras páginas, e o preparo confere a união sem repetir pessoas.

## Abrir

Abra [index.html](index.html) no navegador. O link no topo leva à [prévia de destinatários](recipients.html). Não precisa instalar dependências nem informar credenciais.

Mantenha a pasta dentro do repositório: a lista reutiliza os tokens de `src/styles/themes.css`. Os scripts são clássicos e relativos, para funcionar também por `file://`.

Se preferir o servidor já existente do projeto, execute `npm run dev` e acesse `/previews/processos-ux/index.html` na origem local que o Vite informar. Os previews são arquivos separados; não fazem parte das rotas da aplicação.

## O que experimentar

| Prévia          | Interações                                                                                                                                                                                                                   |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lista e filtros | Menu por situação, busca, tipo, setor, mês, checklist de situações, chips removíveis, limpeza contextual, paginação, abrir/fechar uma ficha, ponto único de criação fictícia, perfis, tema e estados da consulta.            |
| Destinatários   | Selecionar aviso, setores e membros; busca; deduplicação da união; preparar/copiar; mudar seleção; confirmar envio externo e declarar na simulação; consultar histórico, estado vazio, erro, carregamento e acesso restrito. |

Os controles “Simular” e “Conferir comportamento” são ferramentas de revisão do protótipo, não propostas para telas de produção.

## Limites

Na aplicação real, listas, contadores, paginação, permissões e destinatários efetivos vêm do servidor. As amostras locais só demonstram a apresentação; não implementam o motor temporal ou as regras completas do processo.

“Novo processo” abre uma pequena demonstração do ponto de entrada. O formulário contábil completo existente permanece como referência para a implementação real. Na prévia de avisos, a confirmação/fallback de cópia manual facilita abrir arquivos locais; isso não modifica o contrato de preparação/cópia da aplicação.

O plano com diagnóstico, fontes reais, prioridades e critérios de aceite está em [PLANO_UX_PROCESSOS.md](../../PLANO_UX_PROCESSOS.md).

## Capturas e verificação realizada

Capturas da aplicação implementada:

- Lista: [desktop](images/app-lista-desktop.png), [filtros abertos](images/app-lista-filtros.png), [celular](images/app-lista-mobile.png) e [tema escuro](images/app-lista-escura.png).
- Seletor unificado de destinatários: [desktop](images/app-destinatarios-desktop.png) e [celular](images/app-destinatarios-mobile.png).

Foram conferidos dez layouts da aplicação em Edge real, de 320 a 1440px, sem overflow horizontal. As verificações incluem campo de destinatários aberto sem recorte, “Todos”, cinco destinatários efetivos sem duplicação, preparo separado da declaração, busca que preserva foco e espaços e campos compactos. Isso usa apenas o backend demonstrativo local, sem dados reais ou envio de e-mail.

Capturas dos exemplos HTML isolados:

- Lista: [desktop](images/lista-desktop.png), [filtros e situações expandidos](images/lista-filtros.png), [celular](images/lista-mobile.png) e [tema escuro](images/lista-escura.png).
- Destinatários: [desktop](images/destinatarios-desktop.png) e [celular após abrir o aviso](images/destinatarios-mobile.png).

Os exemplos HTML também têm verificação de comportamento em DOM e nove combinações de tela/largura no Microsoft Edge real: lista em 1440, 1024, 768, 390 e 320px; destinatários em 1440, 768, 390 e 320px. Não houve overflow horizontal da página nessas combinações. Os campos da faixa de filtros mediram 40–44px de altura.

Os cenários cobrem busca, contagens com escopos distintos, limpeza contextual, situações personalizadas, paginação, erro, perfis, tema, escape de texto, seleção/deduplicação, invalidação de preparação, membro revogado e histórico. Isso verifica os protótipos, sem substituir testes com a API real, zoom, leitor de tela ou a conferência da equipe contábil.

Para repetir com as dependências locais já instaladas:

```text
node previews/processos-ux/verify.mjs
node previews/processos-ux/capture.mjs
```

O segundo comando usa o Edge instalado no caminho padrão do Windows, com perfil temporário exclusivo, e encerra o navegador ao terminar. Outro Chromium pode ser indicado em `UX_BROWSER_PATH`. As capturas ficam em `images/`.

Para conferir a aplicação com o servidor demonstrativo já iniciado, informe sua origem em `UX_APP_URL` ao executar `capture.mjs`. Por exemplo, no PowerShell:

```powershell
$env:UX_APP_URL = 'http://127.0.0.1:4174'
node previews/processos-ux/capture.mjs
```

Essa opção aceita apenas localhost e exige a identificação do preview, para não executar ações sobre um tenant publicado.
