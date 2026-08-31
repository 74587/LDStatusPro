export function servicePackages() {
  return [
    { type: 'global', name: '士多甄选', options: [{ durationDays: 1, price: 18, isEnabled: true }, { durationDays: 3, price: 48, isEnabled: true }, { durationDays: 7, price: 98, isEnabled: true }] },
    { type: 'category', name: '士多优选', options: [{ durationDays: 1, price: 8, isEnabled: true }, { durationDays: 3, price: 20, isEnabled: true }, { durationDays: 7, price: 42, isEnabled: true }] }
  ]
}
export function serviceProducts() {
  return [
    { id: 301, name: '轻量云服务 · 一个月使用权益', categoryId: 10, categoryName: '服务', imageUrl: '/tests/fixtures/top-service-preview/images/cloud.jpg', currentTopOrder: null, quota: { globalRemaining: 2, globalLimit: 4, globalPendingUsed: 1, categoryRemaining: 3, categoryLimit: 4, usesSharedGlobalPool: true, globalPoolName: '全部分类共享甄选池' } },
    { id: 302, name: '周末咖啡兑换卡 · 双人套餐（仅供本地界面验收，不是真实商品）', categoryId: 11, categoryName: '卡券', imageUrl: '/tests/fixtures/top-service-preview/images/coffee.jpg', currentTopOrder: null, quota: { globalRemaining: 4, globalLimit: 6, categoryRemaining: 6, categoryLimit: 6, usesSharedGlobalPool: false, globalPoolName: '卡券独立甄选池' } },
    { id: 303, name: '社区邀请名额', categoryId: 12, categoryName: '入站', imageUrl: '', currentTopOrder: null, quota: { globalRemaining: 1, globalLimit: 6, categoryRemaining: 2, categoryLimit: 6, usesSharedGlobalPool: false, globalPoolName: '入站独立甄选池' } }
  ]
}
export function serviceOrder(overrides = {}) {
  return { id: 1, orderNo: 'LT-PREVIEW-001', productId: 301, productName: serviceProducts()[0].name, categoryId: 10, categoryName: '服务', boundCategoryId: 10, boundCategoryName: '服务', currentCategoryId: 10, currentCategoryName: '服务', categoryBindingApplies: true, isCategoryMatched: true, boundUsesSharedGlobalPool: true, packageType: 'global', packageName: '士多甄选', durationDays: 3, amount: 48, isPaidService: true, status: 'pending', canPay: true, canCancel: true, createdAt: '2026-08-31 12:00:00', payExpiredAtMs: Date.now() + 300_000, paymentUrl: 'https://credit.example/isolated-payment', ...overrides }
}
