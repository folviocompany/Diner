<script setup>
import { ref, onMounted, watch, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import { api, query } from '../lib/api.js';
import { origens, statusNomes } from '../lib/format.js';
import { useAppStore } from '../stores/app.js';
import OrderTable from '../components/OrderTable.vue';
import OrderDetail from '../components/OrderDetail.vue';
import { usarAtualizacao } from '../lib/usarAtualizacao.js';
const route = useRoute();
const store = useAppStore();
const data = ref({ data: [], total: 0 });
const origem = ref('');
const status = ref('');
const busca = ref('');
const date = ref('');
const page = ref(1);
const busy = ref(false);
const error = ref('');
const selected = ref(route.query.pedido ?? null);
const atualizadoEm = ref(null);
const som = ref(false);
let audio;
let maiorNumero = null;
async function ativarSom() {
  try {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    await audio.resume();
    som.value = !som.value;
  } catch {
    store.notificar('O navegador não permitiu ativar o som.', 'error');
  }
}
function avisar() {
  if (!som.value || !audio) return;
  const oscillator = audio.createOscillator(),
    gain = audio.createGain();
  oscillator.connect(gain);
  gain.connect(audio.destination);
  gain.gain.value = 0.08;
  oscillator.frequency.value = 740;
  oscillator.start();
  oscillator.stop(audio.currentTime + 0.25);
}
let timer;
let request = 0;
async function carregar() {
  const current = ++request;
  busy.value = true;
  error.value = '';
  try {
    const result = await api(
      `/pedidos?${query({ origem: origem.value, status: status.value, busca: busca.value, data: date.value, page: page.value, limit: 15 })}`,
    );
    if (current === request) {
      const maior = Math.max(0, ...result.data.map((p) => p.numero));
      if (maiorNumero !== null && maior > maiorNumero) {
        store.notificar('Novo pedido recebido.');
        avisar();
      }
      maiorNumero = Math.max(maiorNumero ?? 0, maior);
      data.value = result;
      atualizadoEm.value = new Date();
    }
  } catch (e) {
    if (current === request) error.value = e.message;
  } finally {
    if (current === request) busy.value = false;
  }
}
watch([origem, status, date], () => {
  page.value = 1;
  carregar();
});
watch(busca, () => {
  clearTimeout(timer);
  timer = setTimeout(() => {
    page.value = 1;
    carregar();
  }, 300);
});
onMounted(carregar);
usarAtualizacao(carregar, () => !busy.value);
onUnmounted(() => {
  clearTimeout(timer);
  request++;
  audio?.close();
});
</script>
<template>
  <div class="page-heading">
    <div>
      <span class="eyebrow">TODOS OS CANAIS, UMA OPERAÇÃO</span>
      <h1>Pedidos<span class="title-dot">.</span></h1>
      <p>Acompanhe cada pedido, da chegada à entrega.</p>
    </div>
    <RouterLink v-if="store.pode('pedidos.criar')" to="/pedidos/novo" class="button-primary"
      ><i aria-hidden="true" class="pi pi-plus"></i>Novo pedido</RouterLink
    >
  </div>
  <section class="panel">
    <div class="filter-bar">
      <small class="muted"
        >Atualização automática a cada 10 s ·
        {{ atualizadoEm ? `Última: ${atualizadoEm.toLocaleTimeString('pt-BR')}` : 'Conectando…' }}</small
      ><button class="text-link" @click="ativarSom">{{ som ? 'Desativar som' : 'Ativar som' }}</button>
    </div>
    <div class="filter-bar">
      <div class="segmented" aria-label="Filtrar por origem">
        <button :class="{ selected: origem === '' }" @click="origem = ''">Todos os canais</button
        ><button
          v-for="(nome, k) in origens"
          :key="k"
          :class="{ selected: origem === k }"
          @click="origem = k"
        >
          {{ nome }}
        </button>
      </div>
      <button class="icon-button" aria-label="Atualizar pedidos" :disabled="busy" @click="carregar">
        <i aria-hidden="true" class="pi pi-refresh" :class="{ 'pi-spin': busy }"></i>
      </button>
    </div>
    <div class="filter-inputs">
      <label class="search-input"
        ><i aria-hidden="true" class="pi pi-search"></i
        ><input
          v-model="busca"
          aria-label="Buscar pedido"
          placeholder="Buscar número, cliente ou mesa" /></label
      ><select v-model="status" aria-label="Filtrar status">
        <option value="">Todos os status</option>
        <option value="ativos">Em andamento</option>
        <option v-for="(nome, k) in statusNomes" :key="k" :value="k">{{ nome }}</option></select
      ><input v-model="date" type="date" aria-label="Data dos pedidos" /><button
        v-if="date"
        class="text-link"
        @click="date = ''"
      >
        Limpar data
      </button>
    </div>
    <div v-if="error" class="alert error" role="alert">{{ error }}</div>
    <p v-if="busy" class="loading-inline" role="status">Atualizando pedidos…</p>
    <OrderTable :pedidos="data.data" :timezone="store.config.timezone" @select="selected = $event.id" />
    <div class="pagination">
      <span>{{ data.total }} pedidos encontrados</span>
      <div>
        <button
          class="icon-button"
          :disabled="page <= 1 || busy"
          aria-label="Página anterior"
          @click="
            page--;
            carregar();
          "
        >
          <i aria-hidden="true" class="pi pi-angle-left"></i></button
        ><span>Página {{ page }} de {{ Math.max(1, Math.ceil(data.total / 15)) }}</span
        ><button
          class="icon-button"
          :disabled="page * 15 >= data.total || busy"
          aria-label="Próxima página"
          @click="
            page++;
            carregar();
          "
        >
          <i aria-hidden="true" class="pi pi-angle-right"></i>
        </button>
      </div>
    </div>
  </section>
  <OrderDetail :pedido-id="selected" @close="selected = null" @updated="carregar" />
</template>
