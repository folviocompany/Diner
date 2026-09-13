<script setup>
import { computed } from 'vue';
import { money } from '../lib/format.js';
const props = defineProps({ serie: { type: Array, default: () => [] } });
const max = computed(() => Math.max(10000, ...props.serie.map((d) => d.receitaCentavos)));
</script>
<template>
  <div class="chart" role="img" aria-label="Gráfico de receita por dia">
    <div class="chart-scale">
      <span>{{ money(max) }}</span
      ><span>{{ money(max / 2) }}</span
      ><span>R$ 0</span>
    </div>
    <div class="chart-plot">
      <div class="chart-lines">
        <i aria-hidden="true"></i><i aria-hidden="true"></i><i aria-hidden="true"></i>
      </div>
      <div
        v-for="d in serie"
        :key="d.data"
        class="chart-column"
        :title="`${d.data}: ${money(d.receitaCentavos)}`"
      >
        <div class="chart-bar" :style="{ height: `${Math.max(1, (d.receitaCentavos / max) * 100)}%` }"></div>
        <span>{{ d.data.slice(8) }}/{{ d.data.slice(5, 7) }}</span>
      </div>
      <p v-if="!serie.length" class="muted">Sem dados no período.</p>
    </div>
  </div>
</template>
