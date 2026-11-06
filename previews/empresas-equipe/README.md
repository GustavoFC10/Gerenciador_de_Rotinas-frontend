# Previews de Empresas e Equipe

Abra [comparativo.html](comparativo.html) para comparar as duas propostas e [index.html](index.html) para usar a preview interativa. Ambos funcionam diretamente no navegador, sem servidor, instalação ou API.

O [plano](PLANO.md) contém a pesquisa, diagnóstico, decisões de UX/visual, limites do contrato e a sequência sugerida para implementação. Ele foi registrado antes da criação das telas.

## Como explorar

- A barra superior do estudo alterna entre **A · Diretório**, recomendada, e **B · Lista e ficha**. Ela não faz parte da interface de produção proposta.
- Empresas e Equipe usam a mesma estrutura. Abra registros, busque, ordene e experimente o tema escuro pelo ícone da barra de estudo.
- Em Empresas, consulte a ficha, entre em edição ou crie um cadastro. O controle “Simular acesso de leitura” permite conferir a apresentação sem ações de escrita.
- Em Equipe, abra uma pessoa, vá a Acessos e clique em Editar acessos. Selecione setores diretamente; cargos descritivos ficam em Detalhes opcionais. Rotinas mantém os níveis atuais por departamento e administração explícita.
- Convidar pessoa reutiliza esse editor. O envio é simulado e acrescenta apenas um registro pendente à demonstração. Desativar também é apenas local.
- Campos alterados exigem confirmação para descartar. Busca e ordenação permanecem ao consultar/fechar fichas.
- Escape fecha a ficha, Tab percorre os controles, e `/` focaliza a busca quando não há modal aberto.

As alterações ficam somente na memória da aba e desaparecem ao recarregar. Dados, nomes, endereços e identificadores são fictícios. Nenhum e-mail é enviado. As regras de carregamento, erro remoto, conflito de versão e autorização definitiva estão especificadas no plano; não há servidor nesta simulação.

## Capturas

| Contexto            | Desktop                                  | Celular                                         |
| ------------------- | ---------------------------------------- | ----------------------------------------------- |
| Empresas A          | [Ver](images/empresas-a.png)             | [Ver](images/empresas-a-mobile.png)             |
| Equipe A            | [Ver](images/equipe-a.png)               | [Ver](images/equipe-a-mobile.png)               |
| Empresas B          | [Ver](images/empresas-b.png)             | [Ver](images/empresas-b-mobile.png)             |
| Equipe B            | [Ver](images/equipe-b.png)               | [Ver](images/equipe-b-mobile.png)               |
| Consulta de acessos | [Ver](images/equipe-acessos.png)         | [Ver](images/equipe-acessos-mobile.png)         |
| Seleção de setores  | [Ver](images/equipe-selecao-setores.png) | [Ver](images/equipe-selecao-setores-mobile.png) |
| Convite             | [Ver](images/convite.png)                | [Ver](images/convite-mobile.png)                |

## Verificação local

`capture.mjs` usa Edge headless com perfil temporário isolado e DevTools, sem acessar o perfil pessoal. Execute `node previews/empresas-equipe/capture.mjs` na raiz do repositório. Para outro executável Chromium, configure `UX_BROWSER_PATH`.

O script confere seis cenários em 1440, 1024, 768, 390 e 320 px; captura desktop/mobile e valida seleção de setores, detalhes opcionais, descarte, busca, leitura, links diretos e retorno de foco. O relatório fica em [images/qa-report.json](images/qa-report.json).

Os arquivos de produção, permissões e dependência atual de Rotinas não foram alterados nesta etapa.
