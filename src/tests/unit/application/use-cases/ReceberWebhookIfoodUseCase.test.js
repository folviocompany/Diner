import { expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { contexto, evento } from '../../../helpers/context.js';
it('persiste eventos antes de processar, ignora outro estabelecimento e não duplica', async () => {
  const { c, uow } = await contexto();
  const e = evento();
  expect(await c.receberWebhook.executar([e, e, evento({ merchantId: randomUUID() })])).toEqual({
    recebidos: 1,
    duplicados: 1,
    ignorados: 1,
  });
  expect(uow.state.eventos[0].payload).toEqual(e);
  expect(uow.state.pedidos).toHaveLength(0);
  expect((await c.receberWebhook.executar([e])).recebidos).toBe(0);
});
