import { expect, it } from 'vitest';
import { contexto } from '../../../helpers/context.js';
it('somente um caixa permanece aberto, inclusive em concorrência', async () => {
  const { c } = await contexto();
  const results = await Promise.allSettled([
    c.abrirCaixa.executar({ valorInicialCentavos: 10000 }),
    c.abrirCaixa.executar({ valorInicialCentavos: 0 }),
  ]);
  expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
  expect(await c.uow.caixas.listar()).toHaveLength(1);
});
