import { createRouter, createWebHistory } from 'vue-router';
import { useAppStore } from './stores/app.js';
const acoesPorRota = {
  '/': 'relatorios.ver',
  '/produtos': 'produtos.gerenciar',
  '/caixa': 'caixa.operar',
  '/relatorios': 'relatorios.ver',
  '/integracoes': 'integracoes.gerenciar',
  '/equipe': 'usuarios.gerenciar',
  '/pedidos/novo': 'pedidos.criar',
};
export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', component: () => import('./views/LoginView.vue'), meta: { public: true } },
    { path: '/', component: () => import('./views/DashboardView.vue'), meta: { title: 'Visão geral' } },
    { path: '/pedidos', component: () => import('./views/PedidosView.vue'), meta: { title: 'Pedidos' } },
    {
      path: '/pedidos/novo',
      component: () => import('./views/NovoPedidoView.vue'),
      meta: { title: 'Novo pedido' },
    },
    { path: '/produtos', component: () => import('./views/ProdutosView.vue'), meta: { title: 'Produtos' } },
    { path: '/caixa', component: () => import('./views/CaixaView.vue'), meta: { title: 'Caixa' } },
    {
      path: '/equipe',
      component: () => import('./views/EquipeView.vue'),
      meta: { title: 'Equipe e histórico' },
    },
    {
      path: '/relatorios',
      component: () => import('./views/RelatoriosView.vue'),
      meta: { title: 'Relatórios' },
    },
    {
      path: '/integracoes',
      component: () => import('./views/IntegracoesView.vue'),
      meta: { title: 'Integrações' },
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
});
router.beforeEach(async (to) => {
  const store = useAppStore();
  if (!store.inicializado) {
    try {
      await store.carregar();
    } catch {
      store.notificar('Servidor indisponível. Verifique se a API está iniciada.', 'error');
    }
  }
  if (!to.meta.public && !store.usuario) return '/login';
  if (store.usuario && acoesPorRota[to.path] && !store.pode(acoesPorRota[to.path])) return '/pedidos';
  if (to.path === '/login' && store.usuario) return store.pode('relatorios.ver') ? '/' : '/pedidos';
});
