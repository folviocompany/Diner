import { expect, it } from 'vitest';
import { contexto } from '../../../helpers/context.js';
it('registra suprimento e sangria, sem permitir saldo físico negativo', async () => {
  const { c } = await contexto();
  await c.abrirCaixa.executar({ valorInicialCentavos: 10000 });
  await c.movimentarCaixa.executar({ tipo: 'suprimento', valorCentavos: 1000, motivo: 'Troco' });
  await c.movimentarCaixa.executar({ tipo: 'sangria', valorCentavos: 5000, motivo: 'Depósito' });
  expect((await c.consultarCaixa.executar()).esperadoCentavos).toBe(6000);
  await expect(
    c.movimentarCaixa.executar({ tipo: 'sangria', valorCentavos: 7000, motivo: 'Depósito' }),
  ).rejects.toThrow('excede');
});
