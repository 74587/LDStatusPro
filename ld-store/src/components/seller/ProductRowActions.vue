<template>
  <div class="product-row-actions" :class="{ mobile }">
    <button v-if="canManageCdk" type="button" class="row-action-secondary" :disabled="busy" @click="$emit('cdk', product)"><KeyRound :size="15" aria-hidden="true" />CDK</button>
    <button type="button" class="row-action-primary" :disabled="busy || restricted" @click="$emit('edit', product)"><Pencil :size="15" aria-hidden="true" />编辑</button>
    <details class="row-action-menu">
      <summary aria-label="更多物品操作"><MoreHorizontal :size="18" aria-hidden="true" /></summary>
      <div>
        <button v-if="canToggle" type="button" :disabled="busy || restricted" @click="$emit('toggle', product)"><Power :size="15" aria-hidden="true" />{{ toggleLabel }}</button>
        <button type="button" class="danger" :disabled="busy || restricted" @click="$emit('delete', product)"><Trash2 :size="15" aria-hidden="true" />{{ deleteLabel }}</button>
      </div>
    </details>
  </div>
</template>

<script setup>
import { KeyRound, MoreHorizontal, Pencil, Power, Trash2 } from '@lucide/vue'

defineProps({
  product: { type: Object, required: true },
  canManageCdk: { type: Boolean, default: false },
  canToggle: { type: Boolean, default: false },
  busy: { type: Boolean, default: false },
  restricted: { type: Boolean, default: false },
  toggleLabel: { type: String, default: '' },
  deleteLabel: { type: String, default: '删除' },
  mobile: { type: Boolean, default: false }
})
defineEmits(['edit', 'cdk', 'toggle', 'delete'])
</script>

<style scoped>
.product-row-actions { display: flex; align-items: center; justify-content: flex-end; gap: 4px; }
.product-row-actions button, summary { min-height: 36px; display: inline-flex; align-items: center; justify-content: center; gap: 5px; padding: 0 6px; border: 1px solid var(--seller-border); border-radius: 9px; color: var(--seller-muted); background: var(--seller-surface); font-size: 12px; font-weight: 650; white-space: nowrap; cursor: pointer; }
.row-action-primary { color: #fff !important; border-color: var(--seller-navy) !important; background: var(--seller-navy) !important; }
.row-action-primary, .row-action-secondary { min-width: 48px; }
.row-action-menu { position: relative; }
.row-action-menu summary { width: 36px; padding: 0; list-style: none; }
.row-action-menu summary::-webkit-details-marker { display: none; }
.row-action-menu > div { position: absolute; z-index: 20; top: calc(100% + 6px); right: 0; min-width: 154px; padding: 6px; border: 1px solid var(--seller-border); border-radius: 10px; background: var(--seller-surface); box-shadow: var(--seller-shadow-md); }
.row-action-menu > div button { width: 100%; justify-content: flex-start; border-color: transparent; }
.row-action-menu > div button:hover { background: var(--seller-surface-soft); }
.row-action-menu > div button.danger { color: var(--seller-danger); }
button:focus-visible, summary:focus-visible { outline: 3px solid color-mix(in srgb, var(--seller-jade) 60%, transparent); outline-offset: 2px; }
button:disabled { opacity: .42; cursor: not-allowed; }
.product-row-actions.mobile { justify-content: flex-start; margin-top: 16px; }
.product-row-actions.mobile .row-action-primary, .product-row-actions.mobile .row-action-secondary { min-height: 44px; flex: 1; }
.product-row-actions.mobile .row-action-menu summary { width: 44px; height: 44px; }
</style>
