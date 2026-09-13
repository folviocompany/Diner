<script setup>
import { ref, computed, watch } from 'vue';
import { api } from '../lib/api.js';
import { money, origens, formas, saldo, dateTime } from '../lib/format.js';
import { useAppStore } from '../stores/app.js';
import StatusBadge from './StatusBadge.vue';
import MoneyInput from './MoneyInput.vue';
const props = defineProps({ pedidoId: String });
const emit = defineEmits(['close', 'updated']);
const store = useAppStore();
const pedido = ref(null);
const busy = ref(false);
const loading = ref(false);
const error = ref('');
const forma = ref('pix');
const valor = ref(0);
const cancelando = ref(false);
const motivo = ref('');
let key = crypto.randomUUID();
const proximo = computed(
  () =>
    ({
      recebido: ['preparando', 'Iniciar preparo'],
      preparando: ['pronto', 'Marcar como pronto'],
      pronto: ['concluido', 'Concluir pedido'],
    })[pedido.value?.status],
);
watch(
  () => props.pedidoId,
  async (id) => {
    pedido.value = null;
    error.value = '';
    cancelando.value = false;
    if (id) await carregar();
  },
  { immediate: true },
);
watch([forma, valor], () => {
  key = crypto.randomUUID();
});
async function carregar() {
  loading.value = true;
  try {
    pedido.value = await api(`/pedidos/${props.pedidoId}`);
    valor.value = saldo(pedido.value);
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}
async function executar(work) {
  busy.value = true;
  error.value = '';
  try {
    await work();
    await carregar();
    emit('updated');
    store.notificar('Pedido atualizado.');
  } catch (e) {
    error.value = e.message;
  } finally {
    busy.value = false;
  }
}
const pagar = () =>
  executar(() =>
    api(`/pedidos/${pedido.value.id}/pagamentos`, {
      method: 'POST',
      headers: { 'Idempotency-Key': key },
      body: { forma: forma.value, valorCentavos: valor.value },
    }),
  );
const atualizar = (status) =>
  executar(() =>
    api(`/pedidos/${pedido.value.id}/status`, {
      method: 'PATCH',
      body: { status, ...(status === 'cancelado' ? { motivo: motivo.value } : {}) },
    }),
  );
</script>
<template>
  <PDialog
    :visible="!!pedidoId"
    modal
    :header="pedido ? `Pedido #${String(pedido.numero).padStart(4, '0')}` : 'Detalhes do pedido'"
    :style="{ width: '650px', maxWidth: '95vw' }"
    @update:visible="!$event && emit('close')"
    ><div v-if="error" class="alert error" role="alert">{{ error }}</div>
    <p v-if="loading && !pedido" class="muted">Carregando pedido…</p>
    <template v-if="pedido"
      ><div class="detail-heading">
        <div>
          <span class="origin" :class="pedido.origem"
            >{{ origens[pedido.origem] }}{{ pedido.mesa ? ` · Mesa ${pedido.mesa}` : '' }}</span
          >
          <p>
            {{ pedido.clienteNome || 'Cliente avulso'
            }}<small v-if="pedido.clienteContato"> · {{ pedido.clienteContato }}</small>
          </p>
          <small class="muted">{{ dateTime(pedido.criadoEm, store.config.timezone) }}</small>
        </div>
        <StatusBadge :status="pedido.status" />
      </div>
      <div class="detail-items">
        <div v-for="item in pedido.itens" :key="item.id" class="detail-item">
          <div>
            <strong>{{ item.quantidade }}× {{ item.nome }}</strong
            ><small v-if="item.observacao" class="muted">{{ item.observacao }}</small>
          </div>
          <span>{{ money(item.subtotalCentavos) }}</span>
        </div>
      </div>
      <p v-if="pedido.observacao" class="order-note">
        <i aria-hidden="true" class="pi pi-comment"></i> {{ pedido.observacao }}
      </p>
      <div class="totals">
        <div>
          <span>Subtotal</span><span>{{ money(pedido.subtotalCentavos) }}</span>
        </div>
        <div v-if="pedido.descontoCentavos">
          <span>Desconto</span><span>− {{ money(pedido.descontoCentavos) }}</span>
        </div>
        <div v-if="pedido.acrescimoCentavos">
          <span>Acréscimos</span><span>{{ money(pedido.acrescimoCentavos) }}</span>
        </div>
        <div class="total-final">
          <strong>Total do pedido</strong><strong>{{ money(pedido.totalCentavos) }}</strong>
        </div>
        <div>
          <span>Saldo a receber</span
          ><strong>{{ pedido.status === 'cancelado' ? 'Cancelado' : money(saldo(pedido)) }}</strong>
        </div>
      </div>
      <div v-if="pedido.pagamentos.length" class="payment-history">
        <h4>Pagamentos</h4>
        <div v-for="p in pedido.pagamentos" :key="p.id">
          <span
            >{{ formas[p.forma] }}
            <small class="muted">{{ p.status === 'estornado' ? '(estornado)' : '' }}</small></span
          ><strong>{{ money(p.valorCentavos) }}</strong>
        </div>
      </div>
      <form
        v-if="saldo(pedido) > 0 && pedido.status !== 'cancelado'"
        class="payment-form"
        @submit.prevent="pagar"
      >
        <h4>Receber pagamento</h4>
        <div class="form-grid">
          <label for="pay-forma"
            >Forma<select id="pay-forma" v-model="forma">
              <option v-for="(nome, k) in formas" v-show="k !== 'ifood_online'" :key="k" :value="k">
                {{ nome }}
              </option>
            </select></label
          ><label for="pay-valor"
            >Valor líquido<MoneyInput id="pay-valor" v-model="valor" :min="0.01"
          /></label>
        </div>
        <PButton type="submit" label="Registrar pagamento" icon="pi pi-wallet" :loading="busy" />
      </form>
      <div v-if="pedido.origem === 'ifood'" class="alert info">
        Status sincronizado com o iFood. Aceite e gerencie a entrega pelo Gestor de Pedidos da plataforma.
      </div>
      <div v-else-if="pedido.status !== 'cancelado'" class="detail-actions">
        <PButton
          v-if="proximo"
          :label="proximo[1]"
          icon="pi pi-check"
          :loading="busy"
          :disabled="proximo[0] === 'concluido' && saldo(pedido) > 0"
          @click="atualizar(proximo[0])"
        /><PButton
          label="Cancelar pedido"
          severity="danger"
          text
          :disabled="busy"
          @click="cancelando = !cancelando"
        />
      </div>
      <form
        v-if="cancelando && pedido.status !== 'cancelado'"
        class="cancel-form"
        @submit.prevent="atualizar('cancelado')"
      >
        <label for="motivo"
          >Motivo do cancelamento<input id="motivo" v-model="motivo" required minlength="3" maxlength="300"
        /></label>
        <p class="muted">
          Os pagamentos confirmados serão estornados no caixa aberto. Devolva ao cliente os valores já
          recebidos.
        </p>
        <PButton type="submit" severity="danger" label="Confirmar cancelamento" :loading="busy" />
      </form>
      <div v-if="pedido.status === 'cancelado'" class="alert info">
        {{ pedido.motivoCancelamento }}
      </div></template
    ></PDialog
  >
</template>
