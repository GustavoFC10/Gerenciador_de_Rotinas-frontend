# Empresas — opções visuais para aprovação

Estudo visual de 29/10/2026. O módulo backend ainda está em planejamento.
Este trabalho prepara a escolha do estilo; não ativa `companies`, permissões,
rotas da aplicação ou endpoints propostos.

Abra `comparativo.html` para comparar as capturas ou `index.html` para explorar
as três alternativas. O `index.html` é um arquivo autossuficiente: abre direto no
navegador, sem servidor, instalação ou conexão à API.

| Opção                   | Organização                                | Ficha            |
| ----------------------- | ------------------------------------------ | ---------------- |
| 01 · Catálogo essencial | Navegação horizontal e tabela centralizada | Página própria   |
| 02 · Área de trabalho   | Menu lateral, resumo e catálogo            | Painel lateral   |
| 03 · Lista e ficha      | Navegação compacta e lista de seleção      | Ao lado da lista |

Todas usam os tokens de `themes.css`, a tipografia existente e os componentes
`Button`, `Card`, `Badge`, `TextField`, `Select`, `CatalogSearchField`,
`ProcessIcon` e `useOverlayDialog`. Existem exemplos com CNPJ numérico,
alfanumérico, sem CNPJ e sem código do Domínio, sem inventar situação cadastral.

São interativos: escolha de layout, temas, busca, ordenação, filtros de situação,
paginação, ficha, contatos, histórico e abertura dos formulários demonstrativos.
Os botões de confirmação apenas encerram a simulação com um aviso, sem gravar
cadastros. Não há armazenamento empresarial local, motor de permissões, consulta
operacional, autenticação ou comunicação com o backend.

## Desenvolvimento

Fonte isolada em `src/preview/companies`. A entrada normal da aplicação e o preview
anterior de funcionalidades permanecem separados.

```powershell
npm run preview:companies
# http://127.0.0.1:4175

npm run build:preview:companies
# Gera previews/empresas/index.html com CSS e JavaScript embutidos.
```

As capturas foram geradas no Edge headless a partir do arquivo local. A conferência
incluiu os três layouts, claro/escuro, viewport mobile de 390 px sem vazamento
horizontal da página, paginação, busca alfanumérica, ficha, contatos, histórico,
formulário e retorno ao catálogo. Nenhuma chamada HTTP ou exceção da aplicação
ocorreu nessa navegação offline. Há rolagem horizontal interna na tabela mobile.

O próximo passo é a escolha do layout. A implementação do módulo e a integração
ficam para a etapa seguinte, com conferência do OpenAPI entregue pelo backend.
