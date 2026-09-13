import { expect, it, vi } from 'vitest';
import { IfoodGateway } from '../../../infra/ifood/IfoodGateway.js';
it('autentica na API oficial, reutiliza token e codifica caminho do pedido', async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ accessToken: 'token', expiresIn: 3600 }))
    .mockImplementation(async () => Response.json({ id: 'pedido' }));
  const gateway = new IfoodGateway({ clientId: 'client', clientSecret: 'secret', fetcher });
  await gateway.buscarPedido('abc');
  await gateway.buscarPedido('a/b');
  expect(fetcher).toHaveBeenCalledTimes(3);
  expect(fetcher.mock.calls[0][0]).toBe('https://merchant-api.ifood.com.br/authentication/v1.0/oauth/token');
  expect(fetcher.mock.calls[0][1].body.get('grantType')).toBe('client_credentials');
  expect(fetcher.mock.calls[2][0]).toContain('a%2Fb');
});
it('renova token após HTTP 401 e trata indisponibilidade sem vazar resposta', async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ accessToken: 'old', expiresIn: 3600 }))
    .mockResolvedValueOnce(new Response('', { status: 401 }))
    .mockResolvedValueOnce(Response.json({ accessToken: 'new', expiresIn: 3600 }))
    .mockResolvedValueOnce(Response.json({ id: 'ok' }));
  const gateway = new IfoodGateway({ clientId: 'client', clientSecret: 'secret', fetcher });
  expect(await gateway.buscarPedido('abc')).toEqual({ id: 'ok' });
  expect(fetcher.mock.calls[3][1].headers.Authorization).toBe('Bearer new');
});
