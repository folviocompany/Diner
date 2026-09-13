import { z } from 'zod';
import { DateTime } from 'luxon';

export function carregarConfig(env = process.env) {
  const schema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    HOST: z.string().default('127.0.0.1'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3001),
    STORE_TIMEZONE: z.string().default('America/Manaus'),
    SESSION_HOURS: z.coerce.number().min(1).max(168).default(12),
    WORKER_INTERVAL_MS: z.coerce.number().int().min(100).default(2000),
    DEMO_MODE: z.enum(['true', 'false']).default('false'),
    IFOOD_CLIENT_ID: z.string().default(''),
    IFOOD_CLIENT_SECRET: z.string().default(''),
    IFOOD_MERCHANT_ID: z.string().default(''),
    IFOOD_COMISSAO_BPS: z.coerce.number().int().min(0).max(10000).default(0),
  });
  const data = schema.parse(env);
  if (!DateTime.now().setZone(data.STORE_TIMEZONE).isValid) throw new Error('STORE_TIMEZONE inválido.');
  if (data.NODE_ENV === 'production' && data.DEMO_MODE === 'true')
    throw new Error('O modo de demonstração não pode ser usado em produção.');
  return {
    production: data.NODE_ENV === 'production',
    host: data.HOST,
    port: data.PORT,
    timezone: data.STORE_TIMEZONE,
    sessionHours: data.SESSION_HOURS,
    workerInterval: data.WORKER_INTERVAL_MS,
    demo: data.DEMO_MODE === 'true',
    ifoodClientId: data.IFOOD_CLIENT_ID,
    ifoodClientSecret: data.IFOOD_CLIENT_SECRET,
    ifoodMerchantId: data.IFOOD_MERCHANT_ID,
    ifoodComissaoBps: data.IFOOD_COMISSAO_BPS,
  };
}
