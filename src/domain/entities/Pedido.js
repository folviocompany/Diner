import { exigir } from '../../shared/errors/DomainError.js';

export const ORIGENS = ['comanda', 'ifood', 'caixa'];
export const STATUS = ['recebido', 'preparando', 'pronto', 'concluido', 'cancelado'];
export const FORMAS = ['dinheiro', 'pix', 'credito', 'debito', 'vale', 'ifood_online'];
const transicoes = {
  recebido: ['preparando', 'cancelado'],
  preparando: ['pronto', 'cancelado'],
  pronto: ['concluido', 'cancelado'],
  concluido: ['cancelado'],
  cancelado: [],
};

export function centavos(value, label = 'Valor') {
  exigir(
    Number.isSafeInteger(value) && value >= 0 && value <= 100_000_000,
    `${label} deve ser um inteiro entre 0 e 100.000.000 centavos.`,
  );
  return value;
}

export function totalizarItens(itens) {
  exigir(Array.isArray(itens) && itens.length > 0 && itens.length <= 100, 'Informe entre 1 e 100 itens.');
  for (const item of itens) {
    exigir(
      Number.isFinite(item.quantidade) &&
        item.quantidade > 0 &&
        item.quantidade <= 1000 &&
        Math.abs(item.quantidade * 1000 - Math.round(item.quantidade * 1000)) < 1e-7,
      'Quantidade inválida; use até três casas decimais.',
    );
    centavos(item.precoUnitarioCentavos, 'Preço');
    centavos(item.custoUnitarioCentavos, 'Custo');
    centavos(item.subtotalCentavos, 'Subtotal');
  }
  return {
    subtotalCentavos: centavos(
      itens.reduce((s, i) => s + i.subtotalCentavos, 0),
      'Subtotal',
    ),
    custoItensCentavos: centavos(
      itens.reduce((s, i) => s + Math.round(i.custoUnitarioCentavos * i.quantidade), 0),
      'Custo total',
    ),
  };
}

export function saldoPedido(pedido) {
  return (
    pedido.totalCentavos -
    pedido.pagamentos.filter((p) => p.status === 'confirmado').reduce((s, p) => s + p.valorCentavos, 0)
  );
}

export function validarTransicao(pedido, destino) {
  exigir(STATUS.includes(destino), 'Status inválido.');
  exigir(
    transicoes[pedido.status]?.includes(destino),
    `Não é possível alterar ${pedido.status} para ${destino}.`,
    'TRANSICAO_INVALIDA',
  );
  if (destino === 'concluido')
    exigir(saldoPedido(pedido) === 0, 'Receba o saldo do pedido antes de concluir.', 'SALDO_PENDENTE');
}
