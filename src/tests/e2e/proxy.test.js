import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { criarApp } from '../../interfaces/http/app.js';
import { carregarConfig } from '../../shared/config.js';
import { DomainError } from '../../shared/errors/DomainError.js';

describe('Login atrás do proxy Railway', () => {
  it('limita o IP real, ignora IP forjado à esquerda e mantém clientes separados', async () => {
    const config = carregarConfig({ RAILWAY_ENVIRONMENT_ID: 'teste' });
    const app = criarApp({
      config,
      autenticar: {
        executar: async () => {
          throw new DomainError('E-mail ou senha incorretos.', 'NAO_AUTORIZADO', 401);
        },
      },
    });
    const login = (ip) =>
      request(app)
        .post('/api/auth/login')
        .set('X-Diner-Client', 'web')
        .set('X-Forwarded-For', ip)
        .send({ email: 'teste@example.com', senha: 'incorreta' });
    for (let i = 0; i < 30; i++) await login('198.51.100.10').expect(401);
    await login('203.0.113.25, 198.51.100.10').expect(429);
    await login('198.51.100.11').expect(401);
  });
  it('não confia em proxy local por padrão e permite desativar a detecção Railway', () => {
    expect(carregarConfig({}).trustProxyHops).toBe(0);
    expect(carregarConfig({ RAILWAY_ENVIRONMENT_ID: 'teste', TRUST_PROXY_HOPS: '0' }).trustProxyHops).toBe(0);
    expect(() => carregarConfig({ TRUST_PROXY_HOPS: 'true' })).toThrow();
  });
});
