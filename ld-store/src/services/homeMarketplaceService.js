import { api } from '@/utils/api'

export function fetchMarketplaceShops({ page, pageSize, tags = [], search = '', signal } = {}) {
  const params = new URLSearchParams({
    page: String(page || 1),
    pageSize: String(pageSize || 20)
  })
  for (const tag of tags) params.append('tag', tag)
  if (search.trim()) params.set('search', search.trim())
  return api.get(`/api/shops?${params.toString()}`, { signal })
}

export function fetchMarketplaceBuyRequests({ page, pageSize, status = '', search = '', signal } = {}) {
  const params = new URLSearchParams({
    page: String(page || 1),
    pageSize: String(pageSize || 20),
    sort: 'random'
  })
  if (status) params.set('status', status)
  if (search.trim()) params.set('search', search.trim())
  return api.get(`/api/shop/buy-requests?${params.toString()}`, { signal })
}

export function fetchMarketplaceHotboard({ signal } = {}) {
  return api.get('/api/shop/hotboard', { signal })
}
