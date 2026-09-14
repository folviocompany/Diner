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
      const ajustes = await tx.financeiro.ajustes(periodo.inicio, periodo.fim);
      for (const ajuste of ajustes) {
        const pedido = await tx.pedidos.buscarPorId(ajuste.pedidoId);
        ajuste.origem = pedido?.origem;
        ajuste.numero = pedido?.numero;
      }
      return calcularRelatorio(
        await tx.pedidos.buscarPorPeriodo(periodo.inicio, periodo.fim),
        await tx.financeiro.despesas(periodo.inicio, periodo.fim),
        periodo,
        ajustes,
      );
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
