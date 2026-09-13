import { randomUUID } from 'node:crypto';
import { FORMAS, centavos, saldoPedido } from '../../domain/entities/Pedido.js';
import { ConflitoError, exigir, NaoEncontradoError } from '../../shared/errors/DomainError.js';

export class RegistrarPagamentoUseCase {
  constructor(uow, clock = () => new Date()) {
    this.uow = uow;
    this.clock = clock;
  }
  executar({ pedidoId, forma, valorCentavos, chaveIdempotencia }) {
    centavos(valorCentavos);
    exigir(valorCentavos > 0, 'Valor deve ser maior que zero.');
    exigir(FORMAS.includes(forma) && forma !== 'ifood_online', 'Forma de pagamento inválida.');
    exigir(
      typeof chaveIdempotencia === 'string' &&
        chaveIdempotencia.length >= 8 &&
        chaveIdempotencia.length <= 80,
      'Envie uma chave de idempotência válida.',
    );
    return this.uow.transaction(async (tx) => {
      const existing = await tx.financeiro.buscarPagamento(chaveIdempotencia);
      if (existing) {
        if (
          existing.pedidoId !== pedidoId ||
          existing.valorCentavos !== valorCentavos ||
          existing.forma !== forma
        )
          throw new ConflitoError('Chave de pagamento já utilizada com outros dados.');
        return existing;
      }
      const pedido = await tx.pedidos.buscarPorId(pedidoId);
      if (!pedido) throw new NaoEncontradoError('Pedido');
      exigir(pedido.status !== 'cancelado', 'Pedido cancelado não pode receber pagamento.');
      exigir(
        valorCentavos <= saldoPedido(pedido),
        'Valor excede o saldo do pedido. Registre o valor líquido, sem o troco.',
      );
      const caixa = await tx.caixas.atual();
      exigir(caixa, 'Abra o caixa antes de receber pagamentos.', 'CAIXA_FECHADO');
      return tx.financeiro.pagar({
        id: randomUUID(),
        pedidoId,
        forma,
        valorCentavos,
        caixaId: caixa.id,
        chaveIdempotencia,
        status: 'confirmado',
        recebidoEm: this.clock(),
      });
    });
  }
}
