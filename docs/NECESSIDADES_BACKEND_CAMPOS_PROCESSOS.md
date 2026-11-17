# Processos — campos pendentes no backend

Investigação em 16/11/2026, comparando o frontend com o backend local em `../Gerenciador_de_Rotinas-backend/apps/processes/`. Este documento contém apenas os campos sem suporte ou com suporte incompleto nos tipos indicados. A implantação de produção não foi consultada.

## 1. Competências ainda não implementadas

Os três campos abaixo estão no frontend, mas não existem nos serializers nem na lista de campos permitidos por tipo do backend.

| Campo na interface                   | Propriedade JSON               | Tipos de processo em que deve ser aceito                                                                                            |
| ------------------------------------ | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| Competência de início da atividade   | `competenciaInicioAtividade`   | `abertura` (abertura de empresa), `mei` (transformação MEI → ME), `outro` (cliente de outro escritório), `reativacao` (reativação). |
| Competência de início da inatividade | `competenciaInicioInatividade` | `inativa` (inatividade com honorário reduzido).                                                                                     |
| Última competência de trabalho       | `ultimaCompetenciaTrabalho`    | `inatividade` (paralisação), `baixa`, `saida` e `exclusao`.                                                                         |

Competência significa mês e ano de referência do trabalho. A primeira identifica o início ou a retomada da atividade atendida; a segunda, o início da condição de inatividade; a terceira, o último mês de trabalho antes da paralisação ou desligamento.

### Formato e comportamento solicitados

- String `YYYY-MM`, por exemplo `"2026-11"`, com mês de `01` a `12`, ou `null`.
- Preenchimento opcional. Na criação, omissão ou `null` significam não informado. No PATCH, omissão preserva o valor e `null` limpa.
- Validar o campo conforme o tipo do processo. Rejeitar competência preenchida em tipo incompatível e formatos como `11/2026`, `2026-13` ou uma data com dia.
- Persistir em `Process.data` e devolver no detalhe e nas respostas de criação/edição, mantendo o formato de mês e ano.
- Disponibilizar aos leitores autorizados de Processos, inclusive Regularidade, como informação operacional.
- Manter compatibilidade com registros antigos sem competência. O registro dessas informações não deve alterar automaticamente prazos, status, etapas ou movimentações.

**Falha confirmada:** o backend rejeita os três campos como desconhecidos, inclusive quando recebem `null`. Como o frontend envia a competência aplicável mesmo vazia na criação, a incompatibilidade pode impedir a abertura do processo.

## 2. Data de cobrança sem suporte nos reajustes

| Campo na interface       | Propriedade JSON | Tipos que ainda não aceitam a data preenchida | Formato                                                   |
| ------------------------ | ---------------- | --------------------------------------------- | --------------------------------------------------------- |
| Data cobrança novo valor | `honCobranca`    | `aumento_honorarios` e `reducao_honorarios`   | Data `YYYY-MM-DD`, por exemplo `"2026-12-01"`, ou `null`. |

Esse campo informa quando começa a cobrança do novo valor. A propriedade já está declarada no serializer, mas falta permitir seu preenchimento nesses dois tipos em `services.validate_data()`.

**Falha confirmada:** uma data preenchida passa pelo serializer e é rejeitada pela regra de negócio com “Campo não se aplica a este tipo.”. O valor `null` é tolerado, mas a data preenchida não tem suporte.

### Complemento solicitado

- Aceitar, persistir e devolver `honCobranca` na criação e edição dos dois tipos indicados.
- Manter o preenchimento opcional: omissão no PATCH preserva; `null` limpa.
- Preservar sua classificação financeira: devolver somente para leitores com `viewFinancial`.
- Documentar se alterar apenas essa data em um reajuste concluído deve reabrir a tarefa do Financeiro; o contrato atual não define esse comportamento.

A orientação anterior em `docs/PROMPT_FRONTEND_PROCESSOS_HONORARIOS_CONTATO.md` do backend excluía esse campo dos reajustes. Portanto, este item solicita ampliar o suporte para atender ao formulário atual.

## 3. Integração e exemplos apenas dos campos pendentes

Usar os endpoints existentes de criação, edição e detalhe:

- `POST /api/v1/processes/`
- `PATCH /api/v1/processes/{id}/`
- `GET /api/v1/processes/{id}/`

Os exemplos abaixo são corpos de PATCH em processos existentes do tipo indicado. `version` é o controle de concorrência já exigido pela API; os números são ilustrativos.

Em uma abertura, transformação, entrada de outro escritório ou reativação:

```json
{
  "version": 3,
  "competenciaInicioAtividade": "2026-11"
}
```

Em uma inatividade com honorário reduzido (`inativa`):

```json
{
  "version": 3,
  "competenciaInicioInatividade": "2026-11"
}
```

Em uma paralisação (`inatividade`), baixa, saída ou exclusão:

```json
{
  "version": 3,
  "ultimaCompetenciaTrabalho": "2026-11"
}
```

Em um aumento ou redução de honorários:

```json
{
  "version": 3,
  "honCobranca": "2026-12-01"
}
```

## 4. Entrega esperada do backend

1. Declarar e validar as três competências em `apps/processes/api/serializers.py` e permitir cada uma nos tipos indicados em `apps/processes/services.py`.
2. Permitir `honCobranca` nos dois tipos de reajuste em `validate_data()`.
3. Persistir os valores, devolver nas respostas aplicáveis e auditar preenchimento, alteração e limpeza, respeitando as permissões descritas.
4. Atualizar o OpenAPI do backend, a cópia do frontend e a seção 17.4 de `ENDPOINTS.md` com esses complementos.
5. Testar criação, edição, consulta, omissão, limpeza com `null`, formatos inválidos, tipo incompatível e leitura conforme permissão.

As rejeições foram reproduzidas em memória com os serializers e a validação reais do backend local, sem acessar banco ou produção: 12 casos de competências e quatro casos de data de cobrança.

Referências do frontend: [distribuição dos campos por tipo](../src/components/processes/processFormUtils.ts), [formulário de competências](../src/components/processes/ProcessForm.tsx) e [campo de cobrança nos reajustes](../src/components/processes/ProcessFields.tsx).
