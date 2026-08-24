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
  gap: 8px;
  min-height: 32px;
  padding: 6px 14px;
  border: 1px solid #E7E1D7;
  border-radius: 999px;
  color: #5C635D;
  background: #FFFFFF;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.seller-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 0 3px rgba(196, 97, 47, 0.15);
}

/* 成功色调 - 柔和绿色 */
.tone-success {
  color: #15803d;
  border-color: rgba(34, 197, 94, 0.25);
  background: rgba(34, 197, 94, 0.08);
}
.tone-success .seller-status-dot {
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.15);
}

/* 警告色调 - 温暖橙黄 */
.tone-warning {
  color: #b45309;
  border-color: rgba(245, 158, 11, 0.3);
  background: rgba(245, 158, 11, 0.1);
}
.tone-warning .seller-status-dot {
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.15);
}

/* 危险色调 - terracotta 主色 */
.tone-danger {
  color: #C4612F;
  border-color: rgba(196, 97, 47, 0.3);
  background: #F2E3D6;
}
.tone-danger .seller-status-dot {
  box-shadow: 0 0 0 3px rgba(196, 97, 47, 0.2);
}

/* 信息色调 - 柔和蓝色 */
.tone-info {
  color: #0369a1;
  border-color: rgba(14, 165, 233, 0.25);
  background: rgba(14, 165, 233, 0.08);
}
.tone-info .seller-status-dot {
  box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.15);
}

/* 深色模式适配 */
html.dark .seller-status-badge {
  background: #2a2622;
  border-color: #3d3935;
  color: #a8a29e;
}

html.dark .tone-success {
  color: #86efac;
  background: rgba(34, 197, 94, 0.15);
  border-color: rgba(34, 197, 94, 0.3);
}

html.dark .tone-warning {
  color: #fbbf24;
  background: rgba(245, 158, 11, 0.15);
  border-color: rgba(245, 158, 11, 0.3);
}

html.dark .tone-danger {
  color: #e8a676;
  background: rgba(196, 97, 47, 0.2);
  border-color: rgba(196, 97, 47, 0.35);
}

html.dark .tone-info {
  color: #7dd3fc;
  background: rgba(14, 165, 233, 0.15);
  border-color: rgba(14, 165, 233, 0.3);
}
</style>
