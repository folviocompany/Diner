import { describe, expect, it } from 'vitest';
import {
  centavos,
  totalizarItens,
  saldoPedido,
  validarTransicao,
} from '../../../../domain/entities/Pedido.js';
describe('Pedido e dinheiro', () => {
  it.each([-1, 1.5, NaN, Infinity, 100_000_001, '100'])('rejeita dinheiro inválido: %s', (value) =>
    expect(() => centavos(value)).toThrow(),
  );
  it('aceita zero e centavos sem ponto flutuante', () => {
    expect(centavos(0)).toBe(0);
    expect(centavos(1099)).toBe(1099);
  });
  it('arredonda custos fracionários uma vez por item', () => {
    expect(
      totalizarItens([
        { quantidade: 0.333, precoUnitarioCentavos: 999, custoUnitarioCentavos: 151, subtotalCentavos: 333 },
      ]),
    ).toEqual({ subtotalCentavos: 333, custoItensCentavos: 50 });
  });
  it.each([0, -1, 0.0001, NaN, 1001])('rejeita quantidade %s', (quantidade) =>
    expect(() =>
      totalizarItens([
        { quantidade, precoUnitarioCentavos: 100, custoUnitarioCentavos: 50, subtotalCentavos: 100 },
      ]),
    ).toThrow(),
  );
  it('não aceita um pedido vazio', () => expect(() => totalizarItens([])).toThrow());
  it('exclui pagamentos estornados do saldo', () =>
    expect(
      saldoPedido({
        totalCentavos: 1000,
        pagamentos: [
          { status: 'confirmado', valorCentavos: 300 },
          { status: 'estornado', valorCentavos: 500 },
        ],
      }),
    ).toBe(700));
  it('impede pular preparo e concluir sem quitação', () => {
    expect(() => validarTransicao({ status: 'recebido' }, 'concluido')).toThrow();
    expect(() =>
      validarTransicao({ status: 'pronto', totalCentavos: 100, pagamentos: [] }, 'concluido'),
    ).toThrow();
  });
  it('permite concluir pedido quitado', () =>
    expect(() =>
      validarTransicao(
        { status: 'pronto', totalCentavos: 100, pagamentos: [{ status: 'confirmado', valorCentavos: 100 }] },
        'concluido',
      ),
    ).not.toThrow());
});
