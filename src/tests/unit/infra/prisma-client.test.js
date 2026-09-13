import { expect, it } from 'vitest';
import { opcoesConexao } from '../../../infra/prisma/client.js';

it('suporta autenticação completa do MySQL local após reinício', () => {
  expect(opcoesConexao('mysql://user:sen%40ha@127.0.0.1:3307/diner', {})).toMatchObject({
    host: '127.0.0.1',
    port: 3307,
    password: 'sen@ha',
    database: 'diner',
    allowPublicKeyRetrieval: true,
  });
});
it('não busca chave automaticamente em servidor remoto', () => {
  expect(opcoesConexao('mysql://user:pass@db.example.com/diner', {}).allowPublicKeyRetrieval).toBe(false);
});
it('TLS valida certificado e dispensa busca de chave RSA', () => {
  expect(opcoesConexao('mysql://user:pass@127.0.0.1/diner?ssl=true', {})).toMatchObject({
    allowPublicKeyRetrieval: false,
    ssl: { rejectUnauthorized: true },
  });
});
it('chave fixada pelo operador tem prioridade sobre descoberta local', () => {
  const opts = opcoesConexao('mysql://user:pass@localhost/diner', {
    MYSQL_SERVER_RSA_KEY: '/keys/mysql-public.pem',
  });
  expect(opts).toMatchObject({
    allowPublicKeyRetrieval: false,
    cachingRsaPublicKey: '/keys/mysql-public.pem',
  });
});
it('recusa URL sem configuração e protocolo incompatível', () => {
  expect(() => opcoesConexao()).toThrow('DATABASE_URL');
  expect(() => opcoesConexao('postgres://user:pass@localhost/db')).toThrow('mysql');
});
