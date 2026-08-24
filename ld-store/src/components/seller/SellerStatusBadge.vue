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
  border: 2px solid var(--border-medium);
  border-radius: 8px;
  color: var(--text-secondary);
  background: white;
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

/* 成功色调 */
.tone-success {
  color: #15803d;
  border-color: #86efac;
  background: #f0fdf4;
}

/* 警告色调 */
.tone-warning {
  color: #b45309;
  border-color: #fcd34d;
  background: #fffbeb;
}

/* 危险色调 */
.tone-danger {
  color: #991b1b;
  border-color: #fca5a5;
  background: #fef2f2;
}

/* 信息色调 */
.tone-info {
  color: #0c4a6e;
  border-color: #7dd3fc;
  background: #f0f9ff;
}

/* 深色模式适配 */
html.dark .seller-status-badge {
  background: var(--bg-secondary);
  border-color: var(--border-dark);
  color: var(--text-tertiary);
}
</style>
