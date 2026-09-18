import { randomUUID } from 'node:crypto';
import { centavos } from '../../domain/entities/Pedido.js';
import { exigir } from '../../shared/errors/DomainError.js';
import { carregarResumoCaixa } from '../services/resumirCaixa.js';

export class MovimentarCaixaUseCase {
  constructor(uow, clock = () => new Date()) {
    this.uow = uow;
    this.clock = clock;
  }
  executar({ tipo, valorCentavos, motivo }) {
    centavos(valorCentavos);
    exigir(
      ['sangria', 'suprimento'].includes(tipo) && valorCentavos > 0 && motivo?.trim().length >= 3,
      'Informe tipo, valor positivo e motivo.',
    );
    return this.uow.transaction(async (tx) => {
      const caixa = await tx.caixas.atual();
      exigir(caixa, 'O caixa está fechado.');
      const resumo = await carregarResumoCaixa(tx, caixa);
      if (tipo === 'sangria')
        exigir(valorCentavos <= resumo.esperadoCentavos, 'Sangria excede o dinheiro disponível.');
      return tx.caixas.movimentar({
        id: randomUUID(),
        caixaId: caixa.id,
        tipo,
        valorCentavos,
        motivo: motivo.trim(),
        criadoEm: this.clock(),
      });
    });
  }
}
