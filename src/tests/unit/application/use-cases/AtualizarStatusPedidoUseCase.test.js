import { expect, it } from 'vitest';
import { contexto } from '../../../helpers/context.js';
it('percorre o ciclo e registra data de conclusão somente com quitação', async () => {
  const { c, dados } = await contexto();
  const p = await c.criarPedido.executar(dados);
  await c.atualizarStatus.executar({ id: p.id, status: 'preparando' });
  await c.atualizarStatus.executar({ id: p.id, status: 'pronto' });
  await expect(c.atualizarStatus.executar({ id: p.id, status: 'concluido' })).rejects.toThrow('saldo');
  await c.abrirCaixa.executar({ valorInicialCentavos: 0 });
  await c.registrarPagamento.executar({
    pedidoId: p.id,
    forma: 'dinheiro',
    valorCentavos: p.totalCentavos,
    chaveIdempotencia: 'pay-0011',
  });
  const final = await c.atualizarStatus.executar({ id: p.id, status: 'concluido' });
  expect(final.concluidoEm).toBeInstanceOf(Date);
  expect((await c.atualizarStatus.executar({ id: p.id, status: 'concluido' })).concluidoEm).toEqual(
    final.concluidoEm,
  );
});
it('cancelamento estorna pagamentos e reduz saldo físico do caixa', async () => {
  const { c, dados } = await contexto();
  const p = await c.criarPedido.executar(dados);
  await c.abrirCaixa.executar({ valorInicialCentavos: 1000 });
  await c.registrarPagamento.executar({
    pedidoId: p.id,
    forma: 'dinheiro',
    valorCentavos: p.totalCentavos,
    chaveIdempotencia: 'pay-0011',
  });
  await expect(c.atualizarStatus.executar({ id: p.id, status: 'cancelado' })).rejects.toThrow('motivo');
  await c.atualizarStatus.executar({ id: p.id, status: 'cancelado', motivo: 'Cliente desistiu' });
  expect((await c.consultarCaixa.executar()).esperadoCentavos).toBe(1000);
});
it('não altera pagamentos em caixa já fechado', async () => {
  const { c, dados } = await contexto();
  const p = await c.criarPedido.executar(dados);
  const caixa = await c.abrirCaixa.executar({ valorInicialCentavos: 0 });
  await c.registrarPagamento.executar({
    pedidoId: p.id,
    forma: 'pix',
    valorCentavos: p.totalCentavos,
    chaveIdempotencia: 'pay-0011',
  });
  await c.fecharCaixa.executar({ id: caixa.id, valorFinalCentavos: 0 });
  await expect(
    c.atualizarStatus.executar({ id: p.id, status: 'cancelado', motivo: 'Devolução' }),
  ).rejects.toThrow('fechado');
  expect((await c.uow.pedidos.buscarPorId(p.id)).pagamentos[0].status).toBe('confirmado');
});
