<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAppStore } from './stores/app.js';
const route = useRoute();
const router = useRouter();
const store = useAppStore();
const menuOpen = ref(false);
const links = [
  { path: '/', title: 'Visão geral', icon: 'pi-chart-pie' },
  { path: '/pedidos', title: 'Pedidos', icon: 'pi-receipt' },
  { path: '/produtos', title: 'Produtos', icon: 'pi-box' },
  { path: '/caixa', title: 'Caixa', icon: 'pi-wallet' },
  { path: '/relatorios', title: 'Relatórios', icon: 'pi-chart-bar' },
];
async function logout() {
  try {
    await store.sair();
    router.push('/login');
  } catch (e) {
    store.notificar(e.message, 'error');
  }
}
function expired() {
  store.usuario = null;
  router.push('/login');
}
onMounted(() => window.addEventListener('diner:unauthorized', expired));
onUnmounted(() => window.removeEventListener('diner:unauthorized', expired));
</script>
<template>
  <div v-if="store.aviso" class="toast" :class="store.aviso.tipo" role="status">
    <i
      aria-hidden="true"
      :class="['pi', store.aviso.tipo === 'error' ? 'pi-exclamation-circle' : 'pi-check-circle']"
    ></i
    >{{ store.aviso.message
    }}<button class="icon-button" aria-label="Fechar aviso" @click="store.aviso = null">
      <i aria-hidden="true" class="pi pi-times"></i>
    </button>
  </div>
  <RouterView v-if="route.meta.public" />
  <div v-else-if="store.usuario" class="app-layout">
    <button
      v-if="menuOpen"
      class="sidebar-backdrop"
      aria-label="Fechar menu"
      @click="menuOpen = false"
    ></button>
    <aside class="sidebar" :class="{ open: menuOpen }">
      <RouterLink to="/" class="brand" aria-label="Diner, início"
        >diner<span class="brand-dot">.</span><span class="brand-caption">GESTÃO DA LOJA</span></RouterLink
      >
      <div class="store-switch">
        <span class="store-symbol"><i aria-hidden="true" class="pi pi-shop"></i></span>
        <div><strong>Minha loja</strong><small>Operação principal</small></div>
        <span class="online-dot"></span>
      </div>
      <p class="nav-label">OPERAÇÃO</p>
      <nav aria-label="Navegação principal">
        <RouterLink
          v-for="link in links"
          :key="link.path"
          :to="link.path"
          :class="{ active: link.path === '/' ? route.path === '/' : route.path.startsWith(link.path) }"
          @click="menuOpen = false"
          ><i aria-hidden="true" :class="['pi', link.icon]"></i>{{ link.title
          }}<i aria-hidden="true" v-if="route.path === link.path" class="pi pi-angle-right nav-arrow"></i
        ></RouterLink>
      </nav>
      <p class="nav-label management-label">GESTÃO</p>
      <nav>
        <RouterLink
          to="/integracoes"
          :class="{ active: route.path === '/integracoes' }"
          @click="menuOpen = false"
          ><i aria-hidden="true" class="pi pi-link"></i>Integrações</RouterLink
        >
      </nav>
      <div class="sidebar-bottom">
        <div class="sidebar-note">
          <i aria-hidden="true" class="pi pi-sparkles"></i><strong>Mais tempo para servir bem.</strong>
          <p>Sua operação organizada, do pedido ao resultado.</p>
        </div>
        <button class="user-profile" title="Sair da conta" @click="logout">
          <span class="avatar">{{ store.usuario.nome.slice(0, 2).toUpperCase() }}</span
          ><span
            ><strong>{{ store.usuario.nome }}</strong
            ><small>Administrador</small></span
          ><i aria-hidden="true" class="pi pi-sign-out"></i>
        </button>
      </div>
    </aside>
    <div class="app-main">
      <header class="topbar">
        <div class="breadcrumb">
          <button class="icon-button mobile-toggle" aria-label="Abrir menu" @click="menuOpen = true">
            <i aria-hidden="true" class="pi pi-bars"></i></button
          ><span>Minha loja</span><i aria-hidden="true" class="pi pi-angle-right"></i
          ><strong>{{ route.meta.title }}</strong>
        </div>
        <div class="topbar-right">
          <span class="operating"
            ><span class="online-dot"></span
            >{{ store.config.demo ? 'Demonstração' : 'Sistema conectado' }}</span
          ><span class="topbar-divider"></span
          ><span class="mini-avatar">{{ store.usuario.nome.slice(0, 1) }}</span>
        </div>
      </header>
      <div v-if="store.config.demo" class="demo-banner">
        <i aria-hidden="true" class="pi pi-info-circle"></i>Ambiente de demonstração · dados fictícios,
        reiniciados ao desligar.
      </div>
      <main class="page-content"><RouterView /></main>
      <footer class="page-footer">
        <span>diner. <span>Feito para o dia a dia da sua loja.</span></span
        ><span>Valores em reais · {{ store.config.timezone }}</span>
      </footer>
    </div>
  </div>
  <div v-else class="boot-state">Carregando Diner…</div>
</template>
