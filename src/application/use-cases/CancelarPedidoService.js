import { randomUUID } from 'node:crypto';

// Executado na mesma transação da mudança de status local ou do evento iFood.
export class CancelarPedidoService {
  async executar(tx, pedido, motivo, now) {
    for (const pagamento of pedido.pagamentos.filter((p) => p.status === 'confirmado')) {
      const caixa = pagamento.caixaId ? await tx.caixas.buscarPorId(pagamento.caixaId) : null;
      if (caixa?.fechadoEm) {
        await tx.financeiro.criarReembolso({
          id: randomUUID(),
          pagamentoId: pagamento.id,
          pedidoId: pedido.id,
          caixaOrigemId: caixa.id,
          forma: pagamento.forma,
          valorCentavos: pagamento.valorCentavos,
          motivo,
          criadoEm: now,
        });
      } else await tx.financeiro.estornarPagamento(pagamento.id, now);
    }
    if (pedido.concluidoEm) {
      await tx.financeiro.criarAjuste({
        id: randomUUID(),
        pedidoId: pedido.id,
        receitaCentavos: -pedido.receitaCentavos,
        custoCentavos: -pedido.custoItensCentavos,
        motivo,
        ocorridoEm: now,
      });
    }
    return { preservarReceita: !!pedido.concluidoEm };
  }
}
