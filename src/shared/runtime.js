import { carregarConfig } from './config.js';
import { criarContainer } from './container.js';
import { criarPrisma } from '../infra/prisma/client.js';
import { PrismaUnitOfWork } from '../infra/repositories/PrismaRepositories.js';
import { MemoryUnitOfWork } from '../infra/repositories/MemoryRepositories.js';
import { semearDemo } from '../infra/demo.js';
import { provisionarAdministrador } from '../infra/prisma/provisionarAdministrador.js';

export async function criarRuntime() {
  const config = carregarConfig();
  if (config.demo) {
    if (!['127.0.0.1', 'localhost', '::1'].includes(config.host))
      throw new Error('A demonstração deve usar interface local (HOST=127.0.0.1).');
    const uow = new MemoryUnitOfWork();
    await semearDemo(uow, config.timezone);
    return { container: criarContainer(uow, config), close: async () => {} };
  }
  const db = criarPrisma();
  await db.$connect();
  await provisionarAdministrador(db);
  return { container: criarContainer(new PrismaUnitOfWork(db), config), close: () => db.$disconnect() };
}
