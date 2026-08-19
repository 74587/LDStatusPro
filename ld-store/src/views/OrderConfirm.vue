<template>
  <div class="checkout-page">
    <div class="checkout-shell" aria-labelledby="checkout-title">
      <button type="button" class="back-button" @click="goBack">
        <ArrowLeft :size="18" aria-hidden="true" />
        <span>返回物品详情</span>
      </button>

      <header class="checkout-header">
        <div>
          <p class="checkout-kicker">兑换前最后一步</p>
          <h1 id="checkout-title">确认订单</h1>
          <p>核对数量、优惠与交付方式，再确认兑换。</p>
        </div>
        <div class="inventory-notice">
          <ShieldCheck :size="18" aria-hidden="true" />
          <span>提交前不会保留库存，以确认兑换时的校验结果为准</span>
        </div>
      </header>

      <div v-if="loading" class="checkout-loading" aria-live="polite">
        <div class="skeleton skeleton-product"></div>
        <div class="skeleton skeleton-receipt"></div>
      </div>

      <EmptyState
        v-else-if="!product"
        text="无法确认这笔订单"
        :hint="loadError || '物品可能已下架，请返回详情后重试。'"
      >
        <template #icon>
          <ShoppingBag :size="48" :stroke-width="1.5" aria-hidden="true" />
        </template>
        <template #action>
          <button type="button" class="state-action" @click="goBack">返回物品详情</button>
        </template>
      </EmptyState>

      <template v-else>
        <div
          v-if="submissionError"
          ref="errorSummaryRef"
          class="submission-error"
          role="alert"
          tabindex="-1"
        >
          <CircleAlert :size="20" aria-hidden="true" />
          <div>
            <strong>订单尚未创建</strong>
            <p>{{ submissionError }}</p>
          </div>
        </div>

        <div class="checkout-grid">
          <div class="checkout-main-column">
            <section class="checkout-card product-card" aria-labelledby="product-card-title">
              <div class="section-heading">
                <div class="heading-icon"><ShoppingBag :size="18" aria-hidden="true" /></div>
                <div>
                  <h2 id="product-card-title">物品信息</h2>
                  <p>本次订单仅包含这一件物品</p>
                </div>
              </div>

              <div class="product-summary">
                <div class="product-cover">
                  <img v-if="productImage" :src="productImage" :alt="productName" />
                  <ShoppingBag v-else :size="34" :stroke-width="1.4" aria-hidden="true" />
                </div>
                <div class="product-copy">
                  <div class="product-badges">
                    <span>{{ isCdk ? '自动发卡' : '手动履约' }}</span>
                    <span>{{ stockLabel }}</span>
                  </div>
                  <h3>{{ productName }}</h3>
                  <p class="seller-name">卖家 @{{ sellerUsername }}</p>
                  <p class="delivery-copy">{{ deliveryDescription }}</p>
                </div>
                <div class="unit-price">
                  <span v-if="hasProductDiscount">{{ formatMoney(originalUnitPrice) }} LDC</span>
                  <strong>{{ formatMoney(discountedUnitPrice) }} LDC</strong>
                  <small>单价</small>
                </div>
              </div>

              <div class="quantity-row">
                <div>
                  <label for="checkout-quantity">兑换数量</label>
                  <p>{{ quantityHint }}</p>
                </div>
                <div class="quantity-control">
                  <button
                    type="button"
                    aria-label="减少数量"
                    :disabled="quantity <= 1 || submitting"
                    @click="changeQuantity(-1)"
                  >
                    <Minus :size="17" aria-hidden="true" />
                  </button>
                  <input
                    id="checkout-quantity"
                    v-model.number="quantity"
                    type="number"
                    inputmode="numeric"
                    min="1"
                    :max="maxSelectableQuantity"
                    :disabled="submitting"
                    @change="commitQuantity"
                    @blur="commitQuantity"
                  />
                  <button
                    type="button"
                    aria-label="增加数量"
                    :disabled="quantity >= maxSelectableQuantity || submitting"
                    @click="changeQuantity(1)"
                  >
                    <Plus :size="17" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </section>

            <section class="checkout-card coupon-card" aria-labelledby="coupon-card-title">
              <div class="section-heading coupon-heading">
                <div class="heading-icon"><TicketPercent :size="18" aria-hidden="true" /></div>
                <div>
                  <h2 id="coupon-card-title">优惠券</h2>
                  <p>每笔订单最多使用一张，默认不使用</p>
                </div>
                <span v-if="availableCoupons.length" class="coupon-count">
                  {{ availableCoupons.length }} 张可用
                </span>
              </div>

              <div v-if="quoteLoading" class="quote-loading" aria-live="polite">
                <RefreshCw :size="17" class="spin" aria-hidden="true" />
                <span>正在更新优惠与金额…</span>
              </div>

              <div v-else class="coupon-list" role="radiogroup" aria-label="选择优惠券">
                <label :class="['coupon-choice', { selected: selectedCouponClaimId === null }]">
                  <input v-model="selectedCouponClaimId" type="radio" name="checkout-coupon" :value="null" />
                  <span class="radio-mark" aria-hidden="true"></span>
                  <span class="coupon-choice-copy">
                    <strong>不使用优惠券</strong>
                    <small>按物品当前折后价格结算</small>
                  </span>
                  <span class="coupon-saving">默认</span>
                </label>

                <label
                  v-for="coupon in availableCoupons"
                  :key="coupon.claimId"
                  :class="['coupon-choice', { selected: selectedCouponClaimId === coupon.claimId }]"
                >
                  <input v-model="selectedCouponClaimId" type="radio" name="checkout-coupon" :value="coupon.claimId" />
                  <span class="radio-mark" aria-hidden="true"></span>
                  <span class="coupon-choice-copy">
                    <strong>{{ coupon.campaign.name }}</strong>
                    <small>{{ couponRuleText(coupon) }} · {{ couponScopeText(coupon) }}</small>
                    <small>有效期至 {{ formatCouponDate(coupon.campaign.expiresAt) }}</small>
                  </span>
                  <span class="coupon-saving">省 {{ formatMoney(coupon.couponDiscountAmount) }}</span>
                </label>

                <p v-if="!availableCoupons.length && !quoteError" class="coupon-empty">
                  当前没有适用于这件物品的优惠券。
                </p>
                <p v-if="quoteError" class="coupon-error" role="status">{{ quoteError }}，仍可不使用优惠券继续兑换。</p>

                <details v-if="unavailableCoupons.length" class="unavailable-coupons">
                  <summary>查看 {{ unavailableCoupons.length }} 张不可用优惠券</summary>
                  <div class="unavailable-list">
                    <div v-for="coupon in unavailableCoupons" :key="coupon.claimId" class="unavailable-item">
                      <div>
                        <strong>{{ coupon.campaign.name }}</strong>
                        <small>{{ couponRuleText(coupon) }} · {{ couponScopeText(coupon) }}</small>
                      </div>
                      <span>{{ coupon.reason || '当前不可使用' }}</span>
                    </div>
                  </div>
                </details>
              </div>
            </section>

            <section class="checkout-card delivery-card" aria-labelledby="delivery-card-title">
              <div class="section-heading">
                <div class="heading-icon"><PackageCheck :size="18" aria-hidden="true" /></div>
                <div>
                  <h2 id="delivery-card-title">交付说明</h2>
                  <p>{{ isCdk ? '支付成功后自动处理' : '支付成功后由卖家履约' }}</p>
                </div>
              </div>
              <p>{{ deliveryNotice }}</p>
            </section>
          </div>

          <aside class="checkout-sidebar" aria-label="价格明细">
            <div class="receipt-card">
              <div class="receipt-heading">
                <div>
                  <p>本单明细</p>
                  <h2>价格收据</h2>
                </div>
                <ReceiptText :size="24" aria-hidden="true" />
              </div>

              <dl class="receipt-lines" aria-live="polite" aria-atomic="true">
                <div v-if="hasProductDiscount">
                  <dt>物品标价小计</dt>
                  <dd class="original-amount">{{ formatMoney(originalSubtotal) }} LDC</dd>
                </div>
                <div>
                  <dt>商品折后小计</dt>
                  <dd>{{ formatMoney(productSubtotal) }} LDC</dd>
                </div>
                <div>
                  <dt>优惠券减免</dt>
                  <dd :class="{ saving: couponDiscountAmount > 0 }">
                    {{ couponDiscountAmount > 0 ? '-' : '' }}{{ formatMoney(couponDiscountAmount) }} LDC
                  </dd>
                </div>
              </dl>

              <div class="receipt-total" aria-live="polite" aria-atomic="true">
                <span>预计实付</span>
                <strong>{{ formatMoney(payableAmount) }} <small>LDC</small></strong>
              </div>

              <p v-if="selectedCoupon" class="selected-coupon-note">
                已选择「{{ selectedCoupon.campaign.name }}」
              </p>
              <p v-if="submitBlockMessage" class="submit-block-message" role="status">
                {{ submitBlockMessage }}
              </p>

              <button
                type="button"
                class="confirm-button desktop-confirm"
                :disabled="!canSubmit"
                @click="submitOrder"
              >
                <RefreshCw v-if="submitting" :size="18" class="spin" aria-hidden="true" />
                <CreditCard v-else :size="18" aria-hidden="true" />
                <span>{{ submitButtonText }}</span>
              </button>
              <p class="submit-hint">确认后才会创建订单，并为你打开 LDC 支付。</p>
            </div>
          </aside>
        </div>
      </template>
    </div>

    <div v-if="product" class="mobile-confirm-bar">
      <div>
        <span>预计实付</span>
        <strong>{{ formatMoney(payableAmount) }} LDC</strong>
      </div>
      <button type="button" class="confirm-button" :disabled="!canSubmit" @click="submitOrder">
        <RefreshCw v-if="submitting" :size="18" class="spin" aria-hidden="true" />
        <CreditCard v-else :size="18" aria-hidden="true" />
        <span>{{ submitButtonText }}</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
import {
  ArrowLeft,
  CircleAlert,
  CreditCard,
  Minus,
  PackageCheck,
  Plus,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  TicketPercent,
} from '@lucide/vue'
import { useShopStore } from '@/stores/shop'
import { useUserStore } from '@/stores/user'
import { useCheckoutStore } from '@/stores/checkout'
import { useToast } from '@/composables/useToast'
import { isMaintenanceFeatureEnabled, isRestrictedMaintenanceMode } from '@/config/maintenance'
import { formatCouponDate, formatCouponRule, quoteOrderRequest } from '@/services/shop/couponService'
import { formatPrice } from '@/utils/format'
import { createSubmissionGate } from '@/utils/submissionGate'
import {
  getAvailableStock,
  getProductType,
  getStockDisplay,
  isCdkProduct,
  isOutOfStock as isProductOutOfStock,
  isPlatformOrderProduct,
  isUnlimitedStock,
} from '@/utils/shopProduct'
import { cleanupPreparedTab, openPaymentPopup, preparePaymentPopup, watchPaymentPopup } from '@/utils/newTab'
import EmptyState from '@/components/common/EmptyState.vue'

defineOptions({ name: 'OrderConfirm' })

const route = useRoute()
const router = useRouter()
const shopStore = useShopStore()
const userStore = useUserStore()
const checkoutStore = useCheckoutStore()
const toast = useToast()
const submissionGate = createSubmissionGate()

const loading = ref(true)
const product = ref(null)
const loadError = ref('')
const quantity = ref(1)
const couponQuote = ref(null)
const quoteLoading = ref(false)
const quoteError = ref('')
const selectedCouponClaimId = ref(null)
const submitting = ref(false)
const submissionError = ref('')
const errorSummaryRef = ref(null)

const productId = computed(() => {
  const parsed = Number.parseInt(route.params.productId, 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0
})
const productName = computed(() => String(product.value?.name || '未命名物品'))
const productImage = computed(() => String(product.value?.image_url || product.value?.imageUrl || ''))
const sellerUsername = computed(() => String(product.value?.seller_username || product.value?.sellerUsername || '未知'))
const isCdk = computed(() => isCdkProduct(product.value))
const isPlatformOrder = computed(() => isPlatformOrderProduct(product.value))
const originalUnitPrice = computed(() => Number(product.value?.price || 0))
const productDiscount = computed(() => Number(product.value?.discount || 1))
const discountedUnitPrice = computed(() => originalUnitPrice.value * productDiscount.value)
const hasProductDiscount = computed(() => productDiscount.value < 1)
const originalSubtotal = computed(() => Number(couponQuote.value?.originalPrice ?? originalUnitPrice.value * quantity.value))
const availableStock = computed(() => getAvailableStock(product.value))
const hasUnlimitedStock = computed(() => isUnlimitedStock(product.value))
const isOutOfStock = computed(() => isProductOutOfStock(product.value))
const stockLabel = computed(() => `库存 ${getStockDisplay(product.value)}`)

const maxPurchaseQuantity = computed(() => {
  const sharedCdkEnabled = !!(product.value?.sharedCdkEnabled || Number(product.value?.shared_cdk_enabled || 0) === 1)
  if (sharedCdkEnabled && getProductType(product.value) === 'cdk') return 1
  const parsed = Number(product.value?.max_purchase_quantity ?? product.value?.maxPurchaseQuantity ?? 0)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0
})

const maxSelectableQuantity = computed(() => {
  const limits = [1000]
  if (maxPurchaseQuantity.value > 0) limits.push(maxPurchaseQuantity.value)
  if (!hasUnlimitedStock.value) {
    limits.push(Math.max(0, Number(availableStock.value) || 0))
  } else {
    const available = Number(availableStock.value)
    if (Number.isFinite(available) && available > 0) limits.push(available)
  }
  const limit = Math.min(...limits)
  return limit > 0 ? limit : 1
})

const quantityHint = computed(() => {
  const hints = []
  if (maxPurchaseQuantity.value > 0) hints.push(`单次最多 ${maxPurchaseQuantity.value} 件`)
  if (!hasUnlimitedStock.value) hints.push(stockLabel.value)
  return hints.length ? hints.join(' · ') : '可按需要调整本次兑换数量'
})

const couponOptions = computed(() => Array.isArray(couponQuote.value?.coupons) ? couponQuote.value.coupons : [])
const availableCoupons = computed(() => couponOptions.value.filter(coupon => coupon.eligible))
const unavailableCoupons = computed(() => couponOptions.value.filter(coupon => !coupon.eligible))
const selectedCoupon = computed(() => (
  availableCoupons.value.find(coupon => coupon.claimId === selectedCouponClaimId.value) || null
))
const productSubtotal = computed(() => Number(
  couponQuote.value?.productSubtotal ?? discountedUnitPrice.value * quantity.value
))
const couponDiscountAmount = computed(() => Number(selectedCoupon.value?.couponDiscountAmount || 0))
const payableAmount = computed(() => Number(selectedCoupon.value?.payableAmount ?? productSubtotal.value))

const deliveryDescription = computed(() => (
  isCdk.value
    ? '支付成功后，系统会自动将卡密发放到订单详情。'
    : '支付成功后，请通过订单记录联系卖家完成交付。'
))
const deliveryNotice = computed(() => (
  isCdk.value
    ? '卡密将在支付结果确认后自动发放。请勿重复创建订单，交付内容可在订单详情中查看。'
    : '普通物品由卖家手动履约。支付完成后请主动联系卖家，站内订单会保留交易与交付记录。'
))

const viewerTrustLevel = computed(() => {
  const parsed = Number.parseInt(userStore.trustLevel, 10)
  return Number.isInteger(parsed) ? parsed : 0
})
const purchaseTrustLevel = computed(() => {
  const parsed = Number(product.value?.purchase_trust_level ?? product.value?.purchaseTrustLevel ?? 0)
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, 4) : 0
})
const isSeller = computed(() => (
  String(userStore.user?.id || '') === String(product.value?.seller_user_id ?? product.value?.sellerUserId ?? '')
))
const isTestMode = computed(() => !!(product.value?.is_test_mode || product.value?.isTestMode))
const isOrderCreationMaintenanceBlocked = computed(() => (
  isRestrictedMaintenanceMode() && !isMaintenanceFeatureEnabled('orderCreate')
))
const submitBlockMessage = computed(() => {
  if (!isPlatformOrder.value) return '该物品不支持站内兑换。'
  if (isOrderCreationMaintenanceBlocked.value) return '当前处于受限维护状态，暂时无法创建订单。'
  if (isOutOfStock.value) return '物品已经售罄，请返回详情订阅补货。'
  if (product.value?.canPurchase === false) return '该物品当前暂停销售。'
  if (purchaseTrustLevel.value > viewerTrustLevel.value) return `当前账号需达到 TL${purchaseTrustLevel.value} 才能兑换。`
  if (isTestMode.value && !isSeller.value) return '该物品处于测试模式，仅卖家可兑换。'
  if (!isTestMode.value && isSeller.value) return '不能兑换自己发布的物品。'
  return ''
})
const canSubmit = computed(() => (
  !loading.value
  && !submitting.value
  && !quoteLoading.value
  && !submitBlockMessage.value
  && quantity.value >= 1
))
const submitButtonText = computed(() => (
  submitting.value
    ? '正在创建订单…'
    : `确认兑换 · ${formatMoney(payableAmount.value)} LDC`
))

function formatMoney(value) {
  return formatPrice(Number(value) || 0)
}

function clampQuantity(value) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 1
  return Math.min(Math.max(Math.floor(parsed), 1), maxSelectableQuantity.value)
}

function couponRuleText(coupon) {
  const base = formatCouponRule(coupon?.campaign)
  return coupon?.campaign?.discountType === 'fixed_amount'
    ? `${base}（整单一次）`
    : base
}

function couponScopeText(coupon) {
  return coupon?.campaign?.scopeType === 'product' ? '指定物品券' : '店铺券'
}

function commitQuantity() {
  const nextQuantity = clampQuantity(quantity.value)
  const changed = nextQuantity !== quantity.value
  quantity.value = nextQuantity
  checkoutStore.updateCheckout(productId.value, { quantity: nextQuantity })
  scheduleQuote()
  if (changed) toast.info(`兑换数量已调整为 ${nextQuantity}`)
}

function changeQuantity(delta) {
  quantity.value = clampQuantity(quantity.value + delta)
  checkoutStore.updateCheckout(productId.value, { quantity: quantity.value })
  scheduleQuote()
}

let quoteTimer = null
let latestQuoteRequestId = 0

async function loadQuote({ preserveSelection = true } = {}) {
  if (quoteTimer) {
    window.clearTimeout(quoteTimer)
    quoteTimer = null
  }
  if (!productId.value || !product.value) return false

  const requestId = ++latestQuoteRequestId
  const requestedCouponClaimId = preserveSelection ? selectedCouponClaimId.value : null
  quoteLoading.value = true
  quoteError.value = ''

  const result = await quoteOrderRequest(productId.value, clampQuantity(quantity.value))
  if (requestId !== latestQuoteRequestId) return false

  if (result?.success) {
    couponQuote.value = result.data
    if (requestedCouponClaimId !== null) {
      const current = result.data?.coupons?.find(coupon => (
        coupon.claimId === requestedCouponClaimId && coupon.eligible
      ))
      if (current) {
        selectedCouponClaimId.value = requestedCouponClaimId
      } else {
        selectedCouponClaimId.value = null
        checkoutStore.updateCheckout(productId.value, { couponClaimId: null })
        quoteError.value = '之前选择的优惠券状态已变化，请重新选择'
      }
    }
  } else {
    couponQuote.value = null
    selectedCouponClaimId.value = null
    checkoutStore.updateCheckout(productId.value, { couponClaimId: null })
    quoteError.value = result?.error || '优惠券报价暂时不可用'
  }

  quoteLoading.value = false
  return result?.success === true
}

function scheduleQuote() {
  if (!product.value) return
  if (quoteTimer) window.clearTimeout(quoteTimer)
  // Invalidate an already-running quote immediately. Otherwise it may finish
  // during the debounce window and briefly overwrite the newly selected amount.
  latestQuoteRequestId++
  quoteLoading.value = true
  quoteTimer = window.setTimeout(() => { void loadQuote() }, 180)
}

async function loadProduct({ force = true } = {}) {
  const nextProduct = await shopStore.fetchProduct(productId.value, force)
  if (!nextProduct) {
    product.value = null
    loadError.value = '物品不存在、已下架或暂时无法读取。'
    return false
  }
  product.value = nextProduct
  quantity.value = clampQuantity(quantity.value)
  checkoutStore.updateCheckout(productId.value, { quantity: quantity.value })
  return true
}

async function initializeCheckout() {
  if (!productId.value) {
    loadError.value = '物品编号无效。'
    loading.value = false
    return
  }

  const existingDraft = checkoutStore.getDraft(productId.value)
  const routeQuantity = Number.parseInt(route.query.quantity, 10)
  quantity.value = existingDraft?.quantity || (Number.isInteger(routeQuantity) && routeQuantity > 0 ? routeQuantity : 1)
  selectedCouponClaimId.value = existingDraft?.couponClaimId ?? null

  if (!existingDraft) {
    checkoutStore.startCheckout({ productId: productId.value, quantity: quantity.value })
  }

  const loaded = await loadProduct({ force: true })
  loading.value = false
  if (!loaded) return
  await loadQuote()
}

async function focusSubmissionError() {
  await nextTick()
  errorSummaryRef.value?.focus()
}

async function refreshAfterSubmitFailure() {
  await loadProduct({ force: true })
  await loadQuote()
}

async function submitOrder() {
  if (!canSubmit.value || submitting.value || !submissionGate.tryLock()) return

  // Open synchronously from the user gesture and lock the CTA before any await.
  // This both avoids popup blockers and prevents a fast double-click creating
  // two orders while the final quote validation is still running.
  const preparedWindow = preparePaymentPopup()
  submitting.value = true
  submissionError.value = ''
  const normalizedQuantity = clampQuantity(quantity.value)
  quantity.value = normalizedQuantity
  const requestedCouponClaimId = selectedCouponClaimId.value
  const amountBeforeValidation = payableAmount.value

  try {
    const quoteOk = await loadQuote()
    if (requestedCouponClaimId !== null && (!quoteOk || selectedCouponClaimId.value !== requestedCouponClaimId)) {
      cleanupPreparedTab(preparedWindow)
      submissionError.value = quoteError.value || '所选优惠券状态已变化，请重新选择。'
      await refreshAfterSubmitFailure()
      await focusSubmissionError()
      return
    }

    if (quoteOk && Math.abs(payableAmount.value - amountBeforeValidation) > 0.0001) {
      cleanupPreparedTab(preparedWindow)
      submissionError.value = '物品价格或优惠金额刚刚发生变化，已为你更新本单金额，请确认后再次兑换。'
      await refreshAfterSubmitFailure()
      await focusSubmissionError()
      return
    }

    const result = await shopStore.createOrder(productId.value, normalizedQuantity, selectedCouponClaimId.value)
    const orderNo = result?.data?.orderNo

    if (result?.success && orderNo) {
      const paymentUrl = result.data?.paymentUrl
      if (paymentUrl && preparedWindow && !preparedWindow.closed) {
        const { popup, isPopup } = openPaymentPopup(paymentUrl, preparedWindow)
        if (!isPopup) cleanupPreparedTab(preparedWindow)
        if (isPopup && popup) {
          watchPaymentPopup(popup, () => toast.info('支付窗口已关闭，可在订单详情检查支付状态'))
        }
        toast.success('订单已创建，支付窗口已打开')
      } else if (paymentUrl) {
        cleanupPreparedTab(preparedWindow)
        toast.warning('支付窗口被浏览器拦截，请在订单详情点击“立即支付”')
      } else {
        cleanupPreparedTab(preparedWindow)
        toast.warning('订单已创建，请在订单详情继续支付')
      }

      checkoutStore.clearCheckout(productId.value)
      await router.replace({ name: 'OrderDetail', params: { id: orderNo }, query: { role: 'buyer' } })
      return
    }

    cleanupPreparedTab(preparedWindow)
    submissionError.value = typeof result?.error === 'object'
      ? (result.error.message || result.error.code || '创建订单失败，请重新确认')
      : (result?.error || '创建订单失败，请重新确认')
    await refreshAfterSubmitFailure()
    await focusSubmissionError()
  } catch (error) {
    cleanupPreparedTab(preparedWindow)
    submissionError.value = error?.message || '创建订单失败，请重新确认'
    await refreshAfterSubmitFailure()
    await focusSubmissionError()
  } finally {
    submitting.value = false
    submissionGate.unlock()
  }
}

function resolveProductFallback() {
  const draft = checkoutStore.getDraft(productId.value)
  if (draft?.sourceFullPath && draft.sourceFullPath.startsWith(`/product/${productId.value}`)) {
    return draft.sourceFullPath
  }
  return {
    name: 'ProductDetail',
    params: { id: productId.value },
    query: { quantity: String(clampQuantity(quantity.value)) },
  }
}

function goBack() {
  checkoutStore.markReturnToProduct(productId.value)
  const draft = checkoutStore.getDraft(productId.value)
  const historyBackPath = String(window.history.state?.back || '')
  if (draft?.sourceFullPath && historyBackPath === draft.sourceFullPath) {
    router.back()
    return
  }
  router.replace(resolveProductFallback())
}

watch(selectedCouponClaimId, value => {
  if (!productId.value) return
  checkoutStore.updateCheckout(productId.value, { couponClaimId: value })
})

onBeforeRouteLeave(to => {
  if (to.name === 'ProductDetail' && String(to.params.id) === String(productId.value)) {
    checkoutStore.markReturnToProduct(productId.value)
  }
})

onMounted(initializeCheckout)
onBeforeUnmount(() => {
  if (quoteTimer) window.clearTimeout(quoteTimer)
  latestQuoteRequestId++
})
</script>

<style scoped>
.checkout-page {
  min-height: calc(100dvh - 72px);
  padding: 30px 16px 112px;
}

.checkout-shell {
  width: min(100%, 1120px);
  margin: 0 auto;
}

.back-button,
.state-action {
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 14px;
  border: 1px solid var(--border-medium);
  border-radius: 13px;
  background: var(--glass-bg);
  color: var(--text-secondary);
  font-weight: 650;
  transition: border-color .2s ease, color .2s ease, background .2s ease;
}

.back-button:hover,
.state-action:hover {
  border-color: var(--border-heavy);
  background: var(--bg-card);
  color: var(--text-primary);
}

.checkout-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 32px;
  margin: 30px 0 24px;
}

.checkout-kicker {
  margin: 0 0 6px;
  color: var(--color-primary-hover);
  font-size: 13px;
  font-weight: 750;
  letter-spacing: .08em;
}

.checkout-header h1 {
  margin: 0;
  color: var(--text-primary);
  font-size: clamp(30px, 5vw, 42px);
  line-height: 1.15;
  letter-spacing: -.025em;
}

.checkout-header > div:first-child > p:last-child {
  margin: 10px 0 0;
  color: var(--text-secondary);
  font-size: 15px;
}

.inventory-notice {
  max-width: 420px;
  min-height: 44px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border: 1px solid var(--border-light);
  border-radius: 14px;
  background: var(--color-primary-light);
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.5;
}

.inventory-notice svg {
  flex: 0 0 auto;
  color: var(--color-primary-hover);
}

.checkout-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: 22px;
  align-items: start;
}

.checkout-main-column {
  min-width: 0;
  display: grid;
  gap: 18px;
}

.checkout-card,
.receipt-card,
.submission-error {
  border: 1px solid var(--border-light);
  background: var(--glass-bg-heavy);
  box-shadow: var(--shadow-md);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}

.checkout-card {
  padding: 24px;
  border-radius: 22px;
}

.section-heading {
  display: flex;
  align-items: center;
  gap: 12px;
}

.heading-icon {
  width: 38px;
  height: 38px;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  border-radius: 12px;
  background: var(--color-primary-light);
  color: var(--color-primary-hover);
}

.section-heading h2 {
  margin: 0;
  color: var(--text-primary);
  font-size: 17px;
  line-height: 1.3;
}

.section-heading p {
  margin: 3px 0 0;
  color: var(--text-tertiary);
  font-size: 13px;
}

.product-summary {
  display: grid;
  grid-template-columns: 104px minmax(0, 1fr) auto;
  gap: 18px;
  align-items: center;
  margin-top: 22px;
  padding: 18px;
  border-radius: 18px;
  background: var(--bg-secondary);
}

.product-cover {
  width: 104px;
  aspect-ratio: 1;
  display: grid;
  place-items: center;
  overflow: hidden;
  border: 1px solid var(--border-light);
  border-radius: 16px;
  background: var(--bg-card);
  color: var(--text-tertiary);
}

.product-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.product-copy {
  min-width: 0;
}

.product-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-bottom: 8px;
}

.product-badges span {
  min-height: 26px;
  display: inline-flex;
  align-items: center;
  padding: 0 9px;
  border-radius: 999px;
  background: var(--bg-card);
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 650;
}

.product-copy h3 {
  margin: 0;
  overflow-wrap: anywhere;
  color: var(--text-primary);
  font-size: 19px;
  line-height: 1.4;
}

.seller-name,
.delivery-copy {
  margin: 6px 0 0;
  color: var(--text-tertiary);
  font-size: 13px;
  line-height: 1.5;
}

.delivery-copy {
  color: var(--text-secondary);
}

.unit-price {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.unit-price > span {
  color: var(--text-tertiary);
  font-size: 12px;
  text-decoration: line-through;
}

.unit-price strong {
  margin-top: 2px;
  color: var(--text-primary);
  font-size: 18px;
}

.unit-price small {
  color: var(--text-tertiary);
  font-size: 12px;
}

.quantity-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid var(--border-light);
}

.quantity-row label {
  color: var(--text-primary);
  font-size: 15px;
  font-weight: 700;
}

.quantity-row p {
  margin: 4px 0 0;
  color: var(--text-tertiary);
  font-size: 12px;
}

.quantity-control {
  height: 46px;
  display: grid;
  grid-template-columns: 44px 58px 44px;
  overflow: hidden;
  border: 1px solid var(--border-medium);
  border-radius: 14px;
  background: var(--bg-card);
}

.quantity-control button {
  min-width: 44px;
  display: grid;
  place-items: center;
  color: var(--text-secondary);
  transition: background .15s ease, color .15s ease;
}

.quantity-control button:hover:not(:disabled) {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.quantity-control button:disabled {
  cursor: not-allowed;
  opacity: .38;
}

.quantity-control input {
  width: 58px;
  border-inline: 1px solid var(--border-light);
  color: var(--text-primary);
  text-align: center;
  font-weight: 750;
  -moz-appearance: textfield;
}

.quantity-control input::-webkit-outer-spin-button,
.quantity-control input::-webkit-inner-spin-button {
  margin: 0;
  -webkit-appearance: none;
}

.coupon-heading {
  align-items: flex-start;
}

.coupon-heading > div:nth-child(2) {
  flex: 1;
}

.coupon-count {
  min-height: 28px;
  display: inline-flex;
  align-items: center;
  padding: 0 10px;
  border-radius: 999px;
  background: var(--color-success-bg);
  color: var(--color-success);
  font-size: 12px;
  font-weight: 750;
}

.quote-loading {
  min-height: 74px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  margin-top: 18px;
  border-radius: 15px;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  font-size: 13px;
}

.coupon-list {
  display: grid;
  gap: 10px;
  margin-top: 18px;
}

.coupon-choice {
  min-height: 76px;
  display: grid;
  grid-template-columns: 20px minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  padding: 14px 15px;
  border: 1px solid var(--border-light);
  border-radius: 16px;
  background: var(--bg-secondary);
  cursor: pointer;
  transition: border-color .2s ease, background .2s ease, box-shadow .2s ease;
}

.coupon-choice:hover {
  border-color: var(--border-heavy);
}

.coupon-choice.selected {
  border-color: var(--color-primary-hover);
  background: var(--color-primary-light);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary) 20%, transparent);
}

.coupon-choice input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.radio-mark {
  width: 20px;
  height: 20px;
  display: grid;
  place-items: center;
  border: 2px solid var(--border-heavy);
  border-radius: 50%;
  background: var(--bg-card);
}

.coupon-choice.selected .radio-mark {
  border: 6px solid var(--color-primary-hover);
}

.coupon-choice-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.coupon-choice-copy strong {
  overflow-wrap: anywhere;
  color: var(--text-primary);
  font-size: 14px;
}

.coupon-choice-copy small {
  color: var(--text-tertiary);
  font-size: 12px;
  line-height: 1.45;
}

.coupon-saving {
  color: var(--color-danger);
  font-size: 13px;
  font-weight: 750;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.coupon-empty,
.coupon-error {
  margin: 0;
  padding: 14px;
  border-radius: 14px;
  color: var(--text-secondary);
  background: var(--bg-secondary);
  font-size: 13px;
  line-height: 1.55;
}

.coupon-error {
  color: var(--color-warning);
  background: var(--color-warning-bg);
}

.unavailable-coupons {
  border-top: 1px dashed var(--border-medium);
}

.unavailable-coupons summary {
  min-height: 44px;
  display: flex;
  align-items: center;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 650;
  cursor: pointer;
}

.unavailable-list {
  display: grid;
  gap: 8px;
  padding-bottom: 4px;
}

.unavailable-item {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 14px;
  border-radius: 13px;
  background: var(--bg-secondary);
  opacity: .72;
}

.unavailable-item div {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.unavailable-item strong {
  color: var(--text-primary);
  font-size: 13px;
}

.unavailable-item small,
.unavailable-item > span {
  color: var(--text-tertiary);
  font-size: 12px;
}

.unavailable-item > span {
  max-width: 44%;
  text-align: right;
}

.delivery-card > p {
  margin: 18px 0 0;
  padding: 15px 16px;
  border-left: 3px solid var(--color-info);
  border-radius: 0 13px 13px 0;
  background: var(--color-info-bg);
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.65;
}

.checkout-sidebar {
  min-width: 0;
}

.receipt-card {
  position: sticky;
  top: 92px;
  overflow: hidden;
  padding: 24px;
  border-radius: 22px;
}

.receipt-card::before {
  content: '';
  position: absolute;
  inset: 0 0 auto;
  height: 5px;
  background: var(--publish-btn-bg);
}

.receipt-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  color: var(--color-primary-hover);
}

.receipt-heading p {
  margin: 0;
  color: var(--text-tertiary);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: .08em;
}

.receipt-heading h2 {
  margin: 3px 0 0;
  color: var(--text-primary);
  font-size: 21px;
}

.receipt-lines {
  display: grid;
  gap: 13px;
  margin: 22px 0 0;
  padding: 20px 0;
  border-block: 1px dashed var(--border-medium);
}

.receipt-lines div {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  color: var(--text-secondary);
  font-size: 13px;
}

.receipt-lines dd {
  margin: 0;
  color: var(--text-primary);
  font-weight: 650;
  text-align: right;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.receipt-lines .original-amount {
  color: var(--text-tertiary);
  font-weight: 500;
  text-decoration: line-through;
}

.receipt-lines dd.saving {
  color: var(--color-danger);
}

.receipt-total {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  padding-top: 20px;
}

.receipt-total > span {
  padding-bottom: 4px;
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 650;
}

.receipt-total strong {
  color: var(--text-primary);
  font-size: 30px;
  line-height: 1;
  letter-spacing: -.035em;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.receipt-total small {
  font-size: 13px;
  letter-spacing: 0;
}

.selected-coupon-note,
.submit-block-message,
.submit-hint {
  margin: 14px 0 0;
  color: var(--text-tertiary);
  font-size: 12px;
  line-height: 1.5;
  text-align: center;
}

.selected-coupon-note {
  color: var(--color-danger);
}

.submit-block-message {
  padding: 10px;
  border-radius: 10px;
  background: var(--color-warning-bg);
  color: var(--color-warning);
}

.confirm-button {
  min-height: 48px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  border-radius: 14px;
  background: var(--publish-btn-bg);
  box-shadow: var(--publish-btn-shadow);
  color: var(--publish-btn-color);
  font-size: 14px;
  font-weight: 750;
  transition: filter .2s ease, box-shadow .2s ease, transform .15s ease;
}

.confirm-button:hover:not(:disabled) {
  box-shadow: var(--publish-btn-hover-shadow);
  filter: brightness(1.03);
}

.confirm-button:active:not(:disabled) {
  transform: translateY(1px);
}

.confirm-button:disabled {
  cursor: not-allowed;
  opacity: .45;
  box-shadow: none;
}

.desktop-confirm {
  width: 100%;
  margin-top: 20px;
}

.mobile-confirm-bar {
  display: none;
}

.submission-error {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 18px;
  padding: 16px 18px;
  border-color: color-mix(in srgb, var(--color-danger) 32%, var(--border-light));
  border-radius: 16px;
  color: var(--color-danger);
}

.submission-error svg {
  flex: 0 0 auto;
  margin-top: 1px;
}

.submission-error strong {
  color: var(--text-primary);
}

.submission-error p {
  margin: 3px 0 0;
  color: var(--text-secondary);
  font-size: 13px;
}

.checkout-loading {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: 22px;
}

.skeleton {
  border-radius: 22px;
  background: var(--skeleton-gradient);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}

.skeleton-product { min-height: 520px; }
.skeleton-receipt { min-height: 390px; }

.spin {
  animation: spin .85s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }
@keyframes shimmer { to { background-position: -200% 0; } }

.back-button:focus-visible,
.state-action:focus-visible,
.quantity-control button:focus-visible,
.quantity-control input:focus-visible,
.coupon-choice:has(input:focus-visible),
.unavailable-coupons summary:focus-visible,
.confirm-button:focus-visible {
  outline: 2px solid var(--color-primary-hover);
  outline-offset: 3px;
}

@media (max-width: 820px) {
  .checkout-page {
    padding: 20px 12px calc(126px + env(safe-area-inset-bottom, 0px));
  }

  .checkout-header {
    align-items: flex-start;
    flex-direction: column;
    gap: 16px;
    margin-top: 22px;
  }

  .inventory-notice {
    max-width: none;
    width: 100%;
  }

  .checkout-grid,
  .checkout-loading {
    grid-template-columns: 1fr;
  }

  .checkout-card {
    padding: 18px;
    border-radius: 19px;
  }

  .product-summary {
    grid-template-columns: 82px minmax(0, 1fr);
    padding: 14px;
  }

  .product-cover {
    width: 82px;
  }

  .unit-price {
    grid-column: 2;
    align-items: flex-start;
  }

  .receipt-card {
    position: static;
  }

  .desktop-confirm,
  .receipt-card .submit-hint {
    display: none;
  }

  .mobile-confirm-bar {
    position: fixed;
    z-index: 100;
    right: 0;
    bottom: 0;
    left: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    padding: 10px 12px calc(10px + env(safe-area-inset-bottom, 0px));
    border-top: 1px solid var(--border-light);
    background: var(--glass-bg-heavy);
    box-shadow: 0 -10px 30px rgba(0, 0, 0, .08);
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);
  }

  .mobile-confirm-bar > div {
    min-width: 0;
    display: flex;
    flex-direction: column;
  }

  .mobile-confirm-bar > div span {
    color: var(--text-tertiary);
    font-size: 11px;
  }

  .mobile-confirm-bar > div strong {
    color: var(--text-primary);
    font-size: 18px;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .mobile-confirm-bar .confirm-button {
    min-width: 190px;
    padding-inline: 18px;
    white-space: nowrap;
  }
}

@media (max-width: 520px) {
  .checkout-header h1 { font-size: 30px; }

  .product-summary {
    grid-template-columns: 72px minmax(0, 1fr);
    gap: 12px;
  }

  .product-cover { width: 72px; }
  .product-copy h3 { font-size: 16px; }
  .delivery-copy { display: none; }

  .quantity-row {
    align-items: flex-start;
    flex-direction: column;
  }

  .quantity-control {
    width: 100%;
    grid-template-columns: 1fr 70px 1fr;
  }

  .quantity-control input { width: 70px; }

  .coupon-choice {
    grid-template-columns: 20px minmax(0, 1fr);
  }

  .coupon-saving {
    grid-column: 2;
    justify-self: start;
  }

  .unavailable-item {
    flex-direction: column;
    gap: 6px;
  }

  .unavailable-item > span {
    max-width: none;
    text-align: left;
  }

  .mobile-confirm-bar > div strong { font-size: 16px; }
  .mobile-confirm-bar .confirm-button { min-width: 175px; padding-inline: 13px; }
}

@media (prefers-reduced-motion: reduce) {
  .back-button,
  .state-action,
  .coupon-choice,
  .confirm-button,
  .quantity-control button,
  .skeleton {
    transition: none;
    animation: none;
  }
}
</style>
