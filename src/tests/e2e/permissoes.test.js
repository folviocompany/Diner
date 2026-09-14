import { beforeEach, expect, it } from 'vitest';
import request from 'supertest';
import { contexto, usuario } from '../helpers/context.js';
import { criarApp } from '../../interfaces/http/app.js';

let ctx, app, admin;
beforeEach(async () => {
  ctx = await contexto();
  await usuario(ctx.uow);
  app = criarApp(ctx.c);
  admin = request.agent(app);
  await admin
    .post('/api/auth/login')
    .set('X-Diner-Client', 'web')
    .send({ email: 'teste@diner.local', senha: 'SenhaTeste123!' })
    .expect(200);
});
it('gerencia funcionários, limita cozinha no backend e não inclui senha na auditoria', async () => {
  const r = await admin
    .post('/api/usuarios')
    .set('X-Diner-Client', 'web')
    .send({
      nome: 'Cozinha',
      email: 'cozinha@example.com',
      senha: 'SenhaCozinha123!',
      perfil: 'cozinha',
      ativo: true,
    })
    .expect(201);
  expect(r.body.senhaHash).toBeUndefined();
  const cozinha = request.agent(app);
  await cozinha
    .post('/api/auth/login')
    .set('X-Diner-Client', 'web')
    .send({ email: 'cozinha@example.com', senha: 'SenhaCozinha123!' })
    .expect(200);
  await cozinha.get('/api/relatorios').expect(403);
  await cozinha.get('/api/usuarios').expect(403);
  await cozinha.post('/api/pedidos').set('X-Diner-Client', 'web').send(ctx.dados).expect(403);
  const pedido = await ctx.c.criarPedido.executar(ctx.dados);
  const lista = await cozinha.get('/api/pedidos').expect(200);
  expect(lista.body.data[0].totalCentavos).toBeUndefined();
  expect(lista.body.data[0].itens[0].custoUnitarioCentavos).toBeUndefined();
  await cozinha
    .patch(`/api/pedidos/${pedido.id}/status`)
    .set('X-Diner-Client', 'web')
    .send({ status: 'preparando' })
    .expect(200);
  await cozinha
    .patch(`/api/pedidos/${pedido.id}/status`)
    .set('X-Diner-Client', 'web')
    .send({ status: 'cancelado', motivo: 'Não autorizado' })
    .expect(403);
  const log = await admin.get('/api/auditoria').expect(200);
  expect(log.body.some((a) => a.usuarioNome === 'Cozinha' && a.acao === 'pedidos.preparar')).toBe(true);
  expect(JSON.stringify(log.body)).not.toContain('SenhaCozinha123!');
  await admin
    .put(`/api/usuarios/${r.body.id}`)
    .set('X-Diner-Client', 'web')
    .send({ nome: 'Cozinha', email: 'cozinha@example.com', perfil: 'cozinha', ativo: false })
    .expect(200);
  await cozinha.get('/api/pedidos').expect(401);
});
it('exige chave de criação, repete pedido com a mesma chave e impede reuso com dados diferentes', async () => {
  await admin.post('/api/pedidos').set('X-Diner-Client', 'web').send(ctx.dados).expect(400);
  const criar = (body) =>
    admin
      .post('/api/pedidos')
      .set('X-Diner-Client', 'web')
      .set('Idempotency-Key', 'pedido-e2e-001')
      .send(body);
  const a = await criar(ctx.dados).expect(201),
    b = await criar(ctx.dados).expect(201);
  expect(a.body.id).toBe(b.body.id);
  await criar({ ...ctx.dados, observacao: 'Mudou' }).expect(409);
});
it('não permite desativar o último administrador', async () => {
  const [u] = await ctx.uow.usuarios.listar();
  await admin
    .put(`/api/usuarios/${u.id}`)
    .set('X-Diner-Client', 'web')
    .send({ nome: u.nome, email: u.email, perfil: 'admin', ativo: false })
    .expect(422);
});
