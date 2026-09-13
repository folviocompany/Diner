import { criarRuntime } from './shared/runtime.js';
import { criarApp } from './interfaces/http/app.js';
import { iniciarWorker } from './infra/ifood/worker.js';

const runtime = await criarRuntime();
const { config } = runtime.container;
const server = criarApp(runtime.container).listen(config.port, config.host, () =>
  console.log(
    `Diner: http://${config.host}:${config.port} (${config.demo ? 'demonstração em memória' : 'MySQL'})`,
  ),
);
const pararWorker = config.ifoodClientId
  ? iniciarWorker(runtime.container.processarEvento, config.workerInterval)
  : async () => {};
let encerrando = false;
async function encerrar() {
  if (encerrando) return;
  encerrando = true;
  await new Promise((resolve) => server.close(resolve));
  await pararWorker();
  await runtime.close();
}
process.on('SIGINT', encerrar);
process.on('SIGTERM', encerrar);
