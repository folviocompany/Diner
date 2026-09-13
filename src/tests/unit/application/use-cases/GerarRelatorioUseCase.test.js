import { expect, it } from 'vitest';
import { contexto } from '../../../helpers/context.js';
import {
  GerarRelatorioDiarioUseCase,
  GerarRelatorioSemanalUseCase,
  GerarRelatorioMensalUseCase,
  CalcularLucroPeriodoUseCase,
} from '../../../../application/use-cases/GerarRelatorioUseCase.js';
it('relatórios diário, semanal, mensal e personalizado usam o mesmo cálculo', async () => {
  const { uow } = await contexto();
  for (const [Tipo, dias] of [
    [GerarRelatorioDiarioUseCase, 1],
    [GerarRelatorioSemanalUseCase, 7],
    [GerarRelatorioMensalUseCase, 30],
    [CalcularLucroPeriodoUseCase, 3],
  ]) {
    const report = await new Tipo(uow).executar({
      data: '2026-09-12',
      inicio: '2026-09-10',
      fim: '2026-09-12',
    });
    expect(report.serie).toHaveLength(dias);
  }
});
it('reconhece venda na conclusão, independente da criação', async () => {
  const { c, uow, dados } = await contexto();
  const p = await c.criarPedido.executar(dados);
  await uow.pedidos.atualizar(p.id, {
    criadoEm: new Date('2026-09-11T12:00:00Z'),
    status: 'concluido',
    concluidoEm: new Date('2026-09-12T12:00:00Z'),
  });
  expect((await c.relatorio.executar({ data: '2026-09-11' })).receitaCentavos).toBe(0);
  expect((await c.relatorio.executar({ data: '2026-09-12' })).receitaCentavos).toBe(3980);
});
