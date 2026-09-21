<template>
  <section class="seller-alert" :class="`tone-${tone}`" :role="tone === 'danger' ? 'alert' : 'status'">
    <span v-if="$slots.icon" class="seller-alert-icon"><slot name="icon" /></span>
    <div class="seller-alert-copy">
      <strong v-if="title">{{ title }}</strong>
      <p v-if="$slots.default"><slot /></p>
    </div>
    <div v-if="$slots.action" class="seller-alert-action"><slot name="action" /></div>
  </section>
</template>

<script setup>
defineProps({
  tone: { type: String, default: 'info', validator: value => ['info', 'warning', 'danger', 'success'].includes(value) },
  title: { type: String, default: '' }
})
</script>

<style scoped>
.seller-alert {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid var(--seller-border);
  border-radius: 12px;
  background: var(--seller-surface);
}
.seller-alert-icon { display: grid; place-items: center; }
.seller-alert-copy { min-width: 0; }
.seller-alert-copy strong { display: block; color: var(--seller-ink); font-size: 14px; }
.seller-alert-copy p { margin: 4px 0 0; color: var(--seller-muted); font-size: 13px; line-height: 1.6; }
.seller-alert-action { display: flex; align-items: center; }
.tone-warning { border-color: color-mix(in srgb, var(--seller-warning) 48%, var(--seller-border)); color: var(--seller-warning); background: color-mix(in srgb, var(--seller-warning) 9%, var(--seller-surface)); }
.tone-danger { border-color: color-mix(in srgb, var(--seller-danger) 52%, var(--seller-border)); color: var(--seller-danger); background: color-mix(in srgb, var(--seller-danger) 10%, var(--seller-surface)); }
.tone-success { border-color: color-mix(in srgb, var(--seller-jade) 44%, var(--seller-border)); color: var(--seller-jade-strong); background: var(--seller-jade-soft); }
.tone-info { color: var(--seller-ink); }
@media (max-width: 640px) {
  .seller-alert { grid-template-columns: auto minmax(0, 1fr); }
  .seller-alert-action { grid-column: 1 / -1; }
  .seller-alert-action :deep(.seller-btn) { width: 100%; }
}
</style>
