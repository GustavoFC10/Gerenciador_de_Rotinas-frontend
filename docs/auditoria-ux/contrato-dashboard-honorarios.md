# Contrato confirmado do dashboard de Honorários

16/11/2026. Complemento de `GET /api/v1/honorarios/dashboard/`, conforme implementação e esclarecimentos enviados pelo backend no chat. Substitui a proposta inicial de um campo separado `clients.opportunities` e de uma lista de regimes.

## Formato confirmado

O exemplo mostra somente os trechos novos/estendidos de `data.clients`; o envelope, os agregados gerais e os outros campos do plano continuam existentes.

```json
{
  "clients": {
    "byRegime": {
      "simples": {
        "count": 1,
        "current": "300.00",
        "byParameters": "450.00"
      }
    },
    "adjustmentPlan": {
      "entries": [
        {
          "clientId": "id-do-perfil",
          "companyId": "id-da-empresa",
          "companyName": "Empresa Exemplo",
          "currentFee": "300.00",
          "parameterFee": "450.00",
          "current": "300.00",
          "proposed": "330.00",
          "gain": "30.00",
          "full": false
        }
      ]
    }
  }
}
```

## Oportunidades e simulação

- A identidade e os valores integrais de cada oportunidade vêm de `clients.adjustmentPlan.entries`. Não existe dependência de `clients.opportunities`.
- `clientId` identifica o perfil financeiro a abrir em Honorários; `companyId` identifica a empresa central. `companyName` é o nome exibido tanto no gráfico quanto na tabela da simulação.
- A barra de oportunidade representa `parameterFee − currentFee`, limitada visualmente a diferenças positivas. É uma comparação dos valores recebidos, sem recalcular o honorário.
- `current`, `proposed`, `gain` e `full` continuam sendo os resultados autoritativos da simulação. O gráfico principal não usa `gain` como se fosse o potencial integral.
- **Cobertura confirmada:** o backend retorna todos os perfis abaixo do parâmetro mesmo com `maxIncreasePct=0` e ganho zero. Assim, simular 0% não remove as oportunidades do painel.
- O frontend ordena as oportunidades por diferença integral decrescente, desempata por nome e ID e mostra até oito. Os indicadores gerais continuam usando os agregados do servidor, nunca a soma das oito linhas.

## Comparativo por regime

- `clients.byRegime` é um objeto com chaves `mei`, `simples`, `presumido` e `real`, não uma lista de itens com propriedade `regime`.
- Cada regime informado contém `count`, `current` e `byParameters`. Valores monetários permanecem strings decimais.
- O exemplo confirmado pode omitir regimes sem dados; a interface mantém os quatro rótulos e apresenta esses grupos com valores zero. Ausência do objeto completo continua sendo tratada como comparativo indisponível, não como carteira zerada.
- Os valores recebidos dimensionam as barras de Cobrado hoje e Valor pelos parâmetros. A API continua responsável pelo agrupamento de toda a carteira autorizada.

## Integração e verificação

Tipos, validação do serviço e dashboard foram adaptados a esse formato. Foram preservados endpoint, permissões, parâmetros da consulta e regras de cálculo. Não há junção de páginas de clientes ou consultas individuais para reconstruir o painel.

Os testes direcionados cobrem o objeto de regimes, os valores monetários, a distinção entre IDs, a diferença integral versus ganho simulado e a preservação das oportunidades na simulação de 0%. As verificações locais usam respostas demonstrativas do contrato; não representam uma execução autenticada contra produção.
