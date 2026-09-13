import { readFileSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

export function opcoesConexao(databaseUrl, env = process.env) {
  if (!databaseUrl) throw new Error('Configure DATABASE_URL no arquivo .env. Consulte o README.');
  const url = new URL(databaseUrl);
  if (url.protocol !== 'mysql:') throw new Error('DATABASE_URL deve usar o protocolo mysql.');
  const host = url.hostname.replace(/^\[|\]$/g, '');
  const local = ['127.0.0.1', 'localhost', '::1'].includes(host);
  const tls = url.searchParams.get('ssl') === 'true';
  return {
    host,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.slice(1)),
    connectionLimit: 8,
    // caching_sha2_password requer chave RSA após reiniciar o MySQL.
    // Busca automática da chave fica restrita ao banco na própria máquina.
    allowPublicKeyRetrieval: local && !tls && !env.MYSQL_SERVER_RSA_KEY,
    ...(env.MYSQL_SERVER_RSA_KEY
      ? { cachingRsaPublicKey: env.MYSQL_SERVER_RSA_KEY, rsaPublicKey: env.MYSQL_SERVER_RSA_KEY }
      : {}),
    ...(tls
      ? {
          ssl: {
            rejectUnauthorized: true,
            ...(env.DATABASE_SSL_CA ? { ca: readFileSync(env.DATABASE_SSL_CA, 'utf8') } : {}),
          },
        }
      : {}),
  };
}

export function criarPrisma(databaseUrl = process.env.DATABASE_URL) {
  return new PrismaClient({ adapter: new PrismaMariaDb(opcoesConexao(databaseUrl)) });
}
