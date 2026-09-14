export const money = (value) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((value ?? 0) / 100);
export const dateTime = (value, zone = 'America/Manaus') =>
  value
    ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: zone }).format(
        new Date(value),
      )
    : '—';
export const time = (value, zone = 'America/Manaus') =>
  new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: zone }).format(
    new Date(value),
  );
export const day = (zone = 'America/Manaus') =>
  new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: zone,
  }).format(new Date());
export const origens = { comanda: 'Comanda', ifood: 'iFood', caixa: 'Balcão' };
export const statusNomes = {
  recebido: 'Recebido',
  preparando: 'Em preparo',
  pronto: 'Pronto',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
};
export const formas = {
  dinheiro: 'Dinheiro',
  pix: 'Pix',
  credito: 'Crédito',
  debito: 'Débito',
  vale: 'Vale-refeição',
  ifood_online: 'iFood online',
};
export const saldo = (p) =>
  p.totalCentavos -
  (p.pagamentos ?? []).filter((p) => p.status === 'confirmado').reduce((s, p) => s + p.valorCentavos, 0);
