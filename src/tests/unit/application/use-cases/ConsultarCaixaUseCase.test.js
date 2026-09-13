import { expect, it } from 'vitest';
import { contexto } from '../../../helpers/context.js';
it('consulta caixa atual e histórico por id, distinguindo inexistente', async () => {
  const { c } = await contexto();
  expect(await c.consultarCaixa.executar()).toBeNull();
  await expect(c.consultarCaixa.executar('inexistente')).rejects.toThrow();
  const caixa = await c.abrirCaixa.executar({ valorInicialCentavos: 2500 });
  expect(await c.consultarCaixa.executar(caixa.id)).toMatchObject({
    esperadoCentavos: 2500,
    porForma: { dinheiro: 0 },
  });
});
