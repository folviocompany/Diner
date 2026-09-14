import { Router } from 'express';
import swaggerUi from 'swagger-ui-dist';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openapi } from './openapi.js';

export function documentacaoRouter() {
  const router = Router({ strict: true });
  router.get('/openapi.json', (_req, res) => res.json(openapi));
  router.get('/docs', (_req, res) => res.redirect(308, '/api/docs/'));
  router.get('/docs/', (_req, res) =>
    res.type('html').send(`<!doctype html>
<html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Diner · Swagger</title><link rel="stylesheet" href="/api/docs/swagger-ui.css"></head>
<body><div id="swagger-ui"></div><script src="/api/docs/swagger-ui-bundle.js"></script><script src="/api/docs/init.js"></script></body></html>`),
  );
  for (const file of ['swagger-ui-bundle.js', 'swagger-ui.css'])
    router.get(`/docs/${file}`, (_req, res) => res.sendFile(resolve(swaggerUi.getAbsoluteFSPath(), file)));
  router.get('/docs/init.js', (_req, res) =>
    res.sendFile(fileURLToPath(new URL('./init.js', import.meta.url))),
  );
  return router;
}
