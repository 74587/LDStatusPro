<template>
  <label class="seller-field" :class="{ 'is-wide': wide, 'has-error': Boolean(error) }">
    <span v-if="label" class="seller-field-label">{{ label }} <em v-if="required">*</em></span>
    <slot />
    <small v-if="error" class="seller-field-error" role="alert">{{ error }}</small>
    <small v-else-if="hint" class="seller-field-hint">{{ hint }}</small>
  </label>
</template>

<script setup>
defineProps({
  label: { type: String, default: '' },
  hint: { type: String, default: '' },
  error: { type: String, default: '' },
  required: { type: Boolean, default: false },
  wide: { type: Boolean, default: false }
})
</script>

<style scoped>
.seller-field { display: grid; gap: 8px; min-width: 0; color: var(--seller-ink); }
.seller-field.is-wide { grid-column: 1 / -1; }
.seller-field-label { font-size: 13px; font-weight: 650; }
.seller-field-label em { color: var(--seller-danger); font-style: normal; }
.seller-field :deep(input),
.seller-field :deep(select),
.seller-field :deep(textarea) {
  width: 100%;
  min-height: 44px;
  padding: 10px 12px;
  border: 1px solid var(--seller-border);
  border-radius: 8px;
  background: var(--seller-surface-strong);
  color: var(--seller-ink);
  font: inherit;
  font-size: 14px;
}
.seller-field :deep(textarea) { min-height: 96px; resize: vertical; }
.seller-field :deep(input:focus),
.seller-field :deep(select:focus),
.seller-field :deep(textarea:focus) {
  border-color: var(--seller-jade);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--seller-jade) 14%, transparent);
  outline: none;
}
.seller-field-hint,
.seller-field-error { font-size: 12px; line-height: 1.5; }
.seller-field-hint { color: var(--seller-muted); }
.seller-field-error { color: var(--seller-danger); }
.has-error :deep(input),
.has-error :deep(select),
.has-error :deep(textarea) { border-color: var(--seller-danger); }
</style>
