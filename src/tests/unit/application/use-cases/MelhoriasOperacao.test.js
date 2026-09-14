import { describe, expect, it } from 'vitest';
import { contexto } from '../../../helpers/context.js';
import { EditarComandaUseCase } from '../../../../application/use-cases/EditarComandaUseCase.js';
import { ConfirmarReembolsoUseCase } from '../../../../application/use-cases/ConfirmarReembolsoUseCase.js';
import { Comanda } from '../../../../domain/entities/Comanda.js';
import { Permissoes } from '../../../../domain/services/Permissoes.js';

describe('operações protegidas e comandas', () => {
  it('desfaz a alteração quando o registro de auditoria falha', async () => {
    const { c, dados, uow } = await contexto();
    await expect(
      c.acaoAuditada.executar(
        { id: 'admin', nome: 'Administrador', perfil: 'admin', ativo: true },
        'pedidos.criar',
        dados,
        async (tx) => {
          tx.auditoria.registrar = async () => {
            throw new Error('Auditoria indisponível');
          };
          const { CriarPedidoUseCase } =
            await import('../../../../application/use-cases/CriarPedidoUseCase.js');
          return new CriarPedidoUseCase(tx).executar(dados);
        },
      ),
    ).rejects.toThrow('Auditoria indisponível');
    expect((await uow.pedidos.listar()).total).toBe(0);
  });
  it('repete uma criação sem duplicar e rejeita reaproveitar a chave com outro conteúdo', async () => {
    const { c, dados, uow } = await contexto();
    const input = { ...dados, chaveIdempotencia: 'pedido-teste-0001' };
    const [a, b] = await Promise.all([c.criarPedido.executar(input), c.criarPedido.executar(input)]);
    expect(a.id).toBe(b.id);
    expect((await uow.pedidos.listar()).total).toBe(1);
    await expect(c.criarPedido.executar({ ...input, observacao: 'outro' })).rejects.toThrow('Chave');
  });
  it('acrescenta consumo preservando preço antigo, transfere mesa e detecta edição concorrente', async () => {
    const { c, dados, produto, uow } = await contexto();
    const pedido = await c.criarPedido.executar({ ...dados, origem: 'comanda', mesa: '1' });
    await c.salvarProduto.executar({ ...produto, precoCentavos: 2500 });
    const editar = new EditarComandaUseCase(uow);
    const novo = await editar.executar({
      id: pedido.id,
      versao: 0,
      mesa: '2',
      adicionar: [{ produtoId: produto.id, quantidade: 1 }],
    });
    expect(novo).toMatchObject({ mesa: '2', versao: 1, totalCentavos: 6480 });
    expect(novo.itens[0].precoUnitarioCentavos).toBe(1990);
    await expect(editar.executar({ id: pedido.id, versao: 0, mesa: '3' })).rejects.toThrow('atualizada');
  });
  it('exige motivo de retirada e não permite reduzir a conta abaixo do que foi pago', async () => {
    const { c, dados, produto, uow } = await contexto();
    const pedido = await c.criarPedido.executar({
      ...dados,
      origem: 'comanda',
      mesa: '1',
      itens: [
        { produtoId: produto.id, quantidade: 1 },
        { produtoId: produto.id, quantidade: 1 },
      ],
    });
    await c.abrirCaixa.executar({ valorInicialCentavos: 0 });
    await c.registrarPagamento.executar({
      pedidoId: pedido.id,
      forma: 'pix',
      valorCentavos: 3000,
      chaveIdempotencia: 'pagamento-001',
    });
    const editar = new EditarComandaUseCase(uow);
    await expect(
      editar.executar({ id: pedido.id, versao: 0, remover: [{ itemId: pedido.itens[0].id, motivo: '' }] }),
    ).rejects.toThrow('motivo');
    await expect(
      editar.executar({
        id: pedido.id,
        versao: 0,
        remover: [{ itemId: pedido.itens[0].id, motivo: 'Cliente desistiu' }],
      }),
    ).rejects.toThrow('pago');
  });
  it('divide o saldo sem perder centavos', () => {
    expect(Comanda.dividirSaldo(1000, 3)).toEqual([334, 333, 333]);
    expect(() => Comanda.dividirSaldo(10, 0)).toThrow();
  });
  it('cozinha só prepara pedidos; caixa não gerencia usuários ou cancelamentos', () => {
    expect(Permissoes.pode('cozinha', 'pedidos.preparar')).toBe(true);
    expect(Permissoes.pode('cozinha', 'pagamentos.criar')).toBe(false);
    expect(Permissoes.pode('caixa', 'usuarios.gerenciar')).toBe(false);
    expect(Permissoes.pode('caixa', 'pedidos.cancelar')).toBe(false);
    expect(Permissoes.pode('gerente', 'pedidos.cancelar')).toBe(true);
  });
  it('cancela venda de caixa fechado, preserva fechamento e devolve no caixa atual uma única vez', async () => {
    const { c, dados, uow } = await contexto();
    const caixa = await c.abrirCaixa.executar({ valorInicialCentavos: 0 });
    const pedido = await c.criarPedido.executar(dados);
    await c.registrarPagamento.executar({
      pedidoId: pedido.id,
      forma: 'dinheiro',
      valorCentavos: 3980,
      chaveIdempotencia: 'pagamento-002',
    });
    for (const status of ['preparando', 'pronto', 'concluido'])
      await c.atualizarStatus.executar({ id: pedido.id, status });
    await c.fecharCaixa.executar({ id: caixa.id, valorFinalCentavos: 3980 });
    await c.atualizarStatus.executar({ id: pedido.id, status: 'cancelado', motivo: 'Devolução do cliente' });
    expect((await c.consultarCaixa.executar(caixa.id)).esperadoCentavos).toBe(3980);
    const [reembolso] = await uow.financeiro.reembolsosPendentes();
    expect(reembolso).toMatchObject({ pedidoId: pedido.id, valorCentavos: 3980 });
    await c.abrirCaixa.executar({ valorInicialCentavos: 5000 });
    const confirmar = new ConfirmarReembolsoUseCase(uow);
    await confirmar.executar({ id: reembolso.id });
    await confirmar.executar({ id: reembolso.id });
    expect((await c.consultarCaixa.executar()).esperadoCentavos).toBe(1020);
    expect((await c.relatorio.executar()).receitaCentavos).toBe(0);
  });
});
