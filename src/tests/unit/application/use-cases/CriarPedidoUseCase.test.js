import { expect, it } from 'vitest';
import { contexto } from '../../../helpers/context.js';
it('cria pedido com snapshot de preço/custo e preserva após edição de produto', async () => {
  const { c, dados, produto } = await contexto();
  const p = await c.criarPedido.executar({ ...dados, descontoCentavos: 100, acrescimoCentavos: 50 });
  expect(p).toMatchObject({
    status: 'recebido',
    subtotalCentavos: 3980,
    custoItensCentavos: 1400,
    totalCentavos: 3930,
  });
  await c.salvarProduto.executar({ ...produto, precoCentavos: 3000, custoCentavos: 900 });
  expect((await c.uow.pedidos.buscarPorId(p.id)).itens[0]).toMatchObject({
    precoUnitarioCentavos: 1990,
    custoUnitarioCentavos: 700,
  });
});
it('exige mesa, rejeita iFood manual e desconto acima do valor', async () => {
  const { c, dados } = await contexto();
  await expect(c.criarPedido.executar({ ...dados, origem: 'comanda' })).rejects.toThrow('mesa');
  await expect(c.criarPedido.executar({ ...dados, origem: 'ifood' })).rejects.toThrow('integração');
  await expect(c.criarPedido.executar({ ...dados, descontoCentavos: 5000 })).rejects.toThrow('Desconto');
  expect((await c.uow.pedidos.listar()).total).toBe(0);
});
it('rejeita produto inativo e inexistente sem salvar parcialmente', async () => {
  const { c, produto, dados } = await contexto();
  await c.salvarProduto.executar({ ...produto, ativo: false });
  await expect(c.criarPedido.executar(dados)).rejects.toThrow('indisponível');
  await expect(
    c.criarPedido.executar({ ...dados, itens: [{ produtoId: 'inexistente', quantidade: 1 }] }),
  ).rejects.toThrow('não encontrado');
});
