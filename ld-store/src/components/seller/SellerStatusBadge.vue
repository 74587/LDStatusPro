<template>
  <span class="seller-status-badge" :class="`tone-${tone}`">
    <span class="seller-status-dot" aria-hidden="true"></span>
    <slot>{{ label }}</slot>
  </span>
</template>

<script setup>
defineProps({
  label: { type: String, default: '' },
  tone: { type: String, default: 'neutral' }
})
</script>

<style scoped>
.seller-status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 32px;
  padding: 6px 14px;
  border: 1px solid var(--seller-border);
  border-radius: 8px;
  color: var(--seller-muted);
  background: var(--seller-surface-strong);
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.seller-status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.tone-success {
  color: var(--seller-jade-strong);
  border-color: color-mix(in srgb, var(--seller-jade) 42%, var(--seller-border));
  background: var(--seller-jade-soft);
}

.tone-warning {
  color: var(--seller-warning);
  border-color: color-mix(in srgb, var(--seller-warning) 42%, var(--seller-border));
  background: color-mix(in srgb, var(--seller-warning) 9%, var(--seller-surface));
}

.tone-danger {
  color: var(--seller-danger);
  border-color: color-mix(in srgb, var(--seller-danger) 42%, var(--seller-border));
  background: color-mix(in srgb, var(--seller-danger) 9%, var(--seller-surface));
}

.tone-info {
  color: var(--seller-navy-soft);
  border-color: color-mix(in srgb, var(--seller-navy-soft) 32%, var(--seller-border));
  background: color-mix(in srgb, var(--seller-navy-soft) 7%, var(--seller-surface));
}

.tone-neutral {
  color: var(--seller-muted);
  background: var(--seller-surface-soft);
}
</style>
