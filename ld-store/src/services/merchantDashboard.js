import { api } from '@/utils/api'

const VALID_RANGES = new Set(['7d', '30d', '90d'])

export function fetchMerchantDashboard(range = '30d') {
  const normalized = VALID_RANGES.has(range) ? range : '30d'
  return api.get(`/api/shop/merchant/dashboard?range=${normalized}`, { timeout: 20_000 })
}
