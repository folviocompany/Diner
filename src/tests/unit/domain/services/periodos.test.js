import { expect, it } from 'vitest';
import { periodoRelatorio } from '../../../../domain/services/periodos.js';
it('delimita o dia em Manaus, com fim exclusivo', () => {
  const p = periodoRelatorio({ data: '2026-09-12' });
  expect(p.inicio.toISOString()).toBe('2026-09-12T04:00:00.000Z');
  expect(p.fim.toISOString()).toBe('2026-09-13T04:00:00.000Z');
});
it('usa segunda-feira como início da semana', () =>
  expect(periodoRelatorio({ tipo: 'semanal', data: '2026-09-13' }).inicio.toISOString()).toBe(
    '2026-09-07T04:00:00.000Z',
  ));
it('trata mês bissexto e horário de verão', () => {
  const p = periodoRelatorio({ tipo: 'mensal', data: '2024-02-29' });
  expect(p.fim.toISOString()).toBe('2024-03-01T04:00:00.000Z');
  const dst = periodoRelatorio({ data: '2026-03-08', timezone: 'America/New_York' });
  expect(dst.fim - dst.inicio).toBe(23 * 3600000);
});
it.each([
  { data: '2026-02-30' },
  { data: '2026-9-2' },
  { tipo: 'ruim' },
  { tipo: 'personalizado', inicio: '2026-09-12', fim: '2026-09-11' },
  { tipo: 'personalizado', inicio: '2024-01-01', fim: '2026-01-01' },
])('recusa intervalo inválido: %j', (filtro) => expect(() => periodoRelatorio(filtro)).toThrow());
