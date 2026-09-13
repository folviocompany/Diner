import { DateTime } from 'luxon';
import { exigir } from '../../shared/errors/DomainError.js';

export function periodoRelatorio({ tipo = 'diario', data, inicio, fim, timezone = 'America/Manaus' } = {}) {
  exigir(['diario', 'semanal', 'mensal', 'personalizado'].includes(tipo), 'Período inválido.');
  const parse = (value) => {
    exigir(
      typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value),
      'Use datas no formato AAAA-MM-DD.',
    );
    const d = DateTime.fromISO(value, { zone: timezone });
    exigir(d.isValid, 'Data ou fuso horário inválido.');
    return d.startOf('day');
  };
  let a, b;
  if (tipo === 'personalizado') {
    a = parse(inicio);
    b = parse(fim).plus({ days: 1 });
  } else {
    const d = data ? parse(data) : DateTime.now().setZone(timezone).startOf('day');
    a = tipo === 'semanal' ? d.startOf('week') : tipo === 'mensal' ? d.startOf('month') : d;
    b = a.plus(tipo === 'semanal' ? { weeks: 1 } : tipo === 'mensal' ? { months: 1 } : { days: 1 });
  }
  exigir(
    a.isValid && b.isValid && b > a && b.diff(a, 'days').days <= 366,
    'Informe um intervalo válido de até 366 dias.',
  );
  return { tipo, inicio: a.toJSDate(), fim: b.toJSDate(), timezone };
}
