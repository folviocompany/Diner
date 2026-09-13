import { randomUUID } from 'node:crypto';
import { centavos } from '../../domain/entities/Pedido.js';
import { ConflitoError } from '../../shared/errors/DomainError.js';

export class AbrirCaixaUseCase {
  constructor(uow, clock = () => new Date()) {
    this.uow = uow;
    this.clock = clock;
  }
  executar({ valorInicialCentavos }) {
    centavos(valorInicialCentavos);
    return this.uow.transaction(async (tx) => {
      if (await tx.caixas.atual()) throw new ConflitoError('Já existe um caixa aberto.');
      return tx.caixas.salvar({
        id: randomUUID(),
        chaveAberto: 'principal',
        valorInicialCentavos,
        abertoEm: this.clock(),
      });
    });
  }
}
