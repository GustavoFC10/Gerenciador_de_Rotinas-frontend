# Honorários — pendências funcionais após a atualização visual

16/11/2026. Conferência do HTML original, das prévias, do React e do backend local. Dashboard e projeção de empresas/clientes já foram integrados aos complementos recebidos. Ainda existem as diferenças abaixo; nem todas são limitações do backend.

Nesta rodada, a alteração no sistema se limita à retirada do seletor **Organização ativa** da barra lateral de Honorários. As demais ocorrências ficam registradas para definição e correção, respeitando a orientação de preservar o funcionamento central durante a atualização visual.

## Pendências identificadas

| ID   | Função e diferença observada                                                                                                                                                                                                                                         | Origem e situação                                                                                                                                                                                           |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| HF01 | **Compatibilidade da importação com o modelo original.** `data_contrato` não é reconhecido como data-base. Horas positivas não ativam `usarHoras` quando a flag não existe no arquivo, embora o importador do HTML fizesse isso. O arquivo pode ser aceito sem erro. | Omissão do parser React, reproduzida com dados demonstrativos. Não depende de novo endpoint. Preservar o valor de arquivos que já declaram a flag explicitamente ao definir a correção.                     |
| HF02 | **Comparação financeira durante a edição do perfil.** O formulário recebe os campos, mas não consulta o cálculo a cada alteração nem mostra a comparação atualizada do HTML. A consulta/composição existe na ficha salva.                                            | Omissão do frontend. O endpoint de cálculo já existe e é usado pelo orçamento.                                                                                                                              |
| HF03 | **Localizar perfis arquivados para restaurar.** A ficha tem Restaurar perfil, mas a nova lista apresenta empresas com perfil ativo ou sem perfil; não oferece acesso para localizar um perfil arquivado.                                                             | Lacuna de acesso na interface após F03. A API antiga de perfis aceita `archived=true`. Definir uma entrada sem presumir autorização para recolocar os filtros rejeitados na lista principal.                |
| HF04 | **Gerar orçamento de reajuste a partir do cliente.** O HTML preenche um orçamento com os dados da ficha. O React não oferece esse comando.                                                                                                                           | Fluxo não incorporado ao frontend. A API de criação existe; definir a continuidade do rascunho e os valores usados sem reproduzir regras financeiras no navegador.                                          |
| HF05 | **Recalcular uma proposta como outro orçamento.** Recalcular a partir desta, no HTML, prepara uma nova criação. No React, Criar nova revisão conserva a cadeia do orçamento original.                                                                                | São operações diferentes. Falta o atalho de cópia para novo número; o backend distingue criação e revisão.                                                                                                  |
| HF06 | **Colagem direta de planilha e XLS antigo.** O HTML permite colar linhas e aceita XLS. O React oferece upload CSV/XLSX e modelo CSV.                                                                                                                                 | Diferença do frontend e do leitor atual. Colagem não foi incorporada; XLS exige suporte real do leitor, não somente mudar o atributo accept.                                                                |
| HF07 | **Cadastrar empresa e retomar automaticamente o vínculo.** Há link para o cadastro geral, mas não uma jornada que volte ao orçamento/perfil com a empresa criada já selecionada.                                                                                     | Fluxo aprovado em direção geral, ainda incompleto. Conferir rascunho, permissões e falhas parciais; não presumir gravação atômica.                                                                          |
| HF08 | **Vincular uma proposta salva sem conversão ou revisão.** Há vínculo na criação/revisão e na conversão da proposta aceita. Não existe comando avulso na ficha salva.                                                                                                 | Depende da definição da operação e do contrato. O backend local não oferece ação específica; o snapshot é preservado. Vincular, converter e revisar têm efeitos diferentes.                                 |
| HF09 | **Usar horas só para análise de margem, mantendo o preço da tabela.** O HTML oferece `horas.metodo=tabela`; React e backend aceitam somente `maior` e `horas`.                                                                                                       | Limitação efetiva de backend, confirmada na validação de calculation.py. A terceira opção não pode ser salva antes do suporte no contrato/cálculo.                                                          |
| HF10 | **Retornar da proposta preservando a consulta.** Busca, página e filtros estão na URL da lista, mas o link de retorno usa somente `/honorarios/orcamentos`. O Voltar do navegador recupera a URL anterior.                                                           | Lacuna do frontend; preservar a consulta já foi apontado como prioridade. Clientes abre em janela e mantém seu estado local, portanto é um caso diferente.                                                  |
| HF11 | **Exportar com a mesma busca da lista.** A projeção nova busca nome, razão social, CNPJ e código. A exportação repassa q à API de perfis, cujo filtro local busca apenas nome/CNPJ.                                                                                  | Divergência de integração: busca por código ou razão social pode produzir outro conjunto no CSV. A exportação continua sendo somente de perfis, conforme o rótulo; ausência de perfil não é honorário zero. |

## Reprodução da incompatibilidade de importação

O parser React foi executado em memória com os parâmetros de referência e a linha demonstrativa abaixo, sem consultar ou gravar dados reais:

```text
nome;cnpj;inativa;segmento;regime;funcionarios;socios;xml;emite_nf;notas;faturamento;honorario_atual;data_contrato;horas;contato
Empresa de teste;12345678000190;nao;Comércio;Simples;4;2;220;sim;0;85000;690;15/10/2025;6;Contato de teste
```

Resultado: `errors=[]`, `adjustmentDate=null`, `profile.horas="6.00"`, `profile.usarHoras=false`. O HTML lê `data_contrato` e ativa horas quando a quantidade é positiva. Esta rodada não corrigiu o parser nem importou a linha em uma organização.

## Diferenças intencionais ou a esclarecer

- **Somente busca em Clientes:** os filtros adicionais foram retirados a pedido do usuário. HF03 não autoriza recolocá-los automaticamente.
- **Planos:** a oferta, os preços, o aceite com seleção e a proposta com planos existem. O controle fica indisponível quando o cálculo não retorna planos habilitados; a configuração de referência os desativa.
- **Exclusão:** o HTML exclui; a integração arquiva/restaura com versão. Não trocar por exclusão definitiva nesta atualização.
- **Identidade central:** nome/CNPJ da empresa vêm do catálogo geral, conforme a orientação recebida.
- **PDF/WhatsApp:** download HTML, impressão/salvamento PDF e cópia de mensagem existem. Envio automático e geração de PDF no backend não fazem parte do contrato.
- **Copiar mensagem:** o HTML marca rascunho como enviado ao copiar; o React usa um comando explícito separado. Esclarecer essa diferença na revisão funcional; não foi alterada aqui.
- **Empresa inativa:** o React oculta DP/Fiscal/Filiais, mas ainda apresenta horas/exceções que o cálculo de inativa não utiliza. É uma divergência de apresentação condicional, sem necessidade de alterar o cálculo.

## Código residual não contado como função perdida

O HTML contém funções de Cálculo rápido e referência de mercado por capital, mas a conferência não encontrou controles ativos que as abram na composição atual do próprio HTML. `mercadoCardHTML` aparece somente na declaração; rapido aparece no despacho de modal/ação sem controle de abertura. Código residual, sozinho, não comprova perda de uma função operável.

## Fontes e alcance

- [HTML original](<../honorarios_base/honorarios-jaralcon%20(1).html>): modalCliente, modalProposta, modalImportar, pricingFields, importação e ações cli-orc/orc-duplicar.
- React: [Clientes](../../src/components/honorarios/HonorariosClients.tsx), [Orçamentos](../../src/components/honorarios/HonorariosQuotes.tsx), [campos/seletores](../../src/components/honorarios/HonorariosShared.tsx), [parser](../../src/utils/honorariosImport.ts), [parâmetros](../../src/components/honorarios/HonorariosParameterSections.tsx) e [serviço](../../src/services/honorariosService.ts).
- Backend local em `Gerenciador_de_Rotinas-backend/apps/honorarios/`: calculation.py, views.py e services.py, consultados somente para leitura.
- A retirada do seletor passou pelos cinco testes de HonorariosLayout, incluindo contexto com várias organizações, além de ESLint e TypeScript. Não foi executada a bateria completa nem uma sessão autenticada de produção.
