import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { beginCatalogRotation, catalogRotationKey, rememberCatalogSlate } from '../src/utils/catalogRotation'
import { fetchProductsRequest } from '../src/services/shop/catalogService'
import { useShopStore } from '../src/stores/shop'
import { api } from '../src/utils/api'

vi.mock('../src/utils/api', () => ({ api: { get: vi.fn(), post: vi.fn() } }))
const first = '7bf4e11a-1615-4c93-91d8-e17d72f5f0a1'
const second = '7bf4e11a-1615-4c93-91d8-e17d72f5f0a2'
function memoryStorage() {
  const map = new Map()
  return { getItem: key => map.get(key) || null, setItem: (key, value) => map.set(key, value), removeItem: key => map.delete(key) }
}
describe('V2.2 recommendation rotation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('window', { sessionStorage: memoryStorage(), localStorage: memoryStorage() })
    vi.stubGlobal('localStorage', globalThis.window.localStorage)
    vi.stubGlobal('navigator', { globalPrivacyControl: false, doNotTrack: '0' })
    vi.stubGlobal('crypto', { randomUUID: vi.fn().mockReturnValueOnce(first).mockReturnValue(second) })
    setActivePinia(createPinia())
  })
  afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers() })

  it('new first-page requests rotate; only the same filter remembers the previous slate', () => {
    expect(beginCatalogRotation().rotationId).toBe(first)
    rememberCatalogSlate({}, first)
    expect(beginCatalogRotation()).toEqual({ rotationId: second, previousSlateId: first })
    expect(beginCatalogRotation({ categoryId: 4 }).previousSlateId).toBe('')
    expect(catalogRotationKey({ priceMin: 5 })).not.toBe(catalogRotationKey({ priceMin: 8 }))
    vi.useFakeTimers()
    vi.advanceTimersByTime(31 * 60 * 1000)
    expect(beginCatalogRotation().previousSlateId).toBe('')
  })
  it('privacy opt-out does not retain slate identifiers', () => {
    vi.stubGlobal('navigator', { globalPrivacyControl: true })
    rememberCatalogSlate({}, first)
    expect(beginCatalogRotation().previousSlateId).toBe('')
  })
  it('only default recommendation first pages send rotation parameters', async () => {
    api.get.mockResolvedValue({ success: true, data: { rankingContext: { slateId: first } } })
    await fetchProductsRequest()
    expect(api.get.mock.lastCall[0]).toContain(`rotationId=${first}`)
    await fetchProductsRequest()
    expect(api.get.mock.lastCall[0]).toContain(`previousSlateId=${first}`)
    for (const options of [{ search: 'apple' }, { sort: 'newest' }, { sort: 'price_asc' }, { page: 2, cursor: 'cursor' }]) {
      await fetchProductsRequest(options)
      expect(api.get.mock.lastCall[0]).not.toMatch(/rotationId|previousSlateId/)
    }
  })
  it('failed rotation retains the visible list, page, context, and cursor', async () => {
    const store = useShopStore()
    store.restoreFromCache({ products: [{ id: 1 }], page: 3, total: 80, hasMore: true,
      cursor: 'old-cursor', rankingContext: { slateId: first } })
    let finish
    api.get.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    const request = store.fetchProducts({ forceRefresh: true, preserveProducts: true })
    expect(store.products.map(item => item.id)).toEqual([1])
    finish({ success: false, error: 'network unavailable' })
    expect((await request).success).toBe(false)
    expect(store.products.map(item => item.id)).toEqual([1])
    expect(store.page).toBe(3)
    expect(store.catalogCursor).toBe('old-cursor')
    expect(store.rankingContext.slateId).toBe(first)
    expect(store.loading).toBe(false)
  })
  it('newer filter request wins over a late failed rotation', async () => {
    const store = useShopStore()
    store.restoreFromCache({ products: [{ id: 1 }] })
    let finish
    api.get.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    const old = store.fetchProducts({ forceRefresh: true, preserveProducts: true })
    api.get.mockResolvedValueOnce({ success: true, data: { products: [{ id: 2 }] } })
    await store.fetchProducts({ categoryId: 2 })
    finish({ success: false, error: 'late failure' })
    expect((await old).cancelled).toBe(true)
    expect(store.products.map(item => item.id)).toEqual([2])
  })
})
