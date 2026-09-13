import { criarPrisma } from './client.js';
import { provisionarAdministrador } from './provisionarAdministrador.js';

const db = criarPrisma();
try {
  const criado = await provisionarAdministrador(db);
  console.log(
    criado
      ? 'Administrador criado. Cadastre seus produtos pela interface.'
      : 'Administrador existente preservado.',
  );
} finally {
  await db.$disconnect();
}
