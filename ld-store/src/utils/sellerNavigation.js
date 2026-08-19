export function resolveLegacyPublishTarget(query = {}) {
  const type = String(query.type || '').trim().toLowerCase()
  if (type === 'buy' || type === 'request') {
    const nextQuery = { ...query }
    delete nextQuery.type
    return { name: 'BuyRequestPublish', query: nextQuery }
  }
  return { name: 'SellerPublish', query }
}

export function resolveOrderArea(query = {}, sellerMode = false) {
  if (sellerMode) return String(query.source || '').toLowerCase() === 'service' ? 'buy' : 'seller'
  return String(query.tab || '').toLowerCase() === 'buy' ? 'buy' : 'buyer'
}

export function resolveAppViewKey(route = {}) {
  return route?.meta?.layout === 'seller' ? 'seller-layout' : String(route?.path || route?.name || 'route')
}

export function resolveSellerViewKey(route = {}) {
  return String(route?.name || route?.matched?.at?.(-1)?.name || route?.path || 'seller-view')
}
