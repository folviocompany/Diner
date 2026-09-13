import { randomUUID } from 'node:crypto';
import { centavos } from '../../domain/entities/Pedido.js';
import { exigir } from '../../shared/errors/DomainError.js';

export class RegistrarDespesaUseCase {
  constructor(uow, clock = () => new Date()) {
    this.uow = uow;
    this.clock = clock;
  }
  executar({ descricao, categoria, valorCentavos, ocorridoEm }) {
    centavos(valorCentavos);
    exigir(
      valorCentavos > 0 && descricao?.trim().length >= 3 && categoria?.trim(),
      'Informe descrição, categoria e valor positivo.',
    );
    const data = new Date(ocorridoEm);
    exigir(Number.isFinite(data.getTime()), 'Data da despesa inválida.');
    return this.uow.transaction((tx) =>
      tx.financeiro.criarDespesa({
        id: randomUUID(),
        descricao: descricao.trim(),
        categoria: categoria.trim(),
        valorCentavos,
        ocorridoEm: data,
        criadoEm: this.clock(),
      }),
    );
  }
}
