import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createHmac, randomUUID } from 'node:crypto';
import { criarApp } from '../../interfaces/http/app.js';
import { contexto, usuario, evento } from '../helpers/context.js';
import { day } from '../../../web/src/lib/format.js';

let app, c, agent, produto, dados;
beforeEach(async () => {
  const ctx = await contexto();
  ({ c, produto, dados } = ctx);
  await usuario(ctx.uow);
  app = criarApp(c);
  agent = request.agent(app);
  await agent
    .post('/api/auth/login')
    .set('X-Diner-Client', 'web')
    .send({ email: 'teste@diner.local', senha: 'SenhaTeste123!' })
    .expect(200);
});
const post = (path, body) =>
  agent.post(path).set('X-Diner-Client', 'web').set('Idempotency-Key', randomUUID()).send(body);
const patch = (path, body) => agent.patch(path).set('X-Diner-Client', 'web').send(body);
describe('API de operação', () => {
  it('protege dados e mutações, não expõe hash da senha', async () => {
    await request(app).get('/api/produtos').expect(401);
    await agent.post('/api/produtos').send({}).expect(403);
    const me = await agent.get('/api/auth/me').expect(200);
    expect(me.body).toEqual(expect.objectContaining({ nome: 'Teste' }));
    expect(me.body.senhaHash).toBeUndefined();
  });
  it('valida payload, dinheiro, id e campos não autorizados', async () => {
    await post('/api/pedidos', { ...dados, totalCentavos: 1 }).expect(400);
    await post('/api/pedidos', { ...dados, itens: [{ produtoId: produto.id, quantidade: -1 }] }).expect(400);
    await agent.get('/api/pedidos/invalido').expect(400);
    await agent.get(`/api/pedidos/${randomUUID()}`).expect(404);
    await post('/api/pedidos', { ...dados, origem: 'ifood' }).expect(400);
  });
  it('fluxo integral: produto → comanda → pagamento dividido → conclusão → relatório → caixa', async () => {
    const caixa = (await post('/api/caixas', { valorInicialCentavos: 10000 }).expect(201)).body;
    const pedido = (await post('/api/pedidos', { ...dados, origem: 'comanda', mesa: '04' }).expect(201)).body;
    await patch(`/api/pedidos/${pedido.id}/status`, { status: 'preparando' }).expect(200);
    await patch(`/api/pedidos/${pedido.id}/status`, { status: 'pronto' }).expect(200);
    await patch(`/api/pedidos/${pedido.id}/status`, { status: 'concluido' }).expect(422);
    await agent
      .post(`/api/pedidos/${pedido.id}/pagamentos`)
      .set('X-Diner-Client', 'web')
      .set('Idempotency-Key', 'cash-0001')
      .send({ forma: 'dinheiro', valorCentavos: 2000 })
      .expect(201);
    await agent
      .post(`/api/pedidos/${pedido.id}/pagamentos`)
      .set('X-Diner-Client', 'web')
      .set('Idempotency-Key', 'pix-00001')
      .send({ forma: 'pix', valorCentavos: 1980 })
      .expect(201);
    await patch(`/api/pedidos/${pedido.id}/status`, { status: 'concluido' }).expect(200);
    await post('/api/despesas', {
      descricao: 'Embalagens',
      categoria: 'Operação',
      valorCentavos: 100,
      ocorridoEm: new Date().toISOString(),
    }).expect(201);
    const report = (await agent.get('/api/relatorios').expect(200)).body;
    expect(report).toMatchObject({
      receitaCentavos: 3980,
      custoItensCentavos: 1400,
      despesasCentavos: 100,
      lucroCentavos: 2480,
      pedidos: 1,
    });
    const closed = (await post(`/api/caixas/${caixa.id}/fechar`, { valorFinalCentavos: 11950 }).expect(200))
      .body;
    expect(closed).toMatchObject({ esperadoCentavos: 12000, diferencaCentavos: -50 });
  });
  it('filtra por origem, status, busca, data e paginação', async () => {
    await post('/api/pedidos', { ...dados, origem: 'comanda', mesa: '08', clienteNome: 'Ana' });
    await post('/api/pedidos', dados);
    const result = await agent
      .get(`/api/pedidos?origem=comanda&status=ativos&busca=Ana&limit=1&data=${day()}`)
      .expect(200);
    expect(result.body).toMatchObject({ total: 1, limit: 1, page: 1 });
    expect(result.body.data[0].mesa).toBe('08');
    await agent.get('/api/pedidos?page=-1').expect(400);
  });
  it('edita produto e registra cancelamento com estorno', async () => {
    await agent
      .put(`/api/produtos/${produto.id}`)
      .set('X-Diner-Client', 'web')
      .send({ nome: 'Especial', categoria: 'Lanches', precoCentavos: 2500, custoCentavos: 800, ativo: true })
      .expect(200);
    const p = (await post('/api/pedidos', dados)).body;
    expect(p.totalCentavos).toBe(5000);
    await post('/api/caixas', { valorInicialCentavos: 1000 });
    await agent
      .post(`/api/pedidos/${p.id}/pagamentos`)
      .set('X-Diner-Client', 'web')
      .set('Idempotency-Key', 'cash-0001')
      .send({ forma: 'dinheiro', valorCentavos: 5000 })
      .expect(201);
    await patch(`/api/pedidos/${p.id}/status`, { status: 'cancelado', motivo: 'Cliente desistiu' }).expect(
      200,
    );
    expect((await agent.get('/api/caixa/atual')).body.esperadoCentavos).toBe(1000);
  });
  it('exporta CSV e valida intervalos reais', async () => {
    const result = await agent.get('/api/relatorios/exportar?tipo=semanal&data=2026-09-12').expect(200);
    expect(result.headers['content-type']).toContain('text/csv');
    expect(result.text).toContain('2026-09-07');
    await agent.get('/api/relatorios?data=2026-02-30').expect(422);
  });
  it('logout invalida a sessão', async () => {
    await post('/api/auth/logout', {}).expect(204);
    await agent.get('/api/auth/me').expect(401);
  });
  it('erros inesperados não revelam dados de conexão', async () => {
    c.uow.produtos.listar = async () => {
      throw new Error('mysql://secret:password@internal');
    };
    const result = await agent.get('/api/produtos').expect(500);
    expect(JSON.stringify(result.body)).not.toContain('password');
    expect(result.body.error.requestId).toBeTruthy();
  });
});
describe('webhook iFood', () => {
  const assinar = (body) => createHmac('sha256', 'test-secret').update(body).digest('hex');
  it('aceita assinatura do corpo bruto com espaços e responde antes de processar', async () => {
    const e = evento();
    const body = JSON.stringify(e, null, 2);
    const r = await request(app)
      .post('/api/webhooks/ifood')
      .set('Content-Type', 'application/json')
      .set('X-IFood-Signature', assinar(body))
      .send(body)
      .expect(202);
    expect(r.body.recebidos).toBe(1);
    expect((await c.uow.pedidos.listar()).total).toBe(0);
    const duplicate = await request(app)
      .post('/api/webhooks/ifood')
      .set('Content-Type', 'application/json')
      .set('X-IFood-Signature', assinar(body))
      .send(body);
    expect(duplicate.body.duplicados).toBe(1);
  });
  it.each(['x', '00'.repeat(32), ''])(
    'rejeita assinatura inválida sem erro interno: %s',
    async (signature) => {
      await request(app)
        .post('/api/webhooks/ifood')
        .set('X-IFood-Signature', signature)
        .send(evento())
        .expect(401);
      expect(await c.uow.eventos.listar()).toHaveLength(0);
    },
  );
  it('rejeita alteração do payload, JSON malformado e evento fora do contrato', async () => {
    const original = JSON.stringify(evento());
    await request(app)
      .post('/api/webhooks/ifood')
      .set('X-IFood-Signature', assinar(original))
      .set('Content-Type', 'application/json')
      .send(original + ' ')
      .expect(401);
    for (const body of ['{', '{"id":"bad"}'])
      await request(app)
        .post('/api/webhooks/ifood')
        .set('X-IFood-Signature', assinar(body))
        .set('Content-Type', 'application/json')
        .send(body)
        .expect(400);
  });
  it('aceita lote e heartbeat vazio assinado', async () => {
    for (const value of [[evento(), evento()], []]) {
      const body = JSON.stringify(value);
      await request(app)
        .post('/api/webhooks/ifood')
        .set('X-IFood-Signature', assinar(body))
        .set('Content-Type', 'application/json')
        .send(body)
        .expect(202);
    }
  });
  it('recusa acesso quando integração não configurada', async () => {
    c.config.ifoodClientSecret = '';
    await request(app).post('/api/webhooks/ifood').send(evento()).expect(503);
  });
});
