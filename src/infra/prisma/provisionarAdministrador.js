import { randomUUID } from 'node:crypto';
import { security } from '../security.js';

export async function provisionarAdministrador(db, env = process.env) {
  if ((await db.usuario.count()) > 0) return false;

  const senha = env.ADMIN_PASSWORD;
  if (!senha || senha.length < 10)
    throw new Error(
      'A tabela Usuario está vazia. Defina ADMIN_PASSWORD com ao menos 10 caracteres para criar o primeiro administrador.',
    );

  const email = (env.ADMIN_EMAIL ?? 'admin@diner.local').toLowerCase().trim();
  await db.usuario.upsert({
    where: { email },
    create: {
      id: randomUUID(),
      nome: 'Administrador',
      email,
      senhaHash: await security.hashSenha(senha),
    },
    update: {},
  });
  console.log(`Administrador inicial criado para ${email}.`);
  return true;
}
