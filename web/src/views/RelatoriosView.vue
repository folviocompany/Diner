<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { DateTime } from 'luxon';
import { api, query } from '../lib/api.js';
import { money, day, dateTime, origens } from '../lib/format.js';
import { useAppStore } from '../stores/app.js';
import MetricCard from '../components/MetricCard.vue';
import RevenueChart from '../components/RevenueChart.vue';
import MoneyInput from '../components/MoneyInput.vue';
const store = useAppStore();
const tipo = ref('semanal');
const data = ref(day(store.config.timezone));
const inicio = ref(data.value);
const fim = ref(data.value);
const report = ref(null);
const error = ref('');
const busy = ref(false);
let request = 0;
const modal = ref(false);
const descricao = ref('');
const categoria = ref('Operacional');
const valor = ref(0);
const despesaData = ref(data.value);
const saving = ref(false);
const formError = ref('');
const filtro = computed(() =>
  tipo.value === 'personalizado'
    ? { tipo: tipo.value, inicio: inicio.value, fim: fim.value }
    : { tipo: tipo.value, data: data.value },
);
const exportUrl = computed(() => `/api/relatorios/exportar?${query(filtro.value)}`);
async function carregar() {
  const current = ++request;
  busy.value = true;
  error.value = '';
  try {
    const result = await api(`/relatorios?${query(filtro.value)}`);
    if (current === request) report.value = result;
  } catch (e) {
    if (current === request) error.value = e.message;
  } finally {
    if (current === request) busy.value = false;
  }
}
async function salvarDespesa() {
  saving.value = true;
  formError.value = '';
  try {
    await api('/despesas', {
      method: 'POST',
      body: {
        descricao: descricao.value,
        categoria: categoria.value,
        valorCentavos: valor.value,
        ocorridoEm: DateTime.fromISO(despesaData.value, { zone: store.config.timezone })
          .set({ hour: 12 })
          .toISO(),
      },
    });
    modal.value = false;
    descricao.value = '';
    valor.value = 0;
    await carregar();
    store.notificar('Despesa registrada.');
  } catch (e) {
    formError.value = e.message;
  } finally {
    saving.value = false;
  }
}
watch([tipo, data, inicio, fim], carregar);
onMounted(carregar);
</script>
<template>
  <div class="page-heading">
    <div>
      <span class="eyebrow">CLAREZA PARA CRESCER</span>
      <h1>Relatórios<span class="title-dot">.</span></h1>
      <p>Entenda o que entrou, o que custou e o que ficou.</p>
    </div>
    <div class="heading-actions">
      <PButton
        label="Registrar despesa"
        icon="pi pi-plus"
        outlined
        @click="
          formError = '';
          modal = true;
        "
      /><a :href="exportUrl" class="button-primary" download
        ><i aria-hidden="true" class="pi pi-download"></i>Exportar CSV</a
      >
    </div>
  </div>
  <section v-if="report?.ajustes?.length" class="panel">
    <h2>Ajustes por cancelamento</h2>
    <p>
      Receita e custo foram revertidos na data do cancelamento. A venda permanece no período original; taxas
      já incorridas são mantidas. Quantidades vendidas representam o histórico antes dos ajustes.
    </p>
    <div v-for="ajuste in report.ajustes" :key="ajuste.id" class="detail-item">
      <span
        >Pedido #{{ ajuste.numero }} · {{ dateTime(ajuste.ocorridoEm, store.config.timezone) }} ·
        {{ ajuste.motivo }}</span
      >
      <strong>{{ money(ajuste.receitaCentavos) }}</strong>
    </div>
  </section>
  <div class="report-filters panel">
    <div class="segmented">
      <button
        v-for="(label, value) in {
          diario: 'Dia',
          semanal: 'Semana',
          mensal: 'Mês',
          personalizado: 'Personalizado',
        }"
        :key="value"
        :class="{ selected: tipo === value }"
        @click="tipo = value"
      >
        {{ label }}
      </button>
    </div>
    <div v-if="tipo === 'personalizado'" class="date-range">
      <label>De<input v-model="inicio" type="date" required aria-label="Início do período" /></label
      ><label>Até<input v-model="fim" type="date" required aria-label="Fim do período" /></label>
    </div>
    <input v-else v-model="data" type="date" required aria-label="Data de referência" /><span
      v-if="busy"
      class="muted"
      role="status"
      ><i aria-hidden="true" class="pi pi-spin pi-spinner"></i> Atualizando</span
    >
  </div>
  <div v-if="error" class="alert error" role="alert">{{ error }}</div>
  <template v-if="report"
    ><div class="metrics-grid">
      <MetricCard
        label="Receita da loja"
        :value="money(report.receitaCentavos)"
        description="Vendas concluídas no período"
        icon="pi-arrow-up-right"
      /><MetricCard
        label="Custos e despesas"
        :value="money(report.custoItensCentavos + report.taxasCentavos + report.despesasCentavos)"
        description="Produtos, taxas e despesas"
        icon="pi-arrow-down-right"
      /><MetricCard
        label="Lucro operacional"
        :value="money(report.lucroCentavos)"
        :description="`${report.margemPercentual}% de margem · estimado`"
        icon="pi-chart-line"
        accent
      /><MetricCard
        label="Pedidos concluídos"
        :value="String(report.pedidos)"
        :description="`Ticket médio de ${money(report.ticketMedioCentavos)}`"
        icon="pi-receipt"
      />
    </div>
    <div class="two-columns report-columns">
      <section class="panel">
        <div class="panel-heading">
          <div>
            <h2>Receita ao longo do período</h2>
            <p>Data de conclusão · fuso da loja</p>
          </div>
        </div>
        <RevenueChart :serie="report.serie" />
      </section>
      <section class="panel">
        <div class="panel-heading">
          <div>
            <h2>Como chegamos ao resultado</h2>
            <p>Receita menos os custos registrados</p>
          </div>
        </div>
        <div class="result-breakdown">
          <div>
            <span>Receita</span><strong>{{ money(report.receitaCentavos) }}</strong>
          </div>
          <div>
            <span>Custo dos produtos</span><span>− {{ money(report.custoItensCentavos) }}</span>
          </div>
          <div>
            <span>Taxas dos pedidos</span><span>− {{ money(report.taxasCentavos) }}</span>
          </div>
          <div>
            <span>Despesas operacionais</span><span>− {{ money(report.despesasCentavos) }}</span>
          </div>
          <div class="breakdown-total">
            <strong>Lucro operacional estimado</strong><strong>{{ money(report.lucroCentavos) }}</strong>
          </div>
          <div v-if="report.aReceberCentavos">
            <span>Saldo de vendas ainda a receber</span><strong>{{ money(report.aReceberCentavos) }}</strong>
          </div>
        </div>
      </section>
    </div>
    <div class="report-note">
      <i aria-hidden="true" class="pi pi-info-circle"></i
      ><span
        >Resultado gerencial por competência: vendas na data de conclusão e despesas na data informada.
        Depende dos custos e taxas cadastrados; inclua impostos e outros gastos como despesas. Itens abaixo
        mostram vendas brutas, antes dos descontos do pedido.</span
      >
    </div>
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Os favoritos da casa</h2>
          <p>Itens vendidos no período, do mais pedido ao menos pedido</p>
        </div>
        <span class="category-badge">{{ report.itens.length }} produtos</span>
      </div>
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Produto</th>
              <th>Quantidade vendida</th>
              <th>Venda bruta</th>
              <th>Custo dos itens</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(i, index) in report.itens" :key="i.produtoId">
              <td>
                <span class="rank">{{ String(index + 1).padStart(2, '0') }}</span
                ><strong>{{ i.nome }}</strong>
              </td>
              <td>{{ i.quantidade }}</td>
              <td class="amount">{{ money(i.receitaBrutaCentavos) }}</td>
              <td class="muted">{{ money(i.custoCentavos) }}</td>
            </tr>
            <tr v-if="!report.itens.length">
              <td colspan="4" class="empty-cell">Nenhum item vendido neste período.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
    <div class="two-columns history-panel">
      <section class="panel">
        <div class="panel-heading">
          <div>
            <h2>Resultado por canal</h2>
            <p>Uma visão consolidada da operação</p>
          </div>
        </div>
        <div class="payment-methods">
          <div v-for="o in report.porOrigem" :key="o.origem">
            <span
              >{{ origens[o.origem] }} <small class="muted">· {{ o.pedidos }} pedidos</small></span
            ><strong>{{ money(o.receitaCentavos) }}</strong>
          </div>
        </div>
      </section>
      <section class="panel">
        <div class="panel-heading">
          <div>
            <h2>Despesas registradas</h2>
            <p>{{ report.despesas.length }} lançamentos no período</p>
          </div>
        </div>
        <div v-for="d in report.despesas" :key="d.id" class="expense-row">
          <div>
            <strong>{{ d.descricao }}</strong
            ><small>{{ d.categoria }} · {{ dateTime(d.ocorridoEm, store.config.timezone) }}</small>
          </div>
          <b>{{ money(d.valorCentavos) }}</b>
        </div>
        <p v-if="!report.despesas.length" class="empty-cell muted">Nenhuma despesa neste período.</p>
      </section>
    </div></template
  ><PDialog
    v-model:visible="modal"
    modal
    header="Registrar despesa"
    :style="{ width: '490px', maxWidth: '95vw' }"
    ><form class="dialog-form" @submit.prevent="salvarDespesa">
      <div v-if="formError" class="alert error" role="alert">{{ formError }}</div>
      <label for="desp-descricao"
        >Descrição<input
          id="desp-descricao"
          v-model="descricao"
          required
          minlength="3"
          maxlength="200"
          placeholder="Ex.: Embalagens para delivery" /></label
      ><label for="desp-categoria"
        >Categoria<input id="desp-categoria" v-model="categoria" required maxlength="60"
      /></label>
      <div class="form-grid">
        <label for="desp-valor">Valor<MoneyInput id="desp-valor" v-model="valor" :min="0.01" /></label
        ><label for="desp-data"
          >Data<input id="desp-data" v-model="despesaData" type="date" required
        /></label>
      </div>
      <p class="muted form-help">
        Este lançamento reduz o lucro do período. Se saiu dinheiro da gaveta, registre também a sangria no
        Caixa.
      </p>
      <div class="dialog-actions">
        <PButton label="Voltar" text @click="modal = false" /><PButton
          type="submit"
          label="Registrar despesa"
          :loading="saving"
        />
      </div></form
  ></PDialog>
</template>
