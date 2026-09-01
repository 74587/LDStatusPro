import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useUserStore } from '@/stores/user'
import { useNotificationSummaryStore } from '@/stores/notificationSummary'
import { storage } from '@/utils/storage'
import { clearDiscoveryTokenForProduct, getDiscoveryTokenForProduct } from '@/services/shop/discoveryService'
import {
  addFavoriteRequest,
  blockProductRequest,
  createProductCommentReplyRequest,
  createProductCommentRequest,
  deleteProductCommentRequest,
  fetchCategoriesRequest,
  fetchFavoritesRequest,
  fetchBlockedProductsRequest,
  fetchMerchantProfileRequest,
  fetchProductCommentRepliesRequest,
  fetchProductCommentsRequest,
  fetchProductRequest,
  fetchProductsRequest,
  fetchPublicStatsRequest,
  fetchUserDashboardRequest,
  fetchMyReportsRequest,
  fetchMyReportDetailRequest,
  getProductRestockSubscriptionStatusRequest,
  normalizeFavoritesOptions,
  removeFavoriteRequest,
  reportProductCommentRequest,
  reportProductRequest,
  subscribeProductRestockRequest,
  unblockProductRequest,
  voteProductCommentRequest
} from '@/services/shop/catalogService'
import {
  addCdkRequest,
  clearCdkRequest,
  createProductRequest,
  deleteCdkRequest,
  deleteProductRequest,
  fetchCdkListRequest,
  fetchMyProductDetailRequest,
  fetchMyProductsRequest,
  getProductSubmissionStatusRequest,
  offlineProductRequest,
  updateProductRequest
} from '@/services/shop/inventoryService'
import {
  fetchMerchantConfigRequest,
  updateMerchantConfigRequest
} from '@/services/shop/merchantService'
import {
  cancelOrderRequest,
  createOrderRequest,
  deliverOrderRequest,
  fetchMyBuyOrdersRequest,
  fetchOrderDetailRequest,
  fetchOrdersByRoleRequest,
  getBuyOrderDetailRequest,
  getBuyOrderPaymentUrlRequest,
  getPaymentUrlRequest,
  normalizeBuyOrderListOptions,
  normalizeOrderListOptions,
  refreshBuyOrderStatusRequest,
  refreshOrderStatusRequest
} from '@/services/shop/orderService'

const DEFAULT_PAGE_SIZE = 20
const CACHE_TTL = 60000
const IN_STOCK_ONLY_STORAGE_KEY = 'shop_in_stock_only'

function getPositiveInt(value, fallback, min = 1, max = Number.POSITIVE_INFINITY) {
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(Math.max(parsed, min), max)
}

function createEmptyListState(page, pageSize) {
  return {
    orders: [],
    pagination: {
      total: 0,
      page,
      pageSize,
      totalPages: 0
    }
  }
}

function normalizePriceFilterValue(value) {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number.parseFloat(String(value).trim())
  if (!Number.isFinite(parsed)) return null
  return Math.max(0, Math.round(parsed * 100) / 100)
}

function normalizePriceRange(priceMin, priceMax) {
  let normalizedMin = normalizePriceFilterValue(priceMin)
  let normalizedMax = normalizePriceFilterValue(priceMax)

  if (normalizedMin !== null && normalizedMax !== null && normalizedMin > normalizedMax) {
    ;[normalizedMin, normalizedMax] = [normalizedMax, normalizedMin]
  }

  return {
    priceMin: normalizedMin,
    priceMax: normalizedMax
  }
}

export const useShopStore = defineStore('shop', () => {
  // 状态
  const categories = ref([])
  const products = ref([])
  const currentCategory = ref('')
  const loading = ref(false)
  const hasMore = ref(true)
  const page = ref(1)
  const total = ref(0)
  const catalogCursor = ref('')
  const rankingContext = ref(null)
  const pageSize = DEFAULT_PAGE_SIZE

  // 搜索状态
  const searchQuery = ref('')
  const searchResults = ref([])
  const searchLoading = ref(false)
  const searchCursor = ref('')
  const searchRankingContext = ref(null)

  // 我的商品
  const myProducts = ref([])
  const myProductsLoading = ref(false)

  // 我的订单
  const myOrders = ref([])
  const sellerOrders = ref([])
  const myBuyOrders = ref([])
  const myFavorites = ref([])
  const blockedProducts = ref([])
  const blockedProductIds = ref(new Set())
  const favoritesLoading = ref(false)
  const blocksLoading = ref(false)
  const ordersLoading = ref(false)
  const lastError = ref('')

  function setLastError(message = '') {
    lastError.value = String(message || '').trim()
  }

  function consumeLastError() {
    const message = lastError.value
    lastError.value = ''
    return message
  }

  function toSafeArray(value) {
    return Array.isArray(value) ? value : []
  }

  function getCategoryCacheKey() {
    const userStore = useUserStore()
    const trustLevel = Number.isInteger(Number(userStore.trustLevel))
      ? Number(userStore.trustLevel)
      : 0
    return `${userStore.isLoggedIn ? 'auth' : 'guest'}:${trustLevel}`
  }

  // 缓存
  const productCache = new Map()
  const categoryCache = ref({ key: '', data: null, time: 0 })
  let latestProductsRequestId = 0

  // 排序状态
  const currentSort = ref('default')

  // 筛选：只看有库存
  const inStockOnly = ref(storage.get(IN_STOCK_ONLY_STORAGE_KEY, false) === true)
  const currentPriceMin = ref(null)
  const currentPriceMax = ref(null)

  // 计算属性
  const currentCategoryName = computed(() => {
    if (!currentCategory.value) return '全部'
    const category = categories.value.find(item => String(item.id) === String(currentCategory.value))
    return category ? category.name : '全部'
  })

  // 获取分类列表
  async function fetchCategories(force = false) {
    const now = Date.now()
    const cacheKey = getCategoryCacheKey()
    if (
      !force
      && categoryCache.value.key === cacheKey
      && Array.isArray(categoryCache.value.data)
      && now - categoryCache.value.time < CACHE_TTL
    ) {
      categories.value = categoryCache.value.data
      setLastError('')
      return categories.value
    }

    try {
      const result = await fetchCategoriesRequest()
      if (result.success && Array.isArray(result.data?.categories)) {
        const nextCategories = toSafeArray(result.data.categories)
        categories.value = nextCategories
        categoryCache.value = { key: cacheKey, data: nextCategories, time: now }
        setLastError('')
      } else if (result.success) {
        categories.value = []
        setLastError('分类数据格式异常，请稍后重试')
      } else {
        setLastError(result.error || '加载分类失败，请稍后重试')
      }
    } catch (error) {
      console.error('Fetch categories failed:', error)
      setLastError(error.message || '加载分类失败，请稍后重试')
    }

    return categories.value
  }

  // 获取商品列表
  async function fetchProducts(categoryInput = '', forceRefresh = false, sort = '') {
    const preserveRequested = categoryInput?.preserveProducts === true
    const previousCatalog = { products: products.value, page: page.value, total: total.value,
      hasMore: hasMore.value, cursor: catalogCursor.value, rankingContext: rankingContext.value }
    let categoryId = categoryInput
    let requestedSort = sort
    let requestedPage = null
    let requestedPriceMin = currentPriceMin.value
    let requestedPriceMax = currentPriceMax.value
    let requestSignal

    // 兼容旧调用风格：fetchProducts({ category, page, sort, priceMin, priceMax })
    if (categoryInput && typeof categoryInput === 'object' && !Array.isArray(categoryInput)) {
      categoryId = categoryInput.categoryId ?? categoryInput.category ?? ''
      requestedSort = categoryInput.sort || ''
      requestedPage = Number.parseInt(categoryInput.page, 10)
      forceRefresh = categoryInput.forceRefresh ?? forceRefresh
      requestSignal = categoryInput.signal

      const hasExplicitPriceMin = Object.prototype.hasOwnProperty.call(categoryInput, 'priceMin')
      const hasExplicitPriceMax = Object.prototype.hasOwnProperty.call(categoryInput, 'priceMax')
      requestedPriceMin = hasExplicitPriceMin ? categoryInput.priceMin : null
      requestedPriceMax = hasExplicitPriceMax ? categoryInput.priceMax : null
    }

    if (!Number.isFinite(requestedPage) || requestedPage <= 0) {
      requestedPage = null
    }

    const normalizedPriceRange = normalizePriceRange(requestedPriceMin, requestedPriceMax)
    requestedPriceMin = normalizedPriceRange.priceMin
    requestedPriceMax = normalizedPriceRange.priceMax

    const sortChanged = requestedSort && requestedSort !== currentSort.value
    const priceFilterChanged = requestedPriceMin !== currentPriceMin.value || requestedPriceMax !== currentPriceMax.value
    const preserveCurrent = preserveRequested && categoryId === currentCategory.value && !sortChanged && !priceFilterChanged
    const restorePrevious = () => {
      if (!preserveCurrent) return
      products.value = previousCatalog.products
      page.value = previousCatalog.page
      total.value = previousCatalog.total
      hasMore.value = previousCatalog.hasMore
      catalogCursor.value = previousCatalog.cursor
      rankingContext.value = previousCatalog.rankingContext
    }
    const shouldReset =
      categoryId !== currentCategory.value
      || forceRefresh
      || sortChanged
      || priceFilterChanged
      || requestedPage === 1

    if (loading.value && !shouldReset && requestedPage === null) {
      return { success: false, cancelled: true, error: '请求进行中，请稍后重试' }
    }

    if (shouldReset) {
      currentCategory.value = categoryId
      if (requestedSort) currentSort.value = requestedSort
      currentPriceMin.value = requestedPriceMin
      currentPriceMax.value = requestedPriceMax
      page.value = requestedPage || 1
      hasMore.value = true
      catalogCursor.value = ''
      rankingContext.value = null
      if (!preserveCurrent) products.value = []
    } else if (requestedPage) {
      page.value = requestedPage
    }

    const requestPage = page.value
    const requestCategory = currentCategory.value
    const requestSort = currentSort.value
    const requestInStockOnly = inStockOnly.value
    const requestPriceMin = currentPriceMin.value
    const requestPriceMax = currentPriceMax.value
    const requestId = ++latestProductsRequestId
    loading.value = true

    try {
      const result = await fetchProductsRequest({
        page: requestPage,
        pageSize,
        categoryId: requestCategory,
        sort: requestSort,
        inStockOnly: requestInStockOnly,
        priceMin: requestPriceMin,
        priceMax: requestPriceMax,
        cursor: requestPage > 1 ? catalogCursor.value : '',
        signal: requestSignal
      })

      if (requestId !== latestProductsRequestId) {
        return { success: false, cancelled: true, error: '请求已过期' }
      }

      if (result.aborted) {
        restorePrevious()
        return { ...result, cancelled: true }
      }

      if (result.success && Array.isArray(result.data?.products)) {
        const newProducts = toSafeArray(result.data.products)
        const previousProducts = toSafeArray(products.value)
        const cursorRestarted = result.data.cursorRestarted === true
        const effectivePage = cursorRestarted ? 1 : requestPage
        total.value = result.data.pagination?.total || result.data.total || newProducts.length
        catalogCursor.value = result.data.pagination?.nextCursor || ''
        rankingContext.value = result.data.rankingContext || null
        hasMore.value = typeof result.data.pagination?.hasMore === 'boolean'
          ? result.data.pagination.hasMore
          : (effectivePage * pageSize) < total.value
        products.value = effectivePage === 1 ? newProducts : [...previousProducts, ...newProducts]
        page.value = effectivePage
        setLastError('')

        return {
          success: true,
          products: newProducts,
          total: total.value,
          hasMore: hasMore.value,
          page: effectivePage,
          cursorRestarted,
          rankingContext: rankingContext.value
        }
      }

      const errorMessage = result.success
        ? '商品数据格式异常，请稍后重试'
        : (result.error || '加载物品失败，请稍后重试')

      if (requestPage === 1) {
        if (preserveCurrent) restorePrevious()
        else {
          products.value = []
          total.value = 0
          hasMore.value = false
        }
      }

      setLastError(errorMessage)
      return { success: false, error: errorMessage, products: [] }
    } catch (error) {
      if (requestId === latestProductsRequestId) {
        restorePrevious()
        console.error('Fetch products failed:', error)
        const errorMessage = error.message || '加载物品失败，请稍后重试'
        setLastError(errorMessage)
        return { success: false, error: errorMessage, products: [] }
      }

      return { success: false, cancelled: true, error: '请求已过期' }
    } finally {
      if (requestId === latestProductsRequestId) {
        loading.value = false
      }
    }
  }

  // 从缓存恢复分类状态（前端缓存用）
  function restoreFromCache(snapshot = {}) {
    const restoredProducts = toSafeArray(snapshot.products)
    const normalizedPriceRange = normalizePriceRange(snapshot.priceMin, snapshot.priceMax)

    currentCategory.value = snapshot.categoryId ?? ''
    products.value = restoredProducts
    total.value = Number.isFinite(Number(snapshot.total)) ? Number(snapshot.total) : restoredProducts.length
    hasMore.value = typeof snapshot.hasMore === 'boolean' ? snapshot.hasMore : false
    catalogCursor.value = String(snapshot.cursor || '')
    rankingContext.value = snapshot.rankingContext || null
    page.value = Number.isFinite(Number(snapshot.page)) ? Number(snapshot.page) : 1
    currentSort.value = snapshot.sort || 'default'
    currentPriceMin.value = normalizedPriceRange.priceMin
    currentPriceMax.value = normalizedPriceRange.priceMax

    if (typeof snapshot.inStockOnly === 'boolean') {
      setInStockOnly(snapshot.inStockOnly)
    }
  }

  // 加载更多商品
  async function loadMore(options = {}) {
    if (loading.value || !hasMore.value) {
      return { success: false, cancelled: true, error: '' }
    }

    page.value += 1
    const result = await fetchProducts({
      categoryId: currentCategory.value,
      page: page.value,
      signal: options.signal
    })
    if (!result?.success) {
      page.value = Math.max(page.value - 1, 1)
    }
    return result
  }

  // 获取商品详情
  async function fetchProduct(id, force = false) {
    if (!force) {
      const cached = productCache.get(id)
      if (cached && Date.now() - cached.time < CACHE_TTL) {
        return cached.data
      }
    }

    try {
      const result = await fetchProductRequest(id)
      if (result.success && result.data?.product) {
        productCache.set(id, { data: result.data.product, time: Date.now() })
        return result.data.product
      }
    } catch (error) {
      console.error('Fetch product failed:', error)
    }

    return null
  }

  // 获取商品详情 (别名)
  async function fetchProductDetail(id, force = false) {
    return fetchProduct(id, force)
  }

  async function fetchMerchantProfile(username) {
    return fetchMerchantProfileRequest(username)
  }

  function setProductFavoriteState(productId, favorited) {
    const cacheKey = String(productId)
    const targetState = !!favorited

    const cached = productCache.get(productId) || productCache.get(cacheKey)
    if (cached?.data) {
      cached.data.isFavorited = targetState
      if (productCache.has(cacheKey)) {
        productCache.set(cacheKey, cached)
      } else {
        productCache.set(productId, cached)
      }
    }
  }

  function setProductBlockedState(productId, blocked) {
    const id = String(productId)
    const nextIds = new Set(blockedProductIds.value)

    if (blocked) {
      nextIds.add(id)
      const previousLength = products.value.length
      products.value = products.value.filter(item => String(item.id) !== id)
      searchResults.value = searchResults.value.filter(item => String(item.id) !== id)
      myFavorites.value = myFavorites.value.filter(item => String(item.id) !== id)
      if (products.value.length < previousLength) {
        total.value = Math.max(0, Number(total.value || 0) - 1)
      }
    } else {
      nextIds.delete(id)
      blockedProducts.value = blockedProducts.value.filter(item => String(item.id) !== id)
    }

    blockedProductIds.value = nextIds
    productCache.delete(productId)
    productCache.delete(id)
  }

  function isProductBlocked(productId) {
    return blockedProductIds.value.has(String(productId))
  }

  async function reportProduct(id, payload) {
    return reportProductRequest(id, payload)
  }

  async function fetchMyReports(options = {}) {
    return fetchMyReportsRequest(options)
  }

  async function fetchMyReportDetail(id) {
    return fetchMyReportDetailRequest(id)
  }

  async function fetchProductComments(productId, options = {}) {
    return fetchProductCommentsRequest(productId, options)
  }

  async function createProductComment(productId, payload) {
    return createProductCommentRequest(productId, payload)
  }

  async function deleteProductComment(commentId) {
    return deleteProductCommentRequest(commentId)
  }

  async function reportProductComment(commentId, reason) {
    return reportProductCommentRequest(commentId, reason)
  }

  async function voteProductComment(commentId, voteType = '') {
    return voteProductCommentRequest(commentId, voteType)
  }

  async function fetchProductCommentReplies(commentId, options = {}) {
    return fetchProductCommentRepliesRequest(commentId, options)
  }

  async function createProductCommentReply(commentId, content) {
    return createProductCommentReplyRequest(commentId, content)
  }

  async function addFavorite(productId) {
    const result = await addFavoriteRequest(productId)
    if (result?.success) {
      setProductFavoriteState(productId, true)
    }
    return result
  }

  async function removeFavorite(productId) {
    const result = await removeFavoriteRequest(productId)
    if (result?.success) {
      setProductFavoriteState(productId, false)
      myFavorites.value = myFavorites.value.filter(item => String(item.id) !== String(productId))
    }
    return result
  }

  async function blockProduct(productId) {
    const result = await blockProductRequest(productId)
    if (result?.success) {
      setProductFavoriteState(productId, false)
      setProductBlockedState(productId, true)
    }
    return result
  }

  async function unblockProduct(productId) {
    const result = await unblockProductRequest(productId)
    if (result?.success) {
      setProductBlockedState(productId, false)
    }
    return result
  }

  async function getProductRestockSubscriptionStatus(productId) {
    return getProductRestockSubscriptionStatusRequest(productId)
  }

  async function subscribeProductRestock(productId) {
    return subscribeProductRestockRequest(productId)
  }

  async function fetchMyFavorites(options = {}) {
    favoritesLoading.value = true

    try {
      const normalized = normalizeFavoritesOptions(options)
      const result = await fetchFavoritesRequest(normalized)
      if (result.success && result.data) {
        myFavorites.value = result.data.products || []
        return result.data
      }

      return createEmptyListState(normalized.page, normalized.pageSize)
    } catch (error) {
      console.error('Fetch my favorites failed:', error)
      const normalized = normalizeFavoritesOptions(options)
      return createEmptyListState(normalized.page, normalized.pageSize)
    } finally {
      favoritesLoading.value = false
    }
  }

  async function fetchBlockedProducts(options = {}) {
    blocksLoading.value = true

    try {
      const normalized = normalizeFavoritesOptions(options)
      const result = await fetchBlockedProductsRequest(normalized)
      if (result.success && result.data) {
        const list = result.data.products || []
        blockedProducts.value = list
        blockedProductIds.value = new Set([
          ...blockedProductIds.value,
          ...list.map(item => String(item.id))
        ])
        return result.data
      }

      return createEmptyListState(normalized.page, normalized.pageSize)
    } catch (error) {
      console.error('Fetch blocked products failed:', error)
      const normalized = normalizeFavoritesOptions(options)
      return createEmptyListState(normalized.page, normalized.pageSize)
    } finally {
      blocksLoading.value = false
    }
  }

  async function fetchMyProductDetail(id) {
    try {
      const result = await fetchMyProductDetailRequest(id)
      if (result.success && result.data?.product) {
        return result.data.product
      }
    } catch (error) {
      console.error('Fetch my product failed:', error)
    }

    return null
  }

  // 获取商品 CDK 列表 (别名)
  async function fetchProductCdks(productId, status = '') {
    const result = await fetchCdkList(productId, { status })
    return result?.cdks || []
  }

  // 添加商品 CDK (别名)
  async function addProductCdks(productId, codes) {
    return addCdk(productId, codes)
  }

  // 删除商品 CDK (别名)
  async function deleteProductCdk(productId, cdkId) {
    return deleteCdk(productId, cdkId)
  }

  // 一键清空商品可删除 CDK (别名)
  async function clearProductCdks(productId) {
    return clearCdk(productId)
  }

  // 搜索商品
  async function searchProducts(query, options = {}) {
    const keyword = typeof query === 'string' ? query.trim() : ''
    if (!keyword) {
      searchResults.value = []
      searchCursor.value = ''
      searchRankingContext.value = null
      setLastError('')
      return {
        products: [],
        total: 0,
        hasMore: false,
        page: 1
      }
    }

    const {
      sort = 'default',
      inStockOnly: onlyInStock = inStockOnly.value,
      page: searchPage = 1,
      pageSize: searchPageSize = pageSize,
      priceMin = null,
      priceMax = null
    } = options

    const normalizedPriceRange = normalizePriceRange(priceMin, priceMax)

    searchQuery.value = keyword
    searchLoading.value = true

    try {
      const result = await fetchProductsRequest({
        search: keyword,
        page: searchPage,
        pageSize: searchPageSize,
        sort,
        inStockOnly: onlyInStock,
        priceMin: normalizedPriceRange.priceMin,
        priceMax: normalizedPriceRange.priceMax,
        cursor: Number(searchPage) > 1 ? searchCursor.value : ''
      })

      if (result.success && Array.isArray(result.data?.products)) {
        const nextProducts = result.data.products
        const cursorRestarted = result.data.cursorRestarted === true
        const effectivePage = cursorRestarted ? 1 : Number(searchPage)
        const totalCount = result.data.pagination?.total || result.data.total || nextProducts.length
        searchCursor.value = result.data.pagination?.nextCursor || ''
        searchRankingContext.value = result.data.rankingContext || null
        const nextHasMore = typeof result.data.pagination?.hasMore === 'boolean'
          ? result.data.pagination.hasMore
          : (effectivePage * Number(searchPageSize)) < Number(totalCount)
        searchResults.value = nextProducts
        setLastError('')
        return {
          products: nextProducts,
          total: totalCount,
          hasMore: nextHasMore,
          page: effectivePage,
          cursorRestarted,
          rankingContext: searchRankingContext.value
        }
      }

      const errorMessage = result.error || '搜索失败，请稍后重试'
      setLastError(errorMessage)
      return {
        products: [],
        total: 0,
        hasMore: false,
        page: Number(searchPage),
        error: errorMessage
      }
    } catch (error) {
      console.error('Search products failed:', error)
      const errorMessage = error.message || '搜索失败，请稍后重试'
      setLastError(errorMessage)
      return {
        products: [],
        total: 0,
        hasMore: false,
        page: Number(searchPage),
        error: errorMessage
      }
    } finally {
      searchLoading.value = false
    }
  }

  // 清除搜索
  function clearSearch() {
    searchQuery.value = ''
    searchResults.value = []
    searchCursor.value = ''
    searchRankingContext.value = null
  }

  // ======== 我的商品 ========

  async function fetchMyProducts(_force = false) {
    myProductsLoading.value = true

    try {
      const result = await fetchMyProductsRequest()
      if (result.success && result.data?.products) {
        myProducts.value = result.data.products
        return result.data.products
      }
      return []
    } catch (error) {
      console.error('Fetch my products failed:', error)
      return []
    } finally {
      myProductsLoading.value = false
    }
  }

  async function createProduct(data, options = {}) {
    const result = await createProductRequest(data, options)
    if (result.success) {
      invalidateCache()
      await fetchMyProducts()
    }
    return result
  }

  async function getProductSubmissionStatus(submissionToken) {
    return getProductSubmissionStatusRequest(submissionToken)
  }

  async function updateProduct(id, data, options = {}) {
    const result = await updateProductRequest(id, data, options)
    if (result.success) {
      invalidateCache()
      productCache.delete(id)
      await fetchMyProducts()
    }
    return result
  }

  async function offlineProduct(id) {
    const result = await offlineProductRequest(id)
    if (result.success) {
      invalidateCache()
      await fetchMyProducts()
    }
    return result
  }

  async function deleteProduct(id) {
    const result = await deleteProductRequest(id)
    if (result.success) {
      invalidateCache()
      productCache.delete(id)
    }
    return result
  }

  // ======== CDK 管理 ========

  async function fetchCdkList(productId, options = {}) {
    try {
      const result = await fetchCdkListRequest(productId, options)
      return result.success ? result.data : { cdks: [], stats: {}, total: 0 }
    } catch {
      return { cdks: [], stats: {}, total: 0 }
    }
  }

  async function addCdk(productId, codes) {
    const result = await addCdkRequest(productId, codes)
    if (result.success) {
      invalidateCache()
    }
    return result
  }

  async function deleteCdk(productId, cdkId) {
    return deleteCdkRequest(productId, cdkId)
  }

  async function clearCdk(productId) {
    const result = await clearCdkRequest(productId)
    if (result.success) {
      invalidateCache()
    }
    return result
  }

  // ======== 订单管理 ========

  async function fetchMyOrders(options = {}) {
    ordersLoading.value = true

    try {
      const result = await fetchOrdersByRoleRequest('buyer', options)
      if (result.success && result.data?.orders) {
        myOrders.value = result.data.orders
        return result.data
      }
      const normalized = normalizeOrderListOptions(options)
      return createEmptyListState(
        getPositiveInt(normalized.page, 1),
        getPositiveInt(normalized.pageSize, 20, 1, 50)
      )
    } catch (error) {
      console.error('Fetch my orders failed:', error)
      const normalized = normalizeOrderListOptions(options)
      return createEmptyListState(
        getPositiveInt(normalized.page, 1),
        getPositiveInt(normalized.pageSize, 20, 1, 50)
      )
    } finally {
      ordersLoading.value = false
    }
  }

  async function fetchOrders(params = {}) {
    const options = normalizeOrderListOptions(params)
    if (options.role === 'seller') {
      return fetchSellerOrders(options)
    }
    return fetchMyOrders(options)
  }

  async function fetchSellerOrders(options = {}) {
    ordersLoading.value = true

    try {
      const result = await fetchOrdersByRoleRequest('seller', options)
      if (result.success && result.data?.orders) {
        sellerOrders.value = result.data.orders
        return result.data
      }
      const normalized = normalizeOrderListOptions(options)
      return createEmptyListState(
        getPositiveInt(normalized.page, 1),
        getPositiveInt(normalized.pageSize, 20, 1, 50)
      )
    } catch (error) {
      console.error('Fetch seller orders failed:', error)
      const normalized = normalizeOrderListOptions(options)
      return createEmptyListState(
        getPositiveInt(normalized.page, 1),
        getPositiveInt(normalized.pageSize, 20, 1, 50)
      )
    } finally {
      ordersLoading.value = false
    }
  }

  async function fetchOrderDetail(orderNo, role = 'buyer') {
    try {
      const result = await fetchOrderDetailRequest(orderNo, role)
      return result.success ? result.data : null
    } catch {
      return null
    }
  }

  async function createOrder(productId, quantity = 1, couponClaimId = null) {
    const discoveryToken = getDiscoveryTokenForProduct(productId)
    const result = await createOrderRequest(productId, quantity, couponClaimId, discoveryToken)
    if (result?.success) clearDiscoveryTokenForProduct(productId)
    return result
  }

  async function cancelOrder(orderNo) {
    const result = await cancelOrderRequest(orderNo)
    if (result.success) {
      await fetchMyOrders()
    }
    return result
  }

  async function refreshOrderStatus(orderNo) {
    return refreshOrderStatusRequest(orderNo)
  }

  async function getPaymentUrl(orderNo) {
    return getPaymentUrlRequest(orderNo)
  }

  async function deliverOrder(orderNo, content) {
    const result = await deliverOrderRequest(orderNo, content)
    if (result.success) {
      const notificationSummaryStore = useNotificationSummaryStore()
      await Promise.all([
        fetchSellerOrders(),
        notificationSummaryStore.refresh({ force: true })
      ])
    }
    return result
  }

  // ======== 求购订单 ========

  async function fetchMyBuyOrders(options = {}) {
    ordersLoading.value = true

    try {
      const result = await fetchMyBuyOrdersRequest(options)
      if (result.success && result.data) {
        myBuyOrders.value = result.data.orders || []
        return result.data
      }
      const normalized = normalizeBuyOrderListOptions(options)
      return createEmptyListState(normalized.page, normalized.pageSize)
    } catch (error) {
      console.error('Fetch buy orders failed:', error)
      const normalized = normalizeBuyOrderListOptions(options)
      return createEmptyListState(normalized.page, normalized.pageSize)
    } finally {
      ordersLoading.value = false
    }
  }

  async function getBuyOrderDetail(orderNo) {
    return getBuyOrderDetailRequest(orderNo)
  }

  async function getBuyOrderPaymentUrl(orderNo) {
    return getBuyOrderPaymentUrlRequest(orderNo)
  }

  async function refreshBuyOrderStatus(orderNo) {
    return refreshBuyOrderStatusRequest(orderNo)
  }

  // ======== 商户设置 ========

  async function fetchMerchantConfig() {
    const result = await fetchMerchantConfigRequest()
    return result.success ? result.data : null
  }

  async function updateMerchantConfig(config) {
    return updateMerchantConfigRequest(config)
  }

  function invalidateCache() {
    productCache.clear()
    products.value = []
    page.value = 1
    hasMore.value = true
    catalogCursor.value = ''
    rankingContext.value = null
  }

  async function fetchPublicStats() {
    try {
      const result = await fetchPublicStatsRequest()
      if (result.success) {
        setLastError('')
        return result.data
      }
      setLastError(result.error || '加载统计数据失败，请稍后重试')
      return null
    } catch (error) {
      console.error('Fetch public stats failed:', error)
      setLastError(error.message || '加载统计数据失败，请稍后重试')
      return null
    }
  }

  function setInStockOnly(nextValue) {
    const normalizedValue = !!nextValue
    inStockOnly.value = normalizedValue
    storage.set(IN_STOCK_ONLY_STORAGE_KEY, normalizedValue, 0)
    return normalizedValue
  }

  async function toggleInStockOnly() {
    setInStockOnly(!inStockOnly.value)
    page.value = 1
    hasMore.value = true
    products.value = []
    return fetchProducts(currentCategory.value, true)
  }

  async function fetchUserDashboard() {
    try {
      const result = await fetchUserDashboardRequest()
      if (result.success) {
        setLastError('')
        return result.data
      }
      setLastError(result.error || '加载个人统计失败，请稍后重试')
      return null
    } catch (error) {
      console.error('Fetch user dashboard failed:', error)
      setLastError(error.message || '加载个人统计失败，请稍后重试')
      return null
    }
  }

  return {
    // 状态
    categories,
    products,
    currentCategory,
    currentSort,
    inStockOnly,
    currentPriceMin,
    currentPriceMax,
    loading,
    hasMore,
    page,
    total,
    catalogCursor,
    rankingContext,
    searchQuery,
    searchResults,
    searchLoading,
    searchCursor,
    searchRankingContext,
    myProducts,
    myProductsLoading,
    myOrders,
    sellerOrders,
    myBuyOrders,
    myFavorites,
    blockedProducts,
    blockedProductIds,
    favoritesLoading,
    blocksLoading,
    ordersLoading,
    lastError,
    // 计算属性
    currentCategoryName,
    // 方法
    fetchCategories,
    fetchProducts,
    restoreFromCache,
    loadMore,
    setInStockOnly,
    toggleInStockOnly,
    fetchProduct,
    searchProducts,
    clearSearch,
    fetchMyProducts,
    createProduct,
    getProductSubmissionStatus,
    updateProduct,
    offlineProduct,
    deleteProduct,
    fetchCdkList,
    addCdk,
    deleteCdk,
    clearCdk,
    fetchMyOrders,
    fetchSellerOrders,
    fetchOrders,
    fetchOrderDetail,
    fetchProductDetail,
    fetchMerchantProfile,
    reportProduct,
    fetchMyReports,
    fetchMyReportDetail,
    fetchProductComments,
    createProductComment,
    deleteProductComment,
    reportProductComment,
    voteProductComment,
    fetchProductCommentReplies,
    createProductCommentReply,
    addFavorite,
    removeFavorite,
    blockProduct,
    unblockProduct,
    isProductBlocked,
    getProductRestockSubscriptionStatus,
    subscribeProductRestock,
    fetchMyFavorites,
    fetchBlockedProducts,
    fetchMyProductDetail,
    fetchProductCdks,
    addProductCdks,
    deleteProductCdk,
    clearProductCdks,
    createOrder,
    cancelOrder,
    refreshOrderStatus,
    getPaymentUrl,
    deliverOrder,
    fetchMyBuyOrders,
    getBuyOrderDetail,
    getBuyOrderPaymentUrl,
    refreshBuyOrderStatus,
    fetchMerchantConfig,
    updateMerchantConfig,
    consumeLastError,
    invalidateCache,
    fetchPublicStats,
    fetchUserDashboard
  }
})
