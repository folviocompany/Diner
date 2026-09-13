import { randomUUID } from 'node:crypto';
import { criarPrisma } from './client.js';
import { PrismaUnitOfWork } from '../repositories/PrismaRepositories.js';
import { security } from '../security.js';

const password = process.env.ADMIN_PASSWORD;
if (!password || password.length < 10) throw new Error('Defina ADMIN_PASSWORD com ao menos 10 caracteres.');
const db = criarPrisma();
try {
  const uow = new PrismaUnitOfWork(db);
  await uow.usuarios.salvar({
    id: randomUUID(),
    nome: 'Administrador',
    email: (process.env.ADMIN_EMAIL ?? 'admin@diner.local').toLowerCase(),
    senhaHash: await security.hashSenha(password),
  });
  console.log(
    'Administrador criado (usuários existentes são preservados). Cadastre seus produtos pela interface.',
  );
} finally {
  await db.$disconnect();
}
