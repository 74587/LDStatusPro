<template>
  <div class="seller-empty">
    <slot name="icon" />
    <strong>{{ title }}</strong>
    <p v-if="description">{{ description }}</p>
    <div v-if="$slots.action" class="seller-empty-action"><slot name="action" /></div>
  </div>
</template>

<script setup>
defineProps({
  title: { type: String, required: true },
  description: { type: String, default: '' }
})
</script>

<style scoped>
.seller-empty {
  min-height: 230px;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 8px;
  padding: 36px 24px;
  color: var(--seller-muted);
  text-align: center;
}
.seller-empty :deep(svg) { color: var(--seller-jade); }
.seller-empty strong { color: var(--seller-ink); font-size: 14px; font-weight: 650; }
.seller-empty p { max-width: 42ch; margin: 0; font-size: 13px; line-height: 1.6; }
.seller-empty-action { margin-top: 8px; }
</style>
