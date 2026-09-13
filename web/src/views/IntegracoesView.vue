<script setup>
import { ref, onMounted } from 'vue';
import { api } from '../lib/api.js';
import { dateTime } from '../lib/format.js';
import { useAppStore } from '../stores/app.js';
const store = useAppStore();
const eventos = ref([]);
const busy = ref(false);
const error = ref('');
const processing = ref(null);
const nomes = {
  pendente: 'Aguardando',
  processando: 'Processando',
  processado: 'Processado',
  ignorado: 'Ignorado',
  falhou: 'Falhou',
};
async function carregar() {
  busy.value = true;
  error.value = '';
  try {
    eventos.value = await api('/integracoes/ifood/eventos');
  } catch (e) {
    error.value = e.message;
  } finally {
    busy.value = false;
  }
}
async function reprocessar(e) {
  processing.value = e.id;
  try {
    await api(`/integracoes/ifood/eventos/${e.id}/reprocessar`, { method: 'POST' });
    await carregar();
    store.notificar('Evento agendado para reprocessamento.');
  } catch (e) {
    store.notificar(e.message, 'error');
  } finally {
    processing.value = null;
  }
}
onMounted(carregar);
</script>
<template>
  <div class="page-heading">
    <div>
      <span class="eyebrow">SUA LOJA, BEM CONECTADA</span>
      <h1>Integrações<span class="title-dot">.</span></h1>
      <p>Pedidos de fora. Organização de dentro.</p>
    </div>
    <PButton label="Atualizar" icon="pi pi-refresh" outlined :loading="busy" @click="carregar" />
  </div>
  <section class="panel integration-card">
    <div class="ifood-logo">iFood<span>⌣</span></div>
    <div class="integration-copy">
      <h2>iFood</h2>
      <p>Receba os pedidos automaticamente e acompanhe os eventos de integração.</p>
      <span class="status-badge" :class="store.config.ifoodConfigurado ? 'concluido' : 'recebido'"
        ><span class="status-dot"></span
        >{{ store.config.ifoodConfigurado ? 'Credenciais configuradas' : 'Aguardando configuração' }}</span
      >
    </div>
    <div class="integration-fee">
      <span>Comissão configurada</span><strong>{{ (store.config.ifoodComissaoBps / 100).toFixed(2) }}%</strong
      ><small>Estimativa conforme contrato</small>
    </div>
  </section>
  <div v-if="!store.config.ifoodConfigurado" class="integration-setup panel">
    <h2>Pronto para conectar sua loja</h2>
    <p>
      Configure as credenciais e o estabelecimento no ambiente do servidor. Depois, cadastre o endereço
      público do webhook no portal iFood e associe os códigos PDV aos seus produtos.
    </p>
    <div class="setup-steps">
      <div>
        <span>01</span><strong>Credenciais da loja</strong>
        <p>Client ID, Client Secret e Merchant ID do seu aplicativo iFood.</p>
      </div>
      <div>
        <span>02</span><strong>Catálogo vinculado</strong>
        <p>Preencha o código externo iFood em cada produto e mantenha os custos atualizados.</p>
      </div>
      <div>
        <span>03</span><strong>Validação da integração</strong>
        <p>Cadastre o webhook HTTPS e valide pedidos de teste no portal iFood.</p>
      </div>
    </div>
    <RouterLink to="/produtos" class="text-link"
      >Vincular produtos <i aria-hidden="true" class="pi pi-arrow-right"></i
    ></RouterLink>
  </div>
  <div v-if="error" class="alert error" role="alert">{{ error }}</div>
  <section class="panel history-panel">
    <div class="panel-heading">
      <div>
        <h2>Eventos recebidos</h2>
        <p>Últimos 100 eventos · tentativas automáticas e reprocessamento</p>
      </div>
      <span class="category-badge">{{ eventos.length }} eventos</span>
    </div>
    <div class="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Evento / pedido</th>
            <th>Recebido em</th>
            <th>Status</th>
            <th>Tentativas</th>
            <th>Detalhe</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="e in eventos" :key="e.id">
            <td>
              <strong>{{ e.code }}</strong
              ><small class="muted">{{ e.orderId.slice(0, 12) }}…</small>
            </td>
            <td>{{ dateTime(e.recebidoEm, store.config.timezone) }}</td>
            <td>
              <span
                class="status-badge"
                :class="
                  e.status === 'falhou' ? 'cancelado' : e.status === 'processado' ? 'concluido' : 'recebido'
                "
                >{{ nomes[e.status] }}</span
              >
            </td>
            <td>{{ e.tentativas }}</td>
            <td class="event-error">{{ e.erro || '—' }}</td>
            <td>
              <PButton
                v-if="['falhou', 'pendente'].includes(e.status)"
                label="Reprocessar"
                size="small"
                text
                :loading="processing === e.id"
                @click="reprocessar(e)"
              />
            </td>
          </tr>
          <tr v-if="!eventos.length">
            <td colspan="6">
              <div class="empty-state">
                <i aria-hidden="true" class="pi pi-link"></i><strong>Aguardando o primeiro evento</strong>
                <p>Quando o iFood enviar um pedido, você poderá acompanhar o processamento aqui.</p>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
