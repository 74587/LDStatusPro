/* global URL, structuredClone */
import { ref } from 'vue'
import { serviceOrder, serviceProducts, servicePackages } from '../top-service-data'
export const scenario = ref('default')
export const previewRequests = ref([])
let products = serviceProducts()
let packages = servicePackages()
let orders = []
export function resetScenario(value) {
  scenario.value = value; products = serviceProducts(); packages = servicePackages(); orders = []
  if (value === 'full') products.forEach(p => { p.quota.globalRemaining = 0; p.quota.categoryRemaining = 0 })
  if (value === 'empty') products = []
  if (value === 'unavailable') packages.forEach(group => group.options.forEach(option => { option.isEnabled = false }))
  if (value === 'history') orders = Array.from({ length: 26 }, (_, index) => serviceOrder({ orderNo: `LT-HISTORY-${String(index + 1).padStart(3, '0')}`, status: 'expired', canPay: false, canCancel: false, effectiveAt: '2026-08-25 12:00:00', expiredAt: '2026-08-28 12:00:00' }))
  if (['pending', 'paid', 'mismatch', 'expired', 'refund', 'cancel-race'].includes(value)) {
    let order = serviceOrder({ paymentUrl: '#isolated-payment-disabled' })
    if (['paid', 'mismatch'].includes(value)) order = { ...order, status: 'active', effectiveAt: '2026-08-31 12:00:00', expiredAt: '2026-09-03 12:00:00', canPay: false, canCancel: false }
    if (value === 'mismatch') order = { ...order, isSuspendedForCategory: true, isCategoryMatched: false, currentCategoryName: '卡券' }
    if (value === 'expired') order = { ...order, status: 'expired', payExpiredAtMs: Date.now() - 1000, canPay: false, canCancel: false }
    if (value === 'refund') order = { ...order, status: 'expired', paymentReversalStatus: 'unknown', canPay: false, canCancel: false }
    orders = [order]
    if (['pending', 'active', 'suspended'].includes(order.status)) products[0].currentTopOrder = order
  }
}
const ok = data => ({ success: true, data })
export const api = {
  async get(raw) {
    previewRequests.value.push(`GET ${raw}`)
    const url = new URL(raw, 'http://127.0.0.1:4183')
    if (url.pathname.endsWith('/options')) return scenario.value === 'options-error' ? { success: false, error: '模拟网络异常，无法加载服务信息' } : ok({ products: structuredClone(products).map(p => { if (scenario.value === 'legacy-images') delete p.imageUrl; return p }), packages })
    if (url.pathname === '/api/shop/my-products') return ok({ products: products.map(p => ({ id: p.id, image_url: p.imageUrl })), pagination: { page: 1, totalPages: 1 } })
    if (url.pathname.endsWith('/payment-url')) return ok({ paymentUrl: '#isolated-payment-disabled' })
    if (url.pathname.endsWith('/board')) return ok({ globalPools: [{ key: 'shared', name: '全部分类共享甄选池', limit: 4, used: 2, remaining: 2, pendingUsed: 1, usesSharedGlobalPool: true }], categories: products.map(p => ({ categoryId: p.categoryId, categoryName: p.categoryName, ...p.quota, categoryUsed: 1, globalUsed: 2, globalVisibleCount: 1, visibleTotal: 2 })), activeRecords: [], generatedAt: '2026-08-31 12:00:00' })
    const search = url.searchParams.get('search') || ''
    const status = url.searchParams.get('status') || ''
    const filtered = orders.filter(o => (!search || `${o.orderNo}${o.productName}`.includes(search)) && (!status || o.status === status))
    const page = Number(url.searchParams.get('page') || 1)
    const pageSize = Number(url.searchParams.get('pageSize') || 20)
    return ok({ orders: structuredClone(filtered.slice((page - 1) * pageSize, page * pageSize)), pagination: { page, total: filtered.length, pageSize, totalPages: Math.ceil(filtered.length / pageSize) } })
  },
  async post(url, payload) {
    previewRequests.value.push(`POST ${url} (simulated)`)
    if (url.endsWith('/cancel')) {
      if (scenario.value === 'cancel-race') {
        orders[0] = { ...orders[0], status: 'active', canPay: false, canCancel: false, effectiveAt: '2026-08-31 12:00:00', expiredAt: '2026-09-03 12:00:00' }
        products[0].currentTopOrder = orders[0]
        return { success: false, error: '订单已经支付，无法取消' }
      }
      orders[0] = { ...orders[0], status: 'cancelled', canPay: false, canCancel: false }; products[0].currentTopOrder = null
      return ok({ status: 'cancelled' })
    }
    if (url.endsWith('/refresh')) return ok({ status: orders[0]?.status })
    const product = products.find(p => p.id === payload.productId)
    const group = packages.find(p => p.type === payload.packageType)
    const option = group.options.find(o => o.durationDays === payload.durationDays)
    const order = serviceOrder({ ...payload, productName: product.name, categoryId: product.categoryId, categoryName: product.categoryName, boundCategoryId: product.categoryId, boundCategoryName: product.categoryName, boundUsesSharedGlobalPool: product.quota.usesSharedGlobalPool, packageName: group.name, amount: option.price + (scenario.value === 'price-change' ? 2 : 0), paymentUrl: '#isolated-payment-disabled' })
    orders.unshift(order); product.currentTopOrder = order
    if (scenario.value === 'create-timeout') return { success: false, status: 0, error: '模拟创建响应超时' }
    return ok({ order, orderNo: order.orderNo, paymentUrl: order.paymentUrl })
  }
}
