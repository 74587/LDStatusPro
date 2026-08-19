<template>
  <div class="empty-state">
    <span class="empty-icon">
      <slot name="icon">
        <component
          :is="iconComponent"
          v-if="iconComponent"
          :size="48"
          :stroke-width="1.6"
          aria-hidden="true"
        />
        <template v-else>{{ icon }}</template>
      </slot>
    </span>
    <p class="empty-text">{{ text }}</p>
    <p v-if="hint" class="empty-hint">{{ hint }}</p>
    <slot name="action"></slot>
  </div>
</template>

<script setup>
defineProps({
  iconComponent: {
    type: [Object, Function],
    default: null
  },
  icon: {
    type: String,
    default: '📭'
  },
  text: {
    type: String,
    default: '暂无数据'
  },
  hint: {
    type: String,
    default: ''
  }
})
</script>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
}

.empty-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.8;
}

.empty-text {
  font-size: 16px;
  color: var(--text-secondary);
  margin: 0;
}

.empty-hint {
  font-size: 13px;
  color: var(--text-tertiary);
  margin: 8px 0 0;
}
</style>
