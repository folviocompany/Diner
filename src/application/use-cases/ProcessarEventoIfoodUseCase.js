import { randomUUID } from 'node:crypto';
import { STATUS_IFOOD, mapearPedidoIfood } from '../../domain/services/ifood.js';
import { exigir } from '../../shared/errors/DomainError.js';

export class ProcessarEventoIfoodUseCase {
  constructor(uow, gateway, { clock = () => new Date(), comissaoBps = 0, merchantId } = {}) {
    this.uow = uow;
    this.gateway = gateway;
    this.clock = clock;
    this.comissaoBps = comissaoBps;
    this.merchantId = merchantId;
  }
  async executar() {
    const evento = await this.uow.transaction((tx) => tx.eventos.reivindicar(this.clock()));
    if (!evento) return false;
    try {
      const status = STATUS_IFOOD[evento.code];
      const existente = await this.uow.pedidos.buscarPorExterno(evento.orderId);
      const detalhes = status && !existente ? await this.gateway.buscarPedido(evento.orderId) : null;
      if (detalhes)
        exigir(
          detalhes.id === evento.orderId && detalhes.merchant?.id === this.merchantId,
          'Pedido iFood não pertence ao estabelecimento configurado.',
        );
      await this.uow.transaction(async (tx) => {
        // Finalização com token dentro da mesma transação: um worker cujo lease expirou não altera pedidos.
        await tx.eventos.finalizar(evento.id, evento.tokenProcessamento, {
          status: status ? 'processado' : 'ignorado',
          processadoEm: this.clock(),
          erro: null,
        });
        if (!status) return;
        let pedido = await tx.pedidos.buscarPorExterno(evento.orderId);
        if (!pedido) {
          const dados = mapearPedidoIfood(detalhes, await tx.produtos.listar(), this.comissaoBps);
          pedido = await tx.pedidos.criar({
            id: randomUUID(),
            origem: 'ifood',
            status: 'recebido',
            externoId: evento.orderId,
            criadoEm: new Date(detalhes.createdAt),
            ...dados,
          });
        }
        if (pedido.ultimoEventoEm && new Date(pedido.ultimoEventoEm) > evento.ocorridoEm) return;
        if (pedido.status === 'cancelado') return;
        const ordem = ['recebido', 'preparando', 'pronto', 'concluido'];
        if (status !== 'cancelado' && ordem.indexOf(status) < ordem.indexOf(pedido.status)) return;
        if (status === 'cancelado') {
          // Reembolso após fechamento não reescreve caixa histórico: exige conciliação manual, fica na fila de falhas.
          for (const p of pedido.pagamentos.filter((p) => p.caixaId && p.status === 'confirmado')) {
            const caixa = await tx.caixas.buscarPorId(p.caixaId);
            exigir(
              caixa && !caixa.fechadoEm,
              'Cancelamento iFood com recebimento em caixa fechado exige conciliação gerencial.',
            );
          }
          await tx.financeiro.estornar(pedido.id, this.clock());
        }
        await tx.pedidos.atualizar(pedido.id, {
          status,
          ultimoEventoEm: evento.ocorridoEm,
          ...(status === 'concluido' && !pedido.concluidoEm ? { concluidoEm: evento.ocorridoEm } : {}),
          ...(status === 'cancelado'
            ? { canceladoEm: evento.ocorridoEm, motivoCancelamento: 'Cancelado na plataforma iFood' }
            : {}),
        });
      });
    } catch (error) {
      try {
        await this.uow.transaction((tx) =>
          tx.eventos.finalizar(evento.id, evento.tokenProcessamento, {
            status: evento.tentativas >= 8 ? 'falhou' : 'pendente',
            erro: (error.code === 'REGRA_NEGOCIO' || error.name === 'DomainError'
              ? error.message
              : 'Falha temporária na comunicação ou persistência do pedido.'
            ).slice(0, 1000),
            proximaTentativaEm: new Date(
              this.clock().getTime() + Math.min(300000, 2000 * 2 ** evento.tentativas),
            ),
          }),
        );
      } catch (leaseError) {
        if (leaseError.code !== 'CONFLITO') throw leaseError;
      }
    }
    return true;
  }
}
