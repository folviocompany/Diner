import 'dotenv/config';
import { beforeAll, beforeEach, afterAll, describe, expect, it } from 'vitest';
import { criarPrisma } from '../../infra/prisma/client.js';
import { PrismaUnitOfWork } from '../../infra/repositories/PrismaRepositories.js';
import { contexto, evento, detalhesIfood, merchantId, usuario } from '../helpers/context.js';
import { ProcessarEventoIfoodUseCase } from '../../application/use-cases/ProcessarEventoIfoodUseCase.js';
import request from 'supertest';
import { criarApp } from '../../interfaces/http/app.js';

let db, uow;
beforeAll(async () => {
  const url = process.env.TEST_DATABASE_URL;
  if (!url || !new URL(url).pathname.endsWith('_test'))
    throw new Error('Defina TEST_DATABASE_URL apontando exclusivamente para um banco com sufixo _test.');
  db = criarPrisma(url);
  await db.$connect();
  await db.$queryRawUnsafe('SELECT 1');
  uow = new PrismaUnitOfWork(db);
});
beforeEach(async () => {
  for (const table of [
    'sessao',
    'usuario',
    'eventoIfood',
    'movimentoCaixa',
    'pagamento',
    'itemPedido',
    'pedido',
    'cliente',
    'produto',
    'caixa',
    'despesa',
  ])
    await db[table].deleteMany();
});
afterAll(async () => {
  if (db) await db.$disconnect();
});

describe('Prisma + MySQL real', () => {
  it('persiste pedido, cliente, snapshots e quantidades fracionárias', async () => {
    const { c, dados } = await contexto(uow);
    const p = await c.criarPedido.executar({
      ...dados,
      clienteNome: 'Ana',
      itens: [{ ...dados.itens[0], quantidade: 1.25 }],
    });
    expect(p.itens[0].quantidade).toBe(1.25);
    expect(p.totalCentavos).toBe(2488);
    expect(p.custoItensCentavos).toBe(875);
    expect(p.clienteId).toBeTruthy();
    expect(await db.cliente.count()).toBe(1);
    expect((await uow.pedidos.listar({ busca: 'Ana' })).total).toBe(1);
  });
  it('transação faz rollback de todas as gravações em falha', async () => {
    const { dados, c } = await contexto(uow);
    const p = await c.criarPedido.executar(dados);
    await expect(
      uow.transaction(async (tx) => {
        await tx.pedidos.atualizar(p.id, { status: 'cancelado' });
        throw new Error('Rollback');
      }),
    ).rejects.toThrow();
    expect((await uow.pedidos.buscarPorId(p.id)).status).toBe('recebido');
  });
  it('restrição e serialização impedem abertura duplicada', async () => {
    const { c } = await contexto(uow);
    const results = await Promise.allSettled(
      Array.from({ length: 5 }, () => c.abrirCaixa.executar({ valorInicialCentavos: 1000 })),
    );
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(await db.caixa.count({ where: { chaveAberto: 'principal' } })).toBe(1);
  });
  it('pagamentos concorrentes respeitam o saldo e a sessão de caixa', async () => {
    const { c, dados } = await contexto(uow);
    const p = await c.criarPedido.executar(dados);
    await c.abrirCaixa.executar({ valorInicialCentavos: 1000 });
    const results = await Promise.allSettled(
      Array.from({ length: 4 }, (_, i) =>
        c.registrarPagamento.executar({
          pedidoId: p.id,
          forma: 'dinheiro',
          valorCentavos: p.totalCentavos,
          chaveIdempotencia: `pay-test-${i}`,
        }),
      ),
    );
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect((await c.consultarCaixa.executar()).esperadoCentavos).toBe(4980);
  });
  it('concorrência entre pagamento e fechamento mantém conferência consistente', async () => {
    const { c, dados } = await contexto(uow);
    const p = await c.criarPedido.executar(dados);
    const caixa = await c.abrirCaixa.executar({ valorInicialCentavos: 0 });
    const results = await Promise.allSettled([
      c.registrarPagamento.executar({
        pedidoId: p.id,
        forma: 'dinheiro',
        valorCentavos: p.totalCentavos,
        chaveIdempotencia: 'close-race',
      }),
      c.fecharCaixa.executar({ id: caixa.id, valorFinalCentavos: 0 }),
    ]);
    expect(results[1].status).toBe('fulfilled');
    const closed = await uow.caixas.buscarPorId(caixa.id);
    const payments = await uow.caixas.pagamentos(caixa.id);
    expect(closed.esperadoCentavos).toBe(payments.reduce((s, p) => s + p.valorCentavos, 0));
  });
  it('fila durável deduplica, é recuperada por nova instância e processa uma vez', async () => {
    const { c } = await contexto(uow);
    const e = evento();
    const results = await Promise.all([c.receberWebhook.executar([e]), c.receberWebhook.executar([e])]);
    expect(results.reduce((s, r) => s + r.recebidos, 0)).toBe(1);
    const now = () => new Date(Date.now() + 1000);
    const gateway = { buscarPedido: async () => detalhesIfood() };
    await new ProcessarEventoIfoodUseCase(new PrismaUnitOfWork(db), gateway, {
      clock: now,
      merchantId,
    }).executar();
    expect(await db.pedido.count()).toBe(1);
    expect((await uow.eventos.listar())[0]).toMatchObject({ status: 'processado', tentativas: 1 });
  });
  it('reivindicação concorrente e fencing impedem dois donos da mesma tarefa', async () => {
    const { c } = await contexto(uow);
    await c.receberWebhook.executar([evento()]);
    const now = new Date(Date.now() + 1000);
    const leases = await Promise.all([
      uow.transaction((tx) => tx.eventos.reivindicar(now)),
      uow.transaction((tx) => tx.eventos.reivindicar(now)),
    ]);
    const first = leases.find(Boolean);
    expect(leases.filter(Boolean)).toHaveLength(1);
    const second = await uow.transaction((tx) => tx.eventos.reivindicar(new Date(now.getTime() + 61000)));
    await expect(
      uow.transaction((tx) =>
        tx.eventos.finalizar(first.id, first.tokenProcessamento, { status: 'processado' }),
      ),
    ).rejects.toThrow();
    await uow.transaction((tx) =>
      tx.eventos.finalizar(second.id, second.tokenProcessamento, { status: 'falhou', erro: 'teste' }),
    );
    expect(await uow.eventos.reprocessar(first.id, now)).toBe(1);
  });
  it('relatório respeita fronteira de dia local e dados serializados pelo MySQL', async () => {
    const { c, dados } = await contexto(uow);
    const p = await c.criarPedido.executar(dados);
    await uow.pedidos.atualizar(p.id, {
      status: 'concluido',
      concluidoEm: new Date('2026-09-13T03:59:59.999Z'),
    });
    expect((await c.relatorio.executar({ data: '2026-09-12' })).receitaCentavos).toBe(3980);
    expect((await c.relatorio.executar({ data: '2026-09-13' })).receitaCentavos).toBe(0);
  });
  it('fluxo HTTP autentica e grava via Prisma no banco real', async () => {
    const { c, dados } = await contexto(uow);
    await usuario(uow);
    const agent = request.agent(criarApp(c));
    await agent
      .post('/api/auth/login')
      .set('X-Diner-Client', 'web')
      .send({ email: 'teste@diner.local', senha: 'SenhaTeste123!' })
      .expect(200);
    const response = await agent.post('/api/pedidos').set('X-Diner-Client', 'web').send(dados).expect(201);
    expect((await db.pedido.findUnique({ where: { id: response.body.id } })).totalCentavos).toBe(3980);
    expect((await agent.get('/api/pedidos').expect(200)).body.total).toBe(1);
  });
});
