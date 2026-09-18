import { resumirCaixa } from '../../domain/entities/Caixa.js';

export async function carregarResumoCaixa(tx, caixa) {
  const [pagamentos, movimentos] = await Promise.all([
    tx.caixas.pagamentos(caixa.id),
    tx.caixas.movimentos(caixa.id),
  ]);
  return resumirCaixa(caixa, pagamentos, movimentos);
}
