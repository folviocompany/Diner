<script setup>
import { ref, computed, watch } from 'vue';
import { api } from '../lib/api.js';
import { money, origens, formas, saldo, dateTime } from '../lib/format.js';
import { useAppStore } from '../stores/app.js';
import StatusBadge from './StatusBadge.vue';
import MoneyInput from './MoneyInput.vue';
import ComandaEditor from './ComandaEditor.vue';
import { Comanda } from '../../../src/domain/entities/Comanda.js';
import { usarAtualizacao } from '../lib/usarAtualizacao.js';
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
const editando = ref(false),
  pessoas = ref(2),
  parcelas = ref([]);
function dividir() {
  try {
    parcelas.value = Comanda.dividirSaldo(saldo(pedido.value), pessoas.value);
  } catch (e) {
    error.value = e.message;
  }
}
async function comandaSalva() {
  editando.value = false;
  await carregar();
  emit('updated');
  store.notificar('Comanda atualizada.');
}
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
    editando.value = false;
    parcelas.value = [];
    key = crypto.randomUUID();
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
    }).then((result) => {
      const index = parcelas.value.indexOf(result.valorCentavos);
      if (index >= 0) parcelas.value.splice(index, 1);
      key = crypto.randomUUID();
    }),
  );
usarAtualizacao(
  carregar,
  () =>
    !!props.pedidoId &&
    !busy.value &&
    !loading.value &&
    !editando.value &&
    !cancelando.value &&
    !document.activeElement?.closest('.p-dialog'),
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
          <span v-if="store.pode('pagamentos.criar')">{{ money(item.subtotalCentavos) }}</span>
        </div>
      </div>
      <p v-if="pedido.observacao" class="order-note">
        <i aria-hidden="true" class="pi pi-comment"></i> {{ pedido.observacao }}
      </p>
      <ComandaEditor v-if="editando" :pedido="pedido" @close="editando = false" @saved="comandaSalva" />
      <PButton
        v-else-if="
          pedido.origem === 'comanda' &&
          !['concluido', 'cancelado'].includes(pedido.status) &&
          store.pode('comandas.editar')
        "
        label="Editar comanda / transferir mesa"
        outlined
        @click="editando = true"
      />
      <div v-if="store.pode('pagamentos.criar')" class="totals">
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
      <div v-if="pedido.pagamentos?.length" class="payment-history">
        <h4>Pagamentos</h4>
        <div v-for="p in pedido.pagamentos" :key="p.id">
          <span
            >{{ formas[p.forma] }}
            <small class="muted">{{ p.status === 'estornado' ? '(estornado)' : '' }}</small></span
          ><strong>{{ money(p.valorCentavos) }}</strong>
        </div>
      </div>
      <form
        v-if="store.pode('pagamentos.criar') && saldo(pedido) > 0 && pedido.status !== 'cancelado'"
        class="payment-form"
        @submit.prevent="pagar"
      >
        <h4>Receber pagamento</h4>
        <div v-if="pedido.origem === 'comanda'" class="split-bill">
          <label for="dividir-pessoas"
            >Dividir saldo entre pessoas<input
              id="dividir-pessoas"
              v-model.number="pessoas"
              type="number"
              min="1"
              max="100" /></label
          ><PButton type="button" label="Calcular divisão" outlined @click="dividir" />
          <div v-if="parcelas.length">
            <p class="muted">Escolha uma parcela e registre o pagamento abaixo.</p>
            <PButton
              v-for="(parcela, index) in parcelas"
              :key="index"
              type="button"
              :label="`Parcela ${index + 1}: ${money(parcela)}`"
              text
              @click="valor = parcela"
            />
          </div>
        </div>
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
          v-if="proximo && store.pode(proximo[0] === 'concluido' ? 'pedidos.concluir' : 'pedidos.preparar')"
          :label="proximo[1]"
          icon="pi pi-check"
          :loading="busy"
          :disabled="proximo[0] === 'concluido' && saldo(pedido) > 0"
          @click="atualizar(proximo[0])"
        /><PButton
          v-if="store.pode('pedidos.cancelar')"
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
          Pagamentos do caixa aberto serão estornados agora. Pagamentos de caixas fechados ficarão em
          Devoluções pendentes para registrar a devolução no caixa atual.
        </p>
        <PButton type="submit" severity="danger" label="Confirmar cancelamento" :loading="busy" />
      </form>
      <div v-if="pedido.status === 'cancelado'" class="alert info">
        {{ pedido.motivoCancelamento }}
      </div></template
    ></PDialog
  >
</template>
