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
  const routeName = String(route?.name || '')
  const routePath = String(route?.path || '')
  if (routeName === 'Docs' || routeName === 'DocsSection' || routePath === '/docs' || routePath.startsWith('/docs/')) {
    return 'docs-help-center'
  }
  return route?.meta?.layout === 'seller' ? 'seller-layout' : String(route?.path || route?.name || 'route')
}

export function resolveSellerViewKey(route = {}) {
  return String(route?.name || route?.matched?.at?.(-1)?.name || route?.path || 'seller-view')
}

export function isSellerNavigationItemActive(route = {}, item = {}) {
  const routeName = String(route?.name || '')
  const activeRouteNames = Array.isArray(item?.activeRouteNames) ? item.activeRouteNames : []

  if (routeName && activeRouteNames.length > 0) {
    return activeRouteNames.includes(routeName)
  }

  const routePath = String(route?.path || '').replace(/\/$/, '') || '/'
  const itemPath = String(item?.to || '').replace(/\/$/, '') || '/'
  if (item?.exact || item?.matchChildren === false) return routePath === itemPath
  return routePath === itemPath || routePath.startsWith(`${itemPath}/`)
}
