<template>
  <div class="edit-page">
    <Transition name="submit-mask">
      <div
        v-if="editOverlayVisible"
        class="submit-mask"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <div class="submit-mask-card">
          <span class="submit-mask-spinner" aria-hidden="true"></span>
          <h3 class="submit-mask-title">{{ editOverlayTitle }}</h3>
          <p class="submit-mask-text">{{ editOverlayDescription }}</p>
        </div>
      </div>
    </Transition>

    <div class="page-container">
      <div class="edit-notice">
        <Clock3 class="notice-icon" :size="17" aria-hidden="true" />
        <span class="notice-text">为避免刷位，1 小时内最多修改 3 次，24 小时内最多修改 10 次，超过将无法保存。</span>
      </div>
      
      <!-- 加载中 -->
      <div v-if="loading" class="loading-state">
        <div class="skeleton-card">
          <div class="skeleton skeleton-line w-32"></div>
          <div class="skeleton skeleton-line w-full mt-4"></div>
          <div class="skeleton skeleton-line w-full mt-2"></div>
          <div class="skeleton skeleton-line w-48 mt-4"></div>
        </div>
      </div>
      
      <!-- 物品不存在 -->
      <EmptyState
        v-else-if="!product"
        icon=""
        title="物品不存在"
        description="无法找到该物品信息"
      >
        <router-link to="/seller/products" class="back-btn">
          ← 返回
        </router-link>
      </EmptyState>
      
      <!-- 编辑表单 -->
      <form v-else class="edit-form seller-edit-form" @submit.prevent="submitForm">
        <!-- 基本信息 -->
        <div class="form-card">
          <h2 class="card-title">基本信息</h2>
          
          <div class="form-group">
            <label class="form-label required">物品名称</label>
            <input
              v-model="form.name"
              type="text"
              class="form-input"
              placeholder="请输入物品名称（2-50字符）"
              maxlength="50"
            />
            <p class="form-counter">{{ form.name.length }}/50</p>
          </div>
          
          <div class="form-group">
            <div class="form-label-row">
              <label class="form-label required">物品描述</label>
              <div class="desc-mode-tabs">
                <button
                  type="button"
                  :class="['desc-mode-tab', { active: descMode === 'write' }]"
                  @click="descMode = 'write'"
                >编辑</button>
                <button
                  type="button"
                  :class="['desc-mode-tab', { active: descMode === 'preview' }]"
                  @click="descMode = 'preview'"
                >预览</button>
              </div>
            </div>
            <textarea
              v-if="descMode === 'write'"
              v-model="form.description"
              class="form-textarea"
              placeholder="请输入物品描述（10-1000字符）"
              rows="4"
              maxlength="1000"
            ></textarea>
            <div
              v-else
              class="form-textarea-preview markdown-content"
              :class="{ 'is-empty': !descriptionPreview }"
              v-html="descriptionPreview || '暂无内容，切换到「编辑」填写物品描述'"
            ></div>
            <p class="form-hint">支持 Markdown：**加粗**、*斜体*、++下划线++、`代码`；网址和图片语法显示为可点击链接（新窗口打开）</p>
            <p class="form-counter">{{ form.description.length }}/1000</p>
          </div>
          
          <div class="form-group">
            <label class="form-label required">物品分类</label>
            <div class="category-select">
              <button
                v-for="cat in categories"
                :key="cat.id"
                type="button"
                :class="['category-btn', { active: form.categoryId === cat.id }]"
                @click="form.categoryId = cat.id"
              >
                {{ cat.name }}
              </button>
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label class="form-label required">价格 (LDC)</label>
              <input
                v-model="form.price"
                type="number"
                class="form-input"
                placeholder="0.00"
                min="0.01"
                max="99999999"
                step="0.01"
              />
            </div>
            
            <div class="form-group">
              <label class="form-label">折扣</label>
              <input
                v-model="form.discount"
                type="number"
                class="form-input"
                placeholder="1"
                min="0.01"
                max="1"
                step="0.01"
              />
              <p class="form-hint">范围 0.01-1</p>
            </div>
          </div>
          
          <div class="form-group">
            <label class="form-label required">物品图片</label>
            <input
              v-model="form.imageUrl"
              type="url"
              class="form-input"
              :class="{ 'input-error': imageUrlError || imageLoadError }"
              placeholder="https://..."
              :maxlength="MAX_PRODUCT_IMAGE_URL_LENGTH"
              @blur="validateImageLoad"
            />
            <p v-if="imageUrlError" class="form-error">{{ imageUrlError }}</p>
            <p v-else-if="imageLoadError" class="form-error">{{ imageLoadError }}</p>
            <p v-else-if="imageValidating" class="form-hint loading-hint">正在验证图片...</p>
            <p v-else-if="imageValidated" class="form-hint success-hint">图片验证通过</p>
            <p v-else class="form-hint">推荐尺寸 16:9，必须使用 HTTPS 链接，不支持 linux.do 图床</p>
            
            <!-- 图片预览 -->
            <div v-if="imagePreviewUrl && !imageLoadError" class="image-preview">
              <img :src="imagePreviewUrl" alt="图片预览" @error="onPreviewError" />
            </div>
          </div>
        </div>
        
        <!-- 物品类型（只读） -->
        <div class="form-card">
          <h2 class="card-title">物品类型</h2>
          
          <div class="type-readonly">
            <div class="type-info">
              <h4 class="type-name">{{ getTypeName(getProductType(product)) }}</h4>
              <p class="type-desc">物品类型创建后无法修改</p>
            </div>
          </div>
        </div>
        
        <!-- 普通物品设置 -->
        <div class="form-card" v-if="getProductType(product) === 'normal'">
          <h2 class="card-title">普通物品设置</h2>

          <div class="form-group">
            <label class="form-label required">库存数量</label>
            <input
              v-model="form.stock"
              ref="stockInput"
              type="number"
              class="form-input"
              :class="{ 'input-error': !!stockError }"
              min="0"
              max="1000000"
              step="1"
              placeholder="例如：20"
            />
            <p v-if="stockError" class="form-error">{{ stockError }}</p>
            <p v-else class="form-hint">
              普通物品不会自动发货。买家支付后会收到“请主动联系卖家获取服务”的提醒，请及时在订单页处理履约。
            </p>
          </div>

        </div>

        <div class="form-card" v-else-if="getProductType(product) === 'link'">
          <h2 class="card-title">外链物品已停用</h2>
          <p class="form-hint">
            外链物品已不再支持编辑和重新上架。请重新发布为普通物品，以便平台保留完整订单记录。
          </p>
        </div>

        <div class="form-card">
          <h2 class="card-title">兑换门槛</h2>

          <div class="form-group">
            <label class="form-label">商品购买信任等级门槛</label>
            <select v-model.number="form.purchaseTrustLevel" class="form-input">
              <option v-for="level in purchaseTrustLevelOptions" :key="level" :value="level">
                TL{{ level }}{{ level === 0 ? '（不限制）' : '' }}
              </option>
            </select>
            <p class="form-hint">
              仅影响“兑换”门槛；TL0 表示任何能看到该商品的用户都可以兑换。
            </p>
          </div>

          <div v-if="getProductType(product) !== 'link'" class="form-group">
            <PurchaseLimitSelector
              ref="maxPurchaseQuantityInput"
              v-model:mode="form.purchaseLimitType"
              v-model:quantity="form.maxPurchaseQuantity"
              v-model:period-days="form.purchaseLimitPeriodDays"
              :shared-cdk-enabled="getProductType(product) === 'cdk' && form.sharedCdkEnabled"
              :error="maxPurchaseQuantityError"
              :period-error="purchaseLimitPeriodDaysError"
              input-id-prefix="edit-purchase-limit"
            />
          </div>
        </div>
        
        <!-- CDK 类型提示 -->
        <div class="form-card" v-if="getProductType(product) === 'cdk'">
          <h2 class="card-title">CDK 管理</h2>
          <div class="form-group">
            <label class="toggle-switch limit-toggle" @click.prevent="toggleSharedCdkMode()">
              <span class="toggle-track" :class="{ active: form.sharedCdkEnabled }">
                <span class="toggle-thumb"></span>
              </span>
              <span class="toggle-label">
                共享卡密模式
                <span class="toggle-help" v-if="form.sharedCdkEnabled">（同一 CDK 重复发货）</span>
              </span>
            </label>
            <p class="form-hint">开启后只需填写 1 个共享 CDK，库存保持无限，系统会固定每位用户累计只能购买 1 件。</p>
          </div>

          <div v-if="form.sharedCdkEnabled" class="form-group">
            <label class="form-label required">共享 CDK 卡密</label>
            <textarea
              v-model="form.sharedCdkCode"
              class="form-textarea code"
              :class="{ 'input-error': !!sharedCdkCodeError }"
              rows="3"
              placeholder="请输入 1 个共享 CDK"
            ></textarea>
            <p v-if="sharedCdkCodeError" class="form-error">{{ sharedCdkCodeError }}</p>
            <p v-else class="form-hint">保存后会直接用于自动发货，买家侧展示无差异。</p>
          </div>

          <div v-if="initialTestModeEnabled" class="form-group">
            <label class="toggle-switch limit-toggle" @click.prevent="form.isTestMode = !form.isTestMode">
              <span class="toggle-track" :class="{ active: form.isTestMode }">
                <span class="toggle-thumb"></span>
              </span>
              <span class="toggle-label">
                测试模式
                <span class="toggle-help" v-if="form.isTestMode">（仅自己可购买）</span>
                <span class="toggle-help" v-else>（已关闭）</span>
              </span>
            </label>
            <p class="form-hint">
              开启时仅您自己可以购买此物品，用于测试 LDC 通知回调是否正常工作。
            </p>
            <p v-if="form.isTestMode" class="form-hint test-mode-auto-offline-note">
              测试模式商品审核通过并上架后，30 分钟会自动下架；如需继续售卖，请关闭测试模式后保存。
            </p>
            <p v-else class="form-hint success-hint">
              关闭后将恢复普通可售状态，不再受“仅自己可购买”和“30 分钟自动下架”限制。
            </p>
          </div>

          <p class="cdk-hint">
            {{ form.sharedCdkEnabled ? '共享卡密模式下，请在当前页面直接维护共享 CDK。' : '请在「我的物品」页面管理 CDK 库存' }}
          </p>
          <router-link v-if="!form.sharedCdkEnabled" to="/seller/products" class="manage-link">
            前往管理 →
          </router-link>
        </div>
        
        <SellerStickySummary class="seller-product-summary" eyebrow="编辑校对" title="物品摘要">
          <div class="seller-summary-preview" :class="{ empty: !imagePreviewUrl }">
            <img v-if="imagePreviewUrl" :src="imagePreviewUrl" :alt="form.name || '物品预览'" />
            <ImageIcon v-else :size="26" aria-hidden="true" />
          </div>
          <h3 class="seller-summary-name">{{ form.name || '尚未填写物品名称' }}</h3>
          <p class="seller-summary-meta">{{ selectedCategoryName }} · {{ getTypeName(getProductType(product)) }}</p>
          <dl class="seller-summary-facts">
            <div><dt>成交价</dt><dd>{{ editFinalPrice > 0 ? editFinalPrice.toFixed(2) : '—' }} LDC</dd></div>
            <div><dt>库存</dt><dd>{{ getProductType(product) === 'normal' ? (form.stock || '0') : (form.sharedCdkEnabled ? '共享模式' : '在物品页管理') }}</dd></div>
            <div><dt>限购</dt><dd>{{ purchaseLimitSummary }}</dd></div>
          </dl>
          <ul class="seller-readiness-list">
            <li :class="{ ready: !!form.name.trim() }"><span></span>物品名称</li>
            <li :class="{ ready: !!form.categoryId }"><span></span>物品分类</li>
            <li :class="{ ready: imageValidated && lastValidatedUrl === form.imageUrl.trim() }"><span></span>图片验证</li>
            <li :class="{ ready: canSubmit }"><span></span>保存前检查</li>
          </ul>
          <template #action>
            <button type="submit" class="submit-btn" :disabled="!canSubmit || updateBusy">{{ submitButtonText }}</button>
          </template>
        </SellerStickySummary>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCatalogStore } from '@/stores/catalog'
import { useInventoryStore } from '@/stores/inventory'
import { useToast } from '@/composables/useToast'
import { useDialog } from '@/composables/useDialog'
import { validateProductName, validateProductDescription, validatePrice } from '@/utils/security'
import { renderProductDescription } from '@/utils/renderProductDescription'
import EmptyState from '@/components/common/EmptyState.vue'
import SellerStickySummary from '@/components/seller/SellerStickySummary.vue'
import PurchaseLimitSelector from '@/components/product/PurchaseLimitSelector.vue'
import { Clock3, Image as ImageIcon } from '@lucide/vue'
import {
  getProductType as resolveProductType,
  getProductTypeText,
  isLegacyLinkProduct,
  isNormalProduct
} from '@/utils/shopProduct'
import {
  MAX_PRODUCT_IMAGE_URL_LENGTH,
  getProductImageUrlError,
  preloadProductImage
} from '@/utils/productImageValidation'

const route = useRoute()
const router = useRouter()
const catalogStore = useCatalogStore()
const inventoryStore = useInventoryStore()
const toast = useToast()
const dialog = useDialog()

const loading = ref(true)
const submitting = ref(false)
const updateConfirming = ref(false)
const descMode = ref('write')
const product = ref(null)
// 图片加载验证状态
const imageValidating = ref(false)
const imageValidated = ref(false)
const imageLoadError = ref('')
const imagePreviewUrl = ref('')
const stockInput = ref(null)
const maxPurchaseQuantityInput = ref(null)
const lastValidatedUrl = ref('')
let imageValidationSequence = 0
let pendingImageValidation = null
let pendingImageValidationUrl = ''
const EDIT_SAVE_TIMEOUT_MS = 90000
const EDIT_SAVE_STATUS_MAX_RETRIES = 8
const EDIT_SAVE_STATUS_RETRY_INTERVAL_MS = 2000
// 分类 - 从API获取或使用默认
const categories = ref([
  { id: 1, name: 'AI', icon: '' },
  { id: 2, name: '存储', icon: '' },
  { id: 3, name: '小鸡', icon: '' },
  { id: 4, name: '咨询', icon: '' }
])

// 表单数据
const form = ref({
  name: '',
  description: '',
  categoryId: null,
  price: '',
  discount: 1,
  imageUrl: '',
  stock: '',
  purchaseTrustLevel: 0,
  sharedCdkEnabled: false,
  sharedCdkCode: '',
  purchaseLimitType: 'none',
  maxPurchaseQuantity: '',
  purchaseLimitPeriodDays: 0,
  isTestMode: false
})
const purchaseTrustLevelOptions = [0, 1, 2, 3, 4]

const updateBusy = computed(() => submitting.value || updateConfirming.value)
const editOverlayVisible = computed(() => updateBusy.value)
const editOverlayTitle = computed(() => (updateConfirming.value ? '正在确认保存结果' : '正在保存修改'))
const editOverlayDescription = computed(() => {
  if (updateConfirming.value) {
    return '请求可能已发送成功，系统正在核对最新数据，请勿重复提交。'
  }
  return '网络较慢时可能需要较长时间，请耐心等待并保持当前页面。'
})

const descriptionPreview = computed(() => renderProductDescription(form.value.description))
const editFinalPrice = computed(() => Number(form.value.price || 0) * Number(form.value.discount || 1))
const selectedCategoryName = computed(() => categories.value.find(category => Number(category.id) === Number(form.value.categoryId))?.name || '未选择分类')
const purchaseLimitSummary = computed(() => {
  if (getProductType(product.value) === 'cdk' && form.value.sharedCdkEnabled) return '每位用户永久累计 1 件'
  const quantity = Number(form.value.maxPurchaseQuantity || 0)
  if (form.value.purchaseLimitType === 'per_order' && quantity > 0) return `每单 ${quantity} 件`
  if (form.value.purchaseLimitType === 'per_user' && quantity > 0) {
    const periodDays = Number(form.value.purchaseLimitPeriodDays || 0)
    return periodDays > 0
      ? `每位用户最近 ${periodDays} 天 ${quantity} 件`
      : `每位用户永久累计 ${quantity} 件`
  }
  return '不限制'
})
const submitButtonText = computed(() => {
  if (updateConfirming.value) return '正在确认保存结果...'
  if (submitting.value) return '保存中...'
  if (isLegacyLinkProduct(product.value)) return '外链物品已停用'
  return '保存修改'
})

const initialTestModeEnabled = computed(() => !!(product.value?.is_test_mode || product.value?.isTestMode))
// 加载分类
async function loadCategories() {
  try {
    const result = await catalogStore.fetchCategories()
    if (result.success && result.data.categories.length > 0) {
      // 过滤掉小店分类（小店入驻使用独立的小店集市）
      categories.value = result.data.categories
        .filter(cat => cat.name !== '小店' && cat.name !== '友情小店')
        .map(cat => ({
          id: cat.id,
          name: cat.name,
          icon: cat.icon || ''
        }))
    }
  } catch (error) {
    // 使用默认分类
  }
}

// 图片URL验证
const imageUrlError = computed(() => {
  return getProductImageUrlError(form.value.imageUrl) || null
})

// 图片预加载验证
const stockError = computed(() => {
  if (!isNormalProduct(product.value)) return ''
  const raw = String(form.value.stock ?? '').trim()
  if (!raw) return '请输入库存数量'
  const value = Number(raw)
  if (!Number.isInteger(value) || value < 0) return '库存必须是大于等于 0 的整数'
  if (value > 1000000) return '库存不能超过 1000000'
  return ''
})

const maxPurchaseQuantityError = computed(() => {
  if (form.value.purchaseLimitType === 'none') return ''
  const raw = String(form.value.maxPurchaseQuantity ?? '').trim()
  if (!raw) return '请输入购买上限'
  const value = Number(raw)
  if (!Number.isInteger(value) || value < 1) return '购买上限必须是大于 0 的整数'
  if (value > 1000) return '购买上限不能超过 1000'
  return ''
})

const purchaseLimitPeriodDaysError = computed(() => {
  if (form.value.purchaseLimitType !== 'per_user') return ''
  const raw = String(form.value.purchaseLimitPeriodDays ?? '').trim()
  if (!raw) return '请输入滚动周期'
  const value = Number(form.value.purchaseLimitPeriodDays || 0)
  if (value === 0) return ''
  if (!Number.isInteger(value) || value < 1 || value > 365) return '滚动周期必须是 1-365 天之间的整数'
  return ''
})

const sharedCdkCodeError = computed(() => {
  if (getProductType(product.value) !== 'cdk' || !form.value.sharedCdkEnabled) return ''
  const value = String(form.value.sharedCdkCode || '').trim()
  return value ? '' : '请输入共享 CDK 卡密'
})

// 共享卡密模式切换：与已保存模式不一致时弹确认（说明迁移/暂停语义），
// 改回已保存模式（误触撤销）不弹窗
async function toggleSharedCdkMode() {
  const current = !!form.value.sharedCdkEnabled
  const savedMode = !!(product.value?.sharedCdkEnabled || Number(product.value?.shared_cdk_enabled || 0) === 1)
  if (current !== savedMode) {
    form.value.sharedCdkEnabled = !current
    return
  }
  const message = current
    ? '切换为独立卡密后，当前共享码将自动迁移为 1 条可用卡密（库存 1），可在「我的物品」中批量补充；切换后将重新提交 AI 审核。'
    : `切换为共享卡密后，现有独立卡密将暂停出售，系统固定每位用户永久累计限购 1 件；切回独立时会恢复“${purchaseLimitSummary.value}”。请填写共享卡密；切换后将重新提交 AI 审核。`
  const confirmed = await dialog.confirm(message, {
    title: '切换卡密模式',
    confirmText: '确定切换',
    cancelText: '取消'
  })
  if (confirmed) {
    form.value.sharedCdkEnabled = !current
  }
}

function resetImageValidation() {
  imageValidationSequence += 1
  pendingImageValidation = null
  pendingImageValidationUrl = ''
  imageValidating.value = false
  imageValidated.value = false
  imageLoadError.value = ''
  imagePreviewUrl.value = ''
  lastValidatedUrl.value = ''
}

// 验证图片是否可加载
async function validateImageLoad() {
  const url = form.value.imageUrl?.trim()
  
  if (!url || imageUrlError.value) {
    resetImageValidation()
    return false
  }
  
  if (url === lastValidatedUrl.value && imageValidated.value) return true
  if (pendingImageValidation && pendingImageValidationUrl === url) {
    return pendingImageValidation
  }

  const validationSequence = ++imageValidationSequence
  pendingImageValidationUrl = url
  imageValidating.value = true
  imageValidated.value = false
  imageLoadError.value = ''
  imagePreviewUrl.value = ''

  const validationPromise = (async () => {
    try {
      await preloadProductImage(url)
      if (validationSequence !== imageValidationSequence || form.value.imageUrl?.trim() !== url) return false

      imageValidated.value = true
      imagePreviewUrl.value = url
      lastValidatedUrl.value = url
      return true
    } catch (error) {
      if (validationSequence !== imageValidationSequence || form.value.imageUrl?.trim() !== url) return false
      imageLoadError.value = '图片无法加载，请检查链接是否有效'
      lastValidatedUrl.value = ''
      return false
    } finally {
      if (validationSequence === imageValidationSequence) {
        imageValidating.value = false
      }
      if (pendingImageValidation === validationPromise) {
        pendingImageValidation = null
        pendingImageValidationUrl = ''
      }
    }
  })()

  pendingImageValidation = validationPromise
  return validationPromise
}

// 预览图片加载失败
function onPreviewError() {
  imageValidationSequence += 1
  imageLoadError.value = '图片加载失败，请检查链接是否有效'
  imagePreviewUrl.value = ''
  imageValidated.value = false
  lastValidatedUrl.value = ''
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function isUncertainUpdateResult(result) {
  const status = Number(result?.status || 0)
  const message = String(result?.error || '').toLowerCase()
  if (status === 0) return true
  return message.includes('超时')
    || message.includes('网络')
    || message.includes('failed to fetch')
    || message.includes('network')
    || message.includes('abort')
}

function hasExpectedProductState(latestProduct, expectedData, expectedType) {
  if (!latestProduct) return false

  const latestName = String(latestProduct.name || '').trim()
  const latestDescription = String(latestProduct.description || '').trim()
  const latestCategoryId = Number(latestProduct.category_id || latestProduct.categoryId || 0)
  const latestPrice = Number(latestProduct.price || 0)
  const latestDiscount = Number(latestProduct.discount || 1)
  const latestImageUrl = String(latestProduct.image_url || latestProduct.imageUrl || '').trim()

  const expectedName = String(expectedData.name || '').trim()
  const expectedDescription = String(expectedData.description || '').trim()
  const expectedCategoryId = Number(expectedData.categoryId || 0)
  const expectedPrice = Number(expectedData.price || 0)
  const expectedDiscount = Number(expectedData.discount || 1)
  const expectedImageUrl = String(expectedData.imageUrl || '').trim()

  const floatEquals = (a, b, epsilon = 1e-8) => Math.abs(Number(a || 0) - Number(b || 0)) <= epsilon

  if (latestName !== expectedName) return false
  if (latestDescription !== expectedDescription) return false
  if (latestCategoryId !== expectedCategoryId) return false
  if (!floatEquals(latestPrice, expectedPrice)) return false
  if (!floatEquals(latestDiscount, expectedDiscount)) return false
  if (latestImageUrl !== expectedImageUrl) return false

  if (expectedType === 'normal') {
    const latestStock = Number(latestProduct.stock || 0)
    const expectedStock = Number(expectedData.stock || 0)
    if (latestStock !== expectedStock) return false
  }

  const latestPurchaseTrustLevel = Number(
    latestProduct.purchase_trust_level ?? latestProduct.purchaseTrustLevel ?? 0
  )
  const expectedPurchaseTrustLevel = Number(expectedData.purchaseTrustLevel || 0)
  if (latestPurchaseTrustLevel !== expectedPurchaseTrustLevel) return false

  const latestLimitConfig = latestProduct.purchase_limit_config || latestProduct.purchaseLimitConfig || {}
  const latestLimitType = String(latestLimitConfig.mode || latestProduct.purchase_limit_type || latestProduct.purchaseLimitType || 'none')
  const expectedLimitType = String(expectedData.purchaseLimitType || 'none')
  if (latestLimitType !== expectedLimitType) return false
  const latestLimit = Number(latestLimitConfig.quantity ?? latestProduct.max_purchase_quantity ?? latestProduct.maxPurchaseQuantity ?? 0)
  const expectedLimit = Number(expectedData.maxPurchaseQuantity || 0)
  if (latestLimit !== expectedLimit) return false
  const latestLimitPeriodDays = Number(
    latestLimitConfig.periodDays
      ?? latestLimitConfig.period_days
      ?? latestProduct.purchase_limit_period_days
      ?? latestProduct.purchaseLimitPeriodDays
      ?? 0
  )
  const expectedLimitPeriodDays = Number(expectedData.purchaseLimitPeriodDays || 0)
  if (latestLimitPeriodDays !== expectedLimitPeriodDays) return false

  if (expectedType === 'cdk') {
    const latestSharedCdkEnabled = !!(latestProduct.sharedCdkEnabled || Number(latestProduct.shared_cdk_enabled || 0) === 1)
    const expectedSharedCdkEnabled = !!expectedData.sharedCdkEnabled
    if (latestSharedCdkEnabled !== expectedSharedCdkEnabled) return false

    const latestSharedCdkCode = String(latestProduct.shared_cdk_code || latestProduct.sharedCdkCode || '')
    const expectedSharedCdkCode = String(expectedData.sharedCdkCode || '')
    if (latestSharedCdkCode !== expectedSharedCdkCode) return false

    const latestTestMode = !!(latestProduct.is_test_mode || latestProduct.isTestMode)
    const expectedTestMode = !!expectedData.isTestMode
    if (latestTestMode !== expectedTestMode) return false
  }

  return true
}

async function pollUpdateResult(productId, expectedData, expectedType) {
  for (let i = 0; i < EDIT_SAVE_STATUS_MAX_RETRIES; i += 1) {
    const latestResult = await inventoryStore.fetchProductDetail(productId)
    const latestProduct = latestResult.success ? latestResult.data.product : null
    if (hasExpectedProductState(latestProduct, expectedData, expectedType)) {
      return { confirmed: true, product: latestProduct }
    }
    if (i < EDIT_SAVE_STATUS_MAX_RETRIES - 1) {
      await wait(EDIT_SAVE_STATUS_RETRY_INTERVAL_MS)
    }
  }
  return { confirmed: false, product: null }
}

async function confirmUpdateAfterUncertainResult(productId, expectedData, expectedType) {
  updateConfirming.value = true
  try {
    const confirmed = await pollUpdateResult(productId, expectedData, expectedType)
    if (confirmed.confirmed) {
      toast.success('物品已更新，已自动确认保存结果')
      router.push('/seller/products')
      return true
    }
    toast.warning('暂未确认保存结果。请稍后在“我的物品”中查看，避免重复修改。')
    return false
  } finally {
    updateConfirming.value = false
  }
}

// 是否可以提交
const canSubmit = computed(() => {
  // 基本验证
  if (!form.value.name.trim()) return false
  if (form.value.name.length < 2 || form.value.name.length > 50) return false
  if (!form.value.description.trim()) return false
  if (form.value.description.length < 10 || form.value.description.length > 1000) return false
  if (!form.value.categoryId) return false
  if (!form.value.price || parseFloat(form.value.price) <= 0 || parseFloat(form.value.price) > 99999999) return false
  if (form.value.discount < 0.01 || form.value.discount > 1) return false
  // 图片验证：必填且格式正确
  if (!form.value.imageUrl?.trim()) return false
  if (imageUrlError.value) return false

  // 类型特定验证
  const type = getProductType(product.value)
  if (type === 'link') {
    return false
  } else if (type === 'normal') {
    if (stockError.value) return false
  } else if (type === 'cdk') {
    if (sharedCdkCodeError.value) return false
  }
  if (maxPurchaseQuantityError.value) return false
  if (purchaseLimitPeriodDaysError.value) return false

  return true
})

// 获取类型名称
function getTypeName(type) {
  const map = {
    normal: '普通物品',
    cdk: '自动发卡',
    link: '已停用外链物品'
  }
  return map[type] || getProductTypeText(type)
}

// 获取物品类型
function getProductType(prod) {
  return resolveProductType(prod)
}

// 加载物品 (使用 my-products API，可获取任意状态的物品)
async function loadProduct() {
  try {
    loading.value = true
    const productId = route.params.id
    const result = await inventoryStore.fetchProductDetail(productId)
    product.value = result.success ? result.data.product : null
    
    if (product.value) {
      // 填充表单，处理多种字段名格式
      form.value = {
        name: product.value.name || '',
        description: product.value.description || '',
        categoryId: product.value.category_id || product.value.categoryId || null,
        price: product.value.price || '',
        discount: product.value.discount || 1,
        imageUrl: product.value.image_url || product.value.imageUrl || '',
        stock: Number(product.value.stock ?? 0),
        purchaseTrustLevel: Number(
          product.value.purchase_trust_level ?? product.value.purchaseTrustLevel ?? 0
        ),
        sharedCdkEnabled: !!(product.value.sharedCdkEnabled || Number(product.value.shared_cdk_enabled || 0) === 1),
        sharedCdkCode: String(product.value.shared_cdk_code || product.value.sharedCdkCode || ''),
        purchaseLimitType: String(
          product.value.purchase_limit_config?.mode
            || product.value.purchaseLimitConfig?.mode
            || product.value.purchase_limit_type
            || product.value.purchaseLimitType
            || 'none'
        ),
        maxPurchaseQuantity: Number(
          product.value.purchase_limit_config?.quantity
            ?? product.value.purchaseLimitConfig?.quantity
            ?? product.value.max_purchase_quantity
            ?? product.value.maxPurchaseQuantity
            ?? 0
        ) > 0
          ? Number(
            product.value.purchase_limit_config?.quantity
              ?? product.value.purchaseLimitConfig?.quantity
              ?? product.value.max_purchase_quantity
              ?? product.value.maxPurchaseQuantity
          )
          : '',
        purchaseLimitPeriodDays: Number(
          product.value.purchase_limit_config?.periodDays
            ?? product.value.purchase_limit_config?.period_days
            ?? product.value.purchaseLimitConfig?.periodDays
            ?? product.value.purchase_limit_period_days
            ?? product.value.purchaseLimitPeriodDays
            ?? 0
        ),
        isTestMode: !!(product.value.is_test_mode || product.value.isTestMode)
      }
      
      // 如果已有图片，自动验证
      if (form.value.imageUrl) {
        validateImageLoad()
      }
    }
  } catch (error) {
    toast.error('加载物品失败')
  } finally {
    loading.value = false
  }
}

// 提交表单
async function submitForm() {
  if (updateBusy.value) return

  // 验证名称
  const nameResult = validateProductName(form.value.name)
  if (!nameResult.valid) {
    toast.error(nameResult.error)
    return
  }
  
  // 验证描述（必填）
  const descResult = validateProductDescription(form.value.description)
  if (!descResult.valid) {
    toast.error(descResult.error)
    return
  }
  
  // 验证分类
  if (!form.value.categoryId) {
    toast.error('请选择物品分类')
    return
  }
  
  // 验证价格
  const priceResult = validatePrice(form.value.price)
  if (!priceResult.valid) {
    toast.error(priceResult.error)
    return
  }
  
  // 验证折扣
  if (form.value.discount < 0.01 || form.value.discount > 1) {
    toast.error('折扣范围为 0.01-1')
    return
  }
  
  // 根据物品类型验证
  const productType = getProductType(product.value)
  if (productType === 'link') {
    toast.error('外链物品已停用，请重新发布普通物品')
    return
  } else if (productType === 'normal') {
    if (stockError.value) {
      toast.error(stockError.value)
      stockInput.value?.focus?.()
      return
    }
  } else if (productType === 'cdk') {
    if (sharedCdkCodeError.value) {
      toast.error(sharedCdkCodeError.value)
      return
    }
  }
  if (maxPurchaseQuantityError.value) {
    toast.error(maxPurchaseQuantityError.value)
    maxPurchaseQuantityInput.value?.focus?.()
    return
  }
  if (purchaseLimitPeriodDaysError.value) {
    toast.error(purchaseLimitPeriodDaysError.value)
    maxPurchaseQuantityInput.value?.focus?.()
    return
  }
  
  // 验证图片URL（必填）
  const imageUrl = form.value.imageUrl?.trim() || ''
  if (!imageUrl) {
    toast.error('请上传物品图片')
    return
  }
  if (imageUrlError.value) {
    toast.error(imageUrlError.value)
    return
  }
  
  let imageValidationToastId = null
  if (!imageValidated.value || lastValidatedUrl.value !== imageUrl) {
    imageValidationToastId = toast.loading('正在验证图片...')
    await validateImageLoad()
  }
  
  if (imageLoadError.value || !imageValidated.value || lastValidatedUrl.value !== imageUrl) {
    const message = imageLoadError.value || '图片验证未完成，请重试'
    if (imageValidationToastId) {
      toast.update(imageValidationToastId, { type: 'error', message })
    } else {
      toast.error(message)
    }
    return
  }
  if (imageValidationToastId) toast.close(imageValidationToastId)
  
  submitting.value = true
  
  try {
    // 构建更新数据（与客户端脚本保持一致）
    const updateData = {
      name: form.value.name.trim(),
      categoryId: form.value.categoryId,
      description: form.value.description.trim(),
      price: parseFloat(form.value.price),
      discount: parseFloat(form.value.discount) || 1,
      imageUrl,
      purchaseTrustLevel: Number(form.value.purchaseTrustLevel) || 0,
      purchaseLimitType: form.value.purchaseLimitType,
      maxPurchaseQuantity: form.value.purchaseLimitType === 'none'
        ? 0
        : Number(form.value.maxPurchaseQuantity),
      purchaseLimitPeriodDays: form.value.purchaseLimitType === 'per_user'
        ? Number(form.value.purchaseLimitPeriodDays || 0)
        : 0
    }
    
    // 类型特定数据
    if (productType === 'normal') {
      updateData.stock = Number(form.value.stock)
    } else if (productType === 'cdk') {
      updateData.sharedCdkEnabled = form.value.sharedCdkEnabled
      updateData.sharedCdkCode = form.value.sharedCdkEnabled ? form.value.sharedCdkCode.trim() : ''
      if (initialTestModeEnabled.value) {
        updateData.isTestMode = form.value.isTestMode
      }
    }
    
    // 更新物品
    const result = await inventoryStore.updateProduct(product.value.id, updateData, { timeout: EDIT_SAVE_TIMEOUT_MS })
    
    // 检查返回结果
    if (result?.success === false) {
      if (isUncertainUpdateResult(result)) {
        await confirmUpdateAfterUncertainResult(product.value.id, updateData, productType)
        return
      }
      const errorMsg = result.error?.message || result.error || '更新失败'
      toast.error(errorMsg)
      return
    }
    
    toast.success('物品已更新')
    router.push('/seller/products')
  } catch (error) {
    toast.error(error.message || '更新失败')
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  await loadCategories()
  await loadProduct()
})

watch(
  () => form.value.imageUrl,
  (currentUrl, previousUrl) => {
    if (String(currentUrl || '').trim() !== String(previousUrl || '').trim()) {
      resetImageValidation()
    }
  },
  { flush: 'sync' }
)

</script>

<style scoped>
.edit-page {
  min-height: 100vh;
  padding-bottom: 100px;
}

.page-container {
  max-width: 600px;
  margin: 0 auto;
  padding: 16px;
}

.page-header {
  margin-bottom: 20px;
}

.page-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.edit-notice {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  margin-bottom: 16px;
  border-radius: 14px;
  background: var(--glass-bg-light);
  border: 1px solid var(--glass-border);
  color: var(--text-secondary);
  box-shadow: var(--shadow-sm);
}

.notice-icon {
  font-size: 16px;
}

.notice-text {
  font-size: 13px;
  line-height: 1.5;
}

/* 加载骨架 */
.loading-state {
  padding-top: 20px;
}

.skeleton-card {
  background: var(--bg-card);
  border-radius: 16px;
  padding: 24px;
  box-shadow: var(--shadow-sm);
}

.skeleton {
  background: linear-gradient(90deg, var(--bg-secondary) 25%, var(--bg-tertiary) 50%, var(--bg-secondary) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
}

.skeleton-line {
  height: 16px;
}

.w-32 { width: 128px; }
.w-48 { width: 192px; }
.w-full { width: 100%; }
.mt-2 { margin-top: 8px; }
.mt-4 { margin-top: 16px; }

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

/* 返回按钮 */
.back-btn {
  display: inline-block;
  padding: 10px 16px;
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: 12px;
  color: var(--text-primary);
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.back-btn:hover {
  background: var(--bg-secondary);
  border-color: var(--border-hover);
}

/* 表单卡片 */
.form-card {
  background: var(--bg-card);
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 16px;
  box-shadow: var(--shadow-sm);
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 16px;
}

/* 表单 */
.form-group {
  margin-bottom: 16px;
  position: relative;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.form-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.form-label-row .form-label {
  margin-bottom: 0;
}

.desc-mode-tabs {
  display: inline-flex;
  gap: 2px;
  padding: 3px;
  background: var(--bg-secondary);
  border-radius: 10px;
}

.desc-mode-tab {
  border: none;
  background: none;
  padding: 4px 12px;
  font-size: 12px;
  line-height: 1.4;
  color: var(--text-secondary);
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.2s, color 0.2s;
}

.desc-mode-tab:hover {
  color: var(--color-primary);
}

.desc-mode-tab.active {
  background: var(--color-primary);
  color: #fff;
  font-weight: 600;
}

.form-label.required::after {
  content: '*';
  color: var(--color-danger);
  margin-left: 4px;
}

.form-input {
  width: 100%;
  padding: 14px 16px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-light);
  border-radius: 12px;
  font-size: 14px;
  color: var(--text-primary);
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.form-input:focus {
  border-color: var(--color-primary);
}

.form-input::placeholder {
  color: var(--text-muted);
}

.form-textarea {
  width: 100%;
  padding: 14px 16px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-light);
  border-radius: 12px;
  font-size: 14px;
  color: var(--text-primary);
  outline: none;
  resize: vertical;
  min-height: 100px;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.form-textarea:focus {
  border-color: var(--color-primary);
}

.form-row {
  display: flex;
  gap: 12px;
}

.form-row .form-group {
  flex: 1;
}

.form-counter {
  position: absolute;
  right: 12px;
  bottom: -20px;
  font-size: 12px;
  color: var(--text-muted);
  margin: 0;
}

.form-hint {
  font-size: 13px;
  color: var(--text-tertiary);
  margin: 8px 0 0;
  line-height: 1.5;
}

.form-hint.loading-hint {
  color: var(--color-warning);
}

.form-hint.success-hint {
  color: var(--color-success);
}

.form-hint.selectable {
  user-select: text;
}

.form-hint a {
  color: var(--color-primary);
  text-decoration: none;
}

.form-hint a:hover {
  text-decoration: underline;
}

.form-error {
  font-size: 13px;
  color: var(--color-danger);
  margin: 8px 0 0;
}

.form-input.input-error {
  border-color: var(--color-danger);
}

/* 图片预览 */
.image-preview {
  margin-top: 12px;
  border-radius: 12px;
  overflow: hidden;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-light);
}

.image-preview img {
  display: block;
  width: 100%;
  max-height: 200px;
  object-fit: contain;
}

/* 分类选择 */
.category-select {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.category-btn {
  padding: 10px 18px;
  background: var(--bg-secondary);
  border: 2px solid transparent;
  border-radius: 24px;
  font-size: 14px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.category-btn:hover {
  background: var(--bg-tertiary);
}

.category-btn.active {
  background: var(--color-success-bg);
  border-color: var(--color-primary);
  color: var(--color-success);
}

/* 类型只读 */
.type-readonly {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: 14px;
}

.type-icon {
  font-size: 28px;
}

.type-info {
  flex: 1;
}

.type-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 4px;
}

.type-desc {
  font-size: 13px;
  color: var(--text-tertiary);
  margin: 0;
}

/* CDK 管理提示 */
.toggle-switch {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  user-select: none;
}

.toggle-track {
  position: relative;
  width: 44px;
  height: 24px;
  background: var(--bg-tertiary);
  border-radius: 12px;
  transition: background 0.2s;
}

.toggle-track.active {
  background: var(--color-info);
}

.toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  background: #fff;
  border-radius: 50%;
  transition: transform 0.2s;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.toggle-track.active .toggle-thumb {
  transform: translateX(20px);
}

.toggle-label {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-primary);
}

.toggle-help {
  font-size: 12px;
  color: var(--color-info);
  font-weight: 400;
}

.limit-toggle {
  margin-bottom: 8px;
}

.limit-input-row {
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.limit-input-row .form-input {
  flex: 1;
}

.limit-unit {
  font-size: 13px;
  color: var(--text-tertiary);
  white-space: nowrap;
}

.cdk-hint {
  font-size: 14px;
  color: var(--text-tertiary);
  margin: 0 0 12px;
}

.manage-link {
  display: inline-block;
  font-size: 14px;
  color: var(--color-primary);
  text-decoration: none;
}

.manage-link:hover {
  text-decoration: underline;
}

/* 提交按钮 */
.form-actions {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 16px;
  background: var(--bg-card);
  border-top: 1px solid var(--border-light);
  z-index: 100;
}

.submit-btn {
  display: block;
  width: 100%;
  max-width: 568px;
  margin: 0 auto;
  padding: 16px 32px;
  background: linear-gradient(135deg, #a5b4a3 0%, #95a493 100%);
  border: none;
  border-radius: 14px;
  font-size: 16px;
  font-weight: 600;
  color: white;
  cursor: pointer;
  transition: all 0.2s;
}

.submit-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: var(--shadow-primary);
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 提交遮罩 */
.submit-mask {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: var(--overlay-bg, rgba(24, 28, 34, 0.45));
  backdrop-filter: blur(2px);
}

.submit-mask-card {
  width: min(90vw, 360px);
  padding: 24px 20px;
  border-radius: 16px;
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  box-shadow: var(--shadow-lg);
  text-align: center;
}

.submit-mask-spinner {
  display: block;
  width: 44px;
  height: 44px;
  margin: 0 auto 14px;
  border-radius: 50%;
  border: 3px solid rgba(126, 179, 126, 0.25);
  border-top-color: var(--color-success);
  animation: submit-mask-spin 0.8s linear infinite;
}

.submit-mask-title {
  margin: 0 0 8px;
  font-size: 17px;
  font-weight: 700;
  color: var(--text-primary);
}

.submit-mask-text {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-secondary);
}

.submit-mask-enter-active,
.submit-mask-leave-active {
  transition: opacity 0.2s ease;
}

.submit-mask-enter-active .submit-mask-card,
.submit-mask-leave-active .submit-mask-card {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.submit-mask-enter-from,
.submit-mask-leave-to {
  opacity: 0;
}

.submit-mask-enter-from .submit-mask-card,
.submit-mask-leave-to .submit-mask-card {
  transform: translateY(6px) scale(0.98);
  opacity: 0;
}

@keyframes submit-mask-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
