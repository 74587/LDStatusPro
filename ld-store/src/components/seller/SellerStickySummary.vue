<template>
  <aside class="seller-sticky-summary">
    <div class="seller-summary-spine" aria-hidden="true"></div>
    <header><p>{{ eyebrow }}</p><h2>{{ title }}</h2></header>
    <div class="seller-summary-body"><slot /></div>
    <div v-if="$slots.action" class="seller-summary-action"><slot name="action" /></div>
  </aside>
</template>

<script setup>
defineProps({
  eyebrow: { type: String, default: '发布前检查' },
  title: { type: String, default: '物品摘要' }
})
</script>

<style scoped>
.seller-sticky-summary { position: sticky; top: 94px; overflow: hidden; border: 1px solid var(--seller-border); border-radius: 14px; background: var(--seller-surface); box-shadow: var(--seller-shadow-md); }
.seller-summary-spine { height: 4px; background: var(--seller-jade); }
.seller-sticky-summary header { padding: 18px 20px 14px; border-bottom: 1px solid var(--seller-border); }
.seller-sticky-summary header p { margin: 0 0 4px; color: var(--seller-jade); font-size: 10px; font-weight: 750; letter-spacing: .16em; }
.seller-sticky-summary h2 { margin: 0; color: var(--seller-ink); font-family: "Noto Serif SC", "Source Han Serif SC", "Songti SC", STSong, serif; font-size: 18px; }
.seller-summary-body { padding: 18px 20px; }
.seller-summary-action { padding: 0 20px 20px; }
.seller-summary-action :deep(button), .seller-summary-action :deep(a) { width: 100%; min-height: 46px; }
@media (max-width: 1199px) { .seller-sticky-summary { position: static; } }
</style>
