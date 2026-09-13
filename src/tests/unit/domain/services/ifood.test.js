import { expect, it } from 'vitest';
import { mapearPedidoIfood } from '../../../../domain/services/ifood.js';
import { detalhesIfood } from '../../../helpers/context.js';
const produtos = [{ id: 'produto', codigoExterno: 'SKU-1', custoCentavos: 700 }];
it('importa quantidades, valores exatos e custo histórico', () =>
  expect(mapearPedidoIfood(detalhesIfood(), produtos, 1200)).toMatchObject({
    totalCentavos: 3980,
    receitaCentavos: 3980,
    custoItensCentavos: 1400,
    taxasCentavos: 478,
  }));
it('não considera subsídio iFood nem taxas da plataforma como receita perdida da loja', () => {
  const d = detalhesIfood({
    total: { subTotal: 39.8, orderAmount: 35.8, benefits: 10, deliveryFee: 5, additionalFees: 1 },
    delivery: { deliveredBy: 'IFOOD' },
    benefits: [
      {
        sponsorshipValues: [
          { name: 'IFOOD', value: 8 },
          { name: 'MERCHANT', value: 2 },
        ],
      },
    ],
    payments: { methods: [] },
  });
  expect(mapearPedidoIfood(d, produtos).receitaCentavos).toBe(3780);
});
it('receita inclui entrega quando realizada pelo lojista', () => {
  const d = detalhesIfood({
    total: { subTotal: 39.8, orderAmount: 44.8, deliveryFee: 5 },
    delivery: { deliveredBy: 'MERCHANT' },
  });
  expect(mapearPedidoIfood(d, produtos).receitaCentavos).toBe(4480);
});
it('custos desconhecidos bloqueiam a importação em vez de inventar lucro', () =>
  expect(() => mapearPedidoIfood(detalhesIfood(), [])).toThrow('Vincule o código'));
it('valida subtotal e pagamentos recebidos', () => {
  expect(() => mapearPedidoIfood(detalhesIfood({ total: { subTotal: 5 } }), produtos)).toThrow();
  expect(() =>
    mapearPedidoIfood(detalhesIfood({ payments: { methods: [{ type: 'ONLINE', value: 100 }] } }), produtos),
  ).toThrow();
});
