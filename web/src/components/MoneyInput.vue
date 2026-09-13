<script setup>
defineProps({
  modelValue: { type: Number, default: 0 },
  id: String,
  min: { type: Number, default: 0 },
  required: { type: Boolean, default: true },
});
const emit = defineEmits(['update:modelValue']);
</script>
<template>
  <div class="money-input">
    <span aria-hidden="true">R$</span
    ><input
      :id="id"
      type="number"
      :value="modelValue / 100"
      :min="min"
      max="1000000"
      step="0.01"
      :required="required"
      @input="emit('update:modelValue', Math.round(Number($event.target.value) * 100))"
    />
  </div>
</template>
