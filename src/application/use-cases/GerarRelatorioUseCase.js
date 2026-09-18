import { periodoRelatorio } from '../../domain/services/periodos.js';
import { calcularRelatorio } from '../../domain/services/calculadoraDeLucro.js';

export class GerarRelatorioUseCase {
  constructor(uow, timezone = 'America/Manaus') {
    this.uow = uow;
    this.timezone = timezone;
  }
  executar(filtro = {}) {
    const periodo = periodoRelatorio({ ...filtro, timezone: this.timezone });
    return this.uow.transaction(async (tx) => {
      const [pedidos, despesas, ajustes] = await Promise.all([
        tx.pedidos.buscarPorPeriodo(periodo.inicio, periodo.fim),
        tx.financeiro.despesas(periodo.inicio, periodo.fim),
        tx.financeiro.ajustes(periodo.inicio, periodo.fim),
      ]);
      const pedidosAjustados = ajustes.length
        ? await tx.pedidos.buscarReferenciasPorIds([...new Set(ajustes.map((a) => a.pedidoId))])
        : [];
      const porId = new Map(pedidosAjustados.map((pedido) => [pedido.id, pedido]));
      const ajustesComPedido = ajustes.map((ajuste) => ({
        ...ajuste,
        origem: porId.get(ajuste.pedidoId)?.origem,
        numero: porId.get(ajuste.pedidoId)?.numero,
      }));
      return calcularRelatorio(pedidos, despesas, periodo, ajustesComPedido);
    });
  }
}
export class GerarRelatorioDiarioUseCase extends GerarRelatorioUseCase {
  executar(filtro) {
    return super.executar({ ...filtro, tipo: 'diario' });
  }
}
export class GerarRelatorioSemanalUseCase extends GerarRelatorioUseCase {
  executar(filtro) {
    return super.executar({ ...filtro, tipo: 'semanal' });
  }
}
export class GerarRelatorioMensalUseCase extends GerarRelatorioUseCase {
  executar(filtro) {
    return super.executar({ ...filtro, tipo: 'mensal' });
  }
}
export class CalcularLucroPeriodoUseCase extends GerarRelatorioUseCase {
  executar(filtro) {
    return super.executar({ ...filtro, tipo: 'personalizado' });
  }
}
