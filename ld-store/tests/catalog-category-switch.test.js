// @vitest-environment jsdom
/* global document, window */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

let shopStore
let wrapper
const toast = {
  error: vi.fn(),
  warning: vi.fn()
}

vi.mock('../src/stores/catalog', () => ({
  useCatalogStore: () => shopStore
}))

vi.mock('../src/composables/useToast', () => ({
  useToast: () => toast
}))

import ProductsMarketplace from '../src/components/home/ProductsMarketplace.vue'

function successResult(products = []) {
  return {
    success: true,
    status: 200,
    data: {
      products,
      pagination: { total: products.length, page: 1, pageSize: 20, totalPages: 1, hasMore: false }
    }
  }
}

function createStore(products = [{ id: 1, name: '全部物品' }]) {
  const store = {
    categories: [{ id: 2, name: 'AI', icon: '🤖' }],
    products: [...products],
    currentCategory: '',
    currentCategoryName: '全部',
    currentSort: 'default',
    inStockOnly: false,
    currentPriceMin: null,
    currentPriceMax: null,
    loading: false,
    hasMore: false,
    page: 1,
    total: products.length,
    catalogCursor: '',
    rankingContext: null,
    fetchCategories: vi.fn().mockResolvedValue({ success: true, data: { categories: [{ id: 2, name: 'AI' }] } }),
    fetchProducts: vi.fn(async options => {
      store.currentCategory = options.categoryId
      store.currentSort = options.sort
      store.currentPriceMin = options.priceMin
      store.currentPriceMax = options.priceMax
      return successResult(store.products)
    }),
    loadMore: vi.fn(),
    consumeError: vi.fn(() => ''),
    setInStockOnly: vi.fn(value => {
      store.inStockOnly = Boolean(value)
      return store.inStockOnly
    }),
    restoreFromCache: vi.fn(snapshot => {
      store.products = [...snapshot.products]
      store.currentCategory = snapshot.categoryId
      store.currentSort = snapshot.sort
      store.inStockOnly = snapshot.inStockOnly
      store.currentPriceMin = snapshot.priceMin
      store.currentPriceMax = snapshot.priceMax
      store.total = snapshot.total
      store.hasMore = snapshot.hasMore
      store.page = snapshot.page
      store.catalogCursor = snapshot.cursor
      store.rankingContext = snapshot.rankingContext
    })
  }
  return store
}

async function mountMarketplace() {
  wrapper = mount(ProductsMarketplace, {
    attachTo: document.body,
    global: {
      stubs: {
        EmptyState: { template: '<div class="empty-state-stub">暂无物品</div>' },
        ProductCard: { props: ['product'], template: '<div class="product-card-stub">{{ product.name }}</div>' },
        Skeleton: { template: '<div class="skeleton-stub"></div>' }
      }
    }
  })
  await flushPromises()
  shopStore.fetchProducts.mockClear()
  shopStore.restoreFromCache.mockClear()
}

beforeEach(async () => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1280, writable: true })
  shopStore = createStore()
  toast.error.mockClear()
  toast.warning.mockClear()
  await mountMarketplace()
})

afterEach(() => {
  wrapper.unmount()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('ProductsMarketplace category switching', () => {
  it('restores the previous category immediately while a new category is still loading', async () => {
    vi.useFakeTimers()
    shopStore.fetchProducts.mockImplementationOnce(options => new Promise(resolve => {
      shopStore.currentCategory = options.categoryId
      shopStore.products = []
      shopStore.total = 0
      shopStore.loading = true
      const settle = () => resolve({ success: false, aborted: true, kind: 'abort' })
      if (options.signal?.aborted) settle()
      else options.signal?.addEventListener('abort', settle, { once: true })
    }))

    const tabs = wrapper.get('[aria-label="物品分类"]').findAll('.liquid-tab')
    await tabs[1].trigger('click')
    await vi.advanceTimersByTimeAsync(140)
    await flushPromises()
    expect(wrapper.find('.skeleton-stub').exists()).toBe(true)

    await tabs[0].trigger('click')
    await flushPromises()

    expect(shopStore.restoreFromCache).toHaveBeenCalledTimes(1)
    expect(shopStore.products.map(product => product.id)).toEqual([1])
    expect(wrapper.text()).toContain('全部物品')
    expect(wrapper.text()).not.toContain('暂无物品')
    expect(wrapper.find('.skeleton-stub').exists()).toBe(false)
  })

  it('debounces rapid uncached category switches to the last selection', async () => {
    vi.useFakeTimers()
    const tabs = wrapper.get('[aria-label="物品分类"]').findAll('.liquid-tab')
    await tabs[1].trigger('click')
    await tabs[1].trigger('click')
    expect(shopStore.fetchProducts).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(140)
    await flushPromises()
    expect(shopStore.fetchProducts).toHaveBeenCalledTimes(1)
    expect(shopStore.fetchProducts).toHaveBeenCalledWith(expect.objectContaining({ categoryId: 2 }))
  })
})
