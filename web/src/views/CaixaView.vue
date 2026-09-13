<script setup>
import { ref, onMounted } from 'vue';
import { api } from '../lib/api.js';
import { money, formas, dateTime } from '../lib/format.js';
import { useAppStore } from '../stores/app.js';
import MoneyInput from '../components/MoneyInput.vue';
import MetricCard from '../components/MetricCard.vue';
const store = useAppStore();
const caixa = ref(null);
const historico = ref([]);
const error = ref('');
const modal = ref('');
const valor = ref(0);
const motivo = ref('');
const tipo = ref('suprimento');
const busy = ref(false);
const loaded = ref(false);
const formError = ref('');
const detalhe = ref(null);
async function carregar() {
  error.value = '';
  try {
    [caixa.value, historico.value] = await Promise.all([api('/caixa/atual'), api('/caixas')]);
  } catch (e) {
    error.value = e.message;
  } finally {
    loaded.value = true;
  }
}
function abrirModal(mode) {
  modal.value = mode;
  valor.value = 0;
  motivo.value = '';
  formError.value = '';
}
async function salvar() {
  busy.value = true;
  formError.value = '';
  try {
    if (modal.value === 'abrir')
      await api('/caixas', { method: 'POST', body: { valorInicialCentavos: valor.value } });
    if (modal.value === 'fechar')
      await api(`/caixas/${caixa.value.id}/fechar`, {
        method: 'POST',
        body: { valorFinalCentavos: valor.value, observacao: motivo.value },
      });
    if (modal.value === 'movimento')
      await api('/caixa/movimentos', {
        method: 'POST',
        body: { tipo: tipo.value, valorCentavos: valor.value, motivo: motivo.value },
      });
    modal.value = '';
    await carregar();
    store.notificar('Caixa atualizado.');
  } catch (e) {
    formError.value = e.message;
  } finally {
    busy.value = false;
  }
}
async function consultar(c) {
  try {
    detalhe.value = await api(`/caixas/${c.id}`);
  } catch (e) {
    store.notificar(e.message, 'error');
  }
}
onMounted(carregar);
</script>
<template>
  <div class="page-heading">
    <div>
      <span class="eyebrow">CADA CENTAVO NO SEU LUGAR</span>
      <h1>Caixa<span class="title-dot">.</span></h1>
      <p>Abertura, recebimentos e conferência da sua operação.</p>
    </div>
    <div v-if="loaded && !error" class="heading-actions">
      <template v-if="caixa"
        ><PButton
          label="Movimentar"
          icon="pi pi-arrow-right-arrow-left"
          outlined
          @click="abrirModal('movimento')" /><PButton
          label="Fechar caixa"
          icon="pi pi-lock"
          @click="abrirModal('fechar')" /></template
      ><PButton v-else label="Abrir caixa" icon="pi pi-lock-open" @click="abrirModal('abrir')" />
    </div>
  </div>
  <div v-if="error" class="alert error">{{ error }}</div>
  <template v-if="caixa"
    ><div class="cash-status">
      <span class="status-badge concluido"><span class="status-dot"></span>Caixa aberto</span
      ><span>Iniciado em {{ dateTime(caixa.abertoEm, store.config.timezone) }}</span>
    </div>
    <div class="metrics-grid">
      <MetricCard
        label="Fundo inicial"
        :value="money(caixa.valorInicialCentavos)"
        description="Dinheiro informado na abertura"
        icon="pi-flag"
      /><MetricCard
        label="Dinheiro na gaveta"
        :value="money(caixa.esperadoCentavos)"
        description="Saldo esperado para conferência"
        icon="pi-wallet"
        accent
      /><MetricCard
        label="Entradas extras"
        :value="money(caixa.suprimentosCentavos)"
        description="Suprimentos desta sessão"
        icon="pi-arrow-down-left"
      /><MetricCard
        label="Retiradas"
        :value="money(caixa.sangriasCentavos)"
        description="Sangrias desta sessão"
        icon="pi-arrow-up-right"
      />
    </div>
    <div class="two-columns">
      <section class="panel">
        <div class="panel-heading">
          <div>
            <h2>Recebimentos por forma</h2>
            <p>Pagamentos confirmados neste caixa</p>
          </div>
        </div>
        <div class="payment-methods">
          <div v-for="(amount, forma) in caixa.porForma" :key="forma">
            <span
              ><i
                aria-hidden="true"
                :class="['pi', forma === 'dinheiro' ? 'pi-money-bill' : 'pi-credit-card']"
              ></i
              >{{ formas[forma] }}</span
            ><strong>{{ money(amount) }}</strong>
          </div>
        </div>
        <p class="panel-footnote">
          Cartões e Pix entram na conferência de vendas. Somente dinheiro compõe o saldo físico da gaveta.
        </p>
      </section>
      <section class="panel">
        <div class="panel-heading">
          <div>
            <h2>Movimentações</h2>
            <p>Suprimentos e sangrias do período</p>
          </div>
        </div>
        <div v-if="!caixa.movimentos.length" class="empty-state">
          <i aria-hidden="true" class="pi pi-arrow-right-arrow-left"></i
          ><strong>Tudo tranquilo por aqui</strong>
          <p>As entradas e retiradas extras aparecerão aqui.</p>
        </div>
        <div v-for="m in caixa.movimentos" :key="m.id" class="movement-row">
          <span class="movement-icon" :class="m.tipo"
            ><i
              aria-hidden="true"
              :class="['pi', m.tipo === 'sangria' ? 'pi-arrow-up-right' : 'pi-arrow-down-left']"
            ></i
          ></span>
          <div>
            <strong>{{ m.motivo }}</strong
            ><small>{{ dateTime(m.criadoEm, store.config.timezone) }}</small>
          </div>
          <b>{{ m.tipo === 'sangria' ? '−' : '+' }} {{ money(m.valorCentavos) }}</b>
        </div>
      </section>
    </div></template
  >
  <div v-else-if="loaded && !error" class="panel empty-state large">
    <i aria-hidden="true" class="pi pi-wallet"></i>
    <h2>Vamos começar o movimento?</h2>
    <p>Informe o fundo de troco e abra o caixa para registrar pagamentos.</p>
    <PButton label="Abrir caixa" icon="pi pi-plus" @click="abrirModal('abrir')" />
  </div>
  <section class="panel history-panel">
    <div class="panel-heading">
      <div>
        <h2>Histórico de caixas</h2>
        <p>Últimas 50 sessões de operação</p>
      </div>
    </div>
    <div class="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Abertura</th>
            <th>Fechamento</th>
            <th>Fundo inicial</th>
            <th>Valor contado</th>
            <th>Diferença</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in historico" :key="c.id">
            <td>{{ dateTime(c.abertoEm, store.config.timezone) }}</td>
            <td>{{ dateTime(c.fechadoEm, store.config.timezone) }}</td>
            <td>{{ money(c.valorInicialCentavos) }}</td>
            <td>{{ c.fechadoEm ? money(c.valorFinalCentavos) : 'Em aberto' }}</td>
            <td :class="{ 'negative-text': c.diferencaCentavos !== 0 && c.fechadoEm }">
              {{ c.fechadoEm ? money(c.diferencaCentavos) : '—' }}
            </td>
            <td>
              <button class="icon-button" aria-label="Ver conferência do caixa" @click="consultar(c)">
                <i aria-hidden="true" class="pi pi-arrow-up-right"></i>
              </button>
            </td>
          </tr>
          <tr v-if="!historico.length">
            <td colspan="6" class="muted">Nenhuma sessão registrada.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
  <PDialog
    :visible="!!modal"
    modal
    :header="
      { abrir: 'Abrir caixa', fechar: 'Conferir e fechar caixa', movimento: 'Movimentar caixa' }[modal]
    "
    :style="{ width: '490px', maxWidth: '95vw' }"
    @update:visible="!$event && (modal = '')"
    ><form class="dialog-form" @submit.prevent="salvar">
      <div v-if="formError" class="alert error" role="alert">{{ formError }}</div>
      <label v-if="modal === 'movimento'" for="mov-tipo"
        >Tipo<select id="mov-tipo" v-model="tipo">
          <option value="suprimento">Suprimento · entrada de dinheiro</option>
          <option value="sangria">Sangria · retirada de dinheiro</option>
        </select></label
      >
      <p v-if="modal === 'fechar'" class="muted">
        Conte o dinheiro físico na gaveta. Saldo esperado:
        <strong>{{ money(caixa?.esperadoCentavos) }}</strong
        >.
      </p>
      <label for="caixa-valor"
        >{{
          modal === 'abrir'
            ? 'Fundo inicial de troco'
            : modal === 'fechar'
              ? 'Dinheiro contado'
              : 'Valor da movimentação'
        }}<MoneyInput id="caixa-valor" v-model="valor" :min="modal === 'movimento' ? 0.01 : 0" /></label
      ><label v-if="modal !== 'abrir'" for="caixa-motivo"
        >{{ modal === 'fechar' ? 'Observação (opcional)' : 'Motivo'
        }}<textarea
          id="caixa-motivo"
          v-model="motivo"
          rows="3"
          :required="modal === 'movimento'"
          :minlength="modal === 'movimento' ? 3 : 0"
          maxlength="300"
        ></textarea>
      </label>
      <div v-if="modal === 'fechar'" class="close-difference">
        <span>Diferença de caixa</span><strong>{{ money(valor - (caixa?.esperadoCentavos ?? 0)) }}</strong>
      </div>
      <p v-if="modal === 'movimento'" class="form-help muted">
        Sangrias e suprimentos não alteram o lucro. Registre despesas também em Relatórios quando houver um
        gasto.
      </p>
      <div class="dialog-actions">
        <PButton label="Voltar" text type="button" @click="modal = ''" /><PButton
          type="submit"
          :label="modal === 'fechar' ? 'Confirmar fechamento' : 'Confirmar'"
          :loading="busy"
        />
      </div></form></PDialog
  ><PDialog
    :visible="!!detalhe"
    modal
    header="Conferência de caixa"
    :style="{ width: '530px', maxWidth: '95vw' }"
    @update:visible="!$event && (detalhe = null)"
    ><template v-if="detalhe"
      ><p class="muted">
        {{ dateTime(detalhe.abertoEm, store.config.timezone) }} —
        {{ detalhe.fechadoEm ? dateTime(detalhe.fechadoEm, store.config.timezone) : 'Em aberto' }}
      </p>
      <div class="payment-methods">
        <div v-for="(amount, forma) in detalhe.porForma" :key="forma">
          <span>{{ formas[forma] }}</span
          ><strong>{{ money(amount) }}</strong>
        </div>
        <div>
          <span>Esperado em dinheiro</span><strong>{{ money(detalhe.esperadoCentavos) }}</strong>
        </div>
        <div v-if="detalhe.fechadoEm">
          <span>Diferença</span><strong>{{ money(detalhe.diferencaCentavos) }}</strong>
        </div>
      </div>
      <p v-if="detalhe.observacao" class="order-note">{{ detalhe.observacao }}</p></template
    ></PDialog
  >
</template>
