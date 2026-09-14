<script setup>
import { ref, computed, onMounted } from 'vue';
import { DateTime } from 'luxon';
import { api, query } from '../lib/api.js';
import { money, day, origens } from '../lib/format.js';
import { useAppStore } from '../stores/app.js';
import MetricCard from '../components/MetricCard.vue';
import RevenueChart from '../components/RevenueChart.vue';
import OrderTable from '../components/OrderTable.vue';
import OrderDetail from '../components/OrderDetail.vue';
import { usarAtualizacao } from '../lib/usarAtualizacao.js';
const store = useAppStore();
const report = ref(null);
const semana = ref(null);
const pedidos = ref([]);
const ativos = ref(0);
const caixa = ref(null);
const error = ref('');
const loading = ref(true);
const selected = ref(null);
const dataHoje = ref(day(store.config.timezone));
const dataLabel = computed(() =>
  new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: store.config.timezone,
  }).format(DateTime.fromISO(dataHoje.value, { zone: store.config.timezone }).toJSDate()),
);
const channelMax = computed(() =>
  Math.max(1, ...(report.value?.porOrigem.map((o) => o.receitaCentavos) ?? [])),
);
async function carregar() {
  error.value = '';
  try {
    dataHoje.value = day(store.config.timezone);
    const inicio = DateTime.fromISO(dataHoje.value).minus({ days: 6 }).toISODate();
    const data = await Promise.all([
      api(`/relatorios?${query({ data: dataHoje.value })}`),
      api(`/relatorios?${query({ tipo: 'personalizado', inicio, fim: dataHoje.value })}`),
      api('/pedidos?limit=6'),
      api('/pedidos?status=ativos&limit=1'),
      api('/caixa/atual'),
    ]);
    [report.value, semana.value] = data;
    pedidos.value = data[2].data;
    ativos.value = data[3].total;
    caixa.value = data[4];
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}
onMounted(carregar);
usarAtualizacao(carregar, () => !selected.value);
</script>
<template>
  <div class="page-heading">
    <div>
      <div class="eyebrow">SUA LOJA EM UM OLHAR</div>
      <h1>Visão geral<span class="title-dot">.</span></h1>
      <p>Bom trabalho começa com tudo no lugar.</p>
    </div>
    <div class="heading-actions">
      <span class="date-pill"><i aria-hidden="true" class="pi pi-calendar"></i>{{ dataLabel }}</span
      ><RouterLink to="/pedidos/novo" class="button-primary"
        ><i aria-hidden="true" class="pi pi-plus"></i>Novo pedido</RouterLink
      >
    </div>
  </div>
  <div v-if="error" class="alert error" role="alert">
    {{ error }} <button @click="carregar">Tentar novamente</button>
  </div>
  <div v-if="loading" class="loading-panel">Organizando os números da sua loja…</div>
  <template v-if="report"
    ><section class="metrics-grid">
      <MetricCard
        label="Receita de hoje"
        :value="money(report.receitaCentavos)"
        description="Vendas concluídas no dia"
        icon="pi-arrow-up-right"
      /><MetricCard
        label="Lucro operacional"
        :value="money(report.lucroCentavos)"
        :description="`${report.margemPercentual}% de margem · estimado`"
        icon="pi-chart-line"
        accent
      /><MetricCard
        label="Pedidos concluídos"
        :value="String(report.pedidos).padStart(2, '0')"
        :description="`${ativos} pedidos em andamento`"
        icon="pi-receipt"
      /><MetricCard
        label="Ticket médio"
        :value="money(report.ticketMedioCentavos)"
        description="Receita por pedido concluído"
        icon="pi-wallet"
      />
    </section>
    <div class="dashboard-middle">
      <section class="panel revenue-panel">
        <div class="panel-heading">
          <div>
            <h2>O ritmo da semana</h2>
            <p>Receita dos últimos 7 dias</p>
          </div>
          <span class="legend"><i aria-hidden="true"></i>Receita</span>
        </div>
        <RevenueChart :serie="semana?.serie ?? []" />
        <div class="chart-footer">
          <span>Total no período</span><strong>{{ money(semana?.receitaCentavos) }}</strong
          ><RouterLink to="/relatorios"
            >Explorar relatórios <i aria-hidden="true" class="pi pi-arrow-right"></i
          ></RouterLink>
        </div>
      </section>
      <section class="panel channels-panel">
        <div class="panel-heading">
          <div>
            <h2>De onde vêm as vendas</h2>
            <p>Seus canais, juntos no mesmo lugar</p>
          </div>
        </div>
        <div v-for="channel in report.porOrigem" :key="channel.origem" class="channel-row">
          <div class="channel-title">
            <span :class="['channel-icon', channel.origem]"
              ><i
                aria-hidden="true"
                :class="[
                  'pi',
                  channel.origem === 'ifood'
                    ? 'pi-shopping-bag'
                    : channel.origem === 'comanda'
                      ? 'pi-th-large'
                      : 'pi-shop',
                ]"
              ></i></span
            ><span
              ><strong>{{ origens[channel.origem] }}</strong
              ><small>{{ channel.pedidos }} pedidos concluídos</small></span
            ><b>{{ money(channel.receitaCentavos) }}</b>
          </div>
          <div class="channel-track">
            <span
              :class="channel.origem"
              :style="{ width: `${(channel.receitaCentavos / channelMax) * 100}%` }"
            ></span>
          </div>
        </div>
      </section>
    </div>
    <div class="cash-strip">
      <span class="cash-strip-icon"><i aria-hidden="true" class="pi pi-wallet"></i></span>
      <div>
        <strong>{{ caixa ? 'Caixa aberto. Casa em movimento.' : 'Tudo pronto para começar?' }}</strong
        ><span>{{
          caixa
            ? `Dinheiro esperado na gaveta: ${money(caixa.esperadoCentavos)}`
            : 'Abra o caixa para receber os pagamentos do dia.'
        }}</span>
      </div>
      <RouterLink to="/caixa"
        >{{ caixa ? 'Acompanhar caixa' : 'Abrir caixa' }}<i aria-hidden="true" class="pi pi-arrow-right"></i
      ></RouterLink>
    </div>
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Últimos pedidos</h2>
          <p>Cada pedido, um novo encontro.</p>
        </div>
        <RouterLink to="/pedidos" class="text-link"
          >Ver todos <i aria-hidden="true" class="pi pi-arrow-right"></i
        ></RouterLink>
      </div>
      <OrderTable
        :pedidos="pedidos"
        :timezone="store.config.timezone"
        @select="selected = $event.id"
      /></section></template
  ><OrderDetail :pedido-id="selected" @close="selected = null" @updated="carregar" />
</template>
