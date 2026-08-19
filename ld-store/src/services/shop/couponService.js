import { api } from '@/utils/api'

function buildQuery(params = {}) {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') query.set(key, String(value))
  }
  const text = query.toString()
  return text ? `?${text}` : ''
}

export function getCouponRequest(token) {
  return api.get(`/api/shop/coupons/${encodeURIComponent(token)}`)
}

export function claimCouponRequest(token) {
  return api.post(`/api/shop/coupons/${encodeURIComponent(token)}/claim`)
}

export function fetchMyCouponsRequest(status = 'unused', page = 1, pageSize = 20) {
  return api.get(`/api/shop/my-coupons${buildQuery({ status, page, pageSize })}`)
}

export function quoteOrderRequest(productId, quantity = 1) {
  return api.post('/api/shop/orders/quote', { productId, quantity })
}

export function fetchSellerCouponsRequest(params = {}) {
  return api.get(`/api/shop/merchant/coupons${buildQuery(params)}`)
}

export function getSellerCouponRequest(id) {
  return api.get(`/api/shop/merchant/coupons/${id}`)
}

export function createCouponRequest(data) {
  return api.post('/api/shop/merchant/coupons', data)
}

export function increaseCouponQuotaRequest(id, totalQuantity) {
  return api.request(`/api/shop/merchant/coupons/${id}/quota`, {
    method: 'PATCH',
    body: { totalQuantity }
  })
}

export function closeCouponRequest(id) {
  return api.post(`/api/shop/merchant/coupons/${id}/close`)
}

export function formatCouponRule(campaign = {}) {
  if (campaign.discountType === 'fixed_amount') {
    return `减 ${Number(campaign.fixedAmount || 0).toFixed(2)} LDC`
  }
  const bps = Number(campaign.percentageBps || 0)
  return `${(bps / 1000).toFixed(bps % 1000 === 0 ? 0 : 1)} 折 · 仅优惠 1 件`
}

export function formatCouponDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(date).replaceAll('/', '-')
}

export function getCouponUsePath(campaign = {}) {
  if (campaign.scopeType === 'product' && campaign.productId) return `/product/${campaign.productId}`
  return campaign.sellerUsername ? `/merchant/${encodeURIComponent(campaign.sellerUsername)}` : '/'
}
