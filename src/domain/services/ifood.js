import { exigir } from '../../shared/errors/DomainError.js';
import { centavos, totalizarItens } from '../entities/Pedido.js';

export const STATUS_IFOOD = {
  PLC: 'recebido',
  PLACED: 'recebido',
  CFM: 'preparando',
  CONFIRMED: 'preparando',
  RTP: 'pronto',
  READY_TO_PICKUP: 'pronto',
  DSP: 'pronto',
  DISPATCHED: 'pronto',
  CON: 'concluido',
  CONCLUDED: 'concluido',
  CAN: 'cancelado',
  CANCELLED: 'cancelado',
};
export const dinheiroIfood = (value) => {
  exigir(
    typeof value === 'number' && Number.isFinite(value) && value >= 0,
    'Valor inválido nos dados do iFood.',
  );
  return centavos(Math.round(value * 100));
};

export function mapearPedidoIfood(detalhes, produtos, comissaoBps = 0) {
  exigir(detalhes?.items?.length, 'Pedido iFood sem itens.');
  exigir(
    Number.isInteger(comissaoBps) && comissaoBps >= 0 && comissaoBps <= 10000,
    'Comissão iFood inválida.',
  );
  const itens = detalhes.items.map((item) => {
    const codigo = item.externalCode || item.id;
    const produto = produtos.find((p) => p.codigoExterno === codigo);
    exigir(
      produto,
      `Vincule o código iFood ${codigo} (${item.name}) a um produto e reprocesse o evento.`,
      'PRODUTO_IFOOD_NAO_MAPEADO',
    );
    return {
      produtoId: produto.id,
      nome: item.name,
      quantidade: item.quantity,
      precoUnitarioCentavos: dinheiroIfood(item.unitPrice),
      custoUnitarioCentavos: produto.custoCentavos,
      subtotalCentavos: dinheiroIfood(item.totalPrice),
      observacao: (item.observations ?? '').slice(0, 500),
    };
  });
  const totais = totalizarItens(itens);
  exigir(
    totais.subtotalCentavos === dinheiroIfood(detalhes.total.subTotal),
    'O subtotal iFood diverge dos itens.',
  );
  const descontoLoja = (detalhes.benefits ?? [])
    .flatMap((b) => b.sponsorshipValues ?? [])
    .filter((s) => s.name === 'MERCHANT')
    .reduce((s, b) => s + dinheiroIfood(b.value), 0);
  const entregaLoja =
    detalhes.delivery?.deliveredBy === 'MERCHANT' ? dinheiroIfood(detalhes.total.deliveryFee ?? 0) : 0;
  const receitaCentavos = centavos(Math.max(0, totais.subtotalCentavos + entregaLoja - descontoLoja));
  const formas = {
    CASH: 'dinheiro',
    PIX: 'pix',
    CREDIT: 'credito',
    DEBIT: 'debito',
    MEAL_VOUCHER: 'vale',
    FOOD_VOUCHER: 'vale',
  };
  const pagamentos = (detalhes.payments?.methods ?? [])
    .filter((p) => p.type === 'ONLINE' || p.prepaid === true)
    .map((p) => ({ forma: 'ifood_online', valorCentavos: dinheiroIfood(p.value), status: 'confirmado' }));
  const totalCentavos = dinheiroIfood(detalhes.total.orderAmount);
  exigir(
    pagamentos.reduce((s, p) => s + p.valorCentavos, 0) <= totalCentavos,
    'Pagamentos iFood excedem o total.',
  );
  return {
    ...totais,
    itens,
    pagamentos,
    totalCentavos,
    receitaCentavos,
    descontoCentavos: dinheiroIfood(detalhes.total.benefits ?? 0),
    acrescimoCentavos: dinheiroIfood(
      (detalhes.total.deliveryFee ?? 0) + (detalhes.total.additionalFees ?? 0),
    ),
    taxasCentavos: Math.round((receitaCentavos * comissaoBps) / 10000),
    observacao: [
      detalhes.extraInfo,
      ...(detalhes.payments?.methods ?? [])
        .filter((p) => p.type === 'OFFLINE')
        .map((p) => `Cobrar ${formas[p.method?.trim()] ?? p.method} na entrega`),
    ]
      .filter(Boolean)
      .join(' · ')
      .slice(0, 500),
    clienteNome: detalhes.customer?.name?.slice(0, 120) ?? null,
    clienteContato: detalhes.customer?.phone?.number?.slice(0, 40) ?? null,
    referenciaExterna: detalhes.displayId ?? null,
  };
}
