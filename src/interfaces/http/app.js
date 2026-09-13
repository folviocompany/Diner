import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { criarRotas } from './routes/api.js';
import { tratarErro } from './middlewares/errors.js';
import { webhookHandler } from '../webhooks/ifood/handler.js';
import { loginSchema } from './schemas.js';
import { DomainError } from '../../shared/errors/DomainError.js';

export function criarApp(container) {
  const app = express();
  const { config } = container;
  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxyHops ?? 0);
  app.use((req, res, next) => {
    req.id = randomUUID();
    res.setHeader('X-Request-Id', req.id);
    next();
  });
  app.use(
    helmet({
      contentSecurityPolicy: { directives: { 'upgrade-insecure-requests': config.production ? [] : null } },
      strictTransportSecurity: config.production,
    }),
  );
  app.post(
    '/api/webhooks/ifood',
    express.raw({ type: 'application/json', limit: '1mb' }),
    webhookHandler(container),
  );
  app.use(express.json({ limit: '128kb' }));
  app.use(cookieParser());
  app.get('/api/health', async (_req, res) => {
    await container.uow.caixas.atual();
    res.json({ status: 'ok', mode: config.demo ? 'demo' : 'mysql' });
  });
  app.use('/api', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.headers['x-diner-client'] !== 'web')
      throw new DomainError('Cabeçalho X-Diner-Client obrigatório.', 'REQUISICAO_INVALIDA', 403);
    next();
  });
  const cookie = { httpOnly: true, sameSite: 'strict', secure: !!config.production, path: '/' };
  app.post(
    '/api/auth/login',
    rateLimit({
      windowMs: 15 * 60000,
      limit: 30,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      message: { error: { code: 'MUITAS_TENTATIVAS', message: 'Muitas tentativas. Aguarde 15 minutos.' } },
    }),
    async (req, res) => {
      const result = await container.autenticar.executar(loginSchema.parse(req.body));
      res.cookie('diner_session', result.token, { ...cookie, expires: result.expiraEm }).json(result.usuario);
    },
  );
  app.post('/api/auth/logout', async (req, res) => {
    if (req.cookies.diner_session) await container.autenticar.sair(req.cookies.diner_session);
    res.clearCookie('diner_session', cookie).status(204).end();
  });
  app.use('/api', async (req, _res, next) => {
    if (!req.cookies.diner_session)
      throw new DomainError('Entre para acessar o sistema.', 'NAO_AUTORIZADO', 401);
    req.usuario = await container.autenticar.sessao(req.cookies.diner_session);
    next();
  });
  app.get('/api/auth/me', (req, res) => res.json(req.usuario));
  app.get('/api/config', (_req, res) =>
    res.json({
      timezone: config.timezone,
      demo: config.demo,
      ifoodConfigurado: !!(config.ifoodClientId && config.ifoodClientSecret && config.ifoodMerchantId),
      ifoodComissaoBps: config.ifoodComissaoBps ?? 0,
    }),
  );
  app.use('/api', criarRotas(container));
  app.use('/api', (_req, _res, next) => next(new DomainError('Rota não encontrada.', 'NAO_ENCONTRADO', 404)));
  const dist = resolve('dist');
  if (existsSync(resolve(dist, 'index.html'))) {
    app.use(express.static(dist));
    app.get('/{*path}', (_req, res) => res.sendFile(resolve(dist, 'index.html')));
  }
  app.use(tratarErro);
  return app;
}
