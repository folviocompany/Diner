import { expect, it } from 'vitest';
import { calcularRelatorio } from '../../../../domain/services/calculadoraDeLucro.js';
import { periodoRelatorio } from '../../../../domain/services/periodos.js';
const periodo = periodoRelatorio({ tipo: 'semanal', data: '2026-09-12' });
const pedido = {
  origem: 'ifood',
  status: 'concluido',
  receitaCentavos: 10000,
  totalCentavos: 9000,
  custoItensCentavos: 3000,
  taxasCentavos: 1200,
  concluidoEm: new Date('2026-09-12T15:00:00Z'),
  pagamentos: [{ status: 'confirmado', valorCentavos: 8000 }],
  itens: [
    { produtoId: 'p1', nome: 'Lanche', quantidade: 2, subtotalCentavos: 10000, custoUnitarioCentavos: 1500 },
  ],
};
it('calcula resultado, recebíveis, itens, canais e série sem contabilizar cancelados', () => {
  const r = calcularRelatorio(
    [pedido, { ...pedido, status: 'cancelado' }],
    [{ valorCentavos: 500, ocorridoEm: new Date('2026-09-12T20:00:00Z') }],
    periodo,
  );
  expect(r).toMatchObject({
    receitaCentavos: 10000,
    lucroCentavos: 5300,
    margemPercentual: 53,
    pedidos: 1,
    aReceberCentavos: 1000,
  });
  expect(r.itens[0]).toMatchObject({ quantidade: 2, receitaBrutaCentavos: 10000, custoCentavos: 3000 });
  expect(r.serie).toHaveLength(7);
  expect(r.serie.reduce((s, d) => s + d.lucroCentavos, 0)).toBe(r.lucroCentavos);
});
it('período vazio mantém série e resultado zero sem NaN', () =>
  expect(calcularRelatorio([], [], periodo)).toMatchObject({
    lucroCentavos: 0,
    margemPercentual: 0,
    ticketMedioCentavos: 0,
  }));
it('uma despesa sem vendas gera prejuízo', () =>
  expect(
    calcularRelatorio([], [{ valorCentavos: 500, ocorridoEm: new Date('2026-09-12T20:00:00Z') }], periodo)
      .lucroCentavos,
  ).toBe(-500));
