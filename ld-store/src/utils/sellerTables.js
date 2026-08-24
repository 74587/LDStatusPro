export function normalizeSellerPage(value, totalPages = Number.POSITIVE_INFINITY) {
  const parsed = Number.parseInt(value, 10)
  const page = Number.isInteger(parsed) && parsed > 0 ? parsed : 1
  return Number.isFinite(totalPages) ? Math.min(page, Math.max(1, totalPages)) : page
}

export function buildSellerOrderQuery({
  page = 1,
  pageSize = 20,
  source = 'product',
  search = '',
  timeRange = '1m',
  status = '',
  categoryId = 0,
  dealOnly = false
} = {}) {
  const serviceSource = String(source).toLowerCase() === 'service'
  const options = {
    page: normalizeSellerPage(page),
    pageSize: Math.max(1, Number.parseInt(pageSize, 10) || 20),
    search: String(search || '').trim(),
    timeRange: String(timeRange || '1m')
  }
  if (serviceSource) {
    options.role = 'provider'
    return options
  }
  const normalizedCategoryId = Number.parseInt(categoryId, 10)
  if (Number.isInteger(normalizedCategoryId) && normalizedCategoryId > 0) options.categoryId = normalizedCategoryId
  if (dealOnly) options.dealOnly = true
  if (status) options.status = String(status)
  return options
}

export function buildSellerOrderTabQuery(query = {}, { source = 'product', status = '' } = {}) {
  const nextQuery = { ...query }
  const normalizedSource = String(source || '').toLowerCase() === 'service' ? 'service' : 'product'
  const normalizedStatus = String(status || '').trim()

  nextQuery.source = normalizedSource
  delete nextQuery.tab
  delete nextQuery.page

  if (normalizedSource === 'service') {
    delete nextQuery.categoryId
    delete nextQuery.categoryName
    delete nextQuery.dealOnly
    delete nextQuery.status
  } else if (normalizedStatus) {
    nextQuery.status = normalizedStatus
  } else {
    delete nextQuery.status
  }

  return nextQuery
}

export function isSellerOrderTabQueryMatch(query = {}, { source = 'product', status = '' } = {}) {
  const normalizedSource = String(source || '').toLowerCase() === 'service' ? 'service' : 'product'
  const querySource = String(query.source || '').toLowerCase() === 'service' ? 'service' : 'product'
  if (querySource !== normalizedSource) return false
  if (normalizedSource === 'service') return true
  return String(query.status || '').trim() === String(status || '').trim()
}

export function createLatestRequestGuard() {
  let latestToken = 0
  return {
    begin() {
      latestToken += 1
      return latestToken
    },
    isLatest(token) {
      return token === latestToken
    },
    invalidate() {
      latestToken += 1
    }
  }
}

export function paginateSellerRows(rows = [], page = 1, pageSize = 20) {
  const safeSize = Math.max(1, Number.parseInt(pageSize, 10) || 20)
  const total = rows.length
  const totalPages = Math.max(1, Math.ceil(total / safeSize))
  const safePage = normalizeSellerPage(page, totalPages)
  const start = (safePage - 1) * safeSize
  return { rows: rows.slice(start, start + safeSize), page: safePage, pageSize: safeSize, total, totalPages }
}

export function filterAndSortSellerProducts(products = [], filters = {}, accessors = {}) {
  const search = String(filters.search || '').trim().toLowerCase()
  const status = String(filters.status || '').trim().toLowerCase()
  const type = String(filters.type || '').trim().toLowerCase()
  const stock = String(filters.stock || '').trim().toLowerCase()
  const sort = String(filters.sort || 'priority').trim().toLowerCase()
  const getStatus = accessors.getStatus || (product => String(product.status || ''))
  const getType = accessors.getType || (product => String(product.product_type || product.productType || ''))
  const getPrice = accessors.getPrice || (product => Number(product.price || 0) * Number(product.discount || 1))
  const getStock = accessors.getStock || (product => Number(product.stock || 0))
  const isStockManaged = accessors.isStockManaged || (() => true)
  const priority = accessors.priority || (() => 999)

  const filtered = products.filter(product => {
    const productStatus = String(getStatus(product) || '').toLowerCase()
    const productType = String(getType(product) || '').toLowerCase()
    const searchable = `${product.name || ''} ${product.id || ''} ${product.category_name || ''}`.toLowerCase()
    if (search && !searchable.includes(search)) return false
    if (status && !productStatus.includes(status)) return false
    if (type && productType !== type) return false
    if (stock) {
      if (!isStockManaged(product)) return false
      const value = getStock(product)
      if (stock === 'out' && value !== 0) return false
      if (stock === 'low' && !(value >= 1 && value <= 5)) return false
      if (stock === 'available' && value <= 5) return false
    }
    return true
  })

  return [...filtered].sort((a, b) => {
    if (sort === 'price-desc') return getPrice(b) - getPrice(a)
    if (sort === 'price-asc') return getPrice(a) - getPrice(b)
    if (sort === 'views') return Number(b.view_count || 0) - Number(a.view_count || 0)
    if (sort === 'sold') return Number(b.sold_count || 0) - Number(a.sold_count || 0)
    if (sort === 'updated') return new Date(b.updated_at || b.updatedAt || b.created_at || 0) - new Date(a.updated_at || a.updatedAt || a.created_at || 0)
    const statusDiff = priority(a) - priority(b)
    if (statusDiff) return statusDiff
    return new Date(b.updated_at || b.updatedAt || b.created_at || 0) - new Date(a.updated_at || a.updatedAt || a.created_at || 0)
  })
}

export function resolveSellerStatusTone(status = '') {
  const value = String(status).toLowerCase()
  if (value.includes('reject') || value.includes('refund')) return 'danger'
  if (value.includes('pending') || value === 'paid') return 'warning'
  if (value.includes('approve') || value === 'active' || value === 'delivered' || value === 'completed') return 'success'
  if (value === 'cancelled' || value.includes('offline') || value === 'inactive') return 'neutral'
  if (value.includes('manual')) return 'warning'
  return 'info'
}

export function buildSellerProductPrice(product = {}) {
  const parsedOriginal = Number(product.price ?? product.originalPrice ?? product.original_price ?? 0)
  const original = Number.isFinite(parsedOriginal) ? Math.max(0, parsedOriginal) : 0
  const parsedDiscount = Number(product.discount ?? 1)
  const discount = Number.isFinite(parsedDiscount)
    ? Math.min(1, Math.max(0, parsedDiscount))
    : 1
  const current = original * discount
  const hasDiscount = discount < 0.9999
  const discountNumber = Number((discount * 10).toFixed(2))

  return {
    original,
    current,
    discount,
    hasDiscount,
    discountLabel: hasDiscount ? `${discountNumber}折` : '无折扣'
  }
}
