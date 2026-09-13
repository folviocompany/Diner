<script setup>
defineProps({ label: String, value: String, description: String, icon: String, accent: Boolean });
</script>
<template>
  <article class="metric-card" :class="{ accent }">
    <div class="metric-top">
      <span>{{ label }}</span
      ><i :class="['pi', icon]" aria-hidden="true"></i>
    </div>
    <strong>{{ value }}</strong>
    <p>{{ description }}</p>
  </article>
</template>
