import { Comanda } from '../../domain/entities/Comanda.js';
import { ConflitoError, exigir, NaoEncontradoError } from '../../shared/errors/DomainError.js';

export class EditarComandaUseCase {
  constructor(uow) {
    this.uow = uow;
  }
  executar({ id, versao, mesa, adicionar = [], remover = [] }) {
    return this.uow.transaction(async (tx) => {
      const pedido = await tx.pedidos.buscarPorId(id);
      if (!pedido) throw new NaoEncontradoError('Comanda');
      if ((pedido.versao ?? 0) !== versao)
        throw new ConflitoError('Comanda atualizada por outra pessoa. Recarregue.');
      const itens = await Promise.all(
        adicionar.map(async (item) => {
          const produto = await tx.produtos.buscarPorId(item.produtoId);
          exigir(produto?.ativo, 'Produto indisponível.');
          return {
            produtoId: produto.id,
            nome: produto.nome,
            quantidade: item.quantidade,
            observacao: item.observacao ?? null,
            precoUnitarioCentavos: produto.precoCentavos,
            custoUnitarioCentavos: produto.custoCentavos,
            subtotalCentavos: Math.round(produto.precoCentavos * item.quantidade),
          };
        }),
      );
      const data = new Comanda(pedido).alterar({ mesa, adicionar: itens, remover });
      return tx.pedidos.editarComanda(
        id,
        versao,
        data,
        itens,
        remover.map((r) => r.itemId),
      );
    });
  }
}
