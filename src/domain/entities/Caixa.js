import { FORMAS } from './Pedido.js';

export function resumirCaixa(caixa, pagamentos, movimentos) {
  const porForma = Object.fromEntries(FORMAS.map((f) => [f, 0]));
  for (const p of pagamentos) if (p.status === 'confirmado') porForma[p.forma] += p.valorCentavos;
  for (const m of movimentos) if (m.tipo === 'estorno') porForma[m.forma] -= m.valorCentavos;
  const suprimentosCentavos = movimentos
    .filter((m) => m.tipo === 'suprimento')
    .reduce((s, m) => s + m.valorCentavos, 0);
  const sangriasCentavos = movimentos
    .filter((m) => m.tipo === 'sangria')
    .reduce((s, m) => s + m.valorCentavos, 0);
  return {
    ...caixa,
    porForma,
    movimentos,
    suprimentosCentavos,
    sangriasCentavos,
    esperadoCentavos: caixa.valorInicialCentavos + porForma.dinheiro + suprimentosCentavos - sangriasCentavos,
  };
}
