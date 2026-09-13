import { exigir } from '../../shared/errors/DomainError.js';

export class ReceberWebhookIfoodUseCase {
  constructor(uow, merchantId) {
    this.uow = uow;
    this.merchantId = merchantId;
  }
  async executar(eventos) {
    exigir(this.merchantId, 'Configure o estabelecimento iFood.');
    const aceitos = eventos
      .filter((e) => e.merchantId === this.merchantId)
      .map((e) => ({
        id: e.id,
        orderId: e.orderId,
        merchantId: e.merchantId,
        code: e.fullCode || e.code,
        ocorridoEm: new Date(e.createdAt),
        payload: e,
      }));
    const recebidos = aceitos.length ? await this.uow.transaction((tx) => tx.eventos.registrar(aceitos)) : 0;
    return { recebidos, duplicados: aceitos.length - recebidos, ignorados: eventos.length - aceitos.length };
  }
}
