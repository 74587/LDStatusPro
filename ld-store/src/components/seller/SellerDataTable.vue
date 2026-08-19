<template>
  <section class="seller-ledger" :aria-busy="loading">
    <div class="seller-table-wrap">
      <table>
        <caption class="seller-sr-only">{{ caption }}</caption>
        <thead>
          <tr>
            <th v-for="column in columns" :key="column.key" scope="col" :class="column.align ? `align-${column.align}` : ''" :style="column.width ? { width: column.width } : undefined">
              {{ column.label }}
            </th>
          </tr>
        </thead>
        <tbody v-if="loading">
          <tr v-for="index in skeletonRows" :key="`skeleton-${index}`" class="seller-table-skeleton">
            <td v-for="column in columns" :key="column.key"><span></span></td>
          </tr>
        </tbody>
        <tbody v-else-if="rows.length">
          <template v-for="row in rows" :key="getRowKey(row)">
            <tr>
              <td v-for="column in columns" :key="column.key" :class="column.align ? `align-${column.align}` : ''">
                <slot :name="`cell-${column.key}`" :row="row" :value="row[column.key]">{{ row[column.key] }}</slot>
              </td>
            </tr>
            <tr v-if="String(expandedRowKey) === String(getRowKey(row)) && $slots.expanded" class="seller-expanded-row">
              <td :colspan="columns.length"><slot name="expanded" :row="row" /></td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <div class="seller-mobile-list">
      <template v-if="loading">
        <div v-for="index in Math.min(skeletonRows, 3)" :key="`mobile-skeleton-${index}`" class="seller-mobile-skeleton"></div>
      </template>
      <template v-else>
        <article v-for="row in rows" :key="getRowKey(row)" class="seller-mobile-card">
          <slot name="mobile-row" :row="row" />
          <slot v-if="String(expandedRowKey) === String(getRowKey(row))" name="expanded" :row="row" />
        </article>
      </template>
    </div>

    <div v-if="!loading && !rows.length" class="seller-table-empty"><slot name="empty" /></div>
    <slot name="footer" />
  </section>
</template>

<script setup>
const props = defineProps({
  caption: { type: String, required: true },
  columns: { type: Array, required: true },
  rows: { type: Array, default: () => [] },
  rowKey: { type: [String, Function], default: 'id' },
  loading: { type: Boolean, default: false },
  skeletonRows: { type: Number, default: 5 },
  expandedRowKey: { type: [String, Number], default: '' }
})

function getRowKey(row) {
  return typeof props.rowKey === 'function' ? props.rowKey(row) : row?.[props.rowKey]
}
</script>

<style scoped>
.seller-ledger { overflow: hidden; border: 1px solid var(--seller-border); border-radius: 14px; background: var(--seller-surface); box-shadow: var(--seller-shadow-sm); }
.seller-table-wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; table-layout: fixed; }
th { padding: 12px 16px; border-bottom: 1px solid var(--seller-border); color: var(--seller-muted); background: color-mix(in srgb, var(--seller-surface-soft) 72%, var(--seller-surface)); text-align: left; font-size: 11px; font-weight: 700; letter-spacing: .08em; }
td { min-width: 0; padding: 15px 16px; border-bottom: 1px solid color-mix(in srgb, var(--seller-border) 74%, transparent); color: var(--seller-ink); vertical-align: middle; font-size: 13px; }
tbody > tr:not(.seller-expanded-row):hover td { background: color-mix(in srgb, var(--seller-jade) 5%, var(--seller-surface)); }
tbody:last-child tr:last-child td { border-bottom: 0; }
.align-right { text-align: right; }
.align-center { text-align: center; }
.seller-expanded-row td { padding: 0 16px 16px; background: color-mix(in srgb, var(--seller-jade) 4%, var(--seller-surface)); }
.seller-table-skeleton span, .seller-mobile-skeleton { display: block; border-radius: 8px; background: var(--skeleton-gradient); background-size: 200% 100%; animation: seller-shimmer 1.5s linear infinite; }
.seller-table-skeleton span { width: 76%; height: 18px; }
.seller-mobile-list { display: none; }
.seller-table-empty { min-height: 280px; display: grid; place-items: center; padding: 36px; text-align: center; }
.seller-sr-only { position: absolute; width: 1px; height: 1px; padding: 0; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
@keyframes seller-shimmer { to { background-position: -200% 0; } }
@media (max-width: 767px) {
  .seller-table-wrap { display: none; }
  .seller-mobile-list { display: grid; }
  .seller-mobile-card { min-width: 0; padding: 18px; border-bottom: 1px solid var(--seller-border); }
  .seller-mobile-card:last-child { border-bottom: 0; }
  .seller-mobile-skeleton { height: 174px; margin: 14px; }
  .seller-table-empty { min-height: 230px; }
}
@media (prefers-reduced-motion: reduce) { .seller-table-skeleton span, .seller-mobile-skeleton { animation: none; } }
</style>
