import { centavos } from '../../domain/entities/Pedido.js';
import { resumirCaixa } from '../../domain/entities/Caixa.js';
import { exigir, NaoEncontradoError } from '../../shared/errors/DomainError.js';

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
      const resumo = resumirCaixa(caixa, await tx.caixas.pagamentos(id), await tx.caixas.movimentos(id));
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
