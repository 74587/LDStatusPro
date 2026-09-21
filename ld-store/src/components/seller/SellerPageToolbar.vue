<template>
  <section class="seller-page-toolbar">
    <div class="seller-page-lead">
      <div>
        <p v-if="eyebrow">{{ eyebrow }}</p>
        <div class="seller-page-description"><slot name="description">{{ description }}</slot></div>
      </div>
      <div v-if="$slots.actions" class="seller-page-actions"><slot name="actions" /></div>
    </div>
    <SellerFilterBar v-if="$slots.default"><slot /></SellerFilterBar>
    <div v-if="$slots.summary" class="seller-filter-summary"><slot name="summary" /></div>
  </section>
</template>

<script setup>
import SellerFilterBar from '@/components/seller/SellerFilterBar.vue'

defineProps({
  eyebrow: { type: String, default: '' },
  description: { type: String, default: '' }
})
</script>

<style scoped>
.seller-page-toolbar { margin-bottom: 18px; }
.seller-page-lead { display: flex; align-items: flex-end; justify-content: space-between; gap: 20px; margin-bottom: 14px; }
.seller-page-lead p { margin: 0 0 5px; color: var(--seller-jade); font-size: 11px; font-weight: 750; letter-spacing: .14em; }
.seller-page-description { max-width: 720px; color: var(--seller-muted); font-size: 14px; line-height: 1.65; }
.seller-page-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
.seller-filter-summary { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px; }
@media (max-width: 767px) {
  .seller-page-lead { align-items: flex-start; flex-direction: column; }
  .seller-page-actions { width: 100%; justify-content: stretch; }
  .seller-page-actions :deep(> *) { flex: 1; }
}
</style>
