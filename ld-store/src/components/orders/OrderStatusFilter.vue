<template>
  <div ref="rootRef" class="order-status-filter" @focusout="handleFocusOut">
    <div class="status-rail">
      <LiquidTabs :model-value="mainValue" :tabs="tabs" layout="equal" size="sm" aria-label="订单状态" @update:model-value="select" />
      <div class="other-wrap" @keydown="handleKeydown">
        <button
          ref="triggerRef"
          type="button"
          class="other-trigger"
          :class="{ active: otherActive }"
          :aria-expanded="isOpen"
          :aria-controls="menuId"
          @click="toggle"
        >
          <span>其他</span>
          <ChevronDown :size="14" class="other-chevron" :class="{ open: isOpen }" aria-hidden="true" />
        </button>
        <Transition name="status-menu">
          <div v-if="isOpen" :id="menuId" ref="menuRef" class="other-menu" aria-label="其他订单状态">
            <div role="group" aria-label="订单状态">
              <p class="menu-heading">订单状态</p>
              <button
                v-for="item in otherItems"
                :key="item.value"
                type="button"
                class="menu-option"
                :aria-pressed="modelValue === item.value"
                @click="select(item.value)"
              >
                <component :is="statusIcons[item.value]" :size="16" :stroke-width="1.75" class="menu-icon" aria-hidden="true" />
                <span>{{ item.label }}</span>
                <Check v-if="modelValue === item.value" :size="16" class="menu-check" aria-hidden="true" />
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </div>
    <div v-if="selectionLabel" class="selection-summary">
      <span class="selection-caption">当前分类</span>
      <span class="selected-category">{{ selectionLabel }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed, getCurrentInstance, onMounted, onUnmounted, watch } from 'vue'
import { ArrowUpRight, Check, ChevronDown, CircleCheck, Clock3, Hourglass, LoaderCircle, Truck } from '@lucide/vue'
import LiquidTabs from '@/components/common/LiquidTabs.vue'
import { useDropdownMenu } from '@/composables/useDropdownMenu'
import { OTHER_ORDER_FILTERS } from '@/utils/orderFilters'
import { ORDER_STATUS_LABELS } from '@/utils/orderPresentation'

const props = defineProps({ modelValue: { type: String, default: '' } })
const emit = defineEmits(['update:modelValue'])
const menuId = `order-status-menu-${getCurrentInstance().uid}`
const tabs = [{ value: '', label: '全部' }, { value: 'paid', label: '待发货' }, { value: 'cancelled', label: '已取消' }, { value: 'refund', label: '退款' }]
const statusIcons = { pending: Clock3, paying: LoaderCircle, delivered: Truck, completed: CircleCheck, expired: Hourglass, external_dispute: ArrowUpRight }
const otherItems = OTHER_ORDER_FILTERS.filter(item => !['uploaded', 'failed'].includes(item.value))
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
.order-status-filter {
  --status-surface: var(--seller-surface-soft, var(--surface-subtle));
  --status-raised: var(--seller-surface-strong, var(--surface-elevated));
  --status-border: var(--seller-border, var(--border-default-semantic));
  --status-text: var(--seller-ink, var(--text-primary-semantic));
  --status-muted: var(--seller-muted, var(--text-secondary-semantic));
  --status-focus: var(--seller-jade-strong, var(--focus-ring));
  --liquid-tab-radius: 10px;
  --liquid-indicator-bg: var(--status-raised);
  --liquid-indicator-border: var(--status-border);
  --liquid-indicator-shadow: var(--elevation-sm);
  --liquid-shine-bg: none;
  --liquid-tab-text: var(--status-muted);
  --liquid-tab-active-text: var(--status-text);
  --liquid-tab-focus: var(--status-focus);
  width: 100%;
  min-width: 0;
}
.status-rail {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  align-items: stretch;
  gap: 2px;
  padding: 4px;
  border: 1px solid var(--status-border);
  border-radius: 15px;
  background: var(--status-surface);
}
.status-rail > :deep(.liquid-tabs) {
  grid-column: span 4;
  min-width: 0;
  padding: 0;
  border: 0;
  border-radius: 10px;
  background: transparent;
  box-shadow: none;
}
.status-rail :deep(.liquid-tab) {
  min-width: 0;
  min-height: 44px;
  padding: 8px 4px;
  font-family: inherit;
  font-size: 13px;
}
.status-rail :deep(.liquid-tab:not(.active):hover) { background: color-mix(in srgb, var(--status-raised) 55%, transparent); }
.other-wrap { position: relative; min-width: 0; }
.other-trigger {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  width: 100%;
  height: 100%;
  min-height: 44px;
  padding: 8px 3px;
  border: 1px solid transparent;
  border-radius: 10px;
  background: transparent;
  color: var(--status-muted);
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.4;
  letter-spacing: .3px;
  white-space: nowrap;
  cursor: pointer;
  transition: background 160ms ease, color 160ms ease, box-shadow 160ms ease;
}
.other-trigger:hover, .other-trigger[aria-expanded=true] { background: color-mix(in srgb, var(--status-raised) 55%, transparent); color: var(--status-text); }
.other-trigger.active { border-color: var(--status-border); background: var(--status-raised); color: var(--status-text); font-weight: 600; box-shadow: var(--elevation-sm); }
.other-chevron { flex-shrink: 0; transition: transform 160ms ease; }
.other-chevron.open { transform: rotate(180deg); }
.other-trigger:focus-visible, .menu-option:focus-visible { outline: 2px solid var(--status-focus); outline-offset: -2px; }
.other-menu {
  position: absolute;
  top: calc(100% + 12px);
  right: -5px;
  z-index: 50;
  width: 244px;
  max-width: calc(100vw - 32px);
  max-height: min(460px, 60dvh);
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 6px;
  border: 1px solid var(--status-border);
  border-radius: 15px;
  background: var(--status-raised);
  color: var(--status-text);
  box-shadow: var(--elevation-lg);
  transform-origin: top right;
}
.menu-heading { margin: 0; padding: 8px 10px 4px; color: var(--status-muted); font-size: 12px; font-weight: 500; line-height: 1.5; }
.menu-option {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 44px;
  padding: 10px;
  border: 1px solid transparent;
  border-radius: 9px;
  background: transparent;
  color: inherit;
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.5;
  text-align: left;
  cursor: pointer;
  transition: background 120ms ease;
}
.menu-option:hover { background: var(--status-surface); }
.menu-option[aria-pressed=true] { background: var(--status-surface); border-color: var(--status-border); font-weight: 600; }
.menu-icon { flex-shrink: 0; color: var(--status-muted); }
.menu-check { flex-shrink: 0; margin-left: auto; }
.selection-summary { display: flex; align-items: baseline; gap: 8px; margin: 8px 5px 0; font-size: 12px; line-height: 1.5; }
.selection-caption { flex-shrink: 0; color: var(--status-muted); }
.selected-category { color: var(--status-text); font-weight: 600; }
.status-menu-enter-active { transition: opacity 150ms ease, transform 150ms ease; }
.status-menu-leave-active { transition: opacity 100ms ease, transform 100ms ease; pointer-events: none; }
.status-menu-enter-from, .status-menu-leave-to { opacity: 0; transform: translateY(-4px); }
@media (prefers-reduced-motion: reduce) {
  .other-trigger, .other-chevron, .menu-option, .status-menu-enter-active, .status-menu-leave-active { transition: none; }
}
</style>
