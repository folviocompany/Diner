import { expect, it } from 'vitest';
import { validarProduto } from '../../../../domain/entities/Produto.js';
const p = { nome: ' Lanche ', categoria: ' Lanches ', precoCentavos: 1000, custoCentavos: 500 };
it('normaliza cadastro e permite produto vendido abaixo do custo', () => {
  expect(validarProduto(p)).toMatchObject({
    nome: 'Lanche',
    categoria: 'Lanches',
    ativo: true,
    codigoExterno: null,
  });
  expect(validarProduto({ ...p, custoCentavos: 1200 }).custoCentavos).toBe(1200);
});
it.each([{ nome: '' }, { categoria: '' }, { precoCentavos: 0 }, { custoCentavos: -1 }])(
  'valida campos: %j',
  (change) => expect(() => validarProduto({ ...p, ...change })).toThrow(),
);
