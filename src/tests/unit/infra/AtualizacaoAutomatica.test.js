import { afterEach, expect, it, vi } from 'vitest';
import { AtualizacaoAutomatica } from '../../../../web/src/lib/AtualizacaoAutomatica.js';
afterEach(() => vi.useRealTimers());
it('atualiza periodicamente, pausa durante edição e encerra ao sair da tela', async () => {
  vi.useFakeTimers();
  let editando = false;
  const carregar = vi.fn().mockResolvedValue();
  const atualizador = new AtualizacaoAutomatica(carregar, { intervalo: 1000, permitido: () => !editando });
  atualizador.iniciar();
  await vi.advanceTimersByTimeAsync(1000);
  expect(carregar).toHaveBeenCalledTimes(1);
  editando = true;
  await vi.advanceTimersByTimeAsync(2000);
  expect(carregar).toHaveBeenCalledTimes(1);
  editando = false;
  await vi.advanceTimersByTimeAsync(1000);
  expect(carregar).toHaveBeenCalledTimes(2);
  atualizador.parar();
  await vi.advanceTimersByTimeAsync(5000);
  expect(carregar).toHaveBeenCalledTimes(2);
});
it('não sobrepõe requisições demoradas', async () => {
  vi.useFakeTimers();
  let resolver;
  const carregar = vi.fn(
    () =>
      new Promise((resolve) => {
        resolver = resolve;
      }),
  );
  const atualizador = new AtualizacaoAutomatica(carregar, { intervalo: 100 });
  atualizador.iniciar();
  await vi.advanceTimersByTimeAsync(1000);
  expect(carregar).toHaveBeenCalledTimes(1);
  resolver();
  await vi.advanceTimersByTimeAsync(100);
  expect(carregar).toHaveBeenCalledTimes(2);
  atualizador.parar();
  resolver();
});
