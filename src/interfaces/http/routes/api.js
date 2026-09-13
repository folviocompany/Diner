import { Router } from 'express';
import { criarControllers } from '../controllers/controllers.js';

export function criarRotas(container) {
  const router = Router();
  const c = criarControllers(container);
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
