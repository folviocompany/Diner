import { randomUUID } from 'node:crypto';
import { validarProduto } from '../../domain/entities/Produto.js';
import { NaoEncontradoError } from '../../shared/errors/DomainError.js';

export class SalvarProdutoUseCase {
  constructor(uow) {
    this.uow = uow;
  }
  executar({ id, ...dados }) {
    const produto = validarProduto(dados);
    return this.uow.transaction(async (tx) => {
      if (id && !(await tx.produtos.buscarPorId(id))) throw new NaoEncontradoError('Produto');
      return tx.produtos.salvar({ id: id ?? randomUUID(), ...produto });
    });
  }
}
