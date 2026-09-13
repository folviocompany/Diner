<script setup>
import { statusNomes } from '../lib/format.js';
defineProps({ status: String });
</script>
<template>
  <span class="status-badge" :class="status"
    ><span class="status-dot"></span>{{ statusNomes[status] || status }}</span
  >
</template>
