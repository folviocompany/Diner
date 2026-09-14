<script setup>
import { ref } from 'vue';
import { api } from '../lib/api.js';
import { money } from '../lib/format.js';
import { useAppStore } from '../stores/app.js';
const props = defineProps({ pedido: Object });
const emit = defineEmits(['saved', 'close']);
const store = useAppStore();
const mesa = ref(props.pedido.mesa);
const versao = props.pedido.versao;
const produtos = ref([]),
  adicionar = ref([]),
  remover = ref([]);
const produtoId = ref(''),
  quantidade = ref(1),
  motivo = ref(''),
  error = ref(''),
  busy = ref(false);
api('/produtos')
  .then((list) => {
    produtos.value = list.filter((p) => p.ativo);
  })
  .catch((e) => {
    error.value = e.message;
  });
function incluir() {
  const p = produtos.value.find((p) => p.id === produtoId.value);
  if (!p || quantidade.value <= 0) return;
  adicionar.value.push({ produtoId: p.id, quantidade: quantidade.value, nome: p.nome });
}
async function salvar() {
  busy.value = true;
  error.value = '';
  try {
    await api(`/comandas/${props.pedido.id}`, {
      method: 'PATCH',
      body: {
        versao,
        mesa: mesa.value,
        adicionar: adicionar.value.map(({ produtoId, quantidade }) => ({ produtoId, quantidade })),
        remover: remover.value.map((itemId) => ({ itemId, motivo: motivo.value })),
      },
    });
    emit('saved');
  } catch (e) {
    error.value = e.message;
  } finally {
    busy.value = false;
  }
}
</script>
<template>
  <form class="panel" @submit.prevent="salvar">
    <h4>Editar comanda</h4>
    <div v-if="error" class="alert error" role="alert">{{ error }}</div>
    <label for="editar-mesa"
      >Mesa de destino<input id="editar-mesa" v-model="mesa" required maxlength="20"
    /></label>
    <div v-if="store.pode('comandas.retirar')">
      <p>Selecione os itens a retirar integralmente:</p>
      <label v-for="item in pedido.itens" :key="item.id" class="check-row"
        ><input v-model="remover" type="checkbox" :value="item.id" />{{ item.quantidade }}× {{ item.nome }} ·
        {{ money(item.subtotalCentavos) }}</label
      >
      <label v-if="remover.length" for="retirada-motivo"
        >Motivo da retirada<input
          id="retirada-motivo"
          v-model="motivo"
          required
          minlength="3"
          maxlength="300"
      /></label>
    </div>
    <div class="form-grid">
      <label for="novo-consumo"
        >Novo consumo<select id="novo-consumo" v-model="produtoId">
          <option value="">Selecione um produto</option>
          <option v-for="p in produtos" :key="p.id" :value="p.id">
            {{ p.nome }} · {{ money(p.precoCentavos) }}
          </option>
        </select></label
      >
      <label for="novo-consumo-qtd"
        >Quantidade<input
          id="novo-consumo-qtd"
          v-model.number="quantidade"
          type="number"
          min="0.001"
          max="1000"
          step="0.001"
      /></label>
    </div>
    <PButton type="button" label="Adicionar consumo" outlined @click="incluir" />
    <div v-for="(item, index) in adicionar" :key="index" class="detail-item">
      <span>{{ item.quantidade }}× {{ item.nome }}</span
      ><button type="button" class="text-link" @click="adicionar.splice(index, 1)">
        Retirar da inclusão
      </button>
    </div>
    <p class="muted">
      Novos consumos retornam o pedido para Recebido. Itens já lançados mantêm seu preço e custo.
    </p>
    <div class="heading-actions">
      <PButton type="submit" label="Salvar comanda" :loading="busy" /><PButton
        type="button"
        label="Voltar"
        text
        :disabled="busy"
        @click="emit('close')"
      />
    </div>
  </form>
</template>
