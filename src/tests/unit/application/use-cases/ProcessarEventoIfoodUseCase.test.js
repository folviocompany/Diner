import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { contexto, evento, detalhesIfood, merchantId } from '../../../helpers/context.js';
import { ProcessarEventoIfoodUseCase } from '../../../../application/use-cases/ProcessarEventoIfoodUseCase.js';
const now = () => new Date('2026-09-13T15:00:00Z');
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(now());
});
afterEach(() => vi.useRealTimers());
it('importa uma vez e não regride status com evento atrasado', async () => {
  const { c, uow } = await contexto();
  const gateway = { buscarPedido: vi.fn(async () => detalhesIfood()) };
  const worker = new ProcessarEventoIfoodUseCase(uow, gateway, { clock: now, merchantId, comissaoBps: 1200 });
  await c.receberWebhook.executar([evento({ code: 'CON', createdAt: '2026-09-12T16:00:00Z' })]);
  await worker.executar();
  await c.receberWebhook.executar([evento({ code: 'PLC' })]);
  await worker.executar();
  const orders = await uow.pedidos.listar();
  expect(orders.total).toBe(1);
  expect(orders.data[0]).toMatchObject({ status: 'concluido', origem: 'ifood', taxasCentavos: 478 });
  expect(gateway.buscarPedido).toHaveBeenCalledTimes(1);
});
it('falha recuperável fica persistida com backoff e falha definitiva pode ser reprocessada', async () => {
  const { c, uow } = await contexto();
  const e = evento();
  await c.receberWebhook.executar([e]);
  uow.state.eventos[0].tentativas = 7;
  const worker = new ProcessarEventoIfoodUseCase(
    uow,
    {
      buscarPedido: async () => {
        throw new Error('secret não deve aparecer');
      },
    },
    { clock: now, merchantId },
  );
  await worker.executar();
  const log = (await uow.eventos.listar())[0];
  expect(log).toMatchObject({ status: 'falhou', tentativas: 8 });
  expect(log.erro).not.toContain('secret');
  expect(await uow.eventos.reprocessar(e.id, now())).toBe(1);
  expect((await uow.eventos.listar())[0]).toMatchObject({ status: 'pendente', tentativas: 0 });
});
it('ignora eventos não suportados sem consultar detalhes', async () => {
  const { c, uow } = await contexto();
  const gateway = { buscarPedido: vi.fn() };
  await c.receberWebhook.executar([evento({ code: 'NOVA_NOTIFICACAO' })]);
  await new ProcessarEventoIfoodUseCase(uow, gateway, { clock: now, merchantId }).executar();
  expect((await uow.eventos.listar())[0].status).toBe('ignorado');
  expect(gateway.buscarPedido).not.toHaveBeenCalled();
});
it('não aceita detalhes de outro estabelecimento', async () => {
  const { c, uow } = await contexto();
  await c.receberWebhook.executar([evento()]);
  await new ProcessarEventoIfoodUseCase(
    uow,
    { buscarPedido: async () => detalhesIfood({ merchant: { id: 'outro' } }) },
    { clock: now, merchantId },
  ).executar();
  expect((await uow.pedidos.listar()).total).toBe(0);
  expect((await uow.eventos.listar())[0].status).toBe('pendente');
});
it('lease expirado é recuperado e token antigo não finaliza trabalho novo', async () => {
  const { c, uow } = await contexto();
  await c.receberWebhook.executar([evento()]);
  const first = await uow.eventos.reivindicar(now());
  const second = await uow.eventos.reivindicar(new Date(now().getTime() + 61000));
  expect(second.tokenProcessamento).not.toBe(first.tokenProcessamento);
  await expect(
    uow.eventos.finalizar(first.id, first.tokenProcessamento, { status: 'processado' }),
  ).rejects.toThrow();
});

it('cancelamento externo estorna pagamento online e retira venda do resultado', async () => {
  const { c, uow } = await contexto();
  const worker = new ProcessarEventoIfoodUseCase(
    uow,
    { buscarPedido: async () => detalhesIfood() },
    { clock: now, merchantId },
  );
  await c.receberWebhook.executar([evento({ code: 'CON', createdAt: '2026-09-12T16:00:00Z' })]);
  await worker.executar();
  expect((await c.relatorio.executar({ data: '2026-09-12' })).receitaCentavos).toBe(3980);
  await c.receberWebhook.executar([evento({ code: 'CAN', createdAt: '2026-09-12T17:00:00Z' })]);
  await worker.executar();
  const pedido = (await uow.pedidos.listar()).data[0];
  expect(pedido.status).toBe('cancelado');
  expect(pedido.pagamentos[0].status).toBe('estornado');
  expect((await c.relatorio.executar({ data: '2026-09-12' })).receitaCentavos).toBe(0);
  await c.receberWebhook.executar([evento({ code: 'CON', createdAt: '2026-09-12T18:00:00Z' })]);
  await worker.executar();
  expect((await uow.pedidos.buscarPorId(pedido.id)).status).toBe('cancelado');
});
it('cancelamento com recebimento em caixa fechado não altera o histórico e registra falha', async () => {
  const { c, uow } = await contexto();
  const worker = new ProcessarEventoIfoodUseCase(
    uow,
    { buscarPedido: async () => detalhesIfood({ payments: { methods: [] } }) },
    { clock: now, merchantId },
  );
  await c.receberWebhook.executar([evento()]);
  await worker.executar();
  const pedido = (await uow.pedidos.listar()).data[0];
  const caixa = await c.abrirCaixa.executar({ valorInicialCentavos: 0 });
  await c.registrarPagamento.executar({
    pedidoId: pedido.id,
    forma: 'dinheiro',
    valorCentavos: 3980,
    chaveIdempotencia: 'cancel-cash-001',
  });
  await c.fecharCaixa.executar({ id: caixa.id, valorFinalCentavos: 3980 });
  const cancelamento = evento({ code: 'CAN', createdAt: '2026-09-12T17:00:00Z' });
  await c.receberWebhook.executar([cancelamento]);
  await worker.executar();
  expect((await uow.pedidos.buscarPorId(pedido.id)).status).toBe('recebido');
  expect((await uow.eventos.listar()).find((e) => e.id === cancelamento.id)).toMatchObject({
    status: 'pendente',
    erro: expect.stringContaining('caixa fechado'),
  });
  expect((await c.consultarCaixa.executar(caixa.id)).esperadoCentavos).toBe(3980);
});
