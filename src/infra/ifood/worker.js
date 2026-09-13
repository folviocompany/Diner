export function iniciarWorker(processador, intervalo = 2000) {
  let parado = false;
  let timer;
  let atual = Promise.resolve();
  const executar = () => {
    atual = (async () => {
      try {
        for (let i = 0; i < 20 && !parado; i++) if (!(await processador.executar())) break;
      } catch (error) {
        console.error(
          JSON.stringify({ level: 'error', component: 'ifood-worker', code: error.code ?? 'WORKER_ERROR' }),
        );
      } finally {
        if (!parado) timer = setTimeout(executar, intervalo);
      }
    })();
  };
  executar();
  return async () => {
    parado = true;
    clearTimeout(timer);
    await atual;
  };
}
