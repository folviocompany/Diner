# Integração iFood

## Configuração

1. No iFood Developer Portal, obtenha as credenciais de uma aplicação com autenticação centralizada e habilitação do módulo de pedidos.
2. Preencha no servidor `IFOOD_CLIENT_ID`, `IFOOD_CLIENT_SECRET`, `IFOOD_MERCHANT_ID` e `IFOOD_COMISSAO_BPS` conforme o contrato. `1200` corresponde a 12%; zero significa que nenhuma comissão estimada será descontada.
3. Em **Produtos**, associe `codigoExterno` ao `externalCode`/código PDV dos itens do catálogo iFood. Se não houver `externalCode`, use o `id` do item no catálogo. Códigos são únicos.
4. Configure no portal o webhook `https://SEU-DOMINIO/api/webhooks/ifood`. A aplicação precisa estar acessível por HTTPS. Use controle de presença por aplicativo; heartbeat vazio assinado recebe `202`.
5. Use os pedidos de teste do portal para verificar o ciclo completo antes de habilitar a operação real.

Não foram fornecidas credenciais reais neste trabalho. Os testes locais verificam contrato, assinatura, API simulada e persistência MySQL; não substituem a homologação do iFood.

## Recebimento e recuperação

- A assinatura hexadecimal `X-IFood-Signature` é calculada com HMAC-SHA256 do **corpo bruto**, usando `client_secret`. A comparação é constante no tempo e ocorre antes de interpretar o JSON.
- Aceita evento individual ou lista com até 100 eventos; rejeita corpo acima de 1 MB. Preserva campos adicionais no JSON armazenado.
- O identificador do evento é chave primária. Reentregas não duplicam o processamento; eventos de outro estabelecimento são ignorados.
- O HTTP apenas persiste a fila e responde `202`. O worker obtém token OAuth e detalhes do pedido fora da transação de escrita.
- A tabela `EventoIfood` é a fila durável: lease de 60 segundos, token único por tentativa e atualização do pedido na mesma transação que finaliza o evento. Reiniciar o processo não perde trabalho persistido.
- Falhas voltam à fila com espera exponencial (máximo de cinco minutos). Após oito tentativas, ficam em `falhou` e podem ser reenviadas na tela **Integrações**. Eventos com catálogo sem vínculo devem ser reprocessados após o cadastro do código.
- Eventos desconhecidos ficam `ignorado`. Eventos mais antigos não regridem um pedido. Um evento de conclusão recebido antes da criação consulta os detalhes e cria o pedido já concluído.
- O timestamp externo controla a ordenação; terminal cancelado não é reaberto. Falha no processamento reverte todas as alterações de pedido e pagamento.

O consumidor não implementa polling de reconciliação nem comandos de aceite/despacho na plataforma. Em indisponibilidade prolongada, reconcilie os pedidos no Gestor iFood. Esses recursos podem ser adicionados pelo contrato do gateway.

## Mapeamento de status

| Código / fullCode     | Status interno |
| --------------------- | -------------- |
| PLC / PLACED          | recebido       |
| CFM / CONFIRMED       | preparando     |
| RTP / READY_TO_PICKUP | pronto         |
| DSP / DISPATCHED      | pronto         |
| CON / CONCLUDED       | concluido      |
| CAN / CANCELLED       | cancelado      |

## Valores e resultado

- `totalCentavos`: valor cobrado do cliente, vindo de `total.orderAmount`.
- Subtotal de cada linha: `items[].totalPrice`, que já inclui o preço das opções.
- Custo: cadastro local do produto por unidade, copiado para o item. O cadastro deve refletir o custo da unidade comercializada. Não há decomposição de ficha técnica/opções em ingredientes.
- Sem produto/custo vinculado, o evento falha com instrução para mapear o catálogo. Não é criado custo zero automaticamente.
- `receitaCentavos`: subtotal dos produtos menos descontos patrocinados pelo **MERCHANT**, somado à entrega quando `delivery.deliveredBy` é `MERCHANT`. Subsídio iFood não é tratado como perda da loja. Taxas adicionais da plataforma não entram na receita da loja.
- Comissão: estimativa `receitaCentavos × IFOOD_COMISSAO_BPS / 10000`, arredondada para centavos. Não é conciliação do repasse bancário.
- Métodos `ONLINE` ou `prepaid=true` entram como `ifood_online`, sem afetar caixa físico. Pagamentos offline ficam pendentes para recebimento manual pela equipe.
- O total dos pagamentos online não pode superar o cobrado. Itens fracionários são aceitos com até três casas decimais. Inconsistências entre soma de itens e subtotal vão para reprocessamento.

## Fontes oficiais consultadas

- [Assinatura de webhook](https://developer.ifood.com.br/pt-BR/docs/guides/modules/events/webhook-signature)
- [Visão geral e entrega dos eventos](https://developer.ifood.com.br/en-US/docs/food/guides/modules/events/webhook-overview)
- [Autenticação centralizada](https://developer.ifood.com.br/en-US/docs/food/guides/modules/authentication/centralized)
- [Detalhes de pedidos e valores](https://developer.ifood.com.br/en-US/docs/guides/modules/order/details)

A implementação usa esses contratos como referência; a integração deve ser validada com as permissões e modalidades habilitadas para a conta do lojista.
