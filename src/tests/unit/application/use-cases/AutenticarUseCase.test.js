import { expect, it } from 'vitest';
import { contexto, usuario } from '../../../helpers/context.js';
it('senhas são verificadas e somente hash do token é persistido', async () => {
  const { c, uow } = await contexto();
  await usuario(uow);
  await expect(c.autenticar.executar({ email: 'teste@diner.local', senha: 'ruim' })).rejects.toThrow(
    'incorretos',
  );
  const login = await c.autenticar.executar({ email: 'TESTE@DINER.LOCAL', senha: 'SenhaTeste123!' });
  expect(uow.state.sessoes[0].tokenHash).not.toBe(login.token);
  expect(await c.autenticar.sessao(login.token)).toMatchObject({ nome: 'Teste' });
  await c.autenticar.sair(login.token);
  await expect(c.autenticar.sessao(login.token)).rejects.toThrow();
});
it('sessão vencida é recusada', async () => {
  const { c, uow } = await contexto();
  await usuario(uow);
  const login = await c.autenticar.executar({ email: 'teste@diner.local', senha: 'SenhaTeste123!' });
  uow.state.sessoes[0].expiraEm = new Date(0);
  await expect(c.autenticar.sessao(login.token)).rejects.toThrow('novamente');
});
