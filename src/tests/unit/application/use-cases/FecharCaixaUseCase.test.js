import { expect, it } from 'vitest';
import { contexto } from '../../../helpers/context.js';
it('calcula diferença real, bloqueia fechamento repetido e permite nova abertura', async () => {
  const { c } = await contexto();
  const caixa = await c.abrirCaixa.executar({ valorInicialCentavos: 10000 });
  const closed = await c.fecharCaixa.executar({ id: caixa.id, valorFinalCentavos: 9900 });
  expect(closed).toMatchObject({ diferencaCentavos: -100, esperadoCentavos: 10000, chaveAberto: null });
  expect(await c.consultarCaixa.executar()).toBeNull();
  await expect(c.fecharCaixa.executar({ id: caixa.id, valorFinalCentavos: 9900 })).rejects.toThrow('fechado');
  await expect(c.abrirCaixa.executar({ valorInicialCentavos: 0 })).resolves.toBeTruthy();
});
