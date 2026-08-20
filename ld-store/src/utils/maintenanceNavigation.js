import { MAINTENANCE_MODES } from '@/config/maintenance'

const FULL_MAINTENANCE_ALLOWED_ROUTES = new Set(['Maintenance', 'Login', 'AuthCallback'])
const RESTRICTED_MAINTENANCE_ALLOWED_ROUTES = new Set([
  'Home',
  'ProductDetail',
  'ShopDetail',
  'MerchantProfile',
  'Category',
  'Search',
  'Docs',
  'DocsSection',
  'Support',
  'Login',
  'AuthCallback',
  'Orders',
  'SellerDashboard',
  'SellerOrders',
  'SellerProducts',
  'SellerOrderDetail',
  'OrderDetail',
  'BuyOrderDetail',
  'CouponClaim',
  'MyCoupons',
])

export function resolveMaintenanceRedirect(routeName, mode) {
  const normalizedRouteName = String(routeName || '')

  if (mode === MAINTENANCE_MODES.FULL) {
    if (!FULL_MAINTENANCE_ALLOWED_ROUTES.has(normalizedRouteName)) {
      return { name: 'Maintenance', replace: true }
    }
    return null
  }

  if (mode === MAINTENANCE_MODES.LDC_RESTRICTED) {
    if (!RESTRICTED_MAINTENANCE_ALLOWED_ROUTES.has(normalizedRouteName)) {
      return { name: 'Home', replace: true }
    }
    return null
  }

  if (normalizedRouteName === 'Maintenance') {
    return { name: 'Home', replace: true }
  }

  return null
}

export function startBackgroundMaintenanceRefresh(refresh, onLoaded, onError = () => {}) {
  try {
    const refreshResult = refresh()
    void Promise.resolve(refreshResult).then(onLoaded, onError)
  } catch (error) {
    onError(error)
  }
}
