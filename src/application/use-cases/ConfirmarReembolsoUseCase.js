import { randomUUID } from 'node:crypto';
import { exigir, NaoEncontradoError } from '../../shared/errors/DomainError.js';
import { carregarResumoCaixa } from '../services/resumirCaixa.js';

export class ConfirmarReembolsoUseCase {
  constructor(uow, clock = () => new Date()) {
    this.uow = uow;
    this.clock = clock;
  }
  executar({ id }) {
    return this.uow.transaction(async (tx) => {
      const r = await tx.financeiro.buscarReembolso(id);
      if (!r) throw new NaoEncontradoError('Reembolso');
      if (r.confirmadoEm) return r;
      const caixa = await tx.caixas.atual();
      exigir(caixa, 'Abra o caixa para registrar a devolução.');
      if (r.forma === 'dinheiro') {
        const resumo = await carregarResumoCaixa(tx, caixa);
        exigir(resumo.esperadoCentavos >= r.valorCentavos, 'Dinheiro insuficiente no caixa para devolução.');
      }
      const now = this.clock();
      await tx.caixas.movimentar({
        id: randomUUID(),
        caixaId: caixa.id,
        tipo: 'estorno',
        forma: r.forma,
        valorCentavos: r.valorCentavos,
        motivo: `Reembolso do pedido ${r.pedidoId}`,
        criadoEm: now,
      });
      return tx.financeiro.confirmarReembolso(id, { confirmadoEm: now, caixaDestinoId: caixa.id });
    });
  }
}
