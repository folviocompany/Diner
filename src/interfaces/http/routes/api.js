import { Router } from 'express';
import { criarControllers } from '../controllers/controllers.js';
import { Permissoes } from '../../../domain/services/Permissoes.js';

export function criarRotas(container) {
  const router = Router();
  const c = criarControllers(container);
  router.use((req, _res, next) => {
    const path = req.path;
    const leitura = req.method === 'GET';
    const acao = path.startsWith('/usuarios')
      ? 'usuarios.gerenciar'
      : path.startsWith('/auditoria')
        ? 'auditoria.ver'
        : path.startsWith('/reembolsos')
          ? 'reembolsos.confirmar'
          : path.startsWith('/relatorios')
            ? 'relatorios.ver'
            : path.startsWith('/despesas')
              ? 'despesas.criar'
              : path.startsWith('/integracoes')
                ? 'integracoes.gerenciar'
                : path.startsWith('/produtos')
                  ? leitura
                    ? 'produtos.ver'
                    : 'produtos.gerenciar'
                  : path.startsWith('/caixa')
                    ? 'caixa.operar'
                    : path.startsWith('/comandas')
                      ? 'comandas.editar'
                      : path.startsWith('/pedidos')
                        ? leitura
                          ? 'pedidos.ver'
                          : path.endsWith('/pagamentos')
                            ? 'pagamentos.criar'
                            : path.endsWith('/status')
                              ? 'pedidos.ver'
                              : 'pedidos.criar'
                        : 'rota.inexistente';
    Permissoes.exigir(req.usuario, acao);
    next();
  });
  router.patch('/comandas/:id', c.editarComanda);
  router.get('/usuarios', c.usuarios);
  router.post('/usuarios', c.usuario);
  router.put('/usuarios/:id', c.usuario);
  router.get('/auditoria', c.auditoria);
  router.get('/reembolsos', c.reembolsos);
  router.post('/reembolsos/:id/confirmar', c.confirmarReembolso);
  router.get('/produtos', c.produtos);
  router.post('/produtos', c.salvarProduto);
  router.put('/produtos/:id', c.salvarProduto);
  router.get('/pedidos', c.pedidos);
  router.get('/pedidos/:id', c.pedido);
  router.post('/pedidos', c.criarPedido);
  router.patch('/pedidos/:id/status', c.status);
  router.post('/pedidos/:id/pagamentos', c.pagamento);
  router.get('/caixa/atual', c.caixaAtual);
  router.get('/caixas', c.caixas);
  router.get('/caixas/:id', c.caixa);
  router.post('/caixas', c.abrirCaixa);
  router.post('/caixas/:id/fechar', c.fecharCaixa);
  router.post('/caixa/movimentos', c.movimentarCaixa);
  router.post('/despesas', c.despesa);
  router.get('/relatorios', c.relatorio);
  router.get('/relatorios/exportar', c.exportar);
  router.get('/integracoes/ifood/eventos', c.eventos);
  router.post('/integracoes/ifood/eventos/:id/reprocessar', c.reprocessar);
  return router;
}
