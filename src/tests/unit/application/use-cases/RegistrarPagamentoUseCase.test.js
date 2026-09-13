import { expect, it } from 'vitest';
import { contexto } from '../../../helpers/context.js';
it('exige caixa aberto, impede pagamento em excesso e recusa iFood online manual', async () => {
  const { c, dados } = await contexto();
  const p = await c.criarPedido.executar(dados);
  const pay = {
    pedidoId: p.id,
    forma: 'pix',
    valorCentavos: p.totalCentavos,
    chaveIdempotencia: 'payment-001',
  };
  await expect(c.registrarPagamento.executar(pay)).rejects.toThrow('Abra o caixa');
  await c.abrirCaixa.executar({ valorInicialCentavos: 0 });
  await expect(c.registrarPagamento.executar({ ...pay, valorCentavos: 9999 })).rejects.toThrow('excede');
  expect(() => c.registrarPagamento.executar({ ...pay, forma: 'ifood_online' })).toThrow();
});
it('idempotência retorna mesmo pagamento e recusa chave reutilizada com outros dados', async () => {
  const { c, dados } = await contexto();
  const p = await c.criarPedido.executar(dados);
  await c.abrirCaixa.executar({ valorInicialCentavos: 0 });
  const pay = {
    pedidoId: p.id,
    forma: 'pix',
    valorCentavos: p.totalCentavos,
    chaveIdempotencia: 'payment-001',
  };
  const a = await c.registrarPagamento.executar(pay);
  const b = await c.registrarPagamento.executar(pay);
  expect(a.id).toBe(b.id);
  await expect(c.registrarPagamento.executar({ ...pay, forma: 'credito' })).rejects.toThrow('Chave');
});
it('pagamentos concorrentes não ultrapassam saldo', async () => {
  const { c, dados } = await contexto();
  const p = await c.criarPedido.executar(dados);
  await c.abrirCaixa.executar({ valorInicialCentavos: 0 });
  const results = await Promise.allSettled(
    ['payment-001', 'payment-002'].map((chaveIdempotencia) =>
      c.registrarPagamento.executar({
        pedidoId: p.id,
        forma: 'dinheiro',
        valorCentavos: p.totalCentavos,
        chaveIdempotencia,
      }),
    ),
  );
  expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
  expect((await c.uow.pedidos.buscarPorId(p.id)).pagamentos).toHaveLength(1);
});
