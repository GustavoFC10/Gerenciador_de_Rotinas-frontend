# Stripe: referências visuais inspecionadas

Pesquisa de 4 de novembro de 2026. As quatro imagens desta lista foram baixadas e abertas com `view_image`; as observações abaixo são visuais, não somente leitura de documentação. São capturas das respectivas fontes, não uma afirmação de que cada detalhe corresponde à versão atual do Dashboard.

## Fontes oficiais

### Editar cliente

- Página: https://docs.stripe.com/tax/invoicing/tax-ids
- Imagem: https://b.stripecdn.com/docs-statics-srv/assets/ids_update_customer.4a68e5df884bdad0b0ce78264850b107.png
- Arquivo: [stripe-editar-cliente-oficial.png](stripe-editar-cliente-oficial.png)

Observado: modal central sobre fundo esmaecido; título de tarefa separado do corpo por uma divisória; campos largos em uma coluna; rótulos acima; seções mais espaçadas que campos do mesmo grupo. Tipo e número do identificador fiscal aparecem na mesma linha porque formam um dado composto. Rodapé separado, com Cancel e Update customer alinhados à direita. A ação colorida é inequívoca. O modal usa a altura disponível sem comprimir tudo para caber.

Adaptação proposta: formulário central com largura suficiente, sequência vertical clara, nome/razão social em largura total; só código/CNPJ e e-mail/telefone em pares quando houver espaço; ação contextual no rodapé. Não copiar campos fiscais ou financeiros inexistentes no módulo.

### Edição de dados em página

- Página: https://docs.stripe.com/invoicing/invoice-edits
- Imagem: https://b.stripecdn.com/docs-statics-srv/assets/invoice-revisions-update-email-address.abc3f10a991006065c5132fc6e1ec704.png
- Arquivo: [stripe-editar-dados-oficial.png](stripe-editar-dados-oficial.png)

Observado: seção Customer com título legível, campos de nome/e-mail alinhados em coluna, instruções junto ao campo relevante, controle de idioma e link para detalhes adicionais. Cancel e Save customer ficam juntos no fim da seção. A outra coluna é uma preview de documento, portanto tem função concreta e não é um resumo que apenas repete o formulário.

Adaptação proposta: para uma edição mais extensa de Equipe, página ou superfície ampla com seções de dados e acessos. Evitar resumo lateral redundante ou colunas vazias. A disposição de preview de fatura não pertence ao escopo de Empresas/Equipe.

## Capturas reais secundárias, antigas

- [stripe-criar-cliente-real.png](stripe-criar-cliente-real.png): https://zenn.dev/yumainaura/articles/qiita-2020-02-14t08_09_10-09_00- — imagem original: https://user-images.githubusercontent.com/13635059/74381346-95fbf100-4e2e-11ea-8329-b329975d97d5.png
- [stripe-criar-cliente-modal.jpg](stripe-criar-cliente-modal.jpg): https://www.webkikaku.com/stripeflow.php — imagem: https://www.webkikaku.com/images/stripeflow_photo02.jpg

Também foram inspecionadas. Confirmam o histórico de criação em modal central, com labels acima, seções e ações no rodapé. A primeira é explicitamente de 2020; não serve para dizer como o Dashboard aparece hoje. A segunda não fornece data confiável. Use as fontes oficiais acima como referência principal.

## Limite da pesquisa HubSpot

A página oficial https://knowledge.hubspot.com/records/create-companies?is_listing=false confirma a criação em painel direito. A captura indexada em https://community.hubspot.com/t5/image/serverpage/image-id/110210i332749121A61AB76?v=v2 foi bloqueada por Cloudflare; não foi inspecionada. Nenhum arquivo HubSpot válido foi salvo.
