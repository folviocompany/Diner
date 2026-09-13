import { expect, it } from 'vitest';
import { resumirCaixa } from '../../../../domain/entities/Caixa.js';
it('concilia somente dinheiro físico, desconta estornos e soma movimentações', () => {
  const result = resumirCaixa(
    { valorInicialCentavos: 10000 },
    [
      { forma: 'dinheiro', valorCentavos: 2000, status: 'confirmado' },
      { forma: 'pix', valorCentavos: 8000, status: 'confirmado' },
      { forma: 'dinheiro', valorCentavos: 5000, status: 'estornado' },
    ],
    [
      { tipo: 'sangria', valorCentavos: 1000 },
      { tipo: 'suprimento', valorCentavos: 500 },
    ],
  );
  expect(result.esperadoCentavos).toBe(11500);
  expect(result.porForma.pix).toBe(8000);
});
