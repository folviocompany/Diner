import { NaoEncontradoError } from '../../shared/errors/DomainError.js';
import { carregarResumoCaixa } from '../services/resumirCaixa.js';

export class ConsultarCaixaUseCase {
  constructor(uow) {
    this.uow = uow;
  }
  executar(id) {
    return this.uow.transaction(async (tx) => {
      const caixa = id ? await tx.caixas.buscarPorId(id) : await tx.caixas.atual();
      if (!caixa) {
        if (id) throw new NaoEncontradoError('Caixa');
        return null;
      }
      return carregarResumoCaixa(tx, caixa);
    });
  }
}
