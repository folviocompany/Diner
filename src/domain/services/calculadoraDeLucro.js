import { DateTime } from 'luxon';
import { ORIGENS, saldoPedido } from '../entities/Pedido.js';

export function calcularRelatorio(pedidos, despesas, periodo, ajustes = []) {
  const concluidos = pedidos.filter((p) => p.status === 'concluido' || p.preservarReceita);
  const receitaCentavos =
    concluidos.reduce((s, p) => s + p.receitaCentavos, 0) +
    ajustes.reduce((s, a) => s + a.receitaCentavos, 0);
  const custoItensCentavos =
    concluidos.reduce((s, p) => s + p.custoItensCentavos, 0) +
    ajustes.reduce((s, a) => s + a.custoCentavos, 0);
  const taxasCentavos = concluidos.reduce((s, p) => s + p.taxasCentavos, 0);
  const despesasCentavos = despesas.reduce((s, d) => s + d.valorCentavos, 0);
  const lucroCentavos = receitaCentavos - custoItensCentavos - taxasCentavos - despesasCentavos;
  const serie = new Map();
  for (
    let dia = DateTime.fromJSDate(periodo.inicio, { zone: periodo.timezone });
    dia.toMillis() < periodo.fim.getTime();
    dia = dia.plus({ days: 1 })
  ) {
    serie.set(dia.toISODate(), {
      data: dia.toISODate(),
      receitaCentavos: 0,
      custosCentavos: 0,
      lucroCentavos: 0,
      pedidos: 0,
    });
  }
  const porOrigem = new Map(ORIGENS.map((origem) => [origem, { origem, pedidos: 0, receitaCentavos: 0 }]));
  const itens = new Map();
  for (const p of concluidos) {
    const dia = serie.get(
      DateTime.fromJSDate(new Date(p.concluidoEm), { zone: periodo.timezone }).toISODate(),
    );
    if (dia) {
      dia.receitaCentavos += p.receitaCentavos;
      dia.custosCentavos += p.custoItensCentavos + p.taxasCentavos;
      dia.pedidos++;
    }
    const origem = porOrigem.get(p.origem);
    origem.pedidos++;
    origem.receitaCentavos += p.receitaCentavos;
    for (const i of p.itens) {
      const item = itens.get(i.produtoId) ?? {
        produtoId: i.produtoId,
        nome: i.nome,
        quantidade: 0,
        receitaBrutaCentavos: 0,
        custoCentavos: 0,
      };
      item.quantidade = Math.round((item.quantidade + i.quantidade) * 1000) / 1000;
      item.receitaBrutaCentavos += i.subtotalCentavos;
      item.custoCentavos += Math.round(i.quantidade * i.custoUnitarioCentavos);
      itens.set(i.produtoId, item);
    }
  }
  for (const d of despesas) {
    const dia = serie.get(
      DateTime.fromJSDate(new Date(d.ocorridoEm), { zone: periodo.timezone }).toISODate(),
    );
    if (dia) dia.custosCentavos += d.valorCentavos;
  }
  for (const a of ajustes) {
    const origem = porOrigem.get(a.origem);
    if (origem) origem.receitaCentavos += a.receitaCentavos;
    const dia = serie.get(
      DateTime.fromJSDate(new Date(a.ocorridoEm), { zone: periodo.timezone }).toISODate(),
    );
    if (dia) {
      dia.receitaCentavos += a.receitaCentavos;
      dia.custosCentavos += a.custoCentavos;
    }
  }
  return {
    periodo,
    receitaCentavos,
    custoItensCentavos,
    taxasCentavos,
    despesasCentavos,
    lucroCentavos,
    pedidos: concluidos.length,
    ticketMedioCentavos: concluidos.length ? Math.round(receitaCentavos / concluidos.length) : 0,
    margemPercentual: receitaCentavos ? Math.round((lucroCentavos / receitaCentavos) * 10000) / 100 : 0,
    aReceberCentavos: concluidos
      .filter((p) => p.status !== 'cancelado')
      .reduce((s, p) => s + Math.max(0, saldoPedido(p)), 0),
    porOrigem: [...porOrigem.values()],
    itens: [...itens.values()].sort((a, b) => b.quantidade - a.quantidade),
    serie: [...serie.values()].map((d) => ({ ...d, lucroCentavos: d.receitaCentavos - d.custosCentavos })),
    despesas,
    ajustes,
  };
}
