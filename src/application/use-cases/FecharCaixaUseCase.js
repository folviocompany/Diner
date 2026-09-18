import { centavos } from '../../domain/entities/Pedido.js';
import { exigir, NaoEncontradoError } from '../../shared/errors/DomainError.js';
import { carregarResumoCaixa } from '../services/resumirCaixa.js';

export class FecharCaixaUseCase {
  constructor(uow, clock = () => new Date()) {
    this.uow = uow;
    this.clock = clock;
  }
  executar({ id, valorFinalCentavos, observacao }) {
    centavos(valorFinalCentavos);
    return this.uow.transaction(async (tx) => {
      const caixa = await tx.caixas.buscarPorId(id);
      if (!caixa) throw new NaoEncontradoError('Caixa');
      exigir(!caixa.fechadoEm, 'Caixa já está fechado.');
      const resumo = await carregarResumoCaixa(tx, caixa);
      return tx.caixas.salvar({
        ...caixa,
        chaveAberto: null,
        valorFinalCentavos,
        esperadoCentavos: resumo.esperadoCentavos,
        diferencaCentavos: valorFinalCentavos - resumo.esperadoCentavos,
        fechadoEm: this.clock(),
        observacao: observacao ?? null,
      });
    });
  }
}
