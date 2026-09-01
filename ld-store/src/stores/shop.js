import { defineStore, storeToRefs } from 'pinia'
import { useCatalogStore } from '@/stores/catalog'
import { useProductStore } from '@/stores/product'
import { useInventoryStore } from '@/stores/inventory'
import { useOrderStore } from '@/stores/order'

const DEFAULT_PAGE_SIZE = 20

function positiveInt(value, fallback, min = 1, max = Number.POSITIVE_INFINITY) {
  const parsed = Number.parseInt(String(value), 10)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(Math.max(parsed, min), max)
}

function emptyPage(options = {}, listKey = 'orders') {
  const page = positiveInt(options.page, 1)
  const pageSize = positiveInt(options.pageSize, DEFAULT_PAGE_SIZE, 1, 50)
  return {
    [listKey]: [],
    pagination: { total: 0, page, pageSize, totalPages: 0 }
  }
}

function legacyCatalogResult(result, state, fallbackPage = 1) {
  if (!result.success) return { ...result, cancelled: result.aborted, products: [] }
  const pagination = result.data.pagination
  const effectivePage = result.data.cursorRestarted ? 1 : pagination.page || fallbackPage
  return {
    success: true,
    products: result.data.products,
    total: pagination.total,
    hasMore: typeof pagination.hasMore === 'boolean'
      ? pagination.hasMore
      : effectivePage * pagination.pageSize < pagination.total,
    page: effectivePage,
    cursorRestarted: result.data.cursorRestarted === true,
    rankingContext: result.data.rankingContext || state.rankingContext
  }
}

function legacySearchResult(result, fallbackPage = 1) {
  if (!result.success) {
    return { products: [], total: 0, hasMore: false, page: fallbackPage, error: result.error }
  }
  const pagination = result.data.pagination
  const effectivePage = result.data.cursorRestarted ? 1 : pagination.page || fallbackPage
  return {
    products: result.data.products,
    total: pagination.total,
    hasMore: typeof pagination.hasMore === 'boolean'
      ? pagination.hasMore
      : effectivePage * pagination.pageSize < pagination.total,
    page: effectivePage,
    cursorRestarted: result.data.cursorRestarted === true,
    rankingContext: result.data.rankingContext || null
  }
}

/**
 * Temporary compatibility facade. It owns no domain state: every ref and
 * action delegates to a focused store. New callers use those stores directly.
 */
export const useShopStore = defineStore('shop', () => {
  const catalog = useCatalogStore()
  const product = useProductStore()
  const inventory = useInventoryStore()
  const order = useOrderStore()
  const catalogRefs = storeToRefs(catalog)
  const productRefs = storeToRefs(product)
  const inventoryRefs = storeToRefs(inventory)
  const orderRefs = storeToRefs(order)

  async function fetchCategories(force = false) {
    const result = await catalog.fetchCategories(force)
    return result.success ? result.data.categories : catalog.categories
  }

  async function fetchProducts(category = '', forceRefresh = false, sort = '') {
    const requestedPage = typeof category === 'object' ? positiveInt(category.page, 1) : 1
    return legacyCatalogResult(await catalog.fetchProducts(category, forceRefresh, sort), catalog, requestedPage)
  }

  async function loadMore(options = {}) {
    return legacyCatalogResult(await catalog.loadMore(options), catalog, catalog.page)
  }

  async function searchProducts(query, options = {}) {
    return legacySearchResult(await catalog.searchProducts(query, options), positiveInt(options.page, 1))
  }

  async function fetchProduct(id, force = false) {
    const result = await product.fetchProduct(id, force)
    return result.success ? result.data.product : null
  }

  async function fetchMyProducts() {
    const result = await inventory.fetchProducts()
    return result.success ? result.data.products : []
  }

  async function fetchMyProductDetail(id) {
    const result = await inventory.fetchProductDetail(id)
    return result.success ? result.data.product : null
  }

  async function fetchCdkList(productId, options = {}) {
    const result = await inventory.fetchCdkList(productId, options)
    return result.success ? result.data : { cdks: [], stats: {}, total: 0 }
  }

  async function fetchProductCdks(productId, status = '') {
    return (await fetchCdkList(productId, { status })).cdks || []
  }

  async function fetchMyFavorites(options = {}) {
    const result = await product.fetchFavorites(options)
    return result.success ? result.data : emptyPage(options, 'products')
  }

  async function fetchBlockedProducts(options = {}) {
    const result = await product.fetchBlocked(options)
    return result.success ? result.data : emptyPage(options, 'products')
  }

  async function fetchMyOrders(options = {}) {
    const result = await order.fetchBuyerOrders(options)
    return result.success ? result.data : emptyPage(options)
  }

  async function fetchSellerOrders(options = {}) {
    const result = await order.fetchSellerOrders(options)
    return result.success ? result.data : emptyPage(options)
  }

  async function fetchOrders(options = {}) {
    return options?.role === 'seller' ? fetchSellerOrders(options) : fetchMyOrders(options)
  }

  async function fetchOrderDetail(orderNo, role = 'buyer') {
    const result = await order.fetchOrderDetail(orderNo, role)
    return result.success ? result.data : null
  }

  async function fetchMyBuyOrders(options = {}) {
    const result = await order.fetchBuyRequestOrders(options)
    return result.success ? result.data : emptyPage(options)
  }

  async function fetchMerchantConfig() {
    const result = await inventory.fetchMerchantConfig()
    return result.success ? result.data : null
  }

  async function fetchPublicStats() {
    const result = await catalog.fetchPublicStats()
    return result.success ? result.data : null
  }

  async function fetchUserDashboard() {
    const result = await catalog.fetchUserDashboard()
    return result.success ? result.data : null
  }

  function consumeLastError() {
    for (const domain of ['search', 'products', 'stats', 'dashboard', 'categories']) {
      const message = catalog.consumeError(domain)
      if (message) return message
    }
    return ''
  }

  function invalidateCache() {
    catalog.invalidateCache()
    product.clearDetailCache()
  }

  return {
    categories: catalogRefs.categories,
    products: catalogRefs.products,
    currentCategory: catalogRefs.currentCategory,
    currentSort: catalogRefs.currentSort,
    inStockOnly: catalogRefs.inStockOnly,
    currentPriceMin: catalogRefs.currentPriceMin,
    currentPriceMax: catalogRefs.currentPriceMax,
    loading: catalogRefs.loading,
    hasMore: catalogRefs.hasMore,
    page: catalogRefs.page,
    total: catalogRefs.total,
    catalogCursor: catalogRefs.catalogCursor,
    rankingContext: catalogRefs.rankingContext,
    searchQuery: catalogRefs.searchQuery,
    searchResults: catalogRefs.searchResults,
    searchLoading: catalogRefs.searchLoading,
    searchCursor: catalogRefs.searchCursor,
    searchRankingContext: catalogRefs.searchRankingContext,
    currentCategoryName: catalogRefs.currentCategoryName,
    myProducts: inventoryRefs.products,
    myProductsLoading: inventoryRefs.loading,
    myOrders: orderRefs.buyerOrders,
    sellerOrders: orderRefs.sellerOrders,
    myBuyOrders: orderRefs.buyRequestOrders,
    buyerOrdersLoading: orderRefs.buyerOrdersLoading,
    sellerOrdersLoading: orderRefs.sellerOrdersLoading,
    buyRequestOrdersLoading: orderRefs.buyRequestOrdersLoading,
    myFavorites: productRefs.favorites,
    blockedProducts: productRefs.blockedProducts,
    blockedProductIds: productRefs.blockedProductIds,
    favoritesLoading: productRefs.favoritesLoading,
    blocksLoading: productRefs.blocksLoading,
    fetchCategories,
    fetchProducts,
    restoreFromCache: catalog.restoreFromCache,
    loadMore,
    setInStockOnly: catalog.setInStockOnly,
    toggleInStockOnly: catalog.toggleInStockOnly,
    fetchProduct,
    fetchProductDetail: fetchProduct,
    searchProducts,
    clearSearch: catalog.clearSearch,
    fetchMyProducts,
    createProduct: inventory.createProduct,
    getProductSubmissionStatus: inventory.getProductSubmissionStatus,
    updateProduct: inventory.updateProduct,
    offlineProduct: inventory.offlineProduct,
    deleteProduct: inventory.deleteProduct,
    fetchCdkList,
    addCdk: inventory.addCdk,
    deleteCdk: inventory.deleteCdk,
    clearCdk: inventory.clearCdk,
    fetchProductCdks,
    addProductCdks: inventory.addCdk,
    deleteProductCdk: inventory.deleteCdk,
    clearProductCdks: inventory.clearCdk,
    fetchMyProductDetail,
    fetchMerchantProfile: product.fetchMerchantProfile,
    reportProduct: product.reportProduct,
    fetchMyReports: product.fetchMyReports,
    fetchMyReportDetail: product.fetchMyReportDetail,
    fetchProductComments: product.fetchProductComments,
    createProductComment: product.createProductComment,
    deleteProductComment: product.deleteProductComment,
    reportProductComment: product.reportProductComment,
    voteProductComment: product.voteProductComment,
    fetchProductCommentReplies: product.fetchProductCommentReplies,
    createProductCommentReply: product.createProductCommentReply,
    addFavorite: product.addFavorite,
    removeFavorite: product.removeFavorite,
    blockProduct: product.blockProduct,
    unblockProduct: product.unblockProduct,
    isProductBlocked: product.isProductBlocked,
    getProductRestockSubscriptionStatus: product.getProductRestockSubscriptionStatus,
    subscribeProductRestock: product.subscribeProductRestock,
    fetchMyFavorites,
    fetchBlockedProducts,
    fetchMyOrders,
    fetchSellerOrders,
    fetchOrders,
    fetchOrderDetail,
    createOrder: order.createOrder,
    cancelOrder: order.cancelOrder,
    refreshOrderStatus: order.refreshOrderStatus,
    getPaymentUrl: order.getPaymentUrl,
    deliverOrder: order.deliverOrder,
    fetchMyBuyOrders,
    getBuyOrderDetail: order.getBuyOrderDetail,
    getBuyOrderPaymentUrl: order.getBuyOrderPaymentUrl,
    refreshBuyOrderStatus: order.refreshBuyOrderStatus,
    fetchMerchantConfig,
    updateMerchantConfig: inventory.updateMerchantConfig,
    consumeLastError,
    invalidateCache,
    fetchPublicStats,
    fetchUserDashboard
  }
})
