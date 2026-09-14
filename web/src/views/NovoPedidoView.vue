<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter, onBeforeRouteLeave } from 'vue-router';
import { api } from '../lib/api.js';
import { money } from '../lib/format.js';
import { useAppStore } from '../stores/app.js';
import MoneyInput from '../components/MoneyInput.vue';
const store = useAppStore();
const router = useRouter();
const produtos = ref([]);
const categoria = ref('');
const busca = ref('');
const cart = ref([]);
const origem = ref('caixa');
const mesa = ref('');
const clienteNome = ref('');
const clienteContato = ref('');
const observacao = ref('');
const desconto = ref(0);
const acrescimo = ref(0);
const taxas = ref(0);
const busy = ref(false);
const error = ref('');
const saved = ref(false);
const chaveCriacao = ref(crypto.randomUUID());
const tentativa = ref(null);
const armazenamento = `diner:pedido-pendente:${store.usuario.id}`;
try {
  const pendente = JSON.parse(sessionStorage.getItem(armazenamento) ?? 'null');
  if (pendente) {
    chaveCriacao.value = pendente.chave;
    tentativa.value = pendente.body;
  }
} catch {
  error.value =
    'Não foi possível recuperar o envio anterior. Confira a lista de pedidos antes de criar outro.';
}
const categorias = computed(() => [...new Set(produtos.value.map((p) => p.categoria))]);
const filtrados = computed(() =>
  produtos.value.filter(
    (p) =>
      (!categoria.value || p.categoria === categoria.value) &&
      p.nome.toLocaleLowerCase('pt-BR').includes(busca.value.toLocaleLowerCase('pt-BR')),
  ),
);
const subtotal = computed(() =>
  cart.value.reduce((s, i) => s + Math.round(i.produto.precoCentavos * i.quantidade), 0),
);
const total = computed(() => subtotal.value - desconto.value + acrescimo.value);
function adicionar(produto) {
  const i = cart.value.find((i) => i.produto.id === produto.id);
  if (i) i.quantidade++;
  else cart.value.push({ produto, quantidade: 1, observacao: '' });
}
async function salvar() {
  if (!cart.value.length && !tentativa.value) return;
  busy.value = true;
  error.value = '';
  try {
    const body = tentativa.value ?? {
      origem: origem.value,
      mesa: mesa.value,
      clienteNome: clienteNome.value,
      clienteContato: clienteContato.value,
      observacao: observacao.value,
      descontoCentavos: desconto.value,
      acrescimoCentavos: acrescimo.value,
      taxasCentavos: taxas.value,
      itens: cart.value.map((i) => ({
        produtoId: i.produto.id,
        quantidade: i.quantidade,
        observacao: i.observacao,
      })),
    };
    tentativa.value = body;
    sessionStorage.setItem(armazenamento, JSON.stringify({ chave: chaveCriacao.value, body }));
    const pedido = await api('/pedidos', {
      method: 'POST',
      headers: { 'Idempotency-Key': chaveCriacao.value },
      body,
    });
    saved.value = true;
    sessionStorage.removeItem(armazenamento);
    store.notificar('Pedido criado. Você já pode receber o pagamento.');
    router.push({ path: '/pedidos', query: { pedido: pedido.id } });
  } catch (e) {
    error.value = e.message;
    if (e.status && e.status < 500) {
      tentativa.value = null;
      sessionStorage.removeItem(armazenamento);
      chaveCriacao.value = crypto.randomUUID();
    } else error.value += ' Tente novamente para confirmar o envio original sem duplicar o pedido.';
  } finally {
    busy.value = false;
  }
}
onBeforeRouteLeave(
  () => saved.value || !cart.value.length || window.confirm('Sair e descartar este pedido ainda não salvo?'),
);
onMounted(async () => {
  try {
    produtos.value = (await api('/produtos')).filter((p) => p.ativo);
  } catch (e) {
    error.value = e.message;
  }
});
const icon = (categoria) =>
  categoria === 'Bebidas'
    ? 'pi pi-sun'
    : categoria === 'Sobremesas'
      ? 'pi pi-heart'
      : categoria === 'Acompanhamentos'
        ? 'pi pi-star'
        : 'pi pi-shop';
</script>
<template>
  <div class="page-heading">
    <div>
      <span class="eyebrow">MAIS UM BOM PEDIDO</span>
      <h1>Novo pedido<span class="title-dot">.</span></h1>
      <p>Escolha os itens e deixe o resto com a casa.</p>
    </div>
    <RouterLink to="/pedidos" class="button-secondary"
      ><i aria-hidden="true" class="pi pi-arrow-left"></i>Voltar aos pedidos</RouterLink
    >
  </div>
  <div v-if="error" class="alert error" role="alert">{{ error }}</div>
  <div v-if="tentativa && !busy" class="alert" role="status">
    O envio anterior aguarda confirmação. Confirme antes de montar outro pedido.
    <PButton label="Confirmar envio anterior" @click="salvar" />
  </div>
  <div class="pos-layout" :inert="tentativa !== null">
    <section>
      <label class="search-input catalog-search"
        ><i aria-hidden="true" class="pi pi-search"></i
        ><input v-model="busca" placeholder="O que vamos servir hoje?" aria-label="Buscar produto"
      /></label>
      <div class="category-tabs">
        <button :class="{ selected: !categoria }" @click="categoria = ''">Todos</button
        ><button
          v-for="cat in categorias"
          :key="cat"
          :class="{ selected: categoria === cat }"
          @click="categoria = cat"
        >
          {{ cat }}
        </button>
      </div>
      <div class="product-grid">
        <button v-for="p in filtrados" :key="p.id" class="product-card" @click="adicionar(p)">
          <span class="product-art" :class="`cat-${categorias.indexOf(p.categoria) % 4}`"
            ><i aria-hidden="true" :class="icon(p.categoria)"></i
            ><span class="product-art-pattern"></span></span
          ><span class="product-category">{{ p.categoria }}</span
          ><strong>{{ p.nome }}</strong
          ><span class="product-card-bottom"
            ><b>{{ money(p.precoCentavos) }}</b
            ><span class="add-product"><i aria-hidden="true" class="pi pi-plus"></i></span
          ></span>
        </button>
      </div>
      <div v-if="!filtrados.length" class="empty-state">
        <i aria-hidden="true" class="pi pi-box"></i><strong>Nenhum produto disponível</strong>
        <p>Cadastre produtos ativos para começar a vender.</p>
        <RouterLink to="/produtos" class="text-link">Ir para produtos</RouterLink>
      </div>
    </section>
    <form class="panel cart-panel" @submit.prevent="salvar">
      <div class="panel-heading">
        <div>
          <h2>Resumo do pedido</h2>
          <p>{{ cart.length }} {{ cart.length === 1 ? 'item selecionado' : 'itens selecionados' }}</p>
        </div>
        <i aria-hidden="true" class="pi pi-receipt"></i>
      </div>
      <div class="cart-body">
        <div class="segmented">
          <button type="button" :class="{ selected: origem === 'caixa' }" @click="origem = 'caixa'">
            <i aria-hidden="true" class="pi pi-shop"></i>Balcão</button
          ><button type="button" :class="{ selected: origem === 'comanda' }" @click="origem = 'comanda'">
            <i aria-hidden="true" class="pi pi-th-large"></i>Comanda
          </button>
        </div>
        <label v-if="origem === 'comanda'" for="mesa"
          >Mesa<input id="mesa" v-model="mesa" required maxlength="20" placeholder="Ex.: 05" /></label
        ><label for="cliente"
          >Nome do cliente <small>(opcional)</small
          ><input
            id="cliente"
            v-model="clienteNome"
            maxlength="120"
            placeholder="Como podemos chamar?" /></label
        ><label for="contato"
          >Contato <small>(opcional)</small
          ><input id="contato" v-model="clienteContato" maxlength="40" placeholder="Telefone"
        /></label>
        <div v-if="!cart.length" class="empty-cart">
          <i aria-hidden="true" class="pi pi-shopping-bag"></i>
          <p>Seu pedido começa aqui.<br />Adicione um item do cardápio.</p>
        </div>
        <div v-for="(i, index) in cart" :key="i.produto.id" class="cart-item">
          <div class="cart-item-heading">
            <strong>{{ i.produto.nome }}</strong
            ><button
              type="button"
              class="icon-button"
              :aria-label="`Remover ${i.produto.nome}`"
              @click="cart.splice(index, 1)"
            >
              <i aria-hidden="true" class="pi pi-times"></i>
            </button>
          </div>
          <div class="cart-quantity">
            <div>
              <button
                type="button"
                :disabled="i.quantidade <= 1"
                :aria-label="`Diminuir ${i.produto.nome}`"
                @click="i.quantidade--"
              >
                −</button
              ><input
                v-model.number="i.quantidade"
                type="number"
                min="0.001"
                max="1000"
                step="0.001"
                required
                :aria-label="`Quantidade de ${i.produto.nome}`"
              /><button type="button" :aria-label="`Aumentar ${i.produto.nome}`" @click="i.quantidade++">
                +
              </button>
            </div>
            <b>{{ money(i.produto.precoCentavos * i.quantidade) }}</b>
          </div>
          <input
            v-model="i.observacao"
            maxlength="500"
            class="item-note"
            placeholder="Observação do item"
            :aria-label="`Observação de ${i.produto.nome}`"
          />
        </div>
        <label for="observacao"
          >Observações<textarea
            id="observacao"
            v-model="observacao"
            rows="2"
            maxlength="500"
            placeholder="Algum cuidado especial?"
          ></textarea>
        </label>
        <details v-if="store.pode('pedidos.descontar')" class="adjustments">
          <summary>Desconto, acréscimo e taxas</summary>
          <label for="desconto">Desconto<MoneyInput id="desconto" v-model="desconto" /></label
          ><label for="acrescimo">Acréscimo<MoneyInput id="acrescimo" v-model="acrescimo" /></label
          ><label for="taxas"
            >Custo de taxas (não cobrado do cliente)<MoneyInput id="taxas" v-model="taxas"
          /></label>
        </details>
        <div class="totals">
          <div>
            <span>Subtotal</span><span>{{ money(subtotal) }}</span>
          </div>
          <div class="total-final">
            <strong>Total</strong><strong>{{ money(total) }}</strong>
          </div>
        </div>
        <PButton
          type="submit"
          label="Criar pedido"
          icon="pi pi-check"
          class="full-width"
          :loading="busy"
          :disabled="!cart.length || desconto > subtotal"
        />
        <p class="cart-hint">
          <i aria-hidden="true" class="pi pi-lock"></i>Pagamento registrado após criar o pedido.
        </p>
      </div>
    </form>
  </div>
</template>
