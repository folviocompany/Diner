import { expect, it } from 'vitest';
import * as contratos from '../../../../domain/repositories/contratos.js';
import { contexto } from '../../../helpers/context.js';
it('contratos abstratos falham explicitamente', () => {
  for (const Tipo of Object.values(contratos))
    for (const method of Object.getOwnPropertyNames(Tipo.prototype).filter((m) => m !== 'constructor'))
      expect(() => new Tipo()[method]()).toThrow('não implementado');
});
it('adaptador em memória implementa os mesmos contratos usados pelo Prisma', async () => {
  const { uow } = await contexto();
  expect(uow).toBeInstanceOf(contratos.UnitOfWork);
  for (const [key, name] of Object.entries({
    pedidos: 'PedidoRepository',
    produtos: 'ProdutoRepository',
    caixas: 'CaixaRepository',
    financeiro: 'FinanceiroRepository',
    eventos: 'EventoRepository',
    usuarios: 'UsuarioRepository',
  }))
    expect(uow[key]).toBeInstanceOf(contratos[name]);
});
