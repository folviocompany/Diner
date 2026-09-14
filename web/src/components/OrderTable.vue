<script setup>
import { money, origens, time } from '../lib/format.js';
import StatusBadge from './StatusBadge.vue';
import { useAppStore } from '../stores/app.js';
const store = useAppStore();
const atrasado = (p) =>
  ['recebido', 'preparando'].includes(p.status) && Date.now() - new Date(p.criadoEm).getTime() >= 20 * 60000;
defineProps({ pedidos: { type: Array, default: () => [] }, timezone: String });
defineEmits(['select']);
</script>
<template>
  <div class="table-scroll">
    <table>
      <thead>
        <tr>
          <th>Pedido</th>
          <th>Origem</th>
          <th>Cliente / mesa</th>
          <th>Status</th>
          <th>Horário</th>
          <th v-if="store.pode('pagamentos.criar')" class="align-right">Total</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="p in pedidos" :key="p.id">
          <td>
            <button class="order-link" @click="$emit('select', p)">
              #{{ String(p.numero).padStart(4, '0') }}
            </button>
          </td>
          <td>
            <span class="origin" :class="p.origem"
              ><i
                aria-hidden="true"
                :class="[
                  'pi',
                  p.origem === 'ifood'
                    ? 'pi-shopping-bag'
                    : p.origem === 'comanda'
                      ? 'pi-th-large'
                      : 'pi-shop',
                ]"
              ></i
              >{{ origens[p.origem] }}</span
            >
          </td>
          <td>
            <span class="customer-name">{{ p.clienteNome || 'Cliente avulso' }}</span
            ><small v-if="p.mesa" class="muted">Mesa {{ p.mesa }}</small>
          </td>
          <td>
            <StatusBadge :status="p.status" /><small v-if="atrasado(p)" class="alert error"
              >Há mais de 20 min</small
            >
          </td>
          <td class="muted">{{ time(p.criadoEm, timezone) }}</td>
          <td v-if="store.pode('pagamentos.criar')" class="align-right amount">
            {{ money(p.totalCentavos) }}
          </td>
          <td>
            <button class="icon-button" :aria-label="`Abrir pedido ${p.numero}`" @click="$emit('select', p)">
              <i aria-hidden="true" class="pi pi-arrow-up-right"></i>
            </button>
          </td>
        </tr>
        <tr v-if="!pedidos.length">
          <td colspan="7">
            <div class="empty-state">
              <i aria-hidden="true" class="pi pi-receipt"></i><strong>Nenhum pedido por aqui</strong>
              <p>Os pedidos aparecerão nesta lista conforme sua operação acontecer.</p>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
