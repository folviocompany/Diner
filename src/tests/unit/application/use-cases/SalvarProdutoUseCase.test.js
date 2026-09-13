import { expect, it } from 'vitest';
import { contexto } from '../../../helpers/context.js';
it('permite editar e desativar produto preservando id', async () => {
  const { c, produto } = await contexto();
  expect(await c.salvarProduto.executar({ ...produto, nome: 'Lanche especial', ativo: false })).toMatchObject(
    { id: produto.id, nome: 'Lanche especial', ativo: false },
  );
});
it('não permite código externo duplicado nem editar registro inexistente', async () => {
  const { c, produto } = await contexto();
  await expect(c.salvarProduto.executar({ ...produto, id: undefined })).rejects.toThrow();
  await expect(c.salvarProduto.executar({ ...produto, id: 'desconhecido' })).rejects.toThrow(
    'não encontrado',
  );
});
