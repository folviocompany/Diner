# Prompt de Arquitetura — Sistema de Gestão de Loja (Backend)

> Documento de referência para iniciar o desenvolvimento do backend. Use este arquivo como prompt/briefing para guiar implementação (própria, de outros devs, ou de uma IA assistente de código).

---

## 1. Contexto do Projeto

Sistema de gestão para uma loja física que também vende via delivery. Precisa unificar pedidos vindos de **3 origens diferentes** e fornecer visão financeira e operacional consolidada.

**Origens de pedido:**
- Comanda (atendimento presencial em mesa)
- iFood (integração via API/webhook)
- Caixa (venda direta no balcão)

**Objetivos principais do sistema:**
- Consolidar todos os pedidos em uma visão única, independente da origem
- Calcular lucro diário (receita - custos)
- Relatórios de itens/pedidos por dia, semana e mês
- Base para um front mínimo que outros devs vão expandir

---

## 2. Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| Front-end | Vue 3 (Composition API) + Vite |
| State management | Pinia |
| UI Kit | PrimeVue ou Vuetify (a definir) |
| Back-end | Node.js |
| ORM | Prisma |
| Banco de dados | MySQL |
| Testes unitários/integração | Vitest |
| Testes de API (E2E) | Supertest |
| Banco de teste | MySQL isolado via Docker Compose |

---

## 3. Princípios de Arquitetura

Arquitetura em camadas inspirada em Clean Architecture, adaptada para o tamanho do projeto (sem exagero de abstração).

**Regra de ouro:** `domain/` e `application/` nunca importam Prisma diretamente. Toda dependência externa entra via interface/contrato injetado.

Isso garante:
- Regras de negócio testáveis sem banco de dados
- Possibilidade de trocar Prisma/MySQL no futuro sem reescrever lógica de negócio
- Controllers finos, lógica concentrada em use cases

---

## 4. Estrutura de Pastas

```
src/
├── domain/
│   ├── entities/           # Pedido, Item, Pagamento, Caixa (modelos de negócio puros)
│   ├── repositories/       # Interfaces/contratos (ex: PedidoRepository)
│   └── services/           # Regras puras (ex: calculadoraDeLucro.js)
│
├── application/
│   └── use-cases/          # Orquestração (ex: CriarPedidoUseCase.js)
│
├── infra/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── client.js
│   └── repositories/       # Implementação concreta (ex: PrismaPedidoRepository.js)
│
├── interfaces/
│   ├── http/
│   │   ├── controllers/
│   │   ├── routes/
│   │   └── middlewares/
│   └── webhooks/
│       └── ifood/          # Handler do webhook do iFood
│
├── shared/
│   ├── errors/             # DomainError, PedidoNaoEncontradoError, etc.
│   └── container.js        # Injeção de dependência manual
│
└── tests/
    ├── unit/               # Espelha domain/ e application/
    ├── integration/        # Espelha infra/repositories/
    └── e2e/                # Espelha interfaces/http/
```

---

## 5. Camadas Detalhadas

### 5.1 Domain — regras de negócio puras

```javascript
// domain/repositories/PedidoRepository.js
class PedidoRepository {
  async criar(pedido) { throw new Error('não implementado'); }
  async buscarPorPeriodo(inicio, fim) { throw new Error('não implementado'); }
  async buscarPorId(id) { throw new Error('não implementado'); }
}
module.exports = PedidoRepository;
```

### 5.2 Infra — implementação concreta com Prisma

```javascript
// infra/repositories/PrismaPedidoRepository.js
const PedidoRepository = require('../../domain/repositories/PedidoRepository');

class PrismaPedidoRepository extends PedidoRepository {
  constructor(prismaClient) {
    super();
    this.prisma = prismaClient;
  }

  async criar(pedido) {
    return this.prisma.pedido.create({ data: pedido });
  }

  async buscarPorPeriodo(inicio, fim) {
    return this.prisma.pedido.findMany({
      where: { criadoEm: { gte: inicio, lte: fim } },
    });
  }
}
module.exports = PrismaPedidoRepository;
```

### 5.3 Application — orquestração via use cases

```javascript
// application/use-cases/CriarPedidoUseCase.js
class CriarPedidoUseCase {
  constructor(pedidoRepository) {
    this.pedidoRepository = pedidoRepository;
  }

  async executar(dadosPedido) {
    // validações e regras de negócio aqui
    return this.pedidoRepository.criar(dadosPedido);
  }
}
module.exports = CriarPedidoUseCase;
```

### 5.4 Container de injeção de dependência (manual, sem framework)

```javascript
// shared/container.js
const prisma = require('../infra/prisma/client');
const PrismaPedidoRepository = require('../infra/repositories/PrismaPedidoRepository');
const CriarPedidoUseCase = require('../application/use-cases/CriarPedidoUseCase');

const pedidoRepository = new PrismaPedidoRepository(prisma);
const criarPedidoUseCase = new CriarPedidoUseCase(pedidoRepository);

module.exports = { criarPedidoUseCase };
```

### 5.5 Interfaces HTTP — controllers finos

```javascript
// interfaces/http/controllers/PedidoController.js
const { criarPedidoUseCase } = require('../../../shared/container');

async function criar(req, res, next) {
  try {
    const pedido = await criarPedidoUseCase.executar(req.body);
    res.status(201).json(pedido);
  } catch (erro) {
    next(erro); // tratado pelo middleware central de erro
  }
}
module.exports = { criar };
```

---

## 6. Modelagem de Domínio Preliminar

Entidades principais a modelar no `schema.prisma`:

- **Pedido** — campo `origem` (enum: `comanda`, `ifood`, `caixa`), status, totais, timestamps
- **ItemPedido** — produto, quantidade, preço unitário, subtotal
- **Produto** — nome, categoria, preço de venda, custo (para cálculo de lucro)
- **Pagamento** — forma de pagamento, valor, status
- **Caixa** — abertura/fechamento, valor inicial, valor final, diferenças
- **Cliente** (opcional para comanda/iFood) — nome, contato

> Sugestão: uma tabela `Pedido` central com `origem` como discriminador, em vez de tabelas separadas por canal — é o que viabiliza os relatórios cruzados de lucro diário/semanal/mensal.

---

## 7. Use Cases Principais (ponto de partida)

- `CriarPedidoUseCase` — cria pedido (qualquer origem)
- `AtualizarStatusPedidoUseCase`
- `ReceberWebhookIfoodUseCase` — idempotente, processa evento assíncrono
- `AbrirCaixaUseCase` / `FecharCaixaUseCase`
- `GerarRelatorioDiarioUseCase`
- `GerarRelatorioSemanalUseCase`
- `GerarRelatorioMensalUseCase`
- `CalcularLucroPeriodoUseCase`

---

## 8. Estratégia de Testes

| Camada | Tipo de teste | Ferramenta | O que testa |
|---|---|---|---|
| `domain/` | Unitário (maioria dos testes) | Vitest | Regras de negócio puras, sem I/O |
| `application/` | Unitário com mocks | Vitest + mocks manuais | Orquestração dos use cases |
| `infra/repositories/` | Integração | Vitest + MySQL via Docker | Query real contra o banco |
| `interfaces/http/` | E2E/Contrato | Supertest | Fluxo completo request → response |

**Convenções:**
- Cada arquivo em `domain/` e `application/` tem um `.test.js` espelhado em `tests/unit/`
- Mocks de repositório implementam a mesma interface do contrato real (evita testes que "mentem")
- CI roda: lint → testes unitários → testes de integração (com banco de teste subido via Docker Compose) → testes E2E

---

## 9. Padrões e Convenções

- **Tratamento de erro centralizado:** classes `DomainError`, `PedidoNaoEncontradoError`, etc., capturadas por middleware único no Express/Fastify
- **Nomenclatura:** classes de use case terminam em `UseCase`, repositórios em `Repository`
- **Sem lógica de negócio em controller:** controller só valida entrada, chama use case, formata resposta
- **Idempotência no webhook do iFood:** registrar `id` do evento recebido antes de processar, para evitar duplicidade em reentregas

---

## 10. Integração iFood — pontos de atenção

- Processar webhook de forma assíncrona (responder rápido, processar depois — fila ou job)
- Armazenar payload bruto do evento (campo JSON) para debug e reprocessamento
- Mapear status do iFood para o enum de status interno do `Pedido`

---

## 11. Checklist de Setup Inicial

- [ ] Inicializar projeto Node + estrutura de pastas acima
- [ ] Configurar Prisma + schema inicial (Pedido, ItemPedido, Produto, Pagamento, Caixa)
- [ ] Configurar Vitest + Supertest
- [ ] Subir `docker-compose.test.yml` com MySQL isolado para testes
- [ ] Implementar `PedidoRepository` (interface) + `PrismaPedidoRepository` (implementação)
- [ ] Implementar `CriarPedidoUseCase` com teste unitário cobrindo regra de negócio
- [ ] Middleware central de erro
- [ ] Scaffold do front Vue 3 (Vite + Pinia + UI kit) consumindo a rota de criação de pedido como prova de conceito
