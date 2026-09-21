<template>
  <div class="seller-filter-bar">
    <slot />
  </div>
</template>

<style scoped>
.seller-filter-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  padding: 12px;
  border: 1px solid var(--seller-border);
  border-radius: 12px;
  background: color-mix(in srgb, var(--seller-surface) 86%, transparent);
  box-shadow: var(--seller-shadow-sm);
}
@media (max-width: 767px) {
  .seller-filter-bar { align-items: stretch; flex-direction: column; }
}
</style>
