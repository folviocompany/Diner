import { criarRuntime } from './shared/runtime.js';
import { iniciarWorker } from './infra/ifood/worker.js';
const runtime = await criarRuntime();
const parar = iniciarWorker(runtime.container.processarEvento, runtime.container.config.workerInterval);
console.log('Worker iFood iniciado.');
let encerrando = false;
const encerrar = async () => {
  if (encerrando) return;
  encerrando = true;
  await parar();
  await runtime.close();
};
process.on('SIGINT', encerrar);
process.on('SIGTERM', encerrar);
