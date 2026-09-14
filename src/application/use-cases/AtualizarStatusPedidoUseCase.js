import { validarTransicao } from '../../domain/entities/Pedido.js';
import { exigir, NaoEncontradoError } from '../../shared/errors/DomainError.js';
import { CancelarPedidoService } from './CancelarPedidoService.js';

export class AtualizarStatusPedidoUseCase {
  constructor(uow, clock = () => new Date()) {
    this.uow = uow;
    this.clock = clock;
  }
  executar({ id, status, motivo }) {
    return this.uow.transaction(async (tx) => {
      const pedido = await tx.pedidos.buscarPorId(id);
      if (!pedido) throw new NaoEncontradoError('Pedido');
      exigir(pedido.origem !== 'ifood', 'O status iFood é sincronizado pelos eventos da plataforma.');
      if (pedido.status === status) return pedido;
      validarTransicao(pedido, status);
      const now = this.clock();
      let ajuste = {};
      if (status === 'cancelado') {
        exigir(motivo?.trim().length >= 3, 'Informe o motivo do cancelamento.');
        ajuste = await new CancelarPedidoService().executar(tx, pedido, motivo.trim(), now);
      }
      return tx.pedidos.atualizar(id, {
        status,
        ...ajuste,
        ...(status === 'concluido' ? { concluidoEm: now } : {}),
        ...(status === 'cancelado' ? { canceladoEm: now, motivoCancelamento: motivo.trim() } : {}),
      });
    });
  }
}
