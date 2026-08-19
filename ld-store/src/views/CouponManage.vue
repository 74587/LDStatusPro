<template>
  <div class="manage-page">
    <main class="manage-shell">
      <header class="page-header">
        <div>
          <p class="eyebrow">SELLER COUPONS</p>
          <h1>优惠券管理</h1>
          <p>发放商品券或店铺券，分享链接后由买家主动领取。</p>
        </div>
        <router-link to="/user/coupons" class="wallet-link">查看我的优惠券</router-link>
      </header>

      <nav class="page-tabs" role="tablist" aria-label="优惠券管理功能">
        <button type="button" role="tab" :aria-selected="activeTab === 'list'" :class="{ active: activeTab === 'list' }" @click="activeTab = 'list'">已发放</button>
        <button type="button" role="tab" :aria-selected="activeTab === 'create'" :class="{ active: activeTab === 'create' }" @click="activeTab = 'create'">创建优惠券</button>
      </nav>

      <section v-if="activeTab === 'create'" class="create-layout">
        <form class="form-card" novalidate @submit.prevent="submitCampaign">
          <div class="section-heading"><span>1</span><div><h2>基本信息</h2><p>名称和说明将在领取页与买家券包中展示。</p></div></div>
          <div class="field-grid">
            <label class="field field-wide">
              <span>优惠券名称 <em>*</em></span>
              <input v-model.trim="form.name" maxlength="60" autocomplete="off" placeholder="例如：夏日店铺满减券" :aria-invalid="!!errors.name" />
              <small v-if="errors.name" class="field-error">{{ errors.name }}</small>
            </label>
            <label class="field field-wide">
              <span>使用说明</span>
              <textarea v-model.trim="form.description" maxlength="500" rows="3" placeholder="可选，说明适用品类或活动规则" />
              <small>{{ form.description.length }} / 500</small>
            </label>
          </div>

          <div class="section-heading"><span>2</span><div><h2>范围与优惠</h2><p>发布后范围、券值、门槛和有效期不可修改。</p></div></div>
          <fieldset class="choice-field">
            <legend>适用范围 <em>*</em></legend>
            <div class="choice-grid">
              <label :class="['choice-card', { selected: form.scopeType === 'product' }]"><input v-model="form.scopeType" type="radio" value="product" /><strong>指定商品</strong><small>仅限一个本人有效商品</small></label>
              <label :class="['choice-card', { selected: form.scopeType === 'seller' }]"><input v-model="form.scopeType" type="radio" value="seller" /><strong>店铺范围</strong><small>覆盖同站点当前和未来商品</small></label>
            </div>
          </fieldset>

          <label v-if="form.scopeType === 'product'" class="field">
            <span>适用商品 <em>*</em></span>
            <select v-model="form.productId" :aria-invalid="!!errors.productId">
              <option value="">请选择商品</option>
              <option v-for="product in eligibleProducts" :key="product.id" :value="String(product.id)">{{ product.name }} · {{ currentProductPrice(product).toFixed(2) }} LDC</option>
            </select>
            <small v-if="productsLoading">正在加载有效商品…</small>
            <small v-else-if="!eligibleProducts.length">暂无可发券的普通物品或 CDK。</small>
            <small v-if="errors.productId" class="field-error">{{ errors.productId }}</small>
          </label>

          <fieldset class="choice-field">
            <legend>优惠类型 <em>*</em></legend>
            <div class="choice-grid">
              <label :class="['choice-card', { selected: form.discountType === 'fixed_amount' }]"><input v-model="form.discountType" type="radio" value="fixed_amount" /><strong>减少指定金额</strong><small>整笔订单只抵扣一次</small></label>
              <label :class="['choice-card', { selected: form.discountType === 'percentage' }]"><input v-model="form.discountType" type="radio" value="percentage" /><strong>单件直接打折</strong><small>每笔订单仅优惠一件</small></label>
            </div>
          </fieldset>

          <div class="field-grid">
            <label v-if="form.discountType === 'fixed_amount'" class="field">
              <span>减额金额（LDC）<em>*</em></span>
              <input v-model="form.fixedAmount" type="number" min="0.01" step="0.01" inputmode="decimal" placeholder="10.00" :aria-invalid="!!errors.discountValue" />
              <small v-if="errors.discountValue" class="field-error">{{ errors.discountValue }}</small>
            </label>
            <label v-else class="field">
              <span>折扣（折）<em>*</em></span>
              <input v-model="form.percentage" type="number" min="0.1" max="9.9" step="0.1" inputmode="decimal" placeholder="8.0" :aria-invalid="!!errors.discountValue" />
              <small v-if="errors.discountValue" class="field-error">{{ errors.discountValue }}</small>
            </label>
            <label class="field">
              <span>最低消费（LDC）</span>
              <input v-model="form.minSpend" type="number" min="0" step="0.01" inputmode="decimal" placeholder="0.00" :aria-invalid="!!errors.minSpend" />
              <small>按商品现有折后小计判断。</small>
              <small v-if="errors.minSpend" class="field-error">{{ errors.minSpend }}</small>
            </label>
          </div>

          <div class="section-heading"><span>3</span><div><h2>发行与有效期</h2><p>所有领取者共享同一生效和过期时刻。</p></div></div>
          <div class="field-grid">
            <label class="field"><span>发行总量 <em>*</em></span><input v-model="form.totalQuantity" type="number" min="1" max="100000" step="1" inputmode="numeric" :aria-invalid="!!errors.totalQuantity" /><small v-if="errors.totalQuantity" class="field-error">{{ errors.totalQuantity }}</small></label>
            <label class="field"><span>生效时间 <em>*</em></span><input v-model="form.startsAt" type="datetime-local" :aria-invalid="!!errors.startsAt" /><small v-if="errors.startsAt" class="field-error">{{ errors.startsAt }}</small></label>
            <label class="field"><span>过期时间 <em>*</em></span><input v-model="form.expiresAt" type="datetime-local" :aria-invalid="!!errors.expiresAt" /><small v-if="errors.expiresAt" class="field-error">{{ errors.expiresAt }}</small></label>
          </div>

          <div class="lock-notice"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg><span>发布后只能增加发行总量或永久停止新领取，请提交前确认规则。</span></div>
          <button class="submit-button" type="submit" :disabled="submitting">{{ submitting ? '发布中…' : '发布优惠券' }}</button>
        </form>

        <aside class="preview-card">
          <p class="preview-label">实时预览</p>
          <div class="preview-ticket">
            <span>{{ form.scopeType === 'product' ? '商品券' : '店铺券' }}</span>
            <h2>{{ form.name || '优惠券名称' }}</h2>
            <strong>{{ previewRule }}</strong>
            <small>{{ Number(form.minSpend || 0) > 0 ? `满 ${Number(form.minSpend).toFixed(2)} LDC 可用` : '无门槛' }}</small>
          </div>
          <div v-if="form.discountType === 'percentage'" class="quantity-preview">
            <h3>多件购买预览</h3>
            <p>按当前单价 <strong>{{ previewUnitPrice.toFixed(2) }}</strong> LDC、购买 3 件计算：</p>
            <div><span>商品小计</span><b>{{ (previewUnitPrice * 3).toFixed(2) }} LDC</b></div>
            <div><span>仅 1 件优惠</span><b>-{{ previewPercentageDiscount.toFixed(2) }} LDC</b></div>
            <div class="total"><span>预计实付</span><b>{{ Math.max(0.01, previewUnitPrice * 3 - previewPercentageDiscount).toFixed(2) }} LDC</b></div>
            <small>购买 1 件或多件，折扣券减免金额都只按一件计算。</small>
          </div>
        </aside>
      </section>

      <section v-else>
        <div v-if="createdCampaign" class="created-banner" role="status">
          <div><strong>优惠券发布成功</strong><p>复制领取链接并分享给买家。</p></div>
          <div class="share-row"><input :value="claimUrl(createdCampaign)" readonly aria-label="优惠券领取链接" /><button type="button" @click="copyClaimUrl(createdCampaign)">复制链接</button></div>
        </div>

        <div v-if="loading" class="state-card">正在加载优惠券…</div>
        <div v-else-if="loadError" class="state-card error"><p>{{ loadError }}</p><button type="button" @click="loadCampaigns">重新加载</button></div>
        <div v-else-if="campaigns.length" class="campaign-list">
          <article v-for="campaign in campaigns" :key="campaign.id" class="campaign-card">
            <div class="campaign-main">
              <div class="campaign-title-row"><span :class="['status-badge', campaign.state]">{{ stateText(campaign.state) }}</span><span class="type-badge">{{ campaign.scopeType === 'product' ? '商品券' : '店铺券' }}</span></div>
              <h2>{{ campaign.name }}</h2>
              <p class="rule">{{ formatCouponRule(campaign) }}</p>
              <p class="meta">{{ campaign.productName || '店铺内平台商品' }} · {{ formatCouponDate(campaign.expiresAt) }} 过期</p>
            </div>
            <div class="stats-grid">
              <div><span>已领取</span><strong>{{ campaign.claimedCount }} / {{ campaign.totalQuantity }}</strong></div>
              <div><span>可用</span><strong>{{ campaign.counts?.available || 0 }}</strong></div>
              <div><span>占用</span><strong>{{ campaign.counts?.reserved || 0 }}</strong></div>
              <div><span>已核销</span><strong>{{ campaign.counts?.used || 0 }}</strong></div>
            </div>
            <div class="card-actions">
              <button type="button" @click="copyClaimUrl(campaign)">复制领取链接</button>
              <button type="button" @click="toggleDetails(campaign)">{{ expandedId === campaign.id ? '收起管理' : '详情与管理' }}</button>
            </div>
            <div v-if="expandedId === campaign.id" class="management-panel">
              <p v-if="detailsLoading">正在加载统计…</p>
              <template v-else>
                <div class="discount-total"><span>已支付订单累计让利</span><strong>{{ Number(campaignDetails[campaign.id]?.totalDiscountAmount || 0).toFixed(2) }} LDC</strong></div>
                <div v-if="!campaign.claimClosedAt" class="quota-form">
                  <label :for="`quota-${campaign.id}`">增加发行量（填写新的总量）</label>
                  <div><input :id="`quota-${campaign.id}`" v-model="quotaDrafts[campaign.id]" type="number" :min="campaign.totalQuantity + 1" max="100000" step="1" /><button type="button" :disabled="actionLoading" @click="increaseQuota(campaign)">确认加量</button></div>
                </div>
                <button v-if="!campaign.claimClosedAt" type="button" class="danger-action" :disabled="actionLoading" @click="closeCampaign(campaign)">永久停止新领取</button>
                <p v-else class="closed-note">此活动已永久停止新领取，买家已领取且仍有效的券可以继续使用。</p>
              </template>
            </div>
          </article>
        </div>
        <div v-else class="state-card empty"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5V9a3 3 0 0 0 0 6v1.5a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5V15a3 3 0 0 0 0-6V7.5Z" /></svg><h2>还没有发放优惠券</h2><button type="button" @click="activeTab = 'create'">创建第一张优惠券</button></div>
      </section>
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useShopStore } from '@/stores/shop'
import { useToast } from '@/composables/useToast'
import { useDialog } from '@/composables/useDialog'
import { closeCouponRequest, createCouponRequest, fetchSellerCouponsRequest, formatCouponDate, formatCouponRule, getSellerCouponRequest, increaseCouponQuotaRequest } from '@/services/shop/couponService'

const shopStore = useShopStore()
const toast = useToast()
const dialog = useDialog()
const activeTab = ref('list')
const loading = ref(true)
const loadError = ref('')
const submitting = ref(false)
const actionLoading = ref(false)
const detailsLoading = ref(false)
const campaigns = ref([])
const products = ref([])
const productsLoading = ref(false)
const createdCampaign = ref(null)
const expandedId = ref(null)
const campaignDetails = reactive({})
const quotaDrafts = reactive({})
const errors = reactive({})

function shanghaiInput(date) { return new Date(date.getTime() + 8 * 3600000).toISOString().slice(0, 16) }
const now = new Date()
const form = reactive({ name: '', description: '', scopeType: 'product', productId: '', discountType: 'fixed_amount', fixedAmount: '', percentage: '8', minSpend: '0', totalQuantity: '100', startsAt: shanghaiInput(now), expiresAt: shanghaiInput(new Date(now.getTime() + 7 * 86400000)) })

function field(product, camel, snake) { return product?.[camel] ?? product?.[snake] }
function currentProductPrice(product) { return Number(field(product, 'price', 'price') || 0) * Number(field(product, 'discount', 'discount') || 1) }
const eligibleProducts = computed(() => products.value.filter(product => {
  const type = String(field(product, 'productType', 'product_type') || '')
  const status = String(field(product, 'status', 'status') || '')
  return ['normal', 'cdk'].includes(type) && ['ai_approved', 'manual_approved', 'approved', 'active'].includes(status)
}))
const selectedProduct = computed(() => eligibleProducts.value.find(item => String(item.id) === String(form.productId)))
const previewUnitPrice = computed(() => selectedProduct.value ? currentProductPrice(selectedProduct.value) : 80)
const previewRule = computed(() => form.discountType === 'fixed_amount' ? `减 ${Number(form.fixedAmount || 0).toFixed(2)} LDC` : `${Number(form.percentage || 0).toFixed(1)} 折 · 仅优惠 1 件`)
const previewPercentageDiscount = computed(() => previewUnitPrice.value * (1 - Math.min(9.9, Math.max(.1, Number(form.percentage || 0))) / 10))

function validateForm() {
  Object.keys(errors).forEach(key => delete errors[key])
  if (!form.name || form.name.length > 60) errors.name = '请输入 1-60 个字符的名称'
  if (form.scopeType === 'product' && !form.productId) errors.productId = '请选择适用商品'
  if (form.discountType === 'fixed_amount' && !(Number(form.fixedAmount) > 0)) errors.discountValue = '减额金额必须大于 0'
  if (form.discountType === 'percentage' && !(Number(form.percentage) >= .1 && Number(form.percentage) <= 9.9)) errors.discountValue = '折扣必须在 0.1 至 9.9 折之间'
  if (!(Number(form.minSpend) >= 0)) errors.minSpend = '最低消费不能小于 0'
  if (!Number.isInteger(Number(form.totalQuantity)) || Number(form.totalQuantity) < 1 || Number(form.totalQuantity) > 100000) errors.totalQuantity = '发行量须为 1-100000 的整数'
  if (!form.startsAt) errors.startsAt = '请选择生效时间'
  if (!form.expiresAt) errors.expiresAt = '请选择过期时间'
  if (form.startsAt && form.expiresAt && new Date(`${form.expiresAt}:00+08:00`) <= new Date(`${form.startsAt}:00+08:00`)) errors.expiresAt = '过期时间必须晚于生效时间'
  return Object.keys(errors).length === 0
}

async function submitCampaign() {
  if (!validateForm() || submitting.value) return
  submitting.value = true
  const payload = {
    name: form.name,
    description: form.description,
    scopeType: form.scopeType,
    productId: form.scopeType === 'product' ? Number(form.productId) : null,
    discountType: form.discountType,
    fixedAmount: form.discountType === 'fixed_amount' ? Number(form.fixedAmount) : null,
    percentageBps: form.discountType === 'percentage' ? Math.round(Number(form.percentage) * 1000) : null,
    minSpend: Number(form.minSpend || 0),
    totalQuantity: Number(form.totalQuantity),
    startsAt: new Date(`${form.startsAt}:00+08:00`).toISOString(),
    expiresAt: new Date(`${form.expiresAt}:00+08:00`).toISOString()
  }
  const result = await createCouponRequest(payload)
  if (result.success) {
    createdCampaign.value = result.data
    toast.success('优惠券发布成功')
    activeTab.value = 'list'
    await loadCampaigns()
  } else toast.error(result.error || '发布失败，请稍后重试')
  submitting.value = false
}

function claimUrl(campaign) { return `${window.location.origin}${campaign.claimPath || `/coupon/${campaign.publicToken}`}` }
async function copyClaimUrl(campaign) { try { await navigator.clipboard.writeText(claimUrl(campaign)); toast.success('领取链接已复制') } catch { toast.error('复制失败，请手动复制') } }
function stateText(state) { return ({ active: '领取中', scheduled: '待开始', expired: '已过期', closed: '已停领', sold_out: '已领完', disabled: '平台停用' })[state] || state }

async function loadCampaigns() {
  loading.value = true; loadError.value = ''
  const result = await fetchSellerCouponsRequest({ page: 1, pageSize: 50 })
  if (result.success) campaigns.value = result.data?.items || []
  else loadError.value = result.error || '优惠券列表加载失败'
  loading.value = false
}
async function toggleDetails(campaign) {
  if (expandedId.value === campaign.id) { expandedId.value = null; return }
  expandedId.value = campaign.id
  quotaDrafts[campaign.id] = String(campaign.totalQuantity + 1)
  if (campaignDetails[campaign.id]) return
  detailsLoading.value = true
  const result = await getSellerCouponRequest(campaign.id)
  if (result.success) campaignDetails[campaign.id] = result.data
  else toast.error(result.error || '详情加载失败')
  detailsLoading.value = false
}
async function increaseQuota(campaign) {
  const total = Number(quotaDrafts[campaign.id])
  if (!Number.isInteger(total) || total <= campaign.totalQuantity) { toast.warning('新的发行总量必须大于当前总量'); return }
  actionLoading.value = true
  const result = await increaseCouponQuotaRequest(campaign.id, total)
  if (result.success) {
    toast.success('发行量已增加')
    delete campaignDetails[campaign.id]
    await loadCampaigns()
    expandedId.value = null
    const refreshed = campaigns.value.find(item => item.id === campaign.id)
    if (refreshed) await toggleDetails(refreshed)
  }
  else toast.error(result.error || '加量失败')
  actionLoading.value = false
}
async function closeCampaign(campaign) {
  const confirmed = await dialog.confirmDanger('停止后不能恢复新领取，已领取且仍有效的优惠券不受影响。', { title: '永久停止领取？', confirmText: '停止领取' })
  if (!confirmed) return
  actionLoading.value = true
  const result = await closeCouponRequest(campaign.id)
  if (result.success) {
    toast.success('已停止新领取')
    delete campaignDetails[campaign.id]
    await loadCampaigns()
    expandedId.value = null
    const refreshed = campaigns.value.find(item => item.id === campaign.id)
    if (refreshed) await toggleDetails(refreshed)
  }
  else toast.error(result.error || '操作失败')
  actionLoading.value = false
}

onMounted(async () => {
  productsLoading.value = true
  products.value = await shopStore.fetchMyProducts(true)
  productsLoading.value = false
  await loadCampaigns()
})
</script>

<style scoped>
.manage-page { min-height: calc(100vh - 72px); padding: 44px 16px 100px; }.manage-shell { width: min(100%, 1180px); margin: 0 auto; }.page-header { display: flex; justify-content: space-between; align-items: flex-end; gap: 24px; }.eyebrow { margin: 0 0 6px; color: var(--text-tertiary); font-size: 12px; font-weight: 700; letter-spacing: .14em; }.page-header h1 { margin: 0; font-size: clamp(28px, 5vw, 40px); }.page-header p:not(.eyebrow) { margin: 9px 0 0; color: var(--text-secondary); }.wallet-link { min-height: 44px; display: inline-flex; align-items: center; padding: 0 17px; border: 1px solid var(--border-medium); border-radius: 13px; background: var(--glass-bg); white-space: nowrap; }
.page-tabs { display: flex; gap: 4px; width: fit-content; margin: 28px 0 22px; padding: 5px; border: 1px solid var(--border-light); border-radius: 16px; background: var(--glass-bg-medium); }.page-tabs button { min-width: 120px; min-height: 44px; padding: 0 18px; border-radius: 12px; color: var(--text-secondary); font-weight: 650; }.page-tabs button.active { color: var(--text-primary); background: var(--bg-card); box-shadow: var(--shadow-sm); }
.create-layout { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 22px; align-items: start; }.form-card, .preview-card, .campaign-card, .created-banner, .state-card { border: 1px solid var(--border-light); background: var(--glass-bg-heavy); box-shadow: var(--shadow-md); }.form-card { padding: clamp(22px, 4vw, 38px); border-radius: 24px; }.section-heading { display: flex; gap: 12px; margin: 30px 0 18px; }.section-heading:first-child { margin-top: 0; }.section-heading > span { width: 30px; height: 30px; display: grid; place-items: center; flex: 0 0 auto; border-radius: 10px; color: var(--color-primary-hover); background: var(--color-primary-light); font-weight: 800; }.section-heading h2 { margin: 1px 0 0; font-size: 18px; }.section-heading p { margin: 4px 0 0; color: var(--text-tertiary); font-size: 13px; }
.field-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }.field { display: grid; gap: 8px; margin-bottom: 16px; }.field-wide { grid-column: 1 / -1; }.field > span, legend { color: var(--text-secondary); font-size: 13px; font-weight: 650; }em { color: var(--color-danger); font-style: normal; }.field input, .field textarea, .field select, .quota-form input { width: 100%; min-height: 46px; padding: 11px 13px; border: 1px solid var(--input-border); border-radius: 12px; background: var(--input-bg); color: var(--text-primary); }.field textarea { resize: vertical; }.field input:focus, .field textarea:focus, .field select:focus, .quota-form input:focus { border-color: var(--input-focus-border); background: var(--input-focus-bg); box-shadow: 0 0 0 3px var(--selection-bg); }.field small { color: var(--text-tertiary); font-size: 12px; }.field .field-error { color: var(--color-danger); }
.choice-field { margin: 0 0 18px; border: 0; }.choice-field legend { margin-bottom: 9px; }.choice-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }.choice-card { position: relative; display: grid; gap: 4px; min-height: 84px; padding: 16px 16px 16px 44px; border: 1px solid var(--border-light); border-radius: 14px; background: var(--bg-secondary); cursor: pointer; }.choice-card.selected { border-color: var(--color-primary); background: var(--color-primary-light); }.choice-card input { position: absolute; top: 19px; left: 16px; width: 17px; height: 17px; accent-color: var(--color-primary-hover); }.choice-card strong { font-size: 14px; }.choice-card small { color: var(--text-tertiary); font-size: 12px; }
.lock-notice { display: flex; gap: 10px; margin-top: 8px; padding: 14px; border-radius: 13px; color: var(--color-warning); background: var(--color-warning-bg); font-size: 13px; line-height: 1.6; }.lock-notice svg { width: 22px; flex: 0 0 auto; fill: none; stroke: currentColor; stroke-width: 1.8; }.submit-button { width: 100%; min-height: 50px; margin-top: 18px; border-radius: 14px; background: var(--publish-btn-bg); color: var(--publish-btn-color); font-weight: 750; box-shadow: var(--publish-btn-shadow); }.submit-button:disabled { opacity: .55; cursor: not-allowed; }
.preview-card { position: sticky; top: 90px; padding: 22px; border-radius: 22px; }.preview-label { margin: 0 0 12px; color: var(--text-tertiary); font-size: 12px; font-weight: 700; letter-spacing: .1em; }.preview-ticket { display: grid; gap: 8px; padding: 22px; border-radius: 18px; background: var(--color-primary-light); }.preview-ticket > span { width: fit-content; padding: 4px 8px; border-radius: 999px; color: var(--color-primary-hover); background: var(--bg-card); font-size: 11px; font-weight: 700; }.preview-ticket h2 { margin: 5px 0 0; font-size: 18px; }.preview-ticket strong { color: var(--color-danger); font-size: 23px; }.preview-ticket small { color: var(--text-secondary); }.quantity-preview { margin-top: 16px; padding: 16px; border-radius: 16px; background: var(--bg-secondary); }.quantity-preview h3 { margin: 0; font-size: 15px; }.quantity-preview p { margin: 8px 0 14px; color: var(--text-secondary); font-size: 12px; }.quantity-preview div { display: flex; justify-content: space-between; gap: 12px; padding: 6px 0; font-size: 13px; }.quantity-preview .total { margin-top: 5px; padding-top: 10px; border-top: 1px solid var(--border-medium); }.quantity-preview > small { display: block; margin-top: 10px; color: var(--color-warning); line-height: 1.55; }
.created-banner { display: grid; grid-template-columns: 1fr minmax(300px, 520px); gap: 20px; align-items: center; margin-bottom: 18px; padding: 20px; border-radius: 18px; border-color: var(--color-success-light); }.created-banner p { margin: 4px 0 0; color: var(--text-secondary); font-size: 13px; }.share-row { display: flex; gap: 8px; }.share-row input { min-width: 0; flex: 1; min-height: 44px; padding: 0 12px; border: 1px solid var(--border-light); border-radius: 11px; background: var(--bg-secondary); color: var(--text-secondary); }.share-row button, .card-actions button, .quota-form button, .state-card button { min-height: 44px; padding: 0 15px; border: 1px solid var(--border-medium); border-radius: 11px; background: var(--bg-secondary); color: var(--text-primary); white-space: nowrap; }
.campaign-list { display: grid; gap: 16px; }.campaign-card { padding: 22px; border-radius: 20px; }.campaign-main h2 { margin: 13px 0 0; font-size: 20px; }.campaign-title-row { display: flex; gap: 8px; }.status-badge, .type-badge { min-height: 25px; display: inline-flex; align-items: center; padding: 0 9px; border-radius: 999px; font-size: 11px; font-weight: 700; }.status-badge.active { color: var(--color-success); background: var(--color-success-bg); }.status-badge.scheduled { color: var(--color-info); background: var(--color-info-bg); }.status-badge.expired, .status-badge.closed, .status-badge.sold_out { color: var(--text-secondary); background: var(--bg-tertiary); }.status-badge.disabled { color: var(--color-danger); background: var(--color-danger-bg); }.type-badge { color: var(--color-primary-hover); background: var(--color-primary-light); }.campaign-main .rule { margin: 7px 0 0; color: var(--color-danger); font-size: 18px; font-weight: 750; }.campaign-main .meta { margin: 6px 0 0; color: var(--text-tertiary); font-size: 12px; }.stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-top: 18px; }.stats-grid div { display: grid; gap: 3px; padding: 12px; border-radius: 12px; background: var(--bg-secondary); }.stats-grid span { color: var(--text-tertiary); font-size: 11px; }.stats-grid strong { font-size: 15px; }.card-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; }.management-panel { margin-top: 18px; padding-top: 18px; border-top: 1px dashed var(--border-medium); }.discount-total { display: flex; justify-content: space-between; gap: 16px; padding: 14px; border-radius: 13px; background: var(--color-success-bg); }.discount-total span { color: var(--text-secondary); }.discount-total strong { color: var(--color-success); }.quota-form { display: grid; gap: 8px; margin-top: 16px; }.quota-form label { color: var(--text-secondary); font-size: 13px; }.quota-form > div { display: flex; gap: 8px; }.quota-form input { max-width: 220px; }.danger-action { min-height: 44px; margin-top: 16px; padding: 0 16px; border: 1px solid var(--color-danger-light); border-radius: 11px; color: var(--color-danger); background: var(--color-danger-bg); }.closed-note { margin: 16px 0 0; color: var(--text-secondary); font-size: 13px; }.state-card { min-height: 260px; display: grid; place-items: center; align-content: center; gap: 13px; padding: 30px; border-radius: 20px; color: var(--text-secondary); text-align: center; }.state-card svg { width: 52px; fill: none; stroke: var(--text-tertiary); stroke-width: 1.5; }.state-card h2 { margin: 0; color: var(--text-primary); font-size: 19px; }.state-card p { margin: 0; }.state-card.empty button { background: var(--publish-btn-bg); color: var(--publish-btn-color); border: 0; }
@media (max-width: 900px) { .create-layout { grid-template-columns: 1fr; }.preview-card { position: static; }.created-banner { grid-template-columns: 1fr; } }
@media (max-width: 620px) { .manage-page { padding-top: 26px; }.page-header { align-items: flex-start; flex-direction: column; }.wallet-link { width: 100%; justify-content: center; }.page-tabs { width: 100%; }.page-tabs button { flex: 1; min-width: 0; padding-inline: 8px; }.field-grid, .choice-grid { grid-template-columns: 1fr; }.field-wide { grid-column: auto; }.stats-grid { grid-template-columns: repeat(2, 1fr); }.share-row, .quota-form > div { flex-direction: column; }.quota-form input { max-width: none; } }
@media (prefers-reduced-motion: reduce) { * { scroll-behavior: auto !important; } }
</style>
