import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  PRODUCT_PUBLISH_DRAFT_TTL_MS,
  buildProductPublishDraftStorageKey,
  clearProductPublishDraft,
  createProductPublishDraft,
  normalizeProductPublishDraft,
  readProductPublishDraft,
  writeProductPublishDraft
} from '../src/utils/productPublishDraft'

function createMemoryStorage() {
  const data = new Map()
  return {
    get(key) { return data.has(key) ? data.get(key) : null },
    set(key, value) { data.set(key, value); return true },
    remove(key) { return data.delete(key) },
    data
  }
}

const userA = { id: 18, site: 'linux.do' }
const userB = { id: 19, site: 'linux.do' }

function fullForm(overrides = {}) {
  return {
    name: '测试物品',
    description: '这是一段足够长的测试物品说明',
    categoryId: 3,
    price: '19.99',
    discount: 0.8,
    imageUrl: 'https://images.example.com/product',
    productType: 'cdk',
    stock: '',
    purchaseTrustLevel: 2,
    cdkCodes: 'SECRET-001\nSECRET-002',
    sharedCdkEnabled: false,
    sharedCdkCode: '',
    isTestMode: true,
    purchaseLimitType: 'per_user',
    maxPurchaseQuantity: '2',
    purchaseLimitPeriodDays: 7,
    ignored: 'do-not-save',
    ...overrides
  }
}

describe('物品发布草稿', () => {
  let storage

  beforeEach(() => {
    storage = createMemoryStorage()
    vi.spyOn(Date, 'now').mockReturnValue(1_800_000_000_000)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('只保存白名单字段并完全排除 CDK 卡密', () => {
    const draft = createProductPublishDraft(userA, fullForm())

    expect(draft.form).toMatchObject({
      name: '测试物品',
      categoryId: 3,
      productType: 'cdk',
      purchaseTrustLevel: 2,
      purchaseLimitType: 'per_user',
      maxPurchaseQuantity: '2',
      purchaseLimitPeriodDays: 7
    })
    expect(draft.form).not.toHaveProperty('cdkCodes')
    expect(draft.form).not.toHaveProperty('sharedCdkCode')
    expect(draft.form).not.toHaveProperty('ignored')
    expect(JSON.stringify(draft)).not.toContain('SECRET-001')
    expect(draft.sensitiveFieldsOmitted).toEqual(['cdkCodes'])
  })

  it('共享卡密模式也只记录省略标记，不记录卡密或摘要', () => {
    const draft = createProductPublishDraft(userA, fullForm({
      cdkCodes: '',
      sharedCdkEnabled: true,
      sharedCdkCode: 'SHARED-SECRET-001'
    }))

    expect(draft.form.sharedCdkEnabled).toBe(true)
    expect(draft.form).not.toHaveProperty('sharedCdkCode')
    expect(JSON.stringify(draft)).not.toContain('SHARED-SECRET-001')
    expect(draft.sensitiveFieldsOmitted).toEqual(['sharedCdkCode'])
  })

  it('按站点和用户编号隔离草稿', () => {
    expect(buildProductPublishDraftStorageKey(userA)).not.toBe(buildProductPublishDraftStorageKey(userB))
    expect(normalizeProductPublishDraft(createProductPublishDraft(userA, fullForm()), userB)).toBeNull()
  })

  it('拒绝过期、未来时间、版本不匹配和损坏的草稿', () => {
    const draft = createProductPublishDraft(userA, fullForm())
    expect(normalizeProductPublishDraft({ ...draft, updatedAt: Date.now() - PRODUCT_PUBLISH_DRAFT_TTL_MS - 1 }, userA)).toBeNull()
    expect(normalizeProductPublishDraft({ ...draft, updatedAt: Date.now() + 60_001 }, userA)).toBeNull()
    expect(normalizeProductPublishDraft({ ...draft, version: 999 }, userA)).toBeNull()
    expect(normalizeProductPublishDraft({ ...draft, form: null }, userA)).toBeNull()
  })

  it('读取时清理无效草稿', () => {
    const key = buildProductPublishDraftStorageKey(userA)
    storage.set(key, { version: 999 })

    expect(readProductPublishDraft(userA, storage).draft).toBeNull()
    expect(storage.get(key)).toBeNull()
  })

  it('通过默认存储封装读取时清理损坏的 JSON', () => {
    const data = new Map()
    const localStorage = {
      getItem(key) { return data.has(key) ? data.get(key) : null },
      setItem(key, value) { data.set(key, String(value)) },
      removeItem(key) { data.delete(key) }
    }
    const storageKey = `ld_store_${buildProductPublishDraftStorageKey(userA)}`
    localStorage.setItem(storageKey, '{broken')
    vi.stubGlobal('localStorage', localStorage)
    vi.stubGlobal('console', { error() {} })

    expect(readProductPublishDraft(userA).draft).toBeNull()
    expect(localStorage.getItem(storageKey)).toBeNull()
  })

  it('最后一次保存覆盖同账号的旧内容，并支持显式清除', () => {
    expect(writeProductPublishDraft(userA, fullForm({ name: '第一版' }), storage).success).toBe(true)
    expect(writeProductPublishDraft(userA, fullForm({ name: '第二版' }), storage, Date.now() + 1).success).toBe(true)
    expect(readProductPublishDraft(userA, storage, Date.now() + 1).draft.form.name).toBe('第二版')

    expect(clearProductPublishDraft(userA, storage)).toBe(true)
    expect(readProductPublishDraft(userA, storage).draft).toBeNull()
  })

  it('存储空间异常时返回失败且不抛出', () => {
    storage.set = () => { throw new Error('QuotaExceededError') }
    const result = writeProductPublishDraft(userA, fullForm(), storage)

    expect(result.success).toBe(false)
    expect(result.error.message).toContain('QuotaExceededError')
  })
})
