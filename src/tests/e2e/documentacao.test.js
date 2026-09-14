import { expect, it } from 'vitest';
import request from 'supertest';
import { readFileSync } from 'node:fs';
import { contexto } from '../helpers/context.js';
import { criarApp } from '../../interfaces/http/app.js';
import SwaggerParser from '@apidevtools/swagger-parser';

it('publica contrato OpenAPI com todas as rotas e mantém a API protegida', async () => {
  const { c } = await contexto();
  const app = criarApp(c);
  const { body: spec } = await request(app)
    .get('/api/openapi.json')
    .expect(200)
    .expect('Content-Type', /json/);
  expect(spec.openapi).toBe('3.1.0');
  await SwaggerParser.validate(structuredClone(spec));
  const fontes = [
    ['src/interfaces/http/routes/api.js', ''],
    ['src/interfaces/http/app.js', '/api'],
  ];
  for (const [file, prefix] of fontes) {
    const source = readFileSync(file, 'utf8');
    for (const [, method, path] of source.matchAll(
      /(?:router|app)\.(get|post|put|patch|delete)\(\s*'([^']+)'/g,
    )) {
      if (prefix && !path.startsWith('/api/')) continue;
      if (path === '/api/openapi.json') continue;
      const route = path.replace(prefix, '').replace(/:(\w+)/g, '{$1}');
      expect(spec.paths[route]?.[method], `${method} ${route}`).toBeDefined();
    }
  }
  expect(spec.paths['/pedidos'].post.parameters).toContainEqual({
    $ref: '#/components/parameters/Idempotencia',
  });
  expect(spec.components.schemas.NovoPedido.additionalProperties).toBe(false);
  expect(spec.paths['/auth/login'].post.security).toEqual([]);
  expect(spec.security).toEqual([{ Sessao: [] }]);
  await request(app).get('/api/pedidos').expect(401);
});

it('serve Swagger e seus assets localmente sem liberar scripts inline', async () => {
  const { c } = await contexto();
  const app = criarApp(c);
  const page = await request(app).get('/api/docs/').expect(200).expect('Content-Type', /html/);
  await request(app).get('/api/docs').expect(308).expect('Location', '/api/docs/');
  expect(page.text).toContain('Swagger');
  expect(page.headers['content-security-policy']).toContain("script-src 'self'");
  for (const file of ['swagger-ui-bundle.js', 'swagger-ui.css', 'init.js'])
    await request(app).get(`/api/docs/${file}`).expect(200);
});
