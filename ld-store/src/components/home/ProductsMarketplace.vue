<template>
  <section id="home-panel-products" class="section-content" role="tabpanel" aria-labelledby="home-tab-products" tabindex="0">
    <div class="filter-section">
      <CategoryFilter
        :categories="marketCategories"
        :current-category="currentCategory"
        @select="handleCategorySelect"
      />
    </div>

    <div class="sort-section">
      <div class="sort-options">
        <button
          v-for="tab in sortTabs"
          :key="tab.value"
          type="button"
          class="sort-btn"
          :class="{ active: currentSort === tab.value }"
          :aria-pressed="currentSort === tab.value"
          @click="handleSortChange(tab.value)"
        >
          {{ tab.label }}
        </button>
      </div>
      <div class="catalog-filters">
        <div class="price-filter">
          <label for="home-price-min" class="sr-only">最低折后价</label>
          <input
            id="home-price-min"
            v-model="priceMinInput"
            type="number"
            min="0"
            step="0.01"
            class="price-filter-input"
            placeholder="最低折后价"
            @keyup.enter="applyPriceFilter"
          />
          <span class="price-filter-separator">-</span>
          <label for="home-price-max" class="sr-only">最高折后价</label>
          <input
            id="home-price-max"
            v-model="priceMaxInput"
            type="number"
            min="0"
            step="0.01"
            class="price-filter-input"
            placeholder="最高折后价"
            @keyup.enter="applyPriceFilter"
          />
          <button type="button" class="price-filter-btn" @click="applyPriceFilter">筛选</button>
          <button
            v-if="hasDraftPriceFilter || hasActivePriceFilter"
            type="button"
            class="price-filter-btn secondary"
            @click="clearPriceFilter"
          >
            清空
          </button>
        </div>
        <label class="stock-filter">
          <input
            type="checkbox"
            class="stock-filter-input"
            :checked="inStockOnly"
            @change="handleToggleInStock"
          />
          <span class="checkbox" :class="{ checked: inStockOnly }" aria-hidden="true">
            <span v-if="inStockOnly" class="checkmark">✓</span>
          </span>
          <span class="filter-label">只看有货</span>
        </label>
      </div>
    </div>

    <div class="products-header">
      <span class="products-count">
        <template v-if="isProductListHiddenByMaintenance">{{ maintenanceTitle }}</template>
        <template v-else>{{ currentCategoryName }} 共 <strong>{{ total }}</strong> 件物品</template>
        <span v-if="inStockOnly" class="filter-tag">有库存</span>
        <span v-if="hasActivePriceFilter" class="filter-tag price-tag">{{ activePriceFilterLabel }}</span>
      </span>
    </div>

    <div v-if="initialLoading" class="products-loading">
      <Skeleton type="card" :count="6" :columns="gridColumns" />
    </div>

    <div v-else-if="marketProducts.length > 0" class="products-grid" :aria-busy="loading">
      <ProductCard
        v-for="product in marketProducts"
        :key="product.id"
        :product="product"
        :categories="categories"
      />
      <div v-if="hasMore" ref="sentinel" class="load-more">
        <div v-if="loading" class="loading-indicator">
          <span class="spinner"></span>
          <span>加载中...</span>
        </div>
        <span v-else class="load-hint">⬇️ 滚动加载更多</span>
      </div>
      <div v-else class="loaded-all">✨ 已加载全部</div>
    </div>

    <EmptyState
      v-else
      :icon="isProductListHiddenByMaintenance ? '🚧' : '🛒'"
      :text="isProductListHiddenByMaintenance ? maintenanceTitle : '暂无物品'"
      :hint="isProductListHiddenByMaintenance ? maintenanceCatalogHint : '快来发布第一个物品吧~'"
    >
      <template v-if="!isProductListHiddenByMaintenance" #action>
        <router-link to="/seller/products/new" class="btn btn-primary mt-4">➕ 发布物品</router-link>
      </template>
    </EmptyState>
  </section>
</template>

<script setup>
import { computed, nextTick, onActivated, onDeactivated, onMounted, onUnmounted, ref, watch } from 'vue'
import { useShopStore } from '@/stores/shop'
import { useToast } from '@/composables/useToast'
import ProductCard from '@/components/product/ProductCard.vue'
import CategoryFilter from '@/components/product/CategoryFilter.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import Skeleton from '@/components/common/Skeleton.vue'
import { MAINTENANCE_STATE, isMaintenanceFeatureEnabled, isRestrictedMaintenanceMode } from '@/config/maintenance'
import { createTtlLruCache } from '@/utils/ttlLruCache'

defineOptions({ name: 'ProductsMarketplace' })

const shopStore = useShopStore()
const toast = useToast()
const sentinel = ref(null)
const initialLoading = ref(true)
const hasInitialized = ref(false)
const priceMinInput = ref('')
const priceMaxInput = ref('')
const gridColumns = ref(2)
const CATEGORY_CACHE_TTL = 5 * 60 * 1000
const categoryCache = createTtlLruCache({ ttl: CATEGORY_CACHE_TTL, max: 24 })
let lastLoadedAt = 0
let observer = null
let latestCatalogActionId = 0
let activeRequest = null

const sortTabs = [
  { value: 'default', label: '默认' },
  { value: 'newest', label: '最新' },
  { value: 'price_asc', label: '价格↑' },
  { value: 'price_desc', label: '价格↓' },
  { value: 'sales', label: '销量' }
]

const isProductListHiddenByMaintenance = computed(() => (
  isRestrictedMaintenanceMode() && !isMaintenanceFeatureEnabled('productListRead')
))
const maintenanceTitle = computed(() => MAINTENANCE_STATE.title || 'LD士多受限维护中')
const maintenanceCatalogHint = computed(() => (
  MAINTENANCE_STATE.message || '因 LinuxDo 暂时下线 Credit 积分服务，物品列表已临时隐藏。'
))

function consumeStoreError(fallback = '') {
  return shopStore.consumeLastError?.() || fallback
}

function toSafeArray(value) {
  return Array.isArray(value) ? value : []
}

function normalizePriceFilterInput(value) {
  const text = String(value ?? '').trim()
  if (!text) return null
  const parsed = Number.parseFloat(text)
  if (!Number.isFinite(parsed)) return null
  return Math.max(0, Math.round(parsed * 100) / 100)
}

function normalizePriceFilterRange(priceMin, priceMax) {
  let normalizedMin = normalizePriceFilterInput(priceMin)
  let normalizedMax = normalizePriceFilterInput(priceMax)
  if (normalizedMin !== null && normalizedMax !== null && normalizedMin > normalizedMax) {
    ;[normalizedMin, normalizedMax] = [normalizedMax, normalizedMin]
  }
  return { priceMin: normalizedMin, priceMax: normalizedMax }
}

function syncPriceFilterInputs(priceMin, priceMax) {
  priceMinInput.value = priceMin === null || priceMin === undefined || priceMin === '' ? '' : String(priceMin)
  priceMaxInput.value = priceMax === null || priceMax === undefined || priceMax === '' ? '' : String(priceMax)
}

function buildCatalogFilters(overrides = {}) {
  const hasOwn = (key) => Object.prototype.hasOwnProperty.call(overrides, key)
  const range = normalizePriceFilterRange(
    hasOwn('priceMin') ? overrides.priceMin : shopStore.currentPriceMin,
    hasOwn('priceMax') ? overrides.priceMax : shopStore.currentPriceMax
  )
  return {
    inStockOnly: hasOwn('inStockOnly') ? !!overrides.inStockOnly : !!shopStore.inStockOnly,
    priceMin: range.priceMin,
    priceMax: range.priceMax
  }
}

const getCacheKey = (categoryId, sortKey, filters = buildCatalogFilters()) => [
  categoryId || 'all',
  sortKey || 'default',
  filters.inStockOnly ? 'stock' : 'all-stock',
  filters.priceMin ?? 'min-any',
  filters.priceMax ?? 'max-any'
].join('_')

function isSameCatalogState(categoryId, sortKey, filters = buildCatalogFilters()) {
  return String(shopStore.currentCategory) === String(categoryId || '')
    && (shopStore.currentSort || 'default') === (sortKey || 'default')
    && !!shopStore.inStockOnly === !!filters.inStockOnly
    && shopStore.currentPriceMin === (filters.priceMin ?? null)
    && shopStore.currentPriceMax === (filters.priceMax ?? null)
}

function tryRestoreFromCache(categoryId, sortKey, filters = buildCatalogFilters()) {
  const key = getCacheKey(categoryId, sortKey, filters)
  const cached = categoryCache.get(key)
  if (cached && Array.isArray(cached.products)) {
    shopStore.restoreFromCache(cached)
    syncPriceFilterInputs(cached.priceMin, cached.priceMax)
    initialLoading.value = false
    return true
  }
  return false
}

function saveCache(categoryId, sortKey, filters = buildCatalogFilters()) {
  const products = toSafeArray(shopStore.products)
  categoryCache.set(getCacheKey(categoryId, sortKey, filters), {
    categoryId,
    products: [...products],
    total: Number.isFinite(Number(shopStore.total)) ? Number(shopStore.total) : products.length,
    hasMore: !!shopStore.hasMore,
    page: Number.isFinite(Number(shopStore.page)) ? Number(shopStore.page) : 1,
    cursor: shopStore.catalogCursor || '',
    rankingContext: shopStore.rankingContext || null,
    sort: sortKey || 'default',
    inStockOnly: !!filters.inStockOnly,
    priceMin: filters.priceMin ?? null,
    priceMax: filters.priceMax ?? null
  })
}

const categories = computed(() => toSafeArray(shopStore.categories))
const marketCategories = computed(() => categories.value.filter((category) => {
  const name = String(category?.name || '')
  return name && name !== '小店' && name !== '友情小店'
}))
const marketProducts = computed(() => toSafeArray(shopStore.products).filter((product) => product?.product_type !== 'store'))
const currentCategory = computed(() => shopStore.currentCategory)
const currentCategoryName = computed(() => shopStore.currentCategoryName)
const currentSort = computed(() => shopStore.currentSort)
const inStockOnly = computed(() => shopStore.inStockOnly)
const loading = computed(() => shopStore.loading)
const hasMore = computed(() => shopStore.hasMore)
const total = computed(() => shopStore.total)
const hasActivePriceFilter = computed(() => shopStore.currentPriceMin !== null || shopStore.currentPriceMax !== null)
const hasDraftPriceFilter = computed(() => (
  normalizePriceFilterInput(priceMinInput.value) !== null || normalizePriceFilterInput(priceMaxInput.value) !== null
))
const activePriceFilterLabel = computed(() => {
  const { priceMin, priceMax } = buildCatalogFilters()
  if (priceMin !== null && priceMax !== null) return `价格 ${priceMin} - ${priceMax} LDC`
  if (priceMin !== null) return `价格 ≥ ${priceMin} LDC`
  if (priceMax !== null) return `价格 ≤ ${priceMax} LDC`
  return ''
})

watch(
  () => [shopStore.currentPriceMin, shopStore.currentPriceMax],
  ([priceMin, priceMax]) => syncPriceFilterInputs(priceMin, priceMax),
  { immediate: true }
)

function updateGridColumns() {
  const width = window.innerWidth
  gridColumns.value = width >= 1024 ? 4 : (width >= 768 ? 3 : 2)
}

function setupInfiniteScroll() {
  observer?.disconnect()
  if (!sentinel.value || !hasMore.value || typeof IntersectionObserver !== 'function') return
  observer = new IntersectionObserver(async (entries) => {
    if (!entries[0].isIntersecting || loading.value || !hasMore.value) return
    activeRequest?.abort()
    activeRequest = new AbortController()
    const result = await shopStore.loadMore({ signal: activeRequest.signal })
    if (result?.success === false && !result.cancelled) {
      toast.error(result.error || consumeStoreError('加载更多失败，请稍后重试'))
      return
    }
    saveCache(shopStore.currentCategory, shopStore.currentSort || 'default', buildCatalogFilters())
  }, { rootMargin: '100px' })
  observer.observe(sentinel.value)
}

async function loadCatalogState({
  categoryId = shopStore.currentCategory,
  sortKey = shopStore.currentSort || 'default',
  filters = buildCatalogFilters(),
  actionId = null,
  useCache = true,
  signal
} = {}) {
  if (useCache && tryRestoreFromCache(categoryId, sortKey, filters)) {
    await nextTick()
    if (actionId !== null && actionId !== latestCatalogActionId) return { success: false, cancelled: true, error: '' }
    setupInfiniteScroll()
    return { success: true, restored: true }
  }

  initialLoading.value = true
  const result = await shopStore.fetchProducts({
    categoryId,
    forceRefresh: true,
    sort: sortKey,
    priceMin: filters.priceMin,
    priceMax: filters.priceMax,
    signal
  })
  if (actionId !== null && actionId !== latestCatalogActionId) return { success: false, cancelled: true, error: '' }
  initialLoading.value = false
  if (!result?.success) return result
  if (isSameCatalogState(categoryId, sortKey, filters)) saveCache(categoryId, sortKey, filters)
  syncPriceFilterInputs(filters.priceMin, filters.priceMax)
  lastLoadedAt = Date.now()
  await nextTick()
  if (actionId !== null && actionId !== latestCatalogActionId) return { success: false, cancelled: true, error: '' }
  setupInfiniteScroll()
  return result
}

async function runCatalogAction(options) {
  const actionId = ++latestCatalogActionId
  activeRequest?.abort()
  activeRequest = new AbortController()
  const result = await loadCatalogState({ ...options, actionId, signal: activeRequest.signal })
  if (!result?.success && !result?.cancelled) {
    toast.error(result?.error || consumeStoreError('加载物品失败，请稍后重试'))
  }
}

function handleCategorySelect(categoryId) {
  return runCatalogAction({ categoryId, sortKey: shopStore.currentSort || 'default', filters: buildCatalogFilters() })
}

function handleSortChange(sortKey) {
  return runCatalogAction({ categoryId: shopStore.currentCategory, sortKey, filters: buildCatalogFilters() })
}

async function handleToggleInStock() {
  categoryCache.clear()
  shopStore.setInStockOnly(!shopStore.inStockOnly)
  await runCatalogAction({
    categoryId: shopStore.currentCategory,
    sortKey: shopStore.currentSort || 'default',
    filters: buildCatalogFilters(),
    useCache: false
  })
}

function applyPriceFilter() {
  const filters = buildCatalogFilters(normalizePriceFilterRange(priceMinInput.value, priceMaxInput.value))
  syncPriceFilterInputs(filters.priceMin, filters.priceMax)
  return runCatalogAction({ categoryId: shopStore.currentCategory, sortKey: shopStore.currentSort || 'default', filters })
}

function clearPriceFilter() {
  if (!hasDraftPriceFilter.value && !hasActivePriceFilter.value) return
  priceMinInput.value = ''
  priceMaxInput.value = ''
  return runCatalogAction({
    categoryId: shopStore.currentCategory,
    sortKey: shopStore.currentSort || 'default',
    filters: buildCatalogFilters({ priceMin: null, priceMax: null })
  })
}

async function initialize() {
  if (hasInitialized.value) return
  await shopStore.fetchCategories()
  const categoryError = consumeStoreError('')
  if (categoryError) toast.warning(categoryError)
  activeRequest?.abort()
  activeRequest = new AbortController()
  const result = await loadCatalogState({
    categoryId: '',
    sortKey: shopStore.currentSort || 'default',
    filters: buildCatalogFilters(),
    useCache: false,
    signal: activeRequest.signal
  })
  if (!result?.success) toast.error(result?.error || consumeStoreError('加载物品失败，请稍后重试'))
  initialLoading.value = false
  hasInitialized.value = true
}

onMounted(() => {
  updateGridColumns()
  window.addEventListener('resize', updateGridColumns)
  initialize()
})

onActivated(async () => {
  window.addEventListener('resize', updateGridColumns)
  if (!hasInitialized.value || initialLoading.value) return
  if (Date.now() - lastLoadedAt >= CATEGORY_CACHE_TTL) {
    activeRequest?.abort()
    activeRequest = new AbortController()
    await loadCatalogState({ useCache: true, signal: activeRequest.signal })
  } else {
    await nextTick()
    setupInfiniteScroll()
  }
})

onDeactivated(() => {
  latestCatalogActionId++
  activeRequest?.abort()
  observer?.disconnect()
  window.removeEventListener('resize', updateGridColumns)
})

onUnmounted(() => {
  activeRequest?.abort()
  observer?.disconnect()
  window.removeEventListener('resize', updateGridColumns)
})

watch(hasMore, (value) => {
  if (value) nextTick(setupInfiniteScroll)
})
</script>

<style scoped>
.section-content { min-height: 360px; animation: fade-in .3s ease; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
.filter-section, .sort-section { margin-bottom: 12px; }
.sort-section, .catalog-filters, .sort-options, .price-filter, .stock-filter, .products-header, .loading-indicator { display: flex; align-items: center; }
.sort-section { justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.sort-options { gap: 4px; flex-wrap: wrap; }
.catalog-filters { justify-content: flex-end; gap: 12px; flex: 1 1 360px; flex-wrap: wrap; }
.sort-btn { min-height: 32px; padding: 4px 10px; font-size: 12px; color: var(--text-tertiary); background: transparent; border: 0; border-radius: 12px; cursor: pointer; white-space: nowrap; transition: color .2s ease, background-color .2s ease; }
.sort-btn:hover { color: var(--text-secondary); background: var(--bg-tertiary); }
.sort-btn.active { color: var(--color-primary); background: var(--color-primary-bg); font-weight: 500; }
.price-filter { gap: 8px; flex-wrap: wrap; }
.price-filter-input { width: 112px; padding: 8px 10px; border: 1px solid var(--border-color); border-radius: 10px; background: var(--bg-card); color: var(--text-primary); font-size: 12px; }
.price-filter-input:focus { outline: 0; border-color: var(--color-primary); box-shadow: 0 0 0 3px rgba(34, 197, 94, .12); }
.price-filter-separator, .products-count { font-size: 13px; color: var(--text-tertiary); }
.price-filter-btn { min-height: 34px; padding: 8px 12px; border: 0; border-radius: 10px; background: var(--color-primary); color: #fff; font-size: 12px; font-weight: 600; cursor: pointer; }
.price-filter-btn.secondary { background: var(--bg-tertiary); color: var(--text-secondary); }
.stock-filter { position: relative; gap: 6px; cursor: pointer; user-select: none; flex-shrink: 0; }
.stock-filter-input { position: absolute; width: 1px; height: 1px; opacity: 0; }
.checkbox { width: 16px; height: 16px; border: 1.5px solid var(--border-color); border-radius: 4px; display: grid; place-items: center; background: var(--bg-primary); }
.checkbox.checked { background: var(--color-primary); border-color: var(--color-primary); }
.checkmark { color: #fff; font-size: 10px; font-weight: 700; }
.filter-label { font-size: 12px; color: var(--text-secondary); white-space: nowrap; }
.sort-btn:focus-visible, .price-filter-btn:focus-visible, .stock-filter-input:focus-visible + .checkbox { outline: 2px solid var(--color-primary); outline-offset: 3px; }
.products-header { justify-content: space-between; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
.products-count strong { color: var(--text-primary); }
.filter-tag { display: inline-block; margin-left: 8px; padding: 2px 8px; font-size: 11px; color: var(--color-success); background: var(--color-success-bg); border-radius: 10px; }
.filter-tag.price-tag { color: var(--color-primary); background: var(--color-primary-bg); }
.products-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.load-more, .loaded-all { grid-column: 1 / -1; display: flex; align-items: center; justify-content: center; min-height: 64px; padding: 20px; color: var(--text-tertiary); font-size: 13px; }
.loading-indicator { gap: 8px; }
.spinner { width: 16px; height: 16px; border: 2px solid var(--border-medium); border-top-color: var(--color-primary); border-radius: 50%; animation: spin .8s linear infinite; }
.products-loading { min-height: 360px; padding: 20px 0; }
@media (min-width: 768px) { .products-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
@media (min-width: 1024px) { .products-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
@media (max-width: 768px) {
  .sort-section { flex-direction: column; align-items: stretch; gap: 8px; }
  .sort-options { flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none; }
  .sort-btn, .price-filter-input, .price-filter-btn, .stock-filter { min-height: 44px; }
  .catalog-filters { width: 100%; justify-content: flex-start; gap: 8px; }
  .price-filter { width: 100%; gap: 4px; }
  .price-filter-input { flex: 1 1 0; width: auto; min-width: 0; }
}
@keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
@keyframes spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .section-content, .spinner { animation-duration: .01ms; animation-iteration-count: 1; } }
</style>
