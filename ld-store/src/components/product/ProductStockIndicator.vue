<template>
  <span
    v-if="indicator.label"
    :class="['stock-indicator', `tone-${indicator.tone}`, `size-${size}`]"
  >
    <component
      :is="indicatorIcon"
      class="stock-indicator-icon"
      :size="iconSize"
      :stroke-width="2"
      aria-hidden="true"
    />
    <span>{{ indicator.label }}</span>
  </span>
</template>

<script setup>
import { computed } from 'vue'
import { PackageCheck, PackageX, TriangleAlert } from '@lucide/vue'
import { getStockIndicatorState } from '@/utils/shopProduct'

defineOptions({ name: 'ProductStockIndicator' })

const props = defineProps({
  product: {
    type: Object,
    required: true
  },
  size: {
    type: String,
    default: 'md',
    validator: value => ['sm', 'md'].includes(value)
  }
})

const indicator = computed(() => getStockIndicatorState(props.product))
const indicatorIcon = computed(() => {
  if (indicator.value.tone === 'out') return PackageX
  if (indicator.value.tone === 'low') return TriangleAlert
  return PackageCheck
})
const iconSize = computed(() => props.size === 'sm' ? 14 : 16)
</script>

<style scoped>
.stock-indicator {
  --stock-accent: var(--color-success);
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 650;
  line-height: 1.4;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.stock-indicator-icon {
  flex: 0 0 auto;
  color: var(--stock-accent);
}

.tone-low {
  --stock-accent: var(--color-warning);
}

.tone-out {
  --stock-accent: var(--color-danger);
}

.size-sm {
  gap: 5px;
  font-size: 12px;
}
</style>
