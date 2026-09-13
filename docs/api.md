# Contrato HTTP

Base: `/api`. JSON em UTF-8. Datas/horários de resposta em ISO 8601 UTC; dinheiro em **centavos inteiros**. Quantidades são números com até três casas decimais.

## Autenticação

```http
POST /api/auth/login
Content-Type: application/json
X-Diner-Client: web

{"email":"admin@diner.local","senha":"SENHA_CONFIGURADA"}
```

Resposta `200`: `{ "id": "uuid", "nome": "Administrador", "email": "admin@diner.local" }`, com cookie `diner_session`. Mantenha o cookie nas chamadas seguintes. A API não retorna hash de senha nem token no JSON. Em produção o cookie usa `Secure` e exige HTTPS. `GET /auth/me` retorna o usuário atual. `POST /auth/logout` apaga a sessão e retorna `204`.

Todas as mutações autenticadas, incluindo login/logout, exigem `X-Diner-Client: web`. Clientes de navegador devem estar na mesma origem; não há CORS aberto. O webhook usa assinatura própria e não usa sessão. Todas as rotas abaixo, exceto login, logout, health e webhook, exigem login.

## Rotas

| Método | Rota                                         | Entrada                             | Resposta                                                  |
| ------ | -------------------------------------------- | ----------------------------------- | --------------------------------------------------------- |
| GET    | `/health`                                    | —                                   | `200 {status, mode}`; consulta banco                      |
| GET    | `/config`                                    | —                                   | Fuso, modo demo, configuração iFood sem segredos          |
| GET    | `/produtos`                                  | —                                   | Array de produtos, inclusive inativos                     |
| POST   | `/produtos`                                  | Produto                             | `201` produto salvo                                       |
| PUT    | `/produtos/:id`                              | Produto completo                    | `200` produto salvo                                       |
| GET    | `/pedidos`                                   | Filtros abaixo                      | Página de pedidos                                         |
| GET    | `/pedidos/:id`                               | UUID                                | Pedido com itens e pagamentos                             |
| POST   | `/pedidos`                                   | Novo pedido                         | `201` pedido criado                                       |
| PATCH  | `/pedidos/:id/status`                        | `{status, motivo?}`                 | Pedido atualizado                                         |
| POST   | `/pedidos/:id/pagamentos`                    | Pagamento + Idempotency-Key         | `201` pagamento registrado ou previamente registrado      |
| GET    | `/caixa/atual`                               | —                                   | Resumo de caixa ou `null`                                 |
| GET    | `/caixas`                                    | —                                   | Últimas 50 sessões                                        |
| GET    | `/caixas/:id`                                | UUID                                | Resumo da sessão                                          |
| POST   | `/caixas`                                    | `{valorInicialCentavos}`            | `201` sessão aberta                                       |
| POST   | `/caixas/:id/fechar`                         | `{valorFinalCentavos, observacao?}` | Caixa fechado e diferença                                 |
| POST   | `/caixa/movimentos`                          | `{tipo, valorCentavos, motivo}`     | `201` movimento                                           |
| POST   | `/despesas`                                  | Despesa                             | `201` despesa registrada                                  |
| GET    | `/relatorios`                                | Período abaixo                      | Relatório consolidado                                     |
| GET    | `/relatorios/exportar`                       | Mesmo período                       | CSV diário em BRL, separado por `;`                       |
| POST   | `/webhooks/ifood`                            | Evento ou array + assinatura        | `202 {recebidos, duplicados, ignorados}`                  |
| GET    | `/integracoes/ifood/eventos`                 | —                                   | Últimos 100 eventos, sem payload bruto nem token de lease |
| POST   | `/integracoes/ifood/eventos/:id/reprocessar` | UUID                                | `202 {reprocessamentoAgendado:true}`                      |

### Produto

```json
{
  "nome": "Hambúrguer da casa",
  "categoria": "Lanches",
  "precoCentavos": 2890,
  "custoCentavos": 1120,
  "codigoExterno": "DINER-01",
  "ativo": true
}
```

Nome: 2–120 caracteres; categoria: 1–60; código externo: até 120, opcional, único. Preço estritamente positivo, custo não negativo. Desativação é feita por `PUT` com `ativo:false`; não há exclusão física de produto.

### Novo pedido

```json
{
  "origem": "comanda",
  "mesa": "05",
  "clienteNome": "Ana",
  "clienteContato": "(92) 99999-0000",
  "observacao": "Cliente está com pressa",
  "descontoCentavos": 100,
  "acrescimoCentavos": 0,
  "taxasCentavos": 0,
  "itens": [{ "produtoId": "UUID_DO_PRODUTO", "quantidade": 2, "observacao": "Sem cebola" }]
}
```

Origem manual: `comanda` ou `caixa`. Origem `ifood` é reservada à integração. Mesa obrigatória para comanda. Pedido aceita 1–100 linhas. A API consulta os produtos, verifica disponibilidade, copia nome/preço/custo e calcula totais. Campos extras, como `totalCentavos` fornecido pelo cliente, são rejeitados. Desconto não pode superar o subtotal.

Resposta inclui `id` (UUID), `numero` sequencial, `origem`, `status`, campos opcionais de cliente, totais, timestamps, `itens` e `pagamentos`. Números sequenciais podem ter lacunas decorrentes de transações revertidas no MySQL.

### Filtros e paginação

```text
GET /api/pedidos?origem=comanda&status=ativos&busca=Ana&data=2026-09-12&page=1&limit=15
```

- `origem`: `comanda`, `ifood`, `caixa`.
- `status`: `recebido`, `preparando`, `pronto`, `concluido`, `cancelado` ou `ativos` (os três primeiros).
- `busca`: parte do cliente/mesa ou número exato do pedido.
- `data`: data de **criação**, `AAAA-MM-DD`, no fuso da loja.
- `page`: inteiro positivo, padrão 1; `limit`: 1–100, padrão 30.
- Ordenação: número do pedido decrescente.

Resposta: `{ "data": [...], "total": 42, "page": 1, "limit": 15 }`.

### Pagamentos

```http
POST /api/pedidos/UUID/pagamentos
Content-Type: application/json
X-Diner-Client: web
Idempotency-Key: 71f537ef-d392-4a4f-b4b8-91b0385b656c

{"forma":"pix","valorCentavos":5680}
```

Formas manuais: `dinheiro`, `pix`, `credito`, `debito`, `vale`. `ifood_online` é reservado à integração. É necessário caixa aberto, valor positivo e saldo suficiente. Informe o **valor líquido**, sem incluir dinheiro que será devolvido como troco. Divida pagamentos em chamadas com chaves distintas.

`Idempotency-Key`: 8–80 caracteres alfanuméricos, `_` ou `-`. Repita a mesma chave em uma tentativa de recuperação da mesma operação. Reutilizar chave com outro pedido, forma ou valor gera `409`. A mesma chave continua apontando ao registro original mesmo após estorno; uma nova cobrança exige chave nova.

### Status e cancelamento

```json
{ "status": "preparando" }
```

Fluxo manual: `recebido` → `preparando` → `pronto` → `concluido`. Alterar para o mesmo status é idempotente. Não é permitido pular etapas. Concluir exige saldo zero.

```json
{ "status": "cancelado", "motivo": "Cliente desistiu" }
```

Cancelamento exige motivo de 3–300 caracteres, estorna todos os pagamentos confirmados e não reabre pedido cancelado. Pagamento em sessão já fechada bloqueia cancelamento. Pedidos iFood não aceitam mudança manual de status nesta API.

### Caixa e despesas

Movimentação: `tipo` é `sangria` ou `suprimento`, valor positivo, motivo de 3–300 caracteres. Sangria não pode superar dinheiro esperado. A abertura usa restrição única para impedir duas sessões simultâneas.

Resumo de caixa inclui `porForma`, `movimentos`, `suprimentosCentavos`, `sangriasCentavos`, `esperadoCentavos` e os dados da sessão. No fechamento são persistidos valor final, esperado, diferença e timestamp. Diferença positiva indica sobra; negativa, falta.

```json
{
  "descricao": "Embalagens de delivery",
  "categoria": "Operacional",
  "valorCentavos": 4200,
  "ocorridoEm": "2026-09-12T12:00:00-04:00"
}
```

Descrição da despesa: 3–200 caracteres; categoria: 1–60; timestamp com offset obrigatório. O lançamento não movimenta a gaveta automaticamente.

### Relatórios

```text
GET /api/relatorios?tipo=diario&data=2026-09-12
GET /api/relatorios?tipo=semanal&data=2026-09-12
GET /api/relatorios?tipo=mensal&data=2026-09-12
GET /api/relatorios?tipo=personalizado&inicio=2026-09-01&fim=2026-09-12
```

Padrão: relatório diário do dia atual no fuso da loja. O campo `data` identifica o dia, semana ou mês desejado. Intervalo personalizado tem data final inclusiva, máximo de 366 dias. Datas inexistentes são recusadas.

Resposta inclui:

```text
periodo {tipo, inicio, fim, timezone}
receitaCentavos, custoItensCentavos, taxasCentavos, despesasCentavos, lucroCentavos
pedidos, ticketMedioCentavos, margemPercentual, aReceberCentavos
porOrigem [{origem, pedidos, receitaCentavos}]
serie [{data, receitaCentavos, custosCentavos, lucroCentavos, pedidos}]
itens [{produtoId, nome, quantidade, receitaBrutaCentavos, custoCentavos}]
despesas [{id, descricao, categoria, valorCentavos, ocorridoEm, criadoEm}]
```

`margemPercentual` é número percentual, não centavos. Receita bruta por item não rateia descontos do pedido. Série inclui dias sem venda com zero. CSV contém dados diários, sem campos livres fornecidos por usuários.

## Erros

```json
{
  "error": {
    "code": "DADOS_INVALIDOS",
    "message": "Revise os dados informados.",
    "details": [{ "campo": "itens.0.quantidade", "mensagem": "..." }]
  }
}
```

- `400`: contrato inválido, UUID/formato de data inválido ou JSON malformado.
- `401`: sessão ausente/vencida, credencial incorreta ou assinatura inválida.
- `403`: cabeçalho de proteção ausente.
- `404`: rota/registro inexistente.
- `409`: conflito de concorrência, chave única, caixa já aberto ou evento indisponível para reprocessamento.
- `413`: corpo excede o limite.
- `422`: regra de negócio (saldo, transição, data inexistente, produto indisponível).
- `429`: excesso de tentativas de login.
- `503`: webhook sem configuração de estabelecimento/secret.
- `500`: falha inesperada com mensagem genérica e `requestId`, sem credenciais, stack ou resposta sensível externa.
