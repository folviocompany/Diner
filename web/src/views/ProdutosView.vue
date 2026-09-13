<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { api } from '../lib/api.js';
import { money } from '../lib/format.js';
import { useAppStore } from '../stores/app.js';
import MoneyInput from '../components/MoneyInput.vue';
const store = useAppStore();
const produtos = ref([]);
const busca = ref('');
const modal = ref(false);
const id = ref(null);
const busy = ref(false);
const error = ref('');
const formError = ref('');
const form = reactive({
  nome: '',
  categoria: '',
  precoCentavos: 0,
  custoCentavos: 0,
  codigoExterno: '',
  ativo: true,
});
const filtrados = computed(() =>
  produtos.value.filter((p) => `${p.nome} ${p.categoria}`.toLowerCase().includes(busca.value.toLowerCase())),
);
async function carregar() {
  try {
    produtos.value = await api('/produtos');
  } catch (e) {
    error.value = e.message;
  }
}
function editar(p) {
  id.value = p?.id ?? null;
  Object.assign(
    form,
    p
      ? {
          nome: p.nome,
          categoria: p.categoria,
          precoCentavos: p.precoCentavos,
          custoCentavos: p.custoCentavos,
          codigoExterno: p.codigoExterno ?? '',
          ativo: p.ativo,
        }
      : { nome: '', categoria: '', precoCentavos: 0, custoCentavos: 0, codigoExterno: '', ativo: true },
  );
  formError.value = '';
  modal.value = true;
}
async function salvar() {
  busy.value = true;
  formError.value = '';
  try {
    await api(`/produtos${id.value ? `/${id.value}` : ''}`, {
      method: id.value ? 'PUT' : 'POST',
      body: { ...form },
    });
    modal.value = false;
    await carregar();
    store.notificar('Produto salvo.');
  } catch (e) {
    formError.value = e.message;
  } finally {
    busy.value = false;
  }
}
onMounted(carregar);
</script>
<template>
  <div class="page-heading">
    <div>
      <span class="eyebrow">O QUE FAZ A SUA CASA</span>
      <h1>Produtos<span class="title-dot">.</span></h1>
      <p>Um cardápio organizado. Custos sempre à vista.</p>
    </div>
    <PButton label="Novo produto" icon="pi pi-plus" @click="editar()" />
  </div>
  <div v-if="error" class="alert error">{{ error }}</div>
  <section class="panel">
    <div class="filter-inputs">
      <label class="search-input"
        ><i aria-hidden="true" class="pi pi-search"></i
        ><input
          v-model="busca"
          placeholder="Buscar produto ou categoria"
          aria-label="Buscar produto" /></label
      ><span class="muted">{{ produtos.length }} produtos cadastrados</span>
    </div>
    <div class="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Produto</th>
            <th>Categoria</th>
            <th>Preço de venda</th>
            <th>Custo unitário</th>
            <th>Margem bruta</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in filtrados" :key="p.id">
            <td>
              <strong>{{ p.nome }}</strong
              ><small v-if="p.codigoExterno" class="muted">Código iFood: {{ p.codigoExterno }}</small>
            </td>
            <td>
              <span class="category-badge">{{ p.categoria }}</span>
            </td>
            <td class="amount">{{ money(p.precoCentavos) }}</td>
            <td class="muted">{{ money(p.custoCentavos) }}</td>
            <td>
              <span :class="{ 'negative-text': p.custoCentavos > p.precoCentavos }"
                >{{ (((p.precoCentavos - p.custoCentavos) / p.precoCentavos) * 100).toFixed(1) }}%</span
              >
            </td>
            <td>
              <span class="status-badge" :class="p.ativo ? 'concluido' : 'cancelado'"
                ><span class="status-dot"></span>{{ p.ativo ? 'Disponível' : 'Inativo' }}</span
              >
            </td>
            <td>
              <button class="icon-button" :aria-label="`Editar ${p.nome}`" @click="editar(p)">
                <i aria-hidden="true" class="pi pi-pencil"></i>
              </button>
            </td>
          </tr>
          <tr v-if="!filtrados.length">
            <td colspan="7">
              <div class="empty-state">
                <i aria-hidden="true" class="pi pi-box"></i><strong>Seu cardápio está começando</strong>
                <p>Cadastre o primeiro produto com seu preço e custo.</p>
                <PButton label="Cadastrar produto" text @click="editar()" />
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
  <PDialog
    v-model:visible="modal"
    modal
    :header="id ? 'Editar produto' : 'Novo produto'"
    :style="{ width: '530px', maxWidth: '95vw' }"
    ><form class="dialog-form" @submit.prevent="salvar">
      <div v-if="formError" class="alert error" role="alert">{{ formError }}</div>
      <label for="produto-nome"
        >Nome do produto<input
          id="produto-nome"
          v-model="form.nome"
          required
          minlength="2"
          maxlength="120"
          placeholder="Ex.: Hambúrguer da casa" /></label
      ><label for="produto-cat"
        >Categoria<input
          id="produto-cat"
          v-model="form.categoria"
          required
          maxlength="60"
          placeholder="Ex.: Hambúrgueres"
          list="categorias" /><datalist id="categorias">
          <option v-for="c in [...new Set(produtos.map((p) => p.categoria))]" :key="c" :value="c" /></datalist
      ></label>
      <div class="form-grid">
        <label for="produto-preco"
          >Preço de venda<MoneyInput id="produto-preco" v-model="form.precoCentavos" :min="0.01" /></label
        ><label for="produto-custo"
          >Custo por unidade<MoneyInput id="produto-custo" v-model="form.custoCentavos"
        /></label>
      </div>
      <label for="produto-codigo"
        >Código externo iFood <small>(opcional)</small
        ><input
          id="produto-codigo"
          v-model="form.codigoExterno"
          maxlength="120"
          placeholder="Código PDV no catálogo iFood"
      /></label>
      <p class="muted form-help">
        O custo atual será preservado nos novos pedidos. Vendas anteriores mantêm o custo registrado na venda.
      </p>
      <label class="checkbox-label"
        ><input v-model="form.ativo" type="checkbox" />Disponível para novos pedidos</label
      >
      <div class="dialog-actions">
        <PButton label="Voltar" text type="button" @click="modal = false" /><PButton
          type="submit"
          label="Salvar produto"
          icon="pi pi-check"
          :loading="busy"
        />
      </div></form
  ></PDialog>
</template>
