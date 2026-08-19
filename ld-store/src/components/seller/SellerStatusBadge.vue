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
  gap: 7px;
  min-height: 28px;
  padding: 4px 10px;
  border: 1px solid var(--seller-border);
  border-radius: 999px;
  color: var(--seller-muted);
  background: var(--seller-surface-soft);
  font-size: 12px;
  font-weight: 650;
  white-space: nowrap;
}
.seller-status-dot { width: 7px; height: 7px; border-radius: 50%; background: currentColor; box-shadow: 0 0 0 3px color-mix(in srgb, currentColor 13%, transparent); }
.tone-success { color: #54745e; border-color: color-mix(in srgb, #718d7a 34%, var(--seller-border)); background: color-mix(in srgb, #718d7a 10%, var(--seller-surface)); }
.tone-warning { color: var(--seller-warning); border-color: color-mix(in srgb, var(--seller-warning) 32%, var(--seller-border)); background: color-mix(in srgb, var(--seller-warning) 9%, var(--seller-surface)); }
.tone-danger { color: var(--seller-danger); border-color: color-mix(in srgb, var(--seller-danger) 30%, var(--seller-border)); background: color-mix(in srgb, var(--seller-danger) 8%, var(--seller-surface)); }
.tone-info { color: #557388; border-color: color-mix(in srgb, #557388 30%, var(--seller-border)); background: color-mix(in srgb, #557388 8%, var(--seller-surface)); }
html.dark .tone-success { color: #a4c8ad; }
html.dark .tone-info { color: #9ebed1; }
</style>
