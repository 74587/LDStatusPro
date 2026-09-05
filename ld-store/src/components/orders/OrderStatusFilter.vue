<template>
  <div ref="rootRef" class="order-status-filter" @focusout="handleFocusOut">
    <LiquidTabs :model-value="mainValue" :tabs="tabs" layout="equal" size="sm" aria-label="订单状态" @update:model-value="select" />
    <div class="other-wrap" @keydown="handleKeydown">
      <button ref="triggerRef" type="button" class="other-trigger" :class="{ active: otherActive }" :aria-expanded="isOpen" @click="toggle">其他 <ChevronDown :size="14" aria-hidden="true" /></button>
      <div v-if="isOpen" ref="menuRef" class="other-menu" aria-label="其他订单状态">
        <button v-for="item in otherItems" :key="item.value" type="button" :aria-pressed="modelValue === item.value" @click="select(item.value)">{{ item.label }}<span v-if="modelValue === item.value" aria-hidden="true">✓</span></button>
      </div>
    </div>
    <span v-if="selectionLabel" class="selected-category">{{ selectionLabel }}</span>
  </div>
</template>
<script setup>
import { computed, onMounted, onUnmounted, watch } from 'vue'
import { ChevronDown } from '@lucide/vue'
import LiquidTabs from '@/components/common/LiquidTabs.vue'
import { useDropdownMenu } from '@/composables/useDropdownMenu'
import { OTHER_ORDER_FILTERS } from '@/utils/orderFilters'
import { ORDER_STATUS_LABELS } from '@/utils/orderPresentation'
const props = defineProps({ modelValue: { type: String, default: '' }, includeImage: Boolean })
const emit = defineEmits(['update:modelValue'])
const tabs = [{ value: '', label: '全部' }, { value: 'paid', label: '待发货' }, { value: 'cancelled', label: '已取消' }, { value: 'refund', label: '退款' }]
const otherItems = computed(() => OTHER_ORDER_FILTERS.filter(item => props.includeImage || !['uploaded', 'failed'].includes(item.value)))
const otherActive = computed(() => OTHER_ORDER_FILTERS.some(item => item.value === props.modelValue) || props.modelValue === 'other')
const mainValue = computed(() => ['refund_pending', 'refunded', 'refund_failed'].includes(props.modelValue) ? 'refund' : otherActive.value ? '__other' : props.modelValue)
const selectionLabel = computed(() => props.modelValue === 'other' ? '退款及 Credit 处理（历史筛选）' : otherActive.value || ['refund_pending', 'refunded', 'refund_failed'].includes(props.modelValue) ? ORDER_STATUS_LABELS[props.modelValue] : '')
const { isOpen, rootRef, triggerRef, menuRef, close, toggle, handleFocusOut, handleKeydown } = useDropdownMenu()
function select(value) { close({ restoreFocus: isOpen.value }); emit('update:modelValue', value) }
function outside(event) { if (!rootRef.value?.contains(event.target)) close() }
watch(() => props.modelValue, () => close())
onMounted(() => document.addEventListener('pointerdown', outside))
onUnmounted(() => document.removeEventListener('pointerdown', outside))
</script>
<style scoped>
.order-status-filter { display:flex; flex-wrap:wrap; align-items:center; gap:4px; min-width:0; width:100%; }
.order-status-filter > :deep(.liquid-tabs) { flex:4; min-width:0; }
.order-status-filter :deep(.liquid-tab) { min-height:44px; padding:8px 4px; font-size:13px; white-space:nowrap; }
.other-wrap { position:relative; flex:1; min-width:52px; }
.other-trigger { display:flex; justify-content:center; align-items:center; gap:3px; width:100%; min-height:44px; border:0; border-radius:12px; background:var(--surface-subtle); color:var(--text-secondary-semantic); font:inherit; font-size:13px; cursor:pointer; }
.other-trigger.active { color:var(--text-link); background:var(--surface-subtle); }
.other-trigger:focus-visible, .other-menu button:focus-visible { outline:2px solid var(--text-link); outline-offset:2px; }
.other-menu { position:absolute; right:0; top:calc(100% + 6px); z-index:50; width:190px; padding:6px; border:1px solid var(--border-default-semantic); border-radius:12px; background:var(--surface-elevated); box-shadow:var(--elevation-sm); }
.other-menu button { display:flex; justify-content:space-between; width:100%; min-height:44px; padding:10px 12px; border:0; border-radius:8px; background:transparent; color:var(--text-primary-semantic); text-align:left; cursor:pointer; }
.other-menu button:hover, .other-menu button[aria-pressed=true] { background:var(--surface-subtle); }
.selected-category { flex-basis:100%; color:var(--text-secondary-semantic); font-size:12px; padding:2px 8px; }
</style>
