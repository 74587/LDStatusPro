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
  min-height: 28px;
  padding: 4px 12px;
  border: 1px solid var(--border-light);
  border-radius: 6px;
  color: var(--text-secondary);
  background: var(--bg-primary);
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}

.seller-status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

/* 成功色调 */
.tone-success {
  color: var(--success-dark);
  border-color: var(--success-border);
  background: var(--success-light);
}

/* 警告色调 */
.tone-warning {
  color: var(--warning-dark);
  border-color: var(--warning-border);
  background: var(--warning-light);
}

/* 危险色调 */
.tone-danger {
  color: var(--danger-dark);
  border-color: var(--danger-border);
  background: var(--danger-light);
}

/* 信息色调 */
.tone-info {
  color: var(--info-dark);
  border-color: var(--info-border);
  background: var(--info-light);
}

/* 深色模式适配 */
html.dark .seller-status-badge {
  background: var(--bg-secondary);
  border-color: var(--border-dark);
  color: var(--text-tertiary);
}
</style>
