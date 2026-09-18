import { Router } from 'express';
import { criarControllers } from '../controllers/controllers.js';
import { Permissoes } from '../../../domain/services/Permissoes.js';

const regrasDeAcesso = [
  ['/usuarios', 'usuarios.gerenciar'],
  ['/auditoria', 'auditoria.ver'],
  ['/reembolsos', 'reembolsos.confirmar'],
  ['/relatorios', 'relatorios.ver'],
  ['/despesas', 'despesas.criar'],
  ['/integracoes', 'integracoes.gerenciar'],
  ['/caixa', 'caixa.operar'],
  ['/comandas', 'comandas.editar'],
];

function acaoDaRota(req) {
  if (req.path.startsWith('/produtos')) return req.method === 'GET' ? 'produtos.ver' : 'produtos.gerenciar';
  if (req.path.startsWith('/pedidos')) {
    if (req.method === 'GET') return 'pedidos.ver';
    if (req.path.endsWith('/pagamentos')) return 'pagamentos.criar';
    if (req.path.endsWith('/status')) return 'pedidos.ver';
    return 'pedidos.criar';
  }
  return regrasDeAcesso.find(([prefixo]) => req.path.startsWith(prefixo))?.[1] ?? 'rota.inexistente';
}

export function criarRotas(container) {
  const router = Router();
  const c = criarControllers(container);
  router.use((req, _res, next) => {
    Permissoes.exigir(req.usuario, acaoDaRota(req));
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
