import { DomainError } from '../../shared/errors/DomainError.js';

export class IfoodGateway {
  constructor({ clientId, clientSecret, fetcher = fetch }) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.fetcher = fetcher;
    this.base = 'https://merchant-api.ifood.com.br';
    this.token = null;
    this.expiraEm = 0;
  }
  async autenticar() {
    if (this.token && this.expiraEm > Date.now()) return this.token;
    if (!this.clientId || !this.clientSecret)
      throw new DomainError('Configure as credenciais iFood para processar eventos.');
    const response = await this.fetcher(`${this.base}/authentication/v1.0/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grantType: 'client_credentials',
        clientId: this.clientId,
        clientSecret: this.clientSecret,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new DomainError(`Autenticação iFood indisponível (HTTP ${response.status}).`);
    const data = await response.json();
    if (typeof data.accessToken !== 'string' || !data.expiresIn)
      throw new DomainError('Resposta de autenticação iFood inválida.');
    this.token = data.accessToken;
    this.expiraEm = Date.now() + Math.max(0, Number(data.expiresIn) - 60) * 1000;
    return this.token;
  }
  async buscarPedido(id) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const token = await this.autenticar();
      const response = await this.fetcher(`${this.base}/order/v1.0/orders/${encodeURIComponent(id)}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(8000),
      });
      if (response.status === 401 && attempt === 0) {
        this.token = null;
        continue;
      }
      if (!response.ok)
        throw new DomainError(`Consulta do pedido iFood indisponível (HTTP ${response.status}).`);
      return response.json();
    }
  }
}
