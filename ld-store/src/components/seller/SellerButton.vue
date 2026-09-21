<template>
  <component
    :is="to ? 'router-link' : 'button'"
    class="seller-btn"
    :class="[`is-${variant}`, { 'is-block': block, 'is-busy': busy }]"
    :to="to || undefined"
    :type="to ? undefined : type"
    :disabled="to ? undefined : disabled || busy"
    :aria-disabled="to && (disabled || busy) ? 'true' : undefined"
    :aria-busy="busy || undefined"
  >
    <slot />
  </component>
</template>

<script setup>
defineProps({
  variant: { type: String, default: 'secondary', validator: value => ['primary', 'secondary', 'danger', 'ghost'].includes(value) },
  type: { type: String, default: 'button' },
  to: { type: [String, Object], default: '' },
  disabled: { type: Boolean, default: false },
  busy: { type: Boolean, default: false },
  block: { type: Boolean, default: false }
})
</script>

<style scoped>
.seller-btn {
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 16px;
  border: 1px solid var(--seller-border);
  border-radius: 8px;
  background: var(--seller-surface);
  color: var(--seller-ink);
  font: inherit;
  font-size: 13px;
  font-weight: 650;
  line-height: 1;
  cursor: pointer;
  text-decoration: none;
}
.seller-btn.is-primary {
  border-color: var(--seller-navy);
  background: var(--seller-navy);
  color: var(--seller-on-navy);
}
html.dark .seller-btn.is-primary {
  border-color: var(--seller-jade);
  background: var(--seller-jade);
  color: var(--seller-navy);
}
.seller-btn.is-danger {
  border-color: color-mix(in srgb, var(--seller-danger) 45%, var(--seller-border));
  background: color-mix(in srgb, var(--seller-danger) 8%, var(--seller-surface));
  color: var(--seller-danger);
}
.seller-btn.is-ghost {
  border-color: transparent;
  background: transparent;
  color: var(--seller-jade-strong);
}
.seller-btn.is-block { width: 100%; }
.seller-btn:hover:not(:disabled) { filter: brightness(1.03); }
.seller-btn:disabled,
.seller-btn[aria-disabled='true'] { opacity: .55; cursor: not-allowed; pointer-events: none; }
.seller-btn.is-busy { cursor: progress; }
.seller-btn:focus-visible { outline: 3px solid color-mix(in srgb, var(--seller-jade) 72%, transparent); outline-offset: 2px; }
</style>
