import { exigir } from '../../shared/errors/DomainError.js';
import { totalizarItens, saldoPedido, centavos } from './Pedido.js';

export class Comanda {
  constructor(pedido) {
    exigir(pedido?.origem === 'comanda', 'Somente comandas podem ser editadas.');
    exigir(!['concluido', 'cancelado'].includes(pedido.status), 'Comanda encerrada não pode ser editada.');
    this.pedido = pedido;
  }
  alterar({ mesa, adicionar = [], remover = [] }) {
    const ids = remover.map((r) => r.itemId);
    exigir(new Set(ids).size === ids.length, 'Item repetido na retirada.');
    for (const item of remover) {
      exigir(item.motivo?.trim().length >= 3, 'Informe o motivo da retirada.');
      exigir(
        this.pedido.itens.some((i) => i.id === item.itemId),
        'Item não pertence à comanda.',
      );
    }
    const itens = [...this.pedido.itens.filter((i) => !ids.includes(i.id)), ...adicionar];
    const totais = totalizarItens(itens);
    const totalCentavos = centavos(
      totais.subtotalCentavos - this.pedido.descontoCentavos + this.pedido.acrescimoCentavos,
    );
    const pago = this.pedido.totalCentavos - saldoPedido(this.pedido);
    exigir(totalCentavos >= pago, 'O total não pode ficar abaixo do valor já pago.');
    if (mesa !== undefined)
      exigir(mesa.trim().length > 0 && mesa.trim().length <= 20, 'Informe uma mesa válida.');
    return {
      ...totais,
      totalCentavos,
      receitaCentavos: totalCentavos,
      ...(mesa !== undefined ? { mesa: mesa.trim() } : {}),
      ...(adicionar.length ? { status: 'recebido' } : {}),
    };
  }
  static dividirSaldo(saldo, pessoas) {
    centavos(saldo);
    exigir(
      Number.isInteger(pessoas) && pessoas >= 1 && pessoas <= 100 && pessoas <= saldo,
      'Quantidade de pessoas inválida.',
    );
    return Array.from(
      { length: pessoas },
      (_, i) => Math.floor(saldo / pessoas) + (i < saldo % pessoas ? 1 : 0),
    );
  }
}
