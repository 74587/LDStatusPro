import { storage } from '@/utils/storage'
import { MAX_PRODUCT_IMAGE_URL_LENGTH } from '@/utils/productImageValidation'

export const PRODUCT_PUBLISH_DRAFT_VERSION = 1
export const PRODUCT_PUBLISH_DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000
export const PRODUCT_PUBLISH_DRAFT_KEY_PREFIX = 'product_publish_draft:'
export const PRODUCT_PUBLISH_PAYMENT_SOURCE = 'product-publish'

const SENSITIVE_FIELDS = new Set(['cdkCodes', 'sharedCdkCode'])
const PRODUCT_TYPES = new Set(['normal', 'cdk'])
const PURCHASE_LIMIT_TYPES = new Set(['none', 'per_order', 'per_user'])

function stringValue(value, maxLength) {
  return String(value ?? '').slice(0, maxLength)
}

function booleanValue(value) {
  return value === true
}

function categoryValue(value) {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number.parseInt(value, 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

function trustLevelValue(value) {
  const parsed = Number.parseInt(value, 10)
  if (!Number.isInteger(parsed)) return 0
  return Math.max(0, Math.min(4, parsed))
}

function normalizeDraftForm(form = {}) {
  const productType = PRODUCT_TYPES.has(String(form.productType)) ? String(form.productType) : 'normal'
  const purchaseLimitType = PURCHASE_LIMIT_TYPES.has(String(form.purchaseLimitType))
    ? String(form.purchaseLimitType)
    : 'none'

  return {
    name: stringValue(form.name, 50),
    description: stringValue(form.description, 1000),
    categoryId: categoryValue(form.categoryId),
    price: stringValue(form.price, 32),
    discount: stringValue(form.discount === '' || form.discount === null ? '' : form.discount ?? 1, 16),
    imageUrl: stringValue(form.imageUrl, MAX_PRODUCT_IMAGE_URL_LENGTH),
    productType,
    stock: stringValue(form.stock, 32),
    purchaseTrustLevel: trustLevelValue(form.purchaseTrustLevel),
    sharedCdkEnabled: productType === 'cdk' && booleanValue(form.sharedCdkEnabled),
    isTestMode: productType === 'cdk' && booleanValue(form.isTestMode),
    purchaseLimitType,
    maxPurchaseQuantity: purchaseLimitType === 'none'
      ? ''
      : stringValue(form.maxPurchaseQuantity, 32)
  }
}

export function buildProductPublishDraftOwnerKey(user) {
  const userId = String(user?.id ?? '').trim()
  if (!userId) return ''
  const site = String(user?.site || 'linux.do').trim().toLowerCase() || 'linux.do'
  return `${site}:${userId}`
}

export function buildProductPublishDraftStorageKey(user) {
  const ownerKey = buildProductPublishDraftOwnerKey(user)
  return ownerKey ? `${PRODUCT_PUBLISH_DRAFT_KEY_PREFIX}${encodeURIComponent(ownerKey)}` : ''
}

export function createProductPublishDraft(user, form, updatedAt = Date.now()) {
  const ownerKey = buildProductPublishDraftOwnerKey(user)
  if (!ownerKey) return null

  const sensitiveFieldsOmitted = []
  if (String(form?.cdkCodes || '').trim()) sensitiveFieldsOmitted.push('cdkCodes')
  if (String(form?.sharedCdkCode || '').trim()) sensitiveFieldsOmitted.push('sharedCdkCode')

  return {
    version: PRODUCT_PUBLISH_DRAFT_VERSION,
    ownerKey,
    form: normalizeDraftForm(form),
    updatedAt,
    sensitiveFieldsOmitted
  }
}

export function normalizeProductPublishDraft(value, user, now = Date.now()) {
  if (!value || typeof value !== 'object') return null
  const ownerKey = buildProductPublishDraftOwnerKey(user)
  if (!ownerKey || value.ownerKey !== ownerKey) return null
  if (value.version !== PRODUCT_PUBLISH_DRAFT_VERSION) return null

  const updatedAt = Number(value.updatedAt || 0)
  if (!Number.isFinite(updatedAt) || updatedAt <= 0) return null
  if (updatedAt > now + 60_000 || now - updatedAt > PRODUCT_PUBLISH_DRAFT_TTL_MS) return null
  if (!value.form || typeof value.form !== 'object' || Array.isArray(value.form)) return null

  const sensitiveFieldsOmitted = Array.isArray(value.sensitiveFieldsOmitted)
    ? [...new Set(value.sensitiveFieldsOmitted.filter(field => SENSITIVE_FIELDS.has(field)))]
    : []

  return {
    version: PRODUCT_PUBLISH_DRAFT_VERSION,
    ownerKey,
    form: normalizeDraftForm(value.form),
    updatedAt,
    sensitiveFieldsOmitted
  }
}

export function readProductPublishDraft(user, storageAdapter = storage, now = Date.now()) {
  const key = buildProductPublishDraftStorageKey(user)
  if (!key) return { draft: null, error: null }

  try {
    const storedDraft = storageAdapter.get(key)
    if (storedDraft === null || storedDraft === undefined) return { draft: null, error: null }

    const draft = normalizeProductPublishDraft(storedDraft, user, now)
    if (!draft) storageAdapter.remove(key)
    return { draft, error: null }
  } catch (error) {
    return { draft: null, error }
  }
}

export function writeProductPublishDraft(user, form, storageAdapter = storage, now = Date.now()) {
  const key = buildProductPublishDraftStorageKey(user)
  const draft = createProductPublishDraft(user, form, now)
  if (!key || !draft) return { success: false, draft: null, error: new Error('草稿账号无效') }

  try {
    const success = storageAdapter.set(key, draft, PRODUCT_PUBLISH_DRAFT_TTL_MS)
    if (!success) throw new Error('浏览器存储不可用')
    return { success: true, draft, error: null }
  } catch (error) {
    return { success: false, draft: null, error }
  }
}

export function clearProductPublishDraft(user, storageAdapter = storage) {
  const key = buildProductPublishDraftStorageKey(user)
  if (!key) return false
  try {
    return storageAdapter.remove(key) !== false
  } catch {
    return false
  }
}
