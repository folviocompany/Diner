import { expect, it } from 'vitest';
import { contexto } from '../../../helpers/context.js';
it('registra despesa na data informada e não movimenta caixa implicitamente', async () => {
  const { c } = await contexto();
  const d = await c.registrarDespesa.executar({
    descricao: 'Embalagens',
    categoria: 'Operação',
    valorCentavos: 3200,
    ocorridoEm: '2026-09-12T16:00:00Z',
  });
  expect(d.valorCentavos).toBe(3200);
  expect((await c.relatorio.executar({ data: '2026-09-12' })).lucroCentavos).toBe(-3200);
  expect(await c.consultarCaixa.executar()).toBeNull();
});
it('valida data e valor', async () => {
  const { c } = await contexto();
  expect(() =>
    c.registrarDespesa.executar({
      descricao: 'Teste',
      categoria: 'Operação',
      valorCentavos: 100,
      ocorridoEm: 'ruim',
    }),
  ).toThrow('Data');
});
