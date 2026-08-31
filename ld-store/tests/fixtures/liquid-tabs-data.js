// Synthetic data only. Shared by isolated component tests and the local preview.
/* global URL */
export const previewCampaign = {
  id: 1, name: '液态 Tab 验收券', state: 'active', scopeType: 'seller',
  discountType: 'fixed_amount', fixedAmount: 10, minSpend: 0,
  totalQuantity: 100, claimedCount: 0, counts: { used: 0, reserved: 0 },
  startsAt: '2026-08-01T00:00:00Z', expiresAt: '2027-08-01T00:00:00Z',
  claimPath: '/coupon/preview-only', events: []
}

export const previewDashboard = {
  today: { revenue: 120, orders: 3 }, lifetime: { orders: 10 },
  period: { generatedAt: '2026-08-31T04:00:00Z', current: { startAt: '2026-08-01', endAt: '2026-08-31' } },
  kpis: Object.fromEntries(['revenue', 'orders', 'buyers', 'views'].map((key, index) => [key, { current: [1200, 30, 20, 360][index], changeRate: 10 }])),
  sourceBreakdown: { product: { revenue: 1000, orders: 25 }, service: { revenue: 200, orders: 5 } },
  businessStatus: { products: { total: 12, approved: 10 }, merchant: { configured: true, verified: true } },
  tasks: [], topProducts: [], recentOrders: [], trend: []
}

export function previewResponse(input) {
  const url = new URL(input, 'http://preview.invalid')
  const path = url.pathname
  const pagination = { page: Number(url.searchParams.get('page') || 1), pageSize: 20, total: 0, totalPages: 0 }
  let data
  if (path === '/api/shop/merchant/dashboard') data = previewDashboard
  else if (path === '/api/shop/merchant/coupons') data = { items: [previewCampaign], pagination: { ...pagination, total: 1, totalPages: 1 } }
  else if (path === '/api/shop/merchant/coupons/1') data = previewCampaign
  else if (path === '/api/shop/merchant/coupons/1/claims') data = { items: [], pagination }
  else if (path === '/api/shop/refunds') data = { refunds: [], pagination, summary: { total: 1234, actionRequired: 12, requested: 10, negotiating: 2, exception: 0, externalDispute: 0, closed: 1222 } }
  else if (path === '/api/shop/top-service/options') data = { packages: [], products: [] }
  else if (path === '/api/shop/top-service/board') data = { categories: [], globalPools: [], activeRecords: [], generatedAt: '2026-08-31 12:00:00' }
  else if (['/api/shop/orders', '/api/shop/buy-orders', '/api/shop/top-service/orders'].includes(path)) data = { orders: [], pagination }
  else if (path === '/api/shop/my-products') data = { products: [] }
  else if (path === '/api/shop/categories') data = { categories: [
    { id: 1, name: 'AI', icon: '🤖' }, { id: 2, name: '存储', icon: '💾' },
    { id: 3, name: '小鸡', icon: '🐣' }, { id: 4, name: '咨询', icon: '💬' },
    { id: 5, name: '卡券', icon: '🎟️' }, { id: 6, name: '入站', icon: '🚪' }
  ] }
  else if (path === '/api/shop/stats') data = { products: { online: 0, total: 0 }, orders: {}, stores: 0 }
  else if (path === '/api/shop/products') data = { products: [], pagination }
  else if (path === '/api/shops') data = { shops: [], pagination }
  else if (path === '/api/shop/buy-requests') data = { items: [], pagination }
  else throw new Error(`No isolated fixture for ${path}`)
  return { success: true, data: JSON.parse(JSON.stringify(data)) }
}
